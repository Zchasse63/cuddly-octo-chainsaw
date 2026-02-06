import { pgTable, uuid, text, boolean, timestamp, real, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { workouts, workoutSets } from './workouts';
import { exercises } from './exercises';

// Voice command history and fine-tuning data
export const voiceCommands = pgTable('voice_commands', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  workoutId: uuid('workout_id')
    .references(() => workouts.id, { onDelete: 'set null' }),
  workoutSetId: uuid('workout_set_id')
    .references(() => workoutSets.id, { onDelete: 'set null' }),
  exerciseId: uuid('exercise_id')
    .references(() => exercises.id, { onDelete: 'set null' }),

  // Voice input
  rawTranscript: text('raw_transcript').notNull(),
  audioUrl: text('audio_url'), // optional audio file

  // Parsing results
  parsedOutput: jsonb('parsed_output'), // { exercise, sets, reps, weight, rpe }
  confidence: real('confidence'), // 0-1 parsing confidence
  modelUsed: text('model_used'), // 'grok-4-fast', 'fine-tuned-v1'

  // Search results from Upstash
  searchResults: jsonb('search_results'), // top matches from Upstash Search
  searchLatencyMs: integer('search_latency_ms'),

  // Correction tracking (for fine-tuning)
  wasCorrected: boolean('was_corrected').default(false),
  correctedOutput: jsonb('corrected_output'),
  correctionType: text('correction_type'), // 'exercise', 'reps', 'weight', 'full'

  // Performance
  latencyMs: integer('latency_ms'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Fine-tuned model tracking
export const fineTunedModels = pgTable('fine_tuned_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: text('model_id').unique().notNull(), // provider model ID
  modelType: text('model_type').notNull(), // 'voice_parser', 'exercise_matcher'
  baseModel: text('base_model').notNull(),
  trainingDataCount: integer('training_data_count'),
  accuracyScore: real('accuracy_score'),
  isActive: boolean('is_active').default(false),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }), // null = global model
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const voiceCommandsRelations = relations(voiceCommands, ({ one }) => ({
  user: one(users, {
    fields: [voiceCommands.userId],
    references: [users.id],
  }),
  workout: one(workouts, {
    fields: [voiceCommands.workoutId],
    references: [workouts.id],
  }),
  workoutSet: one(workoutSets, {
    fields: [voiceCommands.workoutSetId],
    references: [workoutSets.id],
  }),
  exercise: one(exercises, {
    fields: [voiceCommands.exerciseId],
    references: [exercises.id],
  }),
}));

export const fineTunedModelsRelations = relations(fineTunedModels, ({ one }) => ({
  user: one(users, {
    fields: [fineTunedModels.userId],
    references: [users.id],
  }),
}));

// Types
export type VoiceCommand = typeof voiceCommands.$inferSelect;
export type NewVoiceCommand = typeof voiceCommands.$inferInsert;
export type FineTunedModel = typeof fineTunedModels.$inferSelect;
export type NewFineTunedModel = typeof fineTunedModels.$inferInsert;
