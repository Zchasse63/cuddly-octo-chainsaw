import { pgTable, uuid, text, boolean, timestamp, real, integer, jsonb, date, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Running activity types
export const runTypeEnum = pgEnum('run_type', [
  'easy', 'tempo', 'interval', 'long_run', 'recovery', 'fartlek', 'hill', 'race'
]);

// Running activities (individual runs)
export const runningActivities = pgTable('running_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Activity details
  runType: runTypeEnum('run_type').default('easy'),
  name: text('name'),
  notes: text('notes'),

  // Metrics
  distanceMeters: real('distance_meters'),
  durationSeconds: integer('duration_seconds'),
  avgPaceSecondsPerKm: real('avg_pace_seconds_per_km'),
  avgHeartRate: integer('avg_heart_rate'),
  maxHeartRate: integer('max_heart_rate'),
  elevationGainMeters: real('elevation_gain_meters'),
  caloriesBurned: integer('calories_burned'),

  // Calculated metrics
  avgCadence: integer('avg_cadence'),
  avgStrideLength: real('avg_stride_length'),

  // Splits data (per km/mile)
  splits: jsonb('splits'), // [{ distance: 1000, time: 300, pace: 300, heartRate: 150 }]

  // GPS data
  routePolyline: text('route_polyline'), // Encoded polyline
  startLatitude: real('start_latitude'),
  startLongitude: real('start_longitude'),

  // Source
  source: text('source').default('manual'), // 'manual', 'apple_health', 'garmin', 'strava', 'terra'
  externalId: text('external_id'), // ID from external source

  // Training program reference
  programId: uuid('program_id'),
  programWeek: integer('program_week'),
  programDay: integer('program_day'),

  // Timestamps
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Running programs (training plans)
export const runningPrograms = pgTable('running_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' }),

  // Program details
  name: text('name').notNull(),
  description: text('description'),
  goal: text('goal'), // '5k', '10k', 'half_marathon', 'marathon', 'general_fitness'
  targetRaceDate: date('target_race_date'),
  targetTime: integer('target_time'), // Target finish time in seconds

  // Duration
  durationWeeks: integer('duration_weeks').notNull(),
  currentWeek: integer('current_week').default(1),

  // Status
  status: text('status').default('active'), // 'active', 'completed', 'paused', 'cancelled'
  startDate: date('start_date'),
  endDate: date('end_date'),

  // Template reference (if using a template)
  templateId: uuid('template_id'),
  isTemplate: boolean('is_template').default(false),
  isPublic: boolean('is_public').default(false),

  // Metadata
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Running program workouts (scheduled runs)
export const runningProgramWorkouts = pgTable('running_program_workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id')
    .notNull()
    .references(() => runningPrograms.id, { onDelete: 'cascade' }),

  // Schedule
  weekNumber: integer('week_number').notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0-6, Sunday = 0

  // Workout details
  runType: runTypeEnum('run_type').notNull(),
  name: text('name'),
  description: text('description'),

  // Targets
  targetDistanceMeters: real('target_distance_meters'),
  targetDurationSeconds: integer('target_duration_seconds'),
  targetPaceMin: real('target_pace_min'), // seconds per km
  targetPaceMax: real('target_pace_max'),
  targetHeartRateZone: text('target_heart_rate_zone'), // 'zone1', 'zone2', etc.

  // Intervals (for interval workouts)
  intervals: jsonb('intervals'), // [{ type: 'work', duration: 60, pace: 240 }, { type: 'rest', duration: 90 }]

  // Completion tracking
  isCompleted: boolean('is_completed').default(false),
  completedActivityId: uuid('completed_activity_id')
    .references(() => runningActivities.id, { onDelete: 'set null' }),
  completedAt: timestamp('completed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Running PRs (personal records)
export const runningPRs = pgTable('running_prs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  activityId: uuid('activity_id')
    .references(() => runningActivities.id, { onDelete: 'set null' }),

  // PR type and value
  prType: text('pr_type').notNull(), // '1k', '1mi', '5k', '10k', 'half_marathon', 'marathon', 'longest_run'
  timeSeconds: integer('time_seconds'), // For timed PRs
  distanceMeters: real('distance_meters'), // For distance PRs

  // Comparison
  previousPrId: uuid('previous_pr_id'),
  improvementSeconds: integer('improvement_seconds'),
  improvementPercent: real('improvement_percent'),

  achievedAt: timestamp('achieved_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Heart rate zones configuration
export const heartRateZones = pgTable('heart_rate_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Zone configuration
  maxHeartRate: integer('max_heart_rate').notNull(),
  restingHeartRate: integer('resting_heart_rate'),

  // Zone boundaries (as percentage of max HR)
  zone1Min: integer('zone1_min').default(50),
  zone1Max: integer('zone1_max').default(60),
  zone2Min: integer('zone2_min').default(60),
  zone2Max: integer('zone2_max').default(70),
  zone3Min: integer('zone3_min').default(70),
  zone3Max: integer('zone3_max').default(80),
  zone4Min: integer('zone4_min').default(80),
  zone4Max: integer('zone4_max').default(90),
  zone5Min: integer('zone5_min').default(90),
  zone5Max: integer('zone5_max').default(100),

  // Source
  source: text('source').default('calculated'), // 'calculated', 'manual', 'fitness_test'

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const runningActivitiesRelations = relations(runningActivities, ({ one }) => ({
  user: one(users, {
    fields: [runningActivities.userId],
    references: [users.id],
  }),
  program: one(runningPrograms, {
    fields: [runningActivities.programId],
    references: [runningPrograms.id],
  }),
}));

export const runningProgramsRelations = relations(runningPrograms, ({ one, many }) => ({
  user: one(users, {
    fields: [runningPrograms.userId],
    references: [users.id],
  }),
  workouts: many(runningProgramWorkouts),
}));

export const runningProgramWorkoutsRelations = relations(runningProgramWorkouts, ({ one }) => ({
  program: one(runningPrograms, {
    fields: [runningProgramWorkouts.programId],
    references: [runningPrograms.id],
  }),
  completedActivity: one(runningActivities, {
    fields: [runningProgramWorkouts.completedActivityId],
    references: [runningActivities.id],
  }),
}));

export const runningPRsRelations = relations(runningPRs, ({ one }) => ({
  user: one(users, {
    fields: [runningPRs.userId],
    references: [users.id],
  }),
  activity: one(runningActivities, {
    fields: [runningPRs.activityId],
    references: [runningActivities.id],
  }),
}));

export const heartRateZonesRelations = relations(heartRateZones, ({ one }) => ({
  user: one(users, {
    fields: [heartRateZones.userId],
    references: [users.id],
  }),
}));

// Types
export type RunningActivity = typeof runningActivities.$inferSelect;
export type NewRunningActivity = typeof runningActivities.$inferInsert;
export type RunningProgram = typeof runningPrograms.$inferSelect;
export type NewRunningProgram = typeof runningPrograms.$inferInsert;
export type RunningProgramWorkout = typeof runningProgramWorkouts.$inferSelect;
export type NewRunningProgramWorkout = typeof runningProgramWorkouts.$inferInsert;
export type RunningPR = typeof runningPRs.$inferSelect;
export type NewRunningPR = typeof runningPRs.$inferInsert;
export type HeartRateZone = typeof heartRateZones.$inferSelect;
export type NewHeartRateZone = typeof heartRateZones.$inferInsert;
