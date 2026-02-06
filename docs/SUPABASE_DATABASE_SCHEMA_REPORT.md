# VoiceFit Supabase Database Schema Report

> **OUTDATED**: This report documents 41 tables from November 2025. The Drizzle schema now defines **69 tables** across 24 files. For the current schema, see `apps/backend/src/db/schema/`. For the full database audit, see [PROJECT_COMPLETION_ROADMAP.md](audits/PROJECT_COMPLETION_ROADMAP.md).

**Generated**: November 25, 2025
**Project**: Voice Fit (ID: szragdskusayriycfhrs)
**Region**: us-east-1
**Purpose**: External development team review

---

## Executive Summary

**Total Tables**: 41 (public schema)  
**Total Indexes**: 200+ (optimized for performance)  
**Total Functions**: 100+ (including Supabase system functions)  
**Foreign Key Relationships**: 15  
**Vector Embeddings**: 3 tables (exercises, exercise_cues, knowledge_base)

---

## Public Schema Tables (41 tables)

### 1. User & Profile Management

#### `user_profiles`
**Purpose**: Core user profile information and fitness goals  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `user_id` (one profile per user)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| user_type | text | YES | 'athlete', 'coach', etc. |
| primary_goal | text | YES | User's fitness goal |
| training_age | text | YES | Experience level |
| created_at | timestamptz | YES | Account creation |
| updated_at | timestamptz | YES | Last update |

**Indexes**:
- `idx_user_profiles_user_id` (user_id)
- `idx_user_profiles_user_type` (user_type)
- `idx_user_profiles_primary_goal` (primary_goal)
- `idx_user_profiles_training_age` (training_age)

---

#### `user_onboarding`
**Purpose**: Track onboarding completion status  
**Primary Key**: `user_id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| user_id | uuid | NO | Primary key, references auth.users |
| is_complete | boolean | YES | Onboarding finished |
| completed_at | timestamptz | YES | Completion timestamp |
| created_at | timestamptz | YES | Started onboarding |

**Indexes**:
- `idx_user_onboarding_is_complete` (is_complete)

---

#### `user_streaks`
**Purpose**: Track user activity streaks  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `user_id, streak_type`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| streak_type | text | NO | Type of streak |
| current_streak | integer | YES | Current count |
| longest_streak | integer | YES | All-time best |
| last_activity_date | date | YES | Last activity |

**Indexes**:
- `idx_user_streaks_user_id` (user_id)
- `idx_user_streaks_type` (streak_type)

---

#### `user_badges`
**Purpose**: Achievement badges earned by users  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| badge_type | text | NO | Badge category |
| earned_at | timestamptz | YES | When earned |
| metadata | jsonb | YES | Additional data |

**Indexes**:
- `idx_user_badges_user_id` (user_id)
- `idx_user_badges_type` (badge_type)
- `idx_user_badges_earned_at` (earned_at DESC)

---

### 2. Exercise Database

#### `exercises`
**Purpose**: Master exercise library with embeddings for AI matching  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| name | text | NO | Exercise name |
| normalized_name | text | YES | Lowercase, no spaces |
| phonetic_key | text | YES | Soundex/metaphone key |
| synonyms | text[] | YES | Alternative names |
| base_movement | text | YES | Core movement pattern |
| movement_pattern | text | YES | Push/pull/squat/hinge |
| equipment_required | text[] | YES | Equipment needed |
| difficulty_level | text | YES | Beginner/intermediate/advanced |
| embedding | vector(1536) | YES | Upstash Vector embedding |
| search_vector | tsvector | YES | Full-text search |
| parent_exercise_id | uuid | YES | Progression parent |
| progression_parent | text | YES | Progression chain |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_exercises_embedding` (IVFFlat vector index for similarity search)
- `idx_exercises_search_vector` (GIN index for full-text search)
- `idx_exercises_normalized_name` (normalized_name)
- `idx_exercises_phonetic_key` (phonetic_key)
- `idx_exercises_synonyms` (GIN on synonyms array)
- `idx_exercises_movement_pattern` (movement_pattern)
- `idx_exercises_base_movement` (base_movement)
- `idx_exercises_parent_id` (parent_exercise_id)
- `idx_exercises_progression_parent` (progression_parent)

**Foreign Keys**:
- `parent_exercise_id` → `exercises(id)` ON DELETE SET NULL

