import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { exercises } from '../db/schema';
import { eq, ilike, or, sql } from 'drizzle-orm';

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

      let query = ctx.db.select().from(exercises);

      // Build where conditions
      const conditions = [];

      if (muscleGroup) {
        conditions.push(eq(exercises.primaryMuscle, muscleGroup as any));
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

  // Get single exercise by ID
  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const exercise = await ctx.db.query.exercises.findFirst({
        where: eq(exercises.id, input.id),
      });

      if (!exercise) {
        throw new Error('Exercise not found');
      }

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

      return results.rows;
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
        secondaryMuscles: z.array(z.string()).optional(),
        equipment: z.array(z.string()).optional(),
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

  // Get exercises by muscle group
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
      return ctx.db.query.exercises.findMany({
        where: eq(exercises.primaryMuscle, input.muscleGroup),
        orderBy: (exercises, { asc }) => [asc(exercises.name)],
      });
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
        throw new Error('Exercise not found');
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
});
