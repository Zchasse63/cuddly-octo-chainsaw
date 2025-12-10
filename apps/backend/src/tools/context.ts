/**
 * Tool Context Provider
 *
 * Creates the context needed for tool execution including database access
 * and user role determination.
 */

import { eq } from 'drizzle-orm';
import type { Database } from '../db';
import { userProfiles } from '../db/schema';
import type { ToolContext, UserRole } from './registry';

// Re-export types for convenience
export type { ToolContext, UserRole };

/**
 * Creates a tool context for a specific user.
 * Fetches user profile to determine role/tier for permission checks.
 *
 * @param db - Drizzle database instance
 * @param userId - The authenticated user's ID
 * @returns Tool context with database and user information
 *
 * @example
 * ```ts
 * const ctx = await createToolContext(db, user.id);
 * const tools = collectTools(ctx, athleteTools);
 * ```
 */
export async function createToolContext(
  db: Database,
  userId: string
): Promise<ToolContext> {
  // Get user profile to determine role
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  // Determine user role based on subscription tier
  const userRole = determineUserRole(profile?.tier ?? null);

  return {
    db,
    userId,
    userRole,
  };
}

/**
 * Determines user role from their subscription tier.
 *
 * Role hierarchy:
 * - coach: Full access to all tools including client management
 * - premium: Access to advanced analytics and features
 * - free: Basic access to core functionality
 */
function determineUserRole(tier: string | null): UserRole {
  switch (tier) {
    case 'coach':
      return 'coach';
    case 'premium':
      return 'premium';
    case 'free':
    default:
      return 'free';
  }
}

/**
 * Creates a minimal context for testing or internal use.
 * Does not fetch user profile - use with caution.
 */
export function createTestContext(
  db: Database,
  userId: string,
  userRole: UserRole = 'free'
): ToolContext {
  return {
    db,
    userId,
    userRole,
  };
}

/**
 * Creates context with a specific role override.
 * Useful for admin operations or testing.
 */
export async function createContextWithRoleOverride(
  db: Database,
  userId: string,
  roleOverride: UserRole
): Promise<ToolContext> {
  return {
    db,
    userId,
    userRole: roleOverride,
  };
}