---

#### `exercise_muscles`
**Purpose**: Muscle groups targeted by each exercise  
**Primary Key**: `exercise_id, muscle_group` (composite)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| exercise_id | uuid | NO | References exercises |
| muscle_group | text | NO | Muscle group name |
| activation_level | text | YES | Primary/secondary/stabilizer |

**Indexes**:
- `idx_exercise_muscles_exercise_id` (exercise_id)
- `idx_exercise_muscles_muscle_group` (muscle_group)

**Foreign Keys**:
- `exercise_id` → `exercises(id)` ON DELETE CASCADE

---

#### `exercise_cues`
**Purpose**: Form cues and coaching tips with embeddings  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| exercise_id | uuid | NO | References exercises |
| cue_text | text | NO | Coaching cue |
| cue_type | text | YES | Setup/execution/common_mistake |
| embedding | vector(1536) | YES | Cue embedding for RAG |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_exercise_cues_exercise_id` (exercise_id)
- `idx_exercise_cues_cue_type` (cue_type)
- `idx_exercise_cues_embedding` (IVFFlat vector index)

**Foreign Keys**:
- `exercise_id` → `exercises(id)` ON DELETE CASCADE

---

#### `exercise_media`
**Purpose**: Videos, images, and GIFs for exercises  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| exercise_id | uuid | NO | References exercises |
| media_type | text | NO | video/image/gif |
| media_url | text | NO | Storage URL |
| thumbnail_url | text | YES | Thumbnail |
| created_at | timestamptz | YES | Upload timestamp |

**Indexes**:
- `idx_exercise_media_exercise_id` (exercise_id)

**Foreign Keys**:
- `exercise_id` → `exercises(id)` ON DELETE CASCADE

---

#### `exercise_substitutions`
**Purpose**: Alternative exercises for injury/equipment limitations  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| exercise_name | text | NO | Original exercise |
| substitute_name | text | NO | Alternative exercise |
| movement_pattern | text | YES | Shared movement |
| reduced_stress_area | text | YES | Body part protected |
| equipment_required | text | YES | Equipment needed |
| similarity_score | numeric | YES | 0-1 similarity |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_exercise_substitutions_exercise_name` (exercise_name)
- `idx_exercise_substitutions_movement_pattern` (movement_pattern)
- `idx_exercise_substitutions_reduced_stress_area` (reduced_stress_area)
- `idx_exercise_substitutions_similarity_score` (similarity_score DESC)
- `idx_exercise_substitutions_exercise_stress` (exercise_name, reduced_stress_area)

---

#### `exercise_body_part_stress`
**Purpose**: Body part stress levels for each exercise  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| exercise_name | text | NO | Exercise name |
| body_part | text | NO | Affected body part |
| stress_intensity | text | YES | Low/medium/high |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_exercise_body_part_stress_exercise` (exercise_name)
- `idx_exercise_body_part_stress_body_part` (body_part)
- `idx_exercise_body_part_stress_intensity` (stress_intensity)
- `idx_exercise_body_part_stress_composite` (exercise_name, body_part)

---

### 3. Workout Logging

#### `workouts`
**Purpose**: Workout sessions  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| name | text | YES | Workout name |
| start_time | timestamptz | NO | Session start |
| end_time | timestamptz | YES | Session end |
| notes | text | YES | User notes |
| created_at | timestamptz | YES | Created timestamp |
| updated_at | timestamptz | YES | Last update |

**Indexes**:
- `idx_workouts_user_id` (user_id)
- `idx_workouts_user_date` (user_id, start_time DESC)
- `idx_workouts_start_time` (start_time DESC)

---

#### `workout_logs`
**Purpose**: Individual exercise sets within workouts  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | YES | References auth.users |
| workout_id | uuid | YES | References workouts |
| exercise_id | uuid | NO | References exercises |
| program_exercise_id | uuid | YES | References program_exercises |
| voice_command_id | uuid | YES | References voice_commands |
| workout_date | date | NO | Date performed |
| set_number | integer | NO | Set number |
| reps_completed | integer | NO | Reps performed |
| weight_used | numeric | YES | Weight (lbs/kg) |
| rpe | numeric | YES | Rate of perceived exertion |
| was_prescribed | boolean | YES | From program |
| was_completed | boolean | YES | Completed successfully |
| notes | text | YES | Set notes |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_workout_logs_user_id` (user_id)
- `idx_workout_logs_workout_id` (workout_id)
- `idx_workout_logs_exercise_id` (exercise_id)
- `idx_workout_logs_program_exercise_id` (program_exercise_id)
- `idx_workout_logs_user_date` (user_id, workout_date DESC)
- `idx_workout_logs_workout_date` (workout_date)

