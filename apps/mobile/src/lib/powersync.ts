import { PowerSyncDatabase } from '@powersync/react-native';
import { PowerSyncBackendConnector } from '@powersync/react-native';
import { column, Schema, Table } from '@powersync/react-native';
import { supabase } from '../stores/auth';

// PowerSync schema matching backend Drizzle schemas (11 sync tables)
const POWERSYNC_SCHEMA = new Schema({
  workouts: new Table({
    id: column.text,
    user_id: column.text,
    name: column.text,
    notes: column.text,
    status: column.text,
    started_at: column.text,
    completed_at: column.text,
    duration: column.integer,
    program_id: column.text,
    program_week: column.integer,
    program_day: column.integer,
    created_at: column.text,
    updated_at: column.text,
  }),
  workout_sets: new Table({
    id: column.text,
    workout_id: column.text,
    exercise_id: column.text,
    user_id: column.text,
    set_number: column.integer,
    reps: column.integer,
    weight: column.real,
    weight_unit: column.text,
    rpe: column.real,
    logging_method: column.text,
    voice_transcript: column.text,
    confidence: column.real,
    is_pr: column.integer,
    estimated_1rm: column.real,
    rest_duration: column.integer,
    synced_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  }),
  exercises: new Table({
    id: column.text,
    name: column.text,
    description: column.text,
    instructions: column.text,
    primary_muscle: column.text,
    secondary_muscles: column.text,
    movement_pattern: column.text,
    equipment: column.text,
    difficulty: column.text,
    is_compound: column.integer,
    is_unilateral: column.integer,
    is_custom: column.integer,
    created_by_user_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  }),
  running_activities: new Table({
    id: column.text,
    user_id: column.text,
    run_type: column.text,
    name: column.text,
    notes: column.text,
    distance_meters: column.real,
    duration_seconds: column.integer,
    avg_pace_seconds_per_km: column.real,
    avg_heart_rate: column.integer,
    max_heart_rate: column.integer,
    elevation_gain_meters: column.real,
    calories_burned: column.integer,
    avg_cadence: column.integer,
    avg_stride_length: column.real,
    splits: column.text,
    route_polyline: column.text,
    start_latitude: column.real,
    start_longitude: column.real,
    source: column.text,
    external_id: column.text,
    program_id: column.text,
    program_week: column.integer,
    program_day: column.integer,
    started_at: column.text,
    completed_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  }),
  readiness_scores: new Table({
    id: column.text,
    user_id: column.text,
    date: column.text,
    overall_score: column.integer,
    sleep_quality: column.integer,
    energy_level: column.integer,
    motivation: column.integer,
    soreness: column.integer,
    stress: column.integer,
    notes: column.text,
    hrv_score: column.real,
    resting_hr: column.real,
    sleep_hours: column.real,
    created_at: column.text,
    updated_at: column.text,
  }),
  injuries: new Table({
    id: column.text,
    user_id: column.text,
    name: column.text,
    body_part: column.text,
    side: column.text,
    description: column.text,
    severity: column.text,
    status: column.text,
    injury_date: column.text,
    expected_recovery_date: column.text,
    healed_date: column.text,
    exercises_to_avoid: column.text,
    movements_to_avoid: column.text,
    recommended_exercises: column.text,
    diagnosed_by: column.text,
    treatment_notes: column.text,
    physical_therapy_notes: column.text,
    is_active: column.integer,
    affects_workouts: column.integer,
    created_at: column.text,
    updated_at: column.text,
  }),
  nutrition_summaries: new Table({
    id: column.text,
    user_id: column.text,
    date: column.text,
    calories: column.integer,
    protein: column.real,
    carbohydrates: column.real,
    fat: column.real,
    fiber: column.real,
    sugar: column.real,
    sodium: column.real,
    potassium: column.real,
    calcium: column.real,
    iron: column.real,
    vitamin_a: column.real,
    vitamin_c: column.real,
    vitamin_d: column.real,
    water_ml: column.integer,
    caffeine_mg: column.integer,
    source: column.text,
    last_synced_at: column.text,
    created_at: column.text,
    updated_at: column.text,
  }),
  running_shoes: new Table({
    id: column.text,
    user_id: column.text,
    brand: column.text,
    model: column.text,
    nickname: column.text,
    color: column.text,
    size: column.text,
    purchase_date: column.text,
    purchase_price: column.real,
    purchase_location: column.text,
    initial_mileage: column.real,
    total_mileage_meters: column.real,
    replacement_threshold_meters: column.real,
    is_active: column.integer,
    is_default: column.integer,
    retired_at: column.text,
    retired_reason: column.text,
    notes: column.text,
    total_runs: column.integer,
    created_at: column.text,
    updated_at: column.text,
  }),
  training_programs: new Table({
    id: column.text,
    user_id: column.text,
    name: column.text,
    description: column.text,
    program_type: column.text,
    duration_weeks: column.integer,
    days_per_week: column.integer,
    primary_goal: column.text,
    secondary_goals: column.text,
    status: column.text,
    current_week: column.integer,
    current_day: column.integer,
    start_date: column.text,
    end_date: column.text,
    completed_at: column.text,
    is_template: column.integer,
    is_public: column.integer,
    created_at: column.text,
    updated_at: column.text,
  }),
  program_days: new Table({
    id: column.text,
    program_id: column.text,
    week_id: column.text,
    week_number: column.integer,
    day_of_week: column.integer,
    day_number: column.integer,
    workout_type: column.text,
    name: column.text,
    description: column.text,
    estimated_duration: column.integer,
    is_completed: column.integer,
    completed_workout_id: column.text,
    completed_run_id: column.text,
    completed_at: column.text,
    scheduled_date: column.text,
    created_at: column.text,
  }),
  badge_definitions: new Table({
    id: column.text,
    name: column.text,
    description: column.text,
    icon: column.text,
    category: column.text,
    rarity: column.text,
    trigger_type: column.text,
    trigger_value: column.integer,
    points: column.integer,
    is_hidden: column.integer,
    order: column.integer,
    created_at: column.text,
  }),
});

