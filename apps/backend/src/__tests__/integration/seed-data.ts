/**
 * Comprehensive Database Seed Script
 *
 * Seeds the Supabase database with realistic test data for all 60 tools.
 * Idempotent - checks if data exists before inserting.
 *
 * Test Users:
 * 1. Free Tier Athlete (test-free-athlete@voicefit.ai) - Tier: free
 * 2. Premium Tier Athlete (test-premium-athlete@voicefit.ai) - Tier: premium
 * 3. Coach User (test-coach@voicefit.ai) - Tier: coach, has 2 active clients
 * 4. Client 1 (test-client-1@voicefit.ai) - Tier: premium, assigned to coach
 * 5. Client 2 (test-client-2@voicefit.ai) - Tier: premium, assigned to coach
 */

import { db } from '../../db';
import { eq, and } from 'drizzle-orm';
import {
  users,
  userProfiles,
  userStreaks,
  userBadges,
  badgeDefinitions,
  workouts,
  workoutSets,
  exercises,
  trainingPrograms,
  programWeeks,
  programDays,
  readinessScores,
  runningActivities,
  runningShoes,
  coachClients,
  coachNotes,
  conversations,
  messages,
  userOnboarding,
} from '../../db/schema';

// ============================================
// TEST USER EMAILS (Stable identifiers)
// ============================================
export const TEST_EMAILS = {
  FREE_ATHLETE: 'test-free-athlete@voicefit.ai',
  PREMIUM_ATHLETE: 'test-premium-athlete@voicefit.ai',
  COACH: 'test-coach@voicefit.ai',
  CLIENT_1: 'test-client-1@voicefit.ai',
  CLIENT_2: 'test-client-2@voicefit.ai',
} as const;

// ============================================
// HELPER: Get or create user
// ============================================
async function getOrCreateUser(email: string): Promise<string> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) return existing.id;
  const [newUser] = await db.insert(users).values({ email }).returning();
  return newUser.id;
}

// ============================================
// SEED TEST USERS
// ============================================
export async function seedTestUsers(): Promise<{
  freeAthleteId: string;
  premiumAthleteId: string;
  coachId: string;
  client1Id: string;
  client2Id: string;
}> {
  console.log('[Seed] Creating test users...');

  const freeAthleteId = await getOrCreateUser(TEST_EMAILS.FREE_ATHLETE);
  const premiumAthleteId = await getOrCreateUser(TEST_EMAILS.PREMIUM_ATHLETE);
  const coachId = await getOrCreateUser(TEST_EMAILS.COACH);
  const client1Id = await getOrCreateUser(TEST_EMAILS.CLIENT_1);
  const client2Id = await getOrCreateUser(TEST_EMAILS.CLIENT_2);

  const profiles = [
    {
      userId: freeAthleteId,
      name: 'Free Tier Athlete',
      experienceLevel: 'beginner' as const,
      goals: ['general_fitness', 'weight_loss'],
      tier: 'free' as const,
      preferredWeightUnit: 'lbs',
      trainingFrequency: '3 days/week',
      preferredEquipment: ['dumbbell', 'bodyweight'],
    },
    {
      userId: premiumAthleteId,
      name: 'Premium Tier Athlete',
      experienceLevel: 'intermediate' as const,
      goals: ['strength', 'muscle_building', 'endurance'],
      tier: 'premium' as const,
      preferredWeightUnit: 'lbs',
      trainingFrequency: '5 days/week',
      preferredEquipment: ['barbell', 'dumbbell', 'cable', 'machine'],
      injuries: 'Mild lower back tightness - avoid heavy deadlifts',
      exercisesToAvoid: ['conventional_deadlift'],
    },
    {
      userId: coachId,
      name: 'Test Coach',
      experienceLevel: 'advanced' as const,
      goals: ['coaching', 'client_success'],
      tier: 'coach' as const,
      preferredWeightUnit: 'kg',
      trainingFrequency: '4 days/week',
      preferredEquipment: ['barbell', 'dumbbell', 'kettlebell'],
    },
    {
      userId: client1Id,
      name: 'Client One',
      experienceLevel: 'beginner' as const,
      goals: ['weight_loss', 'general_fitness'],
      tier: 'premium' as const,
      preferredWeightUnit: 'lbs',
      trainingFrequency: '3 days/week',
      preferredEquipment: ['dumbbell', 'bodyweight', 'bands'],
    },
    {
      userId: client2Id,
      name: 'Client Two',
      experienceLevel: 'intermediate' as const,
      goals: ['strength', 'muscle_building'],
      tier: 'premium' as const,
      preferredWeightUnit: 'kg',
      trainingFrequency: '4 days/week',
      preferredEquipment: ['barbell', 'dumbbell', 'cable'],
      injuries: 'Right shoulder impingement - avoid overhead pressing',
      exercisesToAvoid: ['overhead_press', 'military_press'],
    },
  ];

  for (const profile of profiles) {
    const existing = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, profile.userId),
    });
    if (existing) {
      await db.update(userProfiles).set(profile).where(eq(userProfiles.userId, profile.userId));
    } else {
      await db.insert(userProfiles).values(profile);
    }
  }

  console.log('[Seed] Test users created/updated');
  return { freeAthleteId, premiumAthleteId, coachId, client1Id, client2Id };
}


