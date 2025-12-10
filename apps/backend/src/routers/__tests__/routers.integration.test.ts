import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Router Schema and Validation Tests
 *
 * Tests Zod schemas, input validation, and business logic calculations.
 * For actual router execution tests with real database calls,
 * see the integration/ directory tests.
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Router Schema Tests', () => {

  describe('Input Validation Schemas', () => {
    it('should validate email format', () => {
      const emailSchema = z.string().email();
      expect(() => emailSchema.parse('invalid-email')).toThrow();
      expect(emailSchema.parse('user@example.com')).toBe('user@example.com');
    });

    it('should validate password requirements', () => {
      const passwordSchema = z.string().min(8);
      expect(() => passwordSchema.parse('short')).toThrow();
      expect(passwordSchema.parse('validpassword123')).toBe('validpassword123');
    });

    it('should validate UUID format', () => {
      const uuidSchema = z.string().uuid();
      expect(() => uuidSchema.parse('not-a-uuid')).toThrow();
      expect(uuidSchema.parse(testUUID)).toBe(testUUID);
    });

    it('should validate numeric ranges', () => {
      const rangeSchema = z.number().min(0).max(100);
      expect(() => rangeSchema.parse(-1)).toThrow();
      expect(() => rangeSchema.parse(101)).toThrow();
      expect(rangeSchema.parse(50)).toBe(50);
    });

    it('should validate RPE scale (1-10)', () => {
      const rpeSchema = z.number().min(1).max(10);
      expect(() => rpeSchema.parse(0)).toThrow();
      expect(() => rpeSchema.parse(11)).toThrow();
      expect(rpeSchema.parse(8)).toBe(8);
    });

    it('should validate weight unit enum', () => {
      const unitSchema = z.enum(['lbs', 'kg']);
      expect(() => unitSchema.parse('stones')).toThrow();
      expect(unitSchema.parse('lbs')).toBe('lbs');
      expect(unitSchema.parse('kg')).toBe('kg');
    });

    it('should validate logging method enum', () => {
      const methodSchema = z.enum(['voice', 'manual', 'quick_log']);
      expect(() => methodSchema.parse('other')).toThrow();
      expect(methodSchema.parse('voice')).toBe('voice');
    });
  });

  describe('Response Contracts', () => {
    it('should return consistent error format', () => {
      const errorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
        },
      };

      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
    });

    it('should return data with metadata for lists', () => {
      const response = {
        data: [{ id: '1', name: 'Item 1' }],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
        },
      };

      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('meta');
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should include timestamps in responses', () => {
      const response = {
        id: 'test-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(response).toHaveProperty('createdAt');
      expect(response).toHaveProperty('updatedAt');
      expect(new Date(response.createdAt)).toBeInstanceOf(Date);
    });
  });

  describe('Workout Router', () => {
    it('should validate workout start input', () => {
      const schema = z.object({
        name: z.string().optional(),
        programId: z.string().uuid().optional(),
      }).optional();

      expect(schema.parse(undefined)).toBeUndefined();
      expect(schema.parse({ name: 'Leg Day' })).toEqual({ name: 'Leg Day' });
    });

    it('should validate logSet input', () => {
      const schema = z.object({
        workoutId: z.string().uuid(),
        exerciseId: z.string().uuid(),
        setNumber: z.number().min(1),
        reps: z.number().min(1),
        weight: z.number().min(0).optional(),
        weightUnit: z.enum(['lbs', 'kg']).default('lbs'),
        rpe: z.number().min(1).max(10).optional(),
      });

      const validInput = {
        workoutId: testUUID,
        exerciseId: testUUID,
        setNumber: 1,
        reps: 8,
        weight: 185,
      };

      expect(schema.parse(validInput)).toBeDefined();
      expect(schema.parse(validInput).weightUnit).toBe('lbs');
    });

    it('should calculate 1RM correctly', () => {
      // Epley formula: weight * (1 + reps / 30)
      const calculate1RM = (weight: number, reps: number) =>
        reps === 1 ? weight : weight * (1 + reps / 30);

      expect(calculate1RM(225, 1)).toBe(225);
      expect(calculate1RM(185, 8)).toBeCloseTo(234.33, 1);
      expect(calculate1RM(135, 12)).toBeCloseTo(189, 0);
    });
  });

  describe('Voice Router', () => {
    it('should validate voice parse input', () => {
      const schema = z.object({
        transcript: z.string().min(1),
        workoutId: z.string().uuid(),
      });

      expect(() => schema.parse({ transcript: '', workoutId: testUUID })).toThrow();
      expect(schema.parse({ transcript: 'bench 185 for 8', workoutId: testUUID })).toBeDefined();
    });

    it('should validate voice confirm input', () => {
      const schema = z.object({
        workoutId: z.string().uuid(),
        exerciseId: z.string().uuid(),
        reps: z.number().min(1),
        weight: z.number().optional(),
        weightUnit: z.enum(['lbs', 'kg']).default('lbs'),
        voiceTranscript: z.string(),
        confidence: z.number(),
      });

      const validInput = {
        workoutId: testUUID,
        exerciseId: testUUID,
        reps: 8,
        weight: 185,
        voiceTranscript: 'bench 185 for 8',
        confidence: 0.95,
      };

      expect(schema.parse(validInput)).toBeDefined();
    });
  });

  describe('Exercise Router', () => {
    it('should validate search input', () => {
      const schema = z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
        muscleGroup: z.string().optional(),
      });

      expect(schema.parse({ query: 'bench' })).toEqual({
        query: 'bench',
        limit: 20,
      });
    });

    it('should validate exercise by ID input', () => {
      const schema = z.object({ id: z.string().uuid() });
      expect(schema.parse({ id: testUUID })).toEqual({ id: testUUID });
      expect(() => schema.parse({ id: 'not-uuid' })).toThrow();
    });
  });

  describe('Coach Router', () => {
    it('should validate message input', () => {
      const schema = z.object({
        message: z.string().min(1).max(2000),
        conversationId: z.string().uuid().optional(),
      });

      expect(schema.parse({ message: 'How do I improve my squat?' })).toBeDefined();
      expect(() => schema.parse({ message: '' })).toThrow();
    });
  });

  describe('Program Router', () => {
    it('should validate program generation input', () => {
      const schema = z.object({
        goal: z.enum(['strength', 'hypertrophy', 'endurance', 'weight_loss']),
        daysPerWeek: z.number().min(2).max(7),
        experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
      });

      const validInput = {
        goal: 'strength' as const,
        daysPerWeek: 4,
        experienceLevel: 'intermediate' as const,
      };

      expect(schema.parse(validInput)).toBeDefined();
      expect(() => schema.parse({ ...validInput, daysPerWeek: 8 })).toThrow();
    });
  });

  describe('Running Router', () => {
    it('should validate run session input', () => {
      const schema = z.object({
        distance: z.number().positive(),
        distanceUnit: z.enum(['mi', 'km']),
        duration: z.number().positive(),
        elevationGain: z.number().optional(),
      });

      expect(schema.parse({
        distance: 5.0,
        distanceUnit: 'mi',
        duration: 2400,
      })).toBeDefined();
    });

    it('should calculate pace correctly', () => {
      const calculatePace = (distance: number, duration: number) =>
        duration / distance / 60; // minutes per unit

      expect(calculatePace(5, 2400)).toBeCloseTo(8, 0); // 8 min/mi
    });
  });

  describe('Gamification Router', () => {
    it('should validate badge check input', () => {
      const schema = z.object({
        badgeType: z.string(),
        metadata: z.record(z.any()).optional(),
      });

      expect(schema.parse({ badgeType: 'first_workout' })).toBeDefined();
    });
  });

  describe('Nutrition Router', () => {
    it('should validate nutrition log input', () => {
      const schema = z.object({
        date: z.string(),
        calories: z.number().positive().optional(),
        protein: z.number().min(0).optional(),
        carbs: z.number().min(0).optional(),
        fat: z.number().min(0).optional(),
      });

      expect(schema.parse({
        date: '2024-01-15',
        calories: 2000,
        protein: 150,
      })).toBeDefined();
    });
  });

  describe('Readiness Router', () => {
    it('should validate readiness score input', () => {
      const schema = z.object({
        sleepQuality: z.number().min(1).max(10),
        sleepHours: z.number().min(0).max(24),
        soreness: z.number().min(1).max(10),
        stress: z.number().min(1).max(10),
        motivation: z.number().min(1).max(10),
      });

      expect(schema.parse({
        sleepQuality: 7,
        sleepHours: 7.5,
        soreness: 4,
        stress: 3,
        motivation: 8,
      })).toBeDefined();
    });

    it('should calculate overall readiness', () => {
      const calculateReadiness = (scores: number[]) =>
        scores.reduce((a, b) => a + b, 0) / scores.length;

      expect(calculateReadiness([7, 8, 6, 5, 9])).toBe(7);
    });
  });

  describe('Social Router', () => {
    it('should validate post creation input', () => {
      const schema = z.object({
        content: z.string().min(1).max(500),
        workoutId: z.string().uuid().optional(),
        visibility: z.enum(['public', 'friends', 'private']).default('public'),
      });

      expect(schema.parse({ content: 'Great workout today!' })).toBeDefined();
    });
  });

  describe('Analytics Router', () => {
    it('should validate date range input', () => {
      const schema = z.object({
        startDate: z.string(),
        endDate: z.string(),
        metrics: z.array(z.string()).optional(),
      });

      expect(schema.parse({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors with details', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().positive(),
      });

      try {
        schema.parse({ name: 'John', age: -5 });
      } catch (error: any) {
        expect(error.errors).toBeDefined();
        expect(error.errors[0].path).toContain('age');
      }
    });

    it('should handle missing required fields', () => {
      const schema = z.object({
        id: z.string(),
        name: z.string(),
      });

      expect(() => schema.parse({ id: 'test' })).toThrow();
    });

    it('should provide detailed error messages', () => {
      const schema = z.object({
        email: z.string().email(),
      });

      try {
        schema.parse({ email: 'not-an-email' });
      } catch (error: any) {
        expect(error.errors[0].message).toContain('email');
      }
    });
  });

});
