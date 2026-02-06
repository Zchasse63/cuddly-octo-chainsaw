import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { exercises } from '../db/schema';
import { eq, ilike, or, sql } from 'drizzle-orm';
import { cache } from '../lib/upstash';
import { muscleGroupEnum } from '../db/schema/exercises';

// Cache TTLs (in seconds)
const CACHE_TTL = {
  EXERCISE_BY_ID: 1800,        // 30 minutes
  EXERCISES_BY_MUSCLE: 3600,   // 1 hour
  FORM_TIPS: 86400,            // 24 hours
};

export const exerciseRouter = router({
  // List all exercises with optional filtering
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        muscleGroup: z.string().optional(),
        equipment: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { limit = 50, offset = 0, muscleGroup, equipment, search } = input || {};

      const query = ctx.db.select().from(exercises);

      // Build where conditions
      const conditions = [];

      if (muscleGroup) {
        conditions.push(eq(exercises.primaryMuscle, muscleGroup as typeof muscleGroupEnum.enumValues[number]));
      }

      if (search) {
        conditions.push(
          or(
            ilike(exercises.name, `%${search}%`),
            sql`${exercises.synonyms} @> ARRAY[${search}]::text[]`
          )
        );
      }

      const results = await ctx.db.query.exercises.findMany({
        limit,
        offset,
        orderBy: (exercises, { asc }) => [asc(exercises.name)],
      });

      return results;
    }),

  // Get single exercise by ID (cached for 30 minutes)
  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const cacheKey = `exercise:${input.id}`;

      // Check cache first
      const cached = await cache.get<typeof exercises.$inferSelect>(cacheKey);
      if (cached) return cached;

      const exercise = await ctx.db.query.exercises.findFirst({
        where: eq(exercises.id, input.id),
      });

      if (!exercise) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
      }

      // Cache the result
      await cache.set(cacheKey, exercise, CACHE_TTL.EXERCISE_BY_ID);
      return exercise;
    }),

  // Fuzzy match exercise by name
  match: publicProcedure
    .input(
      z.object({
        name: z.string(),
        threshold: z.number().min(0).max(1).default(0.8),
      })
    )
    .query(async ({ ctx, input }) => {
      // Use similarity function for fuzzy matching
      const results = await ctx.db.execute(sql`
        SELECT *,
          similarity(name, ${input.name}) as match_score
        FROM exercises
        WHERE similarity(name, ${input.name}) > ${input.threshold}
           OR name ILIKE ${'%' + input.name + '%'}
           OR ${input.name} = ANY(synonyms)
        ORDER BY match_score DESC
        LIMIT 5
      `);

      return results as unknown as Array<Record<string, unknown>>;
    }),

  // Create custom exercise
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        primaryMuscle: z.enum([
          'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
          'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
          'lower_back', 'traps', 'lats', 'full_body'
        ]),
        secondaryMuscles: z.array(z.enum([
          'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
          'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
          'lower_back', 'traps', 'lats', 'full_body'
        ])).optional(),
        equipment: z.array(z.enum([
          'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine',
          'bodyweight', 'bands', 'smith_machine', 'ez_bar', 'trap_bar'
        ])).optional(),
        isCompound: z.boolean().optional(),
        isUnilateral: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [exercise] = await ctx.db
        .insert(exercises)
        .values({
          ...input,
          isCustom: true,
          createdByUserId: ctx.user.id,
        })
        .returning();

      return exercise;
    }),

  // Get exercises by muscle group (cached for 1 hour)
  byMuscleGroup: publicProcedure
    .input(
      z.object({
        muscleGroup: z.enum([
          'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
          'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
          'lower_back', 'traps', 'lats', 'full_body'
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const cacheKey = `exercises:muscle:${input.muscleGroup}`;

      // Check cache first
      const cached = await cache.get<Array<typeof exercises.$inferSelect>>(cacheKey);
      if (cached) return cached;

      const results = await ctx.db.query.exercises.findMany({
        where: eq(exercises.primaryMuscle, input.muscleGroup),
        orderBy: (exercises, { asc }) => [asc(exercises.name)],
      });

      // Cache the result
      await cache.set(cacheKey, results, CACHE_TTL.EXERCISES_BY_MUSCLE);
      return results;
    }),

  // Get exercise suggestions for substitution
  substitutes: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const original = await ctx.db.query.exercises.findFirst({
        where: eq(exercises.id, input.exerciseId),
      });

      if (!original) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
      }

      // Find exercises with same primary muscle
      return ctx.db.query.exercises.findMany({
        where: (exercises, { and, eq, ne }) =>
          and(
            eq(exercises.primaryMuscle, original.primaryMuscle),
            ne(exercises.id, original.id)
          ),
        limit: input.limit,
      });
    }),

  // Get form tips for an exercise (cached for 24 hours)
  getFormTips: publicProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const cacheKey = `exercise:formtips:${input.exerciseId}`;

      // Check cache first
      type FormTipsResult = {
        exerciseId: string;
        exerciseName: string;
        tips: Array<{ phase: string; cue: string }>;
      };
      const cached = await cache.get<FormTipsResult>(cacheKey);
      if (cached) return cached;

      const exercise = await ctx.db.query.exercises.findFirst({
        where: eq(exercises.id, input.exerciseId),
      });

      if (!exercise) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
      }

      // Fetch exercise cues from database
      const cues = await ctx.db.query.exerciseCues.findMany({
        where: (exerciseCues, { eq }) => eq(exerciseCues.exerciseId, input.exerciseId),
      });

      let result: FormTipsResult;

      // Return exercise-specific cues or fallback to generic tips
      if (cues.length > 0) {
        result = {
          exerciseId: input.exerciseId,
          exerciseName: exercise.name,
          tips: cues.map(c => ({
            phase: c.cueType,
            cue: c.cueText,
          })),
        };
      } else {
        // Fallback: generate generic form tips based on exercise type
        const genericTips = [];
        if (exercise.isCompound) {
          genericTips.push({ phase: 'setup', cue: 'Maintain a neutral spine throughout the movement' });
          genericTips.push({ phase: 'execution', cue: 'Engage your core and breathe with each rep' });
        }
        if (exercise.isUnilateral) {
          genericTips.push({ phase: 'setup', cue: 'Keep your body stable and avoid rotation' });
        }
        genericTips.push({ phase: 'execution', cue: 'Control the weight through the full range of motion' });

        result = {
          exerciseId: input.exerciseId,
          exerciseName: exercise.name,
          tips: genericTips,
        };
      }

      // Cache the result
      await cache.set(cacheKey, result, CACHE_TTL.FORM_TIPS);
      return result;
    }),
});
