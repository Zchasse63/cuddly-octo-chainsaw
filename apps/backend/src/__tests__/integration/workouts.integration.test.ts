import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { exercises, workouts, workoutSets, personalRecords } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Workouts Integration Tests - Full workout lifecycle with sets and PRs
 * Uses pre-seeded test data from seed-data.ts
 * Note: Tests create workouts/exercises that are cleaned up after tests
 */

describe('Workouts Integration', () => {
  let seededUsers: SeededTestUsers;
  let testUserId: string;
  let testExerciseId: string;
  const testWorkoutIds: string[] = [];

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    testUserId = seededUsers.premiumAthlete.id;

    // Create test exercise for workout tests
    const [exercise] = await db.insert(exercises).values({
      name: 'Test Bench Press for Workouts',
      primaryMuscle: 'chest',
      isCustom: true,
      createdByUserId: testUserId,
    }).returning();
    testExerciseId = exercise.id;
  });

  afterAll(async () => {
    // Cleanup data created during tests
    for (const id of testWorkoutIds) {
      await db.delete(personalRecords).where(eq(personalRecords.userId, testUserId)).catch(() => {});
      await db.delete(workoutSets).where(eq(workoutSets.workoutId, id)).catch(() => {});
      await db.delete(workouts).where(eq(workouts.id, id)).catch(() => {});
    }
    await db.delete(exercises).where(eq(exercises.id, testExerciseId)).catch(() => {});
  });

  describe('Workout CRUD', () => {
    it('should create a workout', async () => {
      const [workout] = await db.insert(workouts).values({
        userId: testUserId,
        name: 'Push Day',
        status: 'active',
      }).returning();
      testWorkoutIds.push(workout.id);

      expect(workout.id).toBeDefined();
      expect(workout.userId).toBe(testUserId);
      expect(workout.status).toBe('active');
    });

    it('should complete a workout', async () => {
      const [workout] = await db.insert(workouts).values({
        userId: testUserId,
        name: 'Pull Day',
        status: 'active',
      }).returning();
      testWorkoutIds.push(workout.id);

      const [completed] = await db.update(workouts)
        .set({
          status: 'completed',
          completedAt: new Date(),
          duration: 3600, // 1 hour
        })
        .where(eq(workouts.id, workout.id))
        .returning();

      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeInstanceOf(Date);
      expect(completed.duration).toBe(3600);
    });

    it('should cancel a workout', async () => {
      const [workout] = await db.insert(workouts).values({
        userId: testUserId,
        name: 'Cancelled Workout',
        status: 'active',
      }).returning();
      testWorkoutIds.push(workout.id);

      const [cancelled] = await db.update(workouts)
        .set({ status: 'cancelled' })
        .where(eq(workouts.id, workout.id))
        .returning();

      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('Workout Sets', () => {
    it('should add sets to a workout', async () => {
      const [workout] = await db.insert(workouts).values({
        userId: testUserId,
        name: 'Strength Day',
      }).returning();
      testWorkoutIds.push(workout.id);

      const sets = [
        { setNumber: 1, reps: 8, weight: 135 },
        { setNumber: 2, reps: 8, weight: 155 },
        { setNumber: 3, reps: 6, weight: 175 },
      ];

      for (const set of sets) {
        const [created] = await db.insert(workoutSets).values({
          workoutId: workout.id,
          exerciseId: testExerciseId,
          userId: testUserId,
          ...set,
        }).returning();

        expect(created.setNumber).toBe(set.setNumber);
        expect(created.weight).toBe(set.weight);
      }

      // Verify all sets
      const allSets = await db.query.workoutSets.findMany({
        where: eq(workoutSets.workoutId, workout.id),
      });
      expect(allSets.length).toBe(3);
    });

    it('should calculate estimated 1RM', async () => {
      const [workout] = await db.insert(workouts).values({
        userId: testUserId,
        name: '1RM Test',
      }).returning();
      testWorkoutIds.push(workout.id);

      // Epley formula: 1RM = weight × (1 + reps/30)
      const weight = 225;
      const reps = 5;
      const estimated1rm = weight * (1 + reps / 30); // ~262.5

      const [set] = await db.insert(workoutSets).values({
        workoutId: workout.id,
        exerciseId: testExerciseId,
        userId: testUserId,
        setNumber: 1,
        reps,
        weight,
        estimated1rm,
      }).returning();

      expect(set.estimated1rm).toBeCloseTo(262.5, 1);
    });

    it('should track voice vs manual logging', async () => {
      const [workout] = await db.insert(workouts).values({
        userId: testUserId,
        name: 'Voice Test',
      }).returning();
      testWorkoutIds.push(workout.id);

      const [voiceSet] = await db.insert(workoutSets).values({
        workoutId: workout.id,
        exerciseId: testExerciseId,
        userId: testUserId,
        setNumber: 1,
        reps: 10,
        weight: 100,
        loggingMethod: 'voice',
        voiceTranscript: 'bench press 100 pounds for 10 reps',
        confidence: 0.95,
      }).returning();

      expect(voiceSet.loggingMethod).toBe('voice');
      expect(voiceSet.confidence).toBe(0.95);
    });
  });

  describe('Personal Records', () => {
    it('should create a PR entry', async () => {
      const [pr] = await db.insert(personalRecords).values({
        userId: testUserId,
        exerciseId: testExerciseId,
        weight: 225,
        reps: 1,
        estimated1rm: 225,
      }).returning();

      expect(pr.id).toBeDefined();
      expect(pr.weight).toBe(225);
    });

    it('should query PRs for a user', async () => {
      const prs = await db.query.personalRecords.findMany({
        where: eq(personalRecords.userId, testUserId),
        orderBy: desc(personalRecords.achievedAt),
      });

      expect(prs.length).toBeGreaterThan(0);
    });
  });
});

