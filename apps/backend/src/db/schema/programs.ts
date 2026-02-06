/**
 * Training Programs & Calendar Schema
 *
 * Unified system for strength, running, and hybrid training programs.
 * Programs are AI-generated based on user questionnaire responses.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { exercises } from './exercises';
import { workouts } from './workouts';
import { runningActivities } from './running';

// Program type enum
export const programTypeEnum = pgEnum('program_type', [
  'strength',
  'running',
  'hybrid',
  'crossfit',
  'custom',
]);

// Program status enum
export const programStatusEnum = pgEnum('program_status', [
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled',
]);

// Workout type enum for program days
export const workoutTypeEnum = pgEnum('workout_type', [
  'push',
  'pull',
  'legs',
  'upper',
  'lower',
  'full_body',
  'chest_back',
  'shoulders_arms',
  'easy_run',
  'tempo_run',
  'interval_run',
  'long_run',
  'recovery',
  'rest',
  'crossfit',
  'custom',
]);

// ============================================
// TRAINING PROGRAMS
// ============================================

// Main program table
export const trainingPrograms = pgTable('training_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Program info
  name: text('name').notNull(),
  description: text('description'),
  programType: programTypeEnum('program_type').notNull(),

  // Duration
  durationWeeks: integer('duration_weeks').notNull(),
  daysPerWeek: integer('days_per_week').notNull(),

  // Goals & context (from questionnaire)
  primaryGoal: text('primary_goal'), // 'build_muscle', 'lose_fat', 'get_stronger', 'run_5k', etc.
  secondaryGoals: text('secondary_goals').array(),
  targetEvent: text('target_event'), // '5k race', 'powerlifting meet', etc.
  targetDate: date('target_date'),

  // Generation context
  questionnaireResponses: jsonb('questionnaire_responses'), // Full questionnaire data
  generationPrompt: jsonb('generation_prompt'), // What was sent to AI
  aiModel: text('ai_model'), // Model used for generation
  ragSources: text('rag_sources').array(), // Knowledge base chunks used

  // Status & progress
  status: programStatusEnum('status').default('draft'),
  currentWeek: integer('current_week').default(1),
  currentDay: integer('current_day').default(1),
  startDate: date('start_date'),
  endDate: date('end_date'),
  completedAt: timestamp('completed_at'),

  // Adherence tracking
  totalWorkoutsScheduled: integer('total_workouts_scheduled').default(0),
  totalWorkoutsCompleted: integer('total_workouts_completed').default(0),
  adherencePercent: real('adherence_percent'),

  // Premium feature flag
  isPremium: boolean('is_premium').default(true),

  // Template options
  isTemplate: boolean('is_template').default(false),
  isPublic: boolean('is_public').default(false),
  templateId: uuid('template_id'), // Source template ID (if created from a template)

  // Coach assignment (for coach-created programs)
  createdByCoachId: uuid('created_by_coach_id').references(() => users.id, {
    onDelete: 'set null',
  }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Program weeks
export const programWeeks = pgTable('program_weeks', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id')
    .notNull()
    .references(() => trainingPrograms.id, { onDelete: 'cascade' }),

  weekNumber: integer('week_number').notNull(),
  name: text('name'), // 'Week 1: Foundation', 'Deload Week', etc.
  focus: text('focus'), // 'volume', 'intensity', 'deload', 'peak', 'taper'
  description: text('description'),

  // Targets for the week
  targetVolume: integer('target_volume'), // Total sets
  targetMileage: real('target_mileage'), // For running (km)
  intensityLevel: text('intensity_level'), // 'low', 'medium', 'high'

  // Status
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Program days (individual workouts)
export const programDays = pgTable('program_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id')
    .notNull()
    .references(() => trainingPrograms.id, { onDelete: 'cascade' }),
  weekId: uuid('week_id')
    .notNull()
    .references(() => programWeeks.id, { onDelete: 'cascade' }),

  // Schedule
  weekNumber: integer('week_number').notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0-6, Sunday = 0
  dayNumber: integer('day_number').notNull(), // Sequential day in program

  // Workout info
  workoutType: workoutTypeEnum('workout_type').notNull(),
  name: text('name'), // 'Push Day A', 'Easy 5K', etc.
  description: text('description'),
  estimatedDuration: integer('estimated_duration'), // Minutes

  // For running days
  targetDistanceMeters: real('target_distance_meters'),
  targetDurationSeconds: integer('target_duration_seconds'),
  targetPace: text('target_pace'), // 'easy', 'tempo', 'race pace', or specific pace
  intervals: jsonb('intervals'), // For interval workouts

  // Notes & coaching
  coachNotes: text('coach_notes'),
  warmupNotes: text('warmup_notes'),
  cooldownNotes: text('cooldown_notes'),

  // Completion tracking
  isCompleted: boolean('is_completed').default(false),
  completedWorkoutId: uuid('completed_workout_id')
    .references(() => workouts.id, { onDelete: 'set null' }),
  completedRunId: uuid('completed_run_id')
    .references(() => runningActivities.id, { onDelete: 'set null' }),
  completedAt: timestamp('completed_at'),
  scheduledDate: date('scheduled_date'), // Actual calendar date

  // Order for multiple workouts per day
  orderInDay: integer('order_in_day').default(1),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Program exercises (for strength days)
export const programExercises = pgTable('program_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  programDayId: uuid('program_day_id')
    .notNull()
    .references(() => programDays.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),

  // Order
  exerciseOrder: integer('exercise_order').notNull(),

  // Prescription
  sets: integer('sets').notNull(),
  repsMin: integer('reps_min'),
  repsMax: integer('reps_max'),
  repsTarget: text('reps_target'), // '8-12', 'AMRAP', '5x5'
  rpeTarget: real('rpe_target'),
  percentageOf1rm: real('percentage_of_1rm'),
  restSeconds: integer('rest_seconds'),

  // Tempo (eccentric-pause-concentric-pause)
  tempo: text('tempo'), // '3-1-1-0'

  // Notes
  notes: text('notes'),
  substituteExerciseIds: uuid('substitute_exercise_ids').array(),

  // Superset grouping
  supersetGroup: integer('superset_group'),
  supersetOrder: integer('superset_order'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================
// TRAINING CALENDAR
// ============================================

// Unified calendar view - all scheduled activities
export const trainingCalendar = pgTable('training_calendar', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Date
  scheduledDate: date('scheduled_date').notNull(),

  // Activity type
  activityType: text('activity_type').notNull(), // 'strength', 'running', 'crossfit', 'rest', 'custom'

  // References (one will be set based on type)
  programId: uuid('program_id')
    .references(() => trainingPrograms.id, { onDelete: 'cascade' }),
  programDayId: uuid('program_day_id')
    .references(() => programDays.id, { onDelete: 'cascade' }),
  workoutId: uuid('workout_id')
    .references(() => workouts.id, { onDelete: 'set null' }),
  runningActivityId: uuid('running_activity_id')
    .references(() => runningActivities.id, { onDelete: 'set null' }),

  // Display info (denormalized for quick calendar rendering)
  title: text('title').notNull(),
  description: text('description'),
  workoutType: text('workout_type'),
  estimatedDuration: integer('estimated_duration'),

  // Status
  status: text('status').default('scheduled'), // 'scheduled', 'completed', 'skipped', 'partial'
  completedAt: timestamp('completed_at'),

  // Notes
  userNotes: text('user_notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// PROGRAM ADHERENCE
// ============================================

export const programAdherence = pgTable('program_adherence', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  programId: uuid('program_id')
    .notNull()
    .references(() => trainingPrograms.id, { onDelete: 'cascade' }),
  programDayId: uuid('program_day_id')
    .notNull()
    .references(() => programDays.id, { onDelete: 'cascade' }),

  scheduledDate: date('scheduled_date').notNull(),

  // Status
  status: text('status').default('pending'), // 'pending', 'completed', 'skipped', 'partial', 'rescheduled'

  // Completion metrics
  completionPercent: real('completion_percent'),
  exercisesCompleted: integer('exercises_completed'),
  exercisesScheduled: integer('exercises_scheduled'),

  // Rescheduling
  rescheduledTo: date('rescheduled_to'),
  rescheduledFrom: date('rescheduled_from'),

  // Notes
  skipReason: text('skip_reason'),
  notes: text('notes'),

  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================
// RELATIONS
// ============================================

export const trainingProgramsRelations = relations(trainingPrograms, ({ one, many }) => ({
  user: one(users, {
    fields: [trainingPrograms.userId],
    references: [users.id],
  }),
  weeks: many(programWeeks),
  days: many(programDays),
  calendarEntries: many(trainingCalendar),
  adherenceRecords: many(programAdherence),
}));

export const programWeeksRelations = relations(programWeeks, ({ one, many }) => ({
  program: one(trainingPrograms, {
    fields: [programWeeks.programId],
    references: [trainingPrograms.id],
  }),
  days: many(programDays),
}));

export const programDaysRelations = relations(programDays, ({ one, many }) => ({
  program: one(trainingPrograms, {
    fields: [programDays.programId],
    references: [trainingPrograms.id],
  }),
  week: one(programWeeks, {
    fields: [programDays.weekId],
    references: [programWeeks.id],
  }),
  exercises: many(programExercises),
  completedWorkout: one(workouts, {
    fields: [programDays.completedWorkoutId],
    references: [workouts.id],
  }),
  completedRun: one(runningActivities, {
    fields: [programDays.completedRunId],
    references: [runningActivities.id],
  }),
}));

export const programExercisesRelations = relations(programExercises, ({ one }) => ({
  programDay: one(programDays, {
    fields: [programExercises.programDayId],
    references: [programDays.id],
  }),
  exercise: one(exercises, {
    fields: [programExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export const trainingCalendarRelations = relations(trainingCalendar, ({ one }) => ({
  user: one(users, {
    fields: [trainingCalendar.userId],
    references: [users.id],
  }),
  program: one(trainingPrograms, {
    fields: [trainingCalendar.programId],
    references: [trainingPrograms.id],
  }),
  programDay: one(programDays, {
    fields: [trainingCalendar.programDayId],
    references: [programDays.id],
  }),
  workout: one(workouts, {
    fields: [trainingCalendar.workoutId],
    references: [workouts.id],
  }),
  runningActivity: one(runningActivities, {
    fields: [trainingCalendar.runningActivityId],
    references: [runningActivities.id],
  }),
}));

export const programAdherenceRelations = relations(programAdherence, ({ one }) => ({
  user: one(users, {
    fields: [programAdherence.userId],
    references: [users.id],
  }),
  program: one(trainingPrograms, {
    fields: [programAdherence.programId],
    references: [trainingPrograms.id],
  }),
  programDay: one(programDays, {
    fields: [programAdherence.programDayId],
    references: [programDays.id],
  }),
}));

// ============================================
// TYPES
// ============================================

export type TrainingProgram = typeof trainingPrograms.$inferSelect;
export type NewTrainingProgram = typeof trainingPrograms.$inferInsert;
export type ProgramWeek = typeof programWeeks.$inferSelect;
export type NewProgramWeek = typeof programWeeks.$inferInsert;
export type ProgramDay = typeof programDays.$inferSelect;
export type NewProgramDay = typeof programDays.$inferInsert;
export type ProgramExercise = typeof programExercises.$inferSelect;
export type NewProgramExercise = typeof programExercises.$inferInsert;
export type TrainingCalendarEntry = typeof trainingCalendar.$inferSelect;
export type NewTrainingCalendarEntry = typeof trainingCalendar.$inferInsert;
export type ProgramAdherenceRecord = typeof programAdherence.$inferSelect;
export type NewProgramAdherenceRecord = typeof programAdherence.$inferInsert;
