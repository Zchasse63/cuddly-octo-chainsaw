/**
 * Coach-Client Relationship Schema
 *
 * Manages relationships between coaches and their clients,
 * including assignment status, notes, and permissions.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Coach-client relationship status enum
export const coachClientStatusEnum = pgEnum('coach_client_status', [
  'pending',    // Invitation sent, awaiting acceptance
  'active',     // Active coaching relationship
  'inactive',   // Paused/on hold
  'terminated', // Ended relationship
]);

// Coach note category enum
export const coachNoteCategoryEnum = pgEnum('coach_note_category', [
  'general',
  'workout',
  'nutrition',
  'injury',
  'progress',
  'goal',
  'check_in',
]);

// ============================================
// COACH-CLIENT RELATIONSHIPS
// ============================================

export const coachClients = pgTable('coach_clients', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Relationship parties
  coachId: uuid('coach_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Status
  status: coachClientStatusEnum('status').default('pending').notNull(),

  // Assignment metadata
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  acceptedAt: timestamp('accepted_at'),
  terminatedAt: timestamp('terminated_at'),
  terminationReason: text('termination_reason'),

  // Coach's private notes about this relationship
  relationshipNotes: text('relationship_notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// COACH NOTES
// ============================================

export const coachNotes = pgTable('coach_notes', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Ownership
  coachId: uuid('coach_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Content
  title: text('title'),
  content: text('content').notNull(),
  category: coachNoteCategoryEnum('category').default('general'),

  // Organization
  isPinned: boolean('is_pinned').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// RELATIONS
// ============================================

export const coachClientsRelations = relations(coachClients, ({ one }) => ({
  coach: one(users, {
    fields: [coachClients.coachId],
    references: [users.id],
    relationName: 'coachRelationships',
  }),
  client: one(users, {
    fields: [coachClients.clientId],
    references: [users.id],
    relationName: 'clientRelationships',
  }),
  assignedByUser: one(users, {
    fields: [coachClients.assignedBy],
    references: [users.id],
    relationName: 'assignedByRelationships',
  }),
}));

export const coachNotesRelations = relations(coachNotes, ({ one }) => ({
  coach: one(users, {
    fields: [coachNotes.coachId],
    references: [users.id],
    relationName: 'coachNotesByCoach',
  }),
  client: one(users, {
    fields: [coachNotes.clientId],
    references: [users.id],
    relationName: 'coachNotesAboutClient',
  }),
}));

// ============================================
// TYPES
// ============================================

export type CoachClient = typeof coachClients.$inferSelect;
export type NewCoachClient = typeof coachClients.$inferInsert;
export type CoachNote = typeof coachNotes.$inferSelect;
export type NewCoachNote = typeof coachNotes.$inferInsert;
export type CoachClientStatus = 'pending' | 'active' | 'inactive' | 'terminated';
export type CoachNoteCategory = 'general' | 'workout' | 'nutrition' | 'injury' | 'progress' | 'goal' | 'check_in';

