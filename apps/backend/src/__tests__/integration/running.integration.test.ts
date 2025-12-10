import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { runningActivities, runningPrograms, runningProgramWorkouts, runningPRs, heartRateZones } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Running Integration Tests - Activities, programs, PRs
 * Uses pre-seeded test data from seed-data.ts
 * Note: Tests create running activities/programs that are cleaned up after tests
 */

describe('Running Integration', () => {
  let seededUsers: SeededTestUsers;
  let testUserId: string;
  const testActivityIds: string[] = [];
  const testProgramIds: string[] = [];

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    testUserId = seededUsers.premiumAthlete.id;
  });

  afterAll(async () => {
    // Cleanup data created during tests
    await db.delete(runningPRs).where(eq(runningPRs.userId, testUserId)).catch(() => {});
    await db.delete(heartRateZones).where(eq(heartRateZones.userId, testUserId)).catch(() => {});
    for (const id of testProgramIds) {
      await db.delete(runningProgramWorkouts).where(eq(runningProgramWorkouts.programId, id)).catch(() => {});
      await db.delete(runningPrograms).where(eq(runningPrograms.id, id)).catch(() => {});
    }
    for (const id of testActivityIds) {
      await db.delete(runningActivities).where(eq(runningActivities.id, id)).catch(() => {});
    }
  });

  describe('Running Activities', () => {
    it('should log a run', async () => {
      const [activity] = await db.insert(runningActivities).values({
        userId: testUserId,
        runType: 'easy',
        name: 'Morning Run',
        distanceMeters: 5000,
        durationSeconds: 1800, // 30 min
        avgPaceSecondsPerKm: 360, // 6 min/km
        startedAt: new Date(),
      }).returning();
      testActivityIds.push(activity.id);

      expect(activity.id).toBeDefined();
      expect(activity.distanceMeters).toBe(5000);
    });

    it('should log interval workout', async () => {
      const [activity] = await db.insert(runningActivities).values({
        userId: testUserId,
        runType: 'interval',
        name: '400m Repeats',
        distanceMeters: 4800,
        durationSeconds: 1500,
        splits: [
          { distance: 400, time: 90, pace: 225 },
          { distance: 400, time: 92, pace: 230 },
          { distance: 400, time: 89, pace: 222 },
        ],
        startedAt: new Date(),
      }).returning();
      testActivityIds.push(activity.id);

      expect(activity.runType).toBe('interval');
      expect(activity.splits).toHaveLength(3);
    });

    it('should track heart rate data', async () => {
      const [activity] = await db.insert(runningActivities).values({
        userId: testUserId,
        runType: 'tempo',
        distanceMeters: 8000,
        durationSeconds: 2400,
        avgHeartRate: 165,
        maxHeartRate: 178,
        startedAt: new Date(),
      }).returning();
      testActivityIds.push(activity.id);

      expect(activity.avgHeartRate).toBe(165);
      expect(activity.maxHeartRate).toBe(178);
    });

    it('should store GPS route', async () => {
      const [activity] = await db.insert(runningActivities).values({
        userId: testUserId,
        runType: 'long_run',
        distanceMeters: 16000,
        durationSeconds: 5400,
        routePolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        startLatitude: 37.7749,
        startLongitude: -122.4194,
        startedAt: new Date(),
      }).returning();
      testActivityIds.push(activity.id);

      expect(activity.routePolyline).toBeDefined();
    });
  });

  describe('Running Programs', () => {
    it('should create a 5K training program', async () => {
      const [program] = await db.insert(runningPrograms).values({
        userId: testUserId,
        name: 'Couch to 5K',
        goal: '5k',
        durationWeeks: 8,
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
      }).returning();
      testProgramIds.push(program.id);

      expect(program.id).toBeDefined();
      expect(program.durationWeeks).toBe(8);
    });

    it('should add scheduled workouts to program', async () => {
      const programId = testProgramIds[0];

      const workouts = [
        { weekNumber: 1, dayOfWeek: 1, runType: 'easy' as const, targetDistanceMeters: 3000 },
        { weekNumber: 1, dayOfWeek: 3, runType: 'interval' as const, targetDistanceMeters: 2000 },
        { weekNumber: 1, dayOfWeek: 5, runType: 'long_run' as const, targetDistanceMeters: 5000 },
      ];

      for (const w of workouts) {
        await db.insert(runningProgramWorkouts).values({
          programId,
          ...w,
        });
      }

      const scheduled = await db.query.runningProgramWorkouts.findMany({
        where: eq(runningProgramWorkouts.programId, programId),
      });

      expect(scheduled.length).toBe(3);
    });

    it('should mark workout as completed', async () => {
      const programId = testProgramIds[0];
      const activityId = testActivityIds[0];

      const workout = await db.query.runningProgramWorkouts.findFirst({
        where: eq(runningProgramWorkouts.programId, programId),
      });

      if (workout) {
        const [updated] = await db.update(runningProgramWorkouts)
          .set({
            isCompleted: true,
            completedActivityId: activityId,
            completedAt: new Date(),
          })
          .where(eq(runningProgramWorkouts.id, workout.id))
          .returning();

        expect(updated.isCompleted).toBe(true);
      }
    });
  });

  describe('Running PRs', () => {
    it('should record a 5K PR', async () => {
      const [pr] = await db.insert(runningPRs).values({
        userId: testUserId,
        prType: '5k',
        timeSeconds: 1500, // 25 min
        activityId: testActivityIds[0],
      }).returning();

      expect(pr.id).toBeDefined();
      expect(pr.timeSeconds).toBe(1500);
    });

    it('should track PR improvements', async () => {
      const previousPr = await db.query.runningPRs.findFirst({
        where: eq(runningPRs.userId, testUserId),
      });

      if (previousPr) {
        const [newPr] = await db.insert(runningPRs).values({
          userId: testUserId,
          prType: '5k',
          timeSeconds: 1450, // 50 seconds faster
          previousPrId: previousPr.id,
          improvementSeconds: 50,
          improvementPercent: 3.33,
        }).returning();

        expect(newPr.improvementSeconds).toBe(50);
      }
    });
  });

  describe('Heart Rate Zones', () => {
    it('should configure HR zones', async () => {
      const [zones] = await db.insert(heartRateZones).values({
        userId: testUserId,
        maxHeartRate: 185,
        restingHeartRate: 55,
        zone1Min: 50, zone1Max: 60,
        zone2Min: 60, zone2Max: 70,
        zone3Min: 70, zone3Max: 80,
        zone4Min: 80, zone4Max: 90,
        zone5Min: 90, zone5Max: 100,
      }).returning();

      expect(zones.maxHeartRate).toBe(185);
      expect(zones.zone2Min).toBe(60);
    });
  });
});

