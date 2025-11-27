import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  dailyWorkoutAnalytics, weeklyAnalytics, exerciseAnalytics,
  trainingLoad, bodyPartVolume, aiInsights, userGoals
} from '../db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { createHealthIntelligence } from '../services/healthIntelligence';

export const analyticsRouter = router({
  // ==================== Daily Analytics ====================

  // Get daily workout analytics
  getDailyAnalytics: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.dailyWorkoutAnalytics.findMany({
        where: and(
          eq(dailyWorkoutAnalytics.userId, ctx.user.id),
          gte(dailyWorkoutAnalytics.date, input.startDate),
          lte(dailyWorkoutAnalytics.date, input.endDate)
        ),
        orderBy: [desc(dailyWorkoutAnalytics.date)],
      });
    }),

  // ==================== Weekly Analytics ====================

  // Get weekly analytics
  getWeeklyAnalytics: protectedProcedure
    .input(
      z.object({
        weeks: z.number().min(1).max(52).default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.weeklyAnalytics.findMany({
        where: eq(weeklyAnalytics.userId, ctx.user.id),
        orderBy: [desc(weeklyAnalytics.weekStart)],
        limit: input.weeks,
      });
    }),

  // Get current week summary
  getCurrentWeekSummary: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const weekStart = startOfWeek.toISOString().split('T')[0];

    return ctx.db.query.weeklyAnalytics.findFirst({
      where: and(
        eq(weeklyAnalytics.userId, ctx.user.id),
        eq(weeklyAnalytics.weekStart, weekStart)
      ),
    });
  }),

  // ==================== Exercise Analytics ====================

  // Get exercise-specific analytics
  getExerciseAnalytics: protectedProcedure
    .input(z.object({ exerciseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.exerciseAnalytics.findFirst({
        where: and(
          eq(exerciseAnalytics.userId, ctx.user.id),
          eq(exerciseAnalytics.exerciseId, input.exerciseId)
        ),
      });
    }),

  // Get all exercise analytics for user
  getAllExerciseAnalytics: protectedProcedure
    .input(
      z.object({
        sortBy: z.enum(['volume', 'frequency', 'max_weight', 'recent']).default('recent'),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const orderByMap = {
        volume: desc(exerciseAnalytics.totalVolume),
        frequency: desc(exerciseAnalytics.timesPerformed),
        max_weight: desc(exerciseAnalytics.currentMaxWeight),
        recent: desc(exerciseAnalytics.lastPerformedAt),
      };

      return ctx.db.query.exerciseAnalytics.findMany({
        where: eq(exerciseAnalytics.userId, ctx.user.id),
        orderBy: [orderByMap[input.sortBy]],
        limit: input.limit,
        with: {
          exercise: true,
        },
      });
    }),

  // Get top exercises
  getTopExercises: protectedProcedure
    .input(
      z.object({
        metric: z.enum(['volume', 'frequency', 'progress']).default('volume'),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const orderByMap = {
        volume: desc(exerciseAnalytics.totalVolume),
        frequency: desc(exerciseAnalytics.timesPerformed),
        progress: desc(exerciseAnalytics.currentMax1rm),
      };

      return ctx.db.query.exerciseAnalytics.findMany({
        where: eq(exerciseAnalytics.userId, ctx.user.id),
        orderBy: [orderByMap[input.metric]],
        limit: input.limit,
        with: {
          exercise: true,
        },
      });
    }),

  // ==================== Training Load ====================

  // Get training load data
  getTrainingLoad: protectedProcedure
    .input(
      z.object({
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      return ctx.db.query.trainingLoad.findMany({
        where: and(
          eq(trainingLoad.userId, ctx.user.id),
          gte(trainingLoad.date, startDate.toISOString().split('T')[0])
        ),
        orderBy: [desc(trainingLoad.date)],
      });
    }),

  // Get current training readiness
  getTrainingReadiness: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];

    const todayLoad = await ctx.db.query.trainingLoad.findFirst({
      where: and(
        eq(trainingLoad.userId, ctx.user.id),
        eq(trainingLoad.date, today)
      ),
    });

    // Calculate readiness based on ACR
    let readiness = 'optimal';
    if (todayLoad?.acuteChronicRatio) {
      if (todayLoad.acuteChronicRatio > 1.5) readiness = 'overreaching';
      else if (todayLoad.acuteChronicRatio > 1.3) readiness = 'high_load';
      else if (todayLoad.acuteChronicRatio < 0.8) readiness = 'detraining';
      else if (todayLoad.acuteChronicRatio < 0.5) readiness = 'undertraining';
    }

    return {
      ...todayLoad,
      readiness,
      recommendation: getTrainingRecommendation(readiness),
    };
  }),

  // ==================== Body Part Volume ====================

  // Get body part volume for week
  getBodyPartVolume: protectedProcedure
    .input(
      z.object({
        weekStart: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const weekStart = input.weekStart || getMonday(new Date()).toISOString().split('T')[0];

      return ctx.db.query.bodyPartVolume.findFirst({
        where: and(
          eq(bodyPartVolume.userId, ctx.user.id),
          eq(bodyPartVolume.weekStart, weekStart)
        ),
      });
    }),

  // Get muscle balance analysis
  getMuscleBalance: protectedProcedure
    .input(
      z.object({
        weeks: z.number().min(1).max(12).default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      const volumes = await ctx.db.query.bodyPartVolume.findMany({
        where: eq(bodyPartVolume.userId, ctx.user.id),
        orderBy: [desc(bodyPartVolume.weekStart)],
        limit: input.weeks,
      });

      // Aggregate and analyze
      const totals = {
        chest: 0, back: 0, shoulders: 0,
        biceps: 0, triceps: 0,
        quads: 0, hamstrings: 0, glutes: 0, calves: 0,
        abs: 0,
      };

      for (const week of volumes) {
        totals.chest += week.chestSets || 0;
        totals.back += week.backSets || 0;
        totals.shoulders += week.shoulderSets || 0;
        totals.biceps += week.bicepSets || 0;
        totals.triceps += week.tricepSets || 0;
        totals.quads += week.quadSets || 0;
        totals.hamstrings += week.hamstringSets || 0;
        totals.glutes += week.gluteSets || 0;
        totals.calves += week.calfSets || 0;
        totals.abs += week.abSets || 0;
      }

      // Calculate imbalances
      const pushPullRatio = (totals.chest + totals.shoulders + totals.triceps) /
        Math.max(totals.back + totals.biceps, 1);
      const anteriorPosteriorRatio = (totals.quads) / Math.max(totals.hamstrings + totals.glutes, 1);

      return {
        totals,
        avgPerWeek: Object.fromEntries(
          Object.entries(totals).map(([k, v]) => [k, Math.round(v / input.weeks)])
        ),
        ratios: {
          pushPull: Math.round(pushPullRatio * 100) / 100,
          anteriorPosterior: Math.round(anteriorPosteriorRatio * 100) / 100,
        },
        recommendations: getBalanceRecommendations(totals, input.weeks),
      };
    }),

  // ==================== AI Insights ====================

  // Get AI insights
  getInsights: protectedProcedure
    .input(
      z.object({
        category: z.enum(['training', 'recovery', 'nutrition', 'progress']).optional(),
        limit: z.number().min(1).max(20).default(10),
        includeRead: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(aiInsights.userId, ctx.user.id),
        eq(aiInsights.isDismissed, false),
      ];

      if (input.category) {
        conditions.push(eq(aiInsights.category, input.category));
      }
      if (!input.includeRead) {
        conditions.push(eq(aiInsights.isRead, false));
      }

      return ctx.db.query.aiInsights.findMany({
        where: and(...conditions),
        orderBy: [
          sql`CASE WHEN priority = 'urgent' THEN 0 WHEN priority = 'high' THEN 1 WHEN priority = 'normal' THEN 2 ELSE 3 END`,
          desc(aiInsights.createdAt),
        ],
        limit: input.limit,
        with: {
          exercise: true,
        },
      });
    }),

  // Mark insight as read
  markInsightRead: protectedProcedure
    .input(z.object({ insightId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(aiInsights)
        .set({ isRead: true })
        .where(and(
          eq(aiInsights.id, input.insightId),
          eq(aiInsights.userId, ctx.user.id)
        ));

      return { success: true };
    }),

  // Dismiss insight
  dismissInsight: protectedProcedure
    .input(z.object({ insightId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(aiInsights)
        .set({ isDismissed: true })
        .where(and(
          eq(aiInsights.id, input.insightId),
          eq(aiInsights.userId, ctx.user.id)
        ));

      return { success: true };
    }),

  // ==================== Goals ====================

  // Get user goals
  getGoals: protectedProcedure
    .input(
      z.object({
        status: z.enum(['active', 'completed', 'paused', 'failed']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(userGoals.userId, ctx.user.id)];

      if (input.status) {
        conditions.push(eq(userGoals.status, input.status));
      }

      return ctx.db.query.userGoals.findMany({
        where: and(...conditions),
        orderBy: [desc(userGoals.createdAt)],
        with: {
          exercise: true,
        },
      });
    }),

  // Create goal
  createGoal: protectedProcedure
    .input(
      z.object({
        goalType: z.enum(['strength', 'weight_loss', 'muscle_gain', 'endurance', 'consistency']),
        title: z.string(),
        description: z.string().optional(),
        targetValue: z.number().optional(),
        targetUnit: z.string().optional(),
        exerciseId: z.string().uuid().optional(),
        startValue: z.number().optional(),
        targetDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [goal] = await ctx.db
        .insert(userGoals)
        .values({
          userId: ctx.user.id,
          ...input,
          currentValue: input.startValue,
          startDate: new Date().toISOString().split('T')[0],
        })
        .returning();

      return goal;
    }),

  // Update goal progress
  updateGoalProgress: protectedProcedure
    .input(
      z.object({
        goalId: z.string().uuid(),
        currentValue: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.db.query.userGoals.findFirst({
        where: and(
          eq(userGoals.id, input.goalId),
          eq(userGoals.userId, ctx.user.id)
        ),
      });

      if (!goal) throw new Error('Goal not found');

      const progressPercent = goal.targetValue
        ? ((input.currentValue - (goal.startValue || 0)) / (goal.targetValue - (goal.startValue || 0))) * 100
        : 0;

      const isCompleted = progressPercent >= 100;

      const [updated] = await ctx.db
        .update(userGoals)
        .set({
          currentValue: input.currentValue,
          progressPercent: Math.min(progressPercent, 100),
          status: isCompleted ? 'completed' : 'active',
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(userGoals.id, input.goalId))
        .returning();

      return updated;
    }),

  // ==================== Health Intelligence ====================

  // Get health correlations
  getHealthCorrelations: protectedProcedure
    .input(
      z.object({
        period: z.enum([7, 14, 30, 60]).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const healthIntel = createHealthIntelligence(ctx.db, ctx.user.id);
      return healthIntel.getCorrelations(input.period);
    }),

  // Get health score
  getHealthScore: protectedProcedure.query(async ({ ctx }) => {
    const healthIntel = createHealthIntelligence(ctx.db, ctx.user.id);
    return healthIntel.getHealthScore();
  }),

  // Get AI-powered health insights
  getAIHealthInsights: protectedProcedure
    .input(
      z.object({
        period: z.enum([7, 14, 30, 60]).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const healthIntel = createHealthIntelligence(ctx.db, ctx.user.id);
      const insights = await healthIntel.generateAIInsights(input.period);
      return { insights };
    }),

  // ==================== Dashboard Summary ====================

  // Get dashboard summary
  getDashboardSummary: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getMonday(new Date()).toISOString().split('T')[0];

    const [
      todayAnalytics,
      weekAnalytics,
      activeGoals,
      unreadInsights,
      trainingReadiness,
    ] = await Promise.all([
      ctx.db.query.dailyWorkoutAnalytics.findFirst({
        where: and(
          eq(dailyWorkoutAnalytics.userId, ctx.user.id),
          eq(dailyWorkoutAnalytics.date, today)
        ),
      }),
      ctx.db.query.weeklyAnalytics.findFirst({
        where: and(
          eq(weeklyAnalytics.userId, ctx.user.id),
          eq(weeklyAnalytics.weekStart, weekStart)
        ),
      }),
      ctx.db.query.userGoals.findMany({
        where: and(
          eq(userGoals.userId, ctx.user.id),
          eq(userGoals.status, 'active')
        ),
        limit: 3,
      }),
      ctx.db.execute(sql`
        SELECT COUNT(*) as count FROM ai_insights
        WHERE user_id = ${ctx.user.id} AND is_read = false AND is_dismissed = false
      `),
      ctx.db.query.trainingLoad.findFirst({
        where: and(
          eq(trainingLoad.userId, ctx.user.id),
          eq(trainingLoad.date, today)
        ),
      }),
    ]);

    return {
      today: todayAnalytics,
      week: weekAnalytics,
      activeGoals,
      unreadInsightsCount: Number(unreadInsights.rows[0]?.count || 0),
      trainingReadiness: trainingReadiness?.acuteChronicRatio || null,
    };
  }),
});

// Helper functions
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getTrainingRecommendation(readiness: string): string {
  switch (readiness) {
    case 'overreaching':
      return 'Consider a deload day or active recovery. Your training load is very high.';
    case 'high_load':
      return 'Training load is elevated. Monitor fatigue and consider lighter sessions.';
    case 'optimal':
      return 'Training load is well balanced. You\'re ready for normal training.';
    case 'detraining':
      return 'Training load has dropped. Consider increasing intensity or volume.';
    case 'undertraining':
      return 'Significant drop in training. Time to get back to consistent training!';
    default:
      return 'Keep training consistently and monitor how you feel.';
  }
}

function getBalanceRecommendations(totals: Record<string, number>, weeks: number): string[] {
  const recommendations: string[] = [];
  const avgSetsPerWeek = (sets: number) => sets / weeks;

  // Check for imbalances
  if (avgSetsPerWeek(totals.back) < avgSetsPerWeek(totals.chest) * 0.8) {
    recommendations.push('Consider adding more back exercises to balance pushing/pulling movements.');
  }
  if (avgSetsPerWeek(totals.hamstrings) < avgSetsPerWeek(totals.quads) * 0.6) {
    recommendations.push('Your quad-to-hamstring ratio is imbalanced. Add more hamstring work.');
  }
  if (avgSetsPerWeek(totals.glutes) < 6) {
    recommendations.push('Consider adding more direct glute work for hip health and performance.');
  }
  if (avgSetsPerWeek(totals.shoulders) < 6) {
    recommendations.push('Shoulder volume seems low. Consider adding lateral and rear delt work.');
  }

  return recommendations;
}
