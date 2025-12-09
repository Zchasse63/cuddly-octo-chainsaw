/**
 * PowerSync Configuration for Offline-First Support
 *
 * PowerSync is critical for VoiceFit because:
 * 1. Users often work out in gyms with poor connectivity
 * 2. Running activities need to work offline with GPS
 * 3. Voice logging needs to queue and sync later
 *
 * Sync Tables (12 tables):
 * - workouts, workout_sets
 * - running_activities
 * - readiness_check_ins
 * - user_profiles
 * - exercises (read-only)
 * - personal_records
 * - user_badges, user_streaks
 * - running_shoes
 * - training_calendar
 * - program_adherence
 */

// PowerSync is not yet installed - using placeholder type
// TODO: Install @powersync/react-native when ready to implement offline-first
type AbstractPowerSyncDatabase = {
  execute: (sql: string, params?: unknown[]) => Promise<unknown>;
  getAll: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
};

// PowerSync schema definition
export const PowerSyncSchema = {
  tables: [
    // User profile - sync all fields
    {
      name: 'user_profiles',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'avatar_url', type: 'TEXT' },
        { name: 'experience_level', type: 'TEXT' },
        { name: 'goals', type: 'TEXT' }, // JSON array
        { name: 'training_frequency', type: 'TEXT' },
        { name: 'preferred_equipment', type: 'TEXT' }, // JSON array
        { name: 'injuries', type: 'TEXT' },
        { name: 'tier', type: 'TEXT' },
        { name: 'theme', type: 'TEXT' },
        { name: 'preferred_weight_unit', type: 'TEXT' },
        { name: 'notifications_enabled', type: 'INTEGER' },
        { name: 'onboarding_completed', type: 'INTEGER' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
      ],
    },

    // Workouts - core logging table
    {
      name: 'workouts',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'logging_method', type: 'TEXT' },
        { name: 'started_at', type: 'TEXT' },
        { name: 'completed_at', type: 'TEXT' },
        { name: 'duration_seconds', type: 'INTEGER' },
        { name: 'total_volume', type: 'REAL' },
        { name: 'total_sets', type: 'INTEGER' },
        { name: 'total_reps', type: 'INTEGER' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
      ],
    },

    // Workout sets
    {
      name: 'workout_sets',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'workout_id', type: 'TEXT' },
        { name: 'exercise_id', type: 'TEXT' },
        { name: 'set_number', type: 'INTEGER' },
        { name: 'weight', type: 'REAL' },
        { name: 'reps', type: 'INTEGER' },
        { name: 'rpe', type: 'REAL' },
        { name: 'is_warmup', type: 'INTEGER' },
        { name: 'is_pr', type: 'INTEGER' },
        { name: 'notes', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
      ],
    },

    // Running activities
    {
      name: 'running_activities',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'run_type', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' },
        { name: 'distance_meters', type: 'REAL' },
        { name: 'duration_seconds', type: 'INTEGER' },
        { name: 'avg_pace_seconds_per_km', type: 'REAL' },
        { name: 'avg_heart_rate', type: 'INTEGER' },
        { name: 'max_heart_rate', type: 'INTEGER' },
        { name: 'elevation_gain_meters', type: 'REAL' },
        { name: 'calories_burned', type: 'INTEGER' },
        { name: 'splits', type: 'TEXT' }, // JSON
        { name: 'route_polyline', type: 'TEXT' },
        { name: 'start_latitude', type: 'REAL' },
        { name: 'start_longitude', type: 'REAL' },
        { name: 'source', type: 'TEXT' },
        { name: 'started_at', type: 'TEXT' },
        { name: 'completed_at', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
      ],
    },

    // Readiness check-ins
    {
      name: 'readiness_check_ins',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'sleep_hours', type: 'REAL' },
        { name: 'sleep_quality', type: 'INTEGER' },
        { name: 'stress_level', type: 'INTEGER' },
        { name: 'soreness_level', type: 'INTEGER' },
        { name: 'energy_level', type: 'INTEGER' },
        { name: 'motivation_level', type: 'INTEGER' },
        { name: 'nutrition_quality', type: 'INTEGER' },
        { name: 'recovery_score', type: 'INTEGER' },
        { name: 'notes', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
      ],
    },

    // Exercises (read-only sync)
    {
      name: 'exercises',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'description', type: 'TEXT' },
        { name: 'instructions', type: 'TEXT' },
        { name: 'primary_muscle', type: 'TEXT' },
        { name: 'secondary_muscles', type: 'TEXT' }, // JSON
        { name: 'movement_pattern', type: 'TEXT' },
        { name: 'equipment', type: 'TEXT' }, // JSON
        { name: 'difficulty', type: 'TEXT' },
        { name: 'is_compound', type: 'INTEGER' },
        { name: 'is_unilateral', type: 'INTEGER' },
        { name: 'aliases', type: 'TEXT' }, // JSON
      ],
    },

    // Personal records
    {
      name: 'personal_records',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'exercise_id', type: 'TEXT' },
        { name: 'weight', type: 'REAL' },
        { name: 'reps', type: 'INTEGER' },
        { name: 'estimated_1rm', type: 'REAL' },
        { name: 'previous_pr_id', type: 'TEXT' },
        { name: 'improvement_percent', type: 'REAL' },
        { name: 'workout_id', type: 'TEXT' },
        { name: 'workout_set_id', type: 'TEXT' },
        { name: 'achieved_at', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
      ],
    },

    // User badges
    {
      name: 'user_badges',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'badge_id', type: 'TEXT' },
        { name: 'badge_type', type: 'TEXT' },
        { name: 'earned_at', type: 'TEXT' },
        { name: 'metadata', type: 'TEXT' }, // JSON
      ],
    },

    // User streaks
    {
      name: 'user_streaks',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'streak_type', type: 'TEXT' },
        { name: 'current_streak', type: 'INTEGER' },
        { name: 'longest_streak', type: 'INTEGER' },
        { name: 'last_activity_date', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
      ],
    },

    // Running shoes
    {
      name: 'running_shoes',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'brand', type: 'TEXT' },
        { name: 'model', type: 'TEXT' },
        { name: 'nickname', type: 'TEXT' },
        { name: 'color', type: 'TEXT' },
        { name: 'size', type: 'TEXT' },
        { name: 'initial_mileage', type: 'REAL' },
        { name: 'total_mileage_meters', type: 'REAL' },
        { name: 'replacement_threshold_meters', type: 'REAL' },
        { name: 'is_active', type: 'INTEGER' },
        { name: 'is_default', type: 'INTEGER' },
        { name: 'total_runs', type: 'INTEGER' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
      ],
    },

    // Training calendar entries
    {
      name: 'training_calendar',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'scheduled_date', type: 'TEXT' },
        { name: 'activity_type', type: 'TEXT' },
        { name: 'program_id', type: 'TEXT' },
        { name: 'program_day_id', type: 'TEXT' },
        { name: 'workout_id', type: 'TEXT' },
        { name: 'running_activity_id', type: 'TEXT' },
        { name: 'title', type: 'TEXT' },
        { name: 'description', type: 'TEXT' },
        { name: 'workout_type', type: 'TEXT' },
        { name: 'estimated_duration', type: 'INTEGER' },
        { name: 'status', type: 'TEXT' },
        { name: 'completed_at', type: 'TEXT' },
        { name: 'user_notes', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
      ],
    },

    // Program adherence
    {
      name: 'program_adherence',
      columns: [
        { name: 'id', type: 'TEXT' },
        { name: 'user_id', type: 'TEXT' },
        { name: 'program_id', type: 'TEXT' },
        { name: 'program_day_id', type: 'TEXT' },
        { name: 'scheduled_date', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'completion_percent', type: 'REAL' },
        { name: 'exercises_completed', type: 'INTEGER' },
        { name: 'exercises_scheduled', type: 'INTEGER' },
        { name: 'skip_reason', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' },
        { name: 'completed_at', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
      ],
    },
  ],
};

