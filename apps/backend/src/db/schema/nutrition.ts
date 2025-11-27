import { pgTable, uuid, text, boolean, timestamp, real, integer, jsonb, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Nutrition data synced from Apple HealthKit / Terra API
// This is NOT for manual logging - all data comes from external sources

// Daily nutrition summary (aggregated from health sources)
export const nutritionSummaries = pgTable('nutrition_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Date for this summary
  date: date('date').notNull(),

  // Macros (synced from health sources)
  calories: integer('calories'),
  protein: real('protein'), // grams
  carbohydrates: real('carbohydrates'), // grams
  fat: real('fat'), // grams
  fiber: real('fiber'), // grams
  sugar: real('sugar'), // grams

  // Micronutrients (if available)
  sodium: real('sodium'), // mg
  potassium: real('potassium'), // mg
  calcium: real('calcium'), // mg
  iron: real('iron'), // mg
  vitaminA: real('vitamin_a'), // mcg
  vitaminC: real('vitamin_c'), // mg
  vitaminD: real('vitamin_d'), // mcg

  // Hydration
  waterMl: integer('water_ml'),
  caffeineMg: integer('caffeine_mg'),

  // Source tracking
  source: text('source').notNull(), // 'apple_health', 'terra', 'myfitnesspal', etc.
  lastSyncedAt: timestamp('last_synced_at'),
  rawData: jsonb('raw_data'), // Store original response for debugging

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User nutrition goals/targets
export const nutritionGoals = pgTable('nutrition_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Goal type
  goalType: text('goal_type').notNull(), // 'maintenance', 'cut', 'bulk', 'recomp'

  // Daily targets
  targetCalories: integer('target_calories'),
  targetProtein: real('target_protein'), // grams
  targetCarbohydrates: real('target_carbohydrates'), // grams
  targetFat: real('target_fat'), // grams
  targetFiber: real('target_fiber'), // grams
  targetWaterMl: integer('target_water_ml'),

  // Calculation method
  calculationMethod: text('calculation_method'), // 'tdee', 'manual', 'ai_recommended'
  tdeeEstimate: integer('tdee_estimate'),
  activityMultiplier: real('activity_multiplier'),

  // Active period
  isActive: boolean('is_active').default(true),
  startDate: date('start_date'),
  endDate: date('end_date'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Body measurements (synced from health sources)
export const bodyMeasurements = pgTable('body_measurements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Date of measurement
  date: date('date').notNull(),

  // Weight
  weightKg: real('weight_kg'),

  // Body composition (if available from smart scale)
  bodyFatPercent: real('body_fat_percent'),
  muscleMassKg: real('muscle_mass_kg'),
  boneMassKg: real('bone_mass_kg'),
  waterPercent: real('water_percent'),
  visceralFat: integer('visceral_fat'),
  metabolicAge: integer('metabolic_age'),
  bmr: integer('bmr'), // Basal metabolic rate

  // Circumferences (manual entry or from tape measure devices)
  waistCm: real('waist_cm'),
  hipsCm: real('hips_cm'),
  chestCm: real('chest_cm'),
  armCm: real('arm_cm'),
  thighCm: real('thigh_cm'),

  // Source
  source: text('source').notNull(), // 'apple_health', 'terra', 'manual', 'smart_scale'

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Terra API connection status
export const terraConnections = pgTable('terra_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Terra user ID
  terraUserId: text('terra_user_id').notNull(),

  // Connected provider
  provider: text('provider').notNull(), // 'garmin', 'fitbit', 'oura', 'whoop', 'polar', etc.

  // Connection status
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: text('sync_status'), // 'syncing', 'success', 'error'
  lastError: text('last_error'),

  // Scopes/permissions granted
  scopes: text('scopes').array(),

  // Webhook status
  webhookEnabled: boolean('webhook_enabled').default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const nutritionSummariesRelations = relations(nutritionSummaries, ({ one }) => ({
  user: one(users, {
    fields: [nutritionSummaries.userId],
    references: [users.id],
  }),
}));

export const nutritionGoalsRelations = relations(nutritionGoals, ({ one }) => ({
  user: one(users, {
    fields: [nutritionGoals.userId],
    references: [users.id],
  }),
}));

export const bodyMeasurementsRelations = relations(bodyMeasurements, ({ one }) => ({
  user: one(users, {
    fields: [bodyMeasurements.userId],
    references: [users.id],
  }),
}));

export const terraConnectionsRelations = relations(terraConnections, ({ one }) => ({
  user: one(users, {
    fields: [terraConnections.userId],
    references: [users.id],
  }),
}));

// Types
export type NutritionSummary = typeof nutritionSummaries.$inferSelect;
export type NewNutritionSummary = typeof nutritionSummaries.$inferInsert;
export type NutritionGoal = typeof nutritionGoals.$inferSelect;
export type NewNutritionGoal = typeof nutritionGoals.$inferInsert;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert;
export type TerraConnection = typeof terraConnections.$inferSelect;
export type NewTerraConnection = typeof terraConnections.$inferInsert;
