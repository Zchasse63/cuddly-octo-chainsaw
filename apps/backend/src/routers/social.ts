import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  friendships, activityFeed, activityLikes, activityComments,
  challenges, challengeParticipants, sharedWorkouts, notifications
} from '../db/schema';
import { eq, and, or, desc, ne, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const socialRouter = router({
  // ==================== Friends ====================

  // Send friend request
  sendFriendRequest: protectedProcedure
    .input(z.object({ friendId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.friendId === ctx.user.id) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Check if friendship already exists
      const existing = await ctx.db.query.friendships.findFirst({
        where: or(
          and(
            eq(friendships.userId, ctx.user.id),
            eq(friendships.friendId, input.friendId)
          ),
          and(
            eq(friendships.userId, input.friendId),
            eq(friendships.friendId, ctx.user.id)
          )
        ),
      });

      if (existing) {
        throw new Error('Friendship already exists');
      }

      // Create friendship (both directions)
      await ctx.db.insert(friendships).values([
        {
          userId: ctx.user.id,
          friendId: input.friendId,
          status: 'pending',
          initiatedBy: ctx.user.id,
        },
        {
          userId: input.friendId,
          friendId: ctx.user.id,
          status: 'pending',
          initiatedBy: ctx.user.id,
        },
      ]);

      // Create notification
      await ctx.db.insert(notifications).values({
        userId: input.friendId,
        type: 'friend_request',
        title: 'New Friend Request',
        body: 'Someone wants to be your friend!',
        actorId: ctx.user.id,
        referenceType: 'friendship',
      });

      return { success: true };
    }),

  // Accept friend request
  acceptFriendRequest: protectedProcedure
    .input(z.object({ friendId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(friendships)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(
          or(
            and(
              eq(friendships.userId, ctx.user.id),
              eq(friendships.friendId, input.friendId)
            ),
            and(
              eq(friendships.userId, input.friendId),
              eq(friendships.friendId, ctx.user.id)
            )
          )
        );

      return { success: true };
    }),

  // Get friends list
  getFriends: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'accepted', 'blocked']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(friendships.userId, ctx.user.id)];

      if (input.status) {
        conditions.push(eq(friendships.status, input.status));
      } else {
        conditions.push(eq(friendships.status, 'accepted'));
      }

      return ctx.db.query.friendships.findMany({
        where: and(...conditions),
        with: {
          friend: {
            with: {
              profile: true,
            },
          },
        },
      });
    }),

  // Get pending friend requests
  getPendingRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.friendships.findMany({
      where: and(
        eq(friendships.userId, ctx.user.id),
        eq(friendships.status, 'pending'),
        ne(friendships.initiatedBy, ctx.user.id)
      ),
      with: {
        initiator: {
          with: {
            profile: true,
          },
        },
      },
    });
  }),

  // Remove friend
  removeFriend: protectedProcedure
    .input(z.object({ friendId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(friendships).where(
        or(
          and(
            eq(friendships.userId, ctx.user.id),
            eq(friendships.friendId, input.friendId)
          ),
          and(
            eq(friendships.userId, input.friendId),
            eq(friendships.friendId, ctx.user.id)
          )
        )
      );

      return { success: true };
    }),

  // ==================== Activity Feed ====================

  // Get activity feed
  getFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        type: z.enum(['all', 'friends', 'own']).default('friends'),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.type === 'own') {
        return ctx.db.query.activityFeed.findMany({
          where: eq(activityFeed.userId, ctx.user.id),
          orderBy: [desc(activityFeed.createdAt)],
          limit: input.limit,
          offset: input.offset,
          with: {
            user: { with: { profile: true } },
            likes: true,
            comments: { limit: 3, orderBy: [desc(activityComments.createdAt)] },
          },
        });
      }

      // Get friends' activities
      const friendIds = await ctx.db.query.friendships.findMany({
        where: and(
          eq(friendships.userId, ctx.user.id),
          eq(friendships.status, 'accepted')
        ),
        columns: { friendId: true },
      });

      const friendIdList = friendIds.map((f) => f.friendId);

      if (input.type === 'friends') {
        friendIdList.push(ctx.user.id); // Include own activities
      }

      return ctx.db.query.activityFeed.findMany({
        where: sql`${activityFeed.userId} = ANY(${friendIdList})`,
        orderBy: [desc(activityFeed.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          user: { with: { profile: true } },
          likes: true,
          comments: { limit: 3, orderBy: [desc(activityComments.createdAt)] },
        },
      });
    }),

  // Like activity
  likeActivity: protectedProcedure
    .input(z.object({ activityId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.activityLikes.findFirst({
        where: and(
          eq(activityLikes.activityId, input.activityId),
          eq(activityLikes.userId, ctx.user.id)
        ),
      });

      if (existing) {
        // Unlike
        await ctx.db.delete(activityLikes).where(eq(activityLikes.id, existing.id));
        await ctx.db
          .update(activityFeed)
          .set({ likesCount: sql`${activityFeed.likesCount} - 1` })
          .where(eq(activityFeed.id, input.activityId));
        return { liked: false };
      }

      // Like
      await ctx.db.insert(activityLikes).values({
        activityId: input.activityId,
        userId: ctx.user.id,
      });
      await ctx.db
        .update(activityFeed)
        .set({ likesCount: sql`${activityFeed.likesCount} + 1` })
        .where(eq(activityFeed.id, input.activityId));

      return { liked: true };
    }),

  // Comment on activity
  commentOnActivity: protectedProcedure
    .input(
      z.object({
        activityId: z.string().uuid(),
        content: z.string().min(1).max(500),
        parentCommentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [comment] = await ctx.db
        .insert(activityComments)
        .values({
          activityId: input.activityId,
          userId: ctx.user.id,
          content: input.content,
          parentCommentId: input.parentCommentId,
        })
        .returning();

      await ctx.db
        .update(activityFeed)
        .set({ commentsCount: sql`${activityFeed.commentsCount} + 1` })
        .where(eq(activityFeed.id, input.activityId));

      return comment;
    }),

  // ==================== Challenges ====================

  // Create challenge
  createChallenge: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        challengeType: z.enum(['workout_count', 'total_volume', 'total_distance', 'streak', 'specific_exercise']),
        targetValue: z.number(),
        targetUnit: z.string().optional(),
        exerciseId: z.string().uuid().optional(),
        startDate: z.date(),
        endDate: z.date(),
        visibility: z.enum(['public', 'friends', 'invite_only']).default('friends'),
        maxParticipants: z.number().optional(),
        prize: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [challenge] = await ctx.db
        .insert(challenges)
        .values({
          creatorId: ctx.user.id,
          ...input,
        })
        .returning();

      // Auto-join creator
      await ctx.db.insert(challengeParticipants).values({
        challengeId: challenge.id,
        userId: ctx.user.id,
      });

      return challenge;
    }),

  // Get challenges
  getChallenges: protectedProcedure
    .input(
      z.object({
        status: z.enum(['upcoming', 'active', 'completed']).optional(),
        type: z.enum(['created', 'joined', 'available']).default('joined'),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.type === 'created') {
        const conditions = [eq(challenges.creatorId, ctx.user.id)];
        if (input.status) conditions.push(eq(challenges.status, input.status));

        return ctx.db.query.challenges.findMany({
          where: and(...conditions),
          orderBy: [desc(challenges.startDate)],
          with: { participants: true },
        });
      }

      if (input.type === 'joined') {
        const participations = await ctx.db.query.challengeParticipants.findMany({
          where: eq(challengeParticipants.userId, ctx.user.id),
          with: {
            challenge: {
              with: { participants: true },
            },
          },
        });
        return participations.map((p) => p.challenge);
      }

      // Available challenges (friends' or public)
      return ctx.db.query.challenges.findMany({
        where: and(
          eq(challenges.status, 'active'),
          or(
            eq(challenges.visibility, 'public'),
            eq(challenges.visibility, 'friends')
          )
        ),
        orderBy: [desc(challenges.startDate)],
        with: { participants: true },
        limit: 20,
      });
    }),

  // Join challenge
  joinChallenge: protectedProcedure
    .input(z.object({ challengeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const challenge = await ctx.db.query.challenges.findFirst({
        where: eq(challenges.id, input.challengeId),
        with: { participants: true },
      });

      if (!challenge) throw new Error('Challenge not found');
      if (challenge.status !== 'active' && challenge.status !== 'upcoming') {
        throw new Error('Cannot join this challenge');
      }
      if (challenge.maxParticipants && challenge.participants.length >= challenge.maxParticipants) {
        throw new Error('Challenge is full');
      }

      const [participant] = await ctx.db
        .insert(challengeParticipants)
        .values({
          challengeId: input.challengeId,
          userId: ctx.user.id,
        })
        .returning();

      return participant;
    }),

  // Update challenge progress
  updateChallengeProgress: protectedProcedure
    .input(
      z.object({
        challengeId: z.string().uuid(),
        valueToAdd: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(challengeParticipants)
        .set({
          currentValue: sql`${challengeParticipants.currentValue} + ${input.valueToAdd}`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(challengeParticipants.challengeId, input.challengeId),
          eq(challengeParticipants.userId, ctx.user.id)
        ))
        .returning();

      return updated;
    }),

  // ==================== Workout Sharing ====================

  // Share workout
  shareWorkout: protectedProcedure
    .input(
      z.object({
        workoutId: z.string().uuid(),
        shareType: z.enum(['template', 'results']),
        visibility: z.enum(['public', 'friends', 'link_only']).default('friends'),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shareLink = nanoid(12);

      const [shared] = await ctx.db
        .insert(sharedWorkouts)
        .values({
          workoutId: input.workoutId,
          sharedByUserId: ctx.user.id,
          shareType: input.shareType,
          visibility: input.visibility,
          shareLink,
          expiresAt: input.expiresAt,
        })
        .returning();

      return {
        ...shared,
        shareUrl: `/shared/${shareLink}`,
      };
    }),

  // Get shared workout by link
  getSharedWorkout: protectedProcedure
    .input(z.object({ shareLink: z.string() }))
    .query(async ({ ctx, input }) => {
      const shared = await ctx.db.query.sharedWorkouts.findFirst({
        where: eq(sharedWorkouts.shareLink, input.shareLink),
        with: {
          workout: {
            with: {
              sets: {
                with: { exercise: true },
              },
            },
          },
          sharedBy: { with: { profile: true } },
        },
      });

      if (!shared) throw new Error('Shared workout not found');

      // Check expiration
      if (shared.expiresAt && new Date(shared.expiresAt) < new Date()) {
        throw new Error('This share link has expired');
      }

      // Increment view count
      await ctx.db
        .update(sharedWorkouts)
        .set({ viewCount: sql`${sharedWorkouts.viewCount} + 1` })
        .where(eq(sharedWorkouts.id, shared.id));

      return shared;
    }),

  // ==================== Notifications ====================

  // Get notifications
  getNotifications: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(notifications.userId, ctx.user.id)];

      if (input.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      return ctx.db.query.notifications.findMany({
        where: and(...conditions),
        orderBy: [desc(notifications.createdAt)],
        limit: input.limit,
        with: {
          actor: { with: { profile: true } },
        },
      });
    }),

  // Mark notification as read
  markNotificationRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notifications.id, input.notificationId),
          eq(notifications.userId, ctx.user.id)
        ));

      return { success: true };
    }),

  // Mark all notifications as read
  markAllNotificationsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, ctx.user.id),
        eq(notifications.isRead, false)
      ));

    return { success: true };
  }),

  // Get unread notification count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute(sql`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ${ctx.user.id} AND is_read = false
    `);

    return { count: Number((result as unknown as Array<{ count: number }>)[0]?.count || 0) };
  }),
});
