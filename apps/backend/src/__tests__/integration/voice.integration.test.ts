import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { exercises, workouts, workoutSets, voiceCommands } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Voice Logging Integration Tests - Voice commands
 * Uses pre-seeded test data from seed-data.ts
 * Note: Tests create voice commands/workouts that are cleaned up after tests
 */

describe('Voice Integration', () => {
  let seededUsers: SeededTestUsers;
  let testUserId: string;
  let testExerciseId: string;
  let testWorkoutId: string;

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    testUserId = seededUsers.premiumAthlete.id;

    // Create test exercise and workout for voice tests
    const [exercise] = await db.insert(exercises).values({
      name: 'Voice Test Bench',
      primaryMuscle: 'chest',
      isCustom: true,
      createdByUserId: testUserId,
    }).returning();
    testExerciseId = exercise.id;

    const [workout] = await db.insert(workouts).values({
      userId: testUserId,
      name: 'Voice Workout',
      status: 'active',
    }).returning();
    testWorkoutId = workout.id;
  });

  afterAll(async () => {
    // Cleanup data created during tests
    await db.delete(voiceCommands).where(eq(voiceCommands.userId, testUserId)).catch(() => {});
    await db.delete(workoutSets).where(eq(workoutSets.workoutId, testWorkoutId)).catch(() => {});
    await db.delete(workouts).where(eq(workouts.id, testWorkoutId)).catch(() => {});
    await db.delete(exercises).where(eq(exercises.id, testExerciseId)).catch(() => {});
  });

  describe('Voice Commands', () => {
    it('should log voice command', async () => {
      const [command] = await db.insert(voiceCommands).values({
        userId: testUserId,
        workoutId: testWorkoutId,
        rawTranscript: 'bench press 185 for 8',
        confidence: 0.92,
        latencyMs: 450,
      }).returning();

      expect(command.id).toBeDefined();
      expect(command.confidence).toBe(0.92);
    });

    it('should store parsed output', async () => {
      const [command] = await db.insert(voiceCommands).values({
        userId: testUserId,
        workoutId: testWorkoutId,
        rawTranscript: 'squat 225 for 5',
        parsedOutput: { exercise: 'squat', weight: 225, reps: 5, unit: 'lbs' },
        confidence: 0.95,
        modelUsed: 'grok-4-fast',
      }).returning();

      expect(command.parsedOutput).toBeDefined();
      expect((command.parsedOutput as any).exercise).toBe('squat');
    });

    it('should track correction data', async () => {
      const [command] = await db.insert(voiceCommands).values({
        userId: testUserId,
        workoutId: testWorkoutId,
        rawTranscript: 'deadlift 315 for 3',
        parsedOutput: { exercise: 'deadlift', weight: 315, reps: 3 },
        wasCorrected: true,
        correctedOutput: { exercise: 'deadlift', weight: 325, reps: 3 },
        correctionType: 'weight',
        confidence: 0.85,
      }).returning();

      expect(command.wasCorrected).toBe(true);
      expect(command.correctionType).toBe('weight');
    });

    it('should track voice command latency', async () => {
      const commands = await db.query.voiceCommands.findMany({
        where: eq(voiceCommands.userId, testUserId),
        orderBy: desc(voiceCommands.createdAt),
      });

      const avgLatency = commands.reduce((sum, c) => sum + (c.latencyMs || 0), 0) / commands.length;
      expect(avgLatency).toBeGreaterThan(0);
    });
  });

  describe('Voice-Logged Sets', () => {
    it('should create set from voice command', async () => {
      const [set] = await db.insert(workoutSets).values({
        workoutId: testWorkoutId,
        exerciseId: testExerciseId,
        userId: testUserId,
        setNumber: 1,
        reps: 8,
        weight: 185,
        loggingMethod: 'voice',
        voiceTranscript: 'bench press 185 for 8',
        confidence: 0.92,
      }).returning();

      expect(set.loggingMethod).toBe('voice');
      expect(set.voiceTranscript).toBe('bench press 185 for 8');
    });

    it('should track voice vs manual logging ratio', async () => {
      // Add a manual set
      await db.insert(workoutSets).values({
        workoutId: testWorkoutId,
        exerciseId: testExerciseId,
        userId: testUserId,
        setNumber: 2,
        reps: 8,
        weight: 185,
        loggingMethod: 'manual',
      });

      const sets = await db.query.workoutSets.findMany({
        where: eq(workoutSets.workoutId, testWorkoutId),
      });

      const voiceSets = sets.filter(s => s.loggingMethod === 'voice').length;
      const manualSets = sets.filter(s => s.loggingMethod === 'manual').length;

      expect(voiceSets).toBeGreaterThan(0);
      expect(manualSets).toBeGreaterThan(0);
    });
  });

  describe('Voice Analytics', () => {
    it('should query voice commands by user', async () => {
      const commands = await db.query.voiceCommands.findMany({
        where: eq(voiceCommands.userId, testUserId),
      });

      expect(commands.length).toBeGreaterThan(0);
    });

    it('should query average confidence', async () => {
      const commands = await db.query.voiceCommands.findMany({
        where: eq(voiceCommands.userId, testUserId),
      });

      const avgConfidence = commands.reduce((sum, c) => sum + (c.confidence || 0), 0) / commands.length;
      expect(avgConfidence).toBeGreaterThan(0);
    });

    it('should query corrected commands', async () => {
      const corrected = await db.query.voiceCommands.findMany({
        where: eq(voiceCommands.wasCorrected, true),
      });

      expect(corrected.length).toBeGreaterThan(0);
    });
  });

  describe('Supabase REST API', () => {
    it('should query voice commands via Supabase', async () => {
      const { data, error } = await supabaseAdmin
        .from('voice_commands')
        .select('id, raw_transcript, confidence, latency_ms')
        .eq('user_id', testUserId)
        .limit(10);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
    });
  });
});