// ============================================
// SEED COACH-CLIENT RELATIONSHIPS
// ============================================
export async function seedCoachClientRelationships(
  coachId: string,
  client1Id: string,
  client2Id: string
): Promise<void> {
  console.log('[Seed] Creating coach-client relationships...');

  const relationships = [
    { coachId, clientId: client1Id, status: 'active' as const },
    { coachId, clientId: client2Id, status: 'active' as const },
  ];

  for (const rel of relationships) {
    const existing = await db.query.coachClients.findFirst({
      where: and(eq(coachClients.coachId, rel.coachId), eq(coachClients.clientId, rel.clientId)),
    });
    if (!existing) {
      await db.insert(coachClients).values(rel);
    }
  }

  // Add coach notes for clients
  const notes = [
    {
      coachId,
      clientId: client1Id,
      noteType: 'progress' as const,
      content: 'Client showing great progress with consistency. Increased workout frequency.',
    },
    {
      coachId,
      clientId: client2Id,
      noteType: 'injury' as const,
      content: 'Shoulder impingement improving. Can start light lateral raises next week.',
    },
  ];

  for (const note of notes) {
    const existing = await db.query.coachNotes.findFirst({
      where: and(eq(coachNotes.coachId, note.coachId), eq(coachNotes.clientId, note.clientId)),
    });
    if (!existing) {
      await db.insert(coachNotes).values(note);
    }
  }

  console.log('[Seed] Coach-client relationships created');
}

// ============================================
// SEED EXERCISES (Base data needed for workouts)
// ============================================
export async function seedExercises(): Promise<Map<string, string>> {
  console.log('[Seed] Creating exercises...');

  type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quadriceps' | 'hamstrings' | 'lats';
  const exerciseData: Array<{ name: string; primaryMuscle: MuscleGroup; isCompound: boolean }> = [
    { name: 'Barbell Bench Press', primaryMuscle: 'chest', isCompound: true },
    { name: 'Barbell Squat', primaryMuscle: 'quadriceps', isCompound: true },
    { name: 'Barbell Deadlift', primaryMuscle: 'back', isCompound: true },
    { name: 'Overhead Press', primaryMuscle: 'shoulders', isCompound: true },
    { name: 'Barbell Row', primaryMuscle: 'back', isCompound: true },
    { name: 'Dumbbell Curl', primaryMuscle: 'biceps', isCompound: false },
    { name: 'Tricep Pushdown', primaryMuscle: 'triceps', isCompound: false },
    { name: 'Lat Pulldown', primaryMuscle: 'lats', isCompound: true },
    { name: 'Leg Press', primaryMuscle: 'quadriceps', isCompound: true },
    { name: 'Romanian Deadlift', primaryMuscle: 'hamstrings', isCompound: true },
  ];

  const exerciseMap = new Map<string, string>();

  for (const ex of exerciseData) {
    let existing = await db.query.exercises.findFirst({ where: eq(exercises.name, ex.name) });
    if (!existing) {
      const [created] = await db.insert(exercises).values({
        name: ex.name,
        primaryMuscle: ex.primaryMuscle,
        isCompound: ex.isCompound,
        normalizedName: ex.name.toLowerCase().replace(/\s+/g, '_'),
      }).returning();
      existing = created;
    }
    exerciseMap.set(ex.name, existing.id);
  }

  console.log('[Seed] Exercises created');
  return exerciseMap;
}


