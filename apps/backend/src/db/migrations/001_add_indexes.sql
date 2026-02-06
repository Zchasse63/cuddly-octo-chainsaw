-- VoiceFit Database Indexes Migration
-- Add indexes for frequently queried columns to improve query performance
-- Run with: psql $DATABASE_URL -f 001_add_indexes.sql

-- Helper function to safely create index (skips if table/column doesn't exist)
CREATE OR REPLACE FUNCTION safe_create_index(
    p_index_name TEXT,
    p_index_def TEXT
) RETURNS TEXT AS $$
BEGIN
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s', p_index_name, p_index_def);
    RETURN 'created: ' || p_index_name;
EXCEPTION WHEN OTHERS THEN
    -- Silently skip if table or column doesn't exist
    RETURN 'skipped: ' || p_index_name || ' (' || SQLERRM || ')';
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- HIGH PRIORITY INDEXES (Most frequently queried)
-- ==================================================

-- Workouts: Most queries filter by user_id
SELECT safe_create_index('idx_workouts_user_id', 'workouts(user_id)');
SELECT safe_create_index('idx_workouts_user_status', 'workouts(user_id, status)');
SELECT safe_create_index('idx_workouts_user_started_at', 'workouts(user_id, started_at DESC)');

-- Workout Sets: Queried by workout and user
SELECT safe_create_index('idx_workout_sets_workout_id', 'workout_sets(workout_id)');
SELECT safe_create_index('idx_workout_sets_user_id', 'workout_sets(user_id)');
SELECT safe_create_index('idx_workout_sets_exercise_id', 'workout_sets(exercise_id)');

-- Personal Records: User + exercise lookups
SELECT safe_create_index('idx_personal_records_user_id', 'personal_records(user_id)');
SELECT safe_create_index('idx_personal_records_user_exercise', 'personal_records(user_id, exercise_id)');

-- Conversations: User's conversations with message retrieval
SELECT safe_create_index('idx_conversations_user_id', 'conversations(user_id)');
SELECT safe_create_index('idx_conversations_user_updated_at', 'conversations(user_id, updated_at DESC)');

-- Messages: By conversation with time ordering
SELECT safe_create_index('idx_messages_conversation_id', 'messages(conversation_id)');
SELECT safe_create_index('idx_messages_conversation_created_at', 'messages(conversation_id, created_at DESC)');

-- ==================================================
-- ANALYTICS INDEXES (Date range queries)
-- ==================================================

-- Daily workout analytics
SELECT safe_create_index('idx_daily_workout_analytics_user_date', 'daily_workout_analytics(user_id, date DESC)');

-- Weekly analytics
SELECT safe_create_index('idx_weekly_analytics_user_week', 'weekly_analytics(user_id, week_start DESC)');

-- Exercise analytics
SELECT safe_create_index('idx_exercise_analytics_user_id', 'exercise_analytics(user_id)');
SELECT safe_create_index('idx_exercise_analytics_user_exercise', 'exercise_analytics(user_id, exercise_id)');

-- Training load
SELECT safe_create_index('idx_training_load_user_date', 'training_load(user_id, date DESC)');

-- Readiness scores
SELECT safe_create_index('idx_readiness_scores_user_date', 'readiness_scores(user_id, date DESC)');

-- ==================================================
-- RUNNING & CARDIO INDEXES
-- ==================================================

SELECT safe_create_index('idx_running_activities_user_id', 'running_activities(user_id)');
SELECT safe_create_index('idx_running_activities_user_started_at', 'running_activities(user_id, started_at DESC)');
SELECT safe_create_index('idx_running_prs_user_id', 'running_prs(user_id)');
SELECT safe_create_index('idx_running_programs_user_id', 'running_programs(user_id)');

-- ==================================================
-- PROGRAM & CALENDAR INDEXES
-- ==================================================

SELECT safe_create_index('idx_training_programs_user_id', 'training_programs(user_id)');
SELECT safe_create_index('idx_training_programs_user_status', 'training_programs(user_id, status)');
SELECT safe_create_index('idx_program_weeks_program_id', 'program_weeks(program_id)');
SELECT safe_create_index('idx_program_days_week_id', 'program_days(week_id)');
SELECT safe_create_index('idx_program_exercises_day_id', 'program_exercises(program_day_id)');
SELECT safe_create_index('idx_training_calendar_user_date', 'training_calendar(user_id, scheduled_date DESC)');

-- ==================================================
-- SOCIAL FEATURE INDEXES
-- ==================================================

SELECT safe_create_index('idx_friendships_user_status', 'friendships(user_id, status)');
SELECT safe_create_index('idx_friendships_friend_id', 'friendships(friend_id)');
SELECT safe_create_index('idx_activity_feed_user_created_at', 'activity_feed(user_id, created_at DESC)');
SELECT safe_create_index('idx_activity_likes_activity_id', 'activity_likes(activity_id)');
SELECT safe_create_index('idx_activity_comments_activity_id', 'activity_comments(activity_id)');
SELECT safe_create_index('idx_challenges_creator_id', 'challenges(creator_id)');
SELECT safe_create_index('idx_challenge_participants_user_id', 'challenge_participants(user_id)');
SELECT safe_create_index('idx_challenge_participants_challenge_status', 'challenge_participants(challenge_id, status)');

-- ==================================================
-- GAMIFICATION INDEXES
-- ==================================================

SELECT safe_create_index('idx_user_streaks_user_type', 'user_streaks(user_id, streak_type)');
SELECT safe_create_index('idx_user_badges_user_id', 'user_badges(user_id)');
SELECT safe_create_index('idx_user_badges_user_earned_at', 'user_badges(user_id, earned_at DESC)');

-- ==================================================
-- COACH FEATURE INDEXES
-- ==================================================

SELECT safe_create_index('idx_coach_clients_coach_id', 'coach_clients(coach_id)');
SELECT safe_create_index('idx_coach_clients_client_id', 'coach_clients(client_id)');
SELECT safe_create_index('idx_coach_clients_status', 'coach_clients(status)');
SELECT safe_create_index('idx_coach_notes_coach_client', 'coach_notes(coach_id, client_id)');

-- ==================================================
-- HEALTH & WEARABLES INDEXES
-- ==================================================

SELECT safe_create_index('idx_daily_health_metrics_user_date', 'daily_health_metrics(user_id, date DESC)');
SELECT safe_create_index('idx_sleep_sessions_user_date', 'sleep_sessions(user_id, date DESC)');
SELECT safe_create_index('idx_heart_rate_samples_user_timestamp', 'heart_rate_samples(user_id, timestamp DESC)');
SELECT safe_create_index('idx_wearable_workouts_user_id', 'wearable_workouts(user_id)');

-- ==================================================
-- NUTRITION INDEXES
-- ==================================================

SELECT safe_create_index('idx_nutrition_summaries_user_date', 'nutrition_summaries(user_id, date DESC)');
SELECT safe_create_index('idx_body_measurements_user_date', 'body_measurements(user_id, date DESC)');

-- ==================================================
-- GENERAL UTILITY INDEXES
-- ==================================================

-- Exercises: Search and filter
SELECT safe_create_index('idx_exercises_name', 'exercises(name)');
SELECT safe_create_index('idx_exercises_primary_muscle', 'exercises(primary_muscle)');

-- Injuries
SELECT safe_create_index('idx_injuries_user_id', 'injuries(user_id)');
SELECT safe_create_index('idx_injuries_user_status', 'injuries(user_id, status)');

-- Notifications
SELECT safe_create_index('idx_notifications_user_id', 'notifications(user_id)');
SELECT safe_create_index('idx_notifications_user_read', 'notifications(user_id, is_read)');

-- User profiles (1-to-1 with users)
SELECT safe_create_index('idx_user_profiles_user_id', 'user_profiles(user_id)');

-- PR history
SELECT safe_create_index('idx_pr_history_user_id', 'pr_history(user_id)');
SELECT safe_create_index('idx_pr_history_user_exercise', 'pr_history(user_id, exercise_id)');

-- Running shoes
SELECT safe_create_index('idx_running_shoes_user_id', 'running_shoes(user_id)');
SELECT safe_create_index('idx_running_shoes_user_active', 'running_shoes(user_id, is_active)');

-- ==================================================
-- CLEANUP & VERIFICATION
-- ==================================================

-- Clean up helper function
DROP FUNCTION IF EXISTS safe_create_index(TEXT, TEXT);

-- Show results: which indexes were created
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
