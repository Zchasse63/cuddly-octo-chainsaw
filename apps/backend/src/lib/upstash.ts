import { Redis } from '@upstash/redis';

// Upstash Redis client for caching and rate limiting
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Upstash Search client for hybrid search
// Note: Using the REST API directly since @upstash/search may not be available yet
export class UpstashSearch {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = process.env.UPSTASH_SEARCH_REST_URL!;
    this.token = process.env.UPSTASH_SEARCH_REST_TOKEN!;
  }

  async query(options: {
    index: string;
    query: string;
    topK?: number;
    filter?: string;
  }): Promise<SearchResult[]> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index: options.index,
        query: options.query,
        topK: options.topK || 5,
        filter: options.filter,
      }),
    });

    if (!response.ok) {
      throw new Error(`Upstash Search query failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  async upsert(options: {
    index: string;
    id: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/upsert`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index: options.index,
        documents: [
          {
            id: options.id,
            ...options.data,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Upstash Search upsert failed: ${response.statusText}`);
    }
  }

  async delete(options: { index: string; id: string }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        index: options.index,
        ids: [options.id],
      }),
    });

    if (!response.ok) {
      throw new Error(`Upstash Search delete failed: ${response.statusText}`);
    }
  }
}

export interface SearchResult {
  id: string;
  score: number;
  data: Record<string, unknown>;
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
