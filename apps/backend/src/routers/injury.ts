import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { detectInjury, classifyPainType } from '../services/injuryDetection';
import { createInjuryRiskService } from '../services/injuryRisk';
import { userProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';

export const injuryRouter = router({
  // Detect and analyze injury from user description
  detect: protectedProcedure
    .input(
      z.object({
        notes: z.string().min(1),
        painLevel: z.number().min(1).max(10),
        recentWorkouts: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user profile for context
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, ctx.user.id),
      });

      // First classify if DOMS vs potential injury
      const painClass = await classifyPainType(input.notes);

      // If clearly DOMS, return simplified response
      if (painClass.type === 'doms' && painClass.confidence > 0.8) {
        return {
          type: 'doms',
          analysis: {
            injury_detected: false,
            confidence: painClass.confidence,
            body_part: 'muscle',
            severity: 'mild' as const,
            description: 'This appears to be normal post-workout muscle soreness (DOMS).',
            recommendations: [
              'Continue light activity to promote recovery',
              'Stay hydrated',
              'Get adequate sleep',
              'Consider light stretching',
            ],
            exercise_modifications: [],
            should_see_doctor: false,
            red_flags_present: [],
          },
        };
      }

      // Full injury detection
      const analysis = await detectInjury({
        injuryNotes: input.notes,
        painLevel: input.painLevel,
        recentWorkouts: input.recentWorkouts,
        injuryHistory: profile?.injuries ? [profile.injuries] : undefined,
        experienceLevel: profile?.experienceLevel || 'beginner',
      });

      return {
        type: painClass.type,
        analysis,
      };
    }),

  // Quick classification
  classify: protectedProcedure
    .input(z.object({ notes: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return classifyPainType(input.notes);
    }),

  // Get recovery recommendations for a body part
  recoveryTips: protectedProcedure
    .input(
      z.object({
        bodyPart: z.string(),
        severity: z.enum(['mild', 'moderate', 'severe']),
      })
    )
    .query(async ({ input }) => {
      // Static recommendations by body part and severity
      const recommendations: Record<string, Record<string, string[]>> = {
        shoulder: {
          mild: [
            'Reduce overhead pressing volume',
            'Focus on rotator cuff strengthening',
            'Apply ice after workouts if sore',
          ],
          moderate: [
            'Avoid overhead pressing temporarily',
            'Focus on band pull-aparts and face pulls',
            'Consider physical therapy assessment',
          ],
          severe: [
            'Complete rest from upper body pushing',
            'See a sports medicine doctor',
            'Start rehab only after professional assessment',
          ],
        },
        knee: {
          mild: [
            'Reduce squat depth temporarily',
            'Focus on VMO strengthening',
            'Ice after training if needed',
          ],
          moderate: [
            'Replace barbell squats with leg press',
            'Avoid deep knee flexion',
            'Consider physical therapy',
          ],
          severe: [
            'Stop lower body training',
            'See an orthopedic specialist',
            'Use crutches if pain with walking',
          ],
        },
        back: {
          mild: [
            'Reduce deadlift and row intensity',
            'Focus on core strengthening',
            'Maintain neutral spine in all lifts',
          ],
          moderate: [
            'Avoid heavy hip hinge movements',
            'Focus on McGill Big 3 exercises',
            'Consider chiropractic or PT assessment',
          ],
          severe: [
            'Complete rest from axial loading',
            'See a spine specialist',
            'Watch for neurological symptoms',
          ],
        },
      };

      const bodyPartKey = input.bodyPart.toLowerCase();
      return {
        recommendations:
          recommendations[bodyPartKey]?.[input.severity] ||
          recommendations.back[input.severity],
        bodyPart: input.bodyPart,
        severity: input.severity,
      };
    }),

  // ==================== Injury Risk Assessment ====================

  // Get full injury risk assessment
  getRiskAssessment: protectedProcedure.query(async ({ ctx }) => {
    const riskService = createInjuryRiskService(ctx.db, ctx.user.id);
    return riskService.getAssessment();
  }),

  // Get proactive warnings
  getWarnings: protectedProcedure.query(async ({ ctx }) => {
    const riskService = createInjuryRiskService(ctx.db, ctx.user.id);
    return riskService.getWarnings();
  }),

  // Get AI-powered risk analysis
  getAIRiskAnalysis: protectedProcedure.query(async ({ ctx }) => {
    const riskService = createInjuryRiskService(ctx.db, ctx.user.id);
    const analysis = await riskService.getAIAnalysis();
    return { analysis };
  }),
});
