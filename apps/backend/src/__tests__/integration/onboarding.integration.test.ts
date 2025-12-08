import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../db';
import { userOnboarding, programQuestionnaire } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Onboarding Integration Tests - User onboarding and program questionnaire
 * Uses pre-seeded test data from seed-data.ts
 */

describe('Onboarding Integration', () => {
  let seededUsers: SeededTestUsers;
  let testUserId: string;

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    testUserId = seededUsers.premiumAthlete.id;
  });

  // No cleanup needed - using pre-seeded data

  describe('User Onboarding', () => {
    it('should have onboarding record for seeded user', async () => {
      // Seeded users already have onboarding records
      const onboarding = await db.query.userOnboarding.findFirst({
        where: eq(userOnboarding.userId, testUserId),
      });

      expect(onboarding).toBeDefined();
      expect(onboarding?.userId).toBe(testUserId);
    });

    it('should progress through steps', async () => {
      const [updated] = await db.update(userOnboarding)
        .set({
          currentStep: 'goals',
          stepsCompleted: ['welcome', 'profile'],
        })
        .where(eq(userOnboarding.userId, testUserId))
        .returning();

      expect(updated.currentStep).toBe('goals');
      expect(updated.stepsCompleted).toContain('welcome');
    });

    it('should complete onboarding', async () => {
      const [completed] = await db.update(userOnboarding)
        .set({
          currentStep: 'complete',
          stepsCompleted: ['welcome', 'profile', 'goals', 'equipment', 'schedule'],
          isComplete: true,
          completedAt: new Date(),
        })
        .where(eq(userOnboarding.userId, testUserId))
        .returning();

      expect(completed.isComplete).toBe(true);
      expect(completed.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Program Questionnaire', () => {
    it('should create questionnaire for strength training', async () => {
      const [questionnaire] = await db.insert(programQuestionnaire).values({
        userId: testUserId,
        trainingType: 'strength_only',
        primaryGoal: 'get_stronger',
        daysPerWeek: 4,
        sessionDuration: 60,
        experienceLevel: 'intermediate',
        yearsTraining: 2,
        hasStrengthExperience: true,
        currentBenchPress: 185,
        currentSquat: 275,
        currentDeadlift: 315,
        trainingLocation: 'gym',
        availableEquipment: ['barbell', 'dumbbell', 'cable', 'machines'],
      }).returning();

      expect(questionnaire.trainingType).toBe('strength_only');
      expect(questionnaire.primaryGoal).toBe('get_stronger');
    });

    it('should update with running goals', async () => {
      const [updated] = await db.update(programQuestionnaire)
        .set({
          trainingType: 'hybrid',
          hasRunningExperience: true,
          weeklyMileage: 20,
          targetRaceDistance: '10k',
          targetRaceTime: 2700, // 45 min
        })
        .where(eq(programQuestionnaire.userId, testUserId))
        .returning();

      expect(updated.trainingType).toBe('hybrid');
      expect(updated.targetRaceDistance).toBe('10k');
    });

    it('should store health limitations', async () => {
      const [updated] = await db.update(programQuestionnaire)
        .set({
          currentInjuries: ['shoulder impingement'],
          pastInjuries: ['ACL tear 2020'],
          exercisesToAvoid: ['behind neck press', 'upright rows'],
          mobilityLimitations: 'Limited shoulder external rotation',
        })
        .where(eq(programQuestionnaire.userId, testUserId))
        .returning();

      expect(updated.currentInjuries).toContain('shoulder impingement');
      expect(updated.exercisesToAvoid).toContain('behind neck press');
    });

    it('should store preferences', async () => {
      const [updated] = await db.update(programQuestionnaire)
        .set({
          favoriteExercises: ['deadlift', 'bench press', 'pull ups'],
          dislikedExercises: ['leg press', 'smith machine'],
          preferredRepRanges: 'medium',
          preferredSplit: 'upper_lower',
          preferredTimeOfDay: 'morning',
        })
        .where(eq(programQuestionnaire.userId, testUserId))
        .returning();

      expect(updated.preferredSplit).toBe('upper_lower');
      expect(updated.favoriteExercises).toContain('deadlift');
    });

    it('should store lifestyle factors', async () => {
      const [updated] = await db.update(programQuestionnaire)
        .set({
          sleepHours: 7.5,
          stressLevel: 'medium',
          nutritionTracking: true,
          supplementsUsed: ['creatine', 'protein', 'vitamin d'],
        })
        .where(eq(programQuestionnaire.userId, testUserId))
        .returning();

      expect(updated.sleepHours).toBe(7.5);
      expect(updated.supplementsUsed).toContain('creatine');
    });

    it('should mark as complete', async () => {
      const [completed] = await db.update(programQuestionnaire)
        .set({
          completedAt: new Date(),
          isPremium: true,
        })
        .where(eq(programQuestionnaire.userId, testUserId))
        .returning();

      expect(completed.completedAt).toBeInstanceOf(Date);
      expect(completed.isPremium).toBe(true);
    });
  });

  describe('Supabase REST API', () => {
    it('should query onboarding via Supabase', async () => {
      const { data, error } = await supabaseAdmin
        .from('user_onboarding')
        .select('user_id, current_step, is_complete')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data?.is_complete).toBe(true);
    });

    it('should query questionnaire via Supabase', async () => {
      const { data, error } = await supabaseAdmin
        .from('program_questionnaire')
        .select('user_id, training_type, primary_goal, experience_level')
        .eq('user_id', testUserId)
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
      // Seeded data may have different training types
      expect(data![0].user_id).toBe(testUserId);
    });
  });
});

