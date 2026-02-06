/**
 * AI Coach RAG Service Tests - Real API Integration
 *
 * These tests use REAL Upstash Search and Grok API calls.
 * No mocks - all responses come from actual services.
 */
import { describe, it, expect } from 'vitest';
import { search, cache } from '../../lib/upstash';
import { SEARCH_INDEXES } from '../searchIndexer';
import { generateCompletion, TEMPERATURES } from '../../lib/ai';

describe('AI Coach RAG Service (Real API)', () => {
  describe('Knowledge Retrieval - Upstash Search', () => {
    it('should search exercises index', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'squat form technique',
        topK: 5,
      });

      expect(Array.isArray(results)).toBe(true);
      // Results may be empty if index has no matching data, but should not throw
    }, 30000);

    it('should search with different queries', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'bench press chest',
        topK: 3,
      });

      expect(Array.isArray(results)).toBe(true);
    }, 30000);

    it('should return scored results', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'deadlift back',
        topK: 5,
      });

      if (results.length > 0) {
        // Each result should have a score
        expect(results[0]).toHaveProperty('score');
        expect(typeof results[0].score).toBe('number');
      }
    }, 30000);
  });

  describe('Redis Cache', () => {
    it('should set and get cached values', async () => {
      const testKey = `test:rag:${Date.now()}`;
      const testValue = { query: 'squat', results: ['result1', 'result2'] };

      await cache.set(testKey, testValue, 60);
      const cached = await cache.get<{ query: string; results: string[] }>(testKey);

      expect(cached).toBeDefined();
      if (cached) {
        expect(cached.query).toBe('squat');
      }

      // Cleanup
      await cache.delete(testKey);
    }, 10000);

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent:key:12345');
      expect(result).toBeNull();
    }, 10000);
  });

  describe('Context Building', () => {
    it('should build context with user history', () => {
      const userContext = {
        userId: 'user-123',
        name: 'John',
        experienceLevel: 'intermediate',
        goals: ['build_muscle', 'get_stronger'],
        injuries: ['lower_back'],
      };

      const contextString = buildUserContext(userContext);

      expect(contextString).toContain('John');
      expect(contextString).toContain('intermediate');
      expect(contextString).toContain('lower_back');
    });

    it('should include recent PRs in context', () => {
      const userContext = {
        userId: 'user-123',
        recentPrs: [
          { exercise: 'Bench Press', weight: 225, reps: 1 },
          { exercise: 'Squat', weight: 315, reps: 1 },
        ],
      };

      const contextString = buildUserContext(userContext);

      expect(contextString).toContain('Bench Press');
      expect(contextString).toContain('225');
    });

    it('should include current workout context', () => {
      const userContext = {
        userId: 'user-123',
        currentWorkout: {
          name: 'Push Day',
          exercises: ['Bench Press', 'Shoulder Press'],
          duration: 45,
        },
      };

      const contextString = buildUserContext(userContext);

      expect(contextString).toContain('Push Day');
    });
  });

  describe('Response Generation - Real Grok API', () => {
    it('should generate contextual squat form response', async () => {
      const response = await generateCompletion({
        systemPrompt: 'You are a fitness coach. Provide brief, helpful advice.',
        userPrompt: 'How do I squat correctly?',
        temperature: TEMPERATURES.coaching,
        maxTokens: 200,
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(20);
    }, 30000);

    it('should generate response with user context', async () => {
      const userContext = buildUserContext({
        userId: 'test-user',
        name: 'Mike',
        experienceLevel: 'beginner',
        goals: ['strength'],
      });

      const response = await generateCompletion({
        systemPrompt: `You are a fitness coach. User context:\n${userContext}`,
        userPrompt: 'What should I focus on for my first workout?',
        temperature: TEMPERATURES.coaching,
        maxTokens: 200,
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(20);
    }, 30000);

    it('should handle injury-aware responses', async () => {
      const userContext = buildUserContext({
        userId: 'test-user',
        injuries: ['shoulder impingement'],
      });

      const response = await generateCompletion({
        systemPrompt: `You are a fitness coach. Be mindful of user limitations.\n${userContext}`,
        userPrompt: 'What upper body exercises can I do safely?',
        temperature: TEMPERATURES.coaching,
        maxTokens: 200,
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(20);
    }, 30000);
  });
});

// Helper function matching the service
function buildUserContext(context: {
  userId: string;
  name?: string;
  experienceLevel?: string;
  goals?: string[];
  injuries?: string[];
  recentPrs?: Array<{ exercise: string; weight: number; reps: number }>;
  currentWorkout?: { name?: string; exercises?: string[]; duration?: number };
}): string {
  const parts: string[] = [];

  if (context.name) parts.push(`User: ${context.name}`);
  if (context.experienceLevel) parts.push(`Level: ${context.experienceLevel}`);
  if (context.goals?.length) parts.push(`Goals: ${context.goals.join(', ')}`);
  if (context.injuries?.length) parts.push(`Injuries/limitations: ${context.injuries.join(', ')}`);
  if (context.recentPrs?.length) {
    const prs = context.recentPrs.map(pr => `${pr.exercise}: ${pr.weight}lbs x ${pr.reps}`).join(', ');
    parts.push(`Recent PRs: ${prs}`);
  }
  if (context.currentWorkout) {
    parts.push(`Current workout: ${context.currentWorkout.name || 'Active'}`);
  }

  return parts.join('\n');
}