// Sync rules for PowerSync
export const SyncRules = `
bucket_definitions:
  # User's own data
  user_data:
    data:
      - SELECT * FROM user_profiles WHERE user_id = token_parameters.user_id
      - SELECT * FROM workouts WHERE user_id = token_parameters.user_id
      - SELECT * FROM workout_sets WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = token_parameters.user_id)
      - SELECT * FROM running_activities WHERE user_id = token_parameters.user_id
      - SELECT * FROM readiness_check_ins WHERE user_id = token_parameters.user_id
      - SELECT * FROM personal_records WHERE user_id = token_parameters.user_id
      - SELECT * FROM user_badges WHERE user_id = token_parameters.user_id
      - SELECT * FROM user_streaks WHERE user_id = token_parameters.user_id
      - SELECT * FROM running_shoes WHERE user_id = token_parameters.user_id
      - SELECT * FROM training_calendar WHERE user_id = token_parameters.user_id
      - SELECT * FROM program_adherence WHERE user_id = token_parameters.user_id

  # Shared read-only data
  shared_data:
    data:
      - SELECT id, name, description, instructions, primary_muscle, secondary_muscles, movement_pattern, equipment, difficulty, is_compound, is_unilateral, aliases FROM exercises
`;

// Conflict resolution strategy: Last-Write-Wins
export const ConflictResolution = {
  strategy: 'last-write-wins',
  timestampColumn: 'updated_at',
};

// Hook to check sync status
export function useSyncStatus(db: AbstractPowerSyncDatabase | null) {
  // Would return sync status for UI indicator
  return {
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    pendingChanges: 0,
  };
}

// Export types
export type SyncStatus = {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingChanges: number;
};
