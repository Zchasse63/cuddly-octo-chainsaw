import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { conversations, messages } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const conversationsRouter = router({
  // List user's conversations
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        type: z.enum(['coach', 'workout', 'general']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(conversations.userId, ctx.user.id)];

      if (input.type) {
        conditions.push(eq(conversations.conversationType, input.type));
      }

      const results = await ctx.db.query.conversations.findMany({
        where: and(...conditions),
        orderBy: [desc(conversations.updatedAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return results;
    }),

  // Get single conversation with messages
  getById: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        messageLimit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
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
        orderBy: [desc(messages.createdAt)],
        limit: input.messageLimit,
      });

      return {
        ...conversation,
        messages: msgs.reverse(), // Return in chronological order
      };
    }),

  // Create new conversation
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(['coach', 'workout', 'general']),
        title: z.string().optional(),
        contextId: z.string().uuid().optional(), // workout_id, program_id, etc.
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [conversation] = await ctx.db
        .insert(conversations)
        .values({
          userId: ctx.user.id,
          conversationType: input.type,
          title: input.title,
          contextType: input.type === 'workout' ? 'workout' : undefined,
          contextId: input.contextId,
        })
        .returning();

      return conversation;
    }),

  // Add message to conversation
  addMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns conversation
      const conversation = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.userId, ctx.user.id)
        ),
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Add message
      const [message] = await ctx.db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          metadata: input.metadata,
        })
        .returning();

      // Update conversation's timestamp and message count
      await ctx.db
        .update(conversations)
        .set({
          updatedAt: new Date(),
          messageCount: (conversation.messageCount || 0) + 1,
        })
        .where(eq(conversations.id, input.conversationId));

      return message;
    }),

  // Update conversation title
  update: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(conversations)
        .set({
          title: input.title,
          updatedAt: new Date(),
        })
        .where(
          and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id))
        )
        .returning();

      if (!updated) {
        throw new Error('Conversation not found');
      }

      return updated;
    }),

  // Archive conversation
  archive: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(conversations)
        .set({ isArchived: true })
        .where(
          and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id))
        )
        .returning();

      if (!updated) {
        throw new Error('Conversation not found');
      }

      return updated;
    }),

  // Delete conversation and all messages
  delete: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Messages will be cascade deleted
      const deleted = await ctx.db
        .delete(conversations)
        .where(
          and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id))
        )
        .returning();

      if (deleted.length === 0) {
        throw new Error('Conversation not found');
      }

      return { success: true };
    }),

  // Get recent messages across all conversations (for context)
  getRecentContext: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get user's recent conversations
      const recentConversations = await ctx.db.query.conversations.findMany({
        where: and(
          eq(conversations.userId, ctx.user.id),
          eq(conversations.isArchived, false)
        ),
        orderBy: [desc(conversations.updatedAt)],
        limit: 5,
      });

      // Get recent messages from those conversations
      const allMessages = [];
      for (const conv of recentConversations) {
        const msgs = await ctx.db.query.messages.findMany({
          where: eq(messages.conversationId, conv.id),
          orderBy: [desc(messages.createdAt)],
          limit: Math.ceil(input.limit / recentConversations.length),
        });
        allMessages.push(...msgs.map((m) => ({ ...m, conversationType: conv.conversationType })));
      }

      // Sort by date and take top N
      return allMessages
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, input.limit);
    }),
});