**Foreign Keys**:
- `exercise_id` → `exercises(id)` ON DELETE CASCADE
- `program_exercise_id` → `program_exercises(id)` ON DELETE SET NULL
- `workout_id` → `workouts(id)` ON DELETE CASCADE

---

### 4. Voice Commands & AI

#### `voice_commands`
**Purpose**: Voice workout logging history with fine-tuning data  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| workout_id | uuid | YES | Associated workout |
| exercise_id | uuid | YES | Matched exercise |
| model_id | text | YES | Fine-tuned model used |
| raw_transcript | text | NO | Original voice input |
| parsed_output | jsonb | YES | AI parsed data |
| confidence | numeric | YES | 0-1 confidence score |
| was_corrected | boolean | YES | User corrected |
| corrected_output | jsonb | YES | User's correction |
| cache_tier | text | YES | Hot/warm/cold |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_voice_commands_user_id` (user_id)
- `idx_voice_commands_workout_id` (workout_id)
- `idx_voice_commands_exercise_id` (exercise_id)
- `idx_voice_commands_model_id` (model_id)
- `idx_voice_commands_confidence` (confidence)
- `idx_voice_commands_was_corrected` (was_corrected) WHERE was_corrected = true
- `idx_voice_commands_low_confidence` (confidence) WHERE confidence < 0.85
- `idx_voice_commands_cache_tier` (cache_tier)
- `idx_voice_commands_created_at` (created_at DESC)

---

#### `fine_tuned_models`
**Purpose**: Track fine-tuned AI models for voice parsing  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `model_id`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| model_id | text | NO | AI model ID |
| user_id | uuid | YES | User-specific model |
| base_model | text | YES | Base model name |
| training_data_count | integer | YES | Training examples |
| is_active | boolean | YES | Currently in use |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_fine_tuned_models_user_id` (user_id) WHERE user_id IS NOT NULL
- `idx_fine_tuned_models_active` (is_active) WHERE is_active = true

---

#### `knowledge_base`
**Purpose**: RAG knowledge base with vector embeddings  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `chunk_id`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| chunk_id | text | NO | Unique chunk identifier |
| chunk_type | text | YES | Document type |
| category | text | YES | Knowledge category |
| content | text | NO | Text content |
| embedding | vector(1536) | YES | Content embedding |
| tags | text[] | YES | Searchable tags |
| metadata | jsonb | YES | Additional metadata |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_knowledge_base_chunk_id` (chunk_id)
- `idx_knowledge_base_chunk_type` (chunk_type)
- `idx_knowledge_base_category` (category)
- `idx_knowledge_base_embedding` (IVFFlat vector index)
- `idx_knowledge_base_tags` (GIN on tags array)

---

### 5. Program Generation

#### `generated_programs`
**Purpose**: AI-generated training programs  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_profile_id | uuid | NO | References user_profiles |
| program_type | text | YES | Strength/running/hybrid |
| duration_weeks | integer | YES | Program length |
| is_active | boolean | YES | Currently active |
| created_at | timestamptz | YES | Generated timestamp |

**Indexes**:
- `idx_generated_programs_user_profile_id` (user_profile_id)
- `idx_generated_programs_is_active` (is_active) WHERE is_active = true

**Foreign Keys**:
- `user_profile_id` → `user_profiles(id)` ON DELETE CASCADE

---

#### `program_weeks`
**Purpose**: Weekly structure within programs  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `program_id, week_number`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| program_id | uuid | NO | References generated_programs |
| week_number | integer | NO | Week in program |
| focus | text | YES | Week focus/theme |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_program_weeks_program_id` (program_id)
- `idx_program_weeks_week_number` (week_number)

**Foreign Keys**:
- `program_id` → `generated_programs(id)` ON DELETE CASCADE

---

