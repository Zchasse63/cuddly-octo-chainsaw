import { pgTable, uuid, text, timestamp, pgEnum, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const muscleGroupEnum = pgEnum('muscle_group', [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
  'lower_back', 'traps', 'lats', 'full_body'
]);

export const movementPatternEnum = pgEnum('movement_pattern', [
  'push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'rotation', 'isolation'
]);

export const equipmentTypeEnum = pgEnum('equipment_type', [
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine',
  'bodyweight', 'bands', 'smith_machine', 'ez_bar', 'trap_bar'
]);

export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic info
  name: text('name').notNull(),
  description: text('description'),
  instructions: text('instructions'),

  // Classification
  primaryMuscle: muscleGroupEnum('primary_muscle').notNull(),
  secondaryMuscles: text('secondary_muscles').array(),
  movementPattern: movementPatternEnum('movement_pattern'),
  equipment: equipmentTypeEnum('equipment').array(),

  // Metadata
  difficulty: text('difficulty'), // beginner, intermediate, advanced
  isCompound: boolean('is_compound').default(false),
  isUnilateral: boolean('is_unilateral').default(false),

  // Search optimization (Upstash Search integration)
  synonyms: text('synonyms').array(), // Alternative names for fuzzy matching
  normalizedName: text('normalized_name'), // Lowercase, no special chars
  phoneticKey: text('phonetic_key'), // Soundex/Metaphone for fuzzy matching
  baseMovement: text('base_movement'), // e.g., 'press', 'curl', 'squat'

  // Exercise progressions
  parentExerciseId: uuid('parent_exercise_id'), // Self-reference for progressions
  progressionOrder: integer('progression_order'),

  // Upstash sync status
  upstashIndexed: boolean('upstash_indexed').default(false),

  // System
  isCustom: boolean('is_custom').default(false),
  createdByUserId: uuid('created_by_user_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Self-referential relation for exercise progressions
export const exercisesRelations = relations(exercises, ({ one }) => ({
  parentExercise: one(exercises, {
    fields: [exercises.parentExerciseId],
    references: [exercises.id],
    relationName: 'exerciseProgressions',
  }),
}));

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
