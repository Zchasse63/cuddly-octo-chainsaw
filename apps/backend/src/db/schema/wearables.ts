import { pgTable, uuid, text, boolean, timestamp, real, integer, jsonb, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Apple Health connection and sync status
export const appleHealthConnections = pgTable('apple_health_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Connection status
  isConnected: boolean('is_connected').default(false),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: text('sync_status'), // 'syncing', 'success', 'error', 'pending'
  lastError: text('last_error'),

  // Permissions granted
  permissions: jsonb('permissions'), // { steps: true, heartRate: true, sleep: true, nutrition: true, workouts: true }

  // Sync preferences
  syncWorkouts: boolean('sync_workouts').default(true),
  syncNutrition: boolean('sync_nutrition').default(true),
  syncSleep: boolean('sync_sleep').default(true),
  syncHeartRate: boolean('sync_heart_rate').default(true),
  syncSteps: boolean('sync_steps').default(true),
  syncBodyMeasurements: boolean('sync_body_measurements').default(true),

  // Device info
  deviceModel: text('device_model'),
  watchModel: text('watch_model'),
  osVersion: text('os_version'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Daily health metrics from wearables
export const dailyHealthMetrics = pgTable('daily_health_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),

  // Activity
  steps: integer('steps'),
  activeMinutes: integer('active_minutes'),
  activeCalories: integer('active_calories'),
  totalCalories: integer('total_calories'),
  distanceMeters: real('distance_meters'),
  floorsClimbed: integer('floors_climbed'),

  // Heart rate
  restingHeartRate: integer('resting_heart_rate'),
  avgHeartRate: integer('avg_heart_rate'),
  maxHeartRate: integer('max_heart_rate'),
  minHeartRate: integer('min_heart_rate'),
  heartRateVariability: real('heart_rate_variability'), // ms

  // Respiratory
  respiratoryRate: real('respiratory_rate'),
  oxygenSaturation: real('oxygen_saturation'),

  // Sleep summary (detailed in separate table)
  sleepHours: real('sleep_hours'),
  sleepQualityScore: integer('sleep_quality_score'), // 0-100

  // Stress/Recovery
  stressLevel: integer('stress_level'), // 0-100
  recoveryScore: integer('recovery_score'), // 0-100
  bodyBattery: integer('body_battery'), // Garmin-style 0-100

  // Menstrual tracking (if applicable)
  menstrualPhase: text('menstrual_phase'),

  // Source
  source: text('source').notNull(), // 'apple_health', 'terra', 'garmin', 'fitbit', etc.
  rawData: jsonb('raw_data'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Detailed sleep data
export const sleepSessions = pgTable('sleep_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Timing
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  date: date('date').notNull(), // Date the sleep is attributed to

  // Duration
  totalMinutes: integer('total_minutes'),
  timeInBed: integer('time_in_bed'),
  timeToFallAsleep: integer('time_to_fall_asleep'),

  // Sleep stages (minutes)
  awakeMinutes: integer('awake_minutes'),
  remMinutes: integer('rem_minutes'),
  lightMinutes: integer('light_minutes'),
  deepMinutes: integer('deep_minutes'),

  // Quality metrics
  sleepEfficiency: real('sleep_efficiency'), // Percentage of time asleep vs in bed
  sleepScore: integer('sleep_score'), // 0-100
  awakenings: integer('awakenings'),

  // Heart rate during sleep
  avgHeartRate: integer('avg_heart_rate'),
  minHeartRate: integer('min_heart_rate'),
  hrvDuringSleep: real('hrv_during_sleep'),

  // Respiratory
  avgRespiratoryRate: real('avg_respiratory_rate'),
  oxygenSaturationAvg: real('oxygen_saturation_avg'),

  // Source
  source: text('source').notNull(),
  externalId: text('external_id'),
  rawData: jsonb('raw_data'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Heart rate samples (for detailed analysis)
export const heartRateSamples = pgTable('heart_rate_samples', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Timestamp
  timestamp: timestamp('timestamp').notNull(),

  // Value
  heartRate: integer('heart_rate').notNull(),
  motionContext: text('motion_context'), // 'sedentary', 'walking', 'running', 'workout'

  // Source
  source: text('source').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Workout sessions synced from wearables
export const wearableWorkouts = pgTable('wearable_workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // External reference
  externalId: text('external_id').notNull(),
  source: text('source').notNull(), // 'apple_health', 'garmin', 'fitbit', etc.

  // Workout details
  activityType: text('activity_type').notNull(), // 'strength_training', 'running', 'cycling', 'swimming', etc.
  name: text('name'),

  // Timing
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  durationMinutes: integer('duration_minutes'),

  // Metrics
  activeCalories: integer('active_calories'),
  totalCalories: integer('total_calories'),
  avgHeartRate: integer('avg_heart_rate'),
  maxHeartRate: integer('max_heart_rate'),
  distanceMeters: real('distance_meters'),

  // GPS data (for outdoor activities)
  routePolyline: text('route_polyline'),
  elevationGain: real('elevation_gain'),

  // Raw data
  rawData: jsonb('raw_data'),

  // Link to VoiceFit workout (if matched)
  linkedWorkoutId: uuid('linked_workout_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Sync queue for processing wearable data
export const wearableSyncQueue = pgTable('wearable_sync_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Sync details
  syncType: text('sync_type').notNull(), // 'full', 'incremental', 'webhook'
  dataTypes: text('data_types').array(), // ['sleep', 'heart_rate', 'workouts']
  source: text('source').notNull(),

  // Status
  status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),

  // Date range
  fromDate: timestamp('from_date'),
  toDate: timestamp('to_date'),

  // Results
  recordsProcessed: integer('records_processed'),
  recordsFailed: integer('records_failed'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const appleHealthConnectionsRelations = relations(appleHealthConnections, ({ one }) => ({
  user: one(users, {
    fields: [appleHealthConnections.userId],
    references: [users.id],
  }),
}));

export const dailyHealthMetricsRelations = relations(dailyHealthMetrics, ({ one }) => ({
  user: one(users, {
    fields: [dailyHealthMetrics.userId],
    references: [users.id],
  }),
}));

export const sleepSessionsRelations = relations(sleepSessions, ({ one }) => ({
  user: one(users, {
    fields: [sleepSessions.userId],
    references: [users.id],
  }),
}));

export const heartRateSamplesRelations = relations(heartRateSamples, ({ one }) => ({
  user: one(users, {
    fields: [heartRateSamples.userId],
    references: [users.id],
  }),
}));

export const wearableWorkoutsRelations = relations(wearableWorkouts, ({ one }) => ({
  user: one(users, {
    fields: [wearableWorkouts.userId],
    references: [users.id],
  }),
}));

export const wearableSyncQueueRelations = relations(wearableSyncQueue, ({ one }) => ({
  user: one(users, {
    fields: [wearableSyncQueue.userId],
    references: [users.id],
  }),
}));

// Types
export type AppleHealthConnection = typeof appleHealthConnections.$inferSelect;
export type NewAppleHealthConnection = typeof appleHealthConnections.$inferInsert;
export type DailyHealthMetric = typeof dailyHealthMetrics.$inferSelect;
export type NewDailyHealthMetric = typeof dailyHealthMetrics.$inferInsert;
export type SleepSession = typeof sleepSessions.$inferSelect;
export type NewSleepSession = typeof sleepSessions.$inferInsert;
export type HeartRateSample = typeof heartRateSamples.$inferSelect;
export type NewHeartRateSample = typeof heartRateSamples.$inferInsert;
export type WearableWorkout = typeof wearableWorkouts.$inferSelect;
export type NewWearableWorkout = typeof wearableWorkouts.$inferInsert;
export type WearableSyncQueueItem = typeof wearableSyncQueue.$inferSelect;
export type NewWearableSyncQueueItem = typeof wearableSyncQueue.$inferInsert;
