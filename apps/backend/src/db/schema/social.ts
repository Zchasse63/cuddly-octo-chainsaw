import { pgTable, uuid, text, boolean, timestamp, integer, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { workouts } from './workouts';

// Friend relationships
export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  friendId: uuid('friend_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Status
  status: text('status').notNull().default('pending'), // 'pending', 'accepted', 'blocked'

  // Who initiated
  initiatedBy: uuid('initiated_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueFriendship: unique().on(table.userId, table.friendId),
}));

// Activity feed items
export const activityFeed = pgTable('activity_feed', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Activity type
  activityType: text('activity_type').notNull(), // 'workout_completed', 'pr_achieved', 'badge_earned', 'challenge_completed', 'streak_milestone'

  // References (polymorphic)
  workoutId: uuid('workout_id')
    .references(() => workouts.id, { onDelete: 'cascade' }),
  referenceId: uuid('reference_id'), // Generic reference for other types
  referenceType: text('reference_type'), // 'pr', 'badge', 'challenge', etc.

  // Activity details
  title: text('title').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'), // { exerciseName, weight, reps, badgeName, etc. }

  // Visibility
  visibility: text('visibility').default('friends'), // 'public', 'friends', 'private'

  // Engagement
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Likes on activity feed
export const activityLikes = pgTable('activity_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id')
    .notNull()
    .references(() => activityFeed.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueLike: unique().on(table.activityId, table.userId),
}));

// Comments on activity feed
export const activityComments = pgTable('activity_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id')
    .notNull()
    .references(() => activityFeed.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  content: text('content').notNull(),
  parentCommentId: uuid('parent_comment_id'), // For replies

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Challenges
export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Challenge details
  name: text('name').notNull(),
  description: text('description'),
  challengeType: text('challenge_type').notNull(), // 'workout_count', 'total_volume', 'total_distance', 'streak', 'specific_exercise'

  // Target
  targetValue: integer('target_value').notNull(),
  targetUnit: text('target_unit'), // 'workouts', 'lbs', 'kg', 'km', 'miles', 'days'
  exerciseId: uuid('exercise_id'), // For exercise-specific challenges

  // Duration
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),

  // Visibility and participation
  visibility: text('visibility').default('friends'), // 'public', 'friends', 'invite_only'
  maxParticipants: integer('max_participants'),

  // Status
  status: text('status').default('upcoming'), // 'upcoming', 'active', 'completed', 'cancelled'

  // Prize/reward
  prize: text('prize'),
  badgeId: text('badge_id'), // Badge awarded to winners

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Challenge participants
export const challengeParticipants = pgTable('challenge_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  challengeId: uuid('challenge_id')
    .notNull()
    .references(() => challenges.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Progress
  currentValue: integer('current_value').default(0),
  progressPercent: integer('progress_percent').default(0),

  // Ranking
  rank: integer('rank'),

  // Status
  status: text('status').default('active'), // 'active', 'completed', 'withdrawn'
  completedAt: timestamp('completed_at'),

  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueParticipant: unique().on(table.challengeId, table.userId),
}));

// Workout sharing
export const sharedWorkouts = pgTable('shared_workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutId: uuid('workout_id')
    .notNull()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  sharedByUserId: uuid('shared_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Share settings
  shareType: text('share_type').notNull(), // 'template', 'results'
  visibility: text('visibility').default('friends'), // 'public', 'friends', 'link_only'
  shareLink: text('share_link').unique(),

  // Stats
  viewCount: integer('view_count').default(0),
  copyCount: integer('copy_count').default(0),

  // Expiration
  expiresAt: timestamp('expires_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Notification details
  type: text('type').notNull(), // 'friend_request', 'challenge_invite', 'like', 'comment', 'pr_beaten', 'streak_reminder'
  title: text('title').notNull(),
  body: text('body'),

  // Reference
  referenceId: uuid('reference_id'),
  referenceType: text('reference_type'),

  // Actor (who triggered this notification)
  actorId: uuid('actor_id')
    .references(() => users.id, { onDelete: 'set null' }),

  // Status
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),

  // Deep link
  actionUrl: text('action_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: 'userFriendships',
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
    relationName: 'friendFriendships',
  }),
  initiator: one(users, {
    fields: [friendships.initiatedBy],
    references: [users.id],
    relationName: 'initiatedFriendships',
  }),
}));

export const activityFeedRelations = relations(activityFeed, ({ one, many }) => ({
  user: one(users, {
    fields: [activityFeed.userId],
    references: [users.id],
  }),
  workout: one(workouts, {
    fields: [activityFeed.workoutId],
    references: [workouts.id],
  }),
  likes: many(activityLikes),
  comments: many(activityComments),
}));

export const activityLikesRelations = relations(activityLikes, ({ one }) => ({
  activity: one(activityFeed, {
    fields: [activityLikes.activityId],
    references: [activityFeed.id],
  }),
  user: one(users, {
    fields: [activityLikes.userId],
    references: [users.id],
  }),
}));

export const activityCommentsRelations = relations(activityComments, ({ one }) => ({
  activity: one(activityFeed, {
    fields: [activityComments.activityId],
    references: [activityFeed.id],
  }),
  user: one(users, {
    fields: [activityComments.userId],
    references: [users.id],
  }),
  parentComment: one(activityComments, {
    fields: [activityComments.parentCommentId],
    references: [activityComments.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  creator: one(users, {
    fields: [challenges.creatorId],
    references: [users.id],
  }),
  participants: many(challengeParticipants),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeParticipants.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [challengeParticipants.userId],
    references: [users.id],
  }),
}));

export const sharedWorkoutsRelations = relations(sharedWorkouts, ({ one }) => ({
  workout: one(workouts, {
    fields: [sharedWorkouts.workoutId],
    references: [workouts.id],
  }),
  sharedBy: one(users, {
    fields: [sharedWorkouts.sharedByUserId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
  }),
}));

// Types
export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type NewActivityFeedItem = typeof activityFeed.$inferInsert;
export type ActivityLike = typeof activityLikes.$inferSelect;
export type NewActivityLike = typeof activityLikes.$inferInsert;
export type ActivityComment = typeof activityComments.$inferSelect;
export type NewActivityComment = typeof activityComments.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type NewChallengeParticipant = typeof challengeParticipants.$inferInsert;
export type SharedWorkout = typeof sharedWorkouts.$inferSelect;
export type NewSharedWorkout = typeof sharedWorkouts.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