#### `program_exercises`
**Purpose**: Exercises within program weeks  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| program_week_id | uuid | NO | References program_weeks |
| exercise_id | uuid | NO | References exercises |
| day_of_week | integer | YES | 1-7 (Mon-Sun) |
| exercise_order | integer | YES | Order in workout |
| sets | integer | YES | Prescribed sets |
| reps | text | YES | Prescribed reps |
| rest_seconds | integer | YES | Rest between sets |
| notes | text | YES | Exercise notes |

**Indexes**:
- `idx_program_exercises_program_week_id` (program_week_id)
- `idx_program_exercises_exercise_id` (exercise_id)
- `idx_program_exercises_order` (exercise_order)

**Foreign Keys**:
- `program_week_id` → `program_weeks(id)` ON DELETE CASCADE
- `exercise_id` → `exercises(id)` ON DELETE CASCADE

---

### 6. Health & Recovery

#### `health_metrics`
**Purpose**: Daily health metrics from wearables  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `user_id, date, metric_type, source`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| date | date | NO | Metric date |
| metric_type | text | NO | hrv/rhr/sleep/etc |
| value | numeric | NO | Metric value |
| source | text | NO | whoop/terra/stryd/manual |
| recorded_at | timestamptz | YES | When recorded |
| metadata | jsonb | YES | Additional data |

**Indexes**:
- `idx_health_metrics_user_date` (user_id, date DESC)
- `idx_health_metrics_type` (metric_type)
- `idx_health_metrics_source` (source)
- `idx_health_metrics_recorded` (recorded_at DESC)

---

#### `readiness_scores`
**Purpose**: Daily readiness/recovery scores  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `user_id, date`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| date | date | NO | Score date |
| score | numeric | YES | 0-100 readiness |
| hrv_score | numeric | YES | HRV component |
| sleep_score | numeric | YES | Sleep component |
| recovery_score | numeric | YES | Recovery component |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_readiness_user_id` (user_id)
- `idx_readiness_user_date` (user_id, date DESC)
- `idx_readiness_date` (date DESC)

---

#### `sleep_sessions`
**Purpose**: Sleep tracking data  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| start_time | timestamptz | NO | Sleep start |
| end_time | timestamptz | YES | Sleep end |
| duration_minutes | integer | YES | Total sleep |
| quality_score | numeric | YES | Sleep quality |
| source | text | YES | Data source |
| metadata | jsonb | YES | Detailed sleep stages |

**Indexes**:
- `idx_sleep_sessions_user_time` (user_id, start_time DESC)
- `idx_sleep_sessions_source` (source)

---

#### `activity_sessions`
**Purpose**: Activity/workout sessions from wearables  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| activity_type | text | YES | Running/cycling/etc |
| start_time | timestamptz | NO | Activity start |
| end_time | timestamptz | YES | Activity end |
| duration_minutes | integer | YES | Duration |
| distance_meters | numeric | YES | Distance |
| calories | integer | YES | Calories burned |
| source | text | YES | Data source |
| metadata | jsonb | YES | Detailed metrics |

**Indexes**:
- `idx_activity_sessions_user_time` (user_id, start_time DESC)
- `idx_activity_sessions_type` (activity_type)
- `idx_activity_sessions_source` (source)

---

### 7. Running-Specific

#### `runs`
**Purpose**: Detailed running session data  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| start_time | timestamptz | NO | Run start |
| end_time | timestamptz | YES | Run end |
| distance_meters | numeric | YES | Distance |
| duration_seconds | integer | YES | Duration |
| avg_pace_min_per_km | numeric | YES | Average pace |
| avg_heart_rate | integer | YES | Average HR |
| max_heart_rate | integer | YES | Max HR |
| elevation_gain_meters | numeric | YES | Elevation |
| workout_type | text | YES | Easy/tempo/intervals |
| route_data | jsonb | YES | GPS coordinates |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_runs_user_id` (user_id)
- `idx_runs_user_date` (user_id, start_time DESC)
- `idx_runs_user_start_time` (user_id, start_time DESC)
- `idx_runs_start_time` (start_time DESC)
- `idx_runs_workout_type` (workout_type) WHERE workout_type IS NOT NULL

---

### 8. CrossFit

