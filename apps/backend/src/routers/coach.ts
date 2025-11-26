import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { observable } from '@trpc/server/observable';
import {
  classifyMessage,
  generateCoachResponse,
  streamCoachResponse,
  getOffTopicResponse,
  rankExerciseSwaps,
} from '../services/aiCoach';
import { userProfiles, exercises, personalRecords } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const coachRouter = router({
  // Classify a message
  classify: protectedProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      return classifyMessage(input.message);
    }),

  // Chat with AI coach
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(['user', 'assistant']),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First classify the message
      const classification = await classifyMessage(input.message);

      // Handle off-topic
      if (classification.category === 'off_topic') {
        return {
          response: getOffTopicResponse(),
          classification,
        };
      }

      // Get user context
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });

      // Get recent PRs
      const recentPrs = await ctx.db.query.personalRecords.findMany({
        where: eq(personalRecords.userId, ctx.user.id),
        orderBy: [desc(personalRecords.achievedAt)],
        limit: 5,
      });

      const prStrings = await Promise.all(
        recentPrs.map(async (pr) => {
          const exercise = await ctx.db.query.exercises.findFirst({
            where: eq(exercises.id, pr.exerciseId),
          });
          return `${exercise?.name || 'Unknown'}: ${pr.weight}${pr.weightUnit} x ${pr.reps}`;
        })
      );

      // Generate response
      const response = await generateCoachResponse(
        input.message,
        {
          name: profile?.name || undefined,
          experienceLevel: profile?.experienceLevel || undefined,
          goals: profile?.goals || undefined,
          injuries: profile?.injuries || undefined,
          recentPrs: prStrings,
        },
        undefined // RAG context would go here
      );

      return {
        response,
        classification,
      };
    }),

  // Streaming chat (for real-time UI)
  streamChat: protectedProcedure
    .input(z.object({ message: z.string().min(1) }))
    .subscription(async function* ({ ctx, input }) {
      // Get user context
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });

      // Stream the response
      for await (const chunk of streamCoachResponse(
        input.message,
        {
          name: profile?.name || undefined,
          experienceLevel: profile?.experienceLevel || undefined,
          goals: profile?.goals || undefined,
          injuries: profile?.injuries || undefined,
        },
        undefined
      )) {
        yield chunk;
      }
    }),

  // Get exercise swap recommendations
  getSwaps: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get the original exercise
      const original = await ctx.db.query.exercises.findFirst({
        where: eq(exercises.id, input.exerciseId),
      });

      if (!original) {
        throw new Error('Exercise not found');
      }

      // Get user profile for context
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });

      // Get candidate exercises (same muscle group)
      const candidates = await ctx.db.query.exercises.findMany({
        where: (ex, { and, eq, ne }) =>
          and(
            eq(ex.primaryMuscle, original.primaryMuscle),
            ne(ex.id, original.id)
          ),
        limit: 20,
      });

      // Rank using AI
      const ranked = await rankExerciseSwaps({
        exerciseName: original.name,
        experienceLevel: profile?.experienceLevel || undefined,
        goals: profile?.goals || undefined,
        equipment: profile?.preferredEquipment || undefined,
        injuries: profile?.injuries || undefined,
        candidates: candidates.map((c) => ({
          name: c.name,
          equipment: c.equipment || [],
        })),
      });

      return {
        original,
        substitutes: ranked.substitutes,
      };
    }),

  // Answer a specific fitness question
  ask: protectedProcedure
    .input(z.object({ question: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });

      const response = await generateCoachResponse(
        input.question,
        {
          name: profile?.name || undefined,
          experienceLevel: profile?.experienceLevel || undefined,
          goals: profile?.goals || undefined,
          injuries: profile?.injuries || undefined,
        },
        undefined
      );

      return { response };
    }),
});
