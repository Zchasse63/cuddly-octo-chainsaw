import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Analytics Router Tests - Input validation and business logic
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Analytics Router', () => {
  describe('Input Validation', () => {
    describe('getDailyAnalytics input', () => {
      const schema = z.object({
        startDate: z.string(),
        endDate: z.string(),
      });

      it('should accept valid date range', () => {
        const result = schema.parse({ startDate: '2024-01-01', endDate: '2024-01-31' });
        expect(result.startDate).toBe('2024-01-01');
        expect(result.endDate).toBe('2024-01-31');
      });

      it('should reject missing dates', () => {
        expect(() => schema.parse({ startDate: '2024-01-01' })).toThrow();
        expect(() => schema.parse({ endDate: '2024-01-31' })).toThrow();
      });
    });

    describe('getWeeklyAnalytics input', () => {
      const schema = z.object({
        weeks: z.number().min(1).max(52).default(12),
      });

      it('should use default weeks', () => {
        expect(schema.parse({}).weeks).toBe(12);
      });

      it('should accept valid weeks', () => {
        expect(schema.parse({ weeks: 4 }).weeks).toBe(4);
        expect(schema.parse({ weeks: 52 }).weeks).toBe(52);
      });

      it('should reject invalid weeks', () => {
        expect(() => schema.parse({ weeks: 0 })).toThrow();
        expect(() => schema.parse({ weeks: 53 })).toThrow();
      });
    });

    describe('getExerciseAnalytics input', () => {
      const schema = z.object({ exerciseId: z.string().uuid() });

      it('should accept valid UUID', () => {
        expect(schema.parse({ exerciseId: testUUID }).exerciseId).toBe(testUUID);
      });

      it('should reject invalid UUID', () => {
        expect(() => schema.parse({ exerciseId: 'not-a-uuid' })).toThrow();
      });
    });

    describe('getAllExerciseAnalytics input', () => {
      const schema = z.object({
        sortBy: z.enum(['volume', 'frequency', 'max_weight', 'recent']).default('recent'),
        limit: z.number().min(1).max(50).default(20),
      });

      it('should use defaults', () => {
        const result = schema.parse({});
        expect(result.sortBy).toBe('recent');
        expect(result.limit).toBe(20);
      });

      it('should accept valid sort options', () => {
        expect(schema.parse({ sortBy: 'volume' }).sortBy).toBe('volume');
        expect(schema.parse({ sortBy: 'frequency' }).sortBy).toBe('frequency');
        expect(schema.parse({ sortBy: 'max_weight' }).sortBy).toBe('max_weight');
      });

      it('should reject invalid sort', () => {
        expect(() => schema.parse({ sortBy: 'invalid' })).toThrow();
      });
    });

    describe('getBodyPartVolume input', () => {
      const schema = z.object({
        bodyPart: z.enum(['chest', 'back', 'shoulders', 'legs', 'arms', 'core']),
        weeks: z.number().min(1).max(12).default(4),
      });

      it('should accept valid body part', () => {
        expect(schema.parse({ bodyPart: 'chest' }).bodyPart).toBe('chest');
        expect(schema.parse({ bodyPart: 'back' }).bodyPart).toBe('back');
      });

      it('should use default weeks', () => {
        expect(schema.parse({ bodyPart: 'chest' }).weeks).toBe(4);
      });

      it('should reject invalid body part', () => {
        expect(() => schema.parse({ bodyPart: 'invalid' })).toThrow();
      });
    });

    describe('getTrainingLoad input', () => {
      const schema = z.object({
        days: z.number().min(7).max(90).default(28),
      });

      it('should use default days', () => {
        expect(schema.parse({}).days).toBe(28);
      });

      it('should accept valid range', () => {
        expect(schema.parse({ days: 7 }).days).toBe(7);
        expect(schema.parse({ days: 90 }).days).toBe(90);
      });

      it('should reject out of range', () => {
        expect(() => schema.parse({ days: 6 })).toThrow();
        expect(() => schema.parse({ days: 91 })).toThrow();
      });
    });

    describe('createGoal input', () => {
      const schema = z.object({
        goalType: z.enum(['strength', 'volume', 'frequency', 'weight', 'body_fat']),
        targetValue: z.number().positive(),
        targetDate: z.string().optional(),
        exerciseId: z.string().uuid().optional(),
        metadata: z.record(z.unknown()).optional(),
      });

      it('should accept valid goal', () => {
        const result = schema.parse({
          goalType: 'strength',
          targetValue: 225,
          exerciseId: testUUID,
        });
        expect(result.goalType).toBe('strength');
        expect(result.targetValue).toBe(225);
      });

      it('should reject negative target', () => {
        expect(() => schema.parse({ goalType: 'strength', targetValue: -10 })).toThrow();
      });
    });
  });
});

