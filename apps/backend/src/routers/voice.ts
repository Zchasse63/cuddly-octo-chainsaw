import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { parseVoiceCommand, generateConfirmation } from '../services/voiceParser';
import { exercises, workoutSets } from '../db/schema';
import { eq, desc, and, ilike, or, sql } from 'drizzle-orm';
import { redis } from '../lib/upstash';
import { calculate1RM } from '../lib/formulas';

// Voice session state stored in Redis with 2-hour TTL
const SESSION_TTL = 7200; // 2 hours in seconds

export interface VoiceSession {
  currentExercise?: string;
  currentExerciseId?: string;
  lastWeight?: number;
  lastWeightUnit?: string;
  setCount: number;
}

function sessionKey(userId: string, workoutId: string): string {
  return `voice:session:${userId}:${workoutId}`;
}

async function getSession(userId: string, workoutId: string): Promise<VoiceSession> {
  const data = await redis.get<VoiceSession>(sessionKey(userId, workoutId));
  return data || { setCount: 0 };
}

async function setSession(userId: string, workoutId: string, session: VoiceSession): Promise<void> {
  await redis.set(sessionKey(userId, workoutId), session, { ex: SESSION_TTL });
}

export const voiceRouter = router({
  // Parse voice command
  parse: protectedProcedure
    .input(
      z.object({
        transcript: z.string().min(1),
        workoutId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get session context from Redis
      const session = await getSession(ctx.user.id, input.workoutId);

      // Get user's preferred unit
      const profile = await ctx.db.query.userProfiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.userId, ctx.user.id),
      });

      // Parse the voice command
      const parsed = await parseVoiceCommand(input.transcript, {
        currentExercise: session.currentExercise,
        lastWeight: session.lastWeight,
        lastWeightUnit: session.lastWeightUnit,
        preferredUnit: profile?.preferredWeightUnit || 'lbs',
      });

      // If exercise name was mentioned, try to match it
      let exerciseId = session.currentExerciseId;
      let exerciseName = session.currentExercise;

      if (parsed.exercise_name) {
        // Find matching exercise
        const match = await ctx.db.query.exercises.findFirst({
          where: or(
            ilike(exercises.name, `%${parsed.exercise_name}%`),
            sql`${parsed.exercise_name} = ANY(synonyms)`
          ),
        });

        if (match) {
          exerciseId = match.id;
          exerciseName = match.name;

          // Update session
          session.currentExercise = match.name;
          session.currentExerciseId = match.id;
          session.setCount = 0;
        }
      }

      // Return parsed result
      return {
        parsed,
        exerciseId,
        exerciseName,
        needsConfirmation: parsed.confidence < 0.7,
        needsExerciseSelection: !exerciseId && parsed.exercise_name !== null,
      };
    }),

  // Confirm and log a voice-parsed set
  confirm: protectedProcedure
    .input(
      z.object({
        workoutId: z.string().uuid(),
        exerciseId: z.string().uuid(),
        reps: z.number().min(1),
        weight: z.number().optional(),
        weightUnit: z.enum(['lbs', 'kg']).default('lbs'),
        rpe: z.number().min(1).max(10).optional(),
        voiceTranscript: z.string(),
        confidence: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await getSession(ctx.user.id, input.workoutId);

      // Increment set count
      session.setCount += 1;
      session.lastWeight = input.weight;
      session.lastWeightUnit = input.weightUnit;

      // Get exercise name
      const exercise = await ctx.db.query.exercises.findFirst({
        where: eq(exercises.id, input.exerciseId),
      });

      // Calculate 1RM (Epley formula)
      const estimated1rm = input.weight
        ? calculate1RM(input.weight, input.reps)
        : null;

      // Check for PR
      const existingPr = await ctx.db.execute(sql`
        SELECT MAX(estimated_1rm) as max_1rm
        FROM personal_records
        WHERE user_id = ${ctx.user.id}
          AND exercise_id = ${input.exerciseId}
      `);

      const maxExisting = ((existingPr as unknown as Array<{ max_1rm: number }>)[0])?.max_1rm || 0;
      const isPr = estimated1rm !== null && estimated1rm > maxExisting;

      // Insert the set
      const [set] = await ctx.db
        .insert(workoutSets)
        .values({
          workoutId: input.workoutId,
          exerciseId: input.exerciseId,
          userId: ctx.user.id,
          setNumber: session.setCount,
          reps: input.reps,
          weight: input.weight,
          weightUnit: input.weightUnit,
          rpe: input.rpe,
          loggingMethod: 'voice',
          voiceTranscript: input.voiceTranscript,
          confidence: input.confidence,
          isPr,
          estimated1rm,
          syncedAt: new Date(),
        })
        .returning();

      // Update session state in Redis
      await setSession(ctx.user.id, input.workoutId, session);

      // Generate confirmation message
      const confirmation = generateConfirmation({
        exercise: exercise?.name || 'Unknown exercise',
        weight: input.weight || 0,
        reps: input.reps,
        isPr,
        setNumber: session.setCount,
        unit: input.weightUnit,
      });

      return {
        set,
        isPr,
        confirmation,
        setNumber: session.setCount,
      };
    }),

  // Set current exercise for session
  setExercise: protectedProcedure
    .input(
      z.object({
        workoutId: z.string().uuid(),
        exerciseId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const exercise = await ctx.db.query.exercises.findFirst({
        where: eq(exercises.id, input.exerciseId),
      });

      if (!exercise) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Exercise not found',
        });
      }

      // Get last weight for this exercise
      const lastSet = await ctx.db.query.workoutSets.findFirst({
        where: and(
          eq(workoutSets.userId, ctx.user.id),
          eq(workoutSets.exerciseId, input.exerciseId)
        ),
        orderBy: [desc(workoutSets.createdAt)],
      });

      await setSession(ctx.user.id, input.workoutId, {
        currentExercise: exercise.name,
        currentExerciseId: exercise.id,
        lastWeight: lastSet?.weight || undefined,
        lastWeightUnit: lastSet?.weightUnit || 'lbs',
        setCount: 0,
      });

      return {
        exercise,
        lastWeight: lastSet?.weight,
        lastWeightUnit: lastSet?.weightUnit,
      };
    }),

  // Get session state
  session: protectedProcedure
    .input(z.object({ workoutId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const session = await redis.get<VoiceSession>(sessionKey(ctx.user.id, input.workoutId));
      return session || null;
    }),

  // Clear session
  clearSession: protectedProcedure
    .input(z.object({ workoutId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await redis.del(sessionKey(ctx.user.id, input.workoutId));
      return { success: true };
    }),
});
