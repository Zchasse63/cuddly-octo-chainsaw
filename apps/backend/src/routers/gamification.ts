import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { userStreaks, userBadges, badgeDefinitions } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createBadgeUnlocker } from '../services/badgeUnlocker';
import { badgeSeedData } from '../db/seeds/badges';
import { cache } from '../lib/upstash';

// Cache TTLs (in seconds)
const CACHE_TTL = {
  BADGE_DEFINITIONS: 86400,  // 24 hours (static data)
  USER_STREAKS: 300,         // 5 minutes
  USER_BADGES: 600,          // 10 minutes
};

export const gamificationRouter = router({
  // Get user's streaks (cached for 5 minutes)
  getStreaks: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = `user:${ctx.user.id}:streaks`;

    // Check cache first
    const cached = await cache.get<Array<typeof userStreaks.$inferSelect>>(cacheKey);
    if (cached) return cached;

    const streaks = await ctx.db.query.userStreaks.findMany({
      where: eq(userStreaks.userId, ctx.user.id),
    });

    // Cache the result
    await cache.set(cacheKey, streaks, CACHE_TTL.USER_STREAKS);
    return streaks;
  }),

  // Update streak (called after workout/activity)
  updateStreak: protectedProcedure
    .input(
      z.object({
        streakType: z.enum(['workout', 'logging', 'running']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().split('T')[0];

      const existing = await ctx.db.query.userStreaks.findFirst({
        where: and(
          eq(userStreaks.userId, ctx.user.id),
          eq(userStreaks.streakType, input.streakType)
        ),
      });

      if (!existing) {
        // Create new streak
        const [newStreak] = await ctx.db
          .insert(userStreaks)
          .values({
            userId: ctx.user.id,
            streakType: input.streakType,
            currentStreak: 1,
            longestStreak: 1,
            lastActivityDate: today,
          })
          .returning();

        // Invalidate cache
        await cache.delete(`user:${ctx.user.id}:streaks`);
        return { streak: newStreak, isNew: true, extended: true };
      }

      const lastDate = existing.lastActivityDate;
      const lastDateMs = lastDate ? new Date(lastDate).getTime() : 0;
      const todayMs = new Date(today).getTime();
      const daysDiff = Math.floor((todayMs - lastDateMs) / (1000 * 60 * 60 * 24));

      let newCurrentStreak = existing.currentStreak || 0;
      let extended = false;

      if (daysDiff === 0) {
        // Already logged today
        return { streak: existing, isNew: false, extended: false };
      } else if (daysDiff === 1) {
        // Consecutive day - extend streak
        newCurrentStreak += 1;
        extended = true;
      } else {
        // Streak broken - restart
        newCurrentStreak = 1;
        extended = true;
      }

      const newLongestStreak = Math.max(existing.longestStreak || 0, newCurrentStreak);

      const [updated] = await ctx.db
        .update(userStreaks)
        .set({
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastActivityDate: today,
          updatedAt: new Date(),
        })
        .where(
          and(eq(userStreaks.userId, ctx.user.id), eq(userStreaks.streakType, input.streakType))
        )
        .returning();

      // Invalidate cache
      await cache.delete(`user:${ctx.user.id}:streaks`);
      return { streak: updated, isNew: false, extended };
    }),

  // Get user's badges
  getBadges: protectedProcedure.query(async ({ ctx }) => {
    const badges = await ctx.db.query.userBadges.findMany({
      where: eq(userBadges.userId, ctx.user.id),
      orderBy: [desc(userBadges.earnedAt)],
      with: {
        definition: true,
      },
    });

    return badges;
  }),

  // Award badge to user
  awardBadge: protectedProcedure
    .input(
      z.object({
        badgeId: z.string(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already has this badge
      const existing = await ctx.db.query.userBadges.findFirst({
        where: and(eq(userBadges.userId, ctx.user.id), eq(userBadges.badgeId, input.badgeId)),
      });

      if (existing) {
        return { badge: existing, isNew: false };
      }

      // Get badge definition
      const definition = await ctx.db.query.badgeDefinitions.findFirst({
        where: eq(badgeDefinitions.id, input.badgeId),
      });

      if (!definition) {
        throw new Error(`Badge definition not found: ${input.badgeId}`);
      }

      // Award badge
      const [newBadge] = await ctx.db
        .insert(userBadges)
        .values({
          userId: ctx.user.id,
          badgeId: input.badgeId,
          badgeType: definition.badgeType,
          metadata: input.metadata,
        })
        .returning();

      return { badge: newBadge, isNew: true, definition };
    }),

  // Get all badge definitions (for display) - cached for 24 hours
  getAllBadgeDefinitions: publicProcedure.query(async ({ ctx }) => {
    const cacheKey = 'badge:definitions:all';

    // Check cache first
    const cached = await cache.get<Array<typeof badgeDefinitions.$inferSelect>>(cacheKey);
    if (cached) return cached;

    const definitions = await ctx.db.query.badgeDefinitions.findMany({
      orderBy: [badgeDefinitions.badgeType],
    });

    // Cache the result (static data - 24 hours)
    await cache.set(cacheKey, definitions, CACHE_TTL.BADGE_DEFINITIONS);
    return definitions;
  }),

  // Get badge progress for user
  getBadgeProgress: protectedProcedure.query(async ({ ctx }) => {
    const [earned, total] = await Promise.all([
      ctx.db.query.userBadges.findMany({
        where: eq(userBadges.userId, ctx.user.id),
        columns: { badgeId: true },
      }),
      ctx.db.query.badgeDefinitions.findMany({
        columns: { id: true, badgeType: true, tier: true },
      }),
    ]);

    const earnedIds = new Set(earned.map((b) => b.badgeId));

    // Group by type
    const byType = total.reduce(
      (acc, badge) => {
        if (!acc[badge.badgeType]) {
          acc[badge.badgeType] = { total: 0, earned: 0 };
        }
        acc[badge.badgeType].total++;
        if (earnedIds.has(badge.id)) {
          acc[badge.badgeType].earned++;
        }
        return acc;
      },
      {} as Record<string, { total: number; earned: number }>
    );

    return {
      totalEarned: earned.length,
      totalAvailable: total.length,
      byType,
    };
  }),

  // Leaderboard
  getLeaderboard: protectedProcedure
    .input(
      z.object({
        type: z.enum(['streak', 'badges', 'prs']),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.type === 'streak') {
        const results = await ctx.db.execute(sql`
          SELECT
            u.id as user_id,
            up.name,
            us.current_streak,
            us.longest_streak
          FROM user_streaks us
          JOIN users u ON u.id = us.user_id
          LEFT JOIN user_profiles up ON up.user_id = u.id
          WHERE us.streak_type = 'workout'
          ORDER BY us.current_streak DESC
          LIMIT ${input.limit}
        `);

        return results as unknown as Array<Record<string, unknown>>;
      }

      if (input.type === 'badges') {
        const results = await ctx.db.execute(sql`
          SELECT
            u.id as user_id,
            up.name,
            COUNT(ub.id) as badge_count
          FROM users u
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN user_badges ub ON ub.user_id = u.id
          GROUP BY u.id, up.name
          ORDER BY badge_count DESC
          LIMIT ${input.limit}
        `);

        return results as unknown as Array<Record<string, unknown>>;
      }

      // PRs leaderboard would need the PR history table
      return [];
    }),

  // Check all badges for user and award any earned
  checkAllBadges: protectedProcedure.mutation(async ({ ctx }) => {
    const badgeUnlocker = createBadgeUnlocker(ctx.db, ctx.user.id);
    const results = await badgeUnlocker.checkAllBadges();

    const newlyEarned = results.filter((r) => r.earned);
    return {
      checked: results.length,
      newlyEarned: newlyEarned.length,
      badges: newlyEarned,
    };
  }),

  // Check badges after workout
  checkBadgesAfterWorkout: protectedProcedure
    .input(z.object({ workoutId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const badgeUnlocker = createBadgeUnlocker(ctx.db, ctx.user.id);
      const results = await badgeUnlocker.checkAfterWorkout(input.workoutId);
      const earnedResults = results.filter((r) => r.earned);

      // Fetch badge definitions for newly earned badges
      const badgeIds = earnedResults.map((r) => r.badgeId);
      const definitions = badgeIds.length > 0
        ? await ctx.db.query.badgeDefinitions.findMany({
            where: sql`${badgeDefinitions.id} IN (${sql.raw(badgeIds.map((id) => `'${id}'`).join(', '))})`,
          })
        : [];

      const definitionMap = new Map(definitions.map((d: any) => [d.id, d]));

      return {
        newBadges: earnedResults.map((r) => ({
          ...r,
          definition: definitionMap.get(r.badgeId) || null,
        })),
      };
    }),

  // Check badges after run
  checkBadgesAfterRun: protectedProcedure
    .input(z.object({ activityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const badgeUnlocker = createBadgeUnlocker(ctx.db, ctx.user.id);
      const results = await badgeUnlocker.checkAfterRun(input.activityId);
      const earnedResults = results.filter((r) => r.earned);

      // Fetch badge definitions for newly earned badges
      const badgeIds = earnedResults.map((r) => r.badgeId);
      const definitions = badgeIds.length > 0
        ? await ctx.db.query.badgeDefinitions.findMany({
            where: sql`${badgeDefinitions.id} IN (${sql.raw(badgeIds.map((id) => `'${id}'`).join(', '))})`,
          })
        : [];

      const definitionMap = new Map(definitions.map((d: any) => [d.id, d]));

      return {
        newBadges: earnedResults.map((r) => ({
          ...r,
          definition: definitionMap.get(r.badgeId) || null,
        })),
      };
    }),

  // Seed badge definitions (admin only - should be protected in production)
  seedBadgeDefinitions: protectedProcedure.mutation(async ({ ctx }) => {
    // Insert all badge definitions
    const inserted = await ctx.db
      .insert(badgeDefinitions)
      .values(badgeSeedData)
      .onConflictDoNothing()
      .returning();

    return {
      inserted: inserted.length,
      total: badgeSeedData.length,
    };
  }),

  // Get badges by category
  getBadgesByCategory: protectedProcedure
    .input(z.object({ category: z.enum(['strength', 'running', 'streak', 'hybrid']) }))
    .query(async ({ ctx, input }) => {
      const definitions = await ctx.db.query.badgeDefinitions.findMany({
        where: eq(badgeDefinitions.badgeType, input.category),
      });

      const userEarned = await ctx.db.query.userBadges.findMany({
        where: eq(userBadges.userId, ctx.user.id),
        columns: { badgeId: true, earnedAt: true },
      });

      const earnedMap = new Map(userEarned.map((b) => [b.badgeId, b.earnedAt]));

      return definitions.map((def) => ({
        ...def,
        earned: earnedMap.has(def.id),
        earnedAt: earnedMap.get(def.id),
      }));
    }),

  // Get recently earned badges
  getRecentBadges: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.userBadges.findMany({
        where: eq(userBadges.userId, ctx.user.id),
        orderBy: [desc(userBadges.earnedAt)],
        limit: input.limit,
        with: {
          definition: true,
        },
      });
    }),
});
