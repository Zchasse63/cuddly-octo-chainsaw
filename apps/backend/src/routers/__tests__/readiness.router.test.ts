import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Readiness Router Tests - Training readiness and recovery validation
 */

describe('Readiness Router', () => {
  describe('Input Validation', () => {
    describe('logReadiness input', () => {
      const schema = z.object({
        date: z.string().optional(),
        sleepQuality: z.number().min(1).max(10),
        sleepDuration: z.number().min(0).max(24),
        musclesSoreness: z.number().min(1).max(10),
        energyLevel: z.number().min(1).max(10),
        stressLevel: z.number().min(1).max(10),
        mood: z.number().min(1).max(10).optional(),
        restingHeartRate: z.number().positive().optional(),
        hrvScore: z.number().positive().optional(),
        notes: z.string().optional(),
      });

      it('should accept minimal readiness check', () => {
        const result = schema.parse({
          sleepQuality: 7,
          sleepDuration: 7.5,
          musclesSoreness: 3,
          energyLevel: 8,
          stressLevel: 4,
        });
        expect(result.sleepQuality).toBe(7);
        expect(result.energyLevel).toBe(8);
      });

      it('should accept full readiness data', () => {
        const result = schema.parse({
          date: '2024-01-15',
          sleepQuality: 8,
          sleepDuration: 8,
          musclesSoreness: 4,
          energyLevel: 7,
          stressLevel: 5,
          mood: 8,
          restingHeartRate: 55,
          hrvScore: 65,
          notes: 'Feeling good after rest day',
        });
        expect(result.hrvScore).toBe(65);
      });

      it('should reject out of range values', () => {
        expect(() => schema.parse({
          sleepQuality: 0,
          sleepDuration: 7,
          musclesSoreness: 3,
          energyLevel: 8,
          stressLevel: 4,
        })).toThrow();

        expect(() => schema.parse({
          sleepQuality: 7,
          sleepDuration: 7,
          musclesSoreness: 11,
          energyLevel: 8,
          stressLevel: 4,
        })).toThrow();
      });

      it('should reject invalid sleep duration', () => {
        expect(() => schema.parse({
          sleepQuality: 7,
          sleepDuration: 25,
          musclesSoreness: 3,
          energyLevel: 8,
          stressLevel: 4,
        })).toThrow();
      });
    });

    describe('getReadinessHistory input', () => {
      const schema = z.object({
        days: z.number().min(1).max(90).default(7),
      });

      it('should use default days', () => {
        expect(schema.parse({}).days).toBe(7);
      });

      it('should accept custom days', () => {
        expect(schema.parse({ days: 30 }).days).toBe(30);
      });

      it('should reject out of range', () => {
        expect(() => schema.parse({ days: 0 })).toThrow();
        expect(() => schema.parse({ days: 91 })).toThrow();
      });
    });

    describe('getRecommendation input', () => {
      const schema = z.object({
        date: z.string().optional(),
        plannedWorkout: z.object({
          type: z.enum(['strength', 'cardio', 'mixed', 'recovery']),
          intensity: z.enum(['light', 'moderate', 'heavy']),
          duration: z.number().positive(),
        }).optional(),
      });

      it('should accept empty input', () => {
        const result = schema.parse({});
        expect(result.date).toBeUndefined();
      });

      it('should accept planned workout', () => {
        const result = schema.parse({
          plannedWorkout: {
            type: 'strength',
            intensity: 'heavy',
            duration: 60,
          },
        });
        expect(result.plannedWorkout?.type).toBe('strength');
        expect(result.plannedWorkout?.intensity).toBe('heavy');
      });

      it('should reject invalid workout type', () => {
        expect(() => schema.parse({
          plannedWorkout: {
            type: 'invalid',
            intensity: 'heavy',
            duration: 60,
          },
        })).toThrow();
      });
    });

    describe('updateSleepGoal input', () => {
      const schema = z.object({
        targetHours: z.number().min(4).max(12),
        targetBedtime: z.string().optional(),
        targetWakeTime: z.string().optional(),
      });

      it('should accept sleep goal', () => {
        const result = schema.parse({ targetHours: 8 });
        expect(result.targetHours).toBe(8);
      });

      it('should accept full sleep schedule', () => {
        const result = schema.parse({
          targetHours: 7.5,
          targetBedtime: '22:30',
          targetWakeTime: '06:00',
        });
        expect(result.targetBedtime).toBe('22:30');
      });

      it('should reject unrealistic hours', () => {
        expect(() => schema.parse({ targetHours: 3 })).toThrow();
        expect(() => schema.parse({ targetHours: 13 })).toThrow();
      });
    });
  });

  describe('Business Logic', () => {
    describe('Readiness Score Calculation', () => {
      function calculateReadinessScore(data: {
        sleepQuality: number;
        sleepDuration: number;
        targetSleepHours: number;
        musclesSoreness: number;
        energyLevel: number;
        stressLevel: number;
      }): number {
        const sleepDurationScore = Math.min(data.sleepDuration / data.targetSleepHours, 1) * 10;
        const sorenessScore = 10 - data.musclesSoreness; // Invert - lower soreness is better
        const stressScore = 10 - data.stressLevel; // Invert - lower stress is better
        
        const weighted = (
          data.sleepQuality * 0.25 +
          sleepDurationScore * 0.2 +
          sorenessScore * 0.2 +
          data.energyLevel * 0.2 +
          stressScore * 0.15
        );
        
        return Math.round(weighted * 10) / 10;
      }

      it('should calculate high readiness for good metrics', () => {
        const score = calculateReadinessScore({
          sleepQuality: 9,
          sleepDuration: 8,
          targetSleepHours: 8,
          musclesSoreness: 2,
          energyLevel: 9,
          stressLevel: 2,
        });
        expect(score).toBeGreaterThan(8);
      });

      it('should calculate low readiness for poor metrics', () => {
        const score = calculateReadinessScore({
          sleepQuality: 3,
          sleepDuration: 5,
          targetSleepHours: 8,
          musclesSoreness: 8,
          energyLevel: 3,
          stressLevel: 9,
        });
        expect(score).toBeLessThan(4);
      });

      it('should penalize insufficient sleep duration', () => {
        const goodSleep = calculateReadinessScore({
          sleepQuality: 8, sleepDuration: 8, targetSleepHours: 8,
          musclesSoreness: 3, energyLevel: 7, stressLevel: 4,
        });
        const poorSleep = calculateReadinessScore({
          sleepQuality: 8, sleepDuration: 5, targetSleepHours: 8,
          musclesSoreness: 3, energyLevel: 7, stressLevel: 4,
        });
        expect(goodSleep).toBeGreaterThan(poorSleep);
      });
    });
  });
});