#### `crossfit_wods`
**Purpose**: CrossFit WOD library  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `name`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| name | text | NO | WOD name (e.g., "Fran") |
| wod_type | text | YES | AMRAP/EMOM/For Time |
| description | text | YES | WOD description |
| movements | jsonb | YES | Exercise list |
| time_cap_minutes | integer | YES | Time limit |
| created_at | timestamptz | YES | Created timestamp |

---

#### `wod_logs`
**Purpose**: CrossFit WOD performance logs  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| wod_id | uuid | YES | References crossfit_wods |
| logged_at | timestamptz | YES | When logged |
| result_time | text | YES | Completion time |
| result_rounds | integer | YES | Rounds completed |
| result_reps | integer | YES | Reps completed |
| notes | text | YES | Performance notes |
| raw_input | text | YES | Voice input |
| created_at | timestamptz | YES | Created timestamp |

**Foreign Keys**:
- `wod_id` → `crossfit_wods(id)` ON DELETE SET NULL

---

### 9. Coach-Client Relationships

#### `client_assignments`
**Purpose**: Coach-client relationships  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `coach_id, client_id`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| coach_id | uuid | NO | Coach user ID |
| client_id | uuid | NO | Client user ID |
| assigned_at | timestamptz | YES | Assignment date |
| revoked_at | timestamptz | YES | Revocation date |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_client_assignments_coach_id` (coach_id)
- `idx_client_assignments_client_id` (client_id)
- `idx_client_assignments_revoked_at` (revoked_at)

---

#### `coach_client_invitations`
**Purpose**: Pending coach-client invitations  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| coach_id | uuid | NO | Coach user ID |
| client_id | uuid | YES | Client user ID (if registered) |
| client_email | text | YES | Client email |
| status | text | YES | pending/accepted/declined |
| invited_at | timestamptz | YES | Invitation sent |
| responded_at | timestamptz | YES | Response timestamp |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_coach_client_invitations_coach_id` (coach_id)
- `idx_coach_client_invitations_client_id` (client_id)
- `idx_coach_client_invitations_client_email` (client_email)
- `idx_coach_client_invitations_status` (status)

---

### 10. Miscellaneous

#### `conversations`
**Purpose**: AI chat message history  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| message_type | text | YES | user/assistant/system |
| message_content | text | NO | Message text |
| created_at | timestamptz | YES | Message timestamp |

**Indexes**:
- `idx_conversations_user_id` (user_id)
- `idx_conversations_message_type` (message_type)
- `idx_conversations_created_at` (created_at DESC)

---

#### `messages`
**Purpose**: Alternative message storage  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| role | text | YES | user/assistant |
| content | text | NO | Message content |
| created_at | timestamptz | YES | Message timestamp |

**Indexes**:
- `idx_messages_user_id` (user_id)
- `idx_messages_user_created` (user_id, created_at DESC)
- `idx_messages_created_at` (created_at DESC)

---

#### `pr_history`
**Purpose**: Personal record tracking  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `user_id, exercise_id, achieved_at`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| exercise_id | uuid | NO | References exercises |
| workout_log_id | uuid | YES | References workout_logs |
| pr_type | text | YES | 1RM/volume/etc |
| value | numeric | NO | PR value |
| achieved_at | timestamptz | NO | When achieved |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_pr_history_user_id` (user_id)
- `idx_pr_history_exercise_id` (exercise_id)
- `idx_pr_history_user_exercise` (user_id, exercise_id, achieved_at DESC)
- `idx_pr_history_achieved_at` (achieved_at DESC)

**Foreign Keys**:
- `exercise_id` → `exercises(id)` ON DELETE CASCADE
- `workout_log_id` → `workout_logs(id)` ON DELETE SET NULL

---

#### `nutrition_logs`
**Purpose**: Nutrition tracking  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| log_date | date | NO | Date logged |
| meal_type | text | YES | Breakfast/lunch/dinner |
| calories | integer | YES | Calories |
| protein_grams | numeric | YES | Protein |
| carbs_grams | numeric | YES | Carbs |
| fat_grams | numeric | YES | Fat |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_nutrition_logs_user_date` (user_id, log_date)

---

#### `injury_logs`
**Purpose**: Injury tracking  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| body_part | text | YES | Affected area |
| severity | text | YES | Minor/moderate/severe |
| occurred_at | timestamptz | YES | Injury date |
| resolved_at | timestamptz | YES | Recovery date |
| notes | text | YES | Injury notes |
| created_at | timestamptz | YES | Created timestamp |

