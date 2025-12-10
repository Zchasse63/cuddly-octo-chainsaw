/**
 * Coach Messaging Tools
 *
 * Tools for coaches to communicate with clients.
 * All tools verify coach-client relationships before accessing data.
 */

import { z } from 'zod';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import { conversations, messages } from '../../db/schema';
import { isCoachOfClient, getCoachClients } from './helpers';

// Tool 50: Get Client Conversations
export const getClientConversations = createTool({
  name: 'getClientConversations',
  description: 'Get list of conversations with clients',
  parameters: z.object({
    clientId: z.string().uuid().optional().describe('Filter by specific client'),
    limit: z.number().min(1).max(50).default(20),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    if (params.clientId) {
      // Verify coach has access to this specific client
      const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
      if (!hasAccess) {
        return toolError('Not authorized to view this client', 'UNAUTHORIZED');
      }

      const convos = await ctx.db.query.conversations.findMany({
        where: and(
          eq(conversations.userId, params.clientId),
          eq(conversations.conversationType, 'coach')
        ),
        orderBy: [desc(conversations.updatedAt)],
        limit: params.limit,
      });

      return toolSuccess({
        conversations: convos.map(c => ({
          id: c.id,
          clientId: c.userId,
          title: c.title,
          messageCount: c.messageCount,
          lastMessageAt: c.updatedAt,
          isArchived: c.isArchived,
        })),
        totalCount: convos.length,
      });
    }

    // Get all coach's clients and their conversations
    const { clients } = await getCoachClients(ctx.db, ctx.userId, { status: 'active' });

    if (clients.length === 0) {
      return toolSuccess({
        conversations: [],
        totalCount: 0,
      });
    }

    const clientIds = clients.map(c => c.clientId);
    const convos = await ctx.db.query.conversations.findMany({
      where: and(
        inArray(conversations.userId, clientIds),
        eq(conversations.conversationType, 'coach')
      ),
      orderBy: [desc(conversations.updatedAt)],
      limit: params.limit,
    });

    return toolSuccess({
      conversations: convos.map(c => ({
        id: c.id,
        clientId: c.userId,
        title: c.title,
        messageCount: c.messageCount,
        lastMessageAt: c.updatedAt,
        isArchived: c.isArchived,
      })),
      totalCount: convos.length,
    });
  },
});

// Tool 51: Get Conversation Messages
export const getConversationMessages = createTool({
  name: 'getConversationMessages',
  description: 'Get messages from a specific conversation',
  parameters: z.object({
    conversationId: z.string().uuid().describe('Conversation ID'),
    limit: z.number().min(1).max(100).default(50),
    before: z.string().datetime().optional().describe('Get messages before this timestamp'),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this conversation
    const conversation = await ctx.db.query.conversations.findFirst({
      where: eq(conversations.id, params.conversationId),
    });

    if (!conversation) {
      return toolError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, conversation.userId);
    if (!hasAccess) {
      return toolError('Not authorized to view this conversation', 'UNAUTHORIZED');
    }

    const msgs = await ctx.db.query.messages.findMany({
      where: eq(messages.conversationId, params.conversationId),
      orderBy: [desc(messages.createdAt)],
      limit: params.limit,
    });

    return toolSuccess({
      conversationId: params.conversationId,
      messages: msgs.reverse().map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  },
});

// Tool 52: Send Message to Client
export const sendMessageToClient = createTool({
  name: 'sendMessageToClient',
  description: 'Send a message to a client',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
    message: z.string().min(1).max(5000).describe('Message content'),
    conversationId: z.string().uuid().optional().describe('Existing conversation ID'),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to message this client', 'UNAUTHORIZED');
    }

    const { conversationId: existingConvoId, clientId, message } = params;
    let conversationId = existingConvoId;

    // Create new conversation if needed
    if (!conversationId) {
      const [newConvo] = await ctx.db.insert(conversations).values({
        userId: clientId,
        conversationType: 'coach',
        title: 'Coach Message',
        messageCount: 0,
      }).returning();
      conversationId = newConvo.id;
    }

    // Insert message
    const [newMessage] = await ctx.db.insert(messages).values({
      conversationId,
      userId: ctx.userId,
      role: 'assistant', // Coach messages appear as assistant
      content: message,
    }).returning();

    // Update conversation
    await ctx.db.update(conversations)
      .set({
        messageCount: sql`${conversations.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    return toolSuccess({
      success: true,
      messageId: newMessage.id,
      conversationId,
    });
  },
});

// Export all messaging tools
export const messagingTools = {
  getClientConversations,
  getConversationMessages,
  sendMessageToClient,
};

