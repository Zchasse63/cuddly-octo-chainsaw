import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../db';
import { nutritionSummaries, nutritionGoals, bodyMeasurements, terraConnections } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { supabaseAdmin } from '../../lib/supabase';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

/**
 * Nutrition Integration Tests - Health data, goals, measurements
 * Uses pre-seeded test data from seed-data.ts
 */

describe('Nutrition Integration', () => {
  let seededUsers: SeededTestUsers;
  let testUserId: string;

  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();
    testUserId = seededUsers.premiumAthlete.id;
  });

  // No cleanup needed - using pre-seeded data

  describe('Nutrition Summaries', () => {
    it('should log daily nutrition', async () => {
      const [summary] = await db.insert(nutritionSummaries).values({
        userId: testUserId,
        date: new Date().toISOString().split('T')[0],
        calories: 2200,
        protein: 180,
        carbohydrates: 220,
        fat: 70,
        fiber: 35,
        source: 'apple_health',
      }).returning();

      expect(summary.id).toBeDefined();
      expect(summary.calories).toBe(2200);
      expect(summary.protein).toBe(180);
    });

    it('should track micronutrients', async () => {
      const [summary] = await db.insert(nutritionSummaries).values({
        userId: testUserId,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        calories: 2000,
        protein: 160,
        carbohydrates: 200,
        fat: 65,
        sodium: 2300,
        potassium: 3500,
        calcium: 1000,
        vitaminD: 20,
        source: 'terra',
      }).returning();

      expect(summary.sodium).toBe(2300);
      expect(summary.vitaminD).toBe(20);
    });

    it('should track hydration', async () => {
      const existing = await db.query.nutritionSummaries.findFirst({
        where: eq(nutritionSummaries.userId, testUserId),
      });

      if (existing) {
        const [updated] = await db.update(nutritionSummaries)
          .set({
            waterMl: 3000,
            caffeineMg: 200,
          })
          .where(eq(nutritionSummaries.id, existing.id))
          .returning();

        expect(updated.waterMl).toBe(3000);
      }
    });
  });

  describe('Nutrition Goals', () => {
    it('should set cutting goal', async () => {
      const [goal] = await db.insert(nutritionGoals).values({
        userId: testUserId,
        goalType: 'cut',
        targetCalories: 2000,
        targetProtein: 200,
        targetCarbohydrates: 150,
        targetFat: 65,
        targetFiber: 30,
        targetWaterMl: 3500,
        calculationMethod: 'tdee',
        tdeeEstimate: 2500,
        activityMultiplier: 1.55,
        isActive: true,
      }).returning();

      expect(goal.goalType).toBe('cut');
      expect(goal.targetCalories).toBe(2000);
    });

    it('should update goal', async () => {
      const goal = await db.query.nutritionGoals.findFirst({
        where: eq(nutritionGoals.userId, testUserId),
      });

      if (goal) {
        const [updated] = await db.update(nutritionGoals)
          .set({
            goalType: 'maintenance',
            targetCalories: 2500,
          })
          .where(eq(nutritionGoals.id, goal.id))
          .returning();

        expect(updated.goalType).toBe('maintenance');
      }
    });
  });

  describe('Body Measurements', () => {
    it('should log weight', async () => {
      const [measurement] = await db.insert(bodyMeasurements).values({
        userId: testUserId,
        date: new Date().toISOString().split('T')[0],
        weightKg: 80.5,
        source: 'manual',
      }).returning();

      expect(measurement.weightKg).toBe(80.5);
    });

    it('should log body composition', async () => {
      const [measurement] = await db.insert(bodyMeasurements).values({
        userId: testUserId,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        weightKg: 80.2,
        bodyFatPercent: 15.5,
        muscleMassKg: 65.0,
        waterPercent: 60,
        bmr: 1850,
        source: 'smart_scale',
      }).returning();

      expect(measurement.bodyFatPercent).toBe(15.5);
      expect(measurement.muscleMassKg).toBe(65.0);
    });

    it('should log circumferences', async () => {
      const [measurement] = await db.insert(bodyMeasurements).values({
        userId: testUserId,
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        waistCm: 82,
        hipsCm: 95,
        chestCm: 105,
        armCm: 38,
        source: 'manual',
      }).returning();

      expect(measurement.waistCm).toBe(82);
      expect(measurement.armCm).toBe(38);
    });

    it('should query measurement history', async () => {
      const history = await db.query.bodyMeasurements.findMany({
        where: eq(bodyMeasurements.userId, testUserId),
        orderBy: desc(bodyMeasurements.date),
      });

      expect(history.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Terra Connections', () => {
    it('should create Terra connection', async () => {
      const [connection] = await db.insert(terraConnections).values({
        userId: testUserId,
        terraUserId: 'terra-user-123',
        provider: 'garmin',
        isActive: true,
        scopes: ['activity', 'nutrition', 'sleep'],
      }).returning();

      expect(connection.provider).toBe('garmin');
      expect(connection.isActive).toBe(true);
    });

    it('should update sync status', async () => {
      const connection = await db.query.terraConnections.findFirst({
        where: eq(terraConnections.userId, testUserId),
      });

      if (connection) {
        const [updated] = await db.update(terraConnections)
          .set({
            lastSyncAt: new Date(),
            syncStatus: 'success',
          })
          .where(eq(terraConnections.id, connection.id))
          .returning();

        expect(updated.syncStatus).toBe('success');
      }
    });
  });
});