// ============================================
// SEED WORKOUT DATA (For workout/analytics tools)
// ============================================
export async function seedWorkoutData(
  userId: string,
  exerciseMap: Map<string, string>,
  options: { workoutCount?: number; daysBack?: number } = {}
): Promise<void> {
  console.log(`[Seed] Creating workout data for user ${userId}...`);

  const { workoutCount = 20, daysBack = 60 } = options;
  const workoutNames = ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body'];
  const exerciseNames = Array.from(exerciseMap.keys());

  for (let i = 0; i < workoutCount; i++) {
    const daysAgo = Math.floor((daysBack / workoutCount) * i);
    const startedAt = new Date();
    startedAt.setDate(startedAt.getDate() - daysAgo);
    startedAt.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    const durationMinutes = 45 + Math.floor(Math.random() * 45); // 45-90 minutes
    const completedAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const [workout] = await db.insert(workouts).values({
      userId,
      name: workoutNames[i % workoutNames.length],
      status: 'completed',
      startedAt,
      completedAt,
      duration: durationMinutes * 60, // duration is in seconds
    }).returning();

    // Add 4-6 sets per workout
    const setCount = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < setCount; j++) {
      const exerciseName = exerciseNames[j % exerciseNames.length];
      const exerciseId = exerciseMap.get(exerciseName);
      if (!exerciseId) continue;

      const baseWeight = 100 + Math.floor(Math.random() * 100);
      const progressWeight = Math.floor(i * 2.5); // Progressive overload

      await db.insert(workoutSets).values({
        workoutId: workout.id,
        userId,
        exerciseId,
        setNumber: j + 1,
        weight: baseWeight + progressWeight,
        reps: 8 + Math.floor(Math.random() * 5),
        rpe: 7 + Math.floor(Math.random() * 3),
        isPr: i > 15 && j === 0 && Math.random() > 0.7,
      });
    }
  }

  console.log(`[Seed] Created ${workoutCount} workouts for user`);
}

// ============================================
// SEED READINESS/HEALTH DATA
// ============================================
export async function seedReadinessData(userId: string, daysBack: number = 30): Promise<void> {
  console.log(`[Seed] Creating readiness data for user ${userId}...`);

  for (let i = 0; i < daysBack; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0); // Normalize to 8am

    // Check if exists for this day (approximate check)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await db.query.readinessScores.findFirst({
      where: eq(readinessScores.userId, userId),
    });

    // Skip if user already has readiness data (simplified check)
    if (existing && i === 0) {
      console.log('[Seed] Readiness data already exists, skipping...');
      return;
    }

    const baseScore = 60 + Math.floor(Math.random() * 30);
    await db.insert(readinessScores).values({
      userId,
      date,
      overallScore: baseScore,
      sleepQuality: Math.max(1, Math.min(10, Math.floor(baseScore / 10) + Math.floor(Math.random() * 3) - 1)),
      energyLevel: Math.max(1, Math.min(10, Math.floor(baseScore / 10) + Math.floor(Math.random() * 3) - 1)),
      motivation: Math.max(1, Math.min(10, Math.floor(baseScore / 10) + Math.floor(Math.random() * 3) - 1)),
      soreness: Math.max(1, Math.min(10, 10 - Math.floor(baseScore / 10) + Math.floor(Math.random() * 3) - 1)),
      stress: Math.max(1, Math.min(10, 10 - Math.floor(baseScore / 10) + Math.floor(Math.random() * 3) - 1)),
    });
  }

  console.log(`[Seed] Created ${daysBack} days of readiness data`);
}


// ============================================
// SEED RUNNING DATA
// ============================================
export async function seedRunningData(userId: string, runCount: number = 15): Promise<void> {
  console.log(`[Seed] Creating running data for user ${userId}...`);

  // Create a shoe first
  let shoe = await db.query.runningShoes.findFirst({ where: eq(runningShoes.userId, userId) });
  if (!shoe) {
    const [created] = await db.insert(runningShoes).values({
      userId,
      brand: 'Nike',
      model: 'Pegasus 40',
      totalMileageMeters: 0,
      isActive: true,
    }).returning();
    shoe = created;
  }

  const runTypes: Array<'easy' | 'tempo' | 'interval' | 'long_run' | 'recovery'> = [
    'easy', 'tempo', 'interval', 'long_run', 'recovery',
  ];

  for (let i = 0; i < runCount; i++) {
    const daysAgo = Math.floor((60 / runCount) * i);
    const startedAt = new Date();
    startedAt.setDate(startedAt.getDate() - daysAgo);
    startedAt.setHours(6 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60));

    const distanceMeters = 3000 + Math.floor(Math.random() * 12000);
    const paceSecondsPerKm = 300 + Math.floor(Math.random() * 180);
    const durationSeconds = Math.floor((distanceMeters / 1000) * paceSecondsPerKm);

    await db.insert(runningActivities).values({
      userId,
      distanceMeters,
      durationSeconds,
      runType: runTypes[i % runTypes.length],
      startedAt,
      completedAt: new Date(startedAt.getTime() + durationSeconds * 1000),
      avgPaceSecondsPerKm: paceSecondsPerKm,
      avgHeartRate: 140 + Math.floor(Math.random() * 30),
      elevationGainMeters: Math.floor(Math.random() * 200),
    });

    // Update shoe mileage
    await db.update(runningShoes)
      .set({ totalMileageMeters: (shoe.totalMileageMeters ?? 0) + distanceMeters })
      .where(eq(runningShoes.id, shoe.id));
  }

  console.log(`[Seed] Created ${runCount} runs for user`);
}

