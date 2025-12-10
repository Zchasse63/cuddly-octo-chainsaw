import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { userStreaks, userBadges, badgeDefinitions } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Gamification Integration Tests - Streaks, badges, achievements
 * Uses pre-seeded test data from seed-data.ts
 * Note: Tests create badges/streaks that are cleaned up after tests
 */

describe('Gamification Integration', () => {
  let seededUsers: SeededTestUsers;
  let testUserId: string;
  const testBadgeIds: string[] = [];

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    testUserId = seededUsers.premiumAthlete.id;
  });

  afterAll(async () => {
    // Cleanup data created during tests
    await db.delete(userBadges).where(eq(userBadges.userId, testUserId)).catch(() => {});
    await db.delete(userStreaks).where(eq(userStreaks.userId, testUserId)).catch(() => {});
    for (const id of testBadgeIds) {
      await db.delete(badgeDefinitions).where(eq(badgeDefinitions.id, id)).catch(() => {});
    }
  });

  describe('Badge Definitions', () => {
    it('should create badge definitions', async () => {
      const badgeId = `test_badge_${Date.now()}`;
      testBadgeIds.push(badgeId);

      const [badge] = await db.insert(badgeDefinitions).values({
        id: badgeId,
        name: 'First Workout',
        description: 'Complete your first workout',
        badgeType: 'milestone',
        tier: 'bronze',
        criteria: { type: 'workout_count', value: 1 },
      }).returning();

      expect(badge.id).toBe(badgeId);
      expect(badge.tier).toBe('bronze');
    });

    it('should query badge definitions via Supabase (public)', async () => {
      const { data, error } = await supabaseAdmin
        .from('badge_definitions')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('User Streaks', () => {
    it('should create a workout streak', async () => {
      const [streak] = await db.insert(userStreaks).values({
        userId: testUserId,
        streakType: 'workout',
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: new Date().toISOString().split('T')[0],
      }).returning();

      expect(streak.id).toBeDefined();
      expect(streak.currentStreak).toBe(1);
    });

    it('should increment streak', async () => {
      const streak = await db.query.userStreaks.findFirst({
        where: and(
          eq(userStreaks.userId, testUserId),
          eq(userStreaks.streakType, 'workout')
        ),
      });

      if (streak) {
        const [updated] = await db.update(userStreaks)
          .set({
            currentStreak: streak.currentStreak! + 1,
            longestStreak: Math.max(streak.longestStreak!, streak.currentStreak! + 1),
            lastActivityDate: new Date().toISOString().split('T')[0],
          })
          .where(eq(userStreaks.id, streak.id))
          .returning();

        expect(updated.currentStreak).toBe(2);
      }
    });

    it('should reset streak on gap', async () => {
      const streak = await db.query.userStreaks.findFirst({
        where: and(
          eq(userStreaks.userId, testUserId),
          eq(userStreaks.streakType, 'workout')
        ),
      });

      if (streak) {
        const [reset] = await db.update(userStreaks)
          .set({ currentStreak: 0 })
          .where(eq(userStreaks.id, streak.id))
          .returning();

        expect(reset.currentStreak).toBe(0);
        expect(reset.longestStreak).toBeGreaterThan(0); // Longest preserved
      }
    });

    it('should enforce unique user/streakType', async () => {
      // Try to create duplicate streak type
      await expect(
        db.insert(userStreaks).values({
          userId: testUserId,
          streakType: 'workout', // Already exists
          currentStreak: 0,
        })
      ).rejects.toThrow();
    });

    it('should support multiple streak types', async () => {
      const [runStreak] = await db.insert(userStreaks).values({
        userId: testUserId,
        streakType: 'running',
        currentStreak: 5,
        longestStreak: 10,
      }).returning();

      expect(runStreak.streakType).toBe('running');

      const allStreaks = await db.query.userStreaks.findMany({
        where: eq(userStreaks.userId, testUserId),
      });

      expect(allStreaks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('User Badges', () => {
    let testBadgeDefId: string;

    it('should create badge definition for testing', async () => {
      testBadgeDefId = `test_badge_user_${Date.now()}`;
      testBadgeIds.push(testBadgeDefId);

      const [badge] = await db.insert(badgeDefinitions).values({
        id: testBadgeDefId,
        name: 'Test User Badge',
        description: 'Badge for testing user awards',
        badgeType: 'milestone',
        tier: 'bronze',
        criteria: { type: 'test', value: 1 },
      }).returning();

      expect(badge.id).toBe(testBadgeDefId);
    });

    it('should award badge to user', async () => {
      const [badge] = await db.insert(userBadges).values({
        userId: testUserId,
        badgeId: testBadgeDefId,
        badgeType: 'milestone',
        metadata: { workoutId: 'test-123' },
      }).returning();

      expect(badge.id).toBeDefined();
      expect(badge.badgeId).toBe(testBadgeDefId);
      expect(badge.earnedAt).toBeInstanceOf(Date);
    });

    it('should prevent duplicate badge awards', async () => {
      await expect(
        db.insert(userBadges).values({
          userId: testUserId,
          badgeId: testBadgeDefId,
          badgeType: 'milestone',
        })
      ).rejects.toThrow();
    });

    it('should query user badges', async () => {
      const badges = await db.query.userBadges.findMany({
        where: eq(userBadges.userId, testUserId),
      });

      expect(badges.length).toBeGreaterThan(0);
    });

    it('should store badge metadata', async () => {
      // Create another badge definition for this test
      const anotherBadgeId = `test_badge_meta_${Date.now()}`;
      testBadgeIds.push(anotherBadgeId);

      await db.insert(badgeDefinitions).values({
        id: anotherBadgeId,
        name: 'Metadata Test Badge',
        description: 'Badge for testing metadata',
        badgeType: 'strength',
        tier: 'silver',
        criteria: { type: 'weight', value: 200 },
      });

      const [prBadge] = await db.insert(userBadges).values({
        userId: testUserId,
        badgeId: anotherBadgeId,
        badgeType: 'strength',
        metadata: {
          exerciseId: 'ex-123',
          weight: 200,
          reps: 1,
          date: new Date().toISOString(),
        },
      }).returning();

      expect(prBadge.metadata).toBeDefined();
      expect((prBadge.metadata as any).weight).toBe(200);
    });
  });
});

