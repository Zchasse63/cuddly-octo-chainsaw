import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { users, userProfiles, badgeDefinitions, userBadges, workouts, userStreaks, runningActivities } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { BadgeUnlocker, createBadgeUnlocker } from '../badgeUnlocker';

/**
 * BadgeUnlocker Integration Tests
 * Tests badge checking logic with real database
 */

const TEST_EMAIL = `badge-unlocker-${Date.now()}@test.local`;
let testUserId: string;
const testBadgeIds: string[] = [];
const testWorkoutIds: string[] = [];
const testActivityIds: string[] = [];

describe('BadgeUnlocker', () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ email: TEST_EMAIL }).returning();
    testUserId = user.id;

    await db.insert(userProfiles).values({
      userId: testUserId,
      name: 'Badge Test User',
      email: TEST_EMAIL,
      tier: 'premium',
    });
  });

  afterAll(async () => {
    for (const id of testActivityIds) {
      await db.delete(runningActivities).where(eq(runningActivities.id, id)).catch(() => {});
    }
    for (const id of testWorkoutIds) {
      await db.delete(workouts).where(eq(workouts.id, id)).catch(() => {});
    }
    await db.delete(userBadges).where(eq(userBadges.userId, testUserId)).catch(() => {});
    await db.delete(userStreaks).where(eq(userStreaks.userId, testUserId)).catch(() => {});
    for (const id of testBadgeIds) {
      await db.delete(badgeDefinitions).where(eq(badgeDefinitions.id, id)).catch(() => {});
    }
    await db.delete(userProfiles).where(eq(userProfiles.userId, testUserId)).catch(() => {});
    await db.delete(users).where(eq(users.id, testUserId)).catch(() => {});
  });

  describe('createBadgeUnlocker', () => {
    it('should create a BadgeUnlocker instance', () => {
      const unlocker = createBadgeUnlocker(db, testUserId);
      expect(unlocker).toBeInstanceOf(BadgeUnlocker);
    });
  });

  describe('checkAllBadges', () => {
    it('should return array of badge results', async () => {
      const unlocker = createBadgeUnlocker(db, testUserId);
      const results = await unlocker.checkAllBadges();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should check workout count badges', async () => {
      const badgeId = `test_workout_count_${Date.now()}`;
      testBadgeIds.push(badgeId);

      await db.insert(badgeDefinitions).values({
        id: badgeId,
        name: 'Test Workout Badge',
        description: 'Complete 1 workout',
        badgeType: 'strength',
        tier: 'bronze',
        criteria: { type: 'workout_count', value: 1 },
      });

      const [workout] = await db.insert(workouts).values({
        userId: testUserId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
      }).returning();
      testWorkoutIds.push(workout.id);

      const unlocker = createBadgeUnlocker(db, testUserId);
      const results = await unlocker.checkAllBadges();

      const badge = results.find((r) => r.badgeId === badgeId);
      expect(badge).toBeDefined();
      expect(badge?.earned).toBe(true);
    });

    it('should mark already earned badges', async () => {
      const badgeId = `test_earned_${Date.now()}`;
      testBadgeIds.push(badgeId);

      await db.insert(badgeDefinitions).values({
        id: badgeId,
        name: 'Already Earned Badge',
        description: 'Test badge',
        badgeType: 'milestone',
        tier: 'bronze',
        criteria: { type: 'workout_count', value: 1 },
      });

      await db.insert(userBadges).values({
        userId: testUserId,
        badgeId: badgeId,
        badgeType: 'milestone',
        earnedAt: new Date(),
      });

      const unlocker = createBadgeUnlocker(db, testUserId);
      const results = await unlocker.checkAllBadges();

      const badge = results.find((r) => r.badgeId === badgeId);
      expect(badge).toBeDefined();
      expect(badge?.earned).toBe(true);
    });
  });

  describe('checkAfterWorkout', () => {
    it('should check workout-related badges after workout', async () => {
      const badgeId = `test_after_workout_${Date.now()}`;
      testBadgeIds.push(badgeId);

      await db.insert(badgeDefinitions).values({
        id: badgeId,
        name: 'After Workout Badge',
        description: 'Complete a workout',
        badgeType: 'strength',
        tier: 'bronze',
        criteria: { type: 'workout_count', value: 1 },
      });

      const [workout] = await db.insert(workouts).values({
        userId: testUserId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
      }).returning();
      testWorkoutIds.push(workout.id);

      const unlocker = createBadgeUnlocker(db, testUserId);
      const results = await unlocker.checkAfterWorkout(workout.id);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('streak badges', () => {
    it('should check streak badges', async () => {
      const badgeId = `test_streak_${Date.now()}`;
      testBadgeIds.push(badgeId);

      await db.insert(badgeDefinitions).values({
        id: badgeId,
        name: 'Streak Badge',
        description: 'Maintain a 3-day streak',
        badgeType: 'streak',
        tier: 'bronze',
        criteria: { type: 'workout_streak', value: 3 },
      });

      await db.insert(userStreaks).values({
        userId: testUserId,
        streakType: 'workout',
        currentStreak: 5,
        longestStreak: 5,
        lastActivityDate: new Date().toISOString().split('T')[0],
      });

      const unlocker = createBadgeUnlocker(db, testUserId);
      const results = await unlocker.checkAllBadges();

      const badge = results.find((r) => r.badgeId === badgeId);
      expect(badge).toBeDefined();
      expect(badge?.earned).toBe(true);
    });
  });
});
