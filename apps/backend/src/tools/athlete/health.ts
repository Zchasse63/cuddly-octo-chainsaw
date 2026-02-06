/**
 * Health Tools
 *
 * Tools for accessing readiness, health metrics, sleep, and nutrition data.
 */

import { z } from 'zod';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError, getDateRange, startOfToday } from '../utils';
import { readinessScores, trainingLoad, nutritionSummaries, dailyHealthMetrics } from '../../db/schema';

// Tool 18: Get Readiness Score
export const getReadinessScore = createTool({
  name: 'getReadinessScore',
  description: 'Get the user\'s readiness score for today or recent days. Use this when the user asks "how am I feeling today", "am I ready to train", "what is my readiness", or when assessing recovery status and workout intensity recommendations.',
  parameters: z.object({
    days: z.number().min(1).max(30).default(1).describe('Number of days of readiness data'),
  }),
  execute: async (params, ctx) => {
    const { start } = getDateRange(params.days);

    const scores = await ctx.db.query.readinessScores.findMany({
      where: and(eq(readinessScores.userId, ctx.userId), gte(readinessScores.date, start)),
      orderBy: [desc(readinessScores.date)],
    });

    if (scores.length === 0) {
      return toolSuccess({
        hasReadinessData: false,
        message: 'No readiness data logged. Consider doing a quick check-in!',
      });
    }

    const latest = scores[0];
    return toolSuccess({
      hasReadinessData: true,
      today: {
        overallScore: latest.overallScore,
        sleepQuality: latest.sleepQuality,
        energyLevel: latest.energyLevel,
        motivation: latest.motivation,
        soreness: latest.soreness,
        stress: latest.stress,
        notes: latest.notes,
        date: latest.date,
      },
      history: scores.slice(1).map(s => ({
        overallScore: s.overallScore,
        date: s.date,
      })),
    });
  },
});

// Tool 19: Get Health Metrics
export const getHealthMetrics = createTool({
  name: 'getHealthMetrics',
  description: 'Get health metrics from wearables (steps, heart rate, HRV). Use this when the user asks "what are my health stats", "show my HRV", "how many steps did I get", or when analyzing recovery metrics and daily activity levels.',
  parameters: z.object({
    days: z.number().min(1).max(30).default(7).describe('Number of days'),
  }),
  requiredRole: 'premium',
  execute: async (params, ctx) => {
    const { start } = getDateRange(params.days);

    const metrics = await ctx.db.query.dailyHealthMetrics.findMany({
      where: and(eq(dailyHealthMetrics.userId, ctx.userId), gte(dailyHealthMetrics.date, sql`${start.toISOString().split('T')[0]}`)),
      orderBy: [desc(dailyHealthMetrics.date)],
    });

    if (metrics.length === 0) {
      return toolSuccess({ hasMetrics: false, message: 'No health metrics synced. Connect a wearable!' });
    }

    const latest = metrics[0];
    return toolSuccess({
      hasMetrics: true,
      latest: {
        date: latest.date,
        steps: latest.steps,
        activeMinutes: latest.activeMinutes,
        restingHeartRate: latest.restingHeartRate,
        hrv: latest.heartRateVariability,
        sleepHours: latest.sleepHours,
        recoveryScore: latest.recoveryScore,
      },
      averages: {
        avgSteps: Math.round(metrics.reduce((sum, m) => sum + (m.steps ?? 0), 0) / metrics.length),
        avgSleepHours: (metrics.reduce((sum, m) => sum + (m.sleepHours ?? 0), 0) / metrics.length).toFixed(1),
      },
    });
  },
});

// Tool 20: Get Sleep Data
export const getSleepData = createTool({
  name: 'getSleepData',
  description: 'Get sleep tracking data from wearables. Use this when the user asks "how did I sleep", "show my sleep data", "how much sleep am I getting", or when analyzing sleep quality and recovery patterns.',
  parameters: z.object({
    days: z.number().min(1).max(30).default(7).describe('Number of days'),
  }),
  requiredRole: 'premium',
  execute: async (params, ctx) => {
    const { start } = getDateRange(params.days);

    const metrics = await ctx.db.query.dailyHealthMetrics.findMany({
      where: and(eq(dailyHealthMetrics.userId, ctx.userId), gte(dailyHealthMetrics.date, sql`${start.toISOString().split('T')[0]}`)),
      orderBy: [desc(dailyHealthMetrics.date)],
    });

    const sleepData = metrics.filter(m => m.sleepHours != null);
    if (sleepData.length === 0) {
      return toolSuccess({ hasSleepData: false, message: 'No sleep data available' });
    }

    const avgSleep = sleepData.reduce((sum, m) => sum + (m.sleepHours ?? 0), 0) / sleepData.length;

    return toolSuccess({
      hasSleepData: true,
      nights: sleepData.map(m => ({
        date: m.date,
        hours: m.sleepHours,
        quality: m.sleepQualityScore,
      })),
      average: avgSleep.toFixed(1),
      trend: avgSleep >= 7 ? 'good' : avgSleep >= 6 ? 'fair' : 'needs_improvement',
    });
  },
});

