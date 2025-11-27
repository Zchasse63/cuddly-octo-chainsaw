import { pgTable, uuid, text, boolean, timestamp, integer, real, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Training type preference enum
export const trainingTypePreferenceEnum = pgEnum('training_type_preference', [
  'strength_only',
  'running_only',
  'hybrid',
  'crossfit',
  'undecided',
]);

// Primary goal enum
export const primaryGoalEnum = pgEnum('primary_goal', [
  'build_muscle',
  'lose_fat',
  'get_stronger',
  'improve_endurance',
  'run_5k',
  'run_10k',
  'run_half_marathon',
  'run_marathon',
  'general_fitness',
  'sport_performance',
  'body_recomposition',
]);

// User onboarding tracking
export const userOnboarding = pgTable('user_onboarding', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentStep: text('current_step').default('welcome'),
  stepsCompleted: text('steps_completed').array().default([]),
  isComplete: boolean('is_complete').default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Program questionnaire responses (premium feature)
export const programQuestionnaire = pgTable('program_questionnaire', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // ============================================
  // TRAINING TYPE & GOALS
  // ============================================

  trainingType: trainingTypePreferenceEnum('training_type').notNull(),
  primaryGoal: primaryGoalEnum('primary_goal').notNull(),
  secondaryGoals: text('secondary_goals').array(), // Additional goals

  // Specific targets
  targetWeight: real('target_weight'), // Body weight goal
  targetWeightUnit: text('target_weight_unit').default('lbs'),
  targetBodyFatPercent: real('target_body_fat_percent'),

  // Running targets (if applicable)
  targetRaceDistance: text('target_race_distance'), // '5k', '10k', 'half', 'marathon'
  targetRaceTime: integer('target_race_time'), // Seconds
  targetRaceDate: timestamp('target_race_date'),
  currentPace: real('current_pace'), // Current easy pace (min/km)

  // Strength targets (if applicable)
  targetBenchPress: real('target_bench_press'),
  targetSquat: real('target_squat'),
  targetDeadlift: real('target_deadlift'),

  // ============================================
  // AVAILABILITY & SCHEDULE
  // ============================================

  daysPerWeek: integer('days_per_week').notNull(), // 2-7
  preferredDays: integer('preferred_days').array(), // [0,1,2,3,4,5,6] - Sunday=0
  sessionDuration: integer('session_duration').notNull(), // Minutes per session
  preferredTimeOfDay: text('preferred_time_of_day'), // 'morning', 'afternoon', 'evening', 'flexible'

  // ============================================
  // EXPERIENCE & BACKGROUND
  // ============================================

  experienceLevel: text('experience_level').notNull(), // 'beginner', 'intermediate', 'advanced'
  yearsTraining: real('years_training'),

  // Strength background
  hasStrengthExperience: boolean('has_strength_experience').default(false),
  currentBenchPress: real('current_bench_press'),
  currentSquat: real('current_squat'),
  currentDeadlift: real('current_deadlift'),

  // Running background
  hasRunningExperience: boolean('has_running_experience').default(false),
  weeklyMileage: real('weekly_mileage'), // Current weekly mileage (km)
  longestRun: real('longest_run'), // Longest run ever (km)
  recentRaceTime: integer('recent_race_time'), // Most recent race time
  recentRaceDistance: text('recent_race_distance'),

  // ============================================
  // EQUIPMENT & ENVIRONMENT
  // ============================================

  trainingLocation: text('training_location'), // 'home', 'gym', 'outdoor', 'mixed'
  availableEquipment: text('available_equipment').array(), // ['barbell', 'dumbbell', 'kettlebell', etc.]
  hasCardioEquipment: boolean('has_cardio_equipment').default(false),
  cardioEquipment: text('cardio_equipment').array(), // ['treadmill', 'bike', 'rower']

  // Running environment
  runningEnvironment: text('running_environment'), // 'road', 'trail', 'track', 'treadmill', 'mixed'
  hasGpsWatch: boolean('has_gps_watch').default(false),
  hasHeartRateMonitor: boolean('has_heart_rate_monitor').default(false),

  // ============================================
  // HEALTH & LIMITATIONS
  // ============================================

  currentInjuries: text('current_injuries').array(),
  pastInjuries: text('past_injuries').array(),
  exercisesToAvoid: text('exercises_to_avoid').array(),
  healthConditions: text('health_conditions').array(),
  mobilityLimitations: text('mobility_limitations'),

  // ============================================
  // PREFERENCES
  // ============================================

  favoriteExercises: text('favorite_exercises').array(),
  dislikedExercises: text('disliked_exercises').array(),
  preferredRepRanges: text('preferred_rep_ranges'), // 'low' (1-5), 'medium' (6-12), 'high' (12+)
  preferredSplit: text('preferred_split'), // 'ppl', 'upper_lower', 'full_body', 'bro_split'

  // Running preferences
  preferredRunTypes: text('preferred_run_types').array(), // ['easy', 'tempo', 'intervals', 'long']

  // ============================================
  // LIFESTYLE FACTORS
  // ============================================

  sleepHours: real('sleep_hours'), // Average hours per night
  stressLevel: text('stress_level'), // 'low', 'medium', 'high'
  nutritionTracking: boolean('nutrition_tracking').default(false),
  supplementsUsed: text('supplements_used').array(),

  // ============================================
  // PROGRAM PREFERENCES
  // ============================================

  programDuration: integer('program_duration'), // Preferred program length in weeks
  wantsDeloadWeeks: boolean('wants_deload_weeks').default(true),
  deloadFrequency: integer('deload_frequency'), // Every N weeks
  wantsProgressiveOverload: boolean('wants_progressive_overload').default(true),
  wantsVariety: boolean('wants_variety').default(true), // Vary exercises or keep consistent

  // ============================================
  // ADDITIONAL CONTEXT
  // ============================================

  additionalNotes: text('additional_notes'), // Free-form user input
  previousProgramsUsed: text('previous_programs_used').array(), // Programs they've tried
  whatWorked: text('what_worked'), // What worked in the past
  whatDidntWork: text('what_didnt_work'), // What didn't work

  // ============================================
  // METADATA
  // ============================================

  isPremium: boolean('is_premium').default(false),
  version: integer('version').default(1), // Questionnaire version
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const userOnboardingRelations = relations(userOnboarding, ({ one }) => ({
  user: one(users, {
    fields: [userOnboarding.userId],
    references: [users.id],
  }),
}));

export const programQuestionnaireRelations = relations(programQuestionnaire, ({ one }) => ({
  user: one(users, {
    fields: [programQuestionnaire.userId],
    references: [users.id],
  }),
}));

// Types
export type UserOnboarding = typeof userOnboarding.$inferSelect;
export type NewUserOnboarding = typeof userOnboarding.$inferInsert;
export type ProgramQuestionnaireData = typeof programQuestionnaire.$inferSelect;
export type NewProgramQuestionnaireData = typeof programQuestionnaire.$inferInsert;