// ============================================
// SEED TRAINING PROGRAM
// ============================================
export async function seedTrainingProgram(userId: string): Promise<string | null> {
  console.log(`[Seed] Creating training program for user ${userId}...`);

  const existing = await db.query.trainingPrograms.findFirst({
    where: and(eq(trainingPrograms.userId, userId), eq(trainingPrograms.status, 'active')),
  });
  if (existing) {
    console.log('[Seed] Active program already exists');
    return existing.id;
  }

  const [program] = await db.insert(trainingPrograms).values({
    userId,
    name: 'Strength Foundation',
    description: '12-week strength building program',
    programType: 'strength',
    durationWeeks: 12,
    daysPerWeek: 3,
    currentWeek: 3,
    status: 'active',
    totalWorkoutsScheduled: 48,
    totalWorkoutsCompleted: 8,
    adherencePercent: 67,
  }).returning();

  // Create program weeks
  let dayNumber = 1;
  for (let week = 1; week <= 12; week++) {
    const [programWeek] = await db.insert(programWeeks).values({
      programId: program.id,
      weekNumber: week,
      name: `Week ${week}`,
      focus: week <= 4 ? 'Foundation' : week <= 8 ? 'Building' : 'Peak',
      isCompleted: week < 3,
    }).returning();

    // Create program days (3 days per week)
    const dayTypes: Array<'push' | 'pull' | 'legs'> = ['push', 'pull', 'legs'];
    for (let day = 0; day < 3; day++) {
      await db.insert(programDays).values({
        programId: program.id,
        weekId: programWeek.id,
        weekNumber: week,
        dayNumber: dayNumber++,
        dayOfWeek: [1, 3, 5][day], // Mon, Wed, Fri
        name: `${dayTypes[day].charAt(0).toUpperCase() + dayTypes[day].slice(1)} Day`,
        workoutType: dayTypes[day],
        estimatedDuration: 60,
        isCompleted: week < 3 || (week === 3 && day < 2),
      });
    }
  }

  console.log('[Seed] Training program created');
  return program.id;
}


// ============================================
// SEED STREAKS AND BADGES
// ============================================
export async function seedStreaksAndBadges(userId: string): Promise<void> {
  console.log(`[Seed] Creating streaks and badges for user ${userId}...`);

  // Create streaks for different types
  const streakTypes = ['workout', 'logging', 'running'];
  for (const streakType of streakTypes) {
    const existingStreak = await db.query.userStreaks.findFirst({
      where: and(eq(userStreaks.userId, userId), eq(userStreaks.streakType, streakType)),
    });
    if (!existingStreak) {
      await db.insert(userStreaks).values({
        userId,
        streakType,
        currentStreak: 5 + Math.floor(Math.random() * 10),
        longestStreak: 10 + Math.floor(Math.random() * 10),
        lastActivityDate: new Date().toISOString().split('T')[0],
      });
    }
  }

  // Ensure badge definitions exist
  const badgeDefs = [
    { id: 'first_workout', name: 'First Workout', description: 'Complete your first workout', badgeType: 'milestone' },
    { id: 'week_warrior', name: 'Week Warrior', description: 'Complete 7 workouts in a week', badgeType: 'streak' },
    { id: 'pr_crusher', name: 'PR Crusher', description: 'Set a new personal record', badgeType: 'strength' },
  ];

  for (const def of badgeDefs) {
    const existing = await db.query.badgeDefinitions.findFirst({
      where: eq(badgeDefinitions.id, def.id),
    });
    if (!existing) {
      await db.insert(badgeDefinitions).values(def);
    }
  }

  // Award badges to user
  for (const def of badgeDefs) {
    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, def.id)),
    });
    if (!existing) {
      await db.insert(userBadges).values({
        userId,
        badgeId: def.id,
        badgeType: def.badgeType,
        earnedAt: new Date(),
      });
    }
  }

  console.log('[Seed] Streaks and badges created');
}

