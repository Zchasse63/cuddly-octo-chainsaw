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
import { createRagCoach } from '../services/aiCoachRag';
import { userProfiles, exercises, personalRecords, conversations, messages } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

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

  // ============ RAG-ENHANCED ENDPOINTS ============

  // RAG-enhanced chat with knowledge retrieval
  ragChat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        conversationId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ragCoach = createRagCoach(ctx.db);

      // Get or create conversation
      const conversationId =
        input.conversationId ||
        (await ragCoach.getOrCreateConversation(ctx.user.id, 'general'));

      // Get conversation history
      const history = await ctx.db.query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: [desc(messages.createdAt)],
        limit: 10,
      });

      // Get user profile
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });

      // Get recent PRs
      const recentPrs = await ctx.db.query.personalRecords.findMany({
        where: eq(personalRecords.userId, ctx.user.id),
        orderBy: [desc(personalRecords.achievedAt)],
        limit: 5,
        with: { exercise: true },
      });

      // Build context
      const context = {
        userId: ctx.user.id,
        name: profile?.name || undefined,
        experienceLevel: profile?.experienceLevel || undefined,
        goals: profile?.goals || undefined,
        injuries: profile?.injuries ? [profile.injuries] : undefined,
        recentPrs: recentPrs.map((pr) => ({
          exercise: pr.exercise?.name || 'Unknown',
          weight: pr.weight,
          reps: pr.reps,
        })),
        conversationHistory: history.reverse().map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      };

      // Generate RAG-enhanced response
      const result = await ragCoach.generateResponse(input.message, context);

      // Save messages to conversation
      await ragCoach.saveMessage(conversationId, 'user', input.message, {
        userId: ctx.user.id,
      });
      await ragCoach.saveMessage(conversationId, 'assistant', result.response, {
        userId: ctx.user.id,
        sources: result.sources.map((s) => s.id),
        cues: result.cues.map((c) => c.id),
      });

      return {
        response: result.response,
        conversationId,
        sources: result.sources,
        cues: result.cues,
      };
    }),

  // Get form tips for an exercise
  getFormTips: protectedProcedure
    .input(z.object({ exerciseName: z.string() }))
    .query(async ({ ctx, input }) => {
      const ragCoach = createRagCoach(ctx.db);
      return ragCoach.getFormTips(input.exerciseName);
    }),

  // Answer a topic-specific question using knowledge base
  askWithKnowledge: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1),
        category: z
          .enum(['strength', 'running', 'mobility', 'injury', 'nutrition', 'recovery'])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ragCoach = createRagCoach(ctx.db);
      return ragCoach.answerTopicQuestion(input.question, input.category);
    }),

  // Get personalized exercise recommendations
  getExerciseRecommendations: protectedProcedure
    .input(
      z.object({
        muscleGroup: z.string().optional(),
        equipment: z.array(z.string()).optional(),
        avoidExercises: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ragCoach = createRagCoach(ctx.db);

      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });

      const recentPrs = await ctx.db.query.personalRecords.findMany({
        where: eq(personalRecords.userId, ctx.user.id),
        orderBy: [desc(personalRecords.achievedAt)],
        limit: 3,
        with: { exercise: true },
      });

      const context = {
        userId: ctx.user.id,
        name: profile?.name || undefined,
        experienceLevel: profile?.experienceLevel || undefined,
        goals: profile?.goals || undefined,
        injuries: profile?.injuries ? [profile.injuries] : undefined,
        recentPrs: recentPrs.map((pr) => ({
          exercise: pr.exercise?.name || 'Unknown',
          weight: pr.weight,
          reps: pr.reps,
        })),
      };

      return ragCoach.getExerciseRecommendations(context, input);
    }),

  // Get conversation history
  getConversations: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const convos = await ctx.db.query.conversations.findMany({
        where: eq(conversations.userId, ctx.user.id),
        orderBy: [desc(conversations.updatedAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return convos;
    }),

  // Get messages for a conversation
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify conversation belongs to user
      const conversation = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.userId, ctx.user.id)
        ),
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const msgs = await ctx.db.query.messages.findMany({
        where: eq(messages.conversationId, input.conversationId),
        orderBy: [messages.createdAt],
        limit: input.limit,
      });

      return msgs;
    }),

  // Start a new conversation
  startConversation: protectedProcedure
    .input(
      z.object({
        contextType: z
          .enum(['general', 'workout', 'program', 'injury'])
          .default('general'),
        contextId: z.string().uuid().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [conversation] = await ctx.db
        .insert(conversations)
        .values({
          userId: ctx.user.id,
          contextType: input.contextType,
          contextId: input.contextId,
          title: input.title,
          isActive: true,
        })
        .returning();

      return conversation;
    }),

  // End a conversation
  endConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(conversations)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),
});
