/**
 * Analytics Tools
 *
 * Tools for accessing volume analytics and progress trends.
 */

import { z } from 'zod';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError, getDateRange } from '../utils';
import { dailyWorkoutAnalytics, weeklyAnalytics, exerciseAnalytics } from '../../db/schema';

// Tool 34: Get Volume Analytics
export const getVolumeAnalytics = createTool({
  name: 'getVolumeAnalytics',
  description: 'Get training volume analytics and muscle group distribution. Use this when the user asks "how much volume am I doing", "what muscle groups am I training", "show my training distribution", or when analyzing training balance and volume trends.',
  parameters: z.object({
    days: z.number().min(7).max(90).default(30).describe('Number of days to analyze'),
  }),
  requiredRole: 'premium',
  execute: async (params, ctx) => {
    const { start } = getDateRange(params.days);

    const dailyData = await ctx.db.query.dailyWorkoutAnalytics.findMany({
      where: and(
        eq(dailyWorkoutAnalytics.userId, ctx.userId),
        gte(dailyWorkoutAnalytics.date, sql`${start.toISOString().split('T')[0]}`)
      ),
      orderBy: [desc(dailyWorkoutAnalytics.date)],
    });

    if (dailyData.length === 0) {
      return toolSuccess({
        hasData: false,
        message: 'No workout data in this period',
      });
    }

    // Aggregate stats
    const totalVolume = dailyData.reduce((sum, d) => sum + (d.totalVolume ?? 0), 0);
    const totalSets = dailyData.reduce((sum, d) => sum + (d.totalSets ?? 0), 0);
    const totalWorkouts = dailyData.reduce((sum, d) => sum + (d.workoutCount ?? 0), 0);
    const totalPRs = dailyData.reduce((sum, d) => sum + (d.prCount ?? 0), 0);

    // Aggregate muscle group breakdown
    const muscleGroups: Record<string, number> = {};
    for (const day of dailyData) {
      const breakdown = day.muscleGroupBreakdown as Record<string, number> | null;
      if (breakdown) {
        for (const [muscle, sets] of Object.entries(breakdown)) {
          muscleGroups[muscle] = (muscleGroups[muscle] ?? 0) + sets;
        }
      }
    }

    return toolSuccess({
      hasData: true,
      period: `Last ${params.days} days`,
      summary: {
        totalVolume: Math.round(totalVolume),
        totalSets,
        totalWorkouts,
        totalPRs,
        avgVolumePerWorkout: totalWorkouts > 0 ? Math.round(totalVolume / totalWorkouts) : 0,
        avgSetsPerWorkout: totalWorkouts > 0 ? Math.round(totalSets / totalWorkouts) : 0,
      },
      muscleGroupDistribution: muscleGroups,
      dailyTrend: dailyData.slice(0, 7).map(d => ({
        date: d.date,
        volume: d.totalVolume,
        sets: d.totalSets,
      })),
    });
  },
});

// Tool 35: Get Progress Trends
export const getProgressTrends = createTool({
  name: 'getProgressTrends',
  description: 'Get progress trends for specific exercises or overall training. Use this when the user asks "am I getting stronger", "show my progress", "how am I improving", or when analyzing strength gains and training progression over time.',
  parameters: z.object({
    exerciseId: z.string().uuid().optional().describe('Specific exercise ID'),
    weeks: z.number().min(4).max(52).default(12).describe('Number of weeks to analyze'),
  }),
  requiredRole: 'premium',
  execute: async (params, ctx) => {
    // If exercise ID provided, get exercise-specific trends
    if (params.exerciseId) {
      const analytics = await ctx.db.query.exerciseAnalytics.findFirst({
        where: and(
          eq(exerciseAnalytics.userId, ctx.userId),
          eq(exerciseAnalytics.exerciseId, params.exerciseId)
        ),
      });

      if (!analytics) {
        return toolSuccess({
          hasData: false,
          message: 'No data for this exercise',
        });
      }

      return toolSuccess({
        hasData: true,
        type: 'exercise',
        exerciseId: params.exerciseId,
        trends: {
          weightTrend: analytics.weightTrend,
          volumeTrend: analytics.volumeTrend,
          currentMax1rm: analytics.currentMax1rm,
          currentMaxWeight: analytics.currentMaxWeight,
          avgWeight: analytics.avgWeight,
          avgReps: analytics.avgReps,
          avgRpe: analytics.avgRpe,
          timesPerformed: analytics.timesPerformed,
          last30DaysVolume: analytics.last30DaysVolume,
        },
        recentHistory: analytics.recentHistory,
      });
    }

    // Get weekly trends
    const weeklyData = await ctx.db.query.weeklyAnalytics.findMany({
      where: eq(weeklyAnalytics.userId, ctx.userId),
      orderBy: [desc(weeklyAnalytics.weekStart)],
      limit: params.weeks,
    });

    if (weeklyData.length === 0) {
      return toolSuccess({
        hasData: false,
        message: 'No weekly data available',
      });
    }

    // Calculate trends
    const recentWeeks = weeklyData.slice(0, 4);
    const olderWeeks = weeklyData.slice(4, 8);

    const recentAvgVolume = recentWeeks.reduce((sum, w) => sum + (w.totalVolume ?? 0), 0) / recentWeeks.length;
    const olderAvgVolume = olderWeeks.length > 0
      ? olderWeeks.reduce((sum, w) => sum + (w.totalVolume ?? 0), 0) / olderWeeks.length
      : recentAvgVolume;

    const volumeTrend = olderAvgVolume > 0
      ? ((recentAvgVolume - olderAvgVolume) / olderAvgVolume) * 100
      : 0;

    return toolSuccess({
      hasData: true,
      type: 'overall',
      weeks: params.weeks,
      trends: {
        volumeTrend: volumeTrend > 5 ? 'increasing' : volumeTrend < -5 ? 'decreasing' : 'stable',
        volumeChangePercent: Math.round(volumeTrend),
        avgWeeklyVolume: Math.round(recentAvgVolume),
        avgWeeklyWorkouts: Math.round(recentWeeks.reduce((sum, w) => sum + (w.workoutCount ?? 0), 0) / recentWeeks.length),
        totalPRs: weeklyData.reduce((sum, w) => sum + (w.prCount ?? 0), 0),
      },
      weeklyData: weeklyData.slice(0, 8).map(w => ({
        weekStart: w.weekStart,
        volume: w.totalVolume,
        workouts: w.workoutCount,
        prs: w.prCount,
      })),
    });
  },
});

// Export all analytics tools
export const analyticsTools = {
  getVolumeAnalytics,
  getProgressTrends,
};

