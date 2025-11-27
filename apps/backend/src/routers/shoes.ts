import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { runningShoes, runningActivityShoes, DEFAULT_REPLACEMENT_METERS, METERS_PER_MILE } from '../db/schema/shoes';
import { eq, and, desc, sql } from 'drizzle-orm';

export const shoesRouter = router({
  // Create a new shoe
  create: protectedProcedure
    .input(
      z.object({
        brand: z.string().min(1),
        model: z.string().min(1),
        nickname: z.string().optional(),
        color: z.string().optional(),
        size: z.string().optional(),
        purchaseDate: z.date().optional(),
        purchasePrice: z.number().optional(),
        purchaseLocation: z.string().optional(),
        initialMileage: z.number().default(0),
        replacementThresholdMiles: z.number().default(400),
        isDefault: z.boolean().default(false),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { replacementThresholdMiles, initialMileage, ...rest } = input;

      // If setting as default, unset any existing default
      if (input.isDefault) {
        await ctx.db
          .update(runningShoes)
          .set({ isDefault: false })
          .where(
            and(eq(runningShoes.userId, ctx.user.id), eq(runningShoes.isDefault, true))
          );
      }

      const [shoe] = await ctx.db
        .insert(runningShoes)
        .values({
          userId: ctx.user.id,
          ...rest,
          initialMileage: initialMileage * METERS_PER_MILE, // Convert to meters
          replacementThresholdMeters: replacementThresholdMiles * METERS_PER_MILE,
        })
        .returning();

      return shoe;
    }),

  // Get all user's shoes
  getAll: protectedProcedure
    .input(
      z.object({
        includeRetired: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(runningShoes.userId, ctx.user.id)];

      if (!input?.includeRetired) {
        conditions.push(eq(runningShoes.isActive, true));
      }

      const shoes = await ctx.db.query.runningShoes.findMany({
        where: and(...conditions),
        orderBy: [desc(runningShoes.isDefault), desc(runningShoes.createdAt)],
      });

      // Calculate stats for each shoe
      return shoes.map((shoe) => {
        const totalMileageMeters = (shoe.initialMileage || 0) + (shoe.totalMileageMeters || 0);
        const totalMileageMiles = totalMileageMeters / METERS_PER_MILE;
        const thresholdMiles = (shoe.replacementThresholdMeters || DEFAULT_REPLACEMENT_METERS) / METERS_PER_MILE;
        const percentUsed = (totalMileageMiles / thresholdMiles) * 100;
        const milesRemaining = Math.max(0, thresholdMiles - totalMileageMiles);
        const needsReplacement = percentUsed >= 100;
        const warningThreshold = percentUsed >= 80;

        return {
          ...shoe,
          stats: {
            totalMileageMiles: Math.round(totalMileageMiles * 10) / 10,
            thresholdMiles: Math.round(thresholdMiles),
            percentUsed: Math.round(percentUsed),
            milesRemaining: Math.round(milesRemaining * 10) / 10,
            needsReplacement,
            warningThreshold,
          },
        };
      });
    }),

  // Get single shoe by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const shoe = await ctx.db.query.runningShoes.findFirst({
        where: and(
          eq(runningShoes.id, input.id),
          eq(runningShoes.userId, ctx.user.id)
        ),
      });

      if (!shoe) {
        throw new Error('Shoe not found');
      }

      // Get activity history for this shoe
      const activities = await ctx.db.execute(sql`
        SELECT
          ra.id,
          ra.started_at,
          ra.distance_meters,
          ra.duration_seconds,
          ra.name
        FROM running_activity_shoes ras
        JOIN running_activities ra ON ra.id = ras.activity_id
        WHERE ras.shoe_id = ${input.id}
        ORDER BY ra.started_at DESC
        LIMIT 10
      `);

      const totalMileageMeters = (shoe.initialMileage || 0) + (shoe.totalMileageMeters || 0);
      const totalMileageMiles = totalMileageMeters / METERS_PER_MILE;
      const thresholdMiles = (shoe.replacementThresholdMeters || DEFAULT_REPLACEMENT_METERS) / METERS_PER_MILE;

      return {
        ...shoe,
        stats: {
          totalMileageMiles: Math.round(totalMileageMiles * 10) / 10,
          thresholdMiles: Math.round(thresholdMiles),
          percentUsed: Math.round((totalMileageMiles / thresholdMiles) * 100),
          milesRemaining: Math.round(Math.max(0, thresholdMiles - totalMileageMiles) * 10) / 10,
        },
        recentActivities: activities.rows,
      };
    }),

  // Update shoe
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        brand: z.string().optional(),
        model: z.string().optional(),
        nickname: z.string().optional(),
        color: z.string().optional(),
        size: z.string().optional(),
        purchaseDate: z.date().optional(),
        purchasePrice: z.number().optional(),
        replacementThresholdMiles: z.number().optional(),
        isDefault: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, replacementThresholdMiles, ...updateData } = input;

      // Verify ownership
      const existing = await ctx.db.query.runningShoes.findFirst({
        where: and(eq(runningShoes.id, id), eq(runningShoes.userId, ctx.user.id)),
      });

      if (!existing) {
        throw new Error('Shoe not found');
      }

      // If setting as default, unset any existing default
      if (input.isDefault) {
        await ctx.db
          .update(runningShoes)
          .set({ isDefault: false })
          .where(
            and(eq(runningShoes.userId, ctx.user.id), eq(runningShoes.isDefault, true))
          );
      }

      const [updated] = await ctx.db
        .update(runningShoes)
        .set({
          ...updateData,
          ...(replacementThresholdMiles && {
            replacementThresholdMeters: replacementThresholdMiles * METERS_PER_MILE,
          }),
          updatedAt: new Date(),
        })
        .where(eq(runningShoes.id, id))
        .returning();

      return updated;
    }),

  // Retire shoe
  retire: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(runningShoes)
        .set({
          isActive: false,
          isDefault: false,
          retiredAt: new Date(),
          retiredReason: input.reason,
          updatedAt: new Date(),
        })
        .where(
          and(eq(runningShoes.id, input.id), eq(runningShoes.userId, ctx.user.id))
        )
        .returning();

      return updated;
    }),

  // Link shoe to activity
  linkToActivity: protectedProcedure
    .input(
      z.object({
        shoeId: z.string().uuid(),
        activityId: z.string().uuid(),
        distanceMeters: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify shoe ownership
      const shoe = await ctx.db.query.runningShoes.findFirst({
        where: and(
          eq(runningShoes.id, input.shoeId),
          eq(runningShoes.userId, ctx.user.id)
        ),
      });

      if (!shoe) {
        throw new Error('Shoe not found');
      }

      // Create link
      const [link] = await ctx.db
        .insert(runningActivityShoes)
        .values({
          shoeId: input.shoeId,
          activityId: input.activityId,
          distanceMeters: input.distanceMeters,
        })
        .returning();

      // Update shoe mileage if distance provided
      if (input.distanceMeters) {
        await ctx.db
          .update(runningShoes)
          .set({
            totalMileageMeters: sql`${runningShoes.totalMileageMeters} + ${input.distanceMeters}`,
            totalRuns: sql`${runningShoes.totalRuns} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(runningShoes.id, input.shoeId));
      }

      return link;
    }),

  // Get default shoe for user
  getDefault: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.runningShoes.findFirst({
      where: and(
        eq(runningShoes.userId, ctx.user.id),
        eq(runningShoes.isDefault, true),
        eq(runningShoes.isActive, true)
      ),
    });
  }),

  // Get shoes needing replacement
  getNeedingReplacement: protectedProcedure.query(async ({ ctx }) => {
    const shoes = await ctx.db.query.runningShoes.findMany({
      where: and(
        eq(runningShoes.userId, ctx.user.id),
        eq(runningShoes.isActive, true)
      ),
    });

    return shoes
      .filter((shoe) => {
        const totalMileageMeters = (shoe.initialMileage || 0) + (shoe.totalMileageMeters || 0);
        const threshold = shoe.replacementThresholdMeters || DEFAULT_REPLACEMENT_METERS;
        return totalMileageMeters >= threshold * 0.8; // 80% or more
      })
      .map((shoe) => {
        const totalMileageMeters = (shoe.initialMileage || 0) + (shoe.totalMileageMeters || 0);
        const threshold = shoe.replacementThresholdMeters || DEFAULT_REPLACEMENT_METERS;
        return {
          ...shoe,
          percentUsed: Math.round((totalMileageMeters / threshold) * 100),
          needsReplacement: totalMileageMeters >= threshold,
        };
      });
  }),

  // Delete shoe (soft delete - just retire)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Actually delete (or you could soft delete)
      await ctx.db
        .delete(runningShoes)
        .where(
          and(eq(runningShoes.id, input.id), eq(runningShoes.userId, ctx.user.id))
        );

      return { success: true };
    }),
});
