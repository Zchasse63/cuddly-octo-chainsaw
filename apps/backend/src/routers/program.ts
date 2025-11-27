import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { generateProgram, generateQuickWorkout } from '../services/programGenerator';
import { userProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';

export const programRouter = router({
  // Generate a full 12-week program
  generate: protectedProcedure
    .input(
      z.object({
        goals: z.array(z.string()),
        frequency: z.number().min(2).max(7),
        duration: z.number().min(20).max(120),
        equipment: z.array(z.string()),
        injuries: z.string().optional(),
        favoriteExercises: z.array(z.string()).optional(),
        exercisesToAvoid: z.array(z.string()).optional(),
        preferredRepRanges: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user profile for experience level
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });

      const experienceLevel = profile?.experienceLevel || 'beginner';

      // Generate the program
      const program = await generateProgram({
        experienceLevel,
        goals: input.goals,
        frequency: input.frequency,
        duration: input.duration,
        equipment: input.equipment,
        injuries: input.injuries,
        favoriteExercises: input.favoriteExercises,
        exercisesToAvoid: input.exercisesToAvoid,
        preferredRepRanges: input.preferredRepRanges,
      });

      return program;
    }),

  // Generate a quick single workout
  quickWorkout: protectedProcedure
    .input(
      z.object({
        type: z.enum(['push', 'pull', 'legs', 'upper', 'lower', 'full_body']),
        duration: z.number().min(15).max(90),
        equipment: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user profile
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });

      const workout = await generateQuickWorkout({
        type: input.type,
        duration: input.duration,
        equipment: input.equipment || profile?.preferredEquipment || ['barbell', 'dumbbell'],
        experience: profile?.experienceLevel || 'beginner',
      });

      return workout;
    }),

  // List saved programs (placeholder - would need programs table)
  list: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Implement programs table and retrieval
    return [];
  }),

  // Get program by ID (placeholder)
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // TODO: Implement
      return null;
    }),
});