// Tool 21: Get Daily Summary
export const getDailySummary = createTool({
  name: 'getDailySummary',
  description: 'Get a comprehensive daily summary including workout, nutrition, and health',
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const today = startOfToday();

    const [readiness, healthMetrics, nutrition] = await Promise.all([
      ctx.db.query.readinessScores.findFirst({
        where: and(eq(readinessScores.userId, ctx.userId), gte(readinessScores.date, today)),
      }),
      ctx.db.query.dailyHealthMetrics.findFirst({
        where: and(eq(dailyHealthMetrics.userId, ctx.userId), eq(dailyHealthMetrics.date, sql`${today.toISOString().split('T')[0]}`)),
      }),
      ctx.db.query.nutritionSummaries.findFirst({
        where: and(eq(nutritionSummaries.userId, ctx.userId), eq(nutritionSummaries.date, sql`${today.toISOString().split('T')[0]}`)),
      }),
    ]);

    return toolSuccess({
      date: today.toISOString().split('T')[0],
      readiness: readiness ? { score: readiness.overallScore, energy: readiness.energyLevel } : null,
      activity: healthMetrics ? { steps: healthMetrics.steps, activeMinutes: healthMetrics.activeMinutes } : null,
      nutrition: nutrition ? { calories: nutrition.calories, protein: nutrition.protein } : null,
    });
  },
});

// Tool 22: Get Fatigue Score
export const getFatigueScore = createTool({
  name: 'getFatigueScore',
  description: 'Get training load and fatigue indicators',
  parameters: z.object({}),
  requiredRole: 'premium',
  execute: async (_params, ctx) => {
    const load = await ctx.db.query.trainingLoad.findFirst({
      where: eq(trainingLoad.userId, ctx.userId),
      orderBy: [desc(trainingLoad.date)],
    });

    if (!load) {
      return toolSuccess({ hasLoadData: false, message: 'Not enough training data yet' });
    }

    const acr = load.acuteChronicRatio ?? 0;
    let fatigueStatus: 'fresh' | 'optimal' | 'fatigued' | 'overreaching';
    if (acr < 0.8) fatigueStatus = 'fresh';
    else if (acr <= 1.3) fatigueStatus = 'optimal';
    else if (acr <= 1.5) fatigueStatus = 'fatigued';
    else fatigueStatus = 'overreaching';

    return toolSuccess({
      hasLoadData: true,
      fatigueStatus,
      metrics: {
        acuteLoad: load.acuteLoad,
        chronicLoad: load.chronicLoad,
        acuteChronicRatio: load.acuteChronicRatio,
        strainScore: load.strainScore,
        recoveryScore: load.recoveryScore,
      },
      recommendation: fatigueStatus === 'overreaching'
        ? 'Consider a lighter training day or rest'
        : fatigueStatus === 'fatigued'
        ? 'Monitor recovery closely'
        : 'You\'re in a good training zone',
    });
  },
});

// Tool 23: Get Nutrition Log
export const getNutritionLog = createTool({
  name: 'getNutritionLog',
  description: 'Get nutrition summary from synced health sources',
  parameters: z.object({
    days: z.number().min(1).max(14).default(7).describe('Number of days'),
  }),
  requiredRole: 'premium',
  execute: async (params, ctx) => {
    const { start } = getDateRange(params.days);

    const nutrition = await ctx.db.query.nutritionSummaries.findMany({
      where: and(eq(nutritionSummaries.userId, ctx.userId), gte(nutritionSummaries.date, sql`${start.toISOString().split('T')[0]}`)),
      orderBy: [desc(nutritionSummaries.date)],
    });

    if (nutrition.length === 0) {
      return toolSuccess({ hasNutritionData: false, message: 'No nutrition data synced' });
    }

    const avgCalories = Math.round(nutrition.reduce((sum, n) => sum + (n.calories ?? 0), 0) / nutrition.length);
    const avgProtein = Math.round(nutrition.reduce((sum, n) => sum + (n.protein ?? 0), 0) / nutrition.length);

    return toolSuccess({
      hasNutritionData: true,
      days: nutrition.map(n => ({
        date: n.date,
        calories: n.calories,
        protein: n.protein,
        carbs: n.carbohydrates,
        fat: n.fat,
      })),
      averages: { calories: avgCalories, protein: avgProtein },
    });
  },
});

// Export all health tools
export const healthTools = {
  getReadinessScore,
  getHealthMetrics,
  getSleepData,
  getDailySummary,
  getFatigueScore,
  getNutritionLog,
};

