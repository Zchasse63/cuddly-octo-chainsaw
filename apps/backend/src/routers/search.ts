import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { createExerciseMatcher } from '../services/exerciseMatcher';
import { createSearchIndexer } from '../services/searchIndexer';
import { search } from '../lib/upstash';
import { SEARCH_INDEXES } from '../services/searchIndexer';

export const searchRouter = router({
  // Search exercises with Upstash Search
  exercises: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(5),
        minScore: z.number().min(0).max(1).default(0.3),
        muscleGroup: z.string().optional(),
        equipment: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const matcher = createExerciseMatcher(ctx.db);

      const results = await matcher.matchExercise({
        query: input.query,
        topK: input.limit,
        minScore: input.minScore,
        muscleGroupFilter: input.muscleGroup,
        equipmentFilter: input.equipment,
      });

      return results;
    }),

  // Find exercise substitutes
  substitutes: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        avoidBodyParts: z.array(z.string()).optional(),
        sameEquipment: z.boolean().default(false),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const matcher = createExerciseMatcher(ctx.db);

      const results = await matcher.findSubstitutes(input.exerciseId, {
        avoidBodyParts: input.avoidBodyParts,
        sameEquipment: input.sameEquipment,
        topK: input.limit,
      });

      return results;
    }),

  // Get similar exercises
  similar: publicProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const matcher = createExerciseMatcher(ctx.db);

      const results = await matcher.getSimilarExercises(input.exerciseId, input.limit);

      return results;
    }),

  // Search knowledge base (for AI coach context)
  knowledge: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(10).default(5),
        category: z.string().optional(),
        chunkType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const filterParts: string[] = [];

      if (input.category) {
        filterParts.push(`category = "${input.category}"`);
      }
      if (input.chunkType) {
        filterParts.push(`chunkType = "${input.chunkType}"`);
      }

      const filter = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

      const results = await search.query({
        index: SEARCH_INDEXES.KNOWLEDGE,
        query: input.query,
        topK: input.limit,
        filter,
      });

      return results.map((r) => ({
        id: r.id,
        score: r.score,
        ...r.data,
      }));
    }),

  // Index a single exercise (admin/internal use)
  indexExercise: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const indexer = createSearchIndexer(ctx.db);

      await indexer.indexExercise(input.exerciseId);

      return { success: true, exerciseId: input.exerciseId };
    }),

  // Index all unindexed exercises (admin/internal use)
  indexAllExercises: protectedProcedure.mutation(async ({ ctx }) => {
    const indexer = createSearchIndexer(ctx.db);

    const result = await indexer.indexAllExercises();

    return result;
  }),

  // Index knowledge entry (admin/internal use)
  indexKnowledge: protectedProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const indexer = createSearchIndexer(ctx.db);

      await indexer.indexKnowledgeEntry(input.entryId);

      return { success: true, entryId: input.entryId };
    }),
});
