import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Substitutions Router Tests - Exercise substitution validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Substitutions Router', () => {
  describe('Input Validation', () => {
    describe('getSuggestions input', () => {
      const schema = z.object({
        exerciseId: z.string().uuid(),
        reason: z.enum(['equipment', 'injury', 'preference', 'variation']).optional(),
        availableEquipment: z.array(z.string()).optional(),
        injuredAreas: z.array(z.string()).optional(),
        limit: z.number().min(1).max(10).default(5),
      });

      it('should accept exercise ID only', () => {
        const result = schema.parse({ exerciseId: testUUID });
        expect(result.exerciseId).toBe(testUUID);
        expect(result.limit).toBe(5);
      });

      it('should accept equipment reason', () => {
        const result = schema.parse({
          exerciseId: testUUID,
          reason: 'equipment',
          availableEquipment: ['dumbbell', 'resistance_bands'],
        });
        expect(result.reason).toBe('equipment');
        expect(result.availableEquipment).toContain('dumbbell');
      });

      it('should accept injury reason', () => {
        const result = schema.parse({
          exerciseId: testUUID,
          reason: 'injury',
          injuredAreas: ['lower_back', 'knee'],
        });
        expect(result.injuredAreas).toContain('lower_back');
      });

      it('should accept all reason types', () => {
        const reasons = ['equipment', 'injury', 'preference', 'variation'];
        reasons.forEach(reason => {
          const result = schema.parse({ exerciseId: testUUID, reason: reason as any });
          expect(result.reason).toBe(reason);
        });
      });

      it('should reject invalid UUID', () => {
        expect(() => schema.parse({ exerciseId: 'not-valid' })).toThrow();
      });
    });

    describe('confirmSubstitution input', () => {
      const schema = z.object({
        originalExerciseId: z.string().uuid(),
        substitutedExerciseId: z.string().uuid(),
        workoutId: z.string().uuid().optional(),
        programExerciseId: z.string().uuid().optional(),
        reason: z.string().optional(),
        makeDefault: z.boolean().default(false),
      });

      it('should accept substitution', () => {
        const result = schema.parse({
          originalExerciseId: testUUID,
          substitutedExerciseId: testUUID,
        });
        expect(result.makeDefault).toBe(false);
      });

      it('should accept as default', () => {
        const result = schema.parse({
          originalExerciseId: testUUID,
          substitutedExerciseId: testUUID,
          makeDefault: true,
          reason: 'No barbell at home gym',
        });
        expect(result.makeDefault).toBe(true);
      });
    });

    describe('getHistory input', () => {
      const schema = z.object({
        exerciseId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
      });

      it('should use defaults', () => {
        const result = schema.parse({});
        expect(result.limit).toBe(20);
      });

      it('should filter by exercise', () => {
        const result = schema.parse({ exerciseId: testUUID });
        expect(result.exerciseId).toBe(testUUID);
      });
    });

    describe('removeDefault input', () => {
      const schema = z.object({
        originalExerciseId: z.string().uuid(),
      });

      it('should accept exercise ID', () => {
        expect(schema.parse({ originalExerciseId: testUUID }).originalExerciseId).toBe(testUUID);
      });
    });
  });

  describe('Business Logic', () => {
    describe('Substitution Scoring', () => {
      interface Exercise {
        id: string;
        primaryMuscle: string;
        secondaryMuscles: string[];
        equipment: string[];
        movementPattern: string;
      }

      function calculateSubstitutionScore(
        original: Exercise,
        substitute: Exercise,
        constraints: { availableEquipment?: string[]; injuredAreas?: string[] }
      ): number {
        let score = 0;

        // Same primary muscle = 40 points
        if (original.primaryMuscle === substitute.primaryMuscle) {
          score += 40;
        }

        // Same movement pattern = 30 points
        if (original.movementPattern === substitute.movementPattern) {
          score += 30;
        }

        // Overlapping secondary muscles = up to 20 points
        const overlap = original.secondaryMuscles.filter(m => 
          substitute.secondaryMuscles.includes(m)
        ).length;
        score += Math.min(overlap * 5, 20);

        // Equipment available = 10 points
        if (constraints.availableEquipment) {
          const hasEquipment = substitute.equipment.some(e => 
            constraints.availableEquipment!.includes(e)
          );
          if (hasEquipment) score += 10;
        } else {
          score += 10;
        }

        // Doesn't target injured area = pass/fail
        if (constraints.injuredAreas) {
          const targetsInjured = [substitute.primaryMuscle, ...substitute.secondaryMuscles]
            .some(m => constraints.injuredAreas!.includes(m));
          if (targetsInjured) return 0; // Disqualify
        }

        return score;
      }

      it('should score identical muscles highest', () => {
        const original: Exercise = {
          id: '1', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'],
          equipment: ['barbell'], movementPattern: 'press',
        };
        const substitute: Exercise = {
          id: '2', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'],
          equipment: ['dumbbell'], movementPattern: 'press',
        };

        const score = calculateSubstitutionScore(original, substitute, {});
        expect(score).toBeGreaterThan(80);
      });

      it('should disqualify exercises targeting injured areas', () => {
        const original: Exercise = {
          id: '1', primaryMuscle: 'chest', secondaryMuscles: ['triceps'],
          equipment: ['barbell'], movementPattern: 'press',
        };
        const substitute: Exercise = {
          id: '2', primaryMuscle: 'shoulder', secondaryMuscles: ['triceps'],
          equipment: ['dumbbell'], movementPattern: 'press',
        };

        const score = calculateSubstitutionScore(original, substitute, {
          injuredAreas: ['shoulder'],
        });
        expect(score).toBe(0);
      });

      it('should prefer available equipment', () => {
        const original: Exercise = {
          id: '1', primaryMuscle: 'chest', secondaryMuscles: [],
          equipment: ['barbell'], movementPattern: 'press',
        };
        const withEquipment: Exercise = {
          id: '2', primaryMuscle: 'chest', secondaryMuscles: [],
          equipment: ['dumbbell'], movementPattern: 'press',
        };
        const noEquipment: Exercise = {
          id: '3', primaryMuscle: 'chest', secondaryMuscles: [],
          equipment: ['cable'], movementPattern: 'press',
        };

        const scoreWith = calculateSubstitutionScore(original, withEquipment, {
          availableEquipment: ['dumbbell'],
        });
        const scoreWithout = calculateSubstitutionScore(original, noEquipment, {
          availableEquipment: ['dumbbell'],
        });

        expect(scoreWith).toBeGreaterThan(scoreWithout);
      });
    });
  });
});

