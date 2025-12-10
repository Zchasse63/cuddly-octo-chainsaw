import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { workouts, friendships, activityFeed, activityLikes, activityComments, challenges, challengeParticipants, sharedWorkouts, notifications } from '../../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Social Integration Tests - Friendships, activity feed, challenges
 * Uses pre-seeded test data from seed-data.ts
 * Note: Tests create social data that is cleaned up after tests
 */

describe('Social Integration', () => {
  let seededUsers: SeededTestUsers;
  let userAId: string;
  let userBId: string;
  let testWorkoutId: string;

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    userAId = seededUsers.premiumAthlete.id;
    userBId = seededUsers.freeAthlete.id;

    // Create a test workout for social tests
    const [workout] = await db.insert(workouts).values({
      userId: userAId,
      name: 'Shared Workout',
      status: 'completed',
    }).returning();
    testWorkoutId = workout.id;
  });

  afterAll(async () => {
    // Cleanup data created during tests
    await db.delete(notifications).where(or(eq(notifications.userId, userAId), eq(notifications.userId, userBId))).catch(() => {});
    await db.delete(activityLikes).where(or(eq(activityLikes.userId, userAId), eq(activityLikes.userId, userBId))).catch(() => {});
    await db.delete(activityComments).where(or(eq(activityComments.userId, userAId), eq(activityComments.userId, userBId))).catch(() => {});
    await db.delete(activityFeed).where(or(eq(activityFeed.userId, userAId), eq(activityFeed.userId, userBId))).catch(() => {});
    await db.delete(challengeParticipants).where(or(eq(challengeParticipants.userId, userAId), eq(challengeParticipants.userId, userBId))).catch(() => {});
    await db.delete(challenges).where(eq(challenges.creatorId, userAId)).catch(() => {});
    await db.delete(sharedWorkouts).where(eq(sharedWorkouts.sharedByUserId, userAId)).catch(() => {});
    await db.delete(friendships).where(or(eq(friendships.userId, userAId), eq(friendships.friendId, userAId))).catch(() => {});
    await db.delete(workouts).where(eq(workouts.id, testWorkoutId)).catch(() => {});
  });

  describe('Friendships', () => {
    it('should send friend request', async () => {
      const [friendship] = await db.insert(friendships).values({
        userId: userAId,
        friendId: userBId,
        initiatedBy: userAId,
        status: 'pending',
      }).returning();

      expect(friendship.status).toBe('pending');
    });

    it('should accept friend request', async () => {
      const [updated] = await db.update(friendships)
        .set({ status: 'accepted' })
        .where(and(eq(friendships.userId, userAId), eq(friendships.friendId, userBId)))
        .returning();

      expect(updated.status).toBe('accepted');
    });

    it('should prevent duplicate friendships', async () => {
      await expect(
        db.insert(friendships).values({
          userId: userAId,
          friendId: userBId,
          initiatedBy: userAId,
        })
      ).rejects.toThrow();
    });
  });

  describe('Activity Feed', () => {
    it('should post workout completion', async () => {
      const [activity] = await db.insert(activityFeed).values({
        userId: userAId,
        activityType: 'workout_completed',
        workoutId: testWorkoutId,
        title: 'Completed Push Day',
        description: '5 exercises, 20 sets',
        visibility: 'friends',
      }).returning();

      expect(activity.id).toBeDefined();
      expect(activity.activityType).toBe('workout_completed');
    });

    it('should like an activity', async () => {
      const activity = await db.query.activityFeed.findFirst({
        where: eq(activityFeed.userId, userAId),
      });

      if (activity) {
        const [like] = await db.insert(activityLikes).values({
          activityId: activity.id,
          userId: userBId,
        }).returning();

        expect(like.id).toBeDefined();

        // Update like count
        await db.update(activityFeed)
          .set({ likesCount: 1 })
          .where(eq(activityFeed.id, activity.id));
      }
    });

    it('should comment on activity', async () => {
      const activity = await db.query.activityFeed.findFirst({
        where: eq(activityFeed.userId, userAId),
      });

      if (activity) {
        const [comment] = await db.insert(activityComments).values({
          activityId: activity.id,
          userId: userBId,
          content: 'Great workout! 💪',
        }).returning();

        expect(comment.content).toBe('Great workout! 💪');
      }
    });

    it('should prevent duplicate likes', async () => {
      const activity = await db.query.activityFeed.findFirst({
        where: eq(activityFeed.userId, userAId),
      });

      if (activity) {
        await expect(
          db.insert(activityLikes).values({
            activityId: activity.id,
            userId: userBId, // Already liked
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('Challenges', () => {
    it('should create a challenge', async () => {
      const [challenge] = await db.insert(challenges).values({
        creatorId: userAId,
        name: 'July Pushup Challenge',
        challengeType: 'workout_count',
        targetValue: 20,
        targetUnit: 'workouts',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        visibility: 'friends',
      }).returning();

      expect(challenge.id).toBeDefined();
      expect(challenge.challengeType).toBe('workout_count');
    });

    it('should join a challenge', async () => {
      const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.creatorId, userAId),
      });

      if (challenge) {
        const [participant] = await db.insert(challengeParticipants).values({
          challengeId: challenge.id,
          userId: userBId,
        }).returning();

        expect(participant.status).toBe('active');
        expect(participant.currentValue).toBe(0);
      }
    });

    it('should update challenge progress', async () => {
      const participant = await db.query.challengeParticipants.findFirst({
        where: eq(challengeParticipants.userId, userBId),
      });

      if (participant) {
        const [updated] = await db.update(challengeParticipants)
          .set({
            currentValue: 5,
            progressPercent: 25,
          })
          .where(eq(challengeParticipants.id, participant.id))
          .returning();

        expect(updated.currentValue).toBe(5);
        expect(updated.progressPercent).toBe(25);
      }
    });
  });

  describe('Notifications', () => {
    it('should create notification', async () => {
      const [notification] = await db.insert(notifications).values({
        userId: userBId,
        type: 'friend_request',
        title: 'New Friend Request',
        body: 'User A wants to be your friend',
        actorId: userAId,
      }).returning();

      expect(notification.id).toBeDefined();
      expect(notification.isRead).toBe(false);
    });

    it('should mark notification as read', async () => {
      const notification = await db.query.notifications.findFirst({
        where: eq(notifications.userId, userBId),
      });

      if (notification) {
        const [updated] = await db.update(notifications)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(notifications.id, notification.id))
          .returning();

        expect(updated.isRead).toBe(true);
      }
    });
  });
});

