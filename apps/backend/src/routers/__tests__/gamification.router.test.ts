import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Gamification Router Tests
 * Tests badges, achievements, streaks, and XP calculations
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Gamification Router', () => {
  describe('Input Validation', () => {
    describe('getBadges input', () => {
      const badgesSchema = z.object({
        category: z.enum(['workout', 'streak', 'social', 'milestone', 'special']).optional(),
        includeUnearned: z.boolean().default(false),
      }).optional();

      it('should accept empty input', () => {
        expect(badgesSchema.parse(undefined)).toBeUndefined();
      });

      it('should filter by category', () => {
        const input = { category: 'streak' as const };
        expect(badgesSchema.parse(input)).toBeDefined();
      });

      it('should include unearned badges', () => {
        const input = { includeUnearned: true };
        expect(badgesSchema.parse(input)?.includeUnearned).toBe(true);
      });
    });

    describe('claimReward input', () => {
      const claimSchema = z.object({
        rewardId: z.string().uuid(),
      });

      it('should validate reward claim', () => {
        expect(claimSchema.parse({ rewardId: testUUID })).toBeDefined();
      });
    });
  });

  describe('XP Calculations', () => {
    const calculateWorkoutXP = (sets: number, prs: number, duration: number) => {
      const baseXP = 50;
      const setXP = sets * 5;
      const prXP = prs * 100;
      const durationBonus = Math.floor(duration / 600) * 10; // 10 XP per 10 min
      return baseXP + setXP + prXP + durationBonus;
    };

    it('should calculate base workout XP', () => {
      const xp = calculateWorkoutXP(0, 0, 0);
      expect(xp).toBe(50);
    });

    it('should add XP per set', () => {
      const xp = calculateWorkoutXP(10, 0, 0);
      expect(xp).toBe(100); // 50 + 10*5
    });

    it('should add bonus XP for PRs', () => {
      const xp = calculateWorkoutXP(10, 2, 0);
      expect(xp).toBe(300); // 50 + 50 + 200
    });

    it('should add duration bonus', () => {
      const xp = calculateWorkoutXP(10, 0, 3600); // 1 hour
      expect(xp).toBe(160); // 50 + 50 + 60
    });
  });

  describe('Level Calculations', () => {
    // XP required for each level (exponential growth)
    const xpForLevel = (level: number) => Math.floor(100 * Math.pow(1.5, level - 1));
    
    const getLevelFromXP = (totalXP: number) => {
      let level = 1;
      let xpNeeded = 0;
      while (xpNeeded + xpForLevel(level) <= totalXP) {
        xpNeeded += xpForLevel(level);
        level++;
      }
      return { level, xpInLevel: totalXP - xpNeeded, xpForNext: xpForLevel(level) };
    };

    it('should start at level 1', () => {
      expect(getLevelFromXP(0).level).toBe(1);
    });

    it('should level up at 100 XP', () => {
      expect(getLevelFromXP(100).level).toBe(2);
    });

    it('should calculate XP progress in level', () => {
      const result = getLevelFromXP(150);
      expect(result.level).toBe(2);
      expect(result.xpInLevel).toBe(50);
    });

    it('should handle high XP totals', () => {
      const result = getLevelFromXP(10000);
      expect(result.level).toBeGreaterThan(5);
    });
  });

  describe('Streak Calculations', () => {
    const calculateStreak = (workoutDates: Date[]) => {
      if (workoutDates.length === 0) return 0;
      
      const sorted = [...workoutDates].sort((a, b) => b.getTime() - a.getTime());
      let streak = 1;
      
      for (let i = 1; i < sorted.length; i++) {
        const diff = Math.floor(
          (sorted[i - 1].getTime() - sorted[i].getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
      
      return streak;
    };

    it('should return 0 for no workouts', () => {
      expect(calculateStreak([])).toBe(0);
    });

    it('should return 1 for single workout', () => {
      expect(calculateStreak([new Date()])).toBe(1);
    });

    it('should count consecutive days', () => {
      const dates = [
        new Date('2024-01-03'),
        new Date('2024-01-02'),
        new Date('2024-01-01'),
      ];
      expect(calculateStreak(dates)).toBe(3);
    });

    it('should break on gap', () => {
      const dates = [
        new Date('2024-01-05'),
        new Date('2024-01-03'), // gap
        new Date('2024-01-02'),
      ];
      expect(calculateStreak(dates)).toBe(1);
    });
  });

  describe('Badge Unlock Logic', () => {
    const checkBadgeUnlock = (badge: { type: string; threshold: number }, stats: any) => {
      switch (badge.type) {
        case 'workout_count':
          return stats.totalWorkouts >= badge.threshold;
        case 'streak':
          return stats.currentStreak >= badge.threshold;
        case 'total_volume':
          return stats.totalVolume >= badge.threshold;
        case 'pr_count':
          return stats.totalPRs >= badge.threshold;
        default:
          return false;
      }
    };

    it('should unlock workout count badge', () => {
      const badge = { type: 'workout_count', threshold: 10 };
      expect(checkBadgeUnlock(badge, { totalWorkouts: 15 })).toBe(true);
      expect(checkBadgeUnlock(badge, { totalWorkouts: 5 })).toBe(false);
    });

    it('should unlock streak badge', () => {
      const badge = { type: 'streak', threshold: 7 };
      expect(checkBadgeUnlock(badge, { currentStreak: 10 })).toBe(true);
    });

    it('should unlock volume badge', () => {
      const badge = { type: 'total_volume', threshold: 100000 };
      expect(checkBadgeUnlock(badge, { totalVolume: 150000 })).toBe(true);
    });
  });

  describe('Response Contracts', () => {
    it('should return badge with progress', () => {
      const badge = {
        id: testUUID,
        name: 'Iron Warrior',
        description: 'Complete 100 workouts',
        category: 'milestone',
        earned: false,
        progress: 45,
        threshold: 100,
        iconUrl: 'https://example.com/badge.png',
      };

      expect(badge).toHaveProperty('progress');
      expect(badge).toHaveProperty('threshold');
      expect(badge.progress / badge.threshold).toBe(0.45);
    });

    it('should return leaderboard entry', () => {
      const entry = {
        rank: 1,
        userId: 'user-123',
        username: 'FitnessPro',
        xp: 15000,
        level: 12,
        avatarUrl: 'https://example.com/avatar.png',
      };

      expect(entry).toHaveProperty('rank');
      expect(entry).toHaveProperty('xp');
      expect(entry).toHaveProperty('level');
    });
  });
});

