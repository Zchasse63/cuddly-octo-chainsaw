import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql, gte, lte, gt, or, isNull } from 'drizzle-orm';
import {
  users,
  coachClients,
  userProfiles,
  trainingPrograms,
  workouts,
  readinessScores,
  conversations,
  messages,
  programAdherence,
  injuries,
  userPreferences,
  scheduledSessions,
} from '../db/schema';
import {
  getCoachClients,
  isCoachOfClient,
  assignClientToCoach,
} from '../tools/coach/helpers';
import { cache } from '../lib/upstash';

// Cache TTL for AI analytics insights (1 hour)
const INSIGHTS_CACHE_TTL = 3600;

// Verify user is a coach
async function verifyCoachTier(ctx: any) {
  const profile = await ctx.db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, ctx.user.id),
  });

  if (profile?.tier !== 'coach') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Coach tier required',
    });
  }

  return profile;
}

export const coachDashboardRouter = router({
  // Get dashboard summary
  getDashboardSummary: protectedProcedure.query(async ({ ctx }) => {
    await verifyCoachTier(ctx);

    // Get client count
    const { clients, totalCount } = await getCoachClients(ctx.db, ctx.user.id, {
      status: 'active',
      limit: 1000,
    });

    // Get workouts this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const clientIds = clients.map(c => c.clientId);

    let workoutsThisWeek = 0;
    if (clientIds.length > 0) {
      // Validate UUIDs to prevent SQL injection
      const validatedClientIds = clientIds.filter(id =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      if (validatedClientIds.length > 0) {
        const workoutResults = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(workouts)
          .where(
            and(
              sql`${workouts.userId} = ANY(ARRAY[${sql.raw(validatedClientIds.map(id => `'${id}'::uuid`).join(','))}])`,
              gte(workouts.startedAt, oneWeekAgo),
              eq(workouts.status, 'completed')
            )
          );

        workoutsThisWeek = Number(workoutResults[0]?.count || 0);
      }
    }

    // Get recent activity (latest completed workouts)
    let recentActivity: Array<{ id: string; userId: string; name: string | null; completedAt: Date | null }> = [];
    if (clientIds.length > 0) {
      const validatedClientIds = clientIds.filter(id =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      if (validatedClientIds.length > 0) {
        recentActivity = await ctx.db
          .select({
            id: workouts.id,
            userId: workouts.userId,
            name: workouts.name,
            completedAt: workouts.completedAt,
          })
          .from(workouts)
          .where(
            and(
              sql`${workouts.userId} = ANY(ARRAY[${sql.raw(validatedClientIds.map(id => `'${id}'::uuid`).join(','))}])`,
              eq(workouts.status, 'completed')
            )
          )
          .orderBy(desc(workouts.completedAt))
          .limit(5);
      }
    }

    // Get client profiles for activity
    const activityUserIds = recentActivity.map(a => a.userId);
    let activityProfiles: Array<typeof userProfiles.$inferSelect> = [];
    if (activityUserIds.length > 0) {
      const validatedActivityIds = activityUserIds.filter(id =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      if (validatedActivityIds.length > 0) {
        activityProfiles = await ctx.db.query.userProfiles.findMany({
          where: sql`${userProfiles.userId} = ANY(ARRAY[${sql.raw(validatedActivityIds.map(id => `'${id}'::uuid`).join(','))}])`,
        });
      }
    }

    const profileMap = new Map(activityProfiles.map(p => [p.userId, p]));

    // Get upcoming sessions (next 3)
    const upcomingSessions = await ctx.db.query.scheduledSessions.findMany({
      where: and(
        eq(scheduledSessions.coachId, ctx.user.id),
        gte(scheduledSessions.scheduledAt, new Date()),
        eq(scheduledSessions.status, 'scheduled')
      ),
      orderBy: [sql`${scheduledSessions.scheduledAt} ASC`],
      limit: 3,
    });

    // Get client profiles for sessions
    const sessionClientIds = upcomingSessions.map(s => s.clientId);
    let sessionProfiles: Array<typeof userProfiles.$inferSelect> = [];
    if (sessionClientIds.length > 0) {
      const validatedSessionIds = sessionClientIds.filter(id =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      if (validatedSessionIds.length > 0) {
        sessionProfiles = await ctx.db.query.userProfiles.findMany({
          where: sql`${userProfiles.userId} = ANY(ARRAY[${sql.raw(validatedSessionIds.map(id => `'${id}'::uuid`).join(','))}])`,
        });
      }
    }

    const sessionProfileMap = new Map(sessionProfiles.map(p => [p.userId, p]));

    return {
      activeClients: totalCount,
      workoutsThisWeek,
      monthlyRevenue: 0,
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        clientName: profileMap.get(a.userId)?.name || 'Unknown',
        action: `Completed ${a.name || 'workout'}`,
        timestamp: a.completedAt,
      })),
      upcomingSessions: upcomingSessions.map(s => ({
        id: s.id,
        clientName: sessionProfileMap.get(s.clientId)?.name || 'Unknown',
        scheduledAt: s.scheduledAt,
        sessionType: s.sessionType,
        durationMinutes: s.durationMinutes,
      })),
    };
  }),

  // Get client list with filters
  getClientList: protectedProcedure
    .input(
      z.object({
        status: z.enum(['all', 'active', 'pending', 'inactive', 'terminated']).default('active'),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      const { clients } = await getCoachClients(ctx.db, ctx.user.id, {
        status: input.status === 'all' ? 'all' : input.status,
        limit: 1000, // Get all, filter in memory
      });

      // Apply search filter
      let filteredClients = clients;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filteredClients = clients.filter(c =>
          c.name.toLowerCase().includes(searchLower)
        );
      }

      // Apply pagination
      const paginatedClients = filteredClients.slice(
        input.offset,
        input.offset + input.limit
      );

      return {
        clients: paginatedClients,
        totalCount: filteredClients.length,
      };
    }),

  // Get client detail
  getClientDetail: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Verify relationship
      const hasAccess = await isCoachOfClient(ctx.db, ctx.user.id, input.clientId);
      if (!hasAccess) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Get client profile
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, input.clientId),
      });

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client profile not found',
        });
      }

      // Get active program
      const activeProgram = await ctx.db.query.trainingPrograms.findFirst({
        where: and(
          eq(trainingPrograms.userId, input.clientId),
          eq(trainingPrograms.status, 'active')
        ),
      });

      // Get recent workouts
      const recentWorkouts = await ctx.db.query.workouts.findMany({
        where: eq(workouts.userId, input.clientId),
        orderBy: [desc(workouts.startedAt)],
        limit: 10,
      });

      // Get latest readiness score
      const latestReadiness = await ctx.db.query.readinessScores.findFirst({
        where: eq(readinessScores.userId, input.clientId),
        orderBy: [desc(readinessScores.date)],
      });

      return {
        id: input.clientId,
        name: profile.name || 'Unknown',
        email: profile.userId,
        experienceLevel: profile.experienceLevel,
        goals: profile.goals,
        activeProgram,
        recentWorkouts,
        latestReadiness,
      };
    }),

  // Invite client
  inviteClient: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Check if user already exists
      let existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      let clientId: string;

      if (!existingUser) {
        // Create new user record (without auth credentials - they'll set password when accepting)
        const [newUser] = await ctx.db
          .insert(users)
          .values({
            email: input.email,
          })
          .returning();

        // Create profile for new user
        await ctx.db.insert(userProfiles).values({
          userId: newUser.id,
          name: input.name,
        });

        clientId = newUser.id;
      } else {
        clientId = existingUser.id;
      }

      // Check if relationship already exists
      const existingRelationship = await ctx.db.query.coachClients.findFirst({
        where: and(
          eq(coachClients.coachId, ctx.user.id),
          eq(coachClients.clientId, clientId)
        ),
      });

      if (existingRelationship) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Client relationship already exists',
        });
      }

      // Create coach-client relationship with pending status
      const [invitation] = await ctx.db
        .insert(coachClients)
        .values({
          coachId: ctx.user.id,
          clientId: clientId,
          status: 'pending',
          assignedBy: ctx.user.id,
          relationshipNotes: input.message,
        })
        .returning();

      return {
        invitation,
        message: 'Client invitation created successfully',
      };
    }),

  // Get program templates
  getProgramTemplates: protectedProcedure
    .input(
      z.object({
        programType: z.enum(['strength', 'running', 'hybrid', 'crossfit', 'custom']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      const whereConditions = input.programType
        ? and(
            eq(trainingPrograms.createdByCoachId, ctx.user.id),
            eq(trainingPrograms.isTemplate, true),
            eq(trainingPrograms.programType, input.programType)
          )
        : and(
            eq(trainingPrograms.createdByCoachId, ctx.user.id),
            eq(trainingPrograms.isTemplate, true)
          );

      const templates = await ctx.db.query.trainingPrograms.findMany({
        where: whereConditions,
        orderBy: [desc(trainingPrograms.createdAt)],
      });

      return templates;
    }),

  // Create program template
  createProgramTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        programType: z.enum(['strength', 'running', 'hybrid', 'crossfit', 'custom']),
        durationWeeks: z.number().min(1),
        daysPerWeek: z.number().min(1).max(7),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      const [template] = await ctx.db
        .insert(trainingPrograms)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          programType: input.programType,
          durationWeeks: input.durationWeeks,
          daysPerWeek: input.daysPerWeek,
          isTemplate: true,
          createdByCoachId: ctx.user.id,
          status: 'draft',
        })
        .returning();

      return template;
    }),

  // Get analytics summary
  getAnalyticsSummary: protectedProcedure.query(async ({ ctx }) => {
    await verifyCoachTier(ctx);

    const { clients } = await getCoachClients(ctx.db, ctx.user.id, {
      status: 'active',
      limit: 1000,
    });

    const clientIds = clients.map(c => c.clientId);

    // Get adherence data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let adherenceData: Array<{ userId: string; completionPercent: number }> = [];

    if (clientIds.length > 0) {
      const validatedClientIds = clientIds.filter(id =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      if (validatedClientIds.length > 0) {
        const adherenceRecords = await ctx.db
          .select({
            userId: programAdherence.userId,
            avgCompletion: sql<number>`AVG(${programAdherence.completionPercent})`,
          })
          .from(programAdherence)
          .where(
            and(
              sql`${programAdherence.userId} = ANY(ARRAY[${sql.raw(validatedClientIds.map(id => `'${id}'::uuid`).join(','))}])`,
              gte(programAdherence.scheduledDate, thirtyDaysAgo.toISOString().split('T')[0])
            )
          )
          .groupBy(programAdherence.userId);

        adherenceData = adherenceRecords.map(r => ({
          userId: r.userId,
          completionPercent: Number(r.avgCompletion || 0),
        }));
      }
    }

    // Calculate at-risk clients (adherence < 50%)
    const atRiskClients = adherenceData
      .filter(a => (a.completionPercent ?? 0) < 50)
      .map(a => {
        const client = clients.find(c => c.clientId === a.userId);
        return {
          clientId: a.userId,
          name: client?.name || 'Unknown',
          adherence: (a.completionPercent ?? 0),
        };
      });

    const avgAdherence = adherenceData.length > 0
      ? adherenceData.reduce((sum, a) => sum + (a.completionPercent ?? 0), 0) / adherenceData.length
      : 0;

    return {
      totalClients: clients.length,
      averageAdherence: Math.round(avgAdherence),
      atRiskClients,
    };
  }),

  // Get conversations
  getConversations: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      await verifyCoachTier(ctx);

      // Get all conversations for coach's clients
      const { clients } = await getCoachClients(ctx.db, ctx.user.id, {
        status: 'active',
        limit: 1000,
      });

      const clientIds = clients.map(c => c.clientId);

      if (clientIds.length === 0) {
        return [];
      }

      const validatedClientIds = clientIds.filter(id =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      if (validatedClientIds.length === 0) {
        return [];
      }

      const convos = await ctx.db.query.conversations.findMany({
        where: sql`${conversations.userId} = ANY(ARRAY[${sql.raw(validatedClientIds.map(id => `'${id}'::uuid`).join(','))}])`,
        orderBy: [desc(conversations.updatedAt)],
        limit: 50,
      });

      // Get latest message for each conversation
      const convoIds = convos.map(c => c.id);
      let latestMessages: Array<{ conversationId: string; content: string; createdAt: Date }> = [];
      if (convoIds.length > 0) {
        const validatedConvoIds = convoIds.filter(id =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );

        if (validatedConvoIds.length > 0) {
          latestMessages = await ctx.db
            .select({
              conversationId: messages.conversationId,
              content: messages.content,
              createdAt: messages.createdAt,
            })
            .from(messages)
            .where(sql`${messages.conversationId} = ANY(ARRAY[${sql.raw(validatedConvoIds.map(id => `'${id}'::uuid`).join(','))}])`)
            .orderBy(desc(messages.createdAt));
        }
      }

      const messageMap = new Map(latestMessages.map(m => [m.conversationId, m]));

      return convos.map(c => ({
        id: c.id,
        clientId: c.userId,
        clientName: clients.find(cl => cl.clientId === c.userId)?.name || 'Unknown',
        title: c.title,
        latestMessage: messageMap.get(c.id)?.content,
        latestMessageAt: messageMap.get(c.id)?.createdAt,
      }));
    }),

  // Send message
  sendMessage: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Verify relationship
      const hasAccess = await isCoachOfClient(ctx.db, ctx.user.id, input.clientId);
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No access to this client',
        });
      }

      // Find or create conversation
      let conversation = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.userId, input.clientId),
          eq(conversations.conversationType, 'general')
        ),
      });

      if (!conversation) {
        [conversation] = await ctx.db
          .insert(conversations)
          .values({
            userId: input.clientId,
            conversationType: 'general',
            title: 'Coach Messages',
          })
          .returning();
      }

      // Insert message
      const [message] = await ctx.db
        .insert(messages)
        .values({
          conversationId: conversation.id,
          userId: ctx.user.id,
          role: 'user',
          content: input.content,
        })
        .returning();

      // Update conversation timestamp
      await ctx.db
        .update(conversations)
        .set({
          updatedAt: new Date(),
          messageCount: sql`${conversations.messageCount} + 1`,
        })
        .where(eq(conversations.id, conversation.id));

      return message;
    }),

  // Get messages for a conversation
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Verify coach has access to this conversation's client
      const conversation = await ctx.db.query.conversations.findFirst({
        where: eq(conversations.id, input.conversationId),
      });

      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      const hasAccess = await isCoachOfClient(ctx.db, ctx.user.id, conversation.userId);
      if (!hasAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this conversation' });
      }

      // Fetch messages with pagination
      const messageList = await ctx.db.query.messages.findMany({
        where: eq(messages.conversationId, input.conversationId),
        orderBy: [sql`${messages.createdAt} ASC`],
        limit: input.limit,
        offset: input.offset,
      });

      return messageList.map(m => ({
        id: m.id,
        content: m.content,
        senderId: m.userId || 'assistant',
        senderRole: m.role,
        createdAt: m.createdAt,
      }));
    }),

  // Get weekly activity data
  getWeeklyActivity: protectedProcedure.query(async ({ ctx }) => {
    await verifyCoachTier(ctx);

    const { clients } = await getCoachClients(ctx.db, ctx.user.id, { status: 'active', limit: 1000 });
    const clientIds = clients.map(c => c.clientId).filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    if (clientIds.length === 0) {
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return { day: date.toLocaleDateString('en-US', { weekday: 'short' }), count: 0 };
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const workoutCounts = await ctx.db
      .select({
        date: sql<string>`DATE(${workouts.startedAt})`,
        count: sql<number>`count(*)`,
      })
      .from(workouts)
      .where(
        and(
          sql`${workouts.userId} = ANY(ARRAY[${sql.raw(clientIds.map(id => `'${id}'::uuid`).join(','))}])`,
          gte(workouts.startedAt, sevenDaysAgo),
          eq(workouts.status, 'completed')
        )
      )
      .groupBy(sql`DATE(${workouts.startedAt})`);

    const countMap = new Map(workoutCounts.map(w => [w.date, Number(w.count)]));

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: countMap.get(dateStr) || 0,
      };
    });
  }),

  // Get top programs by active clients
  getTopPrograms: protectedProcedure.query(async ({ ctx }) => {
    await verifyCoachTier(ctx);

    // Get all programs created by coach with their stats in a single optimized query
    const programStats = await ctx.db
      .select({
        programId: trainingPrograms.id,
        programName: trainingPrograms.name,
        activeClients: sql<number>`count(DISTINCT CASE WHEN ${trainingPrograms.status} = 'active' THEN ${trainingPrograms.userId} END)`,
      })
      .from(trainingPrograms)
      .where(eq(trainingPrograms.createdByCoachId, ctx.user.id))
      .groupBy(trainingPrograms.id, trainingPrograms.name);

    // Fetch adherence data for all programs in a single query
    const adherenceStats = await ctx.db
      .select({
        programId: programAdherence.programId,
        avgAdherence: sql<number>`AVG(${programAdherence.completionPercent})`,
      })
      .from(programAdherence)
      .where(
        sql`${programAdherence.programId} IN (SELECT ${trainingPrograms.id} FROM ${trainingPrograms} WHERE ${trainingPrograms.createdByCoachId} = ${ctx.user.id})`
      )
      .groupBy(programAdherence.programId);

    // Build adherence lookup map
    const adherenceMap = new Map(
      adherenceStats.map((stat) => [stat.programId, Number(stat.avgAdherence || 0)])
    );

    // Combine results
    const results = programStats.map((stat) => ({
      name: stat.programName,
      activeClients: Number(stat.activeClients || 0),
      averageAdherence: Math.round(adherenceMap.get(stat.programId) || 0),
    }));

    return results
      .sort((a, b) => b.activeClients - a.activeClients)
      .slice(0, 5);
  }),

  // Get client retention data
  getClientRetention: protectedProcedure.query(async ({ ctx }) => {
    await verifyCoachTier(ctx);

    const retention = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });

      const activeClients = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(coachClients)
        .where(
          and(
            eq(coachClients.coachId, ctx.user.id),
            lte(coachClients.assignedAt, new Date(monthEnd)),
            or(
              isNull(coachClients.terminatedAt),
              gt(coachClients.terminatedAt, new Date(monthEnd))
            )
          )
        );

      // Count clients who terminated during this month
      const churned = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(coachClients)
        .where(
          and(
            eq(coachClients.coachId, ctx.user.id),
            eq(coachClients.status, 'terminated'),
            gte(coachClients.terminatedAt, new Date(monthStart)),
            lte(coachClients.terminatedAt, new Date(monthEnd))
          )
        );

      retention.push({
        month: monthName,
        retained: Number(activeClients[0]?.count || 0),
        churned: Number(churned[0]?.count || 0),
      });
    }

    return retention;
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        bio: z.string().optional(),
        specialties: z.array(z.string()).optional(),
        hourlyRate: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.bio !== undefined) updateData.bio = input.bio;
      if (input.specialties !== undefined) updateData.coachingSpecialties = input.specialties;

      const [updated] = await ctx.db
        .update(userProfiles)
        .set(updateData)
        .where(eq(userProfiles.userId, ctx.user.id))
        .returning();

      return updated;
    }),

  // Import clients from CSV
  importClients: protectedProcedure
    .input(
      z.object({
        csvData: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Parse CSV (simplified - assumes "name,email" format)
      const lines = input.csvData.split('\n').slice(1); // Skip header
      const errors: Array<{ row: number; reason: string; email?: string }> = [];
      let successCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [name, email] = line.split(',').map(s => s.trim());

        if (!name || !email) {
          errors.push({
            row: i + 2,
            reason: 'Missing name or email',
          });
          continue;
        }

        if (!email.includes('@')) {
          errors.push({
            row: i + 2,
            reason: 'Invalid email format',
            email,
          });
          continue;
        }

        try {
          // Check if user already exists
          let existingUser = await ctx.db.query.users.findFirst({
            where: eq(users.email, email),
          });

          let clientId: string;

          if (!existingUser) {
            // Create new user record
            const [newUser] = await ctx.db
              .insert(users)
              .values({
                email: email,
              })
              .returning();

            // Create profile for new user
            await ctx.db.insert(userProfiles).values({
              userId: newUser.id,
              name: name,
            });

            clientId = newUser.id;
          } else {
            clientId = existingUser.id;
          }

          // Check if relationship already exists
          const existingRelationship = await ctx.db.query.coachClients.findFirst({
            where: and(
              eq(coachClients.coachId, ctx.user.id),
              eq(coachClients.clientId, clientId)
            ),
          });

          if (existingRelationship) {
            errors.push({
              row: i + 2,
              reason: 'Client relationship already exists',
              email,
            });
            continue;
          }

          // Create coach-client relationship
          await ctx.db.insert(coachClients).values({
            coachId: ctx.user.id,
            clientId: clientId,
            status: 'pending',
            assignedBy: ctx.user.id,
          });

          successCount++;
        } catch (error) {
          errors.push({
            row: i + 2,
            reason: error instanceof Error ? error.message : 'Unknown error',
            email,
          });
        }
      }

      return {
        successCount,
        errors,
        message: `Successfully created ${successCount} client invitation${successCount !== 1 ? 's' : ''}`,
      };
    }),

  // AI-1: Generate AI suggested response for messaging
  generateAISuggestedResponse: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        conversationContext: z.array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Verify relationship
      const hasAccess = await isCoachOfClient(ctx.db, ctx.user.id, input.clientId);
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No access to this client',
        });
      }

      // Get client profile
      const clientProfile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, input.clientId),
      });

      if (!clientProfile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client profile not found',
        });
      }

      // Import AI service
      const { generateMessageSuggestion } = await import('../services/webDashboardAI');

      const result = await generateMessageSuggestion(ctx.db, ctx.user.id, {
        conversationContext: input.conversationContext,
        clientProfile: {
          name: clientProfile.name || 'Client',
          experienceLevel: clientProfile.experienceLevel || undefined,
          goals: clientProfile.goals || undefined,
          injuries: clientProfile.injuries || undefined,
        },
      });

      return result;
    }),

  // AI-2: Generate program with AI
  generateProgramWithAI: protectedProcedure
    .input(
      z.object({
        clientGoals: z.array(z.string()),
        fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
        equipment: z.array(z.string()),
        timeConstraints: z.object({
          sessionsPerWeek: z.number().min(1).max(7),
          minutesPerSession: z.number().min(15).max(180),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Import AI service
      const { generateProgram } = await import('../services/webDashboardAI');

      const result = await generateProgram(ctx.db, ctx.user.id, {
        goals: input.clientGoals,
        fitnessLevel: input.fitnessLevel,
        equipment: input.equipment,
        timeConstraints: input.timeConstraints,
      });

      return result;
    }),

  // AI-3: Get AI analytics insights with caching
  getAIAnalyticsInsights: protectedProcedure
    .input(
      z.object({
        forceRefresh: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      const cacheKey = `coach:insights:${ctx.user.id}`;
      if (!input.forceRefresh) {
        const cached = await cache.get<{ insights: unknown[]; cachedAt: string }>(cacheKey);
        if (cached) {
          return { ...cached, cachedAt: new Date(cached.cachedAt) };
        }
      }

      // Get client stats for analysis
      const { clients } = await getCoachClients(ctx.db, ctx.user.id, {
        status: 'active',
        limit: 1000,
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get adherence and workout data for each client
      const clientStats = await Promise.all(
        clients.map(async (c) => {
          // Get adherence
          const adherence = await ctx.db.query.programAdherence.findMany({
            where: and(
              eq(programAdherence.userId, c.clientId),
              gte(programAdherence.scheduledDate, thirtyDaysAgo.toISOString().split('T')[0])
            ),
          });

          const avgAdherence = adherence.length > 0
            ? adherence.reduce((sum, a) => sum + (a.completionPercent ?? 0), 0) / adherence.length
            : 0;

          // Get last workout
          const lastWorkout = await ctx.db.query.workouts.findFirst({
            where: eq(workouts.userId, c.clientId),
            orderBy: [desc(workouts.completedAt)],
          });

          // Get active program
          const activeProgram = await ctx.db.query.trainingPrograms.findFirst({
            where: and(
              eq(trainingPrograms.userId, c.clientId),
              eq(trainingPrograms.status, 'active')
            ),
          });

          return {
            clientId: c.clientId,
            name: c.name,
            adherence: Math.round(avgAdherence),
            lastWorkout: lastWorkout?.completedAt || undefined,
            programType: activeProgram?.programType || undefined,
          };
        })
      );

      // Import AI service
      const { analyzeCoachAnalytics } = await import('../services/webDashboardAI');

      const result = await analyzeCoachAnalytics(ctx.db, ctx.user.id, clientStats);

      // Cache the result in Redis with 1-hour TTL
      await cache.set(cacheKey, result, INSIGHTS_CACHE_TTL);

      return result;
    }),

  // AI-4: Get AI health summary for client
  getAIHealthSummary: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Verify relationship
      const hasAccess = await isCoachOfClient(ctx.db, ctx.user.id, input.clientId);
      if (!hasAccess) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Get readiness score
      const readiness = await ctx.db.query.readinessScores.findFirst({
        where: eq(readinessScores.userId, input.clientId),
        orderBy: [desc(readinessScores.date)],
      });

      // Get injuries
      const injuriesData = await ctx.db.query.injuries.findMany({
        where: and(
          eq(injuries.userId, input.clientId),
          eq(injuries.status, 'active')
        ),
      });

      // Import AI service
      const { analyzeClientHealth } = await import('../services/webDashboardAI');

      const result = await analyzeClientHealth(ctx.db, ctx.user.id, input.clientId, {
        readinessScore: readiness ? {
          sleep: readiness.sleepQuality,
          stress: readiness.motivation,
          soreness: readiness.energyLevel,
          energy: readiness.energyLevel,
        } : undefined,
        injuries: injuriesData.map(i => ({
          type: i.name,
          bodyPart: i.bodyPart,
          severity: i.severity,
        })),
      });

      return result;
    }),

  // Get notification preferences
  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    await verifyCoachTier(ctx);

    const preferences = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, ctx.user.id),
    });

    // Return defaults if no preferences exist
    if (!preferences) {
      return {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        weeklyDigest: true,
      };
    }

    return preferences;
  }),

  // Update notification preferences
  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.boolean(),
        pushNotifications: z.boolean(),
        smsNotifications: z.boolean(),
        weeklyDigest: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Check if preferences exist
      const existing = await ctx.db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, ctx.user.id),
      });

      if (existing) {
        // Update existing
        const [updated] = await ctx.db
          .update(userPreferences)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, ctx.user.id))
          .returning();

        return updated;
      } else {
        // Insert new
        const [created] = await ctx.db
          .insert(userPreferences)
          .values({
            userId: ctx.user.id,
            ...input,
          })
          .returning();

        return created;
      }
    }),

  // Get upcoming sessions
  getUpcomingSessions: protectedProcedure.query(async ({ ctx }) => {
    await verifyCoachTier(ctx);

    const now = new Date();
    const sessions = await ctx.db.query.scheduledSessions.findMany({
      where: and(
        eq(scheduledSessions.coachId, ctx.user.id),
        gte(scheduledSessions.scheduledAt, now),
        eq(scheduledSessions.status, 'scheduled')
      ),
      orderBy: [sql`${scheduledSessions.scheduledAt} ASC`],
      limit: 5,
    });

    // Get client profiles
    const clientIds = sessions.map(s => s.clientId);
    const profiles = await ctx.db.query.userProfiles.findMany({
      where: sql`${userProfiles.userId} = ANY(ARRAY[${sql.raw(clientIds.map(id => `'${id}'::uuid`).join(','))}])`,
    });

    const profileMap = new Map(profiles.map(p => [p.userId, p]));

    return sessions.map(s => ({
      id: s.id,
      clientId: s.clientId,
      clientName: profileMap.get(s.clientId)?.name || 'Unknown',
      scheduledAt: s.scheduledAt,
      durationMinutes: s.durationMinutes,
      sessionType: s.sessionType,
    }));
  }),

  // Schedule a session
  scheduleSession: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
        durationMinutes: z.number().min(15).max(180),
        sessionType: z.enum(['check-in', 'workout-review', 'planning', 'other']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Verify client relationship
      const hasAccess = await isCoachOfClient(ctx.db, ctx.user.id, input.clientId);
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or no access',
        });
      }

      const [session] = await ctx.db
        .insert(scheduledSessions)
        .values({
          coachId: ctx.user.id,
          clientId: input.clientId,
          scheduledAt: new Date(input.scheduledAt),
          durationMinutes: input.durationMinutes,
          sessionType: input.sessionType,
          notes: input.notes,
          status: 'scheduled',
        })
        .returning();

      return session;
    }),

  // Cancel a session
  cancelSession: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachTier(ctx);

      // Verify session belongs to coach
      const session = await ctx.db.query.scheduledSessions.findFirst({
        where: eq(scheduledSessions.id, input.sessionId),
      });

      if (!session || session.coachId !== ctx.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      const [updated] = await ctx.db
        .update(scheduledSessions)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(scheduledSessions.id, input.sessionId))
        .returning();

      return updated;
    }),
});
