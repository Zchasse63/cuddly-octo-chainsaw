#!/usr/bin/env node
/**
 * Comprehensive Demo Data Seeder
 *
 * Creates 4 demo accounts with full seeded data:
 * 1. coach@voicefit.demo - Coach account
 * 2. client1@voicefit.demo - Client linked to coach
 * 3. client2@voicefit.demo - Client linked to coach
 * 4. athlete@voicefit.demo - Premium athlete for iOS testing
 *
 * Run: node scripts/seed-demo-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: './apps/backend/.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = postgres(databaseUrl);

// Demo user definitions
const DEMO_USERS = {
  coach: {
    email: 'coach@voicefit.demo',
    name: 'Sarah Mitchell',
    tier: 'coach',
  },
  client1: {
    email: 'client1@voicefit.demo',
    name: 'Alex Johnson',
    tier: 'premium',
  },
  client2: {
    email: 'client2@voicefit.demo',
    name: 'Sam Williams',
    tier: 'premium',
  },
  athlete: {
    email: 'athlete@voicefit.demo',
    name: 'Jordan Taylor',
    tier: 'premium',
  },
  // Past client (terminated)
  pastClient: {
    email: 'past-client@voicefit.demo',
    name: 'Chris Martinez',
    tier: 'premium',
  },
};

const PASSWORD = 'testpass123';

// Helper to generate dates
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================
// STEP 1: CLEANUP
// ============================================
async function cleanupDatabase() {
  console.log('🧹 Step 1: Cleaning up database...\n');

  // Delete in correct order due to foreign keys
  const deleteOrder = [
    'workout_sets',
    'workouts',
    'messages',
    'conversations',
    'running_activity_shoes',
    'running_activities',
    'running_shoes',
    'readiness_scores',
    'user_badges',
    'user_streaks',
    'personal_records',
    'pr_history',
    'body_measurements',
    'user_goals',
    'scheduled_sessions',
    'training_calendar',
    'notifications',
    'coach_notes',
    'coach_clients',
    'program_days',
    'program_weeks',
    'training_programs',
    'user_profiles',
    'users',
  ];

  for (const table of deleteOrder) {
    try {
      await sql`DELETE FROM ${sql(table)}`;
      console.log(`  ✓ Cleared ${table}`);
    } catch (e) {
      console.log(`  ⚠ Could not clear ${table}: ${e.message}`);
    }
  }

  // Delete Supabase auth users (except keep any non-demo users)
  console.log('\n  Cleaning Supabase auth users...');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  for (const user of authUsers.users) {
    if (user.email?.includes('voicefit.demo') ||
        user.email?.includes('@test.local') ||
        user.email?.includes('@integration.test') ||
        user.email?.includes('@voicefit.ai')) {
      await supabase.auth.admin.deleteUser(user.id);
      console.log(`  ✓ Deleted auth user: ${user.email}`);
    }
  }

  console.log('\n✅ Cleanup complete\n');
}

// ============================================
// STEP 2: CREATE AUTH USERS
// ============================================
async function createAuthUsers() {
  console.log('👤 Step 2: Creating Supabase auth users...\n');

  const userIds = {};

  for (const [key, user] of Object.entries(DEMO_USERS)) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: user.name },
    });

    if (error) {
      console.error(`  ❌ Failed to create ${user.email}: ${error.message}`);
      continue;
    }

    userIds[key] = data.user.id;
    console.log(`  ✓ Created ${user.email} (${data.user.id})`);
  }

  console.log('\n✅ Auth users created\n');
  return userIds;
}

// ============================================
// STEP 3: CREATE DATABASE USERS & PROFILES
// ============================================
async function createDatabaseUsers(userIds) {
  console.log('📝 Step 3: Creating database users & profiles...\n');

  for (const [key, user] of Object.entries(DEMO_USERS)) {
    const userId = userIds[key];
    if (!userId) continue;

    // Create user record (may already exist from Supabase trigger)
    await sql`
      INSERT INTO users (id, email, created_at, updated_at)
      VALUES (${userId}, ${user.email}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET email = ${user.email}
    `;

    // Create profile
    const profile = {
      coach: {
        experienceLevel: 'advanced',
        goals: ['help_clients', 'build_business'],
        trainingFrequency: '5 days/week',
        preferredEquipment: ['barbell', 'dumbbell', 'cable', 'machine'],
      },
      client1: {
        experienceLevel: 'intermediate',
        goals: ['build_muscle', 'increase_strength'],
        trainingFrequency: '4 days/week',
        preferredEquipment: ['barbell', 'dumbbell', 'cable'],
        injuries: 'Mild shoulder impingement - avoid overhead pressing',
      },
      client2: {
        experienceLevel: 'beginner',
        goals: ['lose_weight', 'build_muscle', 'improve_cardio'],
        trainingFrequency: '3 days/week',
        preferredEquipment: ['dumbbell', 'machine', 'bodyweight'],
      },
      athlete: {
        experienceLevel: 'advanced',
        goals: ['increase_strength', 'powerlifting'],
        trainingFrequency: '5 days/week',
        preferredEquipment: ['barbell', 'dumbbell'],
      },
      pastClient: {
        experienceLevel: 'intermediate',
        goals: ['general_fitness'],
        trainingFrequency: '3 days/week',
        preferredEquipment: ['machine', 'cable'],
      },
    };

    await sql`
      INSERT INTO user_profiles (
        user_id, name, tier, experience_level, goals, training_frequency,
        preferred_equipment, injuries, onboarding_completed, preferred_weight_unit,
        created_at, updated_at
      ) VALUES (
        ${userId}, ${user.name}, ${user.tier}, ${profile[key].experienceLevel},
        ${profile[key].goals}, ${profile[key].trainingFrequency},
        ${profile[key].preferredEquipment}, ${profile[key].injuries || null},
        true, 'lbs', NOW(), NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        name = ${user.name},
        tier = ${user.tier},
        experience_level = ${profile[key].experienceLevel},
        goals = ${profile[key].goals},
        training_frequency = ${profile[key].trainingFrequency},
        preferred_equipment = ${profile[key].preferredEquipment},
        injuries = ${profile[key].injuries || null},
        onboarding_completed = true,
        updated_at = NOW()
    `;

    console.log(`  ✓ Created profile for ${user.name}`);
  }

  console.log('\n✅ Database users created\n');
}

// ============================================
// STEP 4: CREATE COACH-CLIENT RELATIONSHIPS
// ============================================
async function createCoachClientRelationships(userIds) {
  console.log('🤝 Step 4: Creating coach-client relationships...\n');

  const coachId = userIds.coach;

  // Active clients
  for (const clientKey of ['client1', 'client2']) {
    await sql`
      INSERT INTO coach_clients (
        coach_id, client_id, status, assigned_at, accepted_at,
        relationship_notes, created_at, updated_at
      ) VALUES (
        ${coachId}, ${userIds[clientKey]}, 'active',
        ${daysAgo(60)}, ${daysAgo(59)},
        ${clientKey === 'client1' ? 'Long-term client, very dedicated. Focus on hypertrophy.' : 'New client, still learning form. Needs extra attention on technique.'},
        ${daysAgo(60)}, NOW()
      )
    `;
    console.log(`  ✓ Linked ${DEMO_USERS[clientKey].name} to coach (active)`);
  }

  // Past client (terminated)
  await sql`
    INSERT INTO coach_clients (
      coach_id, client_id, status, assigned_at, accepted_at,
      terminated_at, termination_reason, relationship_notes,
      created_at, updated_at
    ) VALUES (
      ${coachId}, ${userIds.pastClient}, 'terminated',
      ${daysAgo(180)}, ${daysAgo(179)},
      ${daysAgo(30)}, 'Client relocated to another city',
      'Great client, made solid progress over 5 months. Moved to Seattle.',
      ${daysAgo(180)}, ${daysAgo(30)}
    )
  `;
  console.log(`  ✓ Linked ${DEMO_USERS.pastClient.name} to coach (terminated)`);

  console.log('\n✅ Coach-client relationships created\n');
}

// ============================================
// STEP 5: CREATE EXERCISES (if not exist)
// ============================================
async function ensureExercises() {
  console.log('💪 Step 5: Ensuring exercises exist...\n');

  const exercises = [
    { name: 'Barbell Bench Press', primaryMuscle: 'chest', equipment: ['barbell'], isCompound: true },
    { name: 'Incline Dumbbell Press', primaryMuscle: 'chest', equipment: ['dumbbell'], isCompound: true },
    { name: 'Cable Fly', primaryMuscle: 'chest', equipment: ['cable'], isCompound: false },
    { name: 'Barbell Squat', primaryMuscle: 'quadriceps', equipment: ['barbell'], isCompound: true },
    { name: 'Leg Press', primaryMuscle: 'quadriceps', equipment: ['machine'], isCompound: true },
    { name: 'Leg Extension', primaryMuscle: 'quadriceps', equipment: ['machine'], isCompound: false },
    { name: 'Romanian Deadlift', primaryMuscle: 'hamstrings', equipment: ['barbell'], isCompound: true },
    { name: 'Lying Leg Curl', primaryMuscle: 'hamstrings', equipment: ['machine'], isCompound: false },
    { name: 'Barbell Deadlift', primaryMuscle: 'back', equipment: ['barbell'], isCompound: true },
    { name: 'Lat Pulldown', primaryMuscle: 'back', equipment: ['cable'], isCompound: true },
    { name: 'Barbell Row', primaryMuscle: 'back', equipment: ['barbell'], isCompound: true },
    { name: 'Seated Cable Row', primaryMuscle: 'back', equipment: ['cable'], isCompound: true },
    { name: 'Overhead Press', primaryMuscle: 'shoulders', equipment: ['barbell'], isCompound: true },
    { name: 'Lateral Raise', primaryMuscle: 'shoulders', equipment: ['dumbbell'], isCompound: false },
    { name: 'Face Pull', primaryMuscle: 'shoulders', equipment: ['cable'], isCompound: false },
    { name: 'Barbell Curl', primaryMuscle: 'biceps', equipment: ['barbell'], isCompound: false },
    { name: 'Dumbbell Curl', primaryMuscle: 'biceps', equipment: ['dumbbell'], isCompound: false },
    { name: 'Tricep Pushdown', primaryMuscle: 'triceps', equipment: ['cable'], isCompound: false },
    { name: 'Skull Crusher', primaryMuscle: 'triceps', equipment: ['barbell'], isCompound: false },
    { name: 'Hip Thrust', primaryMuscle: 'glutes', equipment: ['barbell'], isCompound: true },
  ];

  // Clear existing and insert fresh
  await sql`DELETE FROM exercises WHERE name IN (${exercises.map(e => e.name)})`;

  const exerciseIds = {};
  for (const ex of exercises) {
    const [inserted] = await sql`
      INSERT INTO exercises (name, primary_muscle, equipment, is_compound, created_at)
      VALUES (${ex.name}, ${ex.primaryMuscle}, ${ex.equipment}, ${ex.isCompound}, NOW())
      RETURNING id
    `;
    exerciseIds[ex.name] = inserted.id;
  }

  console.log(`  ✓ Created ${exercises.length} exercises`);
  console.log('\n✅ Exercises ready\n');
  return exerciseIds;
}

// ============================================
// STEP 6: CREATE WORKOUTS WITH SETS
// ============================================
async function createWorkouts(userIds, exerciseIds) {
  console.log('🏋️ Step 6: Creating workouts...\n');

  const workoutTemplates = {
    'Push Day': ['Barbell Bench Press', 'Incline Dumbbell Press', 'Overhead Press', 'Lateral Raise', 'Tricep Pushdown'],
    'Pull Day': ['Barbell Deadlift', 'Lat Pulldown', 'Barbell Row', 'Face Pull', 'Barbell Curl'],
    'Leg Day': ['Barbell Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Extension', 'Lying Leg Curl'],
    'Upper Body': ['Barbell Bench Press', 'Barbell Row', 'Overhead Press', 'Dumbbell Curl', 'Tricep Pushdown'],
    'Lower Body': ['Barbell Squat', 'Romanian Deadlift', 'Leg Press', 'Hip Thrust', 'Lying Leg Curl'],
  };

  const usersToSeed = ['client1', 'client2', 'athlete', 'pastClient'];

  for (const userKey of usersToSeed) {
    const userId = userIds[userKey];
    if (!userId) continue;

    // Create 30-60 days of workout history
    const numWorkouts = userKey === 'athlete' ? 60 : userKey === 'pastClient' ? 40 : 45;

    for (let i = 0; i < numWorkouts; i++) {
      const workoutDate = daysAgo(Math.floor(i * 1.5)); // Every 1.5 days average
      const workoutNames = Object.keys(workoutTemplates);
      const workoutName = workoutNames[i % workoutNames.length];
      const exercises = workoutTemplates[workoutName];

      const status = i < numWorkouts - 3 ? 'completed' : (i === numWorkouts - 1 ? 'active' : 'completed');
      const duration = status === 'completed' ? randomBetween(45, 90) * 60 : null;

      const [workout] = await sql`
        INSERT INTO workouts (
          user_id, name, status, started_at, completed_at, duration,
          created_at, updated_at
        ) VALUES (
          ${userId}, ${workoutName}, ${status},
          ${workoutDate}, ${status === 'completed' ? workoutDate : null},
          ${duration}, ${workoutDate}, ${workoutDate}
        ) RETURNING id
      `;

      // Create sets for each exercise
      for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
        const exerciseName = exercises[exIdx];
        const exerciseId = exerciseIds[exerciseName];
        if (!exerciseId) continue;

        const numSets = randomBetween(3, 5);
        for (let setNum = 1; setNum <= numSets; setNum++) {
          const weight = randomBetween(45, 225);
          const reps = randomBetween(6, 12);

          await sql`
            INSERT INTO workout_sets (
              workout_id, exercise_id, user_id, set_number,
              reps, weight, weight_unit, rpe, logging_method,
              created_at, updated_at
            ) VALUES (
              ${workout.id}, ${exerciseId}, ${userId}, ${setNum},
              ${reps}, ${weight}, 'lbs', ${randomBetween(7, 10)}, 'manual',
              ${workoutDate}, ${workoutDate}
            )
          `;
        }
      }
    }

    console.log(`  ✓ Created ${numWorkouts} workouts for ${DEMO_USERS[userKey].name}`);
  }

  console.log('\n✅ Workouts created\n');
}

// ============================================
// STEP 7: CREATE CONVERSATIONS & MESSAGES
// ============================================
async function createConversations(userIds) {
  console.log('💬 Step 7: Creating conversations...\n');

  const conversationTopics = [
    { title: 'Workout Planning', messages: [
      { role: 'user', content: 'I want to focus on building my chest this month. What exercises do you recommend?' },
      { role: 'assistant', content: 'Great goal! For chest development, I recommend focusing on: 1) Barbell Bench Press for overall mass, 2) Incline Dumbbell Press for upper chest, and 3) Cable Flyes for isolation. Aim for 3-4 chest sessions per week with progressive overload.' },
      { role: 'user', content: 'How many sets should I do per session?' },
      { role: 'assistant', content: 'For hypertrophy, aim for 10-20 sets per week for chest, spread across your sessions. So if you train chest 3x/week, that is about 4-6 sets per session. Start on the lower end and increase as you adapt.' },
    ]},
    { title: 'Nutrition Questions', messages: [
      { role: 'user', content: 'How much protein should I be eating daily?' },
      { role: 'assistant', content: 'For muscle building, aim for 0.7-1g of protein per pound of body weight. If you weigh 180lbs, that is 126-180g of protein daily. Spread it across 4-5 meals for optimal absorption.' },
    ]},
    { title: 'Recovery Advice', messages: [
      { role: 'user', content: 'My shoulders have been feeling sore lately. Should I take a break?' },
      { role: 'assistant', content: 'If it is muscle soreness, that is normal. But if it is joint pain, I recommend: 1) Reduce overhead pressing volume, 2) Add face pulls and external rotations for rotator cuff health, 3) Consider a deload week if you have been training hard for 4+ weeks.' },
    ]},
    { title: 'Form Check', messages: [
      { role: 'user', content: 'Can you help me with my squat form?' },
      { role: 'assistant', content: 'Of course! Here are key squat cues: 1) Brace your core before descending, 2) Push knees out over toes, 3) Keep chest up, 4) Drive through mid-foot, 5) Depth should be hip crease below knee. Would you like me to break down any of these?' },
    ]},
  ];

  const usersToSeed = ['client1', 'client2', 'athlete'];

  for (const userKey of usersToSeed) {
    const userId = userIds[userKey];
    if (!userId) continue;

    for (let i = 0; i < conversationTopics.length; i++) {
      const topic = conversationTopics[i];
      const createdAt = daysAgo(30 - i * 5);

      const [conv] = await sql`
        INSERT INTO conversations (
          user_id, title, conversation_type, is_active, message_count,
          created_at, updated_at
        ) VALUES (
          ${userId}, ${topic.title}, 'ai_coach', true, ${topic.messages.length},
          ${createdAt}, ${createdAt}
        ) RETURNING id
      `;

      for (let msgIdx = 0; msgIdx < topic.messages.length; msgIdx++) {
        const msg = topic.messages[msgIdx];
        await sql`
          INSERT INTO messages (
            conversation_id, user_id, role, content, created_at
          ) VALUES (
            ${conv.id}, ${userId}, ${msg.role}, ${msg.content}, ${createdAt}
          )
        `;
      }
    }

    console.log(`  ✓ Created ${conversationTopics.length} conversations for ${DEMO_USERS[userKey].name}`);
  }

  console.log('\n✅ Conversations created\n');
}

// ============================================
// STEP 8: CREATE READINESS SCORES
// ============================================
async function createReadinessScores(userIds) {
  console.log('📊 Step 8: Creating readiness scores...\n');

  const usersToSeed = ['client1', 'client2', 'athlete'];

  for (const userKey of usersToSeed) {
    const userId = userIds[userKey];
    if (!userId) continue;

    // Create 60 days of readiness data
    for (let i = 0; i < 60; i++) {
      const date = daysAgo(i);
      await sql`
        INSERT INTO readiness_scores (
          user_id, date, overall_score, sleep_quality, energy_level,
          motivation, soreness, stress, sleep_hours, resting_hr, hrv_score,
          created_at, updated_at
        ) VALUES (
          ${userId}, ${date.toISOString().split('T')[0]},
          ${randomBetween(60, 95)}, ${randomBetween(5, 10)}, ${randomBetween(5, 10)},
          ${randomBetween(5, 10)}, ${randomBetween(1, 5)}, ${randomBetween(1, 5)},
          ${randomBetween(6, 9)}, ${randomBetween(55, 75)}, ${randomBetween(40, 80)},
          ${date}, ${date}
        )
      `;
    }

    console.log(`  ✓ Created 60 days of readiness for ${DEMO_USERS[userKey].name}`);
  }

  console.log('\n✅ Readiness scores created\n');
}

// ============================================
// STEP 9: CREATE USER STREAKS
// ============================================
async function createStreaks(userIds) {
  console.log('🔥 Step 9: Creating streaks...\n');

  const streakData = {
    client1: { current: 12, longest: 28 },
    client2: { current: 5, longest: 14 },
    athlete: { current: 45, longest: 67 },
  };

  for (const [userKey, data] of Object.entries(streakData)) {
    const userId = userIds[userKey];
    if (!userId) continue;

    await sql`
      INSERT INTO user_streaks (
        user_id, streak_type, current_streak, longest_streak,
        last_activity_date, created_at, updated_at
      ) VALUES (
        ${userId}, 'workout', ${data.current}, ${data.longest},
        ${daysAgo(0).toISOString().split('T')[0]}, ${daysAgo(90)}, NOW()
      )
    `;

    console.log(`  ✓ Created streak for ${DEMO_USERS[userKey].name}: ${data.current} days`);
  }

  console.log('\n✅ Streaks created\n');
}

// ============================================
// STEP 10: CREATE BADGES
// ============================================
async function createBadges(userIds) {
  console.log('🏅 Step 10: Creating badges...\n');

  // Ensure badge definitions exist
  const badgeDefinitions = [
    { name: 'First Workout', description: 'Completed your first workout', badgeType: 'milestone', tier: 'bronze' },
    { name: 'Week Warrior', description: 'Worked out 7 days in a row', badgeType: 'streak', tier: 'silver' },
    { name: 'Iron Pumper', description: 'Lifted 10,000 lbs total', badgeType: 'volume', tier: 'bronze' },
    { name: 'Consistency King', description: 'Worked out 30 days in a row', badgeType: 'streak', tier: 'gold' },
    { name: 'PR Crusher', description: 'Set 10 personal records', badgeType: 'achievement', tier: 'silver' },
    { name: 'Early Bird', description: 'Completed 10 morning workouts', badgeType: 'habit', tier: 'bronze' },
    { name: 'Night Owl', description: 'Completed 10 evening workouts', badgeType: 'habit', tier: 'bronze' },
    { name: 'Century Club', description: 'Completed 100 workouts', badgeType: 'milestone', tier: 'gold' },
  ];

  const badgeIds = {};
  for (const badge of badgeDefinitions) {
    const [existing] = await sql`
      SELECT id FROM badge_definitions WHERE name = ${badge.name}
    `;

    if (existing) {
      badgeIds[badge.name] = existing.id;
    } else {
      const badgeId = randomUUID();
      await sql`
        INSERT INTO badge_definitions (id, name, description, badge_type, tier, created_at)
        VALUES (${badgeId}, ${badge.name}, ${badge.description}, ${badge.badgeType}, ${badge.tier}, NOW())
      `;
      badgeIds[badge.name] = badgeId;
    }
  }

  // Assign badges to users
  const userBadges = {
    client1: ['First Workout', 'Week Warrior', 'Iron Pumper', 'PR Crusher'],
    client2: ['First Workout', 'Early Bird'],
    athlete: ['First Workout', 'Week Warrior', 'Iron Pumper', 'Consistency King', 'PR Crusher', 'Century Club'],
  };

  for (const [userKey, badges] of Object.entries(userBadges)) {
    const userId = userIds[userKey];
    if (!userId) continue;

    for (const badgeName of badges) {
      await sql`
        INSERT INTO user_badges (user_id, badge_id, badge_type, earned_at)
        VALUES (${userId}, ${badgeIds[badgeName]}, 'achievement', ${daysAgo(randomBetween(1, 60))})
      `;
    }

    console.log(`  ✓ Awarded ${badges.length} badges to ${DEMO_USERS[userKey].name}`);
  }

  console.log('\n✅ Badges created\n');
}

// ============================================
// STEP 11: CREATE COACH NOTES
// ============================================
async function createCoachNotes(userIds) {
  console.log('📝 Step 11: Creating coach notes...\n');

  const coachId = userIds.coach;

  // Valid categories: general, workout, nutrition, injury, progress, goal, check_in
  const notes = [
    {
      clientKey: 'client1',
      notes: [
        { title: 'Initial Assessment', content: 'Alex has good baseline strength. Previous training experience of 2 years. Goals: hypertrophy focus, especially upper body. Watch for shoulder mobility issues.', category: 'general', isPinned: true },
        { title: 'Week 4 Check-in', content: 'Excellent progress on bench press - up 15lbs. Squat depth improving. Recommended adding face pulls for shoulder health.', category: 'progress', isPinned: false },
        { title: 'Program Adjustment', content: 'Switching from 4-day upper/lower to PPL to address lagging back development. Client agreed to add cardio on rest days.', category: 'workout', isPinned: false },
      ],
    },
    {
      clientKey: 'client2',
      notes: [
        { title: 'Initial Assessment', content: 'Sam is new to lifting - focus on form and building base. Conservative weight progression. Good attitude and eager to learn.', category: 'general', isPinned: true },
        { title: 'Form Notes', content: 'Squat: knees caving - added banded squats for warmup. Deadlift: rounding lower back - reduced weight, focusing on hip hinge pattern.', category: 'workout', isPinned: true },
      ],
    },
    {
      clientKey: 'pastClient',
      notes: [
        { title: 'Final Summary', content: 'Chris made great progress over 5 months. Started with no gym experience, now has solid foundation. Squat: 95→185, Bench: 75→135, Deadlift: 115→225. Moving to Seattle, provided home workout plan.', category: 'progress', isPinned: false },
      ],
    },
  ];

  for (const clientNotes of notes) {
    const clientId = userIds[clientNotes.clientKey];
    if (!clientId) continue;

    for (let i = 0; i < clientNotes.notes.length; i++) {
      const note = clientNotes.notes[i];
      await sql`
        INSERT INTO coach_notes (
          coach_id, client_id, title, content, category, is_pinned,
          created_at, updated_at
        ) VALUES (
          ${coachId}, ${clientId}, ${note.title}, ${note.content},
          ${note.category}, ${note.isPinned},
          ${daysAgo(30 - i * 10)}, ${daysAgo(30 - i * 10)}
        )
      `;
    }

    console.log(`  ✓ Created ${clientNotes.notes.length} notes for ${DEMO_USERS[clientNotes.clientKey].name}`);
  }

  console.log('\n✅ Coach notes created\n');
}

// ============================================
// STEP 12: CREATE SCHEDULED SESSIONS
// ============================================
async function createScheduledSessions(userIds) {
  console.log('📅 Step 12: Creating scheduled sessions...\n');

  const coachId = userIds.coach;

  // Valid session_type: check-in, workout-review, planning, other
  // Valid status: scheduled, completed, cancelled

  // Past sessions
  for (let i = 0; i < 10; i++) {
    const clientKey = i % 2 === 0 ? 'client1' : 'client2';
    await sql`
      INSERT INTO scheduled_sessions (
        coach_id, client_id, scheduled_at, duration_minutes,
        session_type, status, notes, created_at, updated_at
      ) VALUES (
        ${coachId}, ${userIds[clientKey]},
        ${daysAgo(randomBetween(7, 60))}, 60,
        ${i % 3 === 0 ? 'check-in' : 'workout-review'}, 'completed',
        'Session completed successfully',
        ${daysAgo(65)}, NOW()
      )
    `;
  }

  // Upcoming sessions
  for (let i = 0; i < 5; i++) {
    const clientKey = i % 2 === 0 ? 'client1' : 'client2';
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + randomBetween(1, 14));

    await sql`
      INSERT INTO scheduled_sessions (
        coach_id, client_id, scheduled_at, duration_minutes,
        session_type, status, created_at, updated_at
      ) VALUES (
        ${coachId}, ${userIds[clientKey]},
        ${futureDate}, 60,
        ${i % 2 === 0 ? 'planning' : 'check-in'}, 'scheduled',
        NOW(), NOW()
      )
    `;
  }

  console.log(`  ✓ Created 10 past sessions and 5 upcoming sessions`);
  console.log('\n✅ Scheduled sessions created\n');
}

// ============================================
// STEP 13: CREATE RUNNING ACTIVITIES
// ============================================
async function createRunningActivities(userIds) {
  console.log('🏃 Step 13: Creating running activities...\n');

  // Only for athlete (iOS testing focus)
  const userId = userIds.athlete;
  if (!userId) return;

  // Valid run_type: easy, tempo, interval, long_run, recovery, fartlek, hill, race
  const runTypes = ['easy', 'tempo', 'interval', 'long_run', 'recovery'];

  for (let i = 0; i < 30; i++) {
    const runType = runTypes[i % runTypes.length];
    const distance = runType === 'long_run' ? randomBetween(12000, 20000) : randomBetween(3000, 8000);
    const pace = runType === 'tempo' ? randomBetween(240, 280) : randomBetween(300, 400);
    const duration = Math.floor(distance / 1000 * pace);

    await sql`
      INSERT INTO running_activities (
        user_id, run_type, name, distance_meters, duration_seconds,
        avg_pace_seconds_per_km, avg_heart_rate, elevation_gain_meters,
        calories_burned, source, started_at, completed_at, created_at, updated_at
      ) VALUES (
        ${userId}, ${runType}, ${runType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())},
        ${distance}, ${duration}, ${pace},
        ${randomBetween(130, 170)}, ${randomBetween(50, 200)},
        ${Math.floor(distance * 0.06)}, 'manual',
        ${daysAgo(i * 2)}, ${daysAgo(i * 2)}, ${daysAgo(i * 2)}, ${daysAgo(i * 2)}
      )
    `;
  }

  console.log(`  ✓ Created 30 running activities for ${DEMO_USERS.athlete.name}`);
  console.log('\n✅ Running activities created\n');
}

// ============================================
// STEP 14: CREATE BODY MEASUREMENTS
// ============================================
async function createBodyMeasurements(userIds) {
  console.log('📏 Step 14: Creating body measurements...\n');

  const usersToSeed = ['client1', 'athlete'];

  for (const userKey of usersToSeed) {
    const userId = userIds[userKey];
    if (!userId) continue;

    // Weekly measurements for 12 weeks
    for (let i = 0; i < 12; i++) {
      const baseWeight = userKey === 'athlete' ? 185 : 175;
      // Simulate gradual change
      const weight = baseWeight + (userKey === 'client1' ? -i * 0.3 : i * 0.2);

      await sql`
        INSERT INTO body_measurements (
          user_id, date, weight_kg, body_fat_percent,
          waist_cm, chest_cm, arm_cm, source, created_at
        ) VALUES (
          ${userId}, ${daysAgo(i * 7).toISOString().split('T')[0]},
          ${(weight / 2.205).toFixed(1)}, ${randomBetween(12, 18)},
          ${randomBetween(78, 88)}, ${randomBetween(100, 115)},
          ${randomBetween(35, 42)}, 'manual', ${daysAgo(i * 7)}
        )
      `;
    }

    console.log(`  ✓ Created 12 weeks of measurements for ${DEMO_USERS[userKey].name}`);
  }

  console.log('\n✅ Body measurements created\n');
}

// ============================================
// STEP 15: CREATE USER GOALS
// ============================================
async function createUserGoals(userIds, exerciseIds) {
  console.log('🎯 Step 15: Creating user goals...\n');

  const goals = {
    client1: [
      { type: 'strength', title: 'Bench Press 225lbs', targetValue: 225, currentValue: 185, exerciseId: exerciseIds['Barbell Bench Press'] },
      { type: 'body_composition', title: 'Reach 170lbs', targetValue: 170, currentValue: 178, exerciseId: null },
    ],
    client2: [
      { type: 'habit', title: 'Workout 3x per week', targetValue: 12, currentValue: 8, exerciseId: null },
      { type: 'strength', title: 'Squat bodyweight', targetValue: 165, currentValue: 95, exerciseId: exerciseIds['Barbell Squat'] },
    ],
    athlete: [
      { type: 'strength', title: 'Deadlift 500lbs', targetValue: 500, currentValue: 455, exerciseId: exerciseIds['Barbell Deadlift'] },
      { type: 'strength', title: 'Squat 405lbs', targetValue: 405, currentValue: 385, exerciseId: exerciseIds['Barbell Squat'] },
      { type: 'endurance', title: 'Run sub-20 5K', targetValue: 1200, currentValue: 1320, exerciseId: null },
    ],
  };

  for (const [userKey, userGoals] of Object.entries(goals)) {
    const userId = userIds[userKey];
    if (!userId) continue;

    for (const goal of userGoals) {
      const progress = (goal.currentValue / goal.targetValue * 100).toFixed(0);
      await sql`
        INSERT INTO user_goals (
          user_id, goal_type, title, target_value, target_unit,
          exercise_id, current_value, start_value, progress_percent,
          start_date, target_date, status, created_at, updated_at
        ) VALUES (
          ${userId}, ${goal.type}, ${goal.title}, ${goal.targetValue}, 'lbs',
          ${goal.exerciseId}, ${goal.currentValue}, ${goal.currentValue - 20},
          ${Math.min(progress, 100)},
          ${daysAgo(90)}, ${daysAgo(-90)}, 'active', ${daysAgo(90)}, NOW()
        )
      `;
    }

    console.log(`  ✓ Created ${userGoals.length} goals for ${DEMO_USERS[userKey].name}`);
  }

  console.log('\n✅ User goals created\n');
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('='.repeat(80));
  console.log('VOICEFIT DEMO DATA SEEDER');
  console.log('='.repeat(80));
  console.log('');

  try {
    await cleanupDatabase();
    const userIds = await createAuthUsers();
    await createDatabaseUsers(userIds);
    await createCoachClientRelationships(userIds);
    const exerciseIds = await ensureExercises();
    await createWorkouts(userIds, exerciseIds);
    await createConversations(userIds);
    await createReadinessScores(userIds);
    await createStreaks(userIds);
    await createBadges(userIds);
    await createCoachNotes(userIds);
    await createScheduledSessions(userIds);
    await createRunningActivities(userIds);
    await createBodyMeasurements(userIds);
    await createUserGoals(userIds, exerciseIds);

    console.log('='.repeat(80));
    console.log('✅ SEEDING COMPLETE!');
    console.log('='.repeat(80));
    console.log('');
    console.log('Demo Accounts:');
    console.log('-'.repeat(40));
    console.log('Coach:   coach@voicefit.demo / testpass123');
    console.log('Client:  client1@voicefit.demo / testpass123');
    console.log('Client:  client2@voicefit.demo / testpass123');
    console.log('Athlete: athlete@voicefit.demo / testpass123');
    console.log('');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await sql.end();
  }
}

main();
