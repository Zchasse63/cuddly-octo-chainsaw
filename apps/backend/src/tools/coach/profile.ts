/**
 * Coach Profile Tools
 *
 * Tools for coaches to manage their own profile and invitations.
 */

import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import { userProfiles } from '../../db/schema';

// Tool 55: Get Coach Profile
export const getCoachProfile = createTool({
  name: 'getCoachProfile',
  description: 'Get the coach\'s own profile information. Use this when the coach asks "show my profile", "what are my specializations", "what is my account info", or when displaying coach credentials and settings.',
  parameters: z.object({}),
  requiredRole: 'coach',
  execute: async (_params, ctx) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.userId),
    });

    if (!profile) {
      return toolError('Profile not found', 'PROFILE_NOT_FOUND');
    }

    return toolSuccess({
      profile: {
        id: ctx.userId,
        name: profile.name,
        tier: profile.tier,
        experienceLevel: profile.experienceLevel,
        specializations: profile.goals, // Coaches use goals field for specializations
        createdAt: profile.createdAt,
      },
    });
  },
});

// Tool 56: Get Pending Invitations
export const getPendingInvitations = createTool({
  name: 'getPendingInvitations',
  description: 'Get pending client invitations sent by the coach. Use this when the coach asks "who have I invited", "show pending invitations", "what invitations are outstanding", or when managing client onboarding.',
  parameters: z.object({
    status: z.enum(['pending', 'accepted', 'declined', 'all']).default('pending'),
    limit: z.number().min(1).max(50).default(20),
  }),
  requiredRole: 'coach',
  execute: async (_params, _ctx) => {
    // coach_client_invitations table would be queried here
    return toolSuccess({
      invitations: [],
      message: 'Client invitations feature pending implementation',
    });
  },
});

// Export all profile tools
export const profileTools = {
  getCoachProfile,
  getPendingInvitations,
};

