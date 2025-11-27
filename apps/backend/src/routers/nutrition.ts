import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { nutritionSummaries, nutritionGoals, bodyMeasurements, terraConnections } from '../db/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

export const nutritionRouter = router({
  // ==================== Nutrition Summaries (from health sources) ====================

  // Get nutrition summaries
  getSummaries: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.nutritionSummaries.findMany({
        where: and(
          eq(nutritionSummaries.userId, ctx.user.id),
          gte(nutritionSummaries.date, input.startDate),
          lte(nutritionSummaries.date, input.endDate)
        ),
        orderBy: [desc(nutritionSummaries.date)],
      });
    }),

  // Get today's nutrition
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];

    return ctx.db.query.nutritionSummaries.findFirst({
      where: and(
        eq(nutritionSummaries.userId, ctx.user.id),
        eq(nutritionSummaries.date, today)
      ),
    });
  }),

  // Sync nutrition from external source (called by webhooks or mobile app)
  syncFromSource: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        source: z.string(),
        calories: z.number().optional(),
        protein: z.number().optional(),
        carbohydrates: z.number().optional(),
        fat: z.number().optional(),
        fiber: z.number().optional(),
        sugar: z.number().optional(),
        sodium: z.number().optional(),
        waterMl: z.number().optional(),
        rawData: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.nutritionSummaries.findFirst({
        where: and(
          eq(nutritionSummaries.userId, ctx.user.id),
          eq(nutritionSummaries.date, input.date),
          eq(nutritionSummaries.source, input.source)
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(nutritionSummaries)
          .set({
            ...input,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(nutritionSummaries.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(nutritionSummaries)
        .values({
          userId: ctx.user.id,
          ...input,
          lastSyncedAt: new Date(),
        })
        .returning();
      return created;
    }),

  // ==================== Nutrition Goals ====================

  // Get active nutrition goals
  getGoals: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.nutritionGoals.findFirst({
      where: and(
        eq(nutritionGoals.userId, ctx.user.id),
        eq(nutritionGoals.isActive, true)
      ),
    });
  }),

  // Set nutrition goals
  setGoals: protectedProcedure
    .input(
      z.object({
        goalType: z.enum(['maintenance', 'cut', 'bulk', 'recomp']),
        targetCalories: z.number().optional(),
        targetProtein: z.number().optional(),
        targetCarbohydrates: z.number().optional(),
        targetFat: z.number().optional(),
        targetFiber: z.number().optional(),
        targetWaterMl: z.number().optional(),
        calculationMethod: z.string().optional(),
        tdeeEstimate: z.number().optional(),
        activityMultiplier: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Deactivate existing goals
      await ctx.db
        .update(nutritionGoals)
        .set({ isActive: false, endDate: new Date().toISOString().split('T')[0] })
        .where(and(
          eq(nutritionGoals.userId, ctx.user.id),
          eq(nutritionGoals.isActive, true)
        ));

      // Create new goals
      const [goals] = await ctx.db
        .insert(nutritionGoals)
        .values({
          userId: ctx.user.id,
          ...input,
          isActive: true,
          startDate: new Date().toISOString().split('T')[0],
        })
        .returning();

      return goals;
    }),

  // Calculate TDEE based on user data
  calculateTDEE: protectedProcedure
    .input(
      z.object({
        weightKg: z.number(),
        heightCm: z.number(),
        age: z.number(),
        sex: z.enum(['male', 'female']),
        activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
      })
    )
    .query(({ input }) => {
      // Mifflin-St Jeor equation
      let bmr: number;
      if (input.sex === 'male') {
        bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + 5;
      } else {
        bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age - 161;
      }

      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
      };

      const tdee = Math.round(bmr * activityMultipliers[input.activityLevel]);

      // Macro recommendations
      const proteinGrams = Math.round(input.weightKg * 2); // 2g per kg
      const fatGrams = Math.round((tdee * 0.25) / 9); // 25% of calories
      const carbGrams = Math.round((tdee - proteinGrams * 4 - fatGrams * 9) / 4);

      return {
        bmr: Math.round(bmr),
        tdee,
        macros: {
          protein: proteinGrams,
          carbohydrates: carbGrams,
          fat: fatGrams,
        },
        forCut: {
          calories: tdee - 500,
          protein: proteinGrams,
          carbohydrates: Math.round((tdee - 500 - proteinGrams * 4 - fatGrams * 9) / 4),
          fat: fatGrams,
        },
        forBulk: {
          calories: tdee + 300,
          protein: proteinGrams,
          carbohydrates: Math.round((tdee + 300 - proteinGrams * 4 - fatGrams * 9) / 4),
          fat: fatGrams,
        },
      };
    }),

  // ==================== Body Measurements ====================

  // Get body measurements history
  getMeasurements: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(30),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(bodyMeasurements.userId, ctx.user.id)];

      if (input.startDate) {
        conditions.push(gte(bodyMeasurements.date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(bodyMeasurements.date, input.endDate));
      }

      return ctx.db.query.bodyMeasurements.findMany({
        where: and(...conditions),
        orderBy: [desc(bodyMeasurements.date)],
        limit: input.limit,
      });
    }),

  // Get latest body measurements
  getLatestMeasurements: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.bodyMeasurements.findFirst({
      where: eq(bodyMeasurements.userId, ctx.user.id),
      orderBy: [desc(bodyMeasurements.date)],
    });
  }),

  // Sync body measurements from source
  syncMeasurements: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        source: z.string(),
        weightKg: z.number().optional(),
        bodyFatPercent: z.number().optional(),
        muscleMassKg: z.number().optional(),
        boneMassKg: z.number().optional(),
        waterPercent: z.number().optional(),
        visceralFat: z.number().optional(),
        metabolicAge: z.number().optional(),
        bmr: z.number().optional(),
        waistCm: z.number().optional(),
        hipsCm: z.number().optional(),
        chestCm: z.number().optional(),
        armCm: z.number().optional(),
        thighCm: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [measurement] = await ctx.db
        .insert(bodyMeasurements)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .returning();

      return measurement;
    }),

  // ==================== Terra Connections ====================

  // Get Terra connections
  getTerraConnections: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.terraConnections.findMany({
      where: eq(terraConnections.userId, ctx.user.id),
    });
  }),

  // Add Terra connection
  addTerraConnection: protectedProcedure
    .input(
      z.object({
        terraUserId: z.string(),
        provider: z.string(),
        scopes: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [connection] = await ctx.db
        .insert(terraConnections)
        .values({
          userId: ctx.user.id,
          ...input,
          isActive: true,
        })
        .returning();

      return connection;
    }),

  // Update Terra connection status
  updateTerraConnection: protectedProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
        isActive: z.boolean().optional(),
        syncStatus: z.string().optional(),
        lastError: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { connectionId, ...data } = input;

      const [updated] = await ctx.db
        .update(terraConnections)
        .set({
          ...data,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(terraConnections.id, connectionId),
          eq(terraConnections.userId, ctx.user.id)
        ))
        .returning();

      return updated;
    }),

  // Disconnect Terra provider
  disconnectTerra: protectedProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(terraConnections)
        .where(and(
          eq(terraConnections.id, input.connectionId),
          eq(terraConnections.userId, ctx.user.id)
        ));

      return { success: true };
    }),
});
