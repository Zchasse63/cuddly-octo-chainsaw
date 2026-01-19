/**
 * Coach Client Management Tools
 *
 * Tools for coaches to manage and view their clients' data.
 * All tools verify coach-client relationships before accessing data.
 */

import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import {
  userProfiles,
  workouts,
  trainingPrograms,
  readinessScores,
  dailyHealthMetrics,
  coachNotes,
} from '../../db/schema';
import {
  getCoachClients,
  isCoachOfClient,
  getNotesForClient,
} from './helpers';

// Tool 36: Get Client List
export const getClientList = createTool({
  name: 'getClientList',
  description: 'Get list of all clients assigned to the coach. Use this when the coach asks "show my clients", "how many clients do I have", "list my athletes", or when you need to display the coach\'s client roster.',
  parameters: z.object({
    status: z.enum(['active', 'all']).default('active'),
    limit: z.number().min(1).max(50).default(20),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    const result = await getCoachClients(ctx.db, ctx.userId, {
      status: params.status === 'all' ? 'all' : 'active',
      limit: params.limit,
    });

    return toolSuccess({
      hasClients: result.clients.length > 0,
      clients: result.clients,
      totalCount: result.totalCount,
    });
  },
});

// Tool 37: Get Client Profile
export const getClientProfile = createTool({
  name: 'getClientProfile',
  description: 'Get detailed profile for a specific client. Use this when the coach asks "show me John\'s profile", "what are Sarah\'s goals", "tell me about this client", or when you need to access client experience level, goals, and preferences.',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to view this client', 'UNAUTHORIZED');
    }

    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, params.clientId),
    });

    if (!profile) {
      return toolError('Client not found', 'CLIENT_NOT_FOUND');
    }

    return toolSuccess({
      client: {
        id: params.clientId,
        name: profile.name,
        experienceLevel: profile.experienceLevel,
        goals: profile.goals,
        injuries: profile.injuries,
        tier: profile.tier,
        preferredWeightUnit: profile.preferredWeightUnit,
      },
    });
  },
});

// Tool 38: Get Client Workouts
export const getClientWorkouts = createTool({
  name: 'getClientWorkouts',
  description: 'Get recent workouts for a specific client',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
    limit: z.number().min(1).max(30).default(10),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to view this client', 'UNAUTHORIZED');
    }

    const clientWorkouts = await ctx.db.query.workouts.findMany({
      where: eq(workouts.userId, params.clientId),
      orderBy: [desc(workouts.startedAt)],
      limit: params.limit,
    });

    return toolSuccess({
      clientId: params.clientId,
      workouts: clientWorkouts.map(w => ({
        id: w.id,
        name: w.name,
        status: w.status,
        startedAt: w.startedAt,
        completedAt: w.completedAt,
        duration: w.duration,
      })),
      totalCount: clientWorkouts.length,
    });
  },
});

// Tool 39: Get Client Progress
export const getClientProgress = createTool({
  name: 'getClientProgress',
  description: 'Get progress summary for a specific client',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
    days: z.number().min(7).max(90).default(30),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to view this client', 'UNAUTHORIZED');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.days);
    const startDateStr = startDate.toISOString();

    const [workoutCount, program] = await Promise.all([
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
    ]);

    return toolSuccess({
      clientId: params.clientId,
      period: `Last ${params.days} days`,
      progress: {
        workoutsCompleted: workoutCount.length,
        hasActiveProgram: !!program,
        programName: program?.name,
        programAdherence: program?.adherencePercent,
      },
    });
  },
});

