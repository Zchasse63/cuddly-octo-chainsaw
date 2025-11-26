import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// User onboarding tracking
export const userOnboarding = pgTable('user_onboarding', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentStep: text('current_step').default('welcome'),
  stepsCompleted: text('steps_completed').array().default([]),
  isComplete: boolean('is_complete').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const userOnboardingRelations = relations(userOnboarding, ({ one }) => ({
  user: one(users, {
    fields: [userOnboarding.userId],
    references: [users.id],
  }),
}));

// Types
export type UserOnboarding = typeof userOnboarding.$inferSelect;
export type NewUserOnboarding = typeof userOnboarding.$inferInsert;
