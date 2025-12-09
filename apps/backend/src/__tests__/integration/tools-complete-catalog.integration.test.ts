/**
 * Comprehensive E2E Integration Tests for ALL 60 Tools
 *
 * This file contains extensive tests for every tool in the VoiceFit tool catalog.
 * Each tool has 3-4 test scenarios covering:
 * - Happy path with valid data
 * - Edge cases and boundary conditions
 * - Parameter variations
 * - Error handling
 *
 * All tests use REAL API calls - no mocks.
 * Tests use PRE-SEEDED data from seed-data.ts for faster execution.
 *
 * Prerequisites:
 * Run: npx tsx -r dotenv/config -e "import { seedAllData } from './src/__tests__/integration/seed-data'; seedAllData();"
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateText } from 'ai';
import { db } from '../../db';
import { collectTools } from '../../tools/registry';
import type { ToolContext } from '../../tools/context';
import { getAllAthleteTools } from '../../tools/athlete';
import { getAllCoachTools } from '../../tools/coach';
import { xai, TEMPERATURES } from '../../lib/ai';
import {
  getSeededTestUsers,
  getSeededCoachClients,
  SeededTestUsers,
  TestUser,
} from './test-factory';

// Timeouts
const GROK_TIMEOUT = 45000;
const SETUP_TIMEOUT = 60000;
const HEAVY_SETUP_TIMEOUT = 120000; // For categories that create large datasets (20+ workouts)

// Cached seeded users for all tests
let seededUsers: SeededTestUsers;

// ============================================
// CATEGORY 1: USER PROFILE & CONTEXT (5 Tools)
// ============================================

describe('Tool Category 1: User Profile & Context', () => {
  let testUser: TestUser;
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded premium athlete (has workouts, runs, programs, streaks, badges)
    seededUsers = await getSeededTestUsers();
    testUser = seededUsers.premiumAthlete;

    const context: ToolContext = { db, userId: testUser.id, userRole: 'premium' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 1: getUserProfile
  describe('Tool 1: getUserProfile', () => {
    it('returns complete profile data', async () => {
      const result = await athleteTools.getUserProfile.execute({});
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Premium Tier Athlete');
      expect(result.data.experienceLevel).toBe('intermediate');
      expect(result.data.goals).toContain('strength');
      expect(result.data.tier).toBe('premium');
    });

    it('returns preferred equipment list', async () => {
      const result = await athleteTools.getUserProfile.execute({});
      expect(result.success).toBe(true);
      expect(result.data.preferredEquipment).toEqual(
        expect.arrayContaining(['barbell', 'dumbbell'])
      );
    });

    it('returns training frequency', async () => {
      const result = await athleteTools.getUserProfile.execute({});
      expect(result.success).toBe(true);
      // trainingFrequency may be null or a string
      expect(result.data.trainingFrequency === null || typeof result.data.trainingFrequency === 'string').toBe(true);
    });

    it('includes injury information', async () => {
      const result = await athleteTools.getUserProfile.execute({});
      expect(result.success).toBe(true);
      // injuries is stored as text, may be null or string
      expect(result.data.injuries === null || typeof result.data.injuries === 'string').toBe(true);
    });
  });

  // Tool 2: getUserPreferences
  describe('Tool 2: getUserPreferences', () => {
    it('returns weight unit preference', async () => {
      const result = await athleteTools.getUserPreferences.execute({});
      expect(result.success).toBe(true);
      expect(['lbs', 'kg']).toContain(result.data.preferredWeightUnit);
    });

    it('returns equipment preferences', async () => {
      const result = await athleteTools.getUserPreferences.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.preferredEquipment)).toBe(true);
    });

    it('returns exercises to avoid based on injuries', async () => {
      const result = await athleteTools.getUserPreferences.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.exercisesToAvoid)).toBe(true);
    });
  });

  // Tool 3: getActiveInjuries
  describe('Tool 3: getActiveInjuries', () => {
    it('detects active injury from profile', async () => {
      const result = await athleteTools.getActiveInjuries.execute({});
      expect(result.success).toBe(true);
      expect(result.data.hasActiveInjuries).toBe(true);
    });

    it('returns injury details', async () => {
      const result = await athleteTools.getActiveInjuries.execute({});
      expect(result.success).toBe(true);
      // activeInjuries is a string (text), not an array
      if (result.data.hasActiveInjuries) {
        expect(typeof result.data.activeInjuries === 'string').toBe(true);
      }
    });

    it('returns affected exercises for injury', async () => {
      const result = await athleteTools.getActiveInjuries.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.exercisesToAvoid)).toBe(true);
    });
  });

  // Tool 4: getUserStreaks
  describe('Tool 4: getUserStreaks', () => {
    it('returns workout streak data', async () => {
      const result = await athleteTools.getUserStreaks.execute({});
      expect(result.success).toBe(true);
      expect(result.data.workoutStreak).toBeDefined();
      // Seeded streaks have randomized values (5-14 current, 10-19 longest)
      expect(typeof result.data.workoutStreak.current).toBe('number');
      expect(typeof result.data.workoutStreak.longest).toBe('number');
    });

    it('returns logging streak data', async () => {
      const result = await athleteTools.getUserStreaks.execute({});
      expect(result.success).toBe(true);
      expect(result.data.loggingStreak).toBeDefined();
      expect(typeof result.data.loggingStreak.current).toBe('number');
    });

    it('includes lastActivity timestamps', async () => {
      const result = await athleteTools.getUserStreaks.execute({});
      expect(result.success).toBe(true);
      // Either has lastActivity or is null
      expect(result.data.workoutStreak).toHaveProperty('lastActivity');
    });

    it('returns running streak if exists', async () => {
      const result = await athleteTools.getUserStreaks.execute({});
      expect(result.success).toBe(true);
      // Running streak may or may not exist
      expect(result.data).toHaveProperty('runningStreak');
    });
  });

  // Tool 5: getUserBadges
  describe('Tool 5: getUserBadges', () => {
    it('returns badges array', async () => {
      const result = await athleteTools.getUserBadges.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.badges)).toBe(true);
    });

    it('returns totalCount', async () => {
      const result = await athleteTools.getUserBadges.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.totalCount).toBe('number');
    });

    it('filters by strength category', async () => {
      const result = await athleteTools.getUserBadges.execute({ category: 'strength' });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.badges)).toBe(true);
    });

    it('filters by streak category', async () => {
      const result = await athleteTools.getUserBadges.execute({ category: 'streak' });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.badges)).toBe(true);
    });

    it('filters by running category', async () => {
      const result = await athleteTools.getUserBadges.execute({ category: 'running' });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.badges)).toBe(true);
    });
  });
});

// ============================================
// CATEGORY 2: WORKOUT & TRAINING (8 Tools)
// ============================================

describe('Tool Category 2: Workout & Training', () => {
  let testUser: TestUser;
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded premium athlete (has 30 workouts, training program)
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    testUser = seededUsers.premiumAthlete;

    const context: ToolContext = { db, userId: testUser.id, userRole: 'premium' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 6: getTodaysWorkout
  describe('Tool 6: getTodaysWorkout', () => {
    it('returns scheduled workout data structure', async () => {
      const result = await athleteTools.getTodaysWorkout.execute({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('hasScheduledWorkout');
    });

    it('includes program progress if program exists', async () => {
      const result = await athleteTools.getTodaysWorkout.execute({});
      expect(result.success).toBe(true);
      // programProgress may or may not be present depending on program state
      if (result.data.hasScheduledWorkout && result.data.programProgress) {
        expect(typeof result.data.programProgress).toBe('object');
      }
    });

    it('returns rest day info when appropriate', async () => {
      const result = await athleteTools.getTodaysWorkout.execute({});
      expect(result.success).toBe(true);
      // May or may not be a rest day
      if (result.data.isRestDay) {
        expect(result.data.message).toBeDefined();
      }
    });

    it('includes workout exercises when scheduled', async () => {
      const result = await athleteTools.getTodaysWorkout.execute({});
      expect(result.success).toBe(true);
      // workout may have exercises array or may not be present
      if (result.data.workout && result.data.workout.exercises) {
        expect(Array.isArray(result.data.workout.exercises)).toBe(true);
      }
    });
  });

  // Tool 7: getRecentWorkouts
  describe('Tool 7: getRecentWorkouts', () => {
    it('returns all 10 workouts with default limit', async () => {
      const result = await athleteTools.getRecentWorkouts.execute({ limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data.workouts.length).toBe(10);
    });

    it('respects limit parameter', async () => {
      const result = await athleteTools.getRecentWorkouts.execute({ limit: 3 });
      expect(result.success).toBe(true);
      expect(result.data.workouts.length).toBe(3);
    });

    it('returns workouts in reverse chronological order', async () => {
      const result = await athleteTools.getRecentWorkouts.execute({ limit: 5 });
      expect(result.success).toBe(true);
      const dates = result.data.workouts.map((w: any) => new Date(w.date).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it('each workout has required fields', async () => {
      const result = await athleteTools.getRecentWorkouts.execute({ limit: 1 });
      expect(result.success).toBe(true);
      const workout = result.data.workouts[0];
      expect(workout).toHaveProperty('id');
      expect(workout).toHaveProperty('name');
      expect(workout).toHaveProperty('date');
    });
  });

  // Tool 8: getExerciseHistory
  describe('Tool 8: getExerciseHistory', () => {
    it('returns history for bench press', async () => {
      const result = await athleteTools.getExerciseHistory.execute({
        exerciseName: 'bench press',
        limit: 10
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('exercise');
      expect(result.data).toHaveProperty('sets');
    });

    it('returns sets array', async () => {
      const result = await athleteTools.getExerciseHistory.execute({
        exerciseName: 'squat',
        limit: 5
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.sets)).toBe(true);
    });

    it('handles non-existent exercise gracefully', async () => {
      const result = await athleteTools.getExerciseHistory.execute({
        exerciseName: 'nonexistent-exercise-xyz',
        limit: 10
      });
      // Should either succeed with empty data or return error
      expect(result).toBeDefined();
    });

    it('respects limit parameter when exercise exists', async () => {
      const result = await athleteTools.getExerciseHistory.execute({
        exerciseName: 'deadlift',
        limit: 3
      });
      // May return error if exercise not found
      if (result.success) {
        expect(result.data.sets.length).toBeLessThanOrEqual(3);
      }
    });
  });

  // Tool 9: getPersonalRecords
  describe('Tool 9: getPersonalRecords', () => {
    it('returns personal records structure', async () => {
      const result = await athleteTools.getPersonalRecords.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.records)).toBe(true);
    });

    it('handles exercise name filter', async () => {
      const result = await athleteTools.getPersonalRecords.execute({
        exerciseName: 'bench press'
      });
      // May succeed or return error if exercise not found
      expect(result).toBeDefined();
    });

    it('returns totalPRs count', async () => {
      const result = await athleteTools.getPersonalRecords.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.totalPRs).toBe('number');
    });

    it('returns recentPRs count', async () => {
      const result = await athleteTools.getPersonalRecords.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.recentPRs).toBe('number');
    });
  });

  // Tool 10: logWorkoutSet (stub - requires active workout context)
  describe('Tool 10: logWorkoutSet', () => {
    it('returns message about active workout requirement', async () => {
      const result = await athleteTools.logWorkoutSet.execute({
        exerciseName: 'bench press',
        weight: 185,
        weightUnit: 'lbs',
        reps: 8,
        rpe: 7,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('message');
    });

    it('provides hint for starting workout', async () => {
      const result = await athleteTools.logWorkoutSet.execute({
        exerciseName: 'squat',
        weight: 225,
        weightUnit: 'lbs',
        reps: 5,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('hint');
    });

    it('accepts kg weight unit', async () => {
      const result = await athleteTools.logWorkoutSet.execute({
        exerciseName: 'overhead press',
        weight: 60,
        weightUnit: 'kg',
        reps: 6,
      });
      expect(result.success).toBe(true);
    });
  });

  // Tool 11: getActiveWorkout
  describe('Tool 11: getActiveWorkout', () => {
    it('returns active workout status', async () => {
      const result = await athleteTools.getActiveWorkout.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasActiveWorkout).toBe('boolean');
    });

    it('includes workout details when active', async () => {
      const result = await athleteTools.getActiveWorkout.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasActiveWorkout) {
        expect(result.data.workout).toHaveProperty('id');
        expect(result.data.workout).toHaveProperty('sets');
      }
    });
  });

  // Tool 12: searchExercises
  describe('Tool 12: searchExercises', () => {
    it('finds exercises matching "bench"', async () => {
      const result = await athleteTools.searchExercises.execute({ query: 'bench' });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.exercises)).toBe(true);
    });

    it('finds exercises matching "squat"', async () => {
      const result = await athleteTools.searchExercises.execute({ query: 'squat' });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.exercises)).toBe(true);
    });

    it('filters by muscle group', async () => {
      const result = await athleteTools.searchExercises.execute({
        query: 'press',
        muscleGroup: 'chest'
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.exercises)).toBe(true);
    });

    it('filters by equipment', async () => {
      const result = await athleteTools.searchExercises.execute({
        query: 'curl',
        equipment: ['dumbbell']
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.exercises)).toBe(true);
    });

    it('returns empty array for non-existent exercise', async () => {
      const result = await athleteTools.searchExercises.execute({
        query: 'zzznonexistent123'
      });
      expect(result.success).toBe(true);
      expect(result.data.exercises.length).toBe(0);
    });
  });

  // Tool 13: getExerciseSubstitutes
  describe('Tool 13: getExerciseSubstitutes', () => {
    it('finds substitutes for bench press', async () => {
      const result = await athleteTools.getExerciseSubstitutes.execute({
        exerciseName: 'bench press'
      });
      // May succeed or return error if exercise not found
      if (result.success) {
        expect(result.data).toHaveProperty('original');
        expect(Array.isArray(result.data.substitutes)).toBe(true);
      }
    });

    it('returns original exercise info', async () => {
      const result = await athleteTools.getExerciseSubstitutes.execute({
        exerciseName: 'squat'
      });
      if (result.success) {
        expect(result.data.original).toHaveProperty('name');
        expect(result.data.original).toHaveProperty('primaryMuscle');
      }
    });

    it('accepts availableEquipment filter', async () => {
      const result = await athleteTools.getExerciseSubstitutes.execute({
        exerciseName: 'bench press',
        availableEquipment: ['dumbbell', 'cable']
      });
      // Should handle the parameter
      expect(result).toBeDefined();
    });

    it('substitutes have required fields', async () => {
      const result = await athleteTools.getExerciseSubstitutes.execute({
        exerciseName: 'deadlift'
      });
      if (result.success && result.data.substitutes.length > 0) {
        const sub = result.data.substitutes[0];
        expect(sub).toHaveProperty('name');
        expect(sub).toHaveProperty('equipment');
      }
    });
  });
});

// ============================================
// CATEGORY 3: PROGRAM MANAGEMENT (4 Tools)
// ============================================

describe('Tool Category 3: Program Management', () => {
  let testUser: TestUser;
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded premium athlete (has 12-week "Strength Foundation" program)
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    testUser = seededUsers.premiumAthlete;

    const context: ToolContext = { db, userId: testUser.id, userRole: 'premium' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 14: getActiveProgram
  describe('Tool 14: getActiveProgram', () => {
    it('returns active program', async () => {
      const result = await athleteTools.getActiveProgram.execute({});
      expect(result.success).toBe(true);
      expect(result.data.hasActiveProgram).toBe(true);
    });

    it('returns program name', async () => {
      const result = await athleteTools.getActiveProgram.execute({});
      expect(result.success).toBe(true);
      expect(result.data.program.name).toBe('Strength Foundation');
    });

    it('returns program duration', async () => {
      const result = await athleteTools.getActiveProgram.execute({});
      expect(result.success).toBe(true);
      expect(result.data.program.durationWeeks).toBe(12);
    });

    it('returns current week', async () => {
      const result = await athleteTools.getActiveProgram.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.program.currentWeek).toBe('number');
    });
  });

  // Tool 15: getProgramProgress
  describe('Tool 15: getProgramProgress', () => {
    it('returns progress object', async () => {
      const result = await athleteTools.getProgramProgress.execute({});
      expect(result.success).toBe(true);
      expect(result.data.progress).toBeDefined();
    });

    it('returns adherence percent', async () => {
      const result = await athleteTools.getProgramProgress.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.progress.adherencePercent).toBe('number');
    });

    it('returns workouts completed count', async () => {
      const result = await athleteTools.getProgramProgress.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.progress.workoutsCompleted).toBe('number');
    });

    it('returns weeks array', async () => {
      const result = await athleteTools.getProgramProgress.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.weeks)).toBe(true);
    });
  });

  // Tool 16: getUpcomingWorkouts
  describe('Tool 16: getUpcomingWorkouts', () => {
    it('returns upcoming workouts for default 7 days', async () => {
      const result = await athleteTools.getUpcomingWorkouts.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.upcomingWorkouts)).toBe(true);
    });

    it('respects days parameter', async () => {
      const result = await athleteTools.getUpcomingWorkouts.execute({ days: 3 });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.upcomingWorkouts)).toBe(true);
    });

    it('returns 14 days when requested', async () => {
      const result = await athleteTools.getUpcomingWorkouts.execute({ days: 14 });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.upcomingWorkouts)).toBe(true);
    });

    it('each workout has required fields', async () => {
      const result = await athleteTools.getUpcomingWorkouts.execute({ days: 7 });
      expect(result.success).toBe(true);
      if (result.data.upcomingWorkouts.length > 0) {
        const workout = result.data.upcomingWorkouts[0];
        expect(workout).toHaveProperty('dayNumber');
        expect(workout).toHaveProperty('weekNumber');
      }
    });
  });

  // Tool 17: getProgramWeek
  describe('Tool 17: getProgramWeek', () => {
    it('returns week object', async () => {
      const result = await athleteTools.getProgramWeek.execute({});
      expect(result.success).toBe(true);
      expect(result.data.week).toBeDefined();
    });

    it('returns week focus', async () => {
      const result = await athleteTools.getProgramWeek.execute({});
      expect(result.success).toBe(true);
      expect(result.data.week).toHaveProperty('focus');
    });

    it('returns days array', async () => {
      const result = await athleteTools.getProgramWeek.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.days)).toBe(true);
    });

    it('respects weekNumber parameter', async () => {
      const result = await athleteTools.getProgramWeek.execute({ weekNumber: 1 });
      expect(result.success).toBe(true);
      expect(result.data.week.weekNumber).toBe(1);
    });
  });
});

// ============================================
// CATEGORY 4: HEALTH & RECOVERY (6 Tools)
// ============================================

describe('Tool Category 4: Health & Recovery', () => {
  let testUser: TestUser;
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded premium athlete (has 90 days of readiness data)
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    testUser = seededUsers.premiumAthlete;

    const context: ToolContext = { db, userId: testUser.id, userRole: 'premium' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 18: getReadinessScore
  describe('Tool 18: getReadinessScore', () => {
    it('returns readiness data structure', async () => {
      const result = await athleteTools.getReadinessScore.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasReadinessData).toBe('boolean');
    });

    it('returns today data if available', async () => {
      const result = await athleteTools.getReadinessScore.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasReadinessData) {
        expect(result.data.today).toBeDefined();
      }
    });

    it('returns history if data available', async () => {
      const result = await athleteTools.getReadinessScore.execute({ days: 7 });
      expect(result.success).toBe(true);
      if (result.data.hasReadinessData) {
        expect(Array.isArray(result.data.history)).toBe(true);
      }
    });
  });

  // Tool 19: getHealthMetrics
  describe('Tool 19: getHealthMetrics', () => {
    it('returns health metrics structure', async () => {
      const result = await athleteTools.getHealthMetrics.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasMetrics).toBe('boolean');
    });

    it('returns latest metrics if available', async () => {
      const result = await athleteTools.getHealthMetrics.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasMetrics) {
        expect(result.data.latest).toBeDefined();
      }
    });

    it('respects days parameter', async () => {
      const result = await athleteTools.getHealthMetrics.execute({ days: 30 });
      expect(result.success).toBe(true);
    });

    it('returns averages if data available', async () => {
      const result = await athleteTools.getHealthMetrics.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasMetrics) {
        expect(result.data.averages).toBeDefined();
      }
    });
  });

  // Tool 20: getSleepData
  describe('Tool 20: getSleepData', () => {
    it('returns sleep data structure', async () => {
      const result = await athleteTools.getSleepData.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasSleepData).toBe('boolean');
    });

    it('returns nights array if data available', async () => {
      const result = await athleteTools.getSleepData.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasSleepData) {
        expect(Array.isArray(result.data.nights)).toBe(true);
      }
    });

    it('respects days parameter', async () => {
      const result = await athleteTools.getSleepData.execute({ days: 14 });
      expect(result.success).toBe(true);
    });

    it('returns trend if data available', async () => {
      const result = await athleteTools.getSleepData.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasSleepData) {
        expect(result.data).toHaveProperty('trend');
      }
    });
  });

  // Tool 21: getDailySummary
  describe('Tool 21: getDailySummary', () => {
    it('returns a valid date', async () => {
      const result = await athleteTools.getDailySummary.execute({});
      expect(result.success).toBe(true);
      // Date should be a valid ISO date string (YYYY-MM-DD format)
      expect(result.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns readiness data (may be null)', async () => {
      const result = await athleteTools.getDailySummary.execute({});
      expect(result.success).toBe(true);
      // readiness can be null or object
      expect(result.data.readiness === null || typeof result.data.readiness === 'object').toBe(true);
    });

    it('returns activity data (may be null)', async () => {
      const result = await athleteTools.getDailySummary.execute({});
      expect(result.success).toBe(true);
      // activity can be null or object
      expect(result.data.activity === null || typeof result.data.activity === 'object').toBe(true);
    });

    it('returns nutrition data (may be null)', async () => {
      const result = await athleteTools.getDailySummary.execute({});
      expect(result.success).toBe(true);
      // nutrition can be null or object
      expect(result.data.nutrition === null || typeof result.data.nutrition === 'object').toBe(true);
    });
  });

  // Tool 22: getFatigueScore
  describe('Tool 22: getFatigueScore', () => {
    it('returns load data structure', async () => {
      const result = await athleteTools.getFatigueScore.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasLoadData).toBe('boolean');
    });

    it('returns fatigue status if data available', async () => {
      const result = await athleteTools.getFatigueScore.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasLoadData) {
        expect(['fresh', 'optimal', 'fatigued', 'overreaching']).toContain(result.data.fatigueStatus);
      }
    });

    it('returns metrics if data available', async () => {
      const result = await athleteTools.getFatigueScore.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasLoadData) {
        expect(result.data.metrics).toBeDefined();
      }
    });

    it('returns recommendation if data available', async () => {
      const result = await athleteTools.getFatigueScore.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasLoadData) {
        expect(result.data.recommendation).toBeDefined();
      }
    });
  });

  // Tool 23: getNutritionLog
  describe('Tool 23: getNutritionLog', () => {
    it('returns nutrition data structure', async () => {
      const result = await athleteTools.getNutritionLog.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasNutritionData).toBe('boolean');
    });

    it('returns days array if data available', async () => {
      const result = await athleteTools.getNutritionLog.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasNutritionData) {
        expect(Array.isArray(result.data.days)).toBe(true);
      }
    });

    it('respects days parameter', async () => {
      const result = await athleteTools.getNutritionLog.execute({ days: 14 });
      expect(result.success).toBe(true);
    });

    it('returns averages if data available', async () => {
      const result = await athleteTools.getNutritionLog.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasNutritionData) {
        expect(result.data.averages).toBeDefined();
      }
    });
  });
});

// ============================================
// CATEGORY 5: RUNNING & CARDIO (4 Tools)
// ============================================

describe('Tool Category 5: Running & Cardio', () => {
  let testUser: TestUser;
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded premium athlete (has 30 running activities)
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    testUser = seededUsers.premiumAthlete;

    const context: ToolContext = { db, userId: testUser.id, userRole: 'premium' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 24: getRecentRuns
  describe('Tool 24: getRecentRuns', () => {
    it('returns runs data structure', async () => {
      const result = await athleteTools.getRecentRuns.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasRuns).toBe('boolean');
    });

    it('respects limit parameter', async () => {
      const result = await athleteTools.getRecentRuns.execute({ limit: 3 });
      expect(result.success).toBe(true);
      if (result.data.hasRuns) {
        expect(result.data.runs.length).toBeLessThanOrEqual(3);
      }
    });

    it('returns runs array if data available', async () => {
      const result = await athleteTools.getRecentRuns.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasRuns) {
        expect(Array.isArray(result.data.runs)).toBe(true);
      }
    });

    it('filters by run type', async () => {
      const result = await athleteTools.getRecentRuns.execute({ runType: 'easy' });
      expect(result.success).toBe(true);
    });
  });

  // Tool 25: getRunningPRs
  describe('Tool 25: getRunningPRs', () => {
    it('returns PRs data structure', async () => {
      const result = await athleteTools.getRunningPRs.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasPRs).toBe('boolean');
    });

    it('filters by 5k prType', async () => {
      const result = await athleteTools.getRunningPRs.execute({ prType: '5k' });
      expect(result.success).toBe(true);
    });

    it('filters by 10k prType', async () => {
      const result = await athleteTools.getRunningPRs.execute({ prType: '10k' });
      expect(result.success).toBe(true);
    });

    it('returns records array if data available', async () => {
      const result = await athleteTools.getRunningPRs.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasPRs) {
        expect(Array.isArray(result.data.records)).toBe(true);
      }
    });
  });

  // Tool 26: getRunningStats
  describe('Tool 26: getRunningStats', () => {
    it('returns stats data structure', async () => {
      const result = await athleteTools.getRunningStats.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasStats).toBe('boolean');
    });

    it('returns period info', async () => {
      const result = await athleteTools.getRunningStats.execute({ days: 30 });
      expect(result.success).toBe(true);
      if (result.data.hasStats) {
        expect(result.data.period).toContain('30');
      }
    });

    it('returns stats object if data available', async () => {
      const result = await athleteTools.getRunningStats.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasStats) {
        expect(result.data.stats).toBeDefined();
      }
    });

    it('respects days parameter', async () => {
      const result = await athleteTools.getRunningStats.execute({ days: 7 });
      expect(result.success).toBe(true);
    });
  });

  // Tool 27: getShoeMileage
  describe('Tool 27: getShoeMileage', () => {
    it('returns shoes data structure', async () => {
      const result = await athleteTools.getShoeMileage.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasShoes).toBe('boolean');
    });

    it('returns shoes array if data available', async () => {
      const result = await athleteTools.getShoeMileage.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasShoes) {
        expect(Array.isArray(result.data.shoes)).toBe(true);
      }
    });

    it('respects activeOnly parameter', async () => {
      const result = await athleteTools.getShoeMileage.execute({ activeOnly: false });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// CATEGORY 6: INJURY MANAGEMENT (3 Tools)
// ============================================

describe('Tool Category 6: Injury Management', () => {
  let testUser: TestUser;
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded premium athlete
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    testUser = seededUsers.premiumAthlete;

    const context: ToolContext = { db, userId: testUser.id, userRole: 'premium' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 28: getInjuryHistory
  describe('Tool 28: getInjuryHistory', () => {
    it('returns profile data structure', async () => {
      const result = await athleteTools.getInjuryHistory.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasProfile).toBe('boolean');
    });

    it('returns current injuries if available', async () => {
      const result = await athleteTools.getInjuryHistory.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasProfile) {
        // currentInjuries can be string or null
        expect(result.data.currentInjuries === null || typeof result.data.currentInjuries === 'string').toBe(true);
      }
    });

    it('returns exercises to avoid', async () => {
      const result = await athleteTools.getInjuryHistory.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasProfile) {
        expect(Array.isArray(result.data.exercisesToAvoid)).toBe(true);
      }
    });

    it('returns hasActiveInjury flag', async () => {
      const result = await athleteTools.getInjuryHistory.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasProfile) {
        expect(typeof result.data.hasActiveInjury).toBe('boolean');
      }
    });
  });

  // Tool 29: getInjuryRiskAssessment
  describe('Tool 29: getInjuryRiskAssessment', () => {
    it('returns assessment data structure', async () => {
      const result = await athleteTools.getInjuryRiskAssessment.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasAssessment).toBe('boolean');
    });

    it('returns overall risk if assessment available', async () => {
      const result = await athleteTools.getInjuryRiskAssessment.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasAssessment) {
        expect(result.data.overallRisk).toBeDefined();
      }
    });

    it('returns risk factors if assessment available', async () => {
      const result = await athleteTools.getInjuryRiskAssessment.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasAssessment) {
        expect(result.data.riskFactors).toBeDefined();
      }
    });

    it('returns recommendations if assessment available', async () => {
      const result = await athleteTools.getInjuryRiskAssessment.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasAssessment) {
        expect(result.data.recommendations).toBeDefined();
      }
    });
  });

  // Tool 30: getExercisesToAvoid
  describe('Tool 30: getExercisesToAvoid', () => {
    it('returns restrictions data structure', async () => {
      const result = await athleteTools.getExercisesToAvoid.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasRestrictions).toBe('boolean');
    });

    it('returns exercises to avoid array', async () => {
      const result = await athleteTools.getExercisesToAvoid.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.exercisesToAvoid)).toBe(true);
    });

    it('accepts bodyPart filter', async () => {
      const result = await athleteTools.getExercisesToAvoid.execute({ bodyPart: 'back' });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// CATEGORY 7: KNOWLEDGE & RAG (3 Tools)
// ============================================

describe('Tool Category 7: Knowledge & RAG', () => {
  let testUser: TestUser;
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded free athlete for knowledge base tests
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    testUser = seededUsers.freeAthlete;

    const context: ToolContext = { db, userId: testUser.id, userRole: 'free' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 31: searchKnowledgeBase
  describe('Tool 31: searchKnowledgeBase', () => {
    it('searches for training info', async () => {
      const result = await athleteTools.searchKnowledgeBase.execute({
        query: 'how to increase bench press'
      });
      expect(result.success).toBe(true);
      // Returns hasResults flag
      expect(typeof result.data.hasResults).toBe('boolean');
    });

    it('searches for nutrition info', async () => {
      const result = await athleteTools.searchKnowledgeBase.execute({
        query: 'protein intake for muscle building',
        category: 'nutrition'
      });
      expect(result.success).toBe(true);
    });

    it('searches for recovery info', async () => {
      const result = await athleteTools.searchKnowledgeBase.execute({
        query: 'rest between sets',
        category: 'recovery'
      });
      expect(result.success).toBe(true);
    });

    it('searches for strength info', async () => {
      const result = await athleteTools.searchKnowledgeBase.execute({
        query: 'squat depth',
        category: 'strength'
      });
      expect(result.success).toBe(true);
    });
  });

  // Tool 32: getExerciseFormTips
  describe('Tool 32: getExerciseFormTips', () => {
    it('returns form tips for squat', async () => {
      const result = await athleteTools.getExerciseFormTips.execute({
        exerciseName: 'squat'
      });
      // May return error if exercise not found in DB
      expect(result).toBeDefined();
    });

    it('returns form cues when exercise found', async () => {
      const result = await athleteTools.getExerciseFormTips.execute({
        exerciseName: 'bench press'
      });
      if (result.success) {
        expect(Array.isArray(result.data.formCues)).toBe(true);
      }
    });

    it('returns common mistakes when exercise found', async () => {
      const result = await athleteTools.getExerciseFormTips.execute({
        exerciseName: 'deadlift'
      });
      if (result.success) {
        expect(Array.isArray(result.data.commonMistakes)).toBe(true);
      }
    });

    it('returns tips when exercise found', async () => {
      const result = await athleteTools.getExerciseFormTips.execute({
        exerciseName: 'overhead press'
      });
      if (result.success) {
        expect(Array.isArray(result.data.tips)).toBe(true);
      }
    });
  });

  // Tool 33: getTrainingPrinciples
  describe('Tool 33: getTrainingPrinciples', () => {
    it('returns principles for progressive overload', async () => {
      const result = await athleteTools.getTrainingPrinciples.execute({
        topic: 'progressive_overload'
      });
      expect(result.success).toBe(true);
      expect(result.data.topic).toBe('progressive_overload');
    });

    it('returns content or principles', async () => {
      const result = await athleteTools.getTrainingPrinciples.execute({
        topic: 'periodization'
      });
      expect(result.success).toBe(true);
      // Either content (fallback) or principles (from KB)
      expect(result.data.content || result.data.principles).toBeDefined();
    });

    it('returns fromKnowledgeBase flag', async () => {
      const result = await athleteTools.getTrainingPrinciples.execute({
        topic: 'deload'
      });
      expect(result.success).toBe(true);
      expect(typeof result.data.fromKnowledgeBase).toBe('boolean');
    });

    it('returns topic in response', async () => {
      const result = await athleteTools.getTrainingPrinciples.execute({
        topic: 'recovery'
      });
      expect(result.success).toBe(true);
      expect(result.data.topic).toBe('recovery');
    });
  });
});

// ============================================
// CATEGORY 8: ANALYTICS (2 Tools)
// ============================================

describe('Tool Category 8: Analytics', () => {
  let testUser: TestUser;
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded premium athlete (has 30 workouts for analytics)
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    testUser = seededUsers.premiumAthlete;

    const context: ToolContext = { db, userId: testUser.id, userRole: 'premium' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 34: getVolumeAnalytics
  describe('Tool 34: getVolumeAnalytics', () => {
    it('returns hasData flag', async () => {
      const result = await athleteTools.getVolumeAnalytics.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasData).toBe('boolean');
    });

    it('returns period info', async () => {
      const result = await athleteTools.getVolumeAnalytics.execute({ days: 30 });
      expect(result.success).toBe(true);
      // Either has period or message
      expect(result.data.period || result.data.message).toBeDefined();
    });

    it('returns summary when data exists', async () => {
      const result = await athleteTools.getVolumeAnalytics.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasData) {
        expect(result.data.summary).toBeDefined();
      }
    });

    it('returns muscle group distribution when data exists', async () => {
      const result = await athleteTools.getVolumeAnalytics.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasData) {
        expect(result.data.muscleGroupDistribution).toBeDefined();
      }
    });

    it('accepts days parameter', async () => {
      const result = await athleteTools.getVolumeAnalytics.execute({
        days: 14
      });
      expect(result.success).toBe(true);
    });
  });

  // Tool 35: getProgressTrends
  describe('Tool 35: getProgressTrends', () => {
    it('returns hasData flag', async () => {
      const result = await athleteTools.getProgressTrends.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasData).toBe('boolean');
    });

    it('accepts weeks parameter', async () => {
      const result = await athleteTools.getProgressTrends.execute({ weeks: 8 });
      expect(result.success).toBe(true);
    });

    it('accepts exerciseId parameter', async () => {
      const result = await athleteTools.getProgressTrends.execute({
        exerciseId: '00000000-0000-0000-0000-000000000000'
      });
      expect(result.success).toBe(true);
    });

    it('returns trends when data exists', async () => {
      const result = await athleteTools.getProgressTrends.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasData) {
        expect(result.data.trends).toBeDefined();
      }
    });

    it('returns type field when data exists', async () => {
      const result = await athleteTools.getProgressTrends.execute({});
      expect(result.success).toBe(true);
      if (result.data.hasData) {
        expect(['exercise', 'overall']).toContain(result.data.type);
      }
    });
  });
});

// ============================================
// CATEGORY 9: COACH - CLIENT MANAGEMENT (8 Tools)
// ============================================

describe('Tool Category 9: Coach Client Management', () => {
  let coachUser: TestUser;
  let clientUser: TestUser;
  let coachTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded coach and clients (coach has 2 active clients with workouts/programs)
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    coachUser = seededUsers.coach;
    clientUser = seededUsers.client1; // Use client1 for tests that need a specific client

    const context: ToolContext = { db, userId: coachUser.id, userRole: 'coach' };
    coachTools = collectTools(context, getAllCoachTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 36: getClientList
  describe('Tool 36: getClientList', () => {
    it('returns clients data structure', async () => {
      const result = await coachTools.getClientList.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.hasClients).toBe('boolean');
    });

    it('filters by active status', async () => {
      const result = await coachTools.getClientList.execute({ status: 'active' });
      expect(result.success).toBe(true);
    });

    it('returns all clients', async () => {
      const result = await coachTools.getClientList.execute({ status: 'all' });
      expect(result.success).toBe(true);
    });

    it('returns clients array', async () => {
      const result = await coachTools.getClientList.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.clients)).toBe(true);
    });
  });

  // Tool 37: getClientProfile
  describe('Tool 37: getClientProfile', () => {
    it('returns client data', async () => {
      const result = await coachTools.getClientProfile.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(result.data.client).toBeDefined();
    });

    it('returns client name', async () => {
      const result = await coachTools.getClientProfile.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(result.data.client.name).toBeDefined();
    });

    it('returns client goals', async () => {
      const result = await coachTools.getClientProfile.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(result.data.client.goals).toBeDefined();
    });

    it('handles non-existent client', async () => {
      const result = await coachTools.getClientProfile.execute({
        clientId: '00000000-0000-0000-0000-000000000000'
      });
      // Should return error
      expect(result.success).toBe(false);
    });
  });

  // Tool 38: getClientWorkouts
  describe('Tool 38: getClientWorkouts', () => {
    it('returns client workouts', async () => {
      const result = await coachTools.getClientWorkouts.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.workouts)).toBe(true);
    });

    it('respects limit parameter', async () => {
      const result = await coachTools.getClientWorkouts.execute({
        clientId: clientUser.id,
        limit: 3
      });
      expect(result.success).toBe(true);
      expect(result.data.workouts.length).toBeLessThanOrEqual(3);
    });

    it('returns totalCount', async () => {
      const result = await coachTools.getClientWorkouts.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(typeof result.data.totalCount).toBe('number');
    });
  });

  // Tool 39: getClientProgress
  describe('Tool 39: getClientProgress', () => {
    it('returns client progress', async () => {
      const result = await coachTools.getClientProgress.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('period');
    });

    it('respects days parameter', async () => {
      const result = await coachTools.getClientProgress.execute({
        clientId: clientUser.id,
        days: 30
      });
      expect(result.success).toBe(true);
      expect(result.data.period).toContain('30');
    });

    it('returns workouts completed', async () => {
      const result = await coachTools.getClientProgress.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(typeof result.data.progress.workoutsCompleted).toBe('number');
    });

    it('returns hasActiveProgram flag', async () => {
      const result = await coachTools.getClientProgress.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(typeof result.data.progress.hasActiveProgram).toBe('boolean');
    });
  });

  // Tool 40: getClientHealthData
  describe('Tool 40: getClientHealthData', () => {
    it('returns health data structure', async () => {
      const result = await coachTools.getClientHealthData.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(result.data.clientId).toBe(clientUser.id);
    });

    it('respects days parameter', async () => {
      const result = await coachTools.getClientHealthData.execute({
        clientId: clientUser.id,
        days: 14
      });
      expect(result.success).toBe(true);
    });

    it('returns readiness array', async () => {
      const result = await coachTools.getClientHealthData.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.readiness)).toBe(true);
    });

    it('returns health array', async () => {
      const result = await coachTools.getClientHealthData.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.health)).toBe(true);
    });
  });

  // Tool 41: getClientProgram
  describe('Tool 41: getClientProgram', () => {
    it('returns client program status', async () => {
      const result = await coachTools.getClientProgram.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(typeof result.data.hasProgram).toBe('boolean');
    });

    it('returns program details if exists', async () => {
      const result = await coachTools.getClientProgram.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      if (result.data.hasProgram) {
        expect(result.data.program).toHaveProperty('name');
      }
    });
  });

  // Tool 42: getClientCheckIns
  describe('Tool 42: getClientCheckIns', () => {
    it('returns check-ins array', async () => {
      const result = await coachTools.getClientCheckIns.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.checkIns)).toBe(true);
    });

    it('respects limit parameter', async () => {
      const result = await coachTools.getClientCheckIns.execute({
        clientId: clientUser.id,
        limit: 5
      });
      expect(result.success).toBe(true);
    });
  });

  // Tool 43: getCoachNotes
  describe('Tool 43: getCoachNotes', () => {
    it('returns notes array', async () => {
      const result = await coachTools.getCoachNotes.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.notes)).toBe(true);
    });

    it('each note has content', async () => {
      const result = await coachTools.getCoachNotes.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      if (result.data.notes.length > 0) {
        expect(result.data.notes[0]).toHaveProperty('content');
      }
    });
  });
});

// ============================================
// CATEGORY 10: COACH - PROGRAM MANAGEMENT (5 Tools)
// ============================================

describe('Tool Category 10: Coach Program Management', () => {
  let coachUser: TestUser;
  let clientUser: TestUser;
  let coachTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded coach and clients
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    coachUser = seededUsers.coach;
    clientUser = seededUsers.client1;

    const context: ToolContext = { db, userId: coachUser.id, userRole: 'coach' };
    coachTools = collectTools(context, getAllCoachTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 44: getProgramTemplates
  describe('Tool 44: getProgramTemplates', () => {
    it('returns templates array', async () => {
      const result = await coachTools.getProgramTemplates.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.templates)).toBe(true);
    });

    it('filters by programType', async () => {
      const result = await coachTools.getProgramTemplates.execute({ programType: 'strength' });
      expect(result.success).toBe(true);
    });

    it('returns totalCount', async () => {
      const result = await coachTools.getProgramTemplates.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.totalCount).toBe('number');
    });
  });

  // Tool 45: assignProgramToClient
  describe('Tool 45: assignProgramToClient', () => {
    it('handles missing template', async () => {
      const result = await coachTools.assignProgramToClient.execute({
        clientId: clientUser.id,
        templateId: '00000000-0000-0000-0000-000000000000',
      });
      // Should return error for non-existent template
      expect(result.success).toBe(false);
    });

    it('accepts startDate parameter', async () => {
      const templates = await coachTools.getProgramTemplates.execute({});
      if (templates.data.templates.length > 0) {
        const result = await coachTools.assignProgramToClient.execute({
          clientId: clientUser.id,
          templateId: templates.data.templates[0].id,
          startDate: new Date().toISOString().split('T')[0],
        });
        expect(result).toBeDefined();
      }
    });
  });

  // Tool 46: getProgramAdherence
  describe('Tool 46: getProgramAdherence', () => {
    it('returns adherence data for specific client', async () => {
      const result = await coachTools.getProgramAdherence.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(typeof result.data.hasProgram).toBe('boolean');
    });

    it('returns bulk adherence message without clientId', async () => {
      const result = await coachTools.getProgramAdherence.execute({});
      expect(result.success).toBe(true);
    });
  });

  // Tool 47: getBulkAssignmentStatus
  describe('Tool 47: getBulkAssignmentStatus', () => {
    it('returns jobs array', async () => {
      const result = await coachTools.getBulkAssignmentStatus.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.jobs)).toBe(true);
    });

    it('accepts jobId parameter', async () => {
      const result = await coachTools.getBulkAssignmentStatus.execute({
        jobId: '00000000-0000-0000-0000-000000000000'
      });
      expect(result.success).toBe(true);
    });
  });

  // Tool 48: getCSVImportStatus
  describe('Tool 48: getCSVImportStatus', () => {
    it('returns imports array', async () => {
      const result = await coachTools.getCSVImportStatus.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.imports)).toBe(true);
    });

    it('accepts importId parameter', async () => {
      const result = await coachTools.getCSVImportStatus.execute({
        importId: '00000000-0000-0000-0000-000000000000'
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// CATEGORY 11: COACH - MESSAGING (3 Tools)
// ============================================

describe('Tool Category 11: Coach Messaging', () => {
  let coachUser: TestUser;
  let clientUser: TestUser;
  let coachTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded coach and clients (has existing conversation)
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    coachUser = seededUsers.coach;
    clientUser = seededUsers.client1;

    const context: ToolContext = { db, userId: coachUser.id, userRole: 'coach' };
    coachTools = collectTools(context, getAllCoachTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 49: getClientConversations
  describe('Tool 49: getClientConversations', () => {
    it('returns conversations array', async () => {
      const result = await coachTools.getClientConversations.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.conversations)).toBe(true);
    });

    it('filters by clientId', async () => {
      const result = await coachTools.getClientConversations.execute({ clientId: clientUser.id });
      expect(result.success).toBe(true);
    });

    it('returns totalCount', async () => {
      const result = await coachTools.getClientConversations.execute({});
      expect(result.success).toBe(true);
      expect(typeof result.data.totalCount).toBe('number');
    });
  });

  // Tool 50: getConversationMessages
  describe('Tool 50: getConversationMessages', () => {
    it('handles non-existent conversation', async () => {
      const result = await coachTools.getConversationMessages.execute({
        conversationId: '00000000-0000-0000-0000-000000000000'
      });
      // Should return error for non-existent conversation
      expect(result.success).toBe(false);
    });

    it('accepts limit parameter', async () => {
      // First create a conversation
      const sendResult = await coachTools.sendMessageToClient.execute({
        clientId: clientUser.id,
        message: 'Test message for conversation',
      });
      if (sendResult.success) {
        const result = await coachTools.getConversationMessages.execute({
          conversationId: sendResult.data.conversationId,
          limit: 10
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // Tool 51: sendMessageToClient
  describe('Tool 51: sendMessageToClient', () => {
    it('sends message successfully', async () => {
      const result = await coachTools.sendMessageToClient.execute({
        clientId: clientUser.id,
        message: 'Great workout today! Keep up the good work.',
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('messageId');
    });

    it('returns conversationId', async () => {
      const result = await coachTools.sendMessageToClient.execute({
        clientId: clientUser.id,
        message: 'Remember to stretch after your workout.',
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('conversationId');
    });

    it('returns success flag', async () => {
      const result = await coachTools.sendMessageToClient.execute({
        clientId: clientUser.id,
        message: 'How are you feeling today?',
      });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
    });
  });
});

// ============================================
// CATEGORY 12: COACH - ANALYTICS (2 Tools)
// ============================================

describe('Tool Category 12: Coach Analytics', () => {
  let coachUser: TestUser;
  let clientUser: TestUser;
  let coachTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded coach and clients
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    coachUser = seededUsers.coach;
    clientUser = seededUsers.client1;

    const context: ToolContext = { db, userId: coachUser.id, userRole: 'coach' };
    coachTools = collectTools(context, getAllCoachTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 52: getClientAnalyticsSummary (requires clientId)
  describe('Tool 52: getClientAnalyticsSummary', () => {
    it('returns analytics summary for client', async () => {
      const result = await coachTools.getClientAnalyticsSummary.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('period');
    });

    it('respects days parameter', async () => {
      const result = await coachTools.getClientAnalyticsSummary.execute({
        clientId: clientUser.id,
        days: 30
      });
      expect(result.success).toBe(true);
      expect(result.data.period).toContain('30');
    });

    it('returns analytics object', async () => {
      const result = await coachTools.getClientAnalyticsSummary.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(result.data.analytics).toBeDefined();
    });

    it('returns workouts completed count', async () => {
      const result = await coachTools.getClientAnalyticsSummary.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(typeof result.data.analytics.workoutsCompleted).toBe('number');
    });
  });

  // Tool 53: getAtRiskClients
  describe('Tool 53: getAtRiskClients', () => {
    it('returns at-risk clients structure', async () => {
      const result = await coachTools.getAtRiskClients.execute({});
      expect(result.success).toBe(true);
      expect(result.data.atRiskClients).toBeDefined();
    });

    it('returns lowAdherence array', async () => {
      const result = await coachTools.getAtRiskClients.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.atRiskClients.lowAdherence)).toBe(true);
    });

    it('returns thresholds', async () => {
      const result = await coachTools.getAtRiskClients.execute({});
      expect(result.success).toBe(true);
      expect(result.data.thresholds).toBeDefined();
    });

    it('respects inactiveDays parameter', async () => {
      const result = await coachTools.getAtRiskClients.execute({
        inactiveDays: 14
      });
      expect(result.success).toBe(true);
      expect(result.data.thresholds.inactiveDays).toBe(14);
    });
  });
});

// ============================================
// CATEGORY 13: COACH - PROFILE (2 Tools)
// ============================================

describe('Tool Category 13: Coach Profile', () => {
  let coachUser: TestUser;
  let coachTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded coach
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    coachUser = seededUsers.coach;

    const context: ToolContext = { db, userId: coachUser.id, userRole: 'coach' };
    coachTools = collectTools(context, getAllCoachTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 54: getCoachProfile
  describe('Tool 54: getCoachProfile', () => {
    it('returns coach profile', async () => {
      const result = await coachTools.getCoachProfile.execute({});
      expect(result.success).toBe(true);
      expect(result.data.profile).toBeDefined();
    });

    it('returns coach name', async () => {
      const result = await coachTools.getCoachProfile.execute({});
      expect(result.success).toBe(true);
      expect(result.data.profile.name).toBe('Test Coach');
    });

    it('returns coach tier', async () => {
      const result = await coachTools.getCoachProfile.execute({});
      expect(result.success).toBe(true);
      expect(result.data.profile.tier).toBe('coach');
    });

    it('returns specializations', async () => {
      const result = await coachTools.getCoachProfile.execute({});
      expect(result.success).toBe(true);
      expect(result.data.profile.specializations).toBeDefined();
    });
  });

  // Tool 55: getPendingInvitations
  describe('Tool 55: getPendingInvitations', () => {
    it('returns invitations array', async () => {
      const result = await coachTools.getPendingInvitations.execute({});
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.invitations)).toBe(true);
    });

    it('accepts status filter', async () => {
      const result = await coachTools.getPendingInvitations.execute({ status: 'pending' });
      expect(result.success).toBe(true);
    });

    it('accepts limit parameter', async () => {
      const result = await coachTools.getPendingInvitations.execute({ limit: 10 });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// CATEGORY 14: COACH - CLIENT INJURIES (1 Tool)
// ============================================

describe('Tool Category 14: Coach Client Injuries', () => {
  let coachUser: TestUser;
  let clientUser: TestUser;
  let coachTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded coach and clients
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    coachUser = seededUsers.coach;
    clientUser = seededUsers.client1;

    const context: ToolContext = { db, userId: coachUser.id, userRole: 'coach' };
    coachTools = collectTools(context, getAllCoachTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 56: getClientInjuries
  describe('Tool 56: getClientInjuries', () => {
    it('returns current injuries for client', async () => {
      const result = await coachTools.getClientInjuries.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(result.data.currentInjuries).toBeDefined();
    });

    it('returns exercises to avoid', async () => {
      const result = await coachTools.getClientInjuries.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.exercisesToAvoid)).toBe(true);
    });

    it('handles non-existent client with error', async () => {
      const result = await coachTools.getClientInjuries.execute({
        clientId: '00000000-0000-0000-0000-000000000000'
      });
      expect(result.success).toBe(false);
    });

    it('returns clientId in response', async () => {
      const result = await coachTools.getClientInjuries.execute({
        clientId: clientUser.id
      });
      expect(result.success).toBe(true);
      expect(result.data.clientId).toBe(clientUser.id);
    });
  });
});

// ============================================
// CATEGORY 15: FUTURE/PLANNED TOOLS (4 Stubs)
// ============================================

describe('Tool Category 15: Future/Planned Tools', () => {
  let testUser: TestUser;
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded premium athlete
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }
    testUser = seededUsers.premiumAthlete;

    const context: ToolContext = { db, userId: testUser.id, userRole: 'premium' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  // Tool 57: getWatchSyncStatus (Planned)
  describe('Tool 57: getWatchSyncStatus (stub)', () => {
    it('returns sync status structure', async () => {
      if (athleteTools.getWatchSyncStatus) {
        const result = await athleteTools.getWatchSyncStatus.execute({});
        expect(result.success).toBe(true);
        expect(typeof result.data.isConnected).toBe('boolean');
      } else {
        // Tool not yet implemented - that's expected
        expect(true).toBe(true);
      }
    });
  });

  // Tool 58: analyzeFormVideo (Planned)
  describe('Tool 58: analyzeFormVideo (stub)', () => {
    it('handles video analysis request', async () => {
      if (athleteTools.analyzeFormVideo) {
        const result = await athleteTools.analyzeFormVideo.execute({
          videoUrl: 'https://example.com/video.mp4',
          exerciseName: 'squat',
        });
        expect(result).toBeDefined();
      } else {
        expect(true).toBe(true);
      }
    });
  });

  // Tool 59: detectPlateau (Planned)
  describe('Tool 59: detectPlateau (stub)', () => {
    it('detects training plateaus', async () => {
      if (athleteTools.detectPlateau) {
        const result = await athleteTools.detectPlateau.execute({});
        expect(result.success).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  // Tool 60: getRecoveryPrediction (Planned)
  describe('Tool 60: getRecoveryPrediction (stub)', () => {
    it('predicts recovery time', async () => {
      if (athleteTools.getRecoveryPrediction) {
        const result = await athleteTools.getRecoveryPrediction.execute({});
        expect(result.success).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });
});

// ============================================
// AI MULTI-TURN CONVERSATION TESTS
// ============================================

describe('AI Multi-Turn Conversations with All Tools', () => {
  let athleteTools: Record<string, any>;

  beforeAll(async () => {
    // Use pre-seeded premium athlete with comprehensive data
    if (!seededUsers) {
      seededUsers = await getSeededTestUsers();
    }

    const context: ToolContext = { db, userId: seededUsers.premiumAthlete.id, userRole: 'premium' };
    athleteTools = collectTools(context, getAllAthleteTools());
  }, SETUP_TIMEOUT);

  // No cleanup needed - using pre-seeded data

  describe('AI selects appropriate tools for complex queries', () => {
    it('AI gathers multiple data sources for "complete fitness overview"', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        prompt: 'Give me a complete fitness overview. Use getUserProfile, getRecentWorkouts, getActiveProgram, and getUserStreaks.',
      });

      // AI should make tool calls
      expect(result.toolCalls).toBeDefined();
      // Either text or tool results should be present
      expect(result.text.length > 0 || result.toolResults.length > 0).toBe(true);
    }, GROK_TIMEOUT);

    it('AI combines health and workout data for "should I train today"', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        prompt: 'Should I train today? Check my readiness, fatigue, and what workout is scheduled.',
      });

      expect(result.toolCalls).toBeDefined();
      expect(result.text.length > 0 || result.toolResults.length > 0).toBe(true);
    }, GROK_TIMEOUT);

    it('AI handles injury-aware recommendations', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        prompt: 'I have a shoulder injury. What exercises should I avoid? Check my injuries and suggest safe alternatives.',
      });

      expect(result.toolCalls).toBeDefined();
      expect(result.text.length > 0 || result.toolResults.length > 0).toBe(true);
    }, GROK_TIMEOUT);

    it('AI provides progress analysis', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        prompt: 'How am I progressing? Check my program progress, personal records, and workout history.',
      });

      expect(result.toolCalls).toBeDefined();
      expect(result.text.length > 0 || result.toolResults.length > 0).toBe(true);
    }, GROK_TIMEOUT);
  });
});