// Tool 40: Get Client Health Data
export const getClientHealthData = createTool({
  name: 'getClientHealthData',
  description: 'Get health metrics for a specific client',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
    days: z.number().min(1).max(30).default(7),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to view this client', 'UNAUTHORIZED');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - params.days);
    const startDateStr = startDate.toISOString();

    const [readiness, health] = await Promise.all([
      ctx.db.query.readinessScores.findMany({
        where: and(
          eq(readinessScores.userId, params.clientId),
          sql`${readinessScores.date} >= ${startDateStr}::timestamp`
        ),
        orderBy: [desc(readinessScores.date)],
      }),
      ctx.db.query.dailyHealthMetrics.findMany({
        where: and(
          eq(dailyHealthMetrics.userId, params.clientId),
          sql`${dailyHealthMetrics.date} >= ${startDateStr.split('T')[0]}::date`
        ),
        orderBy: [desc(dailyHealthMetrics.date)],
      }),
    ]);

    return toolSuccess({
      clientId: params.clientId,
      readiness: readiness.map(r => ({
        date: r.date,
        score: r.overallScore,
        energy: r.energyLevel,
        soreness: r.soreness,
      })),
      health: health.map(h => ({
        date: h.date,
        steps: h.steps,
        sleepHours: h.sleepHours,
        recoveryScore: h.recoveryScore,
      })),
    });
  },
});

// Tool 41: Get Client Program
export const getClientProgram = createTool({
  name: 'getClientProgram',
  description: 'Get active training program for a specific client',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to view this client', 'UNAUTHORIZED');
    }

    const program = await ctx.db.query.trainingPrograms.findFirst({
      where: and(
        eq(trainingPrograms.userId, params.clientId),
        eq(trainingPrograms.status, 'active')
      ),
    });

    if (!program) {
      return toolSuccess({
        hasProgram: false,
        message: 'Client has no active program',
      });
    }

    return toolSuccess({
      hasProgram: true,
      program: {
        id: program.id,
        name: program.name,
        programType: program.programType,
        currentWeek: program.currentWeek,
        totalWeeks: program.durationWeeks,
        adherencePercent: program.adherencePercent,
        startDate: program.startDate,
      },
    });
  },
});

// Tool 42: Get Client Check-Ins
export const getClientCheckIns = createTool({
  name: 'getClientCheckIns',
  description: 'Get recent readiness check-ins for a client',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
    limit: z.number().min(1).max(30).default(7),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to view this client', 'UNAUTHORIZED');
    }

    const checkIns = await ctx.db.query.readinessScores.findMany({
      where: eq(readinessScores.userId, params.clientId),
      orderBy: [desc(readinessScores.date)],
      limit: params.limit,
    });

    return toolSuccess({
      clientId: params.clientId,
      checkIns: checkIns.map(c => ({
        date: c.date,
        overallScore: c.overallScore,
        sleepQuality: c.sleepQuality,
        energyLevel: c.energyLevel,
        motivation: c.motivation,
        soreness: c.soreness,
        stress: c.stress,
        notes: c.notes,
      })),
    });
  },
});

// Tool 43: Get Coach Notes
export const getCoachNotes = createTool({
  name: 'getCoachNotes',
  description: 'Get coach notes for a specific client',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
    category: z.enum(['general', 'workout', 'nutrition', 'injury', 'progress', 'goal', 'check_in', 'all']).default('all'),
    limit: z.number().min(1).max(50).default(20),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to view this client', 'UNAUTHORIZED');
    }

    const notes = await getNotesForClient(
      ctx.db,
      ctx.userId,
      params.clientId,
      {
        limit: params.limit,
        category: params.category === 'all' ? undefined : params.category,
      }
    );

    return toolSuccess({
      clientId: params.clientId,
      notes: notes.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        isPinned: n.isPinned,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      totalCount: notes.length,
    });
  },
});

// Tool 44: Get Client Injuries
export const getClientInjuries = createTool({
  name: 'getClientInjuries',
  description: 'Get injury history and current restrictions for a client',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to view this client', 'UNAUTHORIZED');
    }

    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, params.clientId),
    });

    if (!profile) {
      return toolError('Client not found', 'CLIENT_NOT_FOUND');
    }

    return toolSuccess({
      clientId: params.clientId,
      currentInjuries: profile.injuries,
      exercisesToAvoid: profile.exercisesToAvoid ?? [],
    });
  },
});

// Export all client management tools
export const clientTools = {
  getClientList,
  getClientProfile,
  getClientWorkouts,
  getClientProgress,
  getClientHealthData,
  getClientProgram,
  getClientCheckIns,
  getCoachNotes,
  getClientInjuries,
};

