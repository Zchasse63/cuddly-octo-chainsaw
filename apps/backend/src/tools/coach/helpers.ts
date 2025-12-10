/**
 * Coach Helper Functions
 *
 * Reusable utilities for coach-client relationship verification
 * and data access across coach tools.
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { coachClients, coachNotes, userProfiles } from '../../db/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../../db/schema';

type DB = PostgresJsDatabase<typeof schema>;

export interface CoachClientRecord {
  id: string;
  coachId: string;
  clientId: string;
  status: 'pending' | 'active' | 'inactive' | 'terminated';
  assignedAt: Date;
  acceptedAt: Date | null;
  relationshipNotes: string | null;
}

/**
 * Verify that a coach has an active relationship with a client.
 * Returns the relationship record if valid, null otherwise.
 */
export async function verifyCoachClientRelationship(
  db: DB,
  coachId: string,
  clientId: string
): Promise<CoachClientRecord | null> {
  const relationship = await db.query.coachClients.findFirst({
    where: and(
      eq(coachClients.coachId, coachId),
      eq(coachClients.clientId, clientId),
      eq(coachClients.status, 'active')
    ),
  });

  return relationship as CoachClientRecord | null;
}

/**
 * Check if coach has access to a client (active relationship exists).
 * Simple boolean check for quick validation.
 */
export async function isCoachOfClient(
  db: DB,
  coachId: string,
  clientId: string
): Promise<boolean> {
  const relationship = await verifyCoachClientRelationship(db, coachId, clientId);
  return relationship !== null;
}

/**
 * Get all clients for a coach with optional status filter.
 */
export async function getCoachClients(
  db: DB,
  coachId: string,
  options: {
    status?: 'pending' | 'active' | 'inactive' | 'terminated' | 'all';
    limit?: number;
  } = {}
) {
  const { status = 'active', limit = 50 } = options;

  const whereConditions = status === 'all'
    ? eq(coachClients.coachId, coachId)
    : and(eq(coachClients.coachId, coachId), eq(coachClients.status, status));

  const relationships = await db.query.coachClients.findMany({
    where: whereConditions,
    orderBy: [desc(coachClients.assignedAt)],
    limit,
  });

  // Get client profiles for each relationship
  const clientIds = relationships.map(r => r.clientId);
  
  if (clientIds.length === 0) {
    return { clients: [], totalCount: 0 };
  }

  const profiles = await db.query.userProfiles.findMany({
    where: sql`${userProfiles.userId} = ANY(ARRAY[${sql.raw(clientIds.map(id => `'${id}'::uuid`).join(','))}])`,
  });

  const profileMap = new Map(profiles.map(p => [p.userId, p]));

  const clients = relationships.map(r => {
    const profile = profileMap.get(r.clientId);
    return {
      relationshipId: r.id,
      clientId: r.clientId,
      status: r.status,
      assignedAt: r.assignedAt,
      acceptedAt: r.acceptedAt,
      name: profile?.name ?? 'Unknown',
      experienceLevel: profile?.experienceLevel,
      tier: profile?.tier,
    };
  });

  return { clients, totalCount: relationships.length };
}

/**
 * Assign a client to a coach.
 */
export async function assignClientToCoach(
  db: DB,
  coachId: string,
  clientId: string,
  assignedBy?: string
) {
  const [assignment] = await db.insert(coachClients).values({
    coachId,
    clientId,
    status: 'pending',
    assignedBy: assignedBy ?? coachId,
  }).returning();

  return assignment;
}

/**
 * Accept a coach-client relationship (called by client).
 */
export async function acceptCoachAssignment(
  db: DB,
  clientId: string,
  coachId: string
) {
  const [updated] = await db.update(coachClients)
    .set({
      status: 'active',
      acceptedAt: new Date(),
    })
    .where(
      and(
        eq(coachClients.coachId, coachId),
        eq(coachClients.clientId, clientId),
        eq(coachClients.status, 'pending')
      )
    )
    .returning();

  return updated;
}

/**
 * Get notes for a client from their coach.
 */
export async function getNotesForClient(
  db: DB,
  coachId: string,
  clientId: string,
  options: { limit?: number; category?: string } = {}
) {
  const { limit = 50, category } = options;

  const whereConditions = category
    ? and(
        eq(coachNotes.coachId, coachId),
        eq(coachNotes.clientId, clientId),
        eq(coachNotes.category, category as never)
      )
    : and(eq(coachNotes.coachId, coachId), eq(coachNotes.clientId, clientId));

  const notes = await db.query.coachNotes.findMany({
    where: whereConditions,
    orderBy: [desc(coachNotes.createdAt)],
    limit,
  });

  return notes;
}

