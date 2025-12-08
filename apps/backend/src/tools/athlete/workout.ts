/**
 * Workout Tools
 *
 * Tools for accessing workouts, exercise history, personal records, and logging sets.
 */

import { z } from 'zod';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError, getDateRange } from '../utils';
import { workouts, workoutSets, personalRecords, exercises } from '../../db/schema';

// Tool 6: Get Today's Workout
export const getTodaysWorkout = createTool({
  name: 'getTodaysWorkout',
  description: 'Get the workout scheduled for today from the user\'s active program',
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    // Check for active workout first
    const activeWorkout = await ctx.db.query.workouts.findFirst({
      where: and(eq(workouts.userId, ctx.userId), eq(workouts.status, 'active')),
    });

    if (activeWorkout) {
      return toolSuccess({
        hasScheduledWorkout: true,
        isRestDay: false,
        workout: { id: activeWorkout.id, name: activeWorkout.name, startedAt: activeWorkout.startedAt },
        message: 'You have an active workout in progress',
      });
    }

    // TODO: Check for scheduled program workout for today
    return toolSuccess({
      hasScheduledWorkout: false,
      isRestDay: false,
      message: 'No workout scheduled for today. Would you like to start one?',
    });
  },
});

// Tool 7: Get Recent Workouts
export const getRecentWorkouts = createTool({
  name: 'getRecentWorkouts',
  description: 'Get recent completed workouts with exercises and sets',
  parameters: z.object({
    limit: z.number().min(1).max(30).default(7).describe('Number of workouts to return'),
  }),
  execute: async (params, ctx) => {
    const recentWorkouts = await ctx.db.query.workouts.findMany({
      where: and(eq(workouts.userId, ctx.userId), eq(workouts.status, 'completed')),
      orderBy: [desc(workouts.completedAt)],
      limit: params.limit,
    });

    return toolSuccess({
      workouts: recentWorkouts.map(w => ({
        id: w.id,
        name: w.name,
        date: w.completedAt ?? w.startedAt,
        duration: w.duration,
        notes: w.notes,
      })),
      totalCount: recentWorkouts.length,
    });
  },
});

// Tool 8: Get Exercise History
export const getExerciseHistory = createTool({
  name: 'getExerciseHistory',
  description: 'Get history for a specific exercise including all sets, weights, and PRs',
  parameters: z.object({
    exerciseName: z.string().describe('Name of the exercise to get history for'),
    limit: z.number().min(1).max(100).default(20).describe('Number of sets to return'),
  }),
  execute: async (params, ctx) => {
    // Find exercise by name
    const exercise = await ctx.db.query.exercises.findFirst({
      where: sql`LOWER(${exercises.name}) LIKE LOWER(${'%' + params.exerciseName + '%'})`,
    });

    if (!exercise) {
      return toolError(`Exercise "${params.exerciseName}" not found`, 'EXERCISE_NOT_FOUND');
    }

    const sets = await ctx.db.query.workoutSets.findMany({
      where: and(eq(workoutSets.userId, ctx.userId), eq(workoutSets.exerciseId, exercise.id)),
      orderBy: [desc(workoutSets.createdAt)],
      limit: params.limit,
    });

    return toolSuccess({
      exercise: { id: exercise.id, name: exercise.name, primaryMuscle: exercise.primaryMuscle },
      sets: sets.map(s => ({
        date: s.createdAt,
        weight: s.weight,
        weightUnit: s.weightUnit,
        reps: s.reps,
        rpe: s.rpe,
        isPR: s.isPr ?? false,
      })),
      totalSets: sets.length,
    });
  },
});

