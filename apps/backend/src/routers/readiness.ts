import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { readinessScores } from '../db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export const readinessRouter = router({
  // Submit daily readiness score
  submit: protectedProcedure
    .input(
      z.object({
        // Simple mode (1-5 emoji scale, normalized to 1-10)
        overallScore: z.number().min(1).max(10).optional(),

        // Detailed mode (each 1-10)
        sleepQuality: z.number().min(1).max(10).optional(),
        energyLevel: z.number().min(1).max(10).optional(),
        motivation: z.number().min(1).max(10).optional(),
        soreness: z.number().min(1).max(10).optional(), // Inverted: 10 = no soreness
        stress: z.number().min(1).max(10).optional(), // Inverted: 10 = no stress

        // Optional notes
        notes: z.string().optional(),

        // Wearable data (if available)
        hrvScore: z.number().optional(),
        restingHr: z.number().optional(),
        sleepHours: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate overall score if detailed scores provided
      let overall = input.overallScore;
      if (!overall && input.sleepQuality) {
        const scores = [
          input.sleepQuality,
          input.energyLevel,
          input.motivation,
          input.soreness,
          input.stress,
        ].filter(Boolean) as number[];

        overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }

      // Check for existing score today
      const existing = await ctx.db.query.readinessScores.findFirst({
        where: and(
          eq(readinessScores.userId, ctx.user.id),
          gte(readinessScores.date, today)
        ),
      });

      if (existing) {
        // Update existing
        const [updated] = await ctx.db
          .update(readinessScores)
          .set({
            overallScore: overall,
            sleepQuality: input.sleepQuality,
            energyLevel: input.energyLevel,
            motivation: input.motivation,
            soreness: input.soreness,
            stress: input.stress,
            notes: input.notes,
            hrvScore: input.hrvScore,
            restingHr: input.restingHr,
            sleepHours: input.sleepHours,
            updatedAt: new Date(),
          })
          .where(eq(readinessScores.id, existing.id))
          .returning();

        return updated;
      }

      // Create new
      const [score] = await ctx.db
        .insert(readinessScores)
        .values({
          userId: ctx.user.id,
          date: today,
          overallScore: overall,
          sleepQuality: input.sleepQuality,
          energyLevel: input.energyLevel,
          motivation: input.motivation,
          soreness: input.soreness,
          stress: input.stress,
          notes: input.notes,
          hrvScore: input.hrvScore,
          restingHr: input.restingHr,
          sleepHours: input.sleepHours,
        })
        .returning();

      return score;
    }),

  // Get today's readiness
  today: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return ctx.db.query.readinessScores.findFirst({
      where: and(
        eq(readinessScores.userId, ctx.user.id),
        gte(readinessScores.date, today)
      ),
    });
  }),

  // Get readiness history
  history: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(7),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const days = input?.days || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      return ctx.db.query.readinessScores.findMany({
        where: and(
          eq(readinessScores.userId, ctx.user.id),
          gte(readinessScores.date, startDate)
        ),
        orderBy: [desc(readinessScores.date)],
      });
    }),

  // Get 7-day trend
  trend: protectedProcedure.query(async ({ ctx }) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const scores = await ctx.db.query.readinessScores.findMany({
      where: and(
        eq(readinessScores.userId, ctx.user.id),
        gte(readinessScores.date, startDate)
      ),
      orderBy: [desc(readinessScores.date)],
    });

    if (scores.length < 2) {
      return { trend: 'stable', change: 0, average: scores[0]?.overallScore || 0 };
    }

    // Calculate trend
    const recentAvg =
      scores.slice(0, 3).reduce((a, b) => a + (b.overallScore || 0), 0) /
      Math.min(3, scores.length);
    const olderAvg =
      scores.slice(-3).reduce((a, b) => a + (b.overallScore || 0), 0) /
      Math.min(3, scores.length);

    const change = recentAvg - olderAvg;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';

    if (change > 1) trend = 'improving';
    else if (change < -1) trend = 'declining';

    const average =
      scores.reduce((a, b) => a + (b.overallScore || 0), 0) / scores.length;

    return { trend, change: Math.round(change * 10) / 10, average: Math.round(average * 10) / 10 };
  }),

  // Get readiness by date
  byDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const date = new Date(input.date);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      return ctx.db.query.readinessScores.findFirst({
        where: and(
          eq(readinessScores.userId, ctx.user.id),
          gte(readinessScores.date, date),
          lte(readinessScores.date, nextDay)
        ),
      });
    }),
});
