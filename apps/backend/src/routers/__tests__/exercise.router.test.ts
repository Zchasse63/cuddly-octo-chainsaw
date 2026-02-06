import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Exercise Router Tests - Exercise listing and matching validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Exercise Router', () => {
  describe('Input Validation', () => {
    describe('list input', () => {
      const schema = z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        muscleGroup: z.string().optional(),
        equipment: z.string().optional(),
        search: z.string().optional(),
      }).optional();

      it('should accept empty input', () => {
        expect(schema.parse(undefined)).toBeUndefined();
      });

      it('should use defaults', () => {
        const result = schema.parse({});
        expect(result?.limit).toBe(50);
        expect(result?.offset).toBe(0);
      });

      it('should accept muscle group filter', () => {
        const result = schema.parse({ muscleGroup: 'chest' });
        expect(result?.muscleGroup).toBe('chest');
      });

      it('should accept equipment filter', () => {
        const result = schema.parse({ equipment: 'barbell' });
        expect(result?.equipment).toBe('barbell');
      });

      it('should accept search query', () => {
        const result = schema.parse({ search: 'bench press' });
        expect(result?.search).toBe('bench press');
      });

      it('should accept combined filters', () => {
        const result = schema.parse({
          muscleGroup: 'chest',
          equipment: 'dumbbell',
          search: 'press',
          limit: 20,
        });
        expect(result?.muscleGroup).toBe('chest');
        expect(result?.equipment).toBe('dumbbell');
        expect(result?.limit).toBe(20);
      });

      it('should reject invalid limit', () => {
        expect(() => schema.parse({ limit: 0 })).toThrow();
        expect(() => schema.parse({ limit: 101 })).toThrow();
      });

      it('should reject negative offset', () => {
        expect(() => schema.parse({ offset: -1 })).toThrow();
      });
    });

    describe('byId input', () => {
      const schema = z.object({ id: z.string().uuid() });

      it('should accept valid UUID', () => {
        expect(schema.parse({ id: testUUID }).id).toBe(testUUID);
      });

      it('should reject invalid UUID', () => {
        expect(() => schema.parse({ id: 'not-a-uuid' })).toThrow();
      });
    });

    describe('match input', () => {
      const schema = z.object({
        name: z.string(),
        threshold: z.number().min(0).max(1).default(0.8),
      });

      it('should accept name with default threshold', () => {
        const result = schema.parse({ name: 'bench press' });
        expect(result.name).toBe('bench press');
        expect(result.threshold).toBe(0.8);
      });

      it('should accept custom threshold', () => {
        const result = schema.parse({ name: 'squat', threshold: 0.5 });
        expect(result.threshold).toBe(0.5);
      });

      it('should reject threshold out of range', () => {
        expect(() => schema.parse({ name: 'test', threshold: -0.1 })).toThrow();
        expect(() => schema.parse({ name: 'test', threshold: 1.1 })).toThrow();
      });
    });

    describe('create input', () => {
      const schema = z.object({
        name: z.string().min(1),
        primaryMuscle: z.string(),
        secondaryMuscles: z.array(z.string()).optional(),
        equipment: z.array(z.string()).optional(),
        instructions: z.string().optional(),
        videoUrl: z.string().url().optional(),
        synonyms: z.array(z.string()).optional(),
      });

      it('should accept minimal exercise', () => {
        const result = schema.parse({
          name: 'Custom Lift',
          primaryMuscle: 'chest',
        });
        expect(result.name).toBe('Custom Lift');
      });

      it('should accept full exercise', () => {
        const result = schema.parse({
          name: 'Incline Press',
          primaryMuscle: 'chest',
          secondaryMuscles: ['front_delts', 'triceps'],
          equipment: ['barbell', 'bench'],
          instructions: 'Set bench to 30-45 degrees...',
          synonyms: ['incline bench', 'incline barbell press'],
        });
        expect(result.secondaryMuscles).toContain('triceps');
      });

      it('should reject empty name', () => {
        expect(() => schema.parse({ name: '', primaryMuscle: 'chest' })).toThrow();
      });

      it('should validate video URL', () => {
        expect(() => schema.parse({
          name: 'Test',
          primaryMuscle: 'chest',
          videoUrl: 'not-a-url',
        })).toThrow();
      });
    });
  });
});

