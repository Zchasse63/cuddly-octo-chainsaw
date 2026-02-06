import { describe, it, expect, afterAll } from 'vitest';
import { cache, search } from '../upstash';
import { SEARCH_INDEXES } from '../../services/searchIndexer';

/**
 * Upstash Client Integration Tests
 * Tests real Redis caching and Upstash Search operations
 */

const TEST_PREFIX = `test-${Date.now()}`;

describe('Upstash Clients', () => {
  afterAll(async () => {
    // Clean up test keys
    await cache.delete(`${TEST_PREFIX}:simple`);
    await cache.delete(`${TEST_PREFIX}:object`);
    await cache.delete(`${TEST_PREFIX}:expiring`);
  });

  describe('Cache Operations', () => {
    it('should set and get a simple value', async () => {
      const key = `${TEST_PREFIX}:simple`;
      const value = 'test-value';

      await cache.set(key, value);
      const result = await cache.get<string>(key);

      expect(result).toBe(value);
    });

    it('should set and get an object value', async () => {
      const key = `${TEST_PREFIX}:object`;
      const value = { name: 'Test', count: 42, active: true };

      await cache.set(key, value);
      const result = await cache.get<typeof value>(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent-key-xyz');

      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      const key = `${TEST_PREFIX}:delete-test`;
      await cache.set(key, 'to-be-deleted');

      await cache.delete(key);
      const result = await cache.get(key);

      expect(result).toBeNull();
    });

    it('should set value with expiration', async () => {
      const key = `${TEST_PREFIX}:expiring`;
      await cache.set(key, 'expires-soon', 60);

      const result = await cache.get(key);
      expect(result).toBe('expires-soon');
    });
  });

  describe('Search Operations', () => {
    it('should execute a query on exercises index', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'bench press chest',
        topK: 3,
      });

      // May return 0 results if index is empty, but should not throw
      expect(Array.isArray(results)).toBe(true);
    });

    it('should execute a query on knowledge index', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.KNOWLEDGE,
        query: 'hypertrophy training',
        topK: 5,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should reject empty query', async () => {
      await expect(search.query({
        index: SEARCH_INDEXES.KNOWLEDGE,
        query: '',
        topK: 1,
      })).rejects.toThrow();
    });
  });
});

