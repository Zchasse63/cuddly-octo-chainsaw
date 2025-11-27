import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { parseVoiceCommand, generateConfirmation } from '../services/voiceParser';
import { exercises, workoutSets } from '../db/schema';
import { eq, desc, and, ilike, or, sql } from 'drizzle-orm';

// Voice session state (in production, use Redis)
const sessionState = new Map<
  string,
  {
    currentExercise?: string;
    currentExerciseId?: string;
    lastWeight?: number;
    lastWeightUnit?: string;
    setCount: number;
  }
>();

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
      // Get session context
      const sessionKey = `${ctx.user.id}:${input.workoutId}`;
      const session = sessionState.get(sessionKey) || { setCount: 0 };

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
      const sessionKey = `${ctx.user.id}:${input.workoutId}`;
      const session = sessionState.get(sessionKey) || { setCount: 0 };

      // Increment set count
      session.setCount += 1;
      session.lastWeight = input.weight;
      session.lastWeightUnit = input.weightUnit;

      // Get exercise name
      const exercise = await ctx.db.query.exercises.findFirst({
        where: eq(exercises.id, input.exerciseId),
      });

      // Calculate 1RM
      const estimated1rm = input.weight
        ? input.weight * (1 + input.reps / 30)
        : null;

      // Check for PR
      const existingPr = await ctx.db.execute(sql`
        SELECT MAX(estimated_1rm) as max_1rm
        FROM personal_records
        WHERE user_id = ${ctx.user.id}
          AND exercise_id = ${input.exerciseId}
      `);

      const maxExisting = (existingPr.rows[0] as any)?.max_1rm || 0;
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

      // Update session state
      sessionState.set(sessionKey, session);

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
        throw new Error('Exercise not found');
      }

      // Get last weight for this exercise
      const lastSet = await ctx.db.query.workoutSets.findFirst({
        where: and(
          eq(workoutSets.userId, ctx.user.id),
          eq(workoutSets.exerciseId, input.exerciseId)
        ),
        orderBy: [desc(workoutSets.createdAt)],
      });

      const sessionKey = `${ctx.user.id}:${input.workoutId}`;
      sessionState.set(sessionKey, {
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
      const sessionKey = `${ctx.user.id}:${input.workoutId}`;
      return sessionState.get(sessionKey) || null;
    }),

  // Clear session
  clearSession: protectedProcedure
    .input(z.object({ workoutId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sessionKey = `${ctx.user.id}:${input.workoutId}`;
      sessionState.delete(sessionKey);
      return { success: true };
    }),
});
