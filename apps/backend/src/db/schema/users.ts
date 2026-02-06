import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const experienceLevelEnum = pgEnum('experience_level', ['beginner', 'intermediate', 'advanced']);
export const tierEnum = pgEnum('tier', ['free', 'premium', 'coach']);
export const themeEnum = pgEnum('theme', ['light', 'dark', 'auto']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),

  // Basic info
  name: text('name'),
  avatarUrl: text('avatar_url'),

  // Experience and goals
  experienceLevel: experienceLevelEnum('experience_level').default('beginner'),
  goals: text('goals').array(),

  // Training preferences
  trainingFrequency: text('training_frequency'), // e.g., "4 days/week"
  preferredEquipment: text('preferred_equipment').array(),
  favoriteExercises: text('favorite_exercises').array(),
  exercisesToAvoid: text('exercises_to_avoid').array(),

  // Health
  injuries: text('injuries'),

  // App settings
  tier: tierEnum('tier').default('free'),
  theme: themeEnum('theme').default('auto'),
  preferredWeightUnit: text('preferred_weight_unit').default('lbs'),
  notificationsEnabled: boolean('notifications_enabled').default(true),

  // Onboarding
  onboardingCompleted: boolean('onboarding_completed').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User preferences for notifications
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  pushNotifications: boolean('push_notifications').default(true).notNull(),
  smsNotifications: boolean('sms_notifications').default(false).notNull(),
  weeklyDigest: boolean('weekly_digest').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