---

#### `daily_summaries`
**Purpose**: Daily aggregated metrics  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `user_id, date`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| date | date | NO | Summary date |
| total_volume | numeric | YES | Total training volume |
| total_calories | integer | YES | Calories burned |
| recovery_score | numeric | YES | Recovery score |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_daily_summaries_user_date` (user_id, date DESC)
- `idx_daily_summaries_recovery` (recovery_score) WHERE recovery_score IS NOT NULL

---

#### `health_snapshots`
**Purpose**: Comprehensive daily health snapshots  
**Primary Key**: `id` (uuid)  
**Unique Constraint**: `user_id, date`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| date | date | NO | Snapshot date |
| snapshot_data | jsonb | YES | All health data |
| data_completeness_score | numeric | YES | 0-1 completeness |
| generated_at | timestamptz | YES | Generation timestamp |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_health_snapshots_user_date` (user_id, date DESC)
- `idx_health_snapshots_completeness` (data_completeness_score DESC)
- `idx_health_snapshots_generated` (generated_at DESC)

---

#### `program_adherence_flags`
**Purpose**: Track program adherence issues  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| muscle_group | text | YES | Affected muscle |
| flag_type | text | YES | Issue type |
| status | text | YES | active/resolved |
| flagged_date | date | YES | When flagged |
| resolved_date | date | YES | When resolved |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_adherence_flags_user_status` (user_id, status)
- `idx_adherence_flags_muscle` (muscle_group, status)
- `idx_adherence_flags_flagged_date` (flagged_date DESC)

---

#### `adherence_check_in_responses`
**Purpose**: User responses to adherence check-ins  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| flag_id | uuid | NO | References program_adherence_flags |
| response | text | YES | User response |
| responded_at | timestamptz | YES | Response timestamp |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_check_in_responses_user` (user_id)
- `idx_check_in_responses_flag` (flag_id)

**Foreign Keys**:
- `flag_id` → `program_adherence_flags(id)` ON DELETE CASCADE

---

#### `volume_adjustment_plans`
**Purpose**: Volume adjustment recommendations  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| muscle_group | text | YES | Target muscle |
| adjustment_type | text | YES | Increase/decrease/maintain |
| start_date | date | YES | Plan start |
| end_date | date | YES | Plan end |
| status | text | YES | active/completed |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_volume_adjustments_user_status` (user_id, status)
- `idx_volume_adjustments_muscle` (muscle_group)
- `idx_volume_adjustments_dates` (start_date, end_date)

---

#### `warmup_templates`
**Purpose**: Warmup routine templates  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| workout_type | text | YES | Workout category |
| template_data | jsonb | YES | Warmup exercises |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_warmup_templates_workout_type` (workout_type)

---

