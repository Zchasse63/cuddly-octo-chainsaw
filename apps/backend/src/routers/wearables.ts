import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  appleHealthConnections, dailyHealthMetrics, sleepSessions,
  heartRateSamples, wearableWorkouts, wearableSyncQueue
} from '../db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

export const wearablesRouter = router({
  // ==================== Apple Health Connection ====================

  // Get Apple Health connection status
  getAppleHealthStatus: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.appleHealthConnections.findFirst({
      where: eq(appleHealthConnections.userId, ctx.user.id),
    });
  }),

  // Update Apple Health connection (called from mobile app)
  updateAppleHealthConnection: protectedProcedure
    .input(
      z.object({
        isConnected: z.boolean(),
        permissions: z.record(z.boolean()).optional(),
        deviceModel: z.string().optional(),
        watchModel: z.string().optional(),
        osVersion: z.string().optional(),
        syncWorkouts: z.boolean().optional(),
        syncNutrition: z.boolean().optional(),
        syncSleep: z.boolean().optional(),
        syncHeartRate: z.boolean().optional(),
        syncSteps: z.boolean().optional(),
        syncBodyMeasurements: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.appleHealthConnections.findFirst({
        where: eq(appleHealthConnections.userId, ctx.user.id),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(appleHealthConnections)
          .set({
            ...input,
            lastSyncAt: new Date(),
            syncStatus: input.isConnected ? 'success' : 'pending',
            updatedAt: new Date(),
          })
          .where(eq(appleHealthConnections.userId, ctx.user.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(appleHealthConnections)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .returning();
      return created;
    }),

  // ==================== Daily Health Metrics ====================

  // Get daily health metrics
  getDailyMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.dailyHealthMetrics.findMany({
        where: and(
          eq(dailyHealthMetrics.userId, ctx.user.id),
          gte(dailyHealthMetrics.date, input.startDate),
          lte(dailyHealthMetrics.date, input.endDate)
        ),
        orderBy: [desc(dailyHealthMetrics.date)],
      });
    }),

  // Get today's health metrics
  getTodayMetrics: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];

    return ctx.db.query.dailyHealthMetrics.findFirst({
      where: and(
        eq(dailyHealthMetrics.userId, ctx.user.id),
        eq(dailyHealthMetrics.date, today)
      ),
    });
  }),

  // Sync daily health metrics from mobile
  syncDailyMetrics: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        source: z.string(),
        steps: z.number().optional(),
        activeMinutes: z.number().optional(),
        activeCalories: z.number().optional(),
        totalCalories: z.number().optional(),
        distanceMeters: z.number().optional(),
        floorsClimbed: z.number().optional(),
        restingHeartRate: z.number().optional(),
        avgHeartRate: z.number().optional(),
        maxHeartRate: z.number().optional(),
        minHeartRate: z.number().optional(),
        heartRateVariability: z.number().optional(),
        respiratoryRate: z.number().optional(),
        oxygenSaturation: z.number().optional(),
        sleepHours: z.number().optional(),
        sleepQualityScore: z.number().optional(),
        stressLevel: z.number().optional(),
        recoveryScore: z.number().optional(),
        bodyBattery: z.number().optional(),
        rawData: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.dailyHealthMetrics.findFirst({
        where: and(
          eq(dailyHealthMetrics.userId, ctx.user.id),
          eq(dailyHealthMetrics.date, input.date)
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(dailyHealthMetrics)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(dailyHealthMetrics.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(dailyHealthMetrics)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .returning();
      return created;
    }),

  // ==================== Sleep Data ====================

  // Get sleep sessions
  getSleepSessions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(30).default(7),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(sleepSessions.userId, ctx.user.id)];

      if (input.startDate) {
        conditions.push(gte(sleepSessions.date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(sleepSessions.date, input.endDate));
      }

      return ctx.db.query.sleepSessions.findMany({
        where: and(...conditions),
        orderBy: [desc(sleepSessions.date)],
        limit: input.limit,
      });
    }),

  // Get sleep summary/averages
  getSleepSummary: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(90).default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const sessions = await ctx.db.query.sleepSessions.findMany({
        where: and(
          eq(sleepSessions.userId, ctx.user.id),
          gte(sleepSessions.date, startDate.toISOString().split('T')[0])
        ),
      });

      if (sessions.length === 0) {
        return null;
      }

      const avgTotalMinutes = sessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0) / sessions.length;
      const avgDeepMinutes = sessions.reduce((sum, s) => sum + (s.deepMinutes || 0), 0) / sessions.length;
      const avgRemMinutes = sessions.reduce((sum, s) => sum + (s.remMinutes || 0), 0) / sessions.length;
      const avgSleepScore = sessions.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / sessions.length;
      const avgEfficiency = sessions.reduce((sum, s) => sum + (s.sleepEfficiency || 0), 0) / sessions.length;

      return {
        sessionsCount: sessions.length,
        avgTotalHours: Math.round(avgTotalMinutes / 60 * 10) / 10,
        avgDeepHours: Math.round(avgDeepMinutes / 60 * 10) / 10,
        avgRemHours: Math.round(avgRemMinutes / 60 * 10) / 10,
        avgSleepScore: Math.round(avgSleepScore),
        avgEfficiency: Math.round(avgEfficiency),
        trend: sessions.length >= 7 ? calculateSleepTrend(sessions) : 'insufficient_data',
      };
    }),

  // Sync sleep session from mobile
  syncSleepSession: protectedProcedure
    .input(
      z.object({
        startTime: z.date(),
        endTime: z.date(),
        date: z.string(),
        source: z.string(),
        totalMinutes: z.number().optional(),
        timeInBed: z.number().optional(),
        timeToFallAsleep: z.number().optional(),
        awakeMinutes: z.number().optional(),
        remMinutes: z.number().optional(),
        lightMinutes: z.number().optional(),
        deepMinutes: z.number().optional(),
        sleepEfficiency: z.number().optional(),
        sleepScore: z.number().optional(),
        awakenings: z.number().optional(),
        avgHeartRate: z.number().optional(),
        minHeartRate: z.number().optional(),
        hrvDuringSleep: z.number().optional(),
        avgRespiratoryRate: z.number().optional(),
        oxygenSaturationAvg: z.number().optional(),
        externalId: z.string().optional(),
        rawData: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check for existing by external ID or date
      if (input.externalId) {
        const existing = await ctx.db.query.sleepSessions.findFirst({
          where: and(
            eq(sleepSessions.userId, ctx.user.id),
            eq(sleepSessions.externalId, input.externalId)
          ),
        });

        if (existing) {
          // Update existing
          const [updated] = await ctx.db
            .update(sleepSessions)
            .set(input)
            .where(eq(sleepSessions.id, existing.id))
            .returning();
          return updated;
        }
      }

      const [created] = await ctx.db
        .insert(sleepSessions)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .returning();
      return created;
    }),

  // ==================== Wearable Workouts ====================

  // Get synced wearable workouts
  getWearableWorkouts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        activityType: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(wearableWorkouts.userId, ctx.user.id)];

      if (input.startDate) {
        conditions.push(gte(wearableWorkouts.startTime, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(wearableWorkouts.startTime, new Date(input.endDate)));
      }
      if (input.activityType) {
        conditions.push(eq(wearableWorkouts.activityType, input.activityType));
      }

      return ctx.db.query.wearableWorkouts.findMany({
        where: and(...conditions),
        orderBy: [desc(wearableWorkouts.startTime)],
        limit: input.limit,
      });
    }),

  // Sync wearable workout from mobile
  syncWearableWorkout: protectedProcedure
    .input(
      z.object({
        externalId: z.string(),
        source: z.string(),
        activityType: z.string(),
        name: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
        durationMinutes: z.number().optional(),
        activeCalories: z.number().optional(),
        totalCalories: z.number().optional(),
        avgHeartRate: z.number().optional(),
        maxHeartRate: z.number().optional(),
        distanceMeters: z.number().optional(),
        routePolyline: z.string().optional(),
        elevationGain: z.number().optional(),
        linkedWorkoutId: z.string().uuid().optional(),
        rawData: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.wearableWorkouts.findFirst({
        where: and(
          eq(wearableWorkouts.userId, ctx.user.id),
          eq(wearableWorkouts.externalId, input.externalId)
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(wearableWorkouts)
          .set(input)
          .where(eq(wearableWorkouts.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(wearableWorkouts)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .returning();
      return created;
    }),

  // Link wearable workout to VoiceFit workout
  linkWearableWorkout: protectedProcedure
    .input(
      z.object({
        wearableWorkoutId: z.string().uuid(),
        voicefitWorkoutId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(wearableWorkouts)
        .set({ linkedWorkoutId: input.voicefitWorkoutId })
        .where(and(
          eq(wearableWorkouts.id, input.wearableWorkoutId),
          eq(wearableWorkouts.userId, ctx.user.id)
        ))
        .returning();

      return updated;
    }),

  // ==================== Sync Queue ====================

  // Queue a sync operation
  queueSync: protectedProcedure
    .input(
      z.object({
        syncType: z.enum(['full', 'incremental', 'webhook']),
        dataTypes: z.array(z.string()),
        source: z.string(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(wearableSyncQueue)
        .values({
          userId: ctx.user.id,
          ...input,
          status: 'pending',
        })
        .returning();

      return item;
    }),

  // Get sync status
  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const recentSyncs = await ctx.db.query.wearableSyncQueue.findMany({
      where: eq(wearableSyncQueue.userId, ctx.user.id),
      orderBy: [desc(wearableSyncQueue.createdAt)],
      limit: 5,
    });

    const appleHealth = await ctx.db.query.appleHealthConnections.findFirst({
      where: eq(appleHealthConnections.userId, ctx.user.id),
    });

    return {
      appleHealthConnected: appleHealth?.isConnected || false,
      lastAppleHealthSync: appleHealth?.lastSyncAt,
      recentSyncs,
    };
  }),

  // Update sync status
  updateSyncStatus: protectedProcedure
    .input(
      z.object({
        syncId: z.string().uuid(),
        status: z.enum(['pending', 'processing', 'completed', 'failed']),
        error: z.string().optional(),
        recordsProcessed: z.number().optional(),
        recordsFailed: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { syncId, ...data } = input;

      const [updated] = await ctx.db
        .update(wearableSyncQueue)
        .set({
          ...data,
          startedAt: data.status === 'processing' ? new Date() : undefined,
          completedAt: data.status === 'completed' || data.status === 'failed' ? new Date() : undefined,
        })
        .where(and(
          eq(wearableSyncQueue.id, syncId),
          eq(wearableSyncQueue.userId, ctx.user.id)
        ))
        .returning();

      return updated;
    }),
});

// Helper function
function calculateSleepTrend(sessions: any[]): string {
  if (sessions.length < 7) return 'insufficient_data';

  const recent = sessions.slice(0, Math.min(7, sessions.length));
  const older = sessions.slice(7, Math.min(14, sessions.length));

  if (older.length === 0) return 'stable';

  const recentAvg = recent.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / older.length;

  const diff = recentAvg - olderAvg;

  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}
