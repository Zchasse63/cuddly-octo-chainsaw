import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Onboarding Router Tests - User onboarding flow validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Onboarding Router', () => {
  describe('Input Validation', () => {
    describe('updateProgress input', () => {
      const schema = z.object({
        currentStep: z.number().min(1).max(10),
        isCompleted: z.boolean().optional(),
        skippedSteps: z.array(z.number()).optional(),
      });

      it('should accept step update', () => {
        const result = schema.parse({ currentStep: 2 });
        expect(result.currentStep).toBe(2);
      });

      it('should accept completion', () => {
        const result = schema.parse({ currentStep: 5, isCompleted: true });
        expect(result.isCompleted).toBe(true);
      });

      it('should accept skipped steps', () => {
        const result = schema.parse({
          currentStep: 4,
          skippedSteps: [2, 3],
        });
        expect(result.skippedSteps).toEqual([2, 3]);
      });

      it('should reject invalid step', () => {
        expect(() => schema.parse({ currentStep: 0 })).toThrow();
        expect(() => schema.parse({ currentStep: 11 })).toThrow();
      });
    });

    describe('updateProfile input', () => {
      const schema = z.object({
        displayName: z.string().min(1).max(50).optional(),
        birthDate: z.string().optional(),
        gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
        height: z.number().positive().optional(),
        heightUnit: z.enum(['cm', 'in']).optional(),
        weight: z.number().positive().optional(),
        weightUnit: z.enum(['kg', 'lbs']).optional(),
        fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      });

      it('should accept profile update', () => {
        const result = schema.parse({
          displayName: 'John',
          gender: 'male',
          fitnessLevel: 'intermediate',
        });
        expect(result.displayName).toBe('John');
      });

      it('should accept measurements', () => {
        const result = schema.parse({
          height: 180,
          heightUnit: 'cm',
          weight: 80,
          weightUnit: 'kg',
        });
        expect(result.height).toBe(180);
        expect(result.weightUnit).toBe('kg');
      });

      it('should reject invalid gender', () => {
        expect(() => schema.parse({ gender: 'invalid' })).toThrow();
      });

      it('should reject negative weight', () => {
        expect(() => schema.parse({ weight: -10 })).toThrow();
      });

      it('should reject name too long', () => {
        expect(() => schema.parse({ displayName: 'a'.repeat(51) })).toThrow();
      });
    });

    describe('updateGoals input', () => {
      const schema = z.object({
        primaryGoal: z.enum([
          'build_muscle', 'lose_fat', 'get_stronger', 'improve_endurance',
          'general_fitness', 'sport_performance',
        ]),
        secondaryGoals: z.array(z.string()).optional(),
        targetWeight: z.number().positive().optional(),
        targetDate: z.string().optional(),
      });

      it('should accept primary goal', () => {
        const result = schema.parse({ primaryGoal: 'build_muscle' });
        expect(result.primaryGoal).toBe('build_muscle');
      });

      it('should accept secondary goals', () => {
        const result = schema.parse({
          primaryGoal: 'build_muscle',
          secondaryGoals: ['improve_endurance', 'flexibility'],
        });
        expect(result.secondaryGoals).toContain('improve_endurance');
      });

      it('should reject invalid goal', () => {
        expect(() => schema.parse({ primaryGoal: 'invalid' })).toThrow();
      });
    });

    describe('updateEquipment input', () => {
      const schema = z.object({
        trainingLocation: z.enum(['home', 'gym', 'outdoor', 'mixed']),
        availableEquipment: z.array(z.string()),
        hasCardioEquipment: z.boolean().optional(),
      });

      it('should accept equipment config', () => {
        const result = schema.parse({
          trainingLocation: 'gym',
          availableEquipment: ['barbell', 'dumbbell', 'cables'],
        });
        expect(result.trainingLocation).toBe('gym');
        expect(result.availableEquipment).toContain('barbell');
      });

      it('should accept home gym', () => {
        const result = schema.parse({
          trainingLocation: 'home',
          availableEquipment: ['dumbbell', 'resistance_bands'],
          hasCardioEquipment: false,
        });
        expect(result.trainingLocation).toBe('home');
      });
    });

    describe('updateSchedule input', () => {
      const schema = z.object({
        daysPerWeek: z.number().min(1).max(7),
        preferredDays: z.array(z.number().min(0).max(6)).optional(),
        sessionDuration: z.number().min(15).max(180),
        preferredTime: z.enum(['morning', 'afternoon', 'evening', 'flexible']).optional(),
      });

      it('should accept schedule', () => {
        const result = schema.parse({
          daysPerWeek: 4,
          sessionDuration: 60,
        });
        expect(result.daysPerWeek).toBe(4);
      });

      it('should accept preferred days', () => {
        const result = schema.parse({
          daysPerWeek: 3,
          preferredDays: [1, 3, 5], // Mon, Wed, Fri
          sessionDuration: 45,
          preferredTime: 'morning',
        });
        expect(result.preferredDays).toEqual([1, 3, 5]);
      });

      it('should reject invalid days', () => {
        expect(() => schema.parse({ daysPerWeek: 0, sessionDuration: 60 })).toThrow();
        expect(() => schema.parse({ daysPerWeek: 8, sessionDuration: 60 })).toThrow();
      });
    });
  });
});

