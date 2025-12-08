/**
 * Injury Tools
 *
 * Tools for accessing injury history, risk assessment, and exercise restrictions.
 */

import { z } from 'zod';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import { userProfiles, exercises } from '../../db/schema';
import { createInjuryRiskService } from '../../services/injuryRisk';

// Tool 28: Get Injury History
export const getInjuryHistory = createTool({
  name: 'getInjuryHistory',
  description: 'Get the user\'s injury history and current active injuries',
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.userId),
    });

    if (!profile) {
      return toolSuccess({ hasProfile: false, injuries: null });
    }

    // Parse injuries from profile (stored as text)
    const injuryText = profile.injuries;
    const exercisesToAvoid = profile.exercisesToAvoid ?? [];

    return toolSuccess({
      hasProfile: true,
      currentInjuries: injuryText ? injuryText : null,
      exercisesToAvoid,
      hasActiveInjury: !!injuryText && injuryText.length > 0,
    });
  },
});

// Tool 29: Get Injury Risk Assessment
export const getInjuryRiskAssessment = createTool({
  name: 'getInjuryRiskAssessment',
  description: 'Get AI-powered injury risk assessment based on training patterns',
  parameters: z.object({}),
  requiredRole: 'premium',
  execute: async (_params, ctx) => {
    try {
      const riskService = createInjuryRiskService(ctx.db, ctx.userId);
      const assessment = await riskService.getAssessment();

      return toolSuccess({
        hasAssessment: true,
        overallRisk: assessment.overallRisk,
        riskScore: assessment.riskScore,
        factors: assessment.factors,
        recommendations: assessment.recommendations,
        shouldReduceLoad: assessment.shouldReduceLoad,
        suggestedActions: assessment.suggestedActions,
      });
    } catch (error) {
      return toolSuccess({
        hasAssessment: false,
        message: 'Not enough training data for risk assessment',
      });
    }
  },
});

// Tool 30: Get Exercises to Avoid
export const getExercisesToAvoid = createTool({
  name: 'getExercisesToAvoid',
  description: 'Get list of exercises the user should avoid based on injuries',
  parameters: z.object({
    bodyPart: z.string().optional().describe('Filter by affected body part'),
  }),
  execute: async (params, ctx) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.userId),
    });

    if (!profile) {
      return toolSuccess({ hasRestrictions: false, exercisesToAvoid: [] });
    }

    const exercisesToAvoid = profile.exercisesToAvoid ?? [];

    if (exercisesToAvoid.length === 0) {
      return toolSuccess({
        hasRestrictions: false,
        exercisesToAvoid: [],
        message: 'No exercise restrictions set',
      });
    }

    // If body part filter provided, we'd need to look up exercises
    // For now, return the list as-is
    return toolSuccess({
      hasRestrictions: true,
      exercisesToAvoid,
      currentInjury: profile.injuries,
      recommendation: 'Consider alternatives for these exercises',
    });
  },
});

// Export all injury tools
export const injuryTools = {
  getInjuryHistory,
  getInjuryRiskAssessment,
  getExercisesToAvoid,
};

