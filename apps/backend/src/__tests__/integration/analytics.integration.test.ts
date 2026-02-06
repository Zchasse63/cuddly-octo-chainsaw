import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { exercises, dailyWorkoutAnalytics, weeklyAnalytics, exerciseAnalytics, trainingLoad, bodyPartVolume, aiInsights, userGoals } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Analytics Integration Tests - Workout analytics, training load, AI insights
 * Uses pre-seeded test data from seed-data.ts
 * Note: Tests create analytics data that is cleaned up after tests
 */

describe('Analytics Integration', () => {
  let seededUsers: SeededTestUsers;
  let testUserId: string;
  let testExerciseId: string;

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    testUserId = seededUsers.premiumAthlete.id;

    // Create a test exercise for analytics tests
    const [exercise] = await db.insert(exercises).values({
      name: 'Analytics Test Squat',
      primaryMuscle: 'quadriceps',
      isCustom: true,
      createdByUserId: testUserId,
    }).returning();
    testExerciseId = exercise.id;
  });

  afterAll(async () => {
    // Cleanup data created during tests
    await db.delete(userGoals).where(eq(userGoals.userId, testUserId)).catch(() => {});
    await db.delete(aiInsights).where(eq(aiInsights.userId, testUserId)).catch(() => {});
    await db.delete(bodyPartVolume).where(eq(bodyPartVolume.userId, testUserId)).catch(() => {});
    await db.delete(trainingLoad).where(eq(trainingLoad.userId, testUserId)).catch(() => {});
    await db.delete(exerciseAnalytics).where(eq(exerciseAnalytics.userId, testUserId)).catch(() => {});
    await db.delete(weeklyAnalytics).where(eq(weeklyAnalytics.userId, testUserId)).catch(() => {});
    await db.delete(dailyWorkoutAnalytics).where(eq(dailyWorkoutAnalytics.userId, testUserId)).catch(() => {});
    await db.delete(exercises).where(eq(exercises.id, testExerciseId)).catch(() => {});
  });

  describe('Daily Workout Analytics', () => {
    it('should create daily analytics', async () => {
      const [analytics] = await db.insert(dailyWorkoutAnalytics).values({
        userId: testUserId,
        date: new Date().toISOString().split('T')[0],
        workoutCount: 1,
        totalDurationMinutes: 60,
        totalVolume: 15000,
        totalSets: 20,
        totalReps: 180,
        muscleGroupBreakdown: { chest: 30, back: 25, shoulders: 20, arms: 25 },
        prCount: 2,
      }).returning();

      expect(analytics.id).toBeDefined();
      expect(analytics.totalVolume).toBe(15000);
    });

    it('should update daily analytics', async () => {
      const existing = await db.query.dailyWorkoutAnalytics.findFirst({
        where: eq(dailyWorkoutAnalytics.userId, testUserId),
      });

      if (existing) {
        const [updated] = await db.update(dailyWorkoutAnalytics)
          .set({ workoutCount: 2, totalDurationMinutes: 120 })
          .where(eq(dailyWorkoutAnalytics.id, existing.id))
          .returning();

        expect(updated.workoutCount).toBe(2);
      }
    });
  });

  describe('Weekly Analytics', () => {
    it('should create weekly rollup', async () => {
      const [weekly] = await db.insert(weeklyAnalytics).values({
        userId: testUserId,
        weekStart: '2024-01-01',
        year: 2024,
        weekNumber: 1,
        workoutCount: 4,
        totalDurationMinutes: 240,
        totalVolume: 60000,
        trainingDays: 4,
        muscleBalanceScore: 85,
        prCount: 3,
      }).returning();

      expect(weekly.id).toBeDefined();
      expect(weekly.muscleBalanceScore).toBe(85);
    });

    it('should track volume change', async () => {
      const [weekly] = await db.insert(weeklyAnalytics).values({
        userId: testUserId,
        weekStart: '2024-01-08',
        year: 2024,
        weekNumber: 2,
        workoutCount: 5,
        totalVolume: 66000,
        volumeChange: 10, // 10% increase
      }).returning();

      expect(weekly.volumeChange).toBe(10);
    });
  });

  describe('Exercise Analytics', () => {
    it('should track exercise-specific stats', async () => {
      const [stats] = await db.insert(exerciseAnalytics).values({
        userId: testUserId,
        exerciseId: testExerciseId,
        totalSets: 50,
        totalReps: 400,
        totalVolume: 45000,
        timesPerformed: 12,
        currentMax1rm: 315,
        currentMaxWeight: 275,
        avgWeight: 225,
        avgReps: 8,
        weightTrend: 'increasing',
      }).returning();

      expect(stats.currentMax1rm).toBe(315);
      expect(stats.weightTrend).toBe('increasing');
    });

    it('should store recent history', async () => {
      const existing = await db.query.exerciseAnalytics.findFirst({
        where: eq(exerciseAnalytics.userId, testUserId),
      });

      if (existing) {
        const [updated] = await db.update(exerciseAnalytics)
          .set({
            recentHistory: [
              { date: '2024-01-01', maxWeight: 225, totalVolume: 4500 },
              { date: '2024-01-08', maxWeight: 235, totalVolume: 4700 },
            ],
          })
          .where(eq(exerciseAnalytics.id, existing.id))
          .returning();

        expect(updated.recentHistory).toHaveLength(2);
      }
    });
  });

  describe('Training Load', () => {
    it('should track daily training load', async () => {
      const [load] = await db.insert(trainingLoad).values({
        userId: testUserId,
        date: new Date().toISOString().split('T')[0],
        dailyLoad: 150,
        rpeLoad: 480, // RPE 8 * 60 min
        acuteLoad: 140,
        chronicLoad: 120,
        acuteChronicRatio: 1.17,
        strainScore: 12.5,
        recoveryScore: 75,
      }).returning();

      expect(load.acuteChronicRatio).toBe(1.17);
    });

    it('should track HRV and sleep', async () => {
      const [load] = await db.insert(trainingLoad).values({
        userId: testUserId,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        restingHr: 52,
        hrvScore: 65,
        sleepHours: 7.5,
        sleepQuality: 82,
      }).returning();

      expect(load.hrvScore).toBe(65);
      expect(load.sleepQuality).toBe(82);
    });
  });

  describe('Body Part Volume', () => {
    it('should track weekly muscle group volume', async () => {
      const [volume] = await db.insert(bodyPartVolume).values({
        userId: testUserId,
        weekStart: '2024-01-01',
        chestSets: 12,
        backSets: 15,
        shoulderSets: 9,
        bicepSets: 6,
        tricepSets: 6,
        quadSets: 12,
        hamstringSets: 9,
        gluteSets: 6,
        balanceScore: 78,
        undertrainedGroups: ['calves', 'abs'],
      }).returning();

      expect(volume.balanceScore).toBe(78);
      expect(volume.undertrainedGroups).toContain('calves');
    });
  });

  describe('AI Insights', () => {
    it('should create AI insight', async () => {
      const [insight] = await db.insert(aiInsights).values({
        userId: testUserId,
        insightType: 'volume_recommendation',
        category: 'training',
        priority: 'normal',
        title: 'Increase Back Volume',
        content: 'Your back volume is 20% lower than chest. Consider adding 2-3 more sets.',
        actionable: 'Add 2 sets of rows to your next pull day',
        relatedExerciseId: testExerciseId,
      }).returning();

      expect(insight.insightType).toBe('volume_recommendation');
    });

    it('should mark insight as read', async () => {
      const insight = await db.query.aiInsights.findFirst({
        where: eq(aiInsights.userId, testUserId),
      });

      if (insight) {
        const [updated] = await db.update(aiInsights)
          .set({ isRead: true })
          .where(eq(aiInsights.id, insight.id))
          .returning();

        expect(updated.isRead).toBe(true);
      }
    });
  });

  describe('User Goals', () => {
    it('should create strength goal', async () => {
      const [goal] = await db.insert(userGoals).values({
        userId: testUserId,
        goalType: 'strength',
        title: 'Bench 225 for 5',
        exerciseId: testExerciseId,
        targetValue: 225,
        targetUnit: 'lbs',
        startValue: 185,
        currentValue: 205,
        progressPercent: 50,
        startDate: '2024-01-01',
        targetDate: '2024-06-01',
        status: 'active',
      }).returning();

      expect(goal.progressPercent).toBe(50);
    });

    it('should complete goal', async () => {
      const goal = await db.query.userGoals.findFirst({
        where: eq(userGoals.userId, testUserId),
      });

      if (goal) {
        const [completed] = await db.update(userGoals)
          .set({
            currentValue: 225,
            progressPercent: 100,
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(userGoals.id, goal.id))
          .returning();

        expect(completed.status).toBe('completed');
      }
    });
  });
});

