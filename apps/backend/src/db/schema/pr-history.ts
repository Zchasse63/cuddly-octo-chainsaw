import { pgTable, uuid, text, timestamp, real, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { exercises } from './exercises';
import { workoutSets } from './workouts';

// Detailed PR history (enhanced from personal_records)
export const prHistory = pgTable('pr_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  workoutSetId: uuid('workout_set_id')
    .references(() => workoutSets.id, { onDelete: 'set null' }),

  prType: text('pr_type').notNull(), // '1rm', '3rm', '5rm', 'volume', 'reps_at_weight'
  value: real('value').notNull(),
  weight: real('weight'),
  reps: integer('reps'),

  // Context
  estimated1rm: real('estimated_1rm'),
  previousPrId: uuid('previous_pr_id'), // self-reference handled in migration
  improvementPercent: real('improvement_percent'),

  achievedAt: timestamp('achieved_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniquePr: unique().on(table.userId, table.exerciseId, table.prType, table.achievedAt),
}));

// Relations
export const prHistoryRelations = relations(prHistory, ({ one }) => ({
  user: one(users, {
    fields: [prHistory.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [prHistory.exerciseId],
    references: [exercises.id],
  }),
  workoutSet: one(workoutSets, {
    fields: [prHistory.workoutSetId],
    references: [workoutSets.id],
  }),
  previousPr: one(prHistory, {
    fields: [prHistory.previousPrId],
    references: [prHistory.id],
    relationName: 'prChain',
  }),
}));

// Types
export type PrHistoryItem = typeof prHistory.$inferSelect;
export type NewPrHistoryItem = typeof prHistory.$inferInsert;
