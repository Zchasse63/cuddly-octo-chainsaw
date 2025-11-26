import { pgTable, uuid, text, timestamp, pgEnum, boolean, real } from 'drizzle-orm/pg-core';

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

  // Search optimization
  synonyms: text('synonyms').array(), // Alternative names for fuzzy matching
  embedding: real('embedding').array(), // Vector for semantic search

  // System
  isCustom: boolean('is_custom').default(false),
  createdByUserId: uuid('created_by_user_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
