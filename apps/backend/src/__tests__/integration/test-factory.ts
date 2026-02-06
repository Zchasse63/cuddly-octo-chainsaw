/**
 * Test Factory for E2E Integration Tests
 *
 * Provides access to pre-seeded test data in the database.
 * Run `seedAllData()` from seed-data.ts before running tests.
 *
 * Test Users (pre-seeded):
 * - test-free-athlete@voicefit.ai (Tier: free)
 * - test-premium-athlete@voicefit.ai (Tier: premium) - has workouts, runs, programs
 * - test-coach@voicefit.ai (Tier: coach) - has 2 active clients
 * - test-client-1@voicefit.ai (Tier: premium) - assigned to coach
 * - test-client-2@voicefit.ai (Tier: premium) - assigned to coach
 */

import { db } from '../../db';
import {
  users,
  userProfiles,
  workouts,
  workoutSets,
  exercises,
  personalRecords,
  trainingPrograms,
  programWeeks,
  programDays,
  programExercises,
  runningActivities,
  runningPRs,
  userStreaks,
  userBadges,
  badgeDefinitions,
  coachClients,
} from '../../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { TEST_EMAILS } from './seed-data';

// Re-export TEST_EMAILS for convenience
export { TEST_EMAILS };

// ============================================
// TYPES
// ============================================

export interface TestUser {
  id: string;
  email: string;
  profile: {
    name: string;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    goals: string[];
    tier: 'free' | 'premium' | 'coach';
    preferredWeightUnit: 'lbs' | 'kg';
    preferredEquipment?: string[];
    exercisesToAvoid?: string[];
    injuries?: string;
  };
}

export interface SeededTestUsers {
  freeAthlete: TestUser;
  premiumAthlete: TestUser;
  coach: TestUser;
  client1: TestUser;
  client2: TestUser;
}

// Cached seeded users (loaded once)
let cachedSeededUsers: SeededTestUsers | null = null;

export interface TestWorkout {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'cancelled';
  sets: Array<{
    id: string;
    exerciseId: string;
    exerciseName: string;
    reps: number;
    weight: number;
    rpe?: number;
  }>;
}

export interface TestProgram {
  id: string;
  name: string;
  programType: 'strength' | 'running' | 'hybrid';
  durationWeeks: number;
  daysPerWeek: number;
  weekIds: string[];
  dayIds: string[];
}

// ============================================
// SEEDED TEST USER ACCESS
// ============================================

/**
 * Get pre-seeded test users from the database.
 * Caches the result for subsequent calls.
 * Requires running seedAllData() before tests.
 */
export async function getSeededTestUsers(): Promise<SeededTestUsers> {
  if (cachedSeededUsers) {
    return cachedSeededUsers;
  }

  const [freeAthlete, premiumAthlete, coach, client1, client2] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.FREE_ATHLETE) }),
    db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.PREMIUM_ATHLETE) }),
    db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.COACH) }),
    db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.CLIENT_1) }),
    db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.CLIENT_2) }),
  ]);

  if (!freeAthlete || !premiumAthlete || !coach || !client1 || !client2) {
    throw new Error(
      'Test users not found. Run seedAllData() from seed-data.ts first.\n' +
      'Command: npx tsx -r dotenv/config -e "import { seedAllData } from \'./src/__tests__/integration/seed-data\'; seedAllData();"'
    );
  }

  // Get profiles
  const [freeProfile, premiumProfile, coachProfile, client1Profile, client2Profile] = await Promise.all([
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, freeAthlete.id) }),
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, premiumAthlete.id) }),
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, coach.id) }),
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, client1.id) }),
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, client2.id) }),
  ]);

  const makeTestUser = (user: typeof freeAthlete, profile: typeof freeProfile): TestUser => ({
    id: user!.id,
    email: user!.email,
    profile: {
      name: profile?.name ?? 'Test User',
      experienceLevel: (profile?.experienceLevel as any) ?? 'intermediate',
      goals: profile?.goals ?? [],
      tier: (profile?.tier as any) ?? 'free',
      preferredWeightUnit: (profile?.preferredWeightUnit as any) ?? 'lbs',
      preferredEquipment: profile?.preferredEquipment ?? [],
      exercisesToAvoid: profile?.exercisesToAvoid ?? undefined,
      injuries: profile?.injuries ?? undefined,
    },
  });

  cachedSeededUsers = {
    freeAthlete: makeTestUser(freeAthlete, freeProfile),
    premiumAthlete: makeTestUser(premiumAthlete, premiumProfile),
    coach: makeTestUser(coach, coachProfile),
    client1: makeTestUser(client1, client1Profile),
    client2: makeTestUser(client2, client2Profile),
  };

  return cachedSeededUsers;
}

/**
 * Get coach's client IDs from the seeded data.
 */
