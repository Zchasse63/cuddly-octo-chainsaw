/**
 * Coach Analytics Tools
 *
 * Tools for coaches to analyze client data and identify at-risk clients.
 */

import { z } from 'zod';
import { eq, and, desc, sql, lt } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import {
  trainingPrograms,
  workouts,
  readinessScores,
  dailyHealthMetrics,
} from '../../db/schema';

// Tool 53: Get Client Analytics Summary
export const getClientAnalyticsSummary = createTool({
  name: 'getClientAnalyticsSummary',
  description: 'Get analytics summary for a specific client. Use this when the coach asks "how is [client] doing", "show me [client]\'s stats", "what is [client]\'s training volume", or when analyzing client progress and engagement.',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
    days: z.number().min(7).max(90).default(30),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.days);
    // Convert to ISO string for PostgreSQL compatibility
    const startDateStr = startDate.toISOString();

    const [clientWorkouts, program, readiness] = await Promise.all([
      ctx.db.query.workouts.findMany({
        where: and(
          eq(workouts.userId, params.clientId),
          sql`${workouts.startedAt} >= ${startDateStr}::timestamp`
        ),
      }),
      ctx.db.query.trainingPrograms.findFirst({
        where: and(
          eq(trainingPrograms.userId, params.clientId),
          eq(trainingPrograms.status, 'active')
        ),
      }),
      ctx.db.query.readinessScores.findMany({
        where: and(
          eq(readinessScores.userId, params.clientId),
          sql`${readinessScores.date} >= ${startDateStr}::timestamp`
        ),
        orderBy: [desc(readinessScores.date)],
      }),
    ]);

    const completedWorkouts = clientWorkouts.filter(w => w.status === 'completed');
    const avgReadiness = readiness.length > 0
      ? readiness.reduce((sum, r) => sum + (r.overallScore ?? 0), 0) / readiness.length
      : null;

    return toolSuccess({
      clientId: params.clientId,
      period: `Last ${params.days} days`,
      analytics: {
        workoutsCompleted: completedWorkouts.length,
        workoutsStarted: clientWorkouts.length,
        completionRate: clientWorkouts.length > 0
          ? Math.round((completedWorkouts.length / clientWorkouts.length) * 100)
          : 0,
        programAdherence: program?.adherencePercent ?? null,
        averageReadiness: avgReadiness ? Math.round(avgReadiness) : null,
        checkInsCompleted: readiness.length,
        lastWorkout: completedWorkouts[0]?.completedAt ?? null,
        lastCheckIn: readiness[0]?.date ?? null,
      },
    });
  },
});

// Tool 54: Get At-Risk Clients
export const getAtRiskClients = createTool({
  name: 'getAtRiskClients',
  description: 'Identify clients who may need attention based on activity patterns',
  parameters: z.object({
    inactiveDays: z.number().min(1).max(30).default(7),
    lowAdherenceThreshold: z.number().min(0).max(100).default(50),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - params.inactiveDays);

    // Find programs with low adherence
    const lowAdherencePrograms = await ctx.db.query.trainingPrograms.findMany({
      where: and(
        eq(trainingPrograms.status, 'active'),
        lt(trainingPrograms.adherencePercent, params.lowAdherenceThreshold)
      ),
    });

    // This would be enhanced with client_assignments to filter to coach's clients
    return toolSuccess({
      atRiskClients: {
        lowAdherence: lowAdherencePrograms.map(p => ({
          clientId: p.userId,
          programName: p.name,
          adherencePercent: p.adherencePercent,
        })),
        inactive: [], // Would require client_assignments table
      },
      thresholds: {
        inactiveDays: params.inactiveDays,
        lowAdherenceThreshold: params.lowAdherenceThreshold,
      },
    });
  },
});

// Export all analytics tools
export const analyticsTools = {
  getClientAnalyticsSummary,
  getAtRiskClients,
};