// PowerSync database instance
export const powerSync = new PowerSyncDatabase({
  schema: POWERSYNC_SCHEMA,
  database: {
    dbFilename: 'voicefit.db',
  },
});

// Type for conflict records with updated_at field
interface ConflictRecord {
  updated_at?: string;
  [key: string]: any;
}

interface Conflict {
  local?: ConflictRecord;
  remote?: ConflictRecord;
}

// Conflict resolution: last-write-wins based on updated_at timestamp
export function resolveConflict(conflict: Conflict): ConflictRecord | undefined {
  const local = conflict.local;
  const remote = conflict.remote;

  // If both have updated_at, use last-write-wins
  if (local?.updated_at && remote?.updated_at) {
    const localTime = new Date(local.updated_at).getTime();
    const remoteTime = new Date(remote.updated_at).getTime();

    return remoteTime >= localTime ? remote : local;
  }

  // Default to remote if no timestamps
  return remote;
}

// PowerSync backend connector
class SupabasePowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No session available');
    }

    const powerSyncUrl = process.env.EXPO_PUBLIC_POWERSYNC_URL;
    if (!powerSyncUrl) {
      throw new Error('EXPO_PUBLIC_POWERSYNC_URL not configured');
    }

    return {
      endpoint: powerSyncUrl,
      token: session.access_token,
    };
  }

  async uploadData(database: any): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      const ops = transaction.getCrudOperations();

      for (const op of ops) {
        const table = supabase.from(op.table);

        if (op.op === 'PUT') {
          await table.upsert(op.opData);
        } else if (op.op === 'PATCH') {
          await table.update(op.opData).eq('id', op.id);
        } else if (op.op === 'DELETE') {
          await table.delete().eq('id', op.id);
        }
      }

      await transaction.complete();
    } catch (error) {
      console.error('[PowerSync] Upload error:', error);
      throw error;
    }
  }
}

// Initialize PowerSync connection
export async function initPowerSync(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('[PowerSync] No session available, skipping initialization');
      return;
    }

    const powerSyncUrl = process.env.EXPO_PUBLIC_POWERSYNC_URL;

    if (!powerSyncUrl) {
      console.warn('[PowerSync] EXPO_PUBLIC_POWERSYNC_URL not configured, skipping initialization');
      return;
    }

    const connector = new SupabasePowerSyncConnector();
    await powerSync.connect(connector);
    // PowerSync connected
  } catch (error) {
    console.error('[PowerSync] Initialization failed:', error);
    // PowerSync is optional - don't throw
  }
}

// Disconnect PowerSync
export async function disconnectPowerSync(): Promise<void> {
  try {
    await powerSync.disconnect();
    // PowerSync disconnected
  } catch (error) {
    console.error('[PowerSync] Disconnect failed:', error);
  }
}
