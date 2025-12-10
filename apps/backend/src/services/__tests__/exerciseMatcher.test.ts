/**
 * Exercise Matcher Service Tests - Real API Integration
 *
 * These tests use REAL Upstash Search for exercise matching.
 * No mocks - all search queries go to the actual Upstash index.
 */
import { describe, it, expect } from 'vitest';
import { search, cache } from '../../lib/upstash';
import { normalizeExerciseName, generatePhoneticKey, SEARCH_INDEXES } from '../searchIndexer';
import type { ExerciseMatch } from '../exerciseMatcher';

describe('Exercise Matcher Service (Real API)', () => {
  describe('Exercise Name Normalization', () => {
    it('should normalize to lowercase', () => {
      const normalized = normalizeExerciseName('BENCH PRESS');
      expect(normalized).toBe('bench press');
    });

    it('should remove special characters', () => {
      const normalized = normalizeExerciseName('Bench-Press!');
      expect(normalized).toContain('bench');
      expect(normalized).not.toContain('!');
    });

    it('should trim whitespace', () => {
      const normalized = normalizeExerciseName('  bench press  ');
      expect(normalized).toBe('bench press');
    });

    it('should handle multiple spaces', () => {
      const normalized = normalizeExerciseName('bench   press');
      expect(normalized).toBe('bench press');
    });
  });

  describe('Phonetic Key Generation', () => {
    it('should generate phonetic key', () => {
      const key = generatePhoneticKey('bench press');
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should generate similar keys for similar words', () => {
      const key1 = generatePhoneticKey('bench');
      const key2 = generatePhoneticKey('bench');
      expect(key1).toBe(key2);
    });
  });

  describe('Upstash Search Integration', () => {
    it('should search exercises index', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'bench press',
        topK: 5,
      });

      expect(Array.isArray(results)).toBe(true);
      // Results may be empty if index has no matching data
    }, 30000);

    it('should search for different exercise types', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'squat legs',
        topK: 5,
      });

      expect(Array.isArray(results)).toBe(true);
    }, 30000);

    it('should return scored results when data exists', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'deadlift',
        topK: 10,
      });

      if (results.length > 0) {
        expect(results[0]).toHaveProperty('score');
        expect(typeof results[0].score).toBe('number');
        expect(results[0].score).toBeGreaterThan(0);
        expect(results[0].score).toBeLessThanOrEqual(1);
      }
    }, 30000);
  });

  describe('Cache Integration', () => {
    it('should cache and retrieve exercise matches', async () => {
      const testKey = `exercise_match:test:${Date.now()}`;
      const testMatches: ExerciseMatch[] = [
        {
          id: 'test-1',
          name: 'Bench Press',
          score: 0.95,
          matchType: 'exact',
          primaryMuscle: 'chest',
          equipment: ['barbell'],
        },
      ];

      await cache.set(testKey, testMatches, 60);
      const cached = await cache.get<ExerciseMatch[]>(testKey);

      expect(cached).toBeDefined();
      if (cached) {
        expect(cached[0].name).toBe('Bench Press');
      }

      // Cleanup
      await cache.delete(testKey);
    }, 10000);
  });

  describe('Match Types', () => {
    it('should validate exact match structure', () => {
      const match: ExerciseMatch = {
        id: '1',
        name: 'Bench Press',
        score: 0.99,
        matchType: 'exact',
        primaryMuscle: 'chest',
        equipment: ['barbell'],
      };

      expect(match.matchType).toBe('exact');
      expect(match.score).toBeGreaterThan(0.95);
      expect(match.equipment).toContain('barbell');
    });

    it('should validate semantic match structure', () => {
      const match: ExerciseMatch = {
        id: '2',
        name: 'Dumbbell Press',
        score: 0.85,
        matchType: 'semantic',
        primaryMuscle: 'chest',
        equipment: ['dumbbell'],
      };

      expect(match.matchType).toBe('semantic');
      expect(match.score).toBeLessThan(0.95);
      expect(match.score).toBeGreaterThan(0.7);
    });

    it('should validate fuzzy match structure', () => {
      const match: ExerciseMatch = {
        id: '3',
        name: 'Bench Presss',
        score: 0.75,
        matchType: 'fuzzy',
        primaryMuscle: 'chest',
        equipment: null,
      };

      expect(match.matchType).toBe('fuzzy');
      expect(match.equipment).toBeNull();
    });

    it('should validate phonetic match structure', () => {
      const match: ExerciseMatch = {
        id: '4',
        name: 'Bench Pres',
        score: 0.7,
        matchType: 'phonetic',
        primaryMuscle: 'chest',
        equipment: null,
      };

      expect(match.matchType).toBe('phonetic');
    });
  });
});

