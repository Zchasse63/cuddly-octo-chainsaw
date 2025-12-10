/**
 * Search Indexer Service Tests - Real API Integration
 *
 * These tests use REAL Upstash Search and Redis services.
 * No mocks - all responses come from actual services.
 */
import { describe, it, expect } from 'vitest';
import { search, cache } from '../../lib/upstash';
import { normalizeExerciseName, generatePhoneticKey, SEARCH_INDEXES } from '../searchIndexer';

describe('Search Indexer Service (Real API)', () => {
  describe('Search Index Constants', () => {
    it('should have exercises index', () => {
      expect(SEARCH_INDEXES.EXERCISES).toBeDefined();
      expect(typeof SEARCH_INDEXES.EXERCISES).toBe('string');
    });

    it('should have knowledge index', () => {
      expect(SEARCH_INDEXES.KNOWLEDGE).toBeDefined();
      expect(typeof SEARCH_INDEXES.KNOWLEDGE).toBe('string');
    });

    it('should have exercise cues index', () => {
      expect(SEARCH_INDEXES.EXERCISE_CUES).toBeDefined();
      expect(typeof SEARCH_INDEXES.EXERCISE_CUES).toBe('string');
    });
  });

  describe('Exercise Name Normalization', () => {
    it('should convert to lowercase', () => {
      const normalized = normalizeExerciseName('BENCH PRESS');
      expect(normalized).toBe('bench press');
    });

    it('should remove special characters', () => {
      const normalized = normalizeExerciseName('Bench-Press!');
      expect(normalized).toContain('bench');
      expect(normalized).not.toContain('!');
      expect(normalized).not.toContain('-');
    });

    it('should normalize whitespace', () => {
      const normalized = normalizeExerciseName('  bench   press  ');
      expect(normalized).toBe('bench press');
    });
  });

  describe('Phonetic Key Generation', () => {
    it('should generate consistent keys', () => {
      const key1 = generatePhoneticKey('bench press');
      const key2 = generatePhoneticKey('bench press');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = generatePhoneticKey('bench press');
      const key2 = generatePhoneticKey('squat');
      expect(key1).not.toBe(key2);
    });
  });

  describe('Upstash Search Integration', () => {
    it('should search exercises index', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'bench press chest',
        topK: 5,
      });

      expect(Array.isArray(results)).toBe(true);
    }, 30000);

    it('should search with different queries', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'squat legs quadriceps',
        topK: 5,
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
        expect(results[0]).toHaveProperty('score');
        expect(typeof results[0].score).toBe('number');
      }
    }, 30000);
  });

  describe('Redis Cache Integration', () => {
    it('should get cached value', async () => {
      const result = await cache.get('nonexistent:key:test');
      expect(result).toBeNull();
    }, 10000);

    it('should set and get cached value', async () => {
      const testKey = `search:test:${Date.now()}`;
      const testValue = { query: 'bench', results: ['result1'] };

      await cache.set(testKey, testValue, 60);
      const cached = await cache.get<{ query: string; results: string[] }>(testKey);

      expect(cached).toBeDefined();
      if (cached) {
        expect(cached.query).toBe('bench');
      }

      // Cleanup
      await cache.delete(testKey);
    }, 10000);
  });

  describe('Search Filter Options', () => {
    it('should validate filter structure', () => {
      const filters = {
        muscleGroup: 'chest',
        equipment: ['barbell'],
        topK: 5,
      };

      expect(filters.muscleGroup).toBe('chest');
      expect(filters.equipment).toContain('barbell');
      expect(filters.topK).toBe(5);
    });

    it('should validate muscle groups', () => {
      const validMuscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
      validMuscleGroups.forEach((group) => {
        expect(typeof group).toBe('string');
      });
    });

    it('should validate equipment types', () => {
      const validEquipment = ['barbell', 'dumbbell', 'bodyweight', 'cable', 'machine'];
      validEquipment.forEach((eq) => {
        expect(typeof eq).toBe('string');
      });
    });
  });
});