export async function getSeededCoachClients(coachId: string): Promise<{ client1Id: string; client2Id: string }> {
  const clients = await db.query.coachClients.findMany({
    where: and(eq(coachClients.coachId, coachId), eq(coachClients.status, 'active')),
  });

  if (clients.length < 2) {
    throw new Error('Coach clients not found. Run seedAllData() first.');
  }

  return {
    client1Id: clients[0].clientId,
    client2Id: clients[1].clientId,
  };
}

/**
 * Clear the cached seeded users (useful for test isolation).
 */
export function clearSeededUserCache(): void {
  cachedSeededUsers = null;
}

// ============================================
// TEST USER FACTORY (for creating additional test users)
// ============================================

export async function createTestUser(
  overrides: Partial<TestUser['profile']> = {}
): Promise<TestUser> {
  const email = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;

  const [user] = await db.insert(users).values({ email }).returning();

  const profile = {
    name: overrides.name ?? 'E2E Test User',
    experienceLevel: overrides.experienceLevel ?? 'intermediate',
    goals: overrides.goals ?? ['strength', 'muscle_building'],
    tier: overrides.tier ?? 'premium',
    preferredWeightUnit: overrides.preferredWeightUnit ?? 'lbs',
    preferredEquipment: overrides.preferredEquipment ?? ['barbell', 'dumbbell', 'cable'],
    exercisesToAvoid: overrides.exercisesToAvoid,
    injuries: overrides.injuries,
  };

  await db.insert(userProfiles).values({
    userId: user.id,
    ...profile,
  });

  return {
    id: user.id,
    email,
    profile,
  };
}

// ============================================
// WORKOUT FACTORY
// ============================================

export async function createTestWorkout(
  userId: string,
  options: {
    name?: string;
    status?: 'active' | 'completed' | 'cancelled';
    exerciseCount?: number;
    setsPerExercise?: number;
    includesPR?: boolean;
    daysAgo?: number;
  } = {}
): Promise<TestWorkout> {
  const {
    name = 'Test Workout',
    status = 'completed',
    exerciseCount = 3,
    setsPerExercise = 3,
    includesPR = false,
    daysAgo = 0,
  } = options;

  const startedAt = new Date();
  startedAt.setDate(startedAt.getDate() - daysAgo);
  
  const completedAt = status === 'completed' ? new Date(startedAt.getTime() + 3600000) : undefined;

  const [workout] = await db.insert(workouts).values({
    userId,
    name,
    status,
    startedAt,
    completedAt,
    duration: status === 'completed' ? 3600 : undefined,
  }).returning();

  // Get some exercises from the database
  const dbExercises = await db.select().from(exercises).limit(exerciseCount);
  
  const sets: TestWorkout['sets'] = [];
  
  for (let i = 0; i < dbExercises.length; i++) {
    const exercise = dbExercises[i];
    for (let setNum = 1; setNum <= setsPerExercise; setNum++) {
      const weight = 100 + (i * 20) + (setNum * 5);
      const reps = 10 - setNum + 1;
      const isPr = includesPR && i === 0 && setNum === setsPerExercise;
      
      const [set] = await db.insert(workoutSets).values({
        workoutId: workout.id,
        exerciseId: exercise.id,
        userId,
        setNumber: setNum,
        reps,
        weight,
        weightUnit: 'lbs',
        rpe: 7 + setNum,
        isPr,
      }).returning();

      sets.push({
        id: set.id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        reps,
        weight,
        rpe: 7 + setNum,
      });
    }
  }

  return { id: workout.id, name, status, sets };
}

// ============================================
// PROGRAM FACTORY
// ============================================

export async function createTestProgram(
  userId: string,
  options: {
    name?: string;
    programType?: 'strength' | 'running' | 'hybrid';
    durationWeeks?: number;
    daysPerWeek?: number;
    status?: 'draft' | 'active' | 'completed';
  } = {}
): Promise<TestProgram> {
  const {
    name = 'Test Program',
    programType = 'strength',
    durationWeeks = 4,
    daysPerWeek = 4,
    status = 'active',
  } = options;

  const [program] = await db.insert(trainingPrograms).values({
    userId,
    name,
    programType,
    durationWeeks,
    daysPerWeek,
    primaryGoal: 'build_muscle',
    status,
    currentWeek: 1,
    currentDay: 1,
    startDate: new Date().toISOString().split('T')[0],
  }).returning();

  const weekIds: string[] = [];
  const dayIds: string[] = [];

  // Create weeks
  for (let w = 1; w <= durationWeeks; w++) {
    const [week] = await db.insert(programWeeks).values({
      programId: program.id,
      weekNumber: w,
      name: `Week ${w}`,
      focus: w === durationWeeks ? 'deload' : 'volume',
    }).returning();
    weekIds.push(week.id);

    // Create days for each week
    for (let d = 1; d <= daysPerWeek; d++) {
      const [day] = await db.insert(programDays).values({
        programId: program.id,
        weekId: week.id,
        weekNumber: w,
        dayOfWeek: d,
        dayNumber: (w - 1) * daysPerWeek + d,
        workoutType: programType === 'running' ? 'easy_run' : 'push',
        name: `Day ${d}`,
        estimatedDuration: 60,
      }).returning();
      dayIds.push(day.id);
    }
  }

  return { id: program.id, name, programType, durationWeeks, daysPerWeek, weekIds, dayIds };
}

