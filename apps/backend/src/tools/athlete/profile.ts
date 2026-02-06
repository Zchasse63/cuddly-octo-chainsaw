/**
 * User Profile Tools
 *
 * Tools for accessing user profile, preferences, injuries, streaks, and badges.
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import { userProfiles, userStreaks, userBadges } from '../../db/schema';

// Tool 1: Get User Profile
export const getUserProfile = createTool({
  name: 'getUserProfile',
  description: 'Get the current user profile including goals, experience level, injuries, and training preferences. Use this when the user asks about their profile, goals, experience, tier, or when you need to personalize recommendations based on their fitness level.',
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.userId),
    });

    if (!profile) {
      return toolError('User profile not found', 'PROFILE_NOT_FOUND');
    }

    return toolSuccess({
      name: profile.name,
      experienceLevel: profile.experienceLevel,
      goals: profile.goals ?? [],
      injuries: profile.injuries,
      preferredEquipment: profile.preferredEquipment ?? [],
      preferredWeightUnit: profile.preferredWeightUnit ?? 'lbs',
      trainingFrequency: profile.trainingFrequency,
      tier: profile.tier,
    });
  },
});

// Tool 2: Get User Preferences
export const getUserPreferences = createTool({
  name: 'getUserPreferences',
  description: 'Get user SETTINGS and PREFERENCES only (weight unit, theme, notification settings, equipment the user OWNS). Use this when the user asks "what equipment do I have/own", "what is my preferred unit", "what are my settings". This tool returns USER CONFIGURATION, not exercise data. For finding/searching exercises, use searchExercises instead.',
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.userId),
    });

    if (!profile) {
      return toolError('User profile not found', 'PROFILE_NOT_FOUND');
    }

    return toolSuccess({
      preferredWeightUnit: profile.preferredWeightUnit ?? 'lbs',
      preferredEquipment: profile.preferredEquipment ?? [],
      favoriteExercises: profile.favoriteExercises ?? [],
      exercisesToAvoid: profile.exercisesToAvoid ?? [],
      theme: profile.theme,
      notificationsEnabled: profile.notificationsEnabled,
    });
  },
});

// Tool 3: Get Active Injuries
export const getActiveInjuries = createTool({
  name: 'getActiveInjuries',
  description: 'Get list of currently active injuries the user has logged. Use this when the user asks "do I have any injuries", "what are my current injuries", "what body parts should I avoid", or when you need to check for injury constraints before recommending exercises.',
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.userId),
    });

    // Parse injuries from profile (stored as text)
    const injuriesText = profile?.injuries;
    const hasActiveInjuries = !!injuriesText && injuriesText.trim().length > 0;

    return toolSuccess({
      activeInjuries: hasActiveInjuries ? injuriesText : null,
      hasActiveInjuries,
      exercisesToAvoid: profile?.exercisesToAvoid ?? [],
    });
  },
});

// Tool 4: Get User Streaks
export const getUserStreaks = createTool({
  name: 'getUserStreaks',
  description: 'Get current workout and logging streaks. Use this when the user asks "what is my streak", "how many days in a row have I worked out", "what is my longest streak", or when you need to show consistency metrics and motivational progress.',
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const streaks = await ctx.db.query.userStreaks.findMany({
      where: eq(userStreaks.userId, ctx.userId),
    });

    const workoutStreak = streaks.find(s => s.streakType === 'workout');
    const loggingStreak = streaks.find(s => s.streakType === 'logging');
    const runningStreak = streaks.find(s => s.streakType === 'running');

    return toolSuccess({
      workoutStreak: {
        current: workoutStreak?.currentStreak ?? 0,
        longest: workoutStreak?.longestStreak ?? 0,
        lastActivity: workoutStreak?.lastActivityDate ?? null,
      },
      loggingStreak: {
        current: loggingStreak?.currentStreak ?? 0,
        longest: loggingStreak?.longestStreak ?? 0,
        lastActivity: loggingStreak?.lastActivityDate ?? null,
      },
      runningStreak: {
        current: runningStreak?.currentStreak ?? 0,
        longest: runningStreak?.longestStreak ?? 0,
        lastActivity: runningStreak?.lastActivityDate ?? null,
      },
    });
  },
});

// Tool 5: Get User Badges
export const getUserBadges = createTool({
  name: 'getUserBadges',
  description: 'Get earned badges and achievements. Use this when the user asks "what badges have I earned", "show my achievements", "what milestones have I hit", or when you need to display gamification progress and rewards.',
  parameters: z.object({
    category: z.enum(['strength', 'running', 'streak', 'milestone', 'all']).default('all')
      .describe('Filter badges by category'),
  }),
  execute: async (params, ctx) => {
    const badges = await ctx.db.query.userBadges.findMany({
      where: params.category === 'all'
        ? eq(userBadges.userId, ctx.userId)
        : and(eq(userBadges.userId, ctx.userId), eq(userBadges.badgeType, params.category)),
      with: { definition: true },
    });

    return toolSuccess({
      badges: badges.map(b => ({
        id: b.badgeId,
        name: b.definition?.name ?? b.badgeId,
        type: b.badgeType,
        earnedAt: b.earnedAt,
        metadata: b.metadata,
      })),
      totalCount: badges.length,
    });
  },
});

// Export all profile tools
export const profileTools = {
  getUserProfile,
  getUserPreferences,
  getActiveInjuries,
  getUserStreaks,
  getUserBadges,
};

