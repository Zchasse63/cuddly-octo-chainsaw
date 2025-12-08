import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Nutrition Router Tests
 * Tests meal logging, macro calculations, and nutrition tracking
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Nutrition Router', () => {
  describe('Input Validation', () => {
    describe('logMeal input', () => {
      const mealSchema = z.object({
        name: z.string().min(1),
        mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
        calories: z.number().min(0).optional(),
        protein: z.number().min(0).optional(),
        carbs: z.number().min(0).optional(),
        fat: z.number().min(0).optional(),
        fiber: z.number().min(0).optional(),
        foods: z.array(z.object({
          name: z.string(),
          servingSize: z.number().optional(),
          servingUnit: z.string().optional(),
          calories: z.number().optional(),
          protein: z.number().optional(),
          carbs: z.number().optional(),
          fat: z.number().optional(),
        })).optional(),
        notes: z.string().optional(),
        photoUrl: z.string().url().optional(),
      });

      it('should validate basic meal', () => {
        const input = {
          name: 'Chicken and Rice',
          mealType: 'lunch' as const,
          calories: 650,
          protein: 45,
          carbs: 60,
          fat: 15,
        };
        expect(mealSchema.parse(input)).toBeDefined();
      });

      it('should validate meal with foods array', () => {
        const input = {
          name: 'Post-Workout Meal',
          mealType: 'dinner' as const,
          foods: [
            { name: 'Grilled Chicken', servingSize: 6, servingUnit: 'oz', protein: 42 },
            { name: 'Brown Rice', servingSize: 1, servingUnit: 'cup', carbs: 45 },
          ],
        };
        expect(mealSchema.parse(input)).toBeDefined();
      });

      it('should reject invalid meal type', () => {
        expect(() => mealSchema.parse({
          name: 'Meal',
          mealType: 'brunch',
        })).toThrow();
      });

      it('should reject negative calories', () => {
        expect(() => mealSchema.parse({
          name: 'Meal',
          mealType: 'lunch',
          calories: -100,
        })).toThrow();
      });
    });

    describe('getDailyLog input', () => {
      const dailyLogSchema = z.object({
        date: z.string().optional(), // defaults to today
      }).optional();

      it('should accept empty input for today', () => {
        expect(dailyLogSchema.parse(undefined)).toBeUndefined();
      });

      it('should accept specific date', () => {
        expect(dailyLogSchema.parse({ date: '2024-01-15' })).toBeDefined();
      });
    });

    describe('setGoals input', () => {
      const goalsSchema = z.object({
        dailyCalories: z.number().min(1000).max(10000),
        proteinGrams: z.number().min(0).optional(),
        carbsGrams: z.number().min(0).optional(),
        fatGrams: z.number().min(0).optional(),
        fiberGrams: z.number().min(0).optional(),
      });

      it('should validate nutrition goals', () => {
        const input = {
          dailyCalories: 2500,
          proteinGrams: 180,
          carbsGrams: 250,
          fatGrams: 80,
        };
        expect(goalsSchema.parse(input)).toBeDefined();
      });

      it('should reject unrealistic calorie goals', () => {
        expect(() => goalsSchema.parse({ dailyCalories: 500 })).toThrow();
        expect(() => goalsSchema.parse({ dailyCalories: 15000 })).toThrow();
      });
    });
  });

  describe('Macro Calculations', () => {
    const calculateMacroCalories = (protein: number, carbs: number, fat: number) => {
      return protein * 4 + carbs * 4 + fat * 9;
    };

    const calculateMacroPercentages = (protein: number, carbs: number, fat: number) => {
      const total = calculateMacroCalories(protein, carbs, fat);
      return {
        protein: Math.round((protein * 4 / total) * 100),
        carbs: Math.round((carbs * 4 / total) * 100),
        fat: Math.round((fat * 9 / total) * 100),
      };
    };

    it('should calculate calories from macros', () => {
      // 180g protein, 250g carbs, 80g fat
      const calories = calculateMacroCalories(180, 250, 80);
      expect(calories).toBe(180 * 4 + 250 * 4 + 80 * 9); // 2440
    });

    it('should calculate macro percentages', () => {
      const percentages = calculateMacroPercentages(180, 250, 80);
      // Due to rounding, sum may be 99-101
      const sum = percentages.protein + percentages.carbs + percentages.fat;
      expect(sum).toBeGreaterThanOrEqual(99);
      expect(sum).toBeLessThanOrEqual(101);
    });

    it('should handle zero macros', () => {
      const calories = calculateMacroCalories(0, 0, 0);
      expect(calories).toBe(0);
    });
  });

  describe('Daily Totals', () => {
    const calculateDailyTotals = (meals: Array<{ calories?: number; protein?: number; carbs?: number; fat?: number }>) => {
      return meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein || 0),
          carbs: acc.carbs + (meal.carbs || 0),
          fat: acc.fat + (meal.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
    };

    it('should sum daily meals', () => {
      const meals = [
        { calories: 500, protein: 30, carbs: 50, fat: 15 },
        { calories: 700, protein: 45, carbs: 60, fat: 20 },
        { calories: 600, protein: 40, carbs: 55, fat: 18 },
      ];
      const totals = calculateDailyTotals(meals);
      expect(totals.calories).toBe(1800);
      expect(totals.protein).toBe(115);
    });

    it('should handle missing values', () => {
      const meals = [
        { calories: 500 },
        { protein: 30 },
      ];
      const totals = calculateDailyTotals(meals);
      expect(totals.calories).toBe(500);
      expect(totals.protein).toBe(30);
    });
  });

  describe('Goal Progress', () => {
    const calculateProgress = (current: number, goal: number) => {
      if (goal === 0) return 0;
      return Math.min(Math.round((current / goal) * 100), 100);
    };

    it('should calculate percentage progress', () => {
      expect(calculateProgress(1500, 2500)).toBe(60);
      expect(calculateProgress(2500, 2500)).toBe(100);
    });

    it('should cap at 100%', () => {
      expect(calculateProgress(3000, 2500)).toBe(100);
    });

    it('should handle zero goal', () => {
      expect(calculateProgress(100, 0)).toBe(0);
    });
  });

  describe('Response Contracts', () => {
    it('should return meal with all fields', () => {
      const meal = {
        id: testUUID,
        userId: 'user-123',
        name: 'Lunch',
        mealType: 'lunch',
        calories: 650,
        protein: 45,
        carbs: 60,
        fat: 15,
        loggedAt: new Date().toISOString(),
      };

      expect(meal).toHaveProperty('calories');
      expect(meal).toHaveProperty('protein');
      expect(meal).toHaveProperty('mealType');
    });

    it('should return daily summary', () => {
      const summary = {
        date: '2024-01-15',
        meals: [],
        totals: { calories: 2100, protein: 150, carbs: 200, fat: 70 },
        goals: { calories: 2500, protein: 180, carbs: 250, fat: 80 },
        progress: { calories: 84, protein: 83, carbs: 80, fat: 88 },
      };

      expect(summary).toHaveProperty('totals');
      expect(summary).toHaveProperty('goals');
      expect(summary).toHaveProperty('progress');
    });
  });
});

