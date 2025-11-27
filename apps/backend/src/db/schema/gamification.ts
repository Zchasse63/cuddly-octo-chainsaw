import { pgTable, uuid, text, integer, boolean, timestamp, date, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// User streaks
export const userStreaks = pgTable('user_streaks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  streakType: text('streak_type').notNull(), // 'workout', 'logging', 'running'
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastActivityDate: date('last_activity_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserStreakType: unique().on(table.userId, table.streakType),
}));

// User badges/achievements
export const userBadges = pgTable('user_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  badgeId: text('badge_id').notNull(), // 'first_workout', 'pr_club', 'streak_7', etc.
  badgeType: text('badge_type').notNull(), // 'strength', 'running', 'streak', 'milestone'
  earnedAt: timestamp('earned_at').defaultNow().notNull(),
  metadata: jsonb('metadata'), // { exerciseId, weight, reps, etc. }
}, (table) => ({
  uniqueUserBadge: unique().on(table.userId, table.badgeId),
}));

// Badge definitions (static reference)
export const badgeDefinitions = pgTable('badge_definitions', {
  id: text('id').primaryKey(), // 'first_workout', 'bench_200', etc.
  name: text('name').notNull(),
  description: text('description'),
  badgeType: text('badge_type').notNull(),
  iconUrl: text('icon_url'),
  criteria: jsonb('criteria'), // { type: 'pr', exercise: 'bench_press', weight: 200 }
  tier: text('tier').default('bronze'), // bronze, silver, gold, platinum
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const userStreaksRelations = relations(userStreaks, ({ one }) => ({
  user: one(users, {
    fields: [userStreaks.userId],
    references: [users.id],
  }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  definition: one(badgeDefinitions, {
    fields: [userBadges.badgeId],
    references: [badgeDefinitions.id],
  }),
}));

// Types
export type UserStreak = typeof userStreaks.$inferSelect;
export type NewUserStreak = typeof userStreaks.$inferInsert;
export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;
export type BadgeDefinition = typeof badgeDefinitions.$inferSelect;
export type NewBadgeDefinition = typeof badgeDefinitions.$inferInsert;
