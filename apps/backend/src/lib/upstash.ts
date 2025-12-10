import { Redis } from '@upstash/redis';
import { Search } from '@upstash/search';

// Upstash Redis client for caching and rate limiting
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Upstash Search client using official SDK
export const searchClient = new Search({
  url: process.env.UPSTASH_SEARCH_REST_URL!,
  token: process.env.UPSTASH_SEARCH_REST_TOKEN!,
});

// Helper interface for search results
export interface SearchResult {
  id: string;
  score: number;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  // Compatibility aliases
  data?: Record<string, unknown>;
}

// Wrapper class for backward compatibility with existing code
export class UpstashSearch {
  /**
   * Query a single index
   */
  async query(options: {
    index: string;
    query: string;
    topK?: number;
    filter?: string;
  }): Promise<SearchResult[]> {
    const index = searchClient.index(options.index);
    const results = await index.search({
      query: options.query,
      limit: options.topK || 5,
      filter: options.filter,
    });

    // Map SDK results to our SearchResult interface
    return (results || []).map((result) => {
      const content = result.content as Record<string, unknown> | undefined;
      return {
        id: result.id,
        score: result.score,
        content,
        metadata: result.metadata as Record<string, unknown> | undefined,
        // Add data as alias for content (backward compat)
        data: content,
      };
    });
  }

  /**
   * Query multiple indexes in parallel and merge results
   * Results are deduplicated by ID and sorted by score
   */
  async queryMultiple(options: {
    indexes: string[];
    query: string;
    topK?: number;
    filter?: string;
  }): Promise<SearchResult[]> {
    const { indexes, query, topK = 5, filter } = options;

    // Query all indexes in parallel
    const promises = indexes.map(async (indexName) => {
      try {
        const index = searchClient.index(indexName);
        const results = await index.search({
          query,
          limit: topK,
          filter,
        });
        return results.map((result) => {
          const content = result.content as Record<string, unknown> | undefined;
          return {
            id: result.id,
            score: result.score,
            content,
            metadata: result.metadata as Record<string, unknown> | undefined,
            data: content,
            _index: indexName, // Track source index
          };
        });
      } catch (error) {
        console.error(`Search error for index ${indexName}:`, error);
        return [];
      }
    });

    const allResults = await Promise.all(promises);

    // Flatten and deduplicate by ID (keep highest score)
    const resultMap = new Map<string, SearchResult>();
    for (const results of allResults) {
      for (const result of results) {
        const existing = resultMap.get(result.id);
        if (!existing || result.score > existing.score) {
          resultMap.set(result.id, result);
        }
      }
    }

    // Sort by score descending and limit
    return Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async upsert(options: {
    index: string;
    id: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const index = searchClient.index(options.index);
    await index.upsert([
      {
        id: options.id,
        content: options.data,
      },
    ]);
  }

  async delete(options: { index: string; id: string }): Promise<void> {
    const index = searchClient.index(options.index);
    await index.delete({
      ids: [options.id],
    });
  }
}

export const search = new UpstashSearch();

// Cache helper functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    return redis.get<T>(key);
  },

  async set<T>(key: string, value: T, expirationSeconds?: number): Promise<void> {
    if (expirationSeconds) {
      await redis.set(key, value, { ex: expirationSeconds });
    } else {
      await redis.set(key, value);
    }
  },

  async delete(key: string): Promise<void> {
    await redis.del(key);
  },

  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },
};

// Rate limiting helper
export const rateLimit = {
  async check(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Get current count
    const current = await redis.get<{ count: number; windowStart: number }>(key);

    if (!current || now - current.windowStart > windowMs) {
      // New window
      await redis.set(key, { count: 1, windowStart: now }, { ex: windowSeconds });
      return { allowed: true, remaining: limit - 1, resetIn: windowSeconds };
    }

    if (current.count >= limit) {
      const resetIn = Math.ceil((current.windowStart + windowMs - now) / 1000);
      return { allowed: false, remaining: 0, resetIn };
    }

    // Increment count
    await redis.set(
      key,
      { count: current.count + 1, windowStart: current.windowStart },
      { ex: Math.ceil((current.windowStart + windowMs - now) / 1000) }
    );

    return {
      allowed: true,
      remaining: limit - current.count - 1,
      resetIn: Math.ceil((current.windowStart + windowMs - now) / 1000),
    };
  },
};
