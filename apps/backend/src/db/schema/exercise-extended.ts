import { pgTable, uuid, text, boolean, timestamp, real, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { exercises } from './exercises';

// Exercise muscles (many-to-many relationship)
export const exerciseMuscles = pgTable('exercise_muscles', {
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  muscleGroup: text('muscle_group').notNull(),
  activationLevel: text('activation_level').default('primary'), // 'primary', 'secondary', 'stabilizer'
}, (table) => ({
  pk: unique().on(table.exerciseId, table.muscleGroup),
}));

// Exercise cues for coaching (content indexed in Upstash Search)
export const exerciseCues = pgTable('exercise_cues', {
  id: uuid('id').primaryKey().defaultRandom(),
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  cueText: text('cue_text').notNull(),
  cueType: text('cue_type').notNull(), // 'setup', 'execution', 'breathing', 'common_mistake'
  upstashIndexed: boolean('upstash_indexed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Exercise media (videos, images)
export const exerciseMedia = pgTable('exercise_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull(), // 'video', 'image', 'gif'
  mediaUrl: text('media_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  durationSeconds: integer('duration_seconds'), // for videos
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Exercise substitutions
export const exerciseSubstitutions = pgTable('exercise_substitutions', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalExerciseId: uuid('original_exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  substituteExerciseId: uuid('substitute_exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  reason: text('reason'), // 'injury', 'equipment', 'difficulty'
  affectedBodyPart: text('affected_body_part'), // body part being protected
  similarityScore: real('similarity_score').default(0.8), // 0-1
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Body part stress levels per exercise
export const exerciseBodyPartStress = pgTable('exercise_body_part_stress', {
  id: uuid('id').primaryKey().defaultRandom(),
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  bodyPart: text('body_part').notNull(),
  stressLevel: text('stress_level').notNull(), // 'low', 'medium', 'high'
}, (table) => ({
  uniqueExerciseBodyPart: unique().on(table.exerciseId, table.bodyPart),
}));

// Relations
export const exerciseMusclesRelations = relations(exerciseMuscles, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseMuscles.exerciseId],
    references: [exercises.id],
  }),
}));

export const exerciseCuesRelations = relations(exerciseCues, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseCues.exerciseId],
    references: [exercises.id],
  }),
}));

export const exerciseMediaRelations = relations(exerciseMedia, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseMedia.exerciseId],
    references: [exercises.id],
  }),
}));

export const exerciseSubstitutionsRelations = relations(exerciseSubstitutions, ({ one }) => ({
  originalExercise: one(exercises, {
    fields: [exerciseSubstitutions.originalExerciseId],
    references: [exercises.id],
    relationName: 'originalExercise',
  }),
  substituteExercise: one(exercises, {
    fields: [exerciseSubstitutions.substituteExerciseId],
    references: [exercises.id],
    relationName: 'substituteExercise',
  }),
}));

export const exerciseBodyPartStressRelations = relations(exerciseBodyPartStress, ({ one }) => ({
  exercise: one(exercises, {
    fields: [exerciseBodyPartStress.exerciseId],
    references: [exercises.id],
  }),
}));

// Types
export type ExerciseMuscle = typeof exerciseMuscles.$inferSelect;
export type NewExerciseMuscle = typeof exerciseMuscles.$inferInsert;
export type ExerciseCue = typeof exerciseCues.$inferSelect;
export type NewExerciseCue = typeof exerciseCues.$inferInsert;
export type ExerciseMediaItem = typeof exerciseMedia.$inferSelect;
export type NewExerciseMediaItem = typeof exerciseMedia.$inferInsert;
export type ExerciseSubstitution = typeof exerciseSubstitutions.$inferSelect;
export type NewExerciseSubstitution = typeof exerciseSubstitutions.$inferInsert;
export type ExerciseBodyPartStressItem = typeof exerciseBodyPartStress.$inferSelect;
export type NewExerciseBodyPartStressItem = typeof exerciseBodyPartStress.$inferInsert;
