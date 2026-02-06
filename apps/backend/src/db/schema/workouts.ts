import { pgTable, uuid, text, timestamp, integer, real, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { exercises } from './exercises';
import { trainingPrograms } from './programs';

export const workoutStatusEnum = pgEnum('workout_status', ['active', 'completed', 'cancelled']);
export const loggingMethodEnum = pgEnum('logging_method', ['voice', 'manual', 'quick_log']);
export const weightUnitEnum = pgEnum('weight_unit', ['lbs', 'kg']);

export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // Workout info
  name: text('name'),
  notes: text('notes'),
  status: workoutStatusEnum('status').default('active'),

  // Timing
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // in seconds

  // Program reference (if from a program)
  programId: uuid('program_id').references(() => trainingPrograms.id, { onDelete: 'set null' }),
  programWeek: integer('program_week'),
  programDay: integer('program_day'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workoutSets = pgTable('workout_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutId: uuid('workout_id').references(() => workouts.id).notNull(),
  exerciseId: uuid('exercise_id').references(() => exercises.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),

  // Set data
  setNumber: integer('set_number').notNull(),
  reps: integer('reps'),
  weight: real('weight'),
  weightUnit: weightUnitEnum('weight_unit').default('lbs'),
  rpe: real('rpe'), // Rate of Perceived Exertion (1-10)

  // Voice parsing metadata
  loggingMethod: loggingMethodEnum('logging_method').default('manual'),
  voiceTranscript: text('voice_transcript'),
  confidence: real('confidence'), // Voice parsing confidence (0-1)

  // PR tracking
  isPr: boolean('is_pr').default(false),
  estimated1rm: real('estimated_1rm'), // Epley formula

  // Rest timer
  restDuration: integer('rest_duration'), // in seconds

  // Sync
  syncedAt: timestamp('synced_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Personal Records table
export const personalRecords = pgTable('personal_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  exerciseId: uuid('exercise_id').references(() => exercises.id).notNull(),

  // PR data
  weight: real('weight').notNull(),
  weightUnit: weightUnitEnum('weight_unit').default('lbs'),
  reps: integer('reps').notNull(),
  estimated1rm: real('estimated_1rm'),

  // Reference
  workoutSetId: uuid('workout_set_id').references(() => workoutSets.id),
  achievedAt: timestamp('achieved_at').defaultNow().notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations for personalRecords
export const personalRecordsRelations = relations(personalRecords, ({ one }) => ({
  exercise: one(exercises, {
    fields: [personalRecords.exerciseId],
    references: [exercises.id],
  }),
  user: one(users, {
    fields: [personalRecords.userId],
    references: [users.id],
  }),
  workoutSet: one(workoutSets, {
    fields: [personalRecords.workoutSetId],
    references: [workoutSets.id],
  }),
}));

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;
