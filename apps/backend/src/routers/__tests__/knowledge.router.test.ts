import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Knowledge Router Tests - Knowledge base search and retrieval validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Knowledge Router', () => {
  describe('Input Validation', () => {
    describe('search input', () => {
      const schema = z.object({
        query: z.string().min(1),
        category: z.enum(['technique', 'nutrition', 'recovery', 'programming', 'anatomy']).optional(),
        limit: z.number().min(1).max(20).default(5),
      });

      it('should accept simple query', () => {
        const result = schema.parse({ query: 'proper squat form' });
        expect(result.query).toBe('proper squat form');
        expect(result.limit).toBe(5);
      });

      it('should accept category filter', () => {
        const result = schema.parse({
          query: 'protein intake',
          category: 'nutrition',
        });
        expect(result.category).toBe('nutrition');
      });

      it('should accept all valid categories', () => {
        const categories = ['technique', 'nutrition', 'recovery', 'programming', 'anatomy'];
        categories.forEach(category => {
          const result = schema.parse({ query: 'test', category: category as any });
          expect(result.category).toBe(category);
        });
      });

      it('should reject empty query', () => {
        expect(() => schema.parse({ query: '' })).toThrow();
      });

      it('should reject invalid category', () => {
        expect(() => schema.parse({ query: 'test', category: 'invalid' })).toThrow();
      });

      it('should reject limit out of range', () => {
        expect(() => schema.parse({ query: 'test', limit: 0 })).toThrow();
        expect(() => schema.parse({ query: 'test', limit: 21 })).toThrow();
      });
    });

    describe('getArticle input', () => {
      const schema = z.object({
        articleId: z.string().uuid(),
      });

      it('should accept valid UUID', () => {
        expect(schema.parse({ articleId: testUUID }).articleId).toBe(testUUID);
      });

      it('should reject invalid UUID', () => {
        expect(() => schema.parse({ articleId: 'not-valid' })).toThrow();
      });
    });

    describe('getExerciseCues input', () => {
      const schema = z.object({
        exerciseId: z.string().uuid(),
        cueType: z.enum(['setup', 'execution', 'breathing', 'common_mistakes']).optional(),
      });

      it('should accept exercise ID only', () => {
        const result = schema.parse({ exerciseId: testUUID });
        expect(result.exerciseId).toBe(testUUID);
      });

      it('should accept cue type filter', () => {
        const result = schema.parse({
          exerciseId: testUUID,
          cueType: 'execution',
        });
        expect(result.cueType).toBe('execution');
      });

      it('should accept all cue types', () => {
        const cueTypes = ['setup', 'execution', 'breathing', 'common_mistakes'];
        cueTypes.forEach(cueType => {
          const result = schema.parse({ exerciseId: testUUID, cueType: cueType as any });
          expect(result.cueType).toBe(cueType);
        });
      });
    });

    describe('getTopic input', () => {
      const schema = z.object({
        topic: z.string().min(1),
        depth: z.enum(['summary', 'detailed', 'comprehensive']).default('summary'),
      });

      it('should accept topic with default depth', () => {
        const result = schema.parse({ topic: 'progressive overload' });
        expect(result.topic).toBe('progressive overload');
        expect(result.depth).toBe('summary');
      });

      it('should accept custom depth', () => {
        const result = schema.parse({
          topic: 'muscle hypertrophy',
          depth: 'comprehensive',
        });
        expect(result.depth).toBe('comprehensive');
      });

      it('should reject empty topic', () => {
        expect(() => schema.parse({ topic: '' })).toThrow();
      });
    });

    describe('getRelatedContent input', () => {
      const schema = z.object({
        contentId: z.string().uuid(),
        limit: z.number().min(1).max(10).default(5),
      });

      it('should use default limit', () => {
        const result = schema.parse({ contentId: testUUID });
        expect(result.limit).toBe(5);
      });

      it('should accept custom limit', () => {
        const result = schema.parse({ contentId: testUUID, limit: 3 });
        expect(result.limit).toBe(3);
      });
    });

    describe('bookmarkArticle input', () => {
      const schema = z.object({
        articleId: z.string().uuid(),
        notes: z.string().optional(),
      });

      it('should accept bookmark', () => {
        const result = schema.parse({ articleId: testUUID });
        expect(result.articleId).toBe(testUUID);
      });

      it('should accept bookmark with notes', () => {
        const result = schema.parse({
          articleId: testUUID,
          notes: 'Important for my training',
        });
        expect(result.notes).toBe('Important for my training');
      });
    });
  });
});

