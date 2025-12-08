/**
 * Program Tools
 *
 * Tools for accessing training programs, progress, and upcoming workouts.
 */

import { z } from 'zod';
import { eq, and, gte, lte, asc } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import { trainingPrograms, programWeeks, programDays, programExercises } from '../../db/schema';

// Tool 14: Get Active Program
export const getActiveProgram = createTool({
  name: 'getActiveProgram',
  description: 'Get the user\'s currently active training program with overview',
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const program = await ctx.db.query.trainingPrograms.findFirst({
      where: and(eq(trainingPrograms.userId, ctx.userId), eq(trainingPrograms.status, 'active')),
    });

    if (!program) {
      return toolSuccess({
        hasActiveProgram: false,
        message: 'No active program. Would you like to start one?',
      });
    }

    return toolSuccess({
      hasActiveProgram: true,
      program: {
        id: program.id,
        name: program.name,
        description: program.description,
        programType: program.programType,
        durationWeeks: program.durationWeeks,
        daysPerWeek: program.daysPerWeek,
        currentWeek: program.currentWeek,
        currentDay: program.currentDay,
        startDate: program.startDate,
        endDate: program.endDate,
        primaryGoal: program.primaryGoal,
        adherencePercent: program.adherencePercent,
      },
    });
  },
});

// Tool 15: Get Program Progress
export const getProgramProgress = createTool({
  name: 'getProgramProgress',
  description: 'Get detailed progress for the active training program',
  parameters: z.object({}),
  requiredRole: 'premium',
  execute: async (_params, ctx) => {
    const program = await ctx.db.query.trainingPrograms.findFirst({
      where: and(eq(trainingPrograms.userId, ctx.userId), eq(trainingPrograms.status, 'active')),
    });

    if (!program) {
      return toolError('No active program found', 'NO_PROGRAM');
    }

    const weeks = await ctx.db.query.programWeeks.findMany({
      where: eq(programWeeks.programId, program.id),
      orderBy: [asc(programWeeks.weekNumber)],
    });

    const completedWeeks = weeks.filter(w => w.isCompleted).length;
    const percentComplete = (completedWeeks / program.durationWeeks) * 100;

    return toolSuccess({
      program: { id: program.id, name: program.name },
      progress: {
        currentWeek: program.currentWeek,
        totalWeeks: program.durationWeeks,
        completedWeeks,
        percentComplete: Math.round(percentComplete),
        workoutsCompleted: program.totalWorkoutsCompleted ?? 0,
        workoutsScheduled: program.totalWorkoutsScheduled ?? 0,
        adherencePercent: program.adherencePercent ?? 0,
      },
      weeks: weeks.map(w => ({
        weekNumber: w.weekNumber,
        name: w.name,
        focus: w.focus,
        isCompleted: w.isCompleted,
      })),
    });
  },
});

// Tool 16: Get Upcoming Workouts
export const getUpcomingWorkouts = createTool({
  name: 'getUpcomingWorkouts',
  description: 'Get upcoming scheduled workouts from the program',
  parameters: z.object({
    days: z.number().min(1).max(14).default(7).describe('Number of days to look ahead'),
  }),
  execute: async (params, ctx) => {
    const program = await ctx.db.query.trainingPrograms.findFirst({
      where: and(eq(trainingPrograms.userId, ctx.userId), eq(trainingPrograms.status, 'active')),
    });

    if (!program) {
      return toolSuccess({ hasProgram: false, upcomingWorkouts: [] });
    }

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + params.days);

    const upcoming = await ctx.db.query.programDays.findMany({
      where: and(
        eq(programDays.programId, program.id),
        eq(programDays.isCompleted, false)
      ),
      orderBy: [asc(programDays.weekNumber), asc(programDays.dayNumber)],
      limit: params.days,
    });

    return toolSuccess({
      hasProgram: true,
      programName: program.name,
      upcomingWorkouts: upcoming.map(d => ({
        dayNumber: d.dayNumber,
        weekNumber: d.weekNumber,
        name: d.name,
        workoutType: d.workoutType,
        estimatedDuration: d.estimatedDuration,
        scheduledDate: d.scheduledDate,
      })),
    });
  },
});

// Tool 17: Get Program Week
export const getProgramWeek = createTool({
  name: 'getProgramWeek',
  description: 'Get details for a specific week of the program',
  parameters: z.object({
    weekNumber: z.number().min(1).optional().describe('Week number (defaults to current week)'),
  }),
  execute: async (params, ctx) => {
    const program = await ctx.db.query.trainingPrograms.findFirst({
      where: and(eq(trainingPrograms.userId, ctx.userId), eq(trainingPrograms.status, 'active')),
    });

    if (!program) {
      return toolError('No active program found', 'NO_PROGRAM');
    }

    const weekNum = params.weekNumber ?? program.currentWeek ?? 1;

    const week = await ctx.db.query.programWeeks.findFirst({
      where: and(eq(programWeeks.programId, program.id), eq(programWeeks.weekNumber, weekNum)),
    });

    if (!week) {
      return toolError(`Week ${weekNum} not found in program`, 'WEEK_NOT_FOUND');
    }

    const days = await ctx.db.query.programDays.findMany({
      where: eq(programDays.weekId, week.id),
      orderBy: [asc(programDays.dayOfWeek)],
    });

    return toolSuccess({
      week: {
        weekNumber: week.weekNumber,
        name: week.name,
        focus: week.focus,
        description: week.description,
        isCompleted: week.isCompleted,
      },
      days: days.map(d => ({
        dayOfWeek: d.dayOfWeek,
        name: d.name,
        workoutType: d.workoutType,
        estimatedDuration: d.estimatedDuration,
        isCompleted: d.isCompleted,
      })),
    });
  },
});

// Export all program tools
export const programTools = {
  getActiveProgram,
  getProgramProgress,
  getUpcomingWorkouts,
  getProgramWeek,
};