// ============================================
// INJURY FACTORY (Updates user profile)
// ============================================

export async function createTestInjury(
  userId: string,
  options: {
    bodyPart?: string;
    severity?: 'mild' | 'moderate' | 'severe';
    exercisesToAvoid?: string[];
  } = {}
): Promise<{ updated: boolean }> {
  const {
    bodyPart = 'lower_back',
    severity = 'moderate',
    exercisesToAvoid = ['deadlift', 'barbell row'],
  } = options;

  // Injuries are stored in user profile as text
  const injuryText = `${bodyPart} - ${severity} severity`;

  await db.update(userProfiles)
    .set({
      injuries: injuryText,
      exercisesToAvoid,
    })
    .where(eq(userProfiles.userId, userId));

  return { updated: true };
}

// ============================================
// RUNNING ACTIVITY FACTORY
// ============================================

export async function createTestRun(
  userId: string,
  options: {
    distanceMeters?: number;
    durationSeconds?: number;
    runType?: 'easy' | 'tempo' | 'interval' | 'long_run' | 'recovery' | 'fartlek' | 'hill' | 'race';
    daysAgo?: number;
  } = {}
): Promise<{ id: string }> {
  const {
    distanceMeters = 5000,
    durationSeconds = 1800,
    runType = 'easy',
    daysAgo = 0,
  } = options;

  const startedAt = new Date();
  startedAt.setDate(startedAt.getDate() - daysAgo);

  const [run] = await db.insert(runningActivities).values({
    userId,
    distanceMeters,
    durationSeconds,
    runType,
    startedAt,
    completedAt: new Date(startedAt.getTime() + durationSeconds * 1000),
    avgPaceSecondsPerKm: Math.round((durationSeconds / distanceMeters) * 1000),
  }).returning();

  return { id: run.id };
}

// ============================================
// STREAK FACTORY
// ============================================

export async function createTestStreak(
  userId: string,
  options: {
    streakType?: 'workout' | 'logging';
    currentStreak?: number;
    longestStreak?: number;
  } = {}
): Promise<{ id: string }> {
  const {
    streakType = 'workout',
    currentStreak = 7,
    longestStreak = 14,
  } = options;

  const [streak] = await db.insert(userStreaks).values({
    userId,
    streakType,
    currentStreak,
    longestStreak,
    lastActivityDate: new Date().toISOString().split('T')[0],
  }).returning();

  return { id: streak.id };
}

// ============================================
// CLEANUP UTILITIES
// ============================================

export async function cleanupTestUser(userId: string): Promise<void> {
  // Delete in order of dependencies
  await db.delete(workoutSets).where(eq(workoutSets.userId, userId)).catch(() => {});
  await db.delete(personalRecords).where(eq(personalRecords.userId, userId)).catch(() => {});
  await db.delete(workouts).where(eq(workouts.userId, userId)).catch(() => {});
  await db.delete(programExercises).where(
    inArray(programExercises.programDayId,
      db.select({ id: programDays.id }).from(programDays)
        .innerJoin(trainingPrograms, eq(programDays.programId, trainingPrograms.id))
        .where(eq(trainingPrograms.userId, userId))
    )
  ).catch(() => {});
  await db.delete(programDays).where(
    inArray(programDays.programId,
      db.select({ id: trainingPrograms.id }).from(trainingPrograms).where(eq(trainingPrograms.userId, userId))
    )
  ).catch(() => {});
  await db.delete(programWeeks).where(
    inArray(programWeeks.programId,
      db.select({ id: trainingPrograms.id }).from(trainingPrograms).where(eq(trainingPrograms.userId, userId))
    )
  ).catch(() => {});
  await db.delete(trainingPrograms).where(eq(trainingPrograms.userId, userId)).catch(() => {});
  await db.delete(runningActivities).where(eq(runningActivities.userId, userId)).catch(() => {});
  await db.delete(runningPRs).where(eq(runningPRs.userId, userId)).catch(() => {});
  await db.delete(userStreaks).where(eq(userStreaks.userId, userId)).catch(() => {});
  await db.delete(userBadges).where(eq(userBadges.userId, userId)).catch(() => {});
  await db.delete(userProfiles).where(eq(userProfiles.userId, userId)).catch(() => {});
  await db.delete(users).where(eq(users.id, userId)).catch(() => {});
}

// ============================================
// ASSERTION HELPERS
// ============================================

export function assertValidUUID(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Expected UUID string, got ${typeof value}`);
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid UUID format: ${value}`);
  }
}

export function assertValidDate(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Expected date string, got ${typeof value}`);
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
}

export function assertInRange(value: number, min: number, max: number, label: string): void {
  if (value < min || value > max) {
    throw new Error(`${label} (${value}) out of range [${min}, ${max}]`);
  }
}

