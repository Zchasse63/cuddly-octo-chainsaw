import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Calendar Router Tests - Program questionnaire and scheduling validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Calendar Router', () => {
  describe('Input Validation', () => {
    describe('questionnaire input', () => {
      const schema = z.object({
        trainingType: z.enum(['strength_only', 'running_only', 'hybrid', 'crossfit', 'undecided']),
        primaryGoal: z.enum([
          'build_muscle', 'lose_fat', 'get_stronger', 'improve_endurance',
          'run_5k', 'run_10k', 'run_half_marathon', 'run_marathon',
          'general_fitness', 'sport_performance', 'body_recomposition',
        ]),
        daysPerWeek: z.number().min(2).max(7),
        sessionDuration: z.number().min(15).max(180),
        experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
      });

      it('should accept valid strength questionnaire', () => {
        const result = schema.parse({
          trainingType: 'strength_only',
          primaryGoal: 'build_muscle',
          daysPerWeek: 4,
          sessionDuration: 60,
          experienceLevel: 'intermediate',
        });
        expect(result.trainingType).toBe('strength_only');
        expect(result.daysPerWeek).toBe(4);
      });

      it('should accept running goals', () => {
        const result = schema.parse({
          trainingType: 'running_only',
          primaryGoal: 'run_half_marathon',
          daysPerWeek: 5,
          sessionDuration: 45,
          experienceLevel: 'beginner',
        });
        expect(result.primaryGoal).toBe('run_half_marathon');
      });

      it('should reject invalid days per week', () => {
        expect(() => schema.parse({
          trainingType: 'strength_only',
          primaryGoal: 'build_muscle',
          daysPerWeek: 1,
          sessionDuration: 60,
          experienceLevel: 'beginner',
        })).toThrow();

        expect(() => schema.parse({
          trainingType: 'strength_only',
          primaryGoal: 'build_muscle',
          daysPerWeek: 8,
          sessionDuration: 60,
          experienceLevel: 'beginner',
        })).toThrow();
      });

      it('should reject invalid session duration', () => {
        expect(() => schema.parse({
          trainingType: 'strength_only',
          primaryGoal: 'build_muscle',
          daysPerWeek: 4,
          sessionDuration: 10,
          experienceLevel: 'beginner',
        })).toThrow();
      });
    });

    describe('getCalendarEvents input', () => {
      const schema = z.object({
        startDate: z.string(),
        endDate: z.string(),
        includeCompleted: z.boolean().default(true),
      });

      it('should accept valid date range', () => {
        const result = schema.parse({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });
        expect(result.includeCompleted).toBe(true);
      });

      it('should accept includeCompleted flag', () => {
        const result = schema.parse({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          includeCompleted: false,
        });
        expect(result.includeCompleted).toBe(false);
      });
    });

    describe('rescheduleWorkout input', () => {
      const schema = z.object({
        calendarEntryId: z.string().uuid(),
        newDate: z.string(),
        reason: z.string().optional(),
      });

      it('should accept valid reschedule', () => {
        const result = schema.parse({
          calendarEntryId: testUUID,
          newDate: '2024-02-01',
        });
        expect(result.calendarEntryId).toBe(testUUID);
      });

      it('should accept reason', () => {
        const result = schema.parse({
          calendarEntryId: testUUID,
          newDate: '2024-02-01',
          reason: 'Traveling for work',
        });
        expect(result.reason).toBe('Traveling for work');
      });

      it('should reject invalid UUID', () => {
        expect(() => schema.parse({
          calendarEntryId: 'not-valid',
          newDate: '2024-02-01',
        })).toThrow();
      });
    });

    describe('skipWorkout input', () => {
      const schema = z.object({
        calendarEntryId: z.string().uuid(),
        reason: z.enum(['sick', 'injured', 'traveling', 'busy', 'other']),
        notes: z.string().optional(),
      });

      it('should accept valid skip', () => {
        const result = schema.parse({
          calendarEntryId: testUUID,
          reason: 'sick',
        });
        expect(result.reason).toBe('sick');
      });

      it('should accept all valid reasons', () => {
        const reasons = ['sick', 'injured', 'traveling', 'busy', 'other'];
        reasons.forEach(reason => {
          const result = schema.parse({ calendarEntryId: testUUID, reason });
          expect(result.reason).toBe(reason);
        });
      });
    });
  });
});

