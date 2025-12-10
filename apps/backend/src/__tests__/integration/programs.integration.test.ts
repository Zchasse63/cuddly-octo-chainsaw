import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { exercises, trainingPrograms, programWeeks, programDays, programExercises, programAdherence } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Training Programs Integration Tests - Full program lifecycle
 * Uses pre-seeded test data from seed-data.ts
 * Note: Tests create programs/exercises that are cleaned up after tests
 */

describe('Programs Integration', () => {
  let seededUsers: SeededTestUsers;
  let testUserId: string;
  let testProgramId: string;
  let testExerciseId: string;

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    testUserId = seededUsers.premiumAthlete.id;

    // Create a test exercise for program tests
    const [exercise] = await db.insert(exercises).values({
      name: 'Program Test Squat',
      primaryMuscle: 'quadriceps',
      isCustom: true,
      createdByUserId: testUserId,
    }).returning();
    testExerciseId = exercise.id;
  });

  afterAll(async () => {
    // Cleanup data created during tests
    if (testProgramId) {
      await db.delete(programAdherence).where(eq(programAdherence.programId, testProgramId)).catch(() => {});
      await db.delete(programExercises).where(eq(programExercises.programDayId, testProgramId)).catch(() => {});
      await db.delete(programDays).where(eq(programDays.programId, testProgramId)).catch(() => {});
      await db.delete(programWeeks).where(eq(programWeeks.programId, testProgramId)).catch(() => {});
      await db.delete(trainingPrograms).where(eq(trainingPrograms.id, testProgramId)).catch(() => {});
    }
    await db.delete(exercises).where(eq(exercises.id, testExerciseId)).catch(() => {});
  });

  describe('Training Program CRUD', () => {
    it('should create a training program', async () => {
      const [program] = await db.insert(trainingPrograms).values({
        userId: testUserId,
        name: 'Beginner Strength',
        description: '12-week beginner strength program',
        programType: 'strength',
        durationWeeks: 12,
        daysPerWeek: 3,
        primaryGoal: 'get_stronger',
        isPublic: false,
      }).returning();
      testProgramId = program.id;

      expect(program.id).toBeDefined();
      expect(program.durationWeeks).toBe(12);
    });

    it('should add weeks to program', async () => {
      const weeks = [1, 2, 3, 4];
      
      for (const weekNum of weeks) {
        const [week] = await db.insert(programWeeks).values({
          programId: testProgramId,
          weekNumber: weekNum,
          name: `Week ${weekNum}`,
          focus: weekNum <= 2 ? 'volume' : 'intensity',
        }).returning();

        expect(week.weekNumber).toBe(weekNum);
      }

      const allWeeks = await db.query.programWeeks.findMany({
        where: eq(programWeeks.programId, testProgramId),
      });
      expect(allWeeks.length).toBe(4);
    });

    it('should add days to weeks', async () => {
      const week = await db.query.programWeeks.findFirst({
        where: and(
          eq(programWeeks.programId, testProgramId),
          eq(programWeeks.weekNumber, 1)
        ),
      });

      if (week) {
        const days = [
          { dayNumber: 1, weekNumber: 1, dayOfWeek: 1, name: 'Push Day', workoutType: 'push' as const },
          { dayNumber: 2, weekNumber: 1, dayOfWeek: 3, name: 'Pull Day', workoutType: 'pull' as const },
          { dayNumber: 3, weekNumber: 1, dayOfWeek: 5, name: 'Legs Day', workoutType: 'legs' as const },
        ];

        for (const day of days) {
          const [created] = await db.insert(programDays).values({
            programId: testProgramId,
            weekId: week.id,
            ...day,
          }).returning();

          expect(created.dayNumber).toBe(day.dayNumber);
        }
      }
    });

    it('should add exercises to days', async () => {
      const day = await db.query.programDays.findFirst({
        where: eq(programDays.programId, testProgramId),
      });

      if (day) {
        const [programExercise] = await db.insert(programExercises).values({
          programDayId: day.id,
          exerciseId: testExerciseId,
          exerciseOrder: 1,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
          notes: 'Focus on depth',
        }).returning();

        expect(programExercise.sets).toBe(3);
        expect(programExercise.repsMin).toBe(8);
      }
    });
  });

  describe('Program Adherence', () => {
    it('should track program adherence', async () => {
      const day = await db.query.programDays.findFirst({
        where: eq(programDays.programId, testProgramId),
      });

      if (day) {
        const [adherence] = await db.insert(programAdherence).values({
          userId: testUserId,
          programId: testProgramId,
          programDayId: day.id,
          scheduledDate: new Date().toISOString().split('T')[0],
          status: 'pending',
        }).returning();

        expect(adherence.status).toBe('pending');
      }
    });

    it('should mark workout as completed', async () => {
      const adherenceRecord = await db.query.programAdherence.findFirst({
        where: eq(programAdherence.userId, testUserId),
      });

      if (adherenceRecord) {
        const [updated] = await db.update(programAdherence)
          .set({
            status: 'completed',
            completionPercent: 100,
            completedAt: new Date(),
          })
          .where(eq(programAdherence.id, adherenceRecord.id))
          .returning();

        expect(updated.status).toBe('completed');
      }
    });

    it('should track skipped workouts', async () => {
      const day = await db.query.programDays.findFirst({
        where: eq(programDays.programId, testProgramId),
      });

      if (day) {
        const [skipped] = await db.insert(programAdherence).values({
          userId: testUserId,
          programId: testProgramId,
          programDayId: day.id,
          scheduledDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          status: 'skipped',
          skipReason: 'Feeling sick',
        }).returning();

        expect(skipped.status).toBe('skipped');
        expect(skipped.skipReason).toBe('Feeling sick');
      }
    });
  });

  describe('Program Queries', () => {
    it('should query program with full structure', async () => {
      const program = await db.query.trainingPrograms.findFirst({
        where: eq(trainingPrograms.id, testProgramId),
        with: {
          weeks: {
            with: {
              days: true,
            },
          },
        },
      });

      expect(program).toBeDefined();
      expect(program?.weeks?.length).toBeGreaterThan(0);
    });

    it('should query via Supabase REST', async () => {
      const { data, error } = await supabaseAdmin
        .from('training_programs')
        .select(`
          id, name, program_type,
          program_weeks (
            id, week_number,
            program_days (id, day_number, name)
          )
        `)
        .eq('id', testProgramId)
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe('Beginner Strength');
    });
  });
});

