import { pgTable, uuid, text, timestamp, real, integer, jsonb, date, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { exercises } from './exercises';

// Daily workout analytics (pre-aggregated)
export const dailyWorkoutAnalytics = pgTable('daily_workout_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),

  // Workout counts
  workoutCount: integer('workout_count').default(0),
  totalDurationMinutes: integer('total_duration_minutes').default(0),

  // Volume metrics
  totalVolume: real('total_volume').default(0), // weight * reps
  totalSets: integer('total_sets').default(0),
  totalReps: integer('total_reps').default(0),

  // Muscle group distribution
  muscleGroupBreakdown: jsonb('muscle_group_breakdown'), // { chest: 30, back: 25, ... }

  // Exercise counts
  exerciseCount: integer('exercise_count').default(0),
  uniqueExercises: integer('unique_exercises').default(0),

  // PR counts
  prCount: integer('pr_count').default(0),

  // Cardio metrics (if applicable)
  cardioMinutes: integer('cardio_minutes').default(0),
  caloriesBurned: integer('calories_burned'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Weekly analytics rollup
export const weeklyAnalytics = pgTable('weekly_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(), // Monday of the week
  year: integer('year').notNull(),
  weekNumber: integer('week_number').notNull(),

  // Workout summary
  workoutCount: integer('workout_count').default(0),
  totalDurationMinutes: integer('total_duration_minutes').default(0),
  avgWorkoutDuration: real('avg_workout_duration'),

  // Volume
  totalVolume: real('total_volume').default(0),
  volumeChange: real('volume_change'), // Percentage change from previous week

  // Training frequency
  trainingDays: integer('training_days').default(0),

  // Muscle balance score (0-100)
  muscleBalanceScore: integer('muscle_balance_score'),
  muscleGroupBreakdown: jsonb('muscle_group_breakdown'),

  // Progress indicators
  prCount: integer('pr_count').default(0),
  estimatedWeeklyTSS: real('estimated_weekly_tss'), // Training stress score

  // Consistency
  plannedVsCompleted: real('planned_vs_completed'), // Percentage

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Exercise-specific analytics (per user)
export const exerciseAnalytics = pgTable('exercise_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),

  // Lifetime stats
  totalSets: integer('total_sets').default(0),
  totalReps: integer('total_reps').default(0),
  totalVolume: real('total_volume').default(0),
  timesPerformed: integer('times_performed').default(0),

  // Current bests
  currentMax1rm: real('current_max_1rm'),
  currentMaxWeight: real('current_max_weight'),
  currentMaxReps: integer('current_max_reps'),
  currentMaxVolume: real('current_max_volume'),

  // Averages
  avgWeight: real('avg_weight'),
  avgReps: real('avg_reps'),
  avgRpe: real('avg_rpe'),

  // Trends
  weightTrend: text('weight_trend'), // 'increasing', 'stable', 'decreasing'
  volumeTrend: text('volume_trend'),
  last30DaysVolume: real('last_30_days_volume'),
  last30DaysSets: integer('last_30_days_sets'),

  // History for charts (last 20 sessions)
  recentHistory: jsonb('recent_history'), // [{ date, maxWeight, totalVolume, avgRpe }]

  // Frequency
  avgDaysBetweenSessions: real('avg_days_between_sessions'),
  lastPerformedAt: timestamp('last_performed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Training load and recovery metrics
export const trainingLoad = pgTable('training_load', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),

  // Daily load
  dailyLoad: real('daily_load'), // Calculated training stress
  rpeLoad: real('rpe_load'), // Session RPE * duration

  // Acute/Chronic load
  acuteLoad: real('acute_load'), // 7-day rolling average
  chronicLoad: real('chronic_load'), // 28-day rolling average
  acuteChronicRatio: real('acute_chronic_ratio'), // ACR / Training readiness indicator

  // Strain and recovery
  strainScore: real('strain_score'), // 0-21 scale
  recoveryScore: real('recovery_score'), // 0-100

  // Heart rate metrics (from wearables)
  restingHr: integer('resting_hr'),
  hrvScore: real('hrv_score'),

  // Sleep (from wearables)
  sleepHours: real('sleep_hours'),
  sleepQuality: integer('sleep_quality'), // 0-100

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Body part volume tracking (for muscle balance)
export const bodyPartVolume = pgTable('body_part_volume', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  weekStart: date('week_start').notNull(),

  // Volume per muscle group (sets)
  chestSets: integer('chest_sets').default(0),
  backSets: integer('back_sets').default(0),
  shoulderSets: integer('shoulder_sets').default(0),
  bicepSets: integer('bicep_sets').default(0),
  tricepSets: integer('tricep_sets').default(0),
  quadSets: integer('quad_sets').default(0),
  hamstringSets: integer('hamstring_sets').default(0),
  gluteSets: integer('glute_sets').default(0),
  calfSets: integer('calf_sets').default(0),
  abSets: integer('ab_sets').default(0),

  // Recommendations
  undertrainedGroups: text('undertrained_groups').array(),
  overtrainedGroups: text('overtrained_groups').array(),
  balanceScore: integer('balance_score'), // 0-100

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AI-generated insights
export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Insight details
  insightType: text('insight_type').notNull(), // 'volume_recommendation', 'form_tip', 'recovery_alert', 'pr_prediction', 'plateau_warning'
  category: text('category'), // 'training', 'recovery', 'nutrition', 'progress'
  priority: text('priority').default('normal'), // 'low', 'normal', 'high', 'urgent'

  // Content
  title: text('title').notNull(),
  content: text('content').notNull(),
  actionable: text('actionable'), // Specific action user can take

  // Context
  relatedExerciseId: uuid('related_exercise_id')
    .references(() => exercises.id, { onDelete: 'set null' }),
  dataPoints: jsonb('data_points'), // Supporting data for the insight

  // Status
  isRead: boolean('is_read').default(false),
  isDismissed: boolean('is_dismissed').default(false),
  isActedOn: boolean('is_acted_on').default(false),

  // Validity
  validUntil: timestamp('valid_until'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Goal tracking
export const userGoals = pgTable('user_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Goal details
  goalType: text('goal_type').notNull(), // 'strength', 'weight_loss', 'muscle_gain', 'endurance', 'consistency'
  title: text('title').notNull(),
  description: text('description'),

  // Target
  targetValue: real('target_value'),
  targetUnit: text('target_unit'),
  exerciseId: uuid('exercise_id')
    .references(() => exercises.id, { onDelete: 'set null' }),

  // Progress
  currentValue: real('current_value'),
  startValue: real('start_value'),
  progressPercent: real('progress_percent').default(0),

  // Timeline
  startDate: date('start_date'),
  targetDate: date('target_date'),

  // Status
  status: text('status').default('active'), // 'active', 'completed', 'paused', 'failed'
  completedAt: timestamp('completed_at'),

  // AI predictions
  predictedCompletionDate: date('predicted_completion_date'),
  onTrack: boolean('on_track'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const dailyWorkoutAnalyticsRelations = relations(dailyWorkoutAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [dailyWorkoutAnalytics.userId],
    references: [users.id],
  }),
}));

export const weeklyAnalyticsRelations = relations(weeklyAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [weeklyAnalytics.userId],
    references: [users.id],
  }),
}));

export const exerciseAnalyticsRelations = relations(exerciseAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [exerciseAnalytics.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [exerciseAnalytics.exerciseId],
    references: [exercises.id],
  }),
}));

