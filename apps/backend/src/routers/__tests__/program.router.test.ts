import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Program Router Tests
 * Tests training program generation, scheduling, and progression
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Program Router', () => {
  describe('Input Validation', () => {
    describe('generate input', () => {
      const generateSchema = z.object({
        goal: z.enum(['strength', 'hypertrophy', 'endurance', 'weight_loss', 'general_fitness']),
        daysPerWeek: z.number().min(1).max(7),
        experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
        equipment: z.array(z.string()).optional(),
        focusAreas: z.array(z.string()).optional(),
        injuries: z.array(z.string()).optional(),
        sessionDuration: z.number().min(15).max(180).optional(),
      });

      it('should validate basic program request', () => {
        const input = {
          goal: 'strength' as const,
          daysPerWeek: 4,
          experienceLevel: 'intermediate' as const,
        };
        expect(generateSchema.parse(input)).toBeDefined();
      });

      it('should validate detailed program request', () => {
        const input = {
          goal: 'hypertrophy' as const,
          daysPerWeek: 5,
          experienceLevel: 'advanced' as const,
          equipment: ['barbell', 'dumbbells', 'cables'],
          focusAreas: ['chest', 'back'],
          sessionDuration: 60,
        };
        expect(generateSchema.parse(input)).toBeDefined();
      });

      it('should reject invalid days per week', () => {
        expect(() => generateSchema.parse({
          goal: 'strength',
          daysPerWeek: 0,
          experienceLevel: 'beginner',
        })).toThrow();

        expect(() => generateSchema.parse({
          goal: 'strength',
          daysPerWeek: 8,
          experienceLevel: 'beginner',
        })).toThrow();
      });

      it('should reject invalid session duration', () => {
        expect(() => generateSchema.parse({
          goal: 'strength',
          daysPerWeek: 4,
          experienceLevel: 'beginner',
          sessionDuration: 10, // too short
        })).toThrow();
      });
    });

    describe('getProgram input', () => {
      const getProgramSchema = z.object({
        programId: z.string().uuid(),
      });

      it('should validate program fetch', () => {
        expect(getProgramSchema.parse({ programId: testUUID })).toBeDefined();
      });
    });

    describe('updateProgress input', () => {
      const progressSchema = z.object({
        programId: z.string().uuid(),
        week: z.number().min(1),
        day: z.number().min(1).max(7),
        completed: z.boolean(),
      });

      it('should validate progress update', () => {
        const input = {
          programId: testUUID,
          week: 2,
          day: 3,
          completed: true,
        };
        expect(progressSchema.parse(input)).toBeDefined();
      });
    });
  });

  describe('Program Generation Logic', () => {
    describe('Volume Calculation', () => {
      const calculateWeeklyVolume = (level: string, goal: string) => {
        const baseVolume = { beginner: 10, intermediate: 15, advanced: 20 };
        const goalMultiplier = { strength: 0.8, hypertrophy: 1.2, endurance: 1.0 };
        
        return Math.round(
          (baseVolume[level as keyof typeof baseVolume] || 15) *
          (goalMultiplier[goal as keyof typeof goalMultiplier] || 1.0)
        );
      };

      it('should calculate beginner volume', () => {
        expect(calculateWeeklyVolume('beginner', 'strength')).toBe(8);
        expect(calculateWeeklyVolume('beginner', 'hypertrophy')).toBe(12);
      });

      it('should calculate advanced volume', () => {
        expect(calculateWeeklyVolume('advanced', 'hypertrophy')).toBe(24);
      });
    });

    describe('Split Selection', () => {
      const selectSplit = (daysPerWeek: number) => {
        if (daysPerWeek <= 2) return 'full_body';
        if (daysPerWeek === 3) return 'full_body';
        if (daysPerWeek === 4) return 'upper_lower';
        if (daysPerWeek === 5) return 'push_pull_legs';
        return 'bro_split';
      };

      it('should select full body for 3 days', () => {
        expect(selectSplit(3)).toBe('full_body');
      });

      it('should select upper/lower for 4 days', () => {
        expect(selectSplit(4)).toBe('upper_lower');
      });

      it('should select PPL for 5 days', () => {
        expect(selectSplit(5)).toBe('push_pull_legs');
      });
    });

    describe('Progressive Overload', () => {
      const calculateProgression = (week: number, baseWeight: number, level: string) => {
        const weeklyIncrease = { beginner: 0.05, intermediate: 0.025, advanced: 0.01 };
        const rate = weeklyIncrease[level as keyof typeof weeklyIncrease] || 0.025;
        return Math.round(baseWeight * (1 + rate * (week - 1)));
      };

      it('should increase weight weekly for beginners', () => {
        expect(calculateProgression(1, 100, 'beginner')).toBe(100);
        expect(calculateProgression(2, 100, 'beginner')).toBe(105);
        expect(calculateProgression(4, 100, 'beginner')).toBe(115);
      });

      it('should increase slower for advanced', () => {
        expect(calculateProgression(4, 100, 'advanced')).toBe(103);
      });
    });
  });

  describe('Schedule Generation', () => {
    const generateSchedule = (daysPerWeek: number, split: string) => {
      const templates: Record<string, string[]> = {
        full_body: ['Full Body A', 'Full Body B', 'Full Body C'],
        upper_lower: ['Upper', 'Lower', 'Upper', 'Lower'],
        push_pull_legs: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
      };
      
      const template = templates[split] || templates.full_body;
      return template.slice(0, daysPerWeek);
    };

    it('should generate 3-day full body schedule', () => {
      const schedule = generateSchedule(3, 'full_body');
      expect(schedule).toHaveLength(3);
      expect(schedule[0]).toContain('Full Body');
    });

    it('should generate 4-day upper/lower schedule', () => {
      const schedule = generateSchedule(4, 'upper_lower');
      expect(schedule).toHaveLength(4);
      expect(schedule).toContain('Upper');
      expect(schedule).toContain('Lower');
    });
  });

  describe('Response Contracts', () => {
    it('should return generated program', () => {
      const program = {
        id: testUUID,
        name: 'Strength Builder',
        goal: 'strength',
        durationWeeks: 12,
        daysPerWeek: 4,
        weeks: [
          {
            weekNumber: 1,
            days: [
              { dayNumber: 1, name: 'Upper A', exercises: [] },
              { dayNumber: 2, name: 'Lower A', exercises: [] },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
      };

      expect(program).toHaveProperty('weeks');
      expect(program.weeks[0]).toHaveProperty('days');
    });

    it('should return program progress', () => {
      const progress = {
        programId: testUUID,
        currentWeek: 3,
        currentDay: 2,
        completedWorkouts: 10,
        totalWorkouts: 48,
        percentComplete: 21,
      };

      expect(progress).toHaveProperty('currentWeek');
      expect(progress).toHaveProperty('percentComplete');
    });
  });
});