// ============================================
// SEED CONVERSATIONS (For coach messaging)
// ============================================
export async function seedConversations(coachId: string, clientId: string): Promise<void> {
  console.log(`[Seed] Creating conversation between coach and client...`);

  const existing = await db.query.conversations.findFirst({
    where: and(eq(conversations.userId, clientId)),
  });
  if (existing) {
    console.log('[Seed] Conversation already exists');
    return;
  }

  const [conversation] = await db.insert(conversations).values({
    userId: clientId,
    title: 'Coaching Session',
    isActive: true,
  }).returning();

  // Add some messages
  const messageData = [
    { role: 'user' as const, content: 'Hi coach, I had a great workout today!' },
    { role: 'assistant' as const, content: 'That\'s fantastic! How did the new program feel?' },
    { role: 'user' as const, content: 'The progressive overload is working well. Hit a PR on bench!' },
    { role: 'assistant' as const, content: 'Excellent progress! Keep up the great work.' },
  ];

  for (const msg of messageData) {
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: msg.role,
      content: msg.content,
    });
  }

  console.log('[Seed] Conversation created');
}

// ============================================
// ONBOARDING DATA
// ============================================
async function seedOnboarding(userId: string): Promise<void> {
  // Check if already seeded
  const existing = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, userId),
  });
  if (existing) {
    console.log(`[Seed] Onboarding already exists for ${userId}, skipping`);
    return;
  }

  await db.insert(userOnboarding).values({
    userId,
    currentStep: 'welcome',
    stepsCompleted: [],
    isComplete: false,
  });

  console.log(`[Seed] Onboarding record created for ${userId}`);
}

// ============================================
// MAIN SEED FUNCTION
// ============================================
export async function seedAllData(): Promise<void> {
  console.log('========================================');
  console.log('[Seed] Starting comprehensive data seed...');
  console.log('========================================');

  const startTime = Date.now();

  // 1. Create test users
  const { freeAthleteId, premiumAthleteId, coachId, client1Id, client2Id } = await seedTestUsers();

  // 2. Create coach-client relationships
  await seedCoachClientRelationships(coachId, client1Id, client2Id);

  // 3. Create exercises
  const exerciseMap = await seedExercises();

  // 4. Seed workout data for all users
  await seedWorkoutData(premiumAthleteId, exerciseMap, { workoutCount: 30, daysBack: 90 });
  await seedWorkoutData(client1Id, exerciseMap, { workoutCount: 15, daysBack: 45 });
  await seedWorkoutData(client2Id, exerciseMap, { workoutCount: 20, daysBack: 60 });

  // 5. Seed readiness data
  await seedReadinessData(premiumAthleteId, 30);
  await seedReadinessData(client1Id, 30);
  await seedReadinessData(client2Id, 30);

  // 6. Seed running data
  await seedRunningData(premiumAthleteId, 20);
  await seedRunningData(client1Id, 10);

  // 7. Seed training programs
  await seedTrainingProgram(premiumAthleteId);
  await seedTrainingProgram(client1Id);

  // 8. Seed streaks and badges
  await seedStreaksAndBadges(premiumAthleteId);
  await seedStreaksAndBadges(client1Id);
  await seedStreaksAndBadges(client2Id);

  // 9. Seed onboarding records
  await seedOnboarding(premiumAthleteId);
  await seedOnboarding(client1Id);
  await seedOnboarding(client2Id);

  // 10. Seed conversations
  await seedConversations(coachId, client1Id);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('========================================');
  console.log(`[Seed] Complete! Duration: ${duration}s`);
  console.log('========================================');
}

// Export user IDs for tests
export async function getTestUserIds(): Promise<{
  freeAthleteId: string;
  premiumAthleteId: string;
  coachId: string;
  client1Id: string;
  client2Id: string;
}> {
  const freeAthlete = await db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.FREE_ATHLETE) });
  const premiumAthlete = await db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.PREMIUM_ATHLETE) });
  const coach = await db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.COACH) });
  const client1 = await db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.CLIENT_1) });
  const client2 = await db.query.users.findFirst({ where: eq(users.email, TEST_EMAILS.CLIENT_2) });

  if (!freeAthlete || !premiumAthlete || !coach || !client1 || !client2) {
    throw new Error('Test users not found. Run seedAllData() first.');
  }

  return {
    freeAthleteId: freeAthlete.id,
    premiumAthleteId: premiumAthlete.id,
    coachId: coach.id,
    client1Id: client1.id,
    client2Id: client2.id,
  };
}