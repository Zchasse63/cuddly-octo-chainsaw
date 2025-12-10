import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { exercises } from '../../db/schema';
import { eq, like, ilike } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';

/**
 * Exercises Integration Tests - CRUD and search operations
 */

describe('Exercises Integration', () => {
  const testExerciseIds: string[] = [];

  afterAll(async () => {
    for (const id of testExerciseIds) {
      try {
        await db.delete(exercises).where(eq(exercises.id, id));
      } catch (e) { /* ignore */ }
    }
  });

  describe('Exercise CRUD', () => {
    it('should create an exercise', async () => {
      const [exercise] = await db.insert(exercises).values({
        name: 'Test Bench Press',
        primaryMuscle: 'chest',
        movementPattern: 'push',
        equipment: ['barbell'],
        isCompound: true,
        difficulty: 'intermediate',
      }).returning();
      testExerciseIds.push(exercise.id);

      expect(exercise.id).toBeDefined();
      expect(exercise.name).toBe('Test Bench Press');
      expect(exercise.primaryMuscle).toBe('chest');
    });

    it('should read exercises with filters', async () => {
      const [ex] = await db.insert(exercises).values({
        name: 'Test Squat',
        primaryMuscle: 'quadriceps',
        movementPattern: 'squat',
        equipment: ['barbell'],
        isCompound: true,
      }).returning();
      testExerciseIds.push(ex.id);

      const found = await db.query.exercises.findMany({
        where: eq(exercises.primaryMuscle, 'quadriceps'),
        limit: 10,
      });

      expect(found.length).toBeGreaterThan(0);
      expect(found.some(e => e.id === ex.id)).toBe(true);
    });

    it('should update exercise metadata', async () => {
      const [created] = await db.insert(exercises).values({
        name: 'Test Deadlift',
        primaryMuscle: 'back',
        isCustom: true,
      }).returning();
      testExerciseIds.push(created.id);

      const [updated] = await db.update(exercises)
        .set({
          description: 'A compound hip hinge movement',
          secondaryMuscles: ['hamstrings', 'glutes', 'lower_back'],
          isUnilateral: false,
        })
        .where(eq(exercises.id, created.id))
        .returning();

      expect(updated.description).toBe('A compound hip hinge movement');
      expect(updated.secondaryMuscles).toContain('hamstrings');
    });

    it('should delete custom exercise', async () => {
      const [created] = await db.insert(exercises).values({
        name: 'Temp Exercise',
        primaryMuscle: 'abs',
        isCustom: true,
      }).returning();

      await db.delete(exercises).where(eq(exercises.id, created.id));

      const found = await db.query.exercises.findFirst({
        where: eq(exercises.id, created.id),
      });
      expect(found).toBeUndefined();
    });
  });

  describe('Exercise Search', () => {
    it('should find exercises by name pattern', async () => {
      const [ex] = await db.insert(exercises).values({
        name: 'Incline Dumbbell Press Test',
        primaryMuscle: 'chest',
        normalizedName: 'incline dumbbell press test',
      }).returning();
      testExerciseIds.push(ex.id);

      const results = await db.query.exercises.findMany({
        where: ilike(exercises.name, '%dumbbell%'),
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by equipment type', async () => {
      const [ex] = await db.insert(exercises).values({
        name: 'Kettlebell Swing Test',
        primaryMuscle: 'glutes',
        equipment: ['kettlebell'],
      }).returning();
      testExerciseIds.push(ex.id);

      // Using Supabase for array contains query
      const { data, error } = await supabaseAdmin
        .from('exercises')
        .select('*')
        .contains('equipment', ['kettlebell'])
        .limit(10);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
    });
  });

  describe('Exercise Validation', () => {
    it('should enforce required fields', async () => {
      await expect(
        db.insert(exercises).values({
          name: 'No Primary Muscle',
          // Missing primaryMuscle - should fail
        } as any)
      ).rejects.toThrow();
    });

    it('should accept all valid muscle groups', async () => {
      const muscleGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps'];
      
      for (const muscle of muscleGroups) {
        const [ex] = await db.insert(exercises).values({
          name: `Test ${muscle} exercise`,
          primaryMuscle: muscle as any,
        }).returning();
        testExerciseIds.push(ex.id);
        expect(ex.primaryMuscle).toBe(muscle);
      }
    });
  });

  describe('Supabase REST API', () => {
    it('should query exercises with RLS (public read)', async () => {
      const { data, error } = await supabaseAdmin
        .from('exercises')
        .select('id, name, primary_muscle, equipment')
        .limit(20);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});

