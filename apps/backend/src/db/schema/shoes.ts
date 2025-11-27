import { pgTable, uuid, text, boolean, timestamp, real, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { runningActivities } from './running';

// Running shoes tracking
export const runningShoes = pgTable('running_shoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Shoe details
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  nickname: text('nickname'), // User-friendly name like "Daily Trainer"
  color: text('color'),
  size: text('size'),

  // Purchase info
  purchaseDate: timestamp('purchase_date'),
  purchasePrice: real('purchase_price'),
  purchaseLocation: text('purchase_location'),

  // Mileage tracking
  initialMileage: real('initial_mileage').default(0), // Miles already on shoe when added
  totalMileageMeters: real('total_mileage_meters').default(0), // Tracked mileage
  replacementThresholdMeters: real('replacement_threshold_meters').default(643738), // Default 400 miles in meters

  // Status
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  retiredAt: timestamp('retired_at'),
  retiredReason: text('retired_reason'),

  // Notes
  notes: text('notes'),

  // Activity count
  totalRuns: integer('total_runs').default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Running activity shoe link (for activities with a shoe)
export const runningActivityShoes = pgTable('running_activity_shoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id')
    .notNull()
    .references(() => runningActivities.id, { onDelete: 'cascade' }),
  shoeId: uuid('shoe_id')
    .notNull()
    .references(() => runningShoes.id, { onDelete: 'cascade' }),
  distanceMeters: real('distance_meters'), // Distance credited to this shoe for this run
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const runningShoesRelations = relations(runningShoes, ({ one, many }) => ({
  user: one(users, {
    fields: [runningShoes.userId],
    references: [users.id],
  }),
  activityLinks: many(runningActivityShoes),
}));

export const runningActivityShoesRelations = relations(runningActivityShoes, ({ one }) => ({
  activity: one(runningActivities, {
    fields: [runningActivityShoes.activityId],
    references: [runningActivities.id],
  }),
  shoe: one(runningShoes, {
    fields: [runningActivityShoes.shoeId],
    references: [runningShoes.id],
  }),
}));

// Types
export type RunningShoe = typeof runningShoes.$inferSelect;
export type NewRunningShoe = typeof runningShoes.$inferInsert;
export type RunningActivityShoe = typeof runningActivityShoes.$inferSelect;
export type NewRunningActivityShoe = typeof runningActivityShoes.$inferInsert;

// Constants
export const DEFAULT_REPLACEMENT_MILES = 400;
export const METERS_PER_MILE = 1609.34;
export const DEFAULT_REPLACEMENT_METERS = DEFAULT_REPLACEMENT_MILES * METERS_PER_MILE;
