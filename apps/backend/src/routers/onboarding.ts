import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { userOnboarding } from '../db/schema';
import { eq } from 'drizzle-orm';

const ONBOARDING_STEPS = [
  'welcome',
  'experience_level',
  'goals',
  'training_frequency',
  'equipment',
  'injuries',
  'voice_tutorial',
  'complete',
] as const;

export const onboardingRouter = router({
  // Get current onboarding status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const onboarding = await ctx.db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, ctx.user.id),
    });

    if (!onboarding) {
      // Initialize onboarding for new user
      const [newOnboarding] = await ctx.db
        .insert(userOnboarding)
        .values({
          userId: ctx.user.id,
          currentStep: 'welcome',
          stepsCompleted: [],
        })
        .returning();

      return {
        ...newOnboarding,
        totalSteps: ONBOARDING_STEPS.length,
        progress: 0,
      };
    }

    const completedCount = onboarding.stepsCompleted?.length || 0;
    return {
      ...onboarding,
      totalSteps: ONBOARDING_STEPS.length,
      progress: Math.round((completedCount / ONBOARDING_STEPS.length) * 100),
    };
  }),

  // Complete a step
  completeStep: protectedProcedure
    .input(
      z.object({
        step: z.enum(ONBOARDING_STEPS),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const onboarding = await ctx.db.query.userOnboarding.findFirst({
        where: eq(userOnboarding.userId, ctx.user.id),
      });

      if (!onboarding) {
        throw new Error('Onboarding not initialized');
      }

      const completed = onboarding.stepsCompleted || [];
      if (!completed.includes(input.step)) {
        completed.push(input.step);
      }

      // Determine next step
      const currentIndex = ONBOARDING_STEPS.indexOf(input.step);
      const nextStep =
        currentIndex < ONBOARDING_STEPS.length - 1
          ? ONBOARDING_STEPS[currentIndex + 1]
          : 'complete';

      const isComplete = nextStep === 'complete' || completed.length >= ONBOARDING_STEPS.length - 1;

      const [updated] = await ctx.db
        .update(userOnboarding)
        .set({
          currentStep: nextStep,
          stepsCompleted: completed,
          isComplete,
          completedAt: isComplete ? new Date() : null,
        })
        .where(eq(userOnboarding.userId, ctx.user.id))
        .returning();

      return {
        ...updated,
        totalSteps: ONBOARDING_STEPS.length,
        progress: Math.round((completed.length / ONBOARDING_STEPS.length) * 100),
      };
    }),

  // Skip onboarding (for returning users)
  skip: protectedProcedure.mutation(async ({ ctx }) => {
    const [updated] = await ctx.db
      .update(userOnboarding)
      .set({
        isComplete: true,
        completedAt: new Date(),
        currentStep: 'complete',
      })
      .where(eq(userOnboarding.userId, ctx.user.id))
      .returning();

    return updated;
  }),

  // Reset onboarding (for testing or if user wants to redo)
  reset: protectedProcedure.mutation(async ({ ctx }) => {
    const [updated] = await ctx.db
      .update(userOnboarding)
      .set({
        currentStep: 'welcome',
        stepsCompleted: [],
        isComplete: false,
        completedAt: null,
      })
      .where(eq(userOnboarding.userId, ctx.user.id))
      .returning();

    return updated;
  }),
});
