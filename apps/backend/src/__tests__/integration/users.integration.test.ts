import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../db';
import { users, userProfiles } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Users Integration Tests - CRUD operations on users and profiles
 * Uses pre-seeded test data from seed-data.ts
 * Note: CRUD tests create temporary users that are cleaned up after tests
 */

describe('Users Integration', () => {
  let seededUsers: SeededTestUsers;
  const testUserIds: string[] = []; // Track users created during CRUD tests for cleanup

  beforeAll(async () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
  });

  afterAll(async () => {
    // Cleanup users created during CRUD tests (not the seeded users)
    for (const id of testUserIds) {
      try {
        await db.delete(userProfiles).where(eq(userProfiles.userId, id));
        await db.delete(users).where(eq(users.id, id));
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('User CRUD', () => {
    it('should create a new user', async () => {
      const email = `test-${Date.now()}@integration.test`;
      const [user] = await db.insert(users).values({ email }).returning();
      testUserIds.push(user.id);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should read a user by ID', async () => {
      const email = `test-read-${Date.now()}@integration.test`;
      const [created] = await db.insert(users).values({ email }).returning();
      testUserIds.push(created.id);

      const user = await db.query.users.findFirst({
        where: eq(users.id, created.id),
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe(email);
    });

    it('should update a user', async () => {
      const email = `test-update-${Date.now()}@integration.test`;
      const [created] = await db.insert(users).values({ email }).returning();
      testUserIds.push(created.id);

      const newEmail = `updated-${Date.now()}@integration.test`;
      const [updated] = await db.update(users)
        .set({ email: newEmail })
        .where(eq(users.id, created.id))
        .returning();

      expect(updated.email).toBe(newEmail);
    });

    it('should delete a user', async () => {
      const email = `test-delete-${Date.now()}@integration.test`;
      const [created] = await db.insert(users).values({ email }).returning();

      await db.delete(users).where(eq(users.id, created.id));

      const deleted = await db.query.users.findFirst({
        where: eq(users.id, created.id),
      });

      expect(deleted).toBeUndefined();
    });

    it('should enforce unique email constraint', async () => {
      const email = `test-unique-${Date.now()}@integration.test`;
      const [created] = await db.insert(users).values({ email }).returning();
      testUserIds.push(created.id);

      await expect(
        db.insert(users).values({ email })
      ).rejects.toThrow();
    });
  });

  describe('User Profiles CRUD', () => {
    it('should create a user profile linked to user', async () => {
      const email = `test-profile-${Date.now()}@integration.test`;
      const [user] = await db.insert(users).values({ email }).returning();
      testUserIds.push(user.id);

      const [profile] = await db.insert(userProfiles).values({
        userId: user.id,
        name: 'Test User',
        experienceLevel: 'beginner',
      }).returning();

      expect(profile.id).toBeDefined();
      expect(profile.userId).toBe(user.id);
      expect(profile.name).toBe('Test User');
      expect(profile.experienceLevel).toBe('beginner');
    });

    it('should update profile preferences', async () => {
      const email = `test-pref-${Date.now()}@integration.test`;
      const [user] = await db.insert(users).values({ email }).returning();
      testUserIds.push(user.id);

      const [profile] = await db.insert(userProfiles).values({
        userId: user.id,
        name: 'Pref User',
      }).returning();

      const [updated] = await db.update(userProfiles)
        .set({
          tier: 'premium',
          theme: 'dark',
          preferredWeightUnit: 'kg',
          notificationsEnabled: false,
        })
        .where(eq(userProfiles.id, profile.id))
        .returning();

      expect(updated.tier).toBe('premium');
      expect(updated.theme).toBe('dark');
      expect(updated.preferredWeightUnit).toBe('kg');
      expect(updated.notificationsEnabled).toBe(false);
    });

    it('should store array fields correctly', async () => {
      const email = `test-arrays-${Date.now()}@integration.test`;
      const [user] = await db.insert(users).values({ email }).returning();
      testUserIds.push(user.id);

      const goals = ['build_muscle', 'lose_fat', 'improve_strength'];
      const equipment = ['barbell', 'dumbbell', 'cable'];

      const [profile] = await db.insert(userProfiles).values({
        userId: user.id,
        goals,
        preferredEquipment: equipment,
        favoriteExercises: ['bench_press', 'squat'],
      }).returning();

      expect(profile.goals).toEqual(goals);
      expect(profile.preferredEquipment).toEqual(equipment);
    });
  });

  describe('Supabase REST API', () => {
    it('should query users via Supabase client', async () => {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, created_at')
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should query user_profiles via Supabase client', async () => {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, user_id, name, tier')
        .limit(5);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});

