import { pgTable, uuid, text, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// PowerSync bucket definitions
// These tables support offline-first sync via PowerSync

// Sync checkpoints per user (tracks sync state)
export const syncCheckpoints = pgTable('sync_checkpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Checkpoint data
  bucketName: text('bucket_name').notNull(), // 'workouts', 'exercises', 'sets', etc.
  lastSyncedAt: timestamp('last_synced_at'),
  lastSyncedOpId: text('last_synced_op_id'), // PowerSync operation ID
  syncVersion: integer('sync_version').default(0),

  // Status
  syncStatus: text('sync_status').default('synced'), // 'synced', 'pending', 'syncing', 'error'
  lastError: text('last_error'),
  retryCount: integer('retry_count').default(0),

  // Metadata
  deviceId: text('device_id'),
  deviceInfo: jsonb('device_info'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Pending sync operations (for conflict resolution)
export const pendingSyncOps = pgTable('pending_sync_ops', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Operation details
  opType: text('op_type').notNull(), // 'insert', 'update', 'delete'
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id').notNull(),

  // Data
  localData: jsonb('local_data'), // Data from client
  serverData: jsonb('server_data'), // Data from server (for conflicts)
  mergedData: jsonb('merged_data'), // Result of conflict resolution

  // Conflict handling
  hasConflict: boolean('has_conflict').default(false),
  conflictResolution: text('conflict_resolution'), // 'client_wins', 'server_wins', 'merged', 'manual'
  resolvedAt: timestamp('resolved_at'),

  // Status
  status: text('status').default('pending'), // 'pending', 'applied', 'failed', 'conflict'

  // Timestamps
  clientTimestamp: timestamp('client_timestamp'),
  serverTimestamp: timestamp('server_timestamp'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Sync audit log (for debugging)
export const syncAuditLog = pgTable('sync_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Event details
  eventType: text('event_type').notNull(), // 'sync_started', 'sync_completed', 'conflict_detected', 'error'
  tableName: text('table_name'),
  recordId: uuid('record_id'),

  // Details
  details: jsonb('details'),
  errorMessage: text('error_message'),

  // Client info
  deviceId: text('device_id'),
  appVersion: text('app_version'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Device registrations (for push notifications and sync)
export const deviceRegistrations = pgTable('device_registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Device identification
  deviceId: text('device_id').notNull(),
  deviceName: text('device_name'),
  deviceModel: text('device_model'),
  osName: text('os_name'), // 'ios', 'android'
  osVersion: text('os_version'),
  appVersion: text('app_version'),

  // Push notifications
  pushToken: text('push_token'),
  pushProvider: text('push_provider'), // 'apns', 'fcm'
  pushEnabled: boolean('push_enabled').default(true),

  // Sync settings
  syncEnabled: boolean('sync_enabled').default(true),
  lastActiveAt: timestamp('last_active_at'),

  // Status
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Offline queue (operations performed while offline)
export const offlineQueue = pgTable('offline_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull(),

  // Operation details
  operationType: text('operation_type').notNull(), // 'create', 'update', 'delete'
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id').notNull(),
  payload: jsonb('payload').notNull(),

  // Ordering
  sequenceNumber: integer('sequence_number').notNull(),
  clientTimestamp: timestamp('client_timestamp').notNull(),

  // Processing status
  status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed'
  processedAt: timestamp('processed_at'),
  error: text('error'),
  retryCount: integer('retry_count').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const syncCheckpointsRelations = relations(syncCheckpoints, ({ one }) => ({
  user: one(users, {
    fields: [syncCheckpoints.userId],
    references: [users.id],
  }),
}));

export const pendingSyncOpsRelations = relations(pendingSyncOps, ({ one }) => ({
  user: one(users, {
    fields: [pendingSyncOps.userId],
    references: [users.id],
  }),
}));

export const syncAuditLogRelations = relations(syncAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [syncAuditLog.userId],
    references: [users.id],
  }),
}));

export const deviceRegistrationsRelations = relations(deviceRegistrations, ({ one }) => ({
  user: one(users, {
    fields: [deviceRegistrations.userId],
    references: [users.id],
  }),
}));

export const offlineQueueRelations = relations(offlineQueue, ({ one }) => ({
  user: one(users, {
    fields: [offlineQueue.userId],
    references: [users.id],
  }),
}));

// Types
export type SyncCheckpoint = typeof syncCheckpoints.$inferSelect;
export type NewSyncCheckpoint = typeof syncCheckpoints.$inferInsert;
export type PendingSyncOp = typeof pendingSyncOps.$inferSelect;
export type NewPendingSyncOp = typeof pendingSyncOps.$inferInsert;
export type SyncAuditLogEntry = typeof syncAuditLog.$inferSelect;
export type NewSyncAuditLogEntry = typeof syncAuditLog.$inferInsert;
export type DeviceRegistration = typeof deviceRegistrations.$inferSelect;
export type NewDeviceRegistration = typeof deviceRegistrations.$inferInsert;
export type OfflineQueueItem = typeof offlineQueue.$inferSelect;
export type NewOfflineQueueItem = typeof offlineQueue.$inferInsert;