export const trainingLoadRelations = relations(trainingLoad, ({ one }) => ({
  user: one(users, {
    fields: [trainingLoad.userId],
    references: [users.id],
  }),
}));

export const bodyPartVolumeRelations = relations(bodyPartVolume, ({ one }) => ({
  user: one(users, {
    fields: [bodyPartVolume.userId],
    references: [users.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  user: one(users, {
    fields: [aiInsights.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [aiInsights.relatedExerciseId],
    references: [exercises.id],
  }),
}));

export const userGoalsRelations = relations(userGoals, ({ one }) => ({
  user: one(users, {
    fields: [userGoals.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [userGoals.exerciseId],
    references: [exercises.id],
  }),
}));

// Types
export type DailyWorkoutAnalytic = typeof dailyWorkoutAnalytics.$inferSelect;
export type NewDailyWorkoutAnalytic = typeof dailyWorkoutAnalytics.$inferInsert;
export type WeeklyAnalytic = typeof weeklyAnalytics.$inferSelect;
export type NewWeeklyAnalytic = typeof weeklyAnalytics.$inferInsert;
export type ExerciseAnalytic = typeof exerciseAnalytics.$inferSelect;
export type NewExerciseAnalytic = typeof exerciseAnalytics.$inferInsert;
export type TrainingLoadEntry = typeof trainingLoad.$inferSelect;
export type NewTrainingLoadEntry = typeof trainingLoad.$inferInsert;
export type BodyPartVolumeEntry = typeof bodyPartVolume.$inferSelect;
export type NewBodyPartVolumeEntry = typeof bodyPartVolume.$inferInsert;
export type AiInsight = typeof aiInsights.$inferSelect;
export type NewAiInsight = typeof aiInsights.$inferInsert;
export type UserGoal = typeof userGoals.$inferSelect;
export type NewUserGoal = typeof userGoals.$inferInsert;
