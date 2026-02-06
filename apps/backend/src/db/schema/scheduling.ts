import { pgTable, uuid, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

export const sessionTypeEnum = pgEnum('session_type', ['check-in', 'workout-review', 'planning', 'other']);
export const sessionStatusEnum = pgEnum('session_status', ['scheduled', 'completed', 'cancelled']);

export const scheduledSessions = pgTable('scheduled_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  coachId: uuid('coach_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  sessionType: text('session_type').notNull(), // Using text instead of enum for flexibility
  notes: text('notes'),
  status: text('status').default('scheduled').notNull(), // Using text instead of enum
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ScheduledSession = typeof scheduledSessions.$inferSelect;
export type NewScheduledSession = typeof scheduledSessions.$inferInsert;
