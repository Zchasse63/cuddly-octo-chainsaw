import { pgTable, uuid, text, timestamp, integer, real } from 'drizzle-orm/pg-core';
import { users } from './users';

export const readinessScores = pgTable('readiness_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // Simple score (emoji-based: 1-5 scale)
  overallScore: integer('overall_score'), // 1-10 normalized

  // Detailed scores (1-10 each)
  sleepQuality: integer('sleep_quality'),
  energyLevel: integer('energy_level'),
  motivation: integer('motivation'),
  soreness: integer('soreness'),
  stress: integer('stress'),

  // Optional notes
  notes: text('notes'),

  // Wearable data (if available)
  hrvScore: real('hrv_score'),
  restingHr: real('resting_hr'),
  sleepHours: real('sleep_hours'),

  // Date (one per day)
  date: timestamp('date').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ReadinessScore = typeof readinessScores.$inferSelect;
export type NewReadinessScore = typeof readinessScores.$inferInsert;
