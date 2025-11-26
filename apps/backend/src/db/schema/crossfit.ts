import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { workouts } from './workouts';
import { voiceCommands } from './voice';

// WOD type enum
export const wodTypeEnum = pgEnum('wod_type', [
  'amrap',
  'emom',
  'for_time',
  'chipper',
  'ladder',
  'tabata',
  'death_by',
  'custom',
]);

// CrossFit WOD library
export const crossfitWods = pgTable('crossfit_wods', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').unique(), // 'Fran', 'Murph', etc.
  wodType: wodTypeEnum('wod_type').notNull(),
  description: text('description'),

  // Workout structure
  movements: jsonb('movements').notNull(), // [{ exercise, reps, weight, notes }]
  timeCap: integer('time_cap_minutes'),
  rounds: integer('rounds'), // for AMRAP
  intervalSeconds: integer('interval_seconds'), // for EMOM

  // Metadata
  isBenchmark: boolean('is_benchmark').default(false), // "The Girls"
  isHeroWod: boolean('is_hero_wod').default(false), // Hero WODs
  difficultyLevel: text('difficulty_level'), // 'beginner', 'intermediate', 'advanced', 'elite'

  // Standards
  rxStandards: jsonb('rx_standards'), // { male: { weight: 135 }, female: { weight: 95 } }
  scalingOptions: jsonb('scaling_options'), // [{ name: 'scaled', modifications: [...] }]

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// WOD performance logs
export const wodLogs = pgTable('wod_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  wodId: uuid('wod_id').references(() => crossfitWods.id, {
    onDelete: 'set null',
  }),
  workoutId: uuid('workout_id').references(() => workouts.id, {
    onDelete: 'set null',
  }),

  loggedAt: timestamp('logged_at').defaultNow().notNull(),

  // Results (depends on wod_type)
  resultTimeSeconds: integer('result_time_seconds'), // for_time
  resultRounds: integer('result_rounds'), // AMRAP rounds
  resultReps: integer('result_reps'), // AMRAP extra reps
  resultLoad: jsonb('result_load'), // weights used { movement: weight }

  // Scaling
  wasRx: boolean('was_rx').default(false),
  scalingNotes: text('scaling_notes'),

  notes: text('notes'),

  // Voice input
  rawVoiceInput: text('raw_voice_input'),
  voiceCommandId: uuid('voice_command_id').references(() => voiceCommands.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User benchmark tracking (best performances)
export const wodBenchmarks = pgTable('wod_benchmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  wodId: uuid('wod_id')
    .references(() => crossfitWods.id, { onDelete: 'cascade' })
    .notNull(),
  wodLogId: uuid('wod_log_id').references(() => wodLogs.id, {
    onDelete: 'set null',
  }),

  // Best results
  bestTimeSeconds: integer('best_time_seconds'),
  bestRounds: integer('best_rounds'),
  bestReps: integer('best_reps'),

  achievedAt: timestamp('achieved_at').notNull(),
  previousBestTimeSeconds: integer('previous_best_time_seconds'),
  improvementSeconds: integer('improvement_seconds'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const crossfitWodsRelations = relations(crossfitWods, ({ many }) => ({
  logs: many(wodLogs),
  benchmarks: many(wodBenchmarks),
}));

export const wodLogsRelations = relations(wodLogs, ({ one }) => ({
  user: one(users, {
    fields: [wodLogs.userId],
    references: [users.id],
  }),
  wod: one(crossfitWods, {
    fields: [wodLogs.wodId],
    references: [crossfitWods.id],
  }),
  workout: one(workouts, {
    fields: [wodLogs.workoutId],
    references: [workouts.id],
  }),
  voiceCommand: one(voiceCommands, {
    fields: [wodLogs.voiceCommandId],
    references: [voiceCommands.id],
  }),
}));

export const wodBenchmarksRelations = relations(wodBenchmarks, ({ one }) => ({
  user: one(users, {
    fields: [wodBenchmarks.userId],
    references: [users.id],
  }),
  wod: one(crossfitWods, {
    fields: [wodBenchmarks.wodId],
    references: [crossfitWods.id],
  }),
  wodLog: one(wodLogs, {
    fields: [wodBenchmarks.wodLogId],
    references: [wodLogs.id],
  }),
}));

// Type exports
export type CrossfitWod = typeof crossfitWods.$inferSelect;
export type NewCrossfitWod = typeof crossfitWods.$inferInsert;
export type WodLog = typeof wodLogs.$inferSelect;
export type NewWodLog = typeof wodLogs.$inferInsert;
export type WodBenchmark = typeof wodBenchmarks.$inferSelect;
export type NewWodBenchmark = typeof wodBenchmarks.$inferInsert;
