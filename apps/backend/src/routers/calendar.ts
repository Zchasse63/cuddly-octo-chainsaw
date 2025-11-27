/**
 * Training Calendar Router
 *
 * Manages training programs, calendar views, and workout scheduling.
 * Premium users get AI-generated programs based on questionnaire responses.
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  trainingPrograms,
  programWeeks,
  programDays,
  programExercises,
  trainingCalendar,
  programAdherence,
  programQuestionnaire,
} from '../db/schema';
import { eq, and, between, desc, sql, gte, lte } from 'drizzle-orm';
import {
  generateFullProgram,
  saveProgramToDatabase,
  activateProgram,
} from '../services/programGenerator';
import type { ProgramQuestionnaireData } from '../db/schema/onboarding';

// ============================================
// INPUT SCHEMAS
// ============================================

const QuestionnaireInputSchema = z.object({
  trainingType: z.enum(['strength_only', 'running_only', 'hybrid', 'crossfit', 'undecided']),
  primaryGoal: z.enum([
    'build_muscle',
    'lose_fat',
    'get_stronger',
    'improve_endurance',
    'run_5k',
    'run_10k',
    'run_half_marathon',
    'run_marathon',
    'general_fitness',
    'sport_performance',
    'body_recomposition',
  ]),
  secondaryGoals: z.array(z.string()).optional(),
  targetWeight: z.number().optional(),
  targetWeightUnit: z.enum(['lbs', 'kg']).optional(),
  targetBodyFatPercent: z.number().optional(),
  targetRaceDistance: z.string().optional(),
  targetRaceTime: z.number().optional(),
  targetRaceDate: z.string().optional(),
  currentPace: z.number().optional(),
  targetBenchPress: z.number().optional(),
  targetSquat: z.number().optional(),
  targetDeadlift: z.number().optional(),
  daysPerWeek: z.number().min(2).max(7),
  preferredDays: z.array(z.number().min(0).max(6)).optional(),
  sessionDuration: z.number().min(15).max(180),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening', 'flexible']).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  yearsTraining: z.number().optional(),
  hasStrengthExperience: z.boolean().optional(),
  currentBenchPress: z.number().optional(),
  currentSquat: z.number().optional(),
  currentDeadlift: z.number().optional(),
  hasRunningExperience: z.boolean().optional(),
  weeklyMileage: z.number().optional(),
  longestRun: z.number().optional(),
  recentRaceTime: z.number().optional(),
  recentRaceDistance: z.string().optional(),
  trainingLocation: z.enum(['home', 'gym', 'outdoor', 'mixed']).optional(),
  availableEquipment: z.array(z.string()).optional(),
  hasCardioEquipment: z.boolean().optional(),
  cardioEquipment: z.array(z.string()).optional(),
  runningEnvironment: z.enum(['road', 'trail', 'track', 'treadmill', 'mixed']).optional(),
  hasGpsWatch: z.boolean().optional(),
  hasHeartRateMonitor: z.boolean().optional(),
  currentInjuries: z.array(z.string()).optional(),
  pastInjuries: z.array(z.string()).optional(),
  exercisesToAvoid: z.array(z.string()).optional(),
  healthConditions: z.array(z.string()).optional(),
  mobilityLimitations: z.string().optional(),
  favoriteExercises: z.array(z.string()).optional(),
  dislikedExercises: z.array(z.string()).optional(),
  preferredRepRanges: z.enum(['low', 'medium', 'high']).optional(),
  preferredSplit: z.enum(['ppl', 'upper_lower', 'full_body', 'bro_split']).optional(),
  preferredRunTypes: z.array(z.string()).optional(),
  sleepHours: z.number().optional(),
  stressLevel: z.enum(['low', 'medium', 'high']).optional(),
  nutritionTracking: z.boolean().optional(),
  supplementsUsed: z.array(z.string()).optional(),
  programDuration: z.number().min(4).max(16).optional(),
  wantsDeloadWeeks: z.boolean().optional(),
  deloadFrequency: z.number().optional(),
  wantsProgressiveOverload: z.boolean().optional(),
  wantsVariety: z.boolean().optional(),
  additionalNotes: z.string().optional(),
  previousProgramsUsed: z.array(z.string()).optional(),
  whatWorked: z.string().optional(),
  whatDidntWork: z.string().optional(),
});

export const calendarRouter = router({
  // ============================================
  // CALENDAR VIEW
  // ============================================

  // Get calendar entries for a date range
  getEntries: protectedProcedure
    .input(
      z.object({
        startDate: z.string(), // ISO date string
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.query.trainingCalendar.findMany({
        where: and(
          eq(trainingCalendar.userId, ctx.user.id),
          gte(trainingCalendar.scheduledDate, input.startDate),
          lte(trainingCalendar.scheduledDate, input.endDate)
        ),
        with: {
          programDay: {
            with: {
              exercises: {
                with: {
                  exercise: true,
                },
              },
            },
          },
          workout: true,
          runningActivity: true,
        },
        orderBy: [trainingCalendar.scheduledDate],
      });

      return entries;
    }),

  // Get today's workout(s)
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];

    const entries = await ctx.db.query.trainingCalendar.findMany({
      where: and(
        eq(trainingCalendar.userId, ctx.user.id),
        eq(trainingCalendar.scheduledDate, today)
      ),
      with: {
        programDay: {
          with: {
            exercises: {
              with: {
                exercise: true,
              },
            },
          },
        },
        program: true,
      },
    });

    return entries;
  }),

  // Get upcoming workouts
  getUpcoming: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(30).default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split('T')[0];

      const entries = await ctx.db.query.trainingCalendar.findMany({
        where: and(
          eq(trainingCalendar.userId, ctx.user.id),
          gte(trainingCalendar.scheduledDate, today),
          eq(trainingCalendar.status, 'scheduled')
        ),
        with: {
          programDay: true,
          program: true,
        },
        orderBy: [trainingCalendar.scheduledDate],
        limit: input.limit,
      });

      return entries;
    }),

  // ============================================
  // PROGRAM MANAGEMENT
  // ============================================

  // List user's programs
  listPrograms: protectedProcedure.query(async ({ ctx }) => {
    const programs = await ctx.db.query.trainingPrograms.findMany({
      where: eq(trainingPrograms.userId, ctx.user.id),
      orderBy: [desc(trainingPrograms.createdAt)],
    });

    return programs;
  }),

  // Get program details
  getProgram: protectedProcedure
    .input(z.object({ programId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const program = await ctx.db.query.trainingPrograms.findFirst({
        where: and(
          eq(trainingPrograms.id, input.programId),
          eq(trainingPrograms.userId, ctx.user.id)
        ),
        with: {
          weeks: {
            orderBy: [programWeeks.weekNumber],
            with: {
              days: {
                orderBy: [programDays.dayOfWeek],
                with: {
                  exercises: {
                    orderBy: [programExercises.exerciseOrder],
                    with: {
                      exercise: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!program) {
        throw new Error('Program not found');
      }

      return program;
    }),

  // Get active program
  getActiveProgram: protectedProcedure.query(async ({ ctx }) => {
    const program = await ctx.db.query.trainingPrograms.findFirst({
      where: and(
        eq(trainingPrograms.userId, ctx.user.id),
        eq(trainingPrograms.status, 'active')
      ),
      with: {
        weeks: {
          orderBy: [programWeeks.weekNumber],
        },
      },
    });

    return program;
  }),

  // ============================================
  // QUESTIONNAIRE & PROGRAM GENERATION
  // ============================================

  // Submit questionnaire and generate program
  submitQuestionnaire: protectedProcedure
    .input(QuestionnaireInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user has premium (in production, check subscription status)
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.userId, ctx.user.id),
      });

      // Save questionnaire
      const [questionnaire] = await ctx.db
        .insert(programQuestionnaire)
        .values({
          userId: ctx.user.id,
          ...input,
          targetRaceDate: input.targetRaceDate ? new Date(input.targetRaceDate) : null,
          isPremium: true, // Premium feature
          completedAt: new Date(),
        } as any)
        .returning();

      // Generate program using AI + RAG
      const generatedProgram = await generateFullProgram(
        questionnaire as ProgramQuestionnaireData,
        ctx.db
      );

      // Save program to database
      const programId = await saveProgramToDatabase(
        generatedProgram,
        ctx.user.id,
        questionnaire as ProgramQuestionnaireData,
        ctx.db
      );

      return {
        questionnaireId: questionnaire.id,
        programId,
        program: generatedProgram,
        message: 'Program generated successfully! Review and activate when ready.',
      };
    }),

  // Get saved questionnaire
  getQuestionnaire: protectedProcedure.query(async ({ ctx }) => {
    const questionnaire = await ctx.db.query.programQuestionnaire.findFirst({
      where: eq(programQuestionnaire.userId, ctx.user.id),
      orderBy: [desc(programQuestionnaire.createdAt)],
    });

    return questionnaire;
  }),

  // ============================================
  // PROGRAM ACTIVATION
  // ============================================

  // Activate a program (creates calendar entries)
  activateProgram: protectedProcedure
    .input(
      z.object({
        programId: z.string().uuid(),
        startDate: z.string(), // ISO date string
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const program = await ctx.db.query.trainingPrograms.findFirst({
        where: and(
          eq(trainingPrograms.id, input.programId),
          eq(trainingPrograms.userId, ctx.user.id)
        ),
      });

      if (!program) {
        throw new Error('Program not found');
      }

      // Deactivate any currently active program
      await ctx.db
        .update(trainingPrograms)
        .set({ status: 'paused' })
        .where(
          and(eq(trainingPrograms.userId, ctx.user.id), eq(trainingPrograms.status, 'active'))
        );

      // Activate the new program
      await activateProgram(input.programId, new Date(input.startDate), ctx.db);

      return {
        success: true,
        message: 'Program activated! Check your calendar for scheduled workouts.',
      };
    }),

  // Pause a program
  pauseProgram: protectedProcedure
    .input(z.object({ programId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(trainingPrograms)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(
          and(eq(trainingPrograms.id, input.programId), eq(trainingPrograms.userId, ctx.user.id))
        )
        .returning();

      if (!updated) {
        throw new Error('Program not found');
      }

      return { success: true, program: updated };
    }),

  // Cancel a program
  cancelProgram: protectedProcedure
    .input(z.object({ programId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(trainingPrograms)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(
          and(eq(trainingPrograms.id, input.programId), eq(trainingPrograms.userId, ctx.user.id))
        )
        .returning();

      if (!updated) {
        throw new Error('Program not found');
      }

      // Mark all future calendar entries as cancelled
      const today = new Date().toISOString().split('T')[0];
      await ctx.db
        .update(trainingCalendar)
        .set({ status: 'skipped' })
        .where(
          and(
            eq(trainingCalendar.programId, input.programId),
            gte(trainingCalendar.scheduledDate, today),
            eq(trainingCalendar.status, 'scheduled')
          )
        );

      return { success: true };
    }),

  // ============================================
  // WORKOUT COMPLETION
  // ============================================

  // Mark calendar entry as complete
  completeEntry: protectedProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        workoutId: z.string().uuid().optional(),
        runningActivityId: z.string().uuid().optional(),
        completionPercent: z.number().min(0).max(100).default(100),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.trainingCalendar.findFirst({
        where: and(eq(trainingCalendar.id, input.entryId), eq(trainingCalendar.userId, ctx.user.id)),
        with: { programDay: true },
      });

      if (!entry) {
        throw new Error('Calendar entry not found');
      }

      // Update calendar entry
      const [updated] = await ctx.db
        .update(trainingCalendar)
        .set({
          status: input.completionPercent >= 100 ? 'completed' : 'partial',
          workoutId: input.workoutId,
          runningActivityId: input.runningActivityId,
          completedAt: new Date(),
          userNotes: input.notes,
          updatedAt: new Date(),
        })
        .where(eq(trainingCalendar.id, input.entryId))
        .returning();

      // Update program day if linked
      if (entry.programDayId) {
        await ctx.db
          .update(programDays)
          .set({
            isCompleted: input.completionPercent >= 100,
            completedWorkoutId: input.workoutId,
            completedRunId: input.runningActivityId,
            completedAt: new Date(),
          })
          .where(eq(programDays.id, entry.programDayId));
      }

      // Update program stats if linked
      if (entry.programId) {
        await ctx.db.execute(sql`
          UPDATE training_programs
          SET total_workouts_completed = total_workouts_completed + 1,
              adherence_percent = (total_workouts_completed + 1)::float / NULLIF(total_workouts_scheduled, 0) * 100,
              updated_at = NOW()
          WHERE id = ${entry.programId}
        `);
      }

      // Create adherence record
      if (entry.programId && entry.programDayId) {
        await ctx.db.insert(programAdherence).values({
          userId: ctx.user.id,
          programId: entry.programId,
          programDayId: entry.programDayId,
          scheduledDate: entry.scheduledDate,
          status: input.completionPercent >= 100 ? 'completed' : 'partial',
          completionPercent: input.completionPercent,
          notes: input.notes,
          completedAt: new Date(),
        });
      }

      return { success: true, entry: updated };
    }),

  // Skip a workout
  skipEntry: protectedProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.trainingCalendar.findFirst({
        where: and(eq(trainingCalendar.id, input.entryId), eq(trainingCalendar.userId, ctx.user.id)),
      });

      if (!entry) {
        throw new Error('Calendar entry not found');
      }

      const [updated] = await ctx.db
        .update(trainingCalendar)
        .set({
          status: 'skipped',
          userNotes: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(trainingCalendar.id, input.entryId))
        .returning();

      // Create adherence record
      if (entry.programId && entry.programDayId) {
        await ctx.db.insert(programAdherence).values({
          userId: ctx.user.id,
          programId: entry.programId,
          programDayId: entry.programDayId,
          scheduledDate: entry.scheduledDate,
          status: 'skipped',
          skipReason: input.reason,
        });
      }

      return { success: true, entry: updated };
    }),

  // Reschedule a workout
  rescheduleEntry: protectedProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        newDate: z.string(), // ISO date string
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.trainingCalendar.findFirst({
        where: and(eq(trainingCalendar.id, input.entryId), eq(trainingCalendar.userId, ctx.user.id)),
      });

      if (!entry) {
        throw new Error('Calendar entry not found');
      }

      const originalDate = entry.scheduledDate;

      // Update the entry date
      const [updated] = await ctx.db
        .update(trainingCalendar)
        .set({
          scheduledDate: input.newDate,
          updatedAt: new Date(),
        })
        .where(eq(trainingCalendar.id, input.entryId))
        .returning();

      // Create adherence record for rescheduling
      if (entry.programId && entry.programDayId) {
        await ctx.db.insert(programAdherence).values({
          userId: ctx.user.id,
          programId: entry.programId,
          programDayId: entry.programDayId,
          scheduledDate: originalDate,
          status: 'rescheduled',
          rescheduledTo: input.newDate,
        });
      }

      return { success: true, entry: updated };
    }),

  // ============================================
  // ADHERENCE & STATS
  // ============================================

  // Get program adherence stats
  getAdherenceStats: protectedProcedure
    .input(
      z.object({
        programId: z.string().uuid().optional(),
        period: z.enum(['week', 'month', 'all']).default('month'),
      })
    )
    .query(async ({ ctx, input }) => {
      let startDate: string;
      const now = new Date();

      switch (input.period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = weekAgo.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = monthAgo.toISOString().split('T')[0];
          break;
        default:
          startDate = '1970-01-01';
      }

      const records = await ctx.db.query.programAdherence.findMany({
        where: and(
          eq(programAdherence.userId, ctx.user.id),
          input.programId ? eq(programAdherence.programId, input.programId) : sql`1=1`,
          gte(programAdherence.scheduledDate, startDate)
        ),
      });

      const total = records.length;
      const completed = records.filter((r) => r.status === 'completed').length;
      const partial = records.filter((r) => r.status === 'partial').length;
      const skipped = records.filter((r) => r.status === 'skipped').length;
      const rescheduled = records.filter((r) => r.status === 'rescheduled').length;

      return {
        total,
        completed,
        partial,
        skipped,
        rescheduled,
        adherenceRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        averageCompletion:
          records.length > 0
            ? Math.round(
                records.reduce((sum, r) => sum + (r.completionPercent || 0), 0) / records.length
              )
            : 0,
      };
    }),

  // ============================================
  // CUSTOM ENTRIES
  // ============================================

  // Add custom calendar entry (not from a program)
  addCustomEntry: protectedProcedure
    .input(
      z.object({
        scheduledDate: z.string(),
        activityType: z.enum(['strength', 'running', 'crossfit', 'custom']),
        title: z.string(),
        description: z.string().optional(),
        workoutType: z.string().optional(),
        estimatedDuration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .insert(trainingCalendar)
        .values({
          userId: ctx.user.id,
          scheduledDate: input.scheduledDate,
          activityType: input.activityType,
          title: input.title,
          description: input.description,
          workoutType: input.workoutType,
          estimatedDuration: input.estimatedDuration,
          status: 'scheduled',
        })
        .returning();

      return entry;
    }),

  // Delete custom entry
  deleteEntry: protectedProcedure
    .input(z.object({ entryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.query.trainingCalendar.findFirst({
        where: and(eq(trainingCalendar.id, input.entryId), eq(trainingCalendar.userId, ctx.user.id)),
      });

      if (!entry) {
        throw new Error('Calendar entry not found');
      }

      // Only allow deleting custom entries (not program-linked)
      if (entry.programId) {
        throw new Error('Cannot delete program-linked entries. Use skip instead.');
      }

      await ctx.db.delete(trainingCalendar).where(eq(trainingCalendar.id, input.entryId));

      return { success: true };
    }),
});
