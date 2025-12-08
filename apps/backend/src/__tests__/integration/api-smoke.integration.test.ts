/**
 * API Smoke Tests - Live Integration Testing
 *
 * These tests call REAL APIs to verify connectivity and functionality:
 * - xAI (Grok) API for AI completions
 * - Upstash Redis for caching
 * - Upstash Search for vector search
 * - Supabase for database
 *
 * Run with: npm test -- --run src/__tests__/integration/api-smoke.integration.test.ts
 *
 * NOTE: These tests require valid API keys in .env
 * Uses pre-seeded test data from seed-data.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../db';
import { users } from '../../db/schema';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

let seededUsers: SeededTestUsers;

describe('API Smoke Tests', () => {
  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
  });

  // No cleanup needed - using pre-seeded data

  describe('1. Supabase/Database Connection', () => {
    it('should connect and query the database', async () => {
      const result = await db.select().from(users).limit(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should verify seeded test user exists', async () => {
      expect(seededUsers.premiumAthlete.id).toBeDefined();
      expect(seededUsers.premiumAthlete.email).toContain('test-premium-athlete');
    });
  });

  describe('2. Upstash Redis Connection', () => {
    it('should set and get a value', async () => {
      const { cache } = await import('../../lib/upstash');

      const testKey = `smoke-test:${Date.now()}`;
      const testValue = { test: true, timestamp: Date.now() };

      // cache.set already handles serialization internally
      await cache.set(testKey, testValue, 60);
      const result = await cache.get<typeof testValue>(testKey);

      expect(result).toBeDefined();
      expect(result?.test).toBe(true);

      // Cleanup
      await cache.delete(testKey);
    });
  });

  describe('3. Upstash Search Connection', () => {
    it('should query the search index', async () => {
      const { search } = await import('../../lib/upstash');
      const { SEARCH_INDEXES } = await import('../../services/searchIndexer');

      // Query exercises index using correct parameter name (UPPERCASE)
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'bench press',
        topK: 3,
      });

      // May return empty if index is empty, but shouldn't throw
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('4. xAI (Grok) API Connection', () => {
    it('should generate a text completion', async () => {
      const { generateCompletion, TEMPERATURES } = await import('../../lib/ai');
      
      const response = await generateCompletion({
        systemPrompt: 'You are a fitness coach. Respond in one sentence.',
        userPrompt: 'What is good form for a squat?',
        temperature: TEMPERATURES.coaching,
        maxTokens: 100,
      });
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(10);
    }, 30000); // 30s timeout for API call

    it('should stream a text completion', async () => {
      const { streamCompletion, TEMPERATURES } = await import('../../lib/ai');
      
      const chunks: string[] = [];
      const generator = streamCompletion({
        systemPrompt: 'You are a fitness coach. Respond briefly.',
        userPrompt: 'Name one exercise for chest.',
        temperature: TEMPERATURES.coaching,
        maxTokens: 50,
      });
      
      for await (const chunk of generator) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      const fullResponse = chunks.join('');
      expect(fullResponse.length).toBeGreaterThan(0);
    }, 30000);
  });
});

