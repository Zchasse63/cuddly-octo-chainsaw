import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  crossfitWods,
  wodLogs,
  wodBenchmarks,
} from '../db/schema/crossfit';
import { eq, desc, and, ilike, or, sql } from 'drizzle-orm';

// Movement schema for WOD structure
const movementSchema = z.object({
  exercise: z.string(),
  reps: z.number().optional(),
  weight: z.number().optional(),
  weightUnit: z.enum(['lbs', 'kg']).optional(),
  distance: z.number().optional(),
  distanceUnit: z.enum(['m', 'km', 'mi', 'ft']).optional(),
  calories: z.number().optional(),
  notes: z.string().optional(),
});

// RX standards schema
const rxStandardsSchema = z.object({
  male: z.record(z.any()).optional(),
  female: z.record(z.any()).optional(),
});

export const wodsRouter = router({
  // ============ WOD LIBRARY ============

  // Get all WODs with optional filtering
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        wodType: z
          .enum([
            'amrap',
            'emom',
            'for_time',
            'chipper',
            'ladder',
            'tabata',
            'death_by',
            'custom',
          ])
          .optional(),
        isBenchmark: z.boolean().optional(),
        isHeroWod: z.boolean().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.wodType) {
        conditions.push(eq(crossfitWods.wodType, input.wodType));
      }
      if (input.isBenchmark !== undefined) {
        conditions.push(eq(crossfitWods.isBenchmark, input.isBenchmark));
      }
      if (input.isHeroWod !== undefined) {
        conditions.push(eq(crossfitWods.isHeroWod, input.isHeroWod));
      }
      if (input.search) {
        conditions.push(
          or(
            ilike(crossfitWods.name, `%${input.search}%`),
            ilike(crossfitWods.description, `%${input.search}%`)
          )
        );
      }

      const wods = await ctx.db.query.crossfitWods.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: input.limit,
        offset: input.offset,
        orderBy: [crossfitWods.name],
      });

      return wods;
    }),

  // Get a single WOD by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const wod = await ctx.db.query.crossfitWods.findFirst({
        where: eq(crossfitWods.id, input.id),
      });

      if (!wod) {
        throw new Error('WOD not found');
      }

      return wod;
    }),

  // Get a WOD by name (e.g., "Fran", "Murph")
  getByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      const wod = await ctx.db.query.crossfitWods.findFirst({
        where: ilike(crossfitWods.name, input.name),
      });

      return wod;
    }),

  // Create a new WOD (admin or custom)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        wodType: z.enum([
          'amrap',
          'emom',
          'for_time',
          'chipper',
          'ladder',
          'tabata',
          'death_by',
          'custom',
        ]),
        description: z.string().optional(),
        movements: z.array(movementSchema),
        timeCap: z.number().optional(),
        rounds: z.number().optional(),
        intervalSeconds: z.number().optional(),
        isBenchmark: z.boolean().default(false),
        isHeroWod: z.boolean().default(false),
        difficultyLevel: z
          .enum(['beginner', 'intermediate', 'advanced', 'elite'])
          .optional(),
        rxStandards: rxStandardsSchema.optional(),
        scalingOptions: z.array(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [wod] = await ctx.db
        .insert(crossfitWods)
        .values({
          name: input.name,
          wodType: input.wodType,
          description: input.description,
          movements: input.movements,
          timeCap: input.timeCap,
          rounds: input.rounds,
          intervalSeconds: input.intervalSeconds,
          isBenchmark: input.isBenchmark,
          isHeroWod: input.isHeroWod,
          difficultyLevel: input.difficultyLevel,
          rxStandards: input.rxStandards,
          scalingOptions: input.scalingOptions,
        })
        .returning();

      return wod;
    }),

  // Get benchmark WODs ("The Girls")
  getBenchmarks: publicProcedure.query(async ({ ctx }) => {
    const wods = await ctx.db.query.crossfitWods.findMany({
      where: eq(crossfitWods.isBenchmark, true),
      orderBy: [crossfitWods.name],
    });

    return wods;
  }),

  // Get Hero WODs
  getHeroWods: publicProcedure.query(async ({ ctx }) => {
    const wods = await ctx.db.query.crossfitWods.findMany({
      where: eq(crossfitWods.isHeroWod, true),
      orderBy: [crossfitWods.name],
    });

    return wods;
  }),

  // ============ WOD LOGS ============

  // Log a WOD performance
  logWod: protectedProcedure
    .input(
      z.object({
        wodId: z.string().uuid().optional(), // optional for custom WODs
        workoutId: z.string().uuid().optional(),

        // Results
        resultTimeSeconds: z.number().optional(),
        resultRounds: z.number().optional(),
        resultReps: z.number().optional(),
        resultLoad: z.record(z.number()).optional(),

        // Scaling
        wasRx: z.boolean().default(false),
        scalingNotes: z.string().optional(),

        notes: z.string().optional(),
        rawVoiceInput: z.string().optional(),
        voiceCommandId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create the log
      const [log] = await ctx.db
        .insert(wodLogs)
        .values({
          userId: ctx.user.id,
          wodId: input.wodId,
          workoutId: input.workoutId,
          resultTimeSeconds: input.resultTimeSeconds,
          resultRounds: input.resultRounds,
          resultReps: input.resultReps,
          resultLoad: input.resultLoad,
          wasRx: input.wasRx,
          scalingNotes: input.scalingNotes,
          notes: input.notes,
          rawVoiceInput: input.rawVoiceInput,
          voiceCommandId: input.voiceCommandId,
        })
        .returning();

      // Check if this is a new benchmark (PR)
      if (input.wodId) {
        const existingBenchmark = await ctx.db.query.wodBenchmarks.findFirst({
          where: and(
            eq(wodBenchmarks.userId, ctx.user.id),
            eq(wodBenchmarks.wodId, input.wodId)
          ),
        });

        let isNewPr = false;
        let improvementSeconds: number | undefined;

        if (!existingBenchmark) {
          // First time doing this WOD
          isNewPr = true;
        } else if (input.resultTimeSeconds && existingBenchmark.bestTimeSeconds) {
          // For timed WODs, lower is better
          if (input.resultTimeSeconds < existingBenchmark.bestTimeSeconds) {
            isNewPr = true;
            improvementSeconds =
              existingBenchmark.bestTimeSeconds - input.resultTimeSeconds;
          }
        } else if (input.resultRounds !== undefined && input.resultReps !== undefined) {
          // For AMRAPs, more rounds+reps is better
          const existingTotal =
            (existingBenchmark.bestRounds || 0) * 1000 +
            (existingBenchmark.bestReps || 0);
          const newTotal = input.resultRounds * 1000 + input.resultReps;
          if (newTotal > existingTotal) {
            isNewPr = true;
          }
        }

        if (isNewPr) {
          if (existingBenchmark) {
            // Update existing benchmark
            await ctx.db
              .update(wodBenchmarks)
              .set({
                wodLogId: log.id,
                bestTimeSeconds: input.resultTimeSeconds,
                bestRounds: input.resultRounds,
                bestReps: input.resultReps,
                previousBestTimeSeconds: existingBenchmark.bestTimeSeconds,
                improvementSeconds,
                achievedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(wodBenchmarks.id, existingBenchmark.id));
          } else {
            // Create new benchmark
            await ctx.db.insert(wodBenchmarks).values({
              userId: ctx.user.id,
              wodId: input.wodId,
              wodLogId: log.id,
              bestTimeSeconds: input.resultTimeSeconds,
              bestRounds: input.resultRounds,
              bestReps: input.resultReps,
              achievedAt: new Date(),
            });
          }
        }

        return { log, isNewPr, improvementSeconds };
      }

      return { log, isNewPr: false };
    }),

  // Get user's WOD logs
  getMyLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        wodId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(wodLogs.userId, ctx.user.id)];

      if (input.wodId) {
        conditions.push(eq(wodLogs.wodId, input.wodId));
      }

      const logs = await ctx.db.query.wodLogs.findMany({
        where: and(...conditions),
        with: {
          wod: true,
        },
        orderBy: [desc(wodLogs.loggedAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return logs;
    }),

  // Get a specific log
  getLog: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const log = await ctx.db.query.wodLogs.findFirst({
        where: and(
          eq(wodLogs.id, input.id),
          eq(wodLogs.userId, ctx.user.id)
        ),
        with: {
          wod: true,
        },
      });

      if (!log) {
        throw new Error('WOD log not found');
      }

      return log;
    }),

  // ============ BENCHMARKS ============

  // Get user's benchmarks (PRs)
  getMyBenchmarks: protectedProcedure.query(async ({ ctx }) => {
    const benchmarks = await ctx.db.query.wodBenchmarks.findMany({
      where: eq(wodBenchmarks.userId, ctx.user.id),
      with: {
        wod: true,
        wodLog: true,
      },
      orderBy: [desc(wodBenchmarks.achievedAt)],
    });

    return benchmarks;
  }),

  // Get benchmark for a specific WOD
  getBenchmark: protectedProcedure
    .input(z.object({ wodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const benchmark = await ctx.db.query.wodBenchmarks.findFirst({
        where: and(
          eq(wodBenchmarks.userId, ctx.user.id),
          eq(wodBenchmarks.wodId, input.wodId)
        ),
        with: {
          wod: true,
          wodLog: true,
        },
      });

      return benchmark;
    }),

  // Get WOD history with all attempts for a specific WOD
  getWodHistory: protectedProcedure
    .input(z.object({ wodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [wod, logs, benchmark] = await Promise.all([
        ctx.db.query.crossfitWods.findFirst({
          where: eq(crossfitWods.id, input.wodId),
        }),
        ctx.db.query.wodLogs.findMany({
          where: and(
            eq(wodLogs.userId, ctx.user.id),
            eq(wodLogs.wodId, input.wodId)
          ),
          orderBy: [desc(wodLogs.loggedAt)],
        }),
        ctx.db.query.wodBenchmarks.findFirst({
          where: and(
            eq(wodBenchmarks.userId, ctx.user.id),
            eq(wodBenchmarks.wodId, input.wodId)
          ),
        }),
      ]);

      return {
        wod,
        logs,
        benchmark,
        totalAttempts: logs.length,
      };
    }),

  // Get leaderboard for a WOD
  getLeaderboard: publicProcedure
    .input(
      z.object({
        wodId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get best times/scores for this WOD
      const benchmarks = await ctx.db.query.wodBenchmarks.findMany({
        where: eq(wodBenchmarks.wodId, input.wodId),
        with: {
          user: true,
        },
        orderBy: [wodBenchmarks.bestTimeSeconds], // Lower time = better
        limit: input.limit,
      });

      return benchmarks.map((b, index) => ({
        rank: index + 1,
        userId: b.userId,
        bestTimeSeconds: b.bestTimeSeconds,
        bestRounds: b.bestRounds,
        bestReps: b.bestReps,
        achievedAt: b.achievedAt,
      }));
    }),
});