// Tool 9: Get Personal Records
export const getPersonalRecords = createTool({
  name: 'getPersonalRecords',
  description: 'Get personal records for exercises',
  parameters: z.object({
    exerciseName: z.string().optional().describe('Filter by specific exercise'),
  }),
  execute: async (params, ctx) => {
    let records;
    if (params.exerciseName) {
      const exercise = await ctx.db.query.exercises.findFirst({
        where: sql`LOWER(${exercises.name}) LIKE LOWER(${'%' + params.exerciseName + '%'})`,
      });
      if (!exercise) {
        return toolError(`Exercise "${params.exerciseName}" not found`, 'EXERCISE_NOT_FOUND');
      }
      records = await ctx.db.query.personalRecords.findMany({
        where: and(eq(personalRecords.userId, ctx.userId), eq(personalRecords.exerciseId, exercise.id)),
        orderBy: [desc(personalRecords.achievedAt)],
        with: { exercise: true },
      });
    } else {
      records = await ctx.db.query.personalRecords.findMany({
        where: eq(personalRecords.userId, ctx.userId),
        orderBy: [desc(personalRecords.achievedAt)],
        with: { exercise: true },
        limit: 20,
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return toolSuccess({
      records: records.map(r => ({
        exerciseName: r.exercise?.name ?? 'Unknown',
        weight: r.weight,
        reps: r.reps,
        estimated1rm: r.estimated1rm,
        achievedAt: r.achievedAt,
      })),
      totalPRs: records.length,
      recentPRs: records.filter(r => r.achievedAt >= thirtyDaysAgo).length,
    });
  },
});

// Tool 10: Log Workout Set
export const logWorkoutSet = createTool({
  name: 'logWorkoutSet',
  description: 'Log a workout set during an active workout session',
  parameters: z.object({
    exerciseName: z.string().describe('Name of the exercise'),
    weight: z.number().min(0).describe('Weight used'),
    weightUnit: z.enum(['lbs', 'kg']).describe('Weight unit'),
    reps: z.number().min(1).describe('Number of reps completed'),
    rpe: z.number().min(1).max(10).optional().describe('Rate of perceived exertion (1-10)'),
  }),
  execute: async (_params, ctx) => {
    return toolSuccess({
      message: 'Set logging requires active workout context - use voice logging or manual entry',
      hint: 'Start a workout first, then log sets',
    });
  },
});

// Tool 11: Get Active Workout
export const getActiveWorkout = createTool({
  name: 'getActiveWorkout',
  description: 'Get the currently active workout session with logged sets',
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const activeWorkout = await ctx.db.query.workouts.findFirst({
      where: and(eq(workouts.userId, ctx.userId), eq(workouts.status, 'active')),
    });

    if (!activeWorkout) {
      return toolSuccess({ hasActiveWorkout: false });
    }

    const sets = await ctx.db.query.workoutSets.findMany({
      where: eq(workoutSets.workoutId, activeWorkout.id),
      orderBy: [desc(workoutSets.createdAt)],
    });

    // Fetch exercise names for each set
    const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];
    const exerciseList = exerciseIds.length > 0
      ? await ctx.db.query.exercises.findMany({
          where: sql`${exercises.id} = ANY(ARRAY[${sql.raw(exerciseIds.map(id => `'${id}'::uuid`).join(','))}])`,
        })
      : [];
    const exerciseMap = new Map(exerciseList.map(e => [e.id, e.name]));

    const duration = Math.floor((Date.now() - activeWorkout.startedAt.getTime()) / 1000);
    const totalVolume = sets.reduce((sum, s) => sum + ((s.weight ?? 0) * (s.reps ?? 0)), 0);

    return toolSuccess({
      hasActiveWorkout: true,
      workout: {
        id: activeWorkout.id,
        name: activeWorkout.name,
        startedAt: activeWorkout.startedAt,
        duration,
        sets: sets.map(s => ({
          exerciseName: exerciseMap.get(s.exerciseId) ?? 'Unknown',
          weight: s.weight,
          reps: s.reps,
          isPR: s.isPr ?? false,
        })),
        totalVolume,
      },
    });
  },
});

// Tool 12: Search Exercises
export const searchExercises = createTool({
  name: 'searchExercises',
  description: 'Search the exercise database by name, muscle group, or equipment',
  parameters: z.object({
    query: z.string().describe('Search query for exercise name'),
    muscleGroup: z.string().optional().describe('Filter by primary muscle group'),
    limit: z.number().min(1).max(20).default(10).describe('Max results'),
  }),
  execute: async (params, ctx) => {
    const results = await ctx.db.query.exercises.findMany({
      where: sql`LOWER(${exercises.name}) LIKE LOWER(${'%' + params.query + '%'})`,
      limit: params.limit,
    });

    return toolSuccess({
      exercises: results.map(e => ({
        id: e.id,
        name: e.name,
        primaryMuscle: e.primaryMuscle,
        equipment: e.equipment,
        isCompound: e.isCompound,
      })),
      count: results.length,
    });
  },
});

// Tool 13: Get Exercise Substitutes
export const getExerciseSubstitutes = createTool({
  name: 'getExerciseSubstitutes',
  description: 'Get alternative exercises that target the same muscle group',
  parameters: z.object({
    exerciseName: z.string().describe('Name of the exercise to find substitutes for'),
    availableEquipment: z.array(z.string()).optional().describe('Equipment available'),
  }),
  execute: async (params, ctx) => {
    const exercise = await ctx.db.query.exercises.findFirst({
      where: sql`LOWER(${exercises.name}) LIKE LOWER(${'%' + params.exerciseName + '%'})`,
    });

    if (!exercise) {
      return toolError(`Exercise "${params.exerciseName}" not found`, 'EXERCISE_NOT_FOUND');
    }

    const substitutes = await ctx.db.query.exercises.findMany({
      where: and(
        eq(exercises.primaryMuscle, exercise.primaryMuscle),
        sql`${exercises.id} != ${exercise.id}`
      ),
      limit: 5,
    });

    return toolSuccess({
      original: { id: exercise.id, name: exercise.name, primaryMuscle: exercise.primaryMuscle },
      substitutes: substitutes.map(e => ({
        id: e.id,
        name: e.name,
        equipment: e.equipment,
        isCompound: e.isCompound,
      })),
    });
  },
});

// Export all workout tools
export const workoutTools = {
  getTodaysWorkout,
  getRecentWorkouts,
  getExerciseHistory,
  getPersonalRecords,
  logWorkoutSet,
  getActiveWorkout,
  searchExercises,
  getExerciseSubstitutes,
};

