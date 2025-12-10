import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { runningActivities, runningPrograms, runningProgramWorkouts, runningPRs, heartRateZones, runningShoes, runningActivityShoes } from '../db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { createBadgeUnlocker } from '../services/badgeUnlocker';

export const runningRouter = router({
  // ==================== Activities ====================

  // Log a running activity
  logActivity: protectedProcedure
    .input(
      z.object({
        runType: z.enum(['easy', 'tempo', 'interval', 'long_run', 'recovery', 'fartlek', 'hill', 'race']).optional(),
        name: z.string().optional(),
        notes: z.string().optional(),
        distanceMeters: z.number().optional(),
        durationSeconds: z.number().optional(),
        avgPaceSecondsPerKm: z.number().optional(),
        avgHeartRate: z.number().optional(),
        maxHeartRate: z.number().optional(),
        elevationGainMeters: z.number().optional(),
        caloriesBurned: z.number().optional(),
        splits: z.array(z.record(z.unknown())).optional(),
        routePolyline: z.string().optional(),
        startLatitude: z.number().optional(),
        startLongitude: z.number().optional(),
        startedAt: z.date(),
        completedAt: z.date().optional(),
        programId: z.string().uuid().optional(),
        programWeek: z.number().optional(),
        programDay: z.number().optional(),
        shoeId: z.string().uuid().optional(), // Link to running shoe
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { shoeId, ...activityData } = input;

      const [activity] = await ctx.db
        .insert(runningActivities)
        .values({
          userId: ctx.user.id,
          ...activityData,
          source: 'manual',
        })
        .returning();

      // Link shoe to activity if provided
      if (shoeId && input.distanceMeters) {
        await ctx.db.insert(runningActivityShoes).values({
          activityId: activity.id,
          shoeId,
          distanceMeters: input.distanceMeters,
        });

        // Update shoe mileage
        await ctx.db
          .update(runningShoes)
          .set({
            totalMileageMeters: sql`${runningShoes.totalMileageMeters} + ${input.distanceMeters}`,
            totalRuns: sql`${runningShoes.totalRuns} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(runningShoes.id, shoeId));
      }

      // Check for PRs
      await checkRunningPRs(ctx.db, ctx.user.id, activity);

      // Check for badge unlocks
      const badgeUnlocker = createBadgeUnlocker(ctx.db, ctx.user.id);
      const newBadges = await badgeUnlocker.checkAfterRun(activity.id);

      return {
        activity,
        newBadges: newBadges.filter((b) => b.earned),
      };
    }),

  // Get user's running activities
  getActivities: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        runType: z.enum(['easy', 'tempo', 'interval', 'long_run', 'recovery', 'fartlek', 'hill', 'race']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(runningActivities.userId, ctx.user.id)];

      if (input.startDate) {
        conditions.push(gte(runningActivities.startedAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(runningActivities.startedAt, input.endDate));
      }
      if (input.runType) {
        conditions.push(eq(runningActivities.runType, input.runType));
      }

      return ctx.db.query.runningActivities.findMany({
        where: and(...conditions),
        orderBy: [desc(runningActivities.startedAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // Get single activity
  getActivity: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.runningActivities.findFirst({
        where: and(
          eq(runningActivities.id, input.id),
          eq(runningActivities.userId, ctx.user.id)
        ),
      });
    }),

  // Get running stats
  getStats: protectedProcedure
    .input(
      z.object({
        period: z.enum(['week', 'month', 'year', 'all']).default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let startDate: Date;

      switch (input.period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      const result = await ctx.db.execute(sql`
        SELECT
          COUNT(*) as total_runs,
          COALESCE(SUM(distance_meters), 0) as total_distance,
          COALESCE(SUM(duration_seconds), 0) as total_duration,
          COALESCE(AVG(avg_pace_seconds_per_km), 0) as avg_pace,
          COALESCE(SUM(calories_burned), 0) as total_calories,
          COALESCE(SUM(elevation_gain_meters), 0) as total_elevation
        FROM running_activities
        WHERE user_id = ${ctx.user.id}
          AND started_at >= ${startDate}
      `);

      return (result as unknown as Array<Record<string, unknown>>)[0];
    }),

  // ==================== Programs ====================

  // Create a running program
  createProgram: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        goal: z.string().optional(),
        targetRaceDate: z.string().optional(),
        targetTime: z.number().optional(),
        durationWeeks: z.number().min(1).max(52),
        startDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [program] = await ctx.db
        .insert(runningPrograms)
        .values({
          userId: ctx.user.id,
          ...input,
          status: 'active',
        })
        .returning();

      return program;
    }),

  // Get user's programs
  getPrograms: protectedProcedure
    .input(
      z.object({
        status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(runningPrograms.userId, ctx.user.id)];

      if (input.status) {
        conditions.push(eq(runningPrograms.status, input.status));
      }

      return ctx.db.query.runningPrograms.findMany({
        where: and(...conditions),
        orderBy: [desc(runningPrograms.createdAt)],
        with: {
          workouts: true,
        },
      });
    }),

  // Get program templates
  getProgramTemplates: publicProcedure
    .input(
      z.object({
        goal: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(runningPrograms.isTemplate, true),
        eq(runningPrograms.isPublic, true),
      ];

      if (input.goal) {
        conditions.push(eq(runningPrograms.goal, input.goal));
      }

      return ctx.db.query.runningPrograms.findMany({
        where: and(...conditions),
        with: {
          workouts: true,
        },
      });
    }),

  // Add workout to program
  addProgramWorkout: protectedProcedure
    .input(
      z.object({
        programId: z.string().uuid(),
        weekNumber: z.number().min(1),
        dayOfWeek: z.number().min(0).max(6),
        runType: z.enum(['easy', 'tempo', 'interval', 'long_run', 'recovery', 'fartlek', 'hill', 'race']),
        name: z.string().optional(),
        description: z.string().optional(),
        targetDistanceMeters: z.number().optional(),
        targetDurationSeconds: z.number().optional(),
        targetPaceMin: z.number().optional(),
        targetPaceMax: z.number().optional(),
        targetHeartRateZone: z.string().optional(),
        intervals: z.array(z.record(z.unknown())).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns program
      const program = await ctx.db.query.runningPrograms.findFirst({
        where: and(
          eq(runningPrograms.id, input.programId),
          eq(runningPrograms.userId, ctx.user.id)
        ),
      });

      if (!program) {
        throw new Error('Program not found');
      }

      const [workout] = await ctx.db
        .insert(runningProgramWorkouts)
        .values(input)
        .returning();

      return workout;
    }),

  // Complete program workout
  completeProgramWorkout: protectedProcedure
    .input(
      z.object({
        workoutId: z.string().uuid(),
        activityId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(runningProgramWorkouts)
        .set({
          isCompleted: true,
          completedActivityId: input.activityId,
          completedAt: new Date(),
        })
        .where(eq(runningProgramWorkouts.id, input.workoutId))
        .returning();

      return updated;
    }),

  // ==================== PRs ====================

  // Get user's running PRs
  getPRs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.runningPRs.findMany({
      where: eq(runningPRs.userId, ctx.user.id),
      orderBy: [desc(runningPRs.achievedAt)],
      with: {
        activity: true,
      },
    });
  }),

  // ==================== Heart Rate Zones ====================

  // Get or create heart rate zones
  getHeartRateZones: protectedProcedure.query(async ({ ctx }) => {
    let zones = await ctx.db.query.heartRateZones.findFirst({
      where: eq(heartRateZones.userId, ctx.user.id),
    });

    if (!zones) {
      // Create default zones based on age (220 - age formula)
      // Default to max HR of 190 if age unknown
      const [newZones] = await ctx.db
        .insert(heartRateZones)
        .values({
          userId: ctx.user.id,
          maxHeartRate: 190,
        })
        .returning();
      zones = newZones;
    }

    return zones;
  }),

  // Update heart rate zones
  updateHeartRateZones: protectedProcedure
    .input(
      z.object({
        maxHeartRate: z.number().min(100).max(250),
        restingHeartRate: z.number().min(30).max(120).optional(),
        zone1Min: z.number().optional(),
        zone1Max: z.number().optional(),
        zone2Min: z.number().optional(),
        zone2Max: z.number().optional(),
        zone3Min: z.number().optional(),
        zone3Max: z.number().optional(),
        zone4Min: z.number().optional(),
        zone4Max: z.number().optional(),
        zone5Min: z.number().optional(),
        zone5Max: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.heartRateZones.findFirst({
        where: eq(heartRateZones.userId, ctx.user.id),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(heartRateZones)
          .set({ ...input, source: 'manual', updatedAt: new Date() })
          .where(eq(heartRateZones.userId, ctx.user.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(heartRateZones)
        .values({ userId: ctx.user.id, ...input, source: 'manual' })
        .returning();
      return created;
    }),
});

// Helper function to check for running PRs
async function checkRunningPRs(db: any, userId: string, activity: any) {
  if (!activity.distanceMeters || !activity.durationSeconds) return;

  const prDistances = [
    { type: '1k', meters: 1000 },
    { type: '1mi', meters: 1609.34 },
    { type: '5k', meters: 5000 },
    { type: '10k', meters: 10000 },
    { type: 'half_marathon', meters: 21097.5 },
    { type: 'marathon', meters: 42195 },
  ];

  for (const { type, meters } of prDistances) {
    if (activity.distanceMeters >= meters) {
      // Calculate time for this distance (extrapolate if longer run)
      const timeForDistance = Math.round(
        (meters / activity.distanceMeters) * activity.durationSeconds
      );

      // Check if this is a PR
      const existingPR = await db.query.runningPRs.findFirst({
        where: and(
          eq(runningPRs.userId, userId),
          eq(runningPRs.prType, type)
        ),
        orderBy: [runningPRs.timeSeconds],
      });

      if (!existingPR || timeForDistance < (existingPR.timeSeconds || Infinity)) {
        await db.insert(runningPRs).values({
          userId,
          activityId: activity.id,
          prType: type,
          timeSeconds: timeForDistance,
          distanceMeters: meters,
          previousPrId: existingPR?.id,
          improvementSeconds: existingPR ? existingPR.timeSeconds - timeForDistance : null,
          improvementPercent: existingPR
            ? ((existingPR.timeSeconds - timeForDistance) / existingPR.timeSeconds) * 100
            : null,
        });
      }
    }
  }

  // Check for longest run PR
  const longestRunPR = await db.query.runningPRs.findFirst({
    where: and(
      eq(runningPRs.userId, userId),
      eq(runningPRs.prType, 'longest_run')
    ),
    orderBy: [desc(runningPRs.distanceMeters)],
  });

  if (!longestRunPR || activity.distanceMeters > (longestRunPR.distanceMeters || 0)) {
    await db.insert(runningPRs).values({
      userId,
      activityId: activity.id,
      prType: 'longest_run',
      distanceMeters: activity.distanceMeters,
      previousPrId: longestRunPR?.id,
    });
  }
}
