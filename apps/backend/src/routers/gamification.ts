import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { userStreaks, userBadges, badgeDefinitions } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const gamificationRouter = router({
  // Get user's streaks
  getStreaks: protectedProcedure.query(async ({ ctx }) => {
    const streaks = await ctx.db.query.userStreaks.findMany({
      where: eq(userStreaks.userId, ctx.user.id),
    });

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

  // Get all badge definitions (for display)
  getAllBadgeDefinitions: publicProcedure.query(async ({ ctx }) => {
    const definitions = await ctx.db.query.badgeDefinitions.findMany({
      orderBy: [badgeDefinitions.badgeType],
    });

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

        return results.rows;
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

        return results.rows;
      }

      // PRs leaderboard would need the PR history table
      return [];
    }),
});
