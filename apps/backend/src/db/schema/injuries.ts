/**
 * Injury Tracking Schema
 *
 * Tracks user injuries for workout modifications and safety recommendations.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Injury severity enum
export const injurySeverityEnum = pgEnum('injury_severity', [
  'minor',
  'moderate',
  'severe',
  'chronic',
]);

// Injury status enum
export const injuryStatusEnum = pgEnum('injury_status', [
  'active',
  'recovering',
  'healed',
  'chronic',
]);

// Injuries table
export const injuries = pgTable('injuries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Injury details
  name: text('name').notNull(), // 'Lower back strain', 'Knee tendinitis', etc.
  bodyPart: text('body_part').notNull(), // 'lower_back', 'knee', 'shoulder', etc.
  side: text('side'), // 'left', 'right', 'both', null for center body parts
  description: text('description'),

  // Severity and status
  severity: injurySeverityEnum('severity').default('minor'),
  status: injuryStatusEnum('status').default('active'),

  // Dates
  injuryDate: timestamp('injury_date'),
  expectedRecoveryDate: timestamp('expected_recovery_date'),
  healedDate: timestamp('healed_date'),

  // Exercise modifications
  exercisesToAvoid: text('exercises_to_avoid').array(),
  movementsToAvoid: text('movements_to_avoid').array(), // 'overhead pressing', 'deep squats', etc.
  recommendedExercises: text('recommended_exercises').array(),

  // Medical info
  diagnosedBy: text('diagnosed_by'), // 'self', 'doctor', 'physical_therapist'
  treatmentNotes: text('treatment_notes'),
  physicalTherapyNotes: text('physical_therapy_notes'),

  // Flags
  isActive: boolean('is_active').default(true),
  affectsWorkouts: boolean('affects_workouts').default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const injuriesRelations = relations(injuries, ({ one }) => ({
  user: one(users, {
    fields: [injuries.userId],
    references: [users.id],
  }),
}));

// Types
export type Injury = typeof injuries.$inferSelect;
export type NewInjury = typeof injuries.$inferInsert;

