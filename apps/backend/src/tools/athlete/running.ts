/**
 * Running Tools
 *
 * Tools for accessing running activities, PRs, stats, and shoe mileage.
 */

import { z } from 'zod';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError, getDateRange, formatDistance, formatDuration } from '../utils';
import { runningActivities, runningPRs, runningShoes } from '../../db/schema';

const METERS_PER_MILE = 1609.34;

// Tool 24: Get Recent Runs
export const getRecentRuns = createTool({
  name: 'getRecentRuns',
  description: 'Get recent running activities with pace and distance',
  parameters: z.object({
    limit: z.number().min(1).max(30).default(10).describe('Number of runs to return'),
    runType: z.enum(['easy', 'tempo', 'interval', 'long_run', 'recovery', 'all']).default('all'),
  }),
  execute: async (params, ctx) => {
    const runs = await ctx.db.query.runningActivities.findMany({
      where: params.runType === 'all'
        ? eq(runningActivities.userId, ctx.userId)
        : and(eq(runningActivities.userId, ctx.userId), eq(runningActivities.runType, params.runType)),
      orderBy: [desc(runningActivities.startedAt)],
      limit: params.limit,
    });

    if (runs.length === 0) {
      return toolSuccess({ hasRuns: false, message: 'No running activities logged yet' });
    }

    return toolSuccess({
      hasRuns: true,
      runs: runs.map(r => ({
        id: r.id,
        name: r.name,
        runType: r.runType,
        date: r.startedAt,
        distanceMiles: r.distanceMeters ? (r.distanceMeters / METERS_PER_MILE).toFixed(2) : null,
        durationMinutes: r.durationSeconds ? Math.round(r.durationSeconds / 60) : null,
        avgPace: r.avgPaceSecondsPerKm ? formatPace(r.avgPaceSecondsPerKm) : null,
        avgHeartRate: r.avgHeartRate,
        notes: r.notes,
      })),
      totalCount: runs.length,
    });
  },
});

// Tool 25: Get Running PRs
export const getRunningPRs = createTool({
  name: 'getRunningPRs',
  description: 'Get personal records for running distances',
  parameters: z.object({
    prType: z.enum(['1k', '1mi', '5k', '10k', 'half_marathon', 'marathon', 'all']).default('all'),
  }),
  execute: async (params, ctx) => {
    const prs = await ctx.db.query.runningPRs.findMany({
      where: params.prType === 'all'
        ? eq(runningPRs.userId, ctx.userId)
        : and(eq(runningPRs.userId, ctx.userId), eq(runningPRs.prType, params.prType)),
      orderBy: [desc(runningPRs.achievedAt)],
    });

    if (prs.length === 0) {
      return toolSuccess({ hasPRs: false, message: 'No running PRs yet. Keep training!' });
    }

    return toolSuccess({
      hasPRs: true,
      records: prs.map(pr => ({
        type: pr.prType,
        time: pr.timeSeconds ? formatTime(pr.timeSeconds) : null,
        distance: pr.distanceMeters ? (pr.distanceMeters / METERS_PER_MILE).toFixed(2) + ' mi' : null,
        achievedAt: pr.achievedAt,
        improvement: pr.improvementSeconds ? `${pr.improvementSeconds}s faster` : null,
      })),
    });
  },
});

// Tool 26: Get Running Stats
export const getRunningStats = createTool({
  name: 'getRunningStats',
  description: 'Get running statistics and trends',
  parameters: z.object({
    days: z.number().min(7).max(365).default(30).describe('Number of days to analyze'),
  }),
  execute: async (params, ctx) => {
    const { start } = getDateRange(params.days);

    const runs = await ctx.db.query.runningActivities.findMany({
      where: and(eq(runningActivities.userId, ctx.userId), gte(runningActivities.startedAt, start)),
      orderBy: [desc(runningActivities.startedAt)],
    });

    if (runs.length === 0) {
      return toolSuccess({ hasStats: false, message: 'No runs in this period' });
    }

    const totalDistance = runs.reduce((sum, r) => sum + (r.distanceMeters ?? 0), 0);
    const totalDuration = runs.reduce((sum, r) => sum + (r.durationSeconds ?? 0), 0);
    const avgPace = totalDuration > 0 && totalDistance > 0 ? (totalDuration / (totalDistance / 1000)) : 0;

    return toolSuccess({
      hasStats: true,
      period: `Last ${params.days} days`,
      stats: {
        totalRuns: runs.length,
        totalMiles: (totalDistance / METERS_PER_MILE).toFixed(1),
        totalHours: (totalDuration / 3600).toFixed(1),
        avgMilesPerRun: (totalDistance / METERS_PER_MILE / runs.length).toFixed(1),
        avgPacePerKm: avgPace > 0 ? formatPace(avgPace) : null,
        runsPerWeek: ((runs.length / params.days) * 7).toFixed(1),
      },
    });
  },
});

// Tool 27: Get Shoe Mileage
export const getShoeMileage = createTool({
  name: 'getShoeMileage',
  description: 'Get mileage tracking for running shoes',
  parameters: z.object({
    activeOnly: z.boolean().default(true).describe('Only show active shoes'),
  }),
  execute: async (params, ctx) => {
    const shoes = await ctx.db.query.runningShoes.findMany({
      where: params.activeOnly
        ? and(eq(runningShoes.userId, ctx.userId), eq(runningShoes.isActive, true))
        : eq(runningShoes.userId, ctx.userId),
      orderBy: [desc(runningShoes.totalMileageMeters)],
    });

    if (shoes.length === 0) {
      return toolSuccess({ hasShoes: false, message: 'No shoes tracked. Add your running shoes!' });
    }

    return toolSuccess({
      hasShoes: true,
      shoes: shoes.map(s => {
        const currentMiles = (s.totalMileageMeters ?? 0) / METERS_PER_MILE;
        const thresholdMiles = (s.replacementThresholdMeters ?? 643738) / METERS_PER_MILE;
        const percentUsed = (currentMiles / thresholdMiles) * 100;

        return {
          id: s.id,
          name: s.nickname ?? `${s.brand} ${s.model}`,
          brand: s.brand,
          model: s.model,
          totalMiles: currentMiles.toFixed(1),
          totalRuns: s.totalRuns,
          percentUsed: Math.round(percentUsed),
          needsReplacement: percentUsed >= 100,
          isDefault: s.isDefault,
        };
      }),
    });
  },
});

// Helper functions
function formatPace(secondsPerKm: number): string {
  const secondsPerMile = secondsPerKm * METERS_PER_MILE / 1000;
  const minutes = Math.floor(secondsPerMile / 60);
  const seconds = Math.round(secondsPerMile % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/mi`;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Export all running tools
export const runningTools = {
  getRecentRuns,
  getRunningPRs,
  getRunningStats,
  getShoeMileage,
};

