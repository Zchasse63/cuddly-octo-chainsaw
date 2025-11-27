import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadgeUnlocker, createBadgeUnlocker } from '../badgeUnlocker';

// Mock database
const createMockDb = (data: any = {}) => ({
  query: {
    badgeDefinitions: {
      findMany: vi.fn().mockResolvedValue(data.badges || []),
    },
    userBadges: {
      findMany: vi.fn().mockResolvedValue(data.userBadges || []),
    },
    userStreaks: {
      findMany: vi.fn().mockResolvedValue(data.streaks || []),
    },
    runningPRs: {
      findMany: vi.fn().mockResolvedValue(data.runningPRs || []),
    },
    runningActivities: {
      findFirst: vi.fn().mockResolvedValue(data.activity || null),
    },
  },
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  }),
  execute: vi.fn().mockImplementation((query) => {
    // Return different results based on query structure
    return Promise.resolve({
      rows: data.queryResults || [{}],
    });
  }),
});

describe('BadgeUnlocker', () => {
  describe('createBadgeUnlocker', () => {
    it('should create a BadgeUnlocker instance', () => {
      const db = createMockDb();
      const unlocker = createBadgeUnlocker(db, 'user-123');
      expect(unlocker).toBeInstanceOf(BadgeUnlocker);
    });
  });

  describe('checkAllBadges', () => {
    it('should return empty array when no badges defined', async () => {
      const db = createMockDb({ badges: [] });
      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAllBadges();
      expect(results).toEqual([]);
    });

    it('should mark already earned badges', async () => {
      const db = createMockDb({
        badges: [
          { id: 'badge-1', name: 'First Rep', badgeType: 'strength', criteria: { type: 'workout_count', value: 1 } },
        ],
        userBadges: [{ badgeId: 'badge-1' }],
      });
      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAllBadges();
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ badgeId: 'badge-1', earned: true });
    });

    it('should check workout count badges', async () => {
      const db = createMockDb({
        badges: [
          { id: 'strength_workout_5', name: 'Getting Started', badgeType: 'strength', criteria: { type: 'workout_count', value: 5 } },
        ],
        userBadges: [],
        queryResults: [{ count: '10' }], // User has 10 workouts
      });
      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAllBadges();
      expect(results).toHaveLength(1);
      expect(results[0].earned).toBe(true);
      expect(results[0].progress).toBe(10);
      expect(results[0].target).toBe(5);
    });

    it('should not award badge when criteria not met', async () => {
      const db = createMockDb({
        badges: [
          { id: 'strength_workout_100', name: 'Century Lifter', badgeType: 'strength', criteria: { type: 'workout_count', value: 100 } },
        ],
        userBadges: [],
        queryResults: [{ count: '50' }], // User only has 50 workouts
      });
      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAllBadges();
      expect(results).toHaveLength(1);
      expect(results[0].earned).toBe(false);
      expect(results[0].progress).toBe(50);
      expect(results[0].target).toBe(100);
    });
  });

  describe('checkAfterWorkout', () => {
    it('should only check workout-related badges', async () => {
      const db = createMockDb({
        badges: [
          { id: 'workout_1', badgeType: 'strength', criteria: { type: 'workout_count', value: 1 } },
          { id: 'run_1', badgeType: 'running', criteria: { type: 'total_distance_miles', value: 1 } },
        ],
        userBadges: [],
        queryResults: [{ count: '1' }],
      });
      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAfterWorkout('workout-456');

      // Should only check workout_count, not running badges
      const checkedTypes = results.map((r) => r.badgeId);
      expect(checkedTypes).toContain('workout_1');
      expect(checkedTypes).not.toContain('run_1');
    });

    it('should insert badge when criteria met', async () => {
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      const db = {
        ...createMockDb({
          badges: [
            { id: 'workout_1', badgeType: 'strength', criteria: { type: 'workout_count', value: 1 } },
          ],
          userBadges: [],
          queryResults: [{ count: '1' }],
        }),
        insert: insertMock,
      };
      const unlocker = createBadgeUnlocker(db, 'user-123');

      await unlocker.checkAfterWorkout('workout-456');

      expect(insertMock).toHaveBeenCalled();
    });
  });

  describe('checkAfterRun', () => {
    it('should check single run distance badge', async () => {
      const db = createMockDb({
        badges: [
          { id: 'single_5k', badgeType: 'running', criteria: { type: 'single_run_distance_miles', value: 3.1 } },
        ],
        userBadges: [],
        activity: {
          id: 'activity-123',
          distanceMeters: 5000, // ~3.1 miles
        },
        queryResults: [{ total_distance: '10000' }],
      });
      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAfterRun('activity-123');

      const badge = results.find((r) => r.badgeId === 'single_5k');
      expect(badge).toBeDefined();
      expect(badge?.earned).toBe(true);
    });

    it('should check pace badges', async () => {
      const db = createMockDb({
        badges: [
          { id: '5k_sub30', badgeType: 'running', criteria: { type: '5k_time', value: 1800 } }, // 30 minutes in seconds
        ],
        userBadges: [],
        runningPRs: [{ prType: '5k', timeSeconds: 1700 }], // 28:20
        queryResults: [{ total_distance: '10000' }],
      });
      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAfterRun('activity-123');

      const badge = results.find((r) => r.badgeId === '5k_sub30');
      expect(badge).toBeDefined();
      expect(badge?.earned).toBe(true);
    });
  });

  describe('volume badges', () => {
    it('should check total volume badge', async () => {
      const db = createMockDb({
        badges: [
          { id: 'volume_50k', badgeType: 'strength', criteria: { type: 'total_volume', value: 50000 } },
        ],
        userBadges: [],
        queryResults: [{ volume: '75000' }],
      });
      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAllBadges();

      const badge = results.find((r) => r.badgeId === 'volume_50k');
      expect(badge?.earned).toBe(true);
      expect(badge?.progress).toBe(75000);
    });
  });

  describe('streak badges', () => {
    it('should check workout streak badge', async () => {
      const db = createMockDb({
        badges: [
          { id: 'streak_7', badgeType: 'streak', criteria: { type: 'workout_streak', value: 7 } },
        ],
        userBadges: [],
        streaks: [{ streakType: 'workout', currentStreak: 10 }],
        queryResults: [{ count: '30' }],
      });
      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAllBadges();

      const badge = results.find((r) => r.badgeId === 'streak_7');
      expect(badge?.earned).toBe(true);
    });
  });

  describe('hybrid badges', () => {
    it('should check hybrid week badge', async () => {
      const db = createMockDb({
        badges: [
          { id: 'hybrid_athlete', badgeType: 'hybrid', criteria: { type: 'hybrid_week' } },
        ],
        userBadges: [],
        queryResults: [{ has_workout: true, has_run: true }],
      });

      // Override execute to return proper hybrid week data
      db.execute = vi.fn().mockImplementation((query) => {
        const queryStr = String(query);
        if (queryStr.includes('has_workout')) {
          return Promise.resolve({
            rows: [{ has_workout: true, has_run: true }],
          });
        }
        return Promise.resolve({ rows: [{}] });
      });

      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAllBadges();

      const badge = results.find((r) => r.badgeId === 'hybrid_athlete');
      expect(badge?.earned).toBe(true);
    });

    it('should check hybrid total badge', async () => {
      const db = createMockDb({
        badges: [
          { id: 'iron_runner', badgeType: 'hybrid', criteria: { type: 'hybrid_total', workouts: 100, miles: 100 } },
        ],
        userBadges: [],
      });

      // Mock the execute function to return proper data
      db.execute = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          rows: [{ count: '150', volume: '500000', total_distance: '200000' }], // 200km = ~124 miles
        });
      });

      const unlocker = createBadgeUnlocker(db, 'user-123');

      const results = await unlocker.checkAllBadges();

      const badge = results.find((r) => r.badgeId === 'iron_runner');
      expect(badge).toBeDefined();
    });
  });
});
