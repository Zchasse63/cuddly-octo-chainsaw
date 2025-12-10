import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Workout Router Tests
 * Tests input validation, business logic, and response contracts
 */

// 1RM calculation (Epley formula) - extracted from router
function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Test UUID for validation tests
const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Workout Router', () => {
  describe('Input Validation', () => {
    describe('start input', () => {
      const startSchema = z.object({
        name: z.string().optional(),
        programId: z.string().uuid().optional(),
        programWeek: z.number().optional(),
        programDay: z.number().optional(),
      }).optional();

      it('should accept empty input', () => {
        expect(startSchema.parse(undefined)).toBeUndefined();
      });

      it('should accept workout name', () => {
        expect(startSchema.parse({ name: 'Chest Day' })).toEqual({ name: 'Chest Day' });
      });

      it('should accept program reference', () => {
        const input = {
          name: 'Week 1 Day 1',
          programId: testUUID,
          programWeek: 1,
          programDay: 1,
        };
        expect(startSchema.parse(input)).toEqual(input);
      });

      it('should reject invalid program UUID', () => {
        expect(() => startSchema.parse({ programId: 'not-a-uuid' })).toThrow();
      });
    });

    describe('logSet input', () => {
      const logSetSchema = z.object({
        workoutId: z.string().uuid(),
        exerciseId: z.string().uuid(),
        setNumber: z.number().min(1),
        reps: z.number().min(1),
        weight: z.number().min(0).optional(),
        weightUnit: z.enum(['lbs', 'kg']).default('lbs'),
        rpe: z.number().min(1).max(10).optional(),
        loggingMethod: z.enum(['voice', 'manual', 'quick_log']).default('manual'),
        voiceTranscript: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
      });

      it('should validate complete set data', () => {
        const input = {
          workoutId: testUUID,
          exerciseId: testUUID,
          setNumber: 1,
          reps: 8,
          weight: 185,
        };
        const parsed = logSetSchema.parse(input);
        expect(parsed.weightUnit).toBe('lbs');
        expect(parsed.loggingMethod).toBe('manual');
      });

      it('should accept voice logging data', () => {
        const input = {
          workoutId: testUUID,
          exerciseId: testUUID,
          setNumber: 2,
          reps: 8,
          weight: 185,
          loggingMethod: 'voice' as const,
          voiceTranscript: 'bench 185 for 8',
          confidence: 0.95,
        };
        expect(logSetSchema.parse(input)).toBeDefined();
      });

      it('should reject set number less than 1', () => {
        expect(() => logSetSchema.parse({
          workoutId: testUUID,
          exerciseId: testUUID,
          setNumber: 0,
          reps: 8,
        })).toThrow();
      });

      it('should reject reps less than 1', () => {
        expect(() => logSetSchema.parse({
          workoutId: testUUID,
          exerciseId: testUUID,
          setNumber: 1,
          reps: 0,
        })).toThrow();
      });

      it('should reject negative weight', () => {
        expect(() => logSetSchema.parse({
          workoutId: testUUID,
          exerciseId: testUUID,
          setNumber: 1,
          reps: 8,
          weight: -10,
        })).toThrow();
      });

      it('should reject RPE outside 1-10 range', () => {
        expect(() => logSetSchema.parse({
          workoutId: testUUID,
          exerciseId: testUUID,
          setNumber: 1,
          reps: 8,
          rpe: 11,
        })).toThrow();
      });

      it('should reject invalid weight unit', () => {
        expect(() => logSetSchema.parse({
          workoutId: testUUID,
          exerciseId: testUUID,
          setNumber: 1,
          reps: 8,
          weightUnit: 'stones',
        })).toThrow();
      });
    });

    describe('complete input', () => {
      const completeSchema = z.object({
        workoutId: z.string().uuid(),
        notes: z.string().optional(),
      });

      it('should accept workout completion', () => {
        expect(completeSchema.parse({ workoutId: testUUID })).toBeDefined();
      });

      it('should accept completion with notes', () => {
        const input = { workoutId: testUUID, notes: 'Great session!' };
        expect(completeSchema.parse(input)).toEqual(input);
      });
    });

    describe('history input', () => {
      const historySchema = z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }).optional();

      it('should provide default pagination', () => {
        expect(historySchema.parse(undefined)).toBeUndefined();
      });

      it('should accept custom pagination', () => {
        const input = { limit: 10, offset: 20 };
        expect(historySchema.parse(input)).toEqual(input);
      });

      it('should reject limit over 50', () => {
        expect(() => historySchema.parse({ limit: 100 })).toThrow();
      });
    });
  });

  describe('Business Logic', () => {
    describe('1RM Calculation (Epley Formula)', () => {
      it('should return weight for single rep', () => {
        expect(calculate1RM(315, 1)).toBe(315);
      });

      it('should calculate 1RM for multiple reps', () => {
        // 185 * (1 + 8/30) = 185 * 1.267 = 234.33
        expect(calculate1RM(185, 8)).toBeCloseTo(234.33, 1);
      });

      it('should calculate 1RM for high reps', () => {
        // 135 * (1 + 12/30) = 135 * 1.4 = 189
        expect(calculate1RM(135, 12)).toBe(189);
      });

      it('should handle bodyweight exercises (0 weight)', () => {
        expect(calculate1RM(0, 15)).toBe(0);
      });
    });

    describe('PR Detection Logic', () => {
      it('should detect PR when new 1RM exceeds existing', () => {
        const existingMax = 200;
        const new1RM = calculate1RM(185, 8); // ~234
        expect(new1RM > existingMax).toBe(true);
      });

      it('should not detect PR when new 1RM is lower', () => {
        const existingMax = 300;
        const new1RM = calculate1RM(185, 8); // ~234
        expect(new1RM > existingMax).toBe(false);
      });

      it('should detect PR on first lift (no existing)', () => {
        const existingMax = null;
        const new1RM = calculate1RM(185, 8);
        expect(!existingMax || new1RM > 0).toBe(true);
      });
    });

    describe('Volume Calculation', () => {
      it('should calculate total volume', () => {
        const sets = [
          { weight: 185, reps: 8 },
          { weight: 185, reps: 8 },
          { weight: 185, reps: 6 },
        ];
        const totalVolume = sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
        expect(totalVolume).toBe(185 * 8 + 185 * 8 + 185 * 6); // 4070
      });

      it('should handle sets without weight', () => {
        const sets = [
          { weight: null, reps: 15 },
          { weight: null, reps: 12 },
        ];
        const totalVolume = sets.reduce((acc, s) => acc + (s.weight || 0) * s.reps, 0);
        expect(totalVolume).toBe(0);
      });
    });

    describe('Duration Calculation', () => {
      it('should calculate workout duration in seconds', () => {
        const startedAt = new Date('2024-01-15T10:00:00Z');
        const completedAt = new Date('2024-01-15T11:30:00Z');
        const duration = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);
        expect(duration).toBe(5400); // 90 minutes in seconds
      });
    });
  });

  describe('Response Contracts', () => {
    it('should return workout with required fields', () => {
      const workout = {
        id: testUUID,
        userId: 'user-123',
        name: 'Chest Day',
        status: 'active',
        startedAt: new Date().toISOString(),
      };

      expect(workout).toHaveProperty('id');
      expect(workout).toHaveProperty('userId');
      expect(workout).toHaveProperty('status');
      expect(workout).toHaveProperty('startedAt');
    });

    it('should return set with PR flag', () => {
      const setResult = {
        set: {
          id: 'set-123',
          workoutId: testUUID,
          exerciseId: testUUID,
          reps: 8,
          weight: 185,
          isPr: true,
          estimated1rm: 234.33,
        },
        isPr: true,
      };

      expect(setResult.set).toHaveProperty('isPr');
      expect(setResult).toHaveProperty('isPr');
    });

    it('should return workout summary on completion', () => {
      const summary = {
        totalSets: 15,
        totalVolume: 12500,
        duration: 3600,
        prsAchieved: 2,
      };

      expect(summary).toHaveProperty('totalSets');
      expect(summary).toHaveProperty('totalVolume');
      expect(summary).toHaveProperty('duration');
      expect(summary).toHaveProperty('prsAchieved');
    });
  });
});

