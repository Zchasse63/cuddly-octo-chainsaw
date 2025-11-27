import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { knowledgeBase } from '../db/schema';
import { eq, ilike, or } from 'drizzle-orm';
import { search } from '../lib/upstash';
import { SEARCH_INDEXES, createSearchIndexer } from '../services/searchIndexer';

export const knowledgeRouter = router({
  // Search knowledge base using Upstash Search
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(5),
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

      const results = await search.query({
        index: SEARCH_INDEXES.KNOWLEDGE,
        query: input.query,
        topK: input.limit,
        filter: filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
      });

      return results.map((r) => ({
        id: r.id,
        score: r.score,
        ...r.data,
      }));
    }),

  // Get knowledge entry by ID
  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.query.knowledgeBase.findFirst({
        where: eq(knowledgeBase.id, input.id),
      });

      if (!entry) {
        throw new Error('Knowledge entry not found');
      }

      return entry;
    }),

  // List by category
  byCategory: publicProcedure
    .input(
      z.object({
        category: z.string(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.knowledgeBase.findMany({
        where: eq(knowledgeBase.category, input.category),
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // List by chunk type
  byChunkType: publicProcedure
    .input(
      z.object({
        chunkType: z.enum(['exercise_guide', 'nutrition', 'recovery', 'program']),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.knowledgeBase.findMany({
        where: eq(knowledgeBase.chunkType, input.chunkType),
        limit: input.limit,
      });
    }),

  // Create knowledge entry (admin)
  create: protectedProcedure
    .input(
      z.object({
        chunkId: z.string(),
        chunkType: z.enum(['exercise_guide', 'nutrition', 'recovery', 'program']),
        category: z.string().optional(),
        title: z.string().optional(),
        content: z.string(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .insert(knowledgeBase)
        .values({
          ...input,
          upstashIndexed: false,
        })
        .returning();

      // Index in Upstash Search
      const indexer = createSearchIndexer(ctx.db);
      await indexer.indexKnowledgeEntry(entry.id);

      return entry;
    }),

  // Update knowledge entry (admin)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().optional(),
        content: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [updated] = await ctx.db
        .update(knowledgeBase)
        .set({
          ...data,
          upstashIndexed: false, // Mark for re-indexing
        })
        .where(eq(knowledgeBase.id, id))
        .returning();

      if (!updated) {
        throw new Error('Knowledge entry not found');
      }

      // Re-index in Upstash Search
      const indexer = createSearchIndexer(ctx.db);
      await indexer.indexKnowledgeEntry(id);

      return updated;
    }),

  // Delete knowledge entry (admin)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db
        .delete(knowledgeBase)
        .where(eq(knowledgeBase.id, input.id))
        .returning();

      if (deleted.length === 0) {
        throw new Error('Knowledge entry not found');
      }

      // Remove from Upstash Search
      await search.delete({
        index: SEARCH_INDEXES.KNOWLEDGE,
        id: input.id,
      });

      return { success: true };
    }),

  // Get context for AI coach (combines search results)
  getCoachContext: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        exerciseName: z.string().optional(),
        topic: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const searches = [];

      // Main query search
      searches.push(
        search.query({
          index: SEARCH_INDEXES.KNOWLEDGE,
          query: input.query,
          topK: 3,
        })
      );

      // Exercise-specific context
      if (input.exerciseName) {
        searches.push(
          search.query({
            index: SEARCH_INDEXES.EXERCISE_CUES,
            query: input.exerciseName,
            topK: 2,
          })
        );
      }

      const results = await Promise.all(searches);

      // Combine and format context
      const context = results.flat().map((r) => ({
        id: r.id,
        score: r.score,
        content: (r.data as Record<string, string>).content || (r.data as Record<string, string>).cueText,
        type: (r.data as Record<string, string>).chunkType || 'cue',
      }));

      return context;
    }),

  // Get all categories
  getCategories: publicProcedure.query(async ({ ctx }) => {
    const entries = await ctx.db.query.knowledgeBase.findMany({
      columns: { category: true },
    });

    const categories = [...new Set(entries.map((e) => e.category).filter(Boolean))];

    return categories;
  }),
});