#### `cooldown_templates`
**Purpose**: Cooldown routine templates  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| workout_type | text | YES | Workout category |
| template_data | jsonb | YES | Cooldown exercises |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_cooldown_templates_workout_type` (workout_type)

---

#### `user_workouts`
**Purpose**: User-created custom workouts  
**Primary Key**: `id` (uuid)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | uuid | NO | Primary key |
| user_id | uuid | NO | References auth.users |
| workout_name | text | YES | Workout name |
| workout_data | jsonb | YES | Workout structure |
| workout_date | date | YES | When performed |
| created_at | timestamptz | YES | Created timestamp |

**Indexes**:
- `idx_user_workouts_user_id` (user_id)
- `idx_user_workouts_workout_date` (workout_date DESC)
- `idx_user_workouts_data` (GIN on workout_data)

---

## Database Functions

### Authentication Functions (auth schema)

- `auth.uid()` - Get current user ID from JWT
- `auth.email()` - Get current user email from JWT
- `auth.role()` - Get current user role from JWT
- `auth.jwt()` - Get full JWT claims

### Vector Functions (extensions schema)

- `extensions.cosine_distance(vector, vector)` - Calculate cosine distance
- `extensions.array_to_vector(array, dimension, normalize)` - Convert array to vector
- `extensions.binary_quantize(vector)` - Quantize vector to binary

### Storage Functions (storage schema)

- `storage.search()` - Search objects in storage buckets
- `storage.get_size_by_bucket()` - Get total size per bucket
- `storage.extension(name)` - Extract file extension
- `storage.filename(name)` - Extract filename

### Realtime Functions (realtime schema)

- `realtime.send(payload, event, topic, private)` - Send realtime message
- `realtime.list_changes()` - List database changes for subscriptions

---

## Foreign Key Relationships

**Total**: 15 foreign key constraints

1. `adherence_check_in_responses.flag_id` → `program_adherence_flags.id` (CASCADE)
2. `exercise_cues.exercise_id` → `exercises.id` (CASCADE)
3. `exercise_media.exercise_id` → `exercises.id` (CASCADE)
4. `exercise_muscles.exercise_id` → `exercises.id` (CASCADE)
5. `exercises.parent_exercise_id` → `exercises.id` (SET NULL)
6. `generated_programs.user_profile_id` → `user_profiles.id` (CASCADE)
7. `pr_history.exercise_id` → `exercises.id` (CASCADE)
8. `pr_history.workout_log_id` → `workout_logs.id` (SET NULL)
9. `program_exercises.exercise_id` → `exercises.id` (CASCADE)
10. `program_exercises.program_week_id` → `program_weeks.id` (CASCADE)
11. `program_weeks.program_id` → `generated_programs.id` (CASCADE)
12. `wod_logs.wod_id` → `crossfit_wods.id` (SET NULL)
13. `workout_logs.exercise_id` → `exercises.id` (CASCADE)
14. `workout_logs.program_exercise_id` → `program_exercises.id` (SET NULL)
15. `workout_logs.workout_id` → `workouts.id` (CASCADE)

---

## Vector Embeddings

**3 tables use pgvector for AI/ML**:

1. **`exercises.embedding`** (vector(1536))
   - Upstash Vector embeddings
   - Used for exercise name matching from voice input
   - IVFFlat index with 100 lists

2. **`exercise_cues.embedding`** (vector(1536))
   - Upstash Vector embeddings
   - Used for RAG retrieval of coaching cues
   - IVFFlat index with 100 lists

3. **`knowledge_base.embedding`** (vector(1536))
   - Upstash Vector embeddings
   - Used for RAG retrieval of fitness knowledge
   - IVFFlat index with 100 lists

---

## Performance Optimizations

### Indexes Summary

- **200+ total indexes** across all tables
- **Composite indexes** for common query patterns (user_id + date)
- **Partial indexes** for filtered queries (WHERE is_active = true)
- **GIN indexes** for JSONB and array columns
- **IVFFlat indexes** for vector similarity search
- **Full-text search** indexes on exercises

### Common Index Patterns

1. **User + Date**: `(user_id, date DESC)` - Fast user timeline queries
2. **User + Timestamp**: `(user_id, created_at DESC)` - Recent activity
3. **Filtered Booleans**: `WHERE is_active = true` - Active records only
4. **JSONB**: GIN indexes on metadata columns
5. **Arrays**: GIN indexes on tags, synonyms

---

## Row Level Security (RLS)

**Note**: RLS policies are not included in this report. Contact the VoiceFit team for RLS policy documentation.

---

## Supabase Edge Functions

**11 Edge Functions** (Deno-based serverless):

1. `whoop-oauth-callback`
2. `terra-oauth-callback`
3. `stryd-oauth-callback`
4. `whoop-webhook`
5. `terra-webhook`
6. `stryd-webhook`
7. `generate-program`
8. `analyze-health-data`
9. `parse-voice-command`
10. `match-exercise`
11. `rag-query`

---

## Database Migrations

**15 migration files** in `supabase/migrations/`:

- Initial schema setup
- Exercise library with embeddings
- Voice command tracking
- Program generation
- Health metrics
- Wearable integrations
- Coach-client relationships
- CrossFit WODs
- RAG knowledge base

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Public Tables** | 41 |
| **Total Indexes** | 200+ |
| **Foreign Keys** | 15 |
| **Vector Columns** | 3 |
| **JSONB Columns** | 20+ |
| **Unique Constraints** | 15 |
| **Database Functions** | 100+ |
| **Edge Functions** | 11 |
| **Migrations** | 15 |

---

## Contact

For questions about this schema or access to the Supabase project:
- **Project ID**: szragdskusayriycfhrs
- **Region**: us-east-1
- **Contact**: VoiceFit Development Team

