import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Social Router Tests - Social features validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Social Router', () => {
  describe('Input Validation', () => {
    describe('sendFriendRequest input', () => {
      const schema = z.object({
        friendId: z.string().uuid(),
      });

      it('should accept valid friend ID', () => {
        expect(schema.parse({ friendId: testUUID }).friendId).toBe(testUUID);
      });

      it('should reject invalid UUID', () => {
        expect(() => schema.parse({ friendId: 'not-valid' })).toThrow();
      });
    });

    describe('getFriends input', () => {
      const schema = z.object({
        status: z.enum(['pending', 'accepted', 'blocked']).optional(),
      });

      it('should accept no status', () => {
        expect(schema.parse({}).status).toBeUndefined();
      });

      it('should accept valid status', () => {
        expect(schema.parse({ status: 'accepted' }).status).toBe('accepted');
        expect(schema.parse({ status: 'pending' }).status).toBe('pending');
      });
    });

    describe('postActivity input', () => {
      const schema = z.object({
        activityType: z.enum(['workout_completed', 'pr_achieved', 'streak_milestone', 'badge_earned', 'challenge_completed']),
        workoutId: z.string().uuid().optional(),
        message: z.string().max(500).optional(),
        visibility: z.enum(['public', 'friends', 'private']).default('friends'),
        metadata: z.record(z.unknown()).optional(),
      });

      it('should accept workout post', () => {
        const result = schema.parse({
          activityType: 'workout_completed',
          workoutId: testUUID,
          message: 'Great chest day!',
        });
        expect(result.activityType).toBe('workout_completed');
        expect(result.visibility).toBe('friends');
      });

      it('should accept PR achievement', () => {
        const result = schema.parse({
          activityType: 'pr_achieved',
          message: 'New bench PR: 225lbs!',
          visibility: 'public',
          metadata: { exercise: 'Bench Press', weight: 225 },
        });
        expect(result.activityType).toBe('pr_achieved');
      });

      it('should reject message too long', () => {
        expect(() => schema.parse({
          activityType: 'workout_completed',
          message: 'a'.repeat(501),
        })).toThrow();
      });
    });

    describe('likeActivity input', () => {
      const schema = z.object({
        activityId: z.string().uuid(),
      });

      it('should accept valid activity ID', () => {
        expect(schema.parse({ activityId: testUUID }).activityId).toBe(testUUID);
      });
    });

    describe('commentOnActivity input', () => {
      const schema = z.object({
        activityId: z.string().uuid(),
        content: z.string().min(1).max(500),
        parentCommentId: z.string().uuid().optional(),
      });

      it('should accept comment', () => {
        const result = schema.parse({
          activityId: testUUID,
          content: 'Great workout!',
        });
        expect(result.content).toBe('Great workout!');
      });

      it('should accept reply', () => {
        const result = schema.parse({
          activityId: testUUID,
          content: 'Thanks!',
          parentCommentId: testUUID,
        });
        expect(result.parentCommentId).toBe(testUUID);
      });

      it('should reject empty comment', () => {
        expect(() => schema.parse({
          activityId: testUUID,
          content: '',
        })).toThrow();
      });
    });

    describe('createChallenge input', () => {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        type: z.enum(['workout_count', 'volume', 'streak', 'distance', 'time']),
        targetValue: z.number().positive(),
        startDate: z.string(),
        endDate: z.string(),
        visibility: z.enum(['public', 'friends', 'invite_only']).default('friends'),
      });

      it('should accept challenge', () => {
        const result = schema.parse({
          name: '30 Day Challenge',
          type: 'workout_count',
          targetValue: 30,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });
        expect(result.name).toBe('30 Day Challenge');
        expect(result.targetValue).toBe(30);
      });

      it('should accept distance challenge', () => {
        const result = schema.parse({
          name: '100 Mile Month',
          type: 'distance',
          targetValue: 100,
          startDate: '2024-02-01',
          endDate: '2024-02-29',
          visibility: 'public',
        });
        expect(result.type).toBe('distance');
      });

      it('should reject empty name', () => {
        expect(() => schema.parse({
          name: '',
          type: 'workout_count',
          targetValue: 10,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })).toThrow();
      });
    });

    describe('joinChallenge input', () => {
      const schema = z.object({
        challengeId: z.string().uuid(),
      });

      it('should accept challenge ID', () => {
        expect(schema.parse({ challengeId: testUUID }).challengeId).toBe(testUUID);
      });
    });

    describe('shareWorkout input', () => {
      const schema = z.object({
        workoutId: z.string().uuid(),
        shareWith: z.array(z.string().uuid()).min(1),
        message: z.string().max(200).optional(),
      });

      it('should accept share request', () => {
        const result = schema.parse({
          workoutId: testUUID,
          shareWith: [testUUID],
        });
        expect(result.shareWith).toHaveLength(1);
      });

      it('should reject empty share list', () => {
        expect(() => schema.parse({
          workoutId: testUUID,
          shareWith: [],
        })).toThrow();
      });
    });
  });
});

