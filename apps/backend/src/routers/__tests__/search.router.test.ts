import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Search Router Tests - Universal search validation
 */

describe('Search Router', () => {
  describe('Input Validation', () => {
    describe('search input', () => {
      const schema = z.object({
        query: z.string().min(1).max(200),
        types: z.array(z.enum(['exercise', 'workout', 'program', 'article', 'user'])).optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      });

      it('should accept simple query', () => {
        const result = schema.parse({ query: 'bench press' });
        expect(result.query).toBe('bench press');
        expect(result.limit).toBe(20);
      });

      it('should accept type filters', () => {
        const result = schema.parse({
          query: 'chest',
          types: ['exercise', 'workout'],
        });
        expect(result.types).toContain('exercise');
        expect(result.types).toContain('workout');
      });

      it('should accept all types', () => {
        const result = schema.parse({
          query: 'test',
          types: ['exercise', 'workout', 'program', 'article', 'user'],
        });
        expect(result.types?.length).toBe(5);
      });

      it('should reject empty query', () => {
        expect(() => schema.parse({ query: '' })).toThrow();
      });

      it('should reject query too long', () => {
        expect(() => schema.parse({ query: 'a'.repeat(201) })).toThrow();
      });

      it('should reject invalid type', () => {
        expect(() => schema.parse({
          query: 'test',
          types: ['invalid'],
        })).toThrow();
      });
    });

    describe('searchExercises input', () => {
      const schema = z.object({
        query: z.string().min(1),
        muscleGroup: z.string().optional(),
        equipment: z.array(z.string()).optional(),
        difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
        limit: z.number().min(1).max(100).default(20),
      });

      it('should accept query with filters', () => {
        const result = schema.parse({
          query: 'press',
          muscleGroup: 'chest',
          equipment: ['barbell', 'dumbbell'],
          difficulty: 'intermediate',
        });
        expect(result.muscleGroup).toBe('chest');
        expect(result.equipment).toContain('barbell');
      });

      it('should use default limit', () => {
        const result = schema.parse({ query: 'squat' });
        expect(result.limit).toBe(20);
      });
    });

    describe('searchWorkouts input', () => {
      const schema = z.object({
        query: z.string().optional(),
        status: z.enum(['active', 'completed', 'draft']).optional(),
        dateRange: z.object({
          start: z.string(),
          end: z.string(),
        }).optional(),
        limit: z.number().min(1).max(50).default(20),
      });

      it('should accept query', () => {
        const result = schema.parse({ query: 'chest day' });
        expect(result.query).toBe('chest day');
      });

      it('should accept status filter', () => {
        const result = schema.parse({ status: 'completed' });
        expect(result.status).toBe('completed');
      });

      it('should accept date range', () => {
        const result = schema.parse({
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        });
        expect(result.dateRange?.start).toBe('2024-01-01');
      });
    });

    describe('autocomplete input', () => {
      const schema = z.object({
        query: z.string().min(1).max(50),
        type: z.enum(['exercise', 'workout', 'user']),
        limit: z.number().min(1).max(10).default(5),
      });

      it('should accept autocomplete request', () => {
        const result = schema.parse({
          query: 'ben',
          type: 'exercise',
        });
        expect(result.query).toBe('ben');
        expect(result.limit).toBe(5);
      });

      it('should reject long query', () => {
        expect(() => schema.parse({
          query: 'a'.repeat(51),
          type: 'exercise',
        })).toThrow();
      });
    });

    describe('recentSearches input', () => {
      const schema = z.object({
        limit: z.number().min(1).max(20).default(10),
      });

      it('should use default limit', () => {
        expect(schema.parse({}).limit).toBe(10);
      });

      it('should accept custom limit', () => {
        expect(schema.parse({ limit: 5 }).limit).toBe(5);
      });
    });

    describe('clearSearchHistory input', () => {
      const schema = z.object({
        searchId: z.string().uuid().optional(),
      });

      it('should accept empty for clear all', () => {
        const result = schema.parse({});
        expect(result.searchId).toBeUndefined();
      });

      it('should accept specific ID', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const result = schema.parse({ searchId: uuid });
        expect(result.searchId).toBe(uuid);
      });
    });
  });
});

