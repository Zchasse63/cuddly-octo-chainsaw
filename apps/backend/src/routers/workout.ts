import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { workouts, workoutSets, personalRecords, exercises } from '../db/schema';
import { eq, desc, and, sql, gte } from 'drizzle-orm';
import { calculate1RM } from '../lib/formulas';

export const workoutRouter = router({
  // Start a new workout
  start: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        programId: z.string().uuid().optional(),
        programWeek: z.number().optional(),
        programDay: z.number().optional(),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      const [workout] = await ctx.db
        .insert(workouts)
        .values({
          userId: ctx.user.id,
          name: input?.name || 'Workout',
          status: 'active',
          programId: input?.programId,
          programWeek: input?.programWeek,
          programDay: input?.programDay,
        })
        .returning();

      return workout;
    }),

  // Log a set
  logSet: protectedProcedure
    .input(
      z.object({
        workoutId: z.string().uuid(),
        exerciseId: z.string().uuid(),
        setNumber: z.number().min(1),
        reps: z.number().min(1),
        weight: z.number().min(0).optional(),
        weightUnit: z.enum(['lbs', 'kg']).default('lbs'),
        rpe: z.number().min(1).max(10).optional(),
        loggingMethod: z.enum(['voice', 'manual', 'quick_log']).default('manual'),
        voiceTranscript: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate estimated 1RM
      const estimated1rm = input.weight ? calculate1RM(input.weight, input.reps) : null;

      // Check for PR
      let isPr = false;
      if (input.weight && input.reps) {
        const existingPr = await ctx.db.query.personalRecords.findFirst({
          where: and(
            eq(personalRecords.userId, ctx.user.id),
            eq(personalRecords.exerciseId, input.exerciseId)
          ),
          orderBy: [desc(personalRecords.estimated1rm)],
        });

        if (!existingPr || (estimated1rm && estimated1rm > (existingPr.estimated1rm || 0))) {
          isPr = true;
        }
      }

      // Insert the set
      const [set] = await ctx.db
        .insert(workoutSets)
        .values({
          workoutId: input.workoutId,
          exerciseId: input.exerciseId,
          userId: ctx.user.id,
          setNumber: input.setNumber,
          reps: input.reps,
          weight: input.weight,
          weightUnit: input.weightUnit,
          rpe: input.rpe,
          loggingMethod: input.loggingMethod,
          voiceTranscript: input.voiceTranscript,
          confidence: input.confidence,
          isPr,
          estimated1rm,
          syncedAt: new Date(),
        })
        .returning();

      // Record PR if achieved
      if (isPr && input.weight) {
        await ctx.db.insert(personalRecords).values({
          userId: ctx.user.id,
          exerciseId: input.exerciseId,
          weight: input.weight,
          weightUnit: input.weightUnit,
          reps: input.reps,
          estimated1rm,
          workoutSetId: set.id,
        });
      }

      return { set, isPr };
    }),

  // Complete workout
  complete: protectedProcedure
    .input(
      z.object({
        workoutId: z.string().uuid(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workout = await ctx.db.query.workouts.findFirst({
        where: and(
          eq(workouts.id, input.workoutId),
          eq(workouts.userId, ctx.user.id)
        ),
      });

      if (!workout) {
        throw new Error('Workout not found');
      }

      const duration = Math.floor(
        (Date.now() - new Date(workout.startedAt).getTime()) / 1000
      );

      const [updated] = await ctx.db
        .update(workouts)
        .set({
          status: 'completed',
          completedAt: new Date(),
          duration,
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(eq(workouts.id, input.workoutId))
        .returning();

      // Get workout summary
      const sets = await ctx.db.query.workoutSets.findMany({
        where: eq(workoutSets.workoutId, input.workoutId),
      });

      const prs = sets.filter((s) => s.isPr);
      const totalVolume = sets.reduce(
        (acc, s) => acc + (s.weight || 0) * (s.reps || 0),
        0
      );

      return {
        workout: updated,
        summary: {
          totalSets: sets.length,
          totalVolume,
          duration,
          prsAchieved: prs.length,
        },
      };
    }),

  // Cancel workout
  cancel: protectedProcedure
    .input(z.object({ workoutId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(workouts)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(
          and(eq(workouts.id, input.workoutId), eq(workouts.userId, ctx.user.id))
        )
        .returning();

      return updated;
    }),

  // Get active workout
  active: protectedProcedure.query(async ({ ctx }) => {
    const workout = await ctx.db.query.workouts.findFirst({
      where: and(eq(workouts.userId, ctx.user.id), eq(workouts.status, 'active')),
      orderBy: [desc(workouts.startedAt)],
    });

    if (!workout) {
      return null;
    }

    const sets = await ctx.db.query.workoutSets.findMany({
      where: eq(workoutSets.workoutId, workout.id),
      orderBy: [desc(workoutSets.createdAt)],
    });

    return { workout, sets };
  }),

  // Get workout history
  history: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { limit = 20, offset = 0 } = input || {};

      return ctx.db.query.workouts.findMany({
        where: and(
          eq(workouts.userId, ctx.user.id),
          eq(workouts.status, 'completed')
        ),
        orderBy: [desc(workouts.completedAt)],
        limit,
        offset,
      });
    }),

  // Get workout by ID with sets
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const workout = await ctx.db.query.workouts.findFirst({
        where: and(eq(workouts.id, input.id), eq(workouts.userId, ctx.user.id)),
      });

      if (!workout) {
        throw new Error('Workout not found');
      }

      const sets = await ctx.db.query.workoutSets.findMany({
        where: eq(workoutSets.workoutId, workout.id),
        orderBy: (sets, { asc }) => [asc(sets.createdAt)],
      });

      return { workout, sets };
    }),

  // Get last weight used for an exercise
  lastWeight: protectedProcedure
    .input(z.object({ exerciseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const lastSet = await ctx.db.query.workoutSets.findFirst({
        where: and(
          eq(workoutSets.userId, ctx.user.id),
          eq(workoutSets.exerciseId, input.exerciseId)
        ),
        orderBy: [desc(workoutSets.createdAt)],
      });

      return lastSet
        ? { weight: lastSet.weight, unit: lastSet.weightUnit }
        : null;
    }),

  // Get PRs for user
  prs: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(personalRecords.userId, ctx.user.id)];

      if (input?.exerciseId) {
        conditions.push(eq(personalRecords.exerciseId, input.exerciseId));
      }

      return ctx.db.query.personalRecords.findMany({
        where: and(...conditions),
        orderBy: [desc(personalRecords.achievedAt)],
        limit: input?.limit || 20,
      });
    }),

  // Weekly volume stats
  weeklyVolume: protectedProcedure.query(async ({ ctx }) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await ctx.db.execute(sql`
      SELECT
        DATE(ws.created_at) as date,
        SUM(ws.weight * ws.reps) as volume,
        COUNT(*) as total_sets
      FROM workout_sets ws
      WHERE ws.user_id = ${ctx.user.id}
        AND ws.created_at >= ${oneWeekAgo.toISOString()}
      GROUP BY DATE(ws.created_at)
      ORDER BY date
    `);

    return result as unknown as Array<Record<string, unknown>>;
  }),

  // Get exercise history (sets for a specific exercise)
  exerciseHistory: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.workoutSets.findMany({
        where: and(
          eq(workoutSets.userId, ctx.user.id),
          eq(workoutSets.exerciseId, input.exerciseId)
        ),
        orderBy: [desc(workoutSets.createdAt)],
        limit: input.limit,
      });
    }),

  // Get PRs for a specific exercise
  exercisePRs: protectedProcedure
    .input(z.object({ exerciseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.personalRecords.findMany({
        where: and(
          eq(personalRecords.userId, ctx.user.id),
          eq(personalRecords.exerciseId, input.exerciseId)
        ),
        orderBy: [desc(personalRecords.estimated1rm)],
        limit: 5,
      });
    }),
});
