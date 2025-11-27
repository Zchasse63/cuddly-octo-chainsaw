import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { exerciseSubstitutions, exerciseBodyPartStress, exercises } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createExerciseMatcher } from '../services/exerciseMatcher';

export const substitutionsRouter = router({
  // Get substitutions for an exercise
  forExercise: publicProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        reason: z.enum(['injury', 'equipment', 'difficulty']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(exerciseSubstitutions.originalExerciseId, input.exerciseId)];

      if (input.reason) {
        conditions.push(eq(exerciseSubstitutions.reason, input.reason));
      }

      const subs = await ctx.db.query.exerciseSubstitutions.findMany({
        where: and(...conditions),
        with: {
          substituteExercise: true,
        },
      });

      return subs.map((s) => ({
        id: s.id,
        substituteExercise: s.substituteExercise,
        reason: s.reason,
        affectedBodyPart: s.affectedBodyPart,
        similarityScore: s.similarityScore,
        notes: s.notes,
      }));
    }),

  // Get smart substitutions (using search + body part stress)
  smart: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        injuredBodyParts: z.array(z.string()).optional(),
        availableEquipment: z.array(z.string()).optional(),
        limit: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const matcher = createExerciseMatcher(ctx.db);

      const results = await matcher.findSubstitutes(input.exerciseId, {
        avoidBodyParts: input.injuredBodyParts,
        sameEquipment: input.availableEquipment !== undefined,
        topK: input.limit,
      });

      return results;
    }),

  // Create a substitution relationship (admin/user suggestion)
  create: protectedProcedure
    .input(
      z.object({
        originalExerciseId: z.string().uuid(),
        substituteExerciseId: z.string().uuid(),
        reason: z.enum(['injury', 'equipment', 'difficulty']),
        affectedBodyPart: z.string().optional(),
        similarityScore: z.number().min(0).max(1).default(0.8),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify both exercises exist
      const [original, substitute] = await Promise.all([
        ctx.db.query.exercises.findFirst({
          where: eq(exercises.id, input.originalExerciseId),
        }),
        ctx.db.query.exercises.findFirst({
          where: eq(exercises.id, input.substituteExerciseId),
        }),
      ]);

      if (!original || !substitute) {
        throw new Error('One or both exercises not found');
      }

      const [sub] = await ctx.db
        .insert(exerciseSubstitutions)
        .values({
          originalExerciseId: input.originalExerciseId,
          substituteExerciseId: input.substituteExerciseId,
          reason: input.reason,
          affectedBodyPart: input.affectedBodyPart,
          similarityScore: input.similarityScore,
          notes: input.notes,
        })
        .returning();

      return sub;
    }),

  // Get body part stress levels for an exercise
  getBodyPartStress: publicProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const stress = await ctx.db.query.exerciseBodyPartStress.findMany({
        where: eq(exerciseBodyPartStress.exerciseId, input.exerciseId),
      });

      return stress;
    }),

  // Set body part stress for an exercise (admin)
  setBodyPartStress: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        bodyPart: z.string(),
        stressLevel: z.enum(['low', 'medium', 'high']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upsert stress level
      const existing = await ctx.db.query.exerciseBodyPartStress.findFirst({
        where: and(
          eq(exerciseBodyPartStress.exerciseId, input.exerciseId),
          eq(exerciseBodyPartStress.bodyPart, input.bodyPart)
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(exerciseBodyPartStress)
          .set({ stressLevel: input.stressLevel })
          .where(
            and(
              eq(exerciseBodyPartStress.exerciseId, input.exerciseId),
              eq(exerciseBodyPartStress.bodyPart, input.bodyPart)
            )
          )
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(exerciseBodyPartStress)
        .values({
          exerciseId: input.exerciseId,
          bodyPart: input.bodyPart,
          stressLevel: input.stressLevel,
        })
        .returning();

      return created;
    }),

  // Find exercises safe for injured body parts
  safeExercises: protectedProcedure
    .input(
      z.object({
        injuredBodyParts: z.array(z.string()),
        muscleGroup: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get exercises that don't have high stress on injured parts
      const allExercises = await ctx.db.query.exercises.findMany({
        where: input.muscleGroup
          ? eq(exercises.primaryMuscle, input.muscleGroup as any)
          : undefined,
        limit: 100,
      });

      const safeExercises = [];

      for (const exercise of allExercises) {
        const stressLevels = await ctx.db.query.exerciseBodyPartStress.findMany({
          where: eq(exerciseBodyPartStress.exerciseId, exercise.id),
        });

        const hasHighStressOnInjury = stressLevels.some(
          (s) => input.injuredBodyParts.includes(s.bodyPart) && s.stressLevel === 'high'
        );

        if (!hasHighStressOnInjury) {
          safeExercises.push({
            ...exercise,
            stressLevels: stressLevels.reduce(
              (acc, s) => ({ ...acc, [s.bodyPart]: s.stressLevel }),
              {} as Record<string, string>
            ),
          });
        }

        if (safeExercises.length >= input.limit) break;
      }

      return safeExercises;
    }),
});
