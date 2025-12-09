import { eq, and, sql, count } from 'drizzle-orm';
import { userBadges, badgeDefinitions } from '../db/schema/gamification';
import { workouts, workoutSets } from '../db/schema/workouts';
import { runningActivities, runningPRs } from '../db/schema/running';
import { userStreaks } from '../db/schema/gamification';
import { trainingPrograms } from '../db/schema/programs';
import type { BadgeDefinition } from '../db/schema/gamification';

// Badge criteria types
type BadgeCriteria = {
  type: string;
  value?: number;
  exercise?: string;
  weight?: number;
  condition?: string;
  workouts?: number;
  miles?: number;
  lifts?: number;
  runs?: number;
};

// Result of badge check
type BadgeCheckResult = {
  badgeId: string;
  earned: boolean;
  progress?: number;
  target?: number;
};

export class BadgeUnlocker {
  private db: any;
  private userId: string;

  constructor(db: any, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  // Check all badges for a user and award any newly unlocked ones
  async checkAllBadges(): Promise<BadgeCheckResult[]> {
    const results: BadgeCheckResult[] = [];

    // Get all badge definitions
    const definitions = await this.db.query.badgeDefinitions.findMany();

    // Get already earned badges
    const earned = await this.db.query.userBadges.findMany({
      where: eq(userBadges.userId, this.userId),
      columns: { badgeId: true },
    });
    const earnedIds = new Set(earned.map((b: any) => b.badgeId));

    // Get user stats once
    const stats = await this.getUserStats();

    for (const badge of definitions) {
      if (earnedIds.has(badge.id)) {
        results.push({ badgeId: badge.id, earned: true });
        continue;
      }

      const check = await this.checkBadge(badge, stats);
      results.push(check);

      if (check.earned) {
        await this.awardBadge(badge.id, badge.badgeType);
      }
    }

    return results;
  }

  // Check badges after a workout
  async checkAfterWorkout(workoutId: string): Promise<BadgeCheckResult[]> {
    const results: BadgeCheckResult[] = [];
    const stats = await this.getUserStats();

    // Badge types to check after workout
    const typesToCheck = [
      'workout_count',
      'total_volume',
      'pr_count',
      'exercise_weight',
      'powerlifting_total',
      'workout_streak',
      'hybrid_week',
      'hybrid_total',
    ];

    const definitions = await this.db.query.badgeDefinitions.findMany();
    const earned = await this.db.query.userBadges.findMany({
      where: eq(userBadges.userId, this.userId),
      columns: { badgeId: true },
    });
    const earnedIds = new Set(earned.map((b: any) => b.badgeId));

    for (const badge of definitions) {
      const criteria = badge.criteria as BadgeCriteria;
      if (!typesToCheck.includes(criteria?.type)) continue;
      if (earnedIds.has(badge.id)) continue;

      const check = await this.checkBadge(badge, stats);
      results.push(check);

      if (check.earned) {
        await this.awardBadge(badge.id, badge.badgeType, { workoutId });
      }
    }

    return results;
  }

  // Check badges after a run
  async checkAfterRun(activityId: string): Promise<BadgeCheckResult[]> {
    const results: BadgeCheckResult[] = [];
    const stats = await this.getUserStats();

    // Get activity details for single-run badges
    const activity = await this.db.query.runningActivities.findFirst({
      where: eq(runningActivities.id, activityId),
    });

    // Badge types to check after run
    const typesToCheck = [
      'total_distance_miles',
      'single_run_distance_miles',
      '5k_time',
      '10k_time',
      'mile_time',
      'single_run_elevation_ft',
      'run_streak',
      'hybrid_week',
      'hybrid_total',
    ];

    const definitions = await this.db.query.badgeDefinitions.findMany();
    const earned = await this.db.query.userBadges.findMany({
      where: eq(userBadges.userId, this.userId),
      columns: { badgeId: true },
    });
    const earnedIds = new Set(earned.map((b: any) => b.badgeId));

    for (const badge of definitions) {
      const criteria = badge.criteria as BadgeCriteria;
      if (!typesToCheck.includes(criteria?.type)) continue;
      if (earnedIds.has(badge.id)) continue;

      const check = await this.checkBadge(badge, stats, activity);
      results.push(check);

      if (check.earned) {
        await this.awardBadge(badge.id, badge.badgeType, { activityId });
      }
    }

    return results;
  }

  // Check a single badge
  private async checkBadge(
    badge: BadgeDefinition,
    stats: UserStats,
    activity?: any
  ): Promise<BadgeCheckResult> {
    const criteria = badge.criteria as BadgeCriteria;
    if (!criteria) {
      return { badgeId: badge.id, earned: false };
    }

    const METERS_PER_MILE = 1609.34;
    const METERS_PER_FOOT = 0.3048;

    switch (criteria.type) {
      // Strength badges
      case 'workout_count':
        return {
          badgeId: badge.id,
          earned: stats.workoutCount >= (criteria.value || 0),
          progress: stats.workoutCount,
          target: criteria.value,
        };

      case 'total_volume':
        return {
          badgeId: badge.id,
          earned: stats.totalVolume >= (criteria.value || 0),
          progress: stats.totalVolume,
          target: criteria.value,
        };

      case 'pr_count':
        return {
          badgeId: badge.id,
          earned: stats.prCount >= (criteria.value || 0),
          progress: stats.prCount,
          target: criteria.value,
        };

      case 'exercise_weight': {
        const maxWeight = stats.exerciseMaxes[criteria.exercise || ''] || 0;
        return {
          badgeId: badge.id,
          earned: maxWeight >= (criteria.weight || 0),
          progress: maxWeight,
          target: criteria.weight,
        };
      }

      case 'powerlifting_total': {
        const total =
          (stats.exerciseMaxes['squat'] || 0) +
          (stats.exerciseMaxes['bench_press'] || 0) +
          (stats.exerciseMaxes['deadlift'] || 0);
        return {
          badgeId: badge.id,
          earned: total >= (criteria.value || 0),
          progress: total,
          target: criteria.value,
        };
      }

      // Running badges
      case 'total_distance_miles': {
        const totalMiles = stats.totalRunDistance / METERS_PER_MILE;
        return {
          badgeId: badge.id,
          earned: totalMiles >= (criteria.value || 0),
          progress: Math.round(totalMiles * 10) / 10,
          target: criteria.value,
        };
      }

      case 'single_run_distance_miles': {
        if (!activity) return { badgeId: badge.id, earned: false };
        const activityMiles = (activity.distanceMeters || 0) / METERS_PER_MILE;
        return {
          badgeId: badge.id,
          earned: activityMiles >= (criteria.value || 0),
          progress: Math.round(activityMiles * 10) / 10,
          target: criteria.value,
        };
      }

      case '5k_time': {
        const best5k = stats.runningPRs['5k'];
        return {
          badgeId: badge.id,
          earned: best5k !== undefined && best5k <= (criteria.value || 0),
          progress: best5k,
          target: criteria.value,
        };
      }

      case '10k_time': {
        const best10k = stats.runningPRs['10k'];
        return {
          badgeId: badge.id,
          earned: best10k !== undefined && best10k <= (criteria.value || 0),
          progress: best10k,
          target: criteria.value,
        };
      }

      case 'mile_time': {
        const bestMile = stats.runningPRs['1mi'];
        return {
          badgeId: badge.id,
          earned: bestMile !== undefined && bestMile <= (criteria.value || 0),
          progress: bestMile,
          target: criteria.value,
        };
      }

      case 'single_run_elevation_ft': {
        if (!activity) return { badgeId: badge.id, earned: false };
        const elevationFt = (activity.elevationGainMeters || 0) / METERS_PER_FOOT;
        return {
          badgeId: badge.id,
          earned: elevationFt >= (criteria.value || 0),
          progress: Math.round(elevationFt),
          target: criteria.value,
        };
      }

      // Streak badges
      case 'workout_streak':
        return {
          badgeId: badge.id,
          earned: stats.workoutStreak >= (criteria.value || 0),
          progress: stats.workoutStreak,
          target: criteria.value,
        };

      case 'run_streak':
        return {
          badgeId: badge.id,
          earned: stats.runStreak >= (criteria.value || 0),
          progress: stats.runStreak,
          target: criteria.value,
        };

      case 'weekly_goal_streak':
        return {
          badgeId: badge.id,
          earned: stats.weeklyGoalStreak >= (criteria.value || 0),
          progress: stats.weeklyGoalStreak,
          target: criteria.value,
        };

      // Hybrid badges
      case 'hybrid_week':
        return {
          badgeId: badge.id,
          earned: stats.hasHybridWeek,
        };

      case 'hybrid_total': {
        const hasWorkouts = stats.workoutCount >= (criteria.workouts || 0);
        const hasMiles =
          stats.totalRunDistance / METERS_PER_MILE >= (criteria.miles || 0);
        return {
          badgeId: badge.id,
          earned: hasWorkouts && hasMiles,
        };
      }

      case 'active_months':
        return {
          badgeId: badge.id,
          earned: stats.activeMonths >= (criteria.value || 0),
          progress: stats.activeMonths,
          target: criteria.value,
        };

      case 'programs_completed':
        return {
          badgeId: badge.id,
          earned: stats.programsCompleted >= (criteria.value || 0),
          progress: stats.programsCompleted,
          target: criteria.value,
        };

      default:
        return { badgeId: badge.id, earned: false };
    }
  }

  // Award a badge to the user
  private async awardBadge(
    badgeId: string,
    badgeType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.db.insert(userBadges).values({
      userId: this.userId,
      badgeId,
      badgeType,
      metadata,
    });
  }

  // Get all user stats needed for badge checking
  private async getUserStats(): Promise<UserStats> {
    const [
      workoutCountResult,
      volumeResult,
      prCountResult,
      runStatsResult,
      streakResult,
      runningPRsResult,
      programsResult,
      exerciseMaxesResult,
      hybridWeekResult,
    ] = await Promise.all([
      // Workout count
      this.db.execute(sql`
        SELECT COUNT(*) as count
        FROM workouts
        WHERE user_id = ${this.userId}
      `),

      // Total volume
      this.db.execute(sql`
        SELECT COALESCE(SUM(ws.weight * ws.reps), 0) as volume
        FROM workout_sets ws
        JOIN workouts w ON w.id = ws.workout_id
        WHERE w.user_id = ${this.userId}
      `),

      // PR count
      this.db.execute(sql`
        SELECT COUNT(*) as count
        FROM personal_records
        WHERE user_id = ${this.userId}
      `),

      // Run stats
      this.db.execute(sql`
        SELECT
          COALESCE(SUM(distance_meters), 0) as total_distance
        FROM running_activities
        WHERE user_id = ${this.userId}
      `),

      // Streaks
      this.db.query.userStreaks.findMany({
        where: eq(userStreaks.userId, this.userId),
      }),

      // Running PRs
      this.db.query.runningPRs.findMany({
        where: eq(runningPRs.userId, this.userId),
      }),

      // Completed programs
      this.db.execute(sql`
        SELECT COUNT(*) as count
        FROM training_programs
        WHERE user_id = ${this.userId} AND status = 'completed'
      `),

      // Exercise maxes for big 3
      this.db.execute(sql`
        SELECT
          e.name as exercise_name,
          MAX(ws.weight) as max_weight
        FROM workout_sets ws
        JOIN exercises e ON e.id = ws.exercise_id
        WHERE ws.workout_id IN (SELECT id FROM workouts WHERE user_id = ${this.userId})
          AND e.name IN ('Barbell Bench Press', 'Barbell Squat', 'Conventional Deadlift', 'Barbell Back Squat')
        GROUP BY e.name
      `),

      // Hybrid week check (both workout and run in same week)
      this.db.execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM workouts w
          WHERE w.user_id = ${this.userId}
            AND w.created_at >= NOW() - INTERVAL '7 days'
        ) as has_workout,
        EXISTS (
          SELECT 1
          FROM running_activities r
          WHERE r.user_id = ${this.userId}
            AND r.started_at >= NOW() - INTERVAL '7 days'
        ) as has_run
      `),
    ]);

    // Process results
    const workoutStreak =
      streakResult.find((s: any) => s.streakType === 'workout')?.currentStreak || 0;
    const runStreak =
      streakResult.find((s: any) => s.streakType === 'running')?.currentStreak || 0;

    // Map exercise names to keys
    const exerciseMaxes: Record<string, number> = {};
    const exerciseRows = Array.isArray(exerciseMaxesResult) ? exerciseMaxesResult : (exerciseMaxesResult?.rows || []);
    for (const row of exerciseRows) {
      const name = row.exercise_name?.toLowerCase() || '';
      if (name.includes('bench')) {
        exerciseMaxes['bench_press'] = row.max_weight || 0;
      } else if (name.includes('squat')) {
        exerciseMaxes['squat'] = row.max_weight || 0;
      } else if (name.includes('deadlift')) {
        exerciseMaxes['deadlift'] = row.max_weight || 0;
      }
    }

    // Map running PRs
    const runningPRsMap: Record<string, number> = {};
    for (const pr of runningPRsResult) {
      if (pr.timeSeconds) {
        runningPRsMap[pr.prType] = pr.timeSeconds;
      }
    }

    // Convert hybrid week booleans (database may return as strings, booleans, or 1/0)
    const hybridRows = Array.isArray(hybridWeekResult) ? hybridWeekResult : (hybridWeekResult?.rows || []);
    const hybridRow = hybridRows[0] || {};
    const hasWorkout = Boolean(hybridRow.has_workout);
    const hasRun = Boolean(hybridRow.has_run);

    // Helper to get first row from result (handles both array and .rows format)
    const getFirstRow = (result: any) => {
      const rows = Array.isArray(result) ? result : (result?.rows || []);
      return rows[0] || {};
    };

    return {
      workoutCount: parseInt(getFirstRow(workoutCountResult)?.count || '0'),
      totalVolume: parseFloat(getFirstRow(volumeResult)?.volume || '0'),
      prCount: parseInt(getFirstRow(prCountResult)?.count || '0'),
      totalRunDistance: parseFloat(getFirstRow(runStatsResult)?.total_distance || '0'),
      workoutStreak,
      runStreak,
      weeklyGoalStreak: 0, // Would need more complex calculation
      runningPRs: runningPRsMap,
      exerciseMaxes,
      programsCompleted: parseInt(getFirstRow(programsResult)?.count || '0'),
      activeMonths: 0, // Would need more complex calculation
      hasHybridWeek: hasWorkout && hasRun,
    };
  }
}

// Stats type
type UserStats = {
  workoutCount: number;
  totalVolume: number;
  prCount: number;
  totalRunDistance: number;
  workoutStreak: number;
  runStreak: number;
  weeklyGoalStreak: number;
  runningPRs: Record<string, number>;
  exerciseMaxes: Record<string, number>;
  programsCompleted: number;
  activeMonths: number;
  hasHybridWeek: boolean;
};

// Export factory function
export function createBadgeUnlocker(db: any, userId: string): BadgeUnlocker {
  return new BadgeUnlocker(db, userId);
}
