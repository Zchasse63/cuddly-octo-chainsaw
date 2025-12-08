-- VoiceFit 2.0 Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- ============================================
-- ENUMS
-- ============================================

-- User enums
CREATE TYPE experience_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE tier AS ENUM ('free', 'premium', 'coach');
CREATE TYPE theme AS ENUM ('light', 'dark', 'auto');

-- Exercise enums
CREATE TYPE muscle_group AS ENUM (
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
  'lower_back', 'traps', 'lats', 'full_body'
);

CREATE TYPE movement_pattern AS ENUM (
  'push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'rotation', 'isolation'
);

CREATE TYPE equipment_type AS ENUM (
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine',
  'bodyweight', 'bands', 'smith_machine', 'ez_bar', 'trap_bar'
);

-- Workout enums
CREATE TYPE workout_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE logging_method AS ENUM ('voice', 'manual', 'quick_log');

-- ============================================
-- TABLES
-- ============================================

-- Users (minimal - Supabase Auth handles authentication)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User Profiles (extended user data)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL UNIQUE,

  -- Basic info
  name TEXT,
  avatar_url TEXT,

  -- Experience and goals
  experience_level experience_level DEFAULT 'beginner',
  goals TEXT[],

  -- Training preferences
  training_frequency TEXT,
  preferred_equipment TEXT[],
  favorite_exercises TEXT[],
  exercises_to_avoid TEXT[],

  -- Health
  injuries TEXT,

  -- App settings
  tier tier DEFAULT 'free',
  theme theme DEFAULT 'auto',
  preferred_weight_unit TEXT DEFAULT 'lbs',
  notifications_enabled BOOLEAN DEFAULT true,

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Exercises (exercise library)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,

  -- Classification
  primary_muscle muscle_group NOT NULL,
  secondary_muscles TEXT[],
  movement_pattern movement_pattern,
  equipment equipment_type[],

  -- Metadata
  difficulty TEXT,
  is_compound BOOLEAN DEFAULT false,
  is_unilateral BOOLEAN DEFAULT false,

  -- Search optimization (Upstash Search integration)
  synonyms TEXT[],
  normalized_name TEXT,
  phonetic_key TEXT,
  base_movement TEXT,

  -- Exercise progressions
  parent_exercise_id UUID,
  progression_order INTEGER,

  -- Upstash sync status
  upstash_indexed BOOLEAN DEFAULT false,

  -- System
  is_custom BOOLEAN DEFAULT false,
  created_by_user_id UUID,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Self-referential foreign key for progressions
ALTER TABLE exercises ADD CONSTRAINT fk_parent_exercise
  FOREIGN KEY (parent_exercise_id) REFERENCES exercises(id);

-- Workouts (workout sessions)
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,

  -- Workout info
  name TEXT,
  notes TEXT,
  status workout_status DEFAULT 'active',

  -- Timing
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP,
  duration INTEGER,

  -- Program reference
  program_id UUID,
  program_week INTEGER,
  program_day INTEGER,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Workout Sets (individual sets logged)
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,

  -- Set data
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight REAL,
  weight_unit TEXT DEFAULT 'lbs',
  rpe REAL,

  -- Voice parsing metadata
  logging_method logging_method DEFAULT 'manual',
  voice_transcript TEXT,
  confidence REAL,

  -- PR tracking
  is_pr BOOLEAN DEFAULT false,
  estimated_1rm REAL,

  -- Rest timer
  rest_duration INTEGER,

  -- Sync
  synced_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Personal Records
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  exercise_id UUID REFERENCES exercises(id) NOT NULL,

  -- PR data
  weight REAL NOT NULL,
  weight_unit TEXT DEFAULT 'lbs',
  reps INTEGER NOT NULL,
  estimated_1rm REAL,

  -- Reference
  workout_set_id UUID REFERENCES workout_sets(id),
  achieved_at TIMESTAMP DEFAULT NOW() NOT NULL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Readiness Scores (daily check-ins)
CREATE TABLE readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,

  -- Simple score
  overall_score INTEGER,

  -- Detailed scores (1-10)
  sleep_quality INTEGER,
  energy_level INTEGER,
  motivation INTEGER,
  soreness INTEGER,
  stress INTEGER,

  -- Notes
  notes TEXT,

  -- Wearable data
  hrv_score REAL,
  resting_hr REAL,
  sleep_hours REAL,

  -- Date (one per day)
  date TIMESTAMP NOT NULL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- PHASE 1: NEW TABLES (Upstash Search Integration)
-- ============================================

-- User Onboarding (tracks onboarding progress)
CREATE TABLE user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_step TEXT DEFAULT 'welcome',
  steps_completed TEXT[] DEFAULT '{}',
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User Streaks (gamification)
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  streak_type TEXT NOT NULL, -- 'workout', 'logging', 'running'
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, streak_type)
);

-- Badge Definitions (reference table)
CREATE TABLE badge_definitions (
  id TEXT PRIMARY KEY, -- 'first_workout', 'bench_200', etc.
  name TEXT NOT NULL,
  description TEXT,
  badge_type TEXT NOT NULL, -- 'strength', 'running', 'streak', 'milestone'
  icon_url TEXT,
  criteria JSONB,
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User Badges (earned badges)
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT REFERENCES badge_definitions(id) NOT NULL,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  metadata JSONB,
  UNIQUE(user_id, badge_id)
);

-- Exercise Muscles (many-to-many with activation levels)
CREATE TABLE exercise_muscles (
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  muscle_group TEXT NOT NULL,
  activation_level TEXT DEFAULT 'primary', -- 'primary', 'secondary', 'stabilizer'
  UNIQUE(exercise_id, muscle_group)
);

-- Exercise Cues (coaching cues, indexed in Upstash Search)
CREATE TABLE exercise_cues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  cue_text TEXT NOT NULL,
  cue_type TEXT NOT NULL, -- 'setup', 'execution', 'breathing', 'common_mistake'
  upstash_indexed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Exercise Media (videos, images)
CREATE TABLE exercise_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL, -- 'video', 'image', 'gif'
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Exercise Substitutions
CREATE TABLE exercise_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  substitute_exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  reason TEXT, -- 'injury', 'equipment', 'difficulty'
  affected_body_part TEXT,
  similarity_score REAL DEFAULT 0.8,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Exercise Body Part Stress (for injury-aware substitutions)
CREATE TABLE exercise_body_part_stress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  body_part TEXT NOT NULL,
  stress_level TEXT NOT NULL, -- 'low', 'medium', 'high'
  UNIQUE(exercise_id, body_part)
);

-- Voice Commands (voice input history and fine-tuning data)
CREATE TABLE voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  workout_set_id UUID REFERENCES workout_sets(id) ON DELETE SET NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,

  -- Voice input
  raw_transcript TEXT NOT NULL,
  audio_url TEXT,

  -- Parsing results
  parsed_output JSONB,
  confidence REAL,
  model_used TEXT, -- 'grok-2', 'fine-tuned-v1'

  -- Search results from Upstash
  search_results JSONB,
  search_latency_ms INTEGER,

  -- Correction tracking (for fine-tuning)
  was_corrected BOOLEAN DEFAULT false,
  corrected_output JSONB,
  correction_type TEXT, -- 'exercise', 'reps', 'weight', 'full'

  -- Performance
  latency_ms INTEGER,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Fine-tuned Models (tracking model versions)
CREATE TABLE fine_tuned_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT UNIQUE NOT NULL, -- provider model ID
  model_type TEXT NOT NULL, -- 'voice_parser', 'exercise_matcher'
  base_model TEXT NOT NULL,
  training_data_count INTEGER,
  accuracy_score REAL,
  is_active BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- null = global model
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Knowledge Base (RAG content, indexed in Upstash Search)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id TEXT UNIQUE NOT NULL,
  chunk_type TEXT NOT NULL, -- 'exercise_guide', 'nutrition', 'recovery', 'program'
  category TEXT,
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT[],
  metadata JSONB,
  source TEXT, -- 'internal', 'article_url'
  upstash_indexed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Conversations (AI coach chat history)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  conversation_type TEXT NOT NULL, -- 'coach', 'workout', 'general'
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  title TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Messages (individual chat messages)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- PR History (detailed PR tracking with types)
CREATE TABLE pr_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  workout_set_id UUID REFERENCES workout_sets(id) ON DELETE SET NULL,

  -- PR details
  pr_type TEXT NOT NULL, -- '1rm', '3rm', '5rm', 'volume', 'reps_at_weight'
  value REAL NOT NULL,
  weight REAL,
  reps INTEGER,
  volume REAL,

  -- Comparison
  previous_pr_id UUID REFERENCES pr_history(id),
  improvement_percent REAL,

  achieved_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- INDEXES (for performance)
-- ============================================

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_started_at ON workouts(started_at);
CREATE INDEX idx_workout_sets_workout_id ON workout_sets(workout_id);
CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX idx_workout_sets_user_id ON workout_sets(user_id);
CREATE INDEX idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE INDEX idx_readiness_scores_user_id ON readiness_scores(user_id);
CREATE INDEX idx_readiness_scores_date ON readiness_scores(date);
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_primary_muscle ON exercises(primary_muscle);
CREATE INDEX idx_exercises_normalized_name ON exercises(normalized_name);
CREATE INDEX idx_exercises_upstash_indexed ON exercises(upstash_indexed);

-- Phase 1 indexes
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_exercise_cues_exercise_id ON exercise_cues(exercise_id);
CREATE INDEX idx_exercise_media_exercise_id ON exercise_media(exercise_id);
CREATE INDEX idx_exercise_substitutions_original ON exercise_substitutions(original_exercise_id);
CREATE INDEX idx_exercise_substitutions_substitute ON exercise_substitutions(substitute_exercise_id);
CREATE INDEX idx_exercise_body_part_stress_exercise_id ON exercise_body_part_stress(exercise_id);
CREATE INDEX idx_voice_commands_user_id ON voice_commands(user_id);
CREATE INDEX idx_voice_commands_workout_id ON voice_commands(workout_id);
CREATE INDEX idx_knowledge_base_chunk_type ON knowledge_base(chunk_type);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_knowledge_base_upstash_indexed ON knowledge_base(upstash_indexed);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_pr_history_user_id ON pr_history(user_id);
CREATE INDEX idx_pr_history_exercise_id ON pr_history(exercise_id);
CREATE INDEX idx_pr_history_achieved_at ON pr_history(achieved_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_scores ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own workouts" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts" ON workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workouts" ON workouts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sets" ON workout_sets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sets" ON workout_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sets" ON workout_sets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sets" ON workout_sets
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own PRs" ON personal_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own PRs" ON personal_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own readiness" ON readiness_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own readiness" ON readiness_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own readiness" ON readiness_scores
  FOR UPDATE USING (auth.uid() = user_id);

-- Exercises are public read, but only custom exercises can be modified by creator
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exercises are viewable by everyone" ON exercises
  FOR SELECT USING (true);

CREATE POLICY "Users can insert custom exercises" ON exercises
  FOR INSERT WITH CHECK (is_custom = true AND auth.uid() = created_by_user_id);

CREATE POLICY "Users can update own custom exercises" ON exercises
  FOR UPDATE USING (is_custom = true AND auth.uid() = created_by_user_id);

-- Phase 1 RLS Policies
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_cues ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_body_part_stress ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE fine_tuned_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_history ENABLE ROW LEVEL SECURITY;

-- User onboarding (users manage their own)
CREATE POLICY "Users can view own onboarding" ON user_onboarding
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding" ON user_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON user_onboarding
  FOR UPDATE USING (auth.uid() = user_id);

-- User streaks (users manage their own)
CREATE POLICY "Users can view own streaks" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- User badges (users can view their own)
CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Badge definitions (public read)
CREATE POLICY "Badge definitions are public" ON badge_definitions
  FOR SELECT USING (true);

-- Exercise-related tables (public read)
CREATE POLICY "Exercise muscles are public" ON exercise_muscles
  FOR SELECT USING (true);
CREATE POLICY "Exercise cues are public" ON exercise_cues
  FOR SELECT USING (true);
CREATE POLICY "Exercise media is public" ON exercise_media
  FOR SELECT USING (true);
CREATE POLICY "Exercise substitutions are public" ON exercise_substitutions
  FOR SELECT USING (true);
CREATE POLICY "Exercise body part stress is public" ON exercise_body_part_stress
  FOR SELECT USING (true);

-- Voice commands (users manage their own)
CREATE POLICY "Users can view own voice commands" ON voice_commands
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice commands" ON voice_commands
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice commands" ON voice_commands
  FOR UPDATE USING (auth.uid() = user_id);

-- Fine-tuned models (users can view global or their own)
CREATE POLICY "Users can view models" ON fine_tuned_models
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

-- Knowledge base (public read)
CREATE POLICY "Knowledge base is public" ON knowledge_base
  FOR SELECT USING (true);

-- Conversations (users manage their own)
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Messages (users manage messages in their conversations)
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );

-- PR history (users manage their own)
CREATE POLICY "Users can view own PR history" ON pr_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own PR history" ON pr_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_sets_updated_at
  BEFORE UPDATE ON workout_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_readiness_scores_updated_at
  BEFORE UPDATE ON readiness_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER: Create user profile on signup
-- ============================================

-- This function creates a user record, profile, and onboarding when someone signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id);

  INSERT INTO public.user_onboarding (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger on Supabase auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- PHASE 2: RUNNING & CARDIO
-- ============================================

CREATE TYPE run_type AS ENUM (
  'easy', 'tempo', 'interval', 'long_run', 'recovery', 'fartlek', 'hill', 'race'
);

-- Running activities
CREATE TABLE running_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  run_type run_type DEFAULT 'easy',
  name TEXT,
  notes TEXT,
  distance_meters REAL,
  duration_seconds INTEGER,
  avg_pace_seconds_per_km REAL,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  elevation_gain_meters REAL,
  calories_burned INTEGER,
  avg_cadence INTEGER,
  avg_stride_length REAL,
  splits JSONB,
  route_polyline TEXT,
  start_latitude REAL,
  start_longitude REAL,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  program_id UUID,
  program_week INTEGER,
  program_day INTEGER,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Running programs
CREATE TABLE running_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  target_race_date DATE,
  target_time INTEGER,
  duration_weeks INTEGER NOT NULL,
  current_week INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  template_id UUID,
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Running program workouts
CREATE TABLE running_program_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES running_programs(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  run_type run_type NOT NULL,
  name TEXT,
  description TEXT,
  target_distance_meters REAL,
  target_duration_seconds INTEGER,
  target_pace_min REAL,
  target_pace_max REAL,
  target_heart_rate_zone TEXT,
  intervals JSONB,
  is_completed BOOLEAN DEFAULT false,
  completed_activity_id UUID REFERENCES running_activities(id) ON DELETE SET NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Running PRs
CREATE TABLE running_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES running_activities(id) ON DELETE SET NULL,
  pr_type TEXT NOT NULL,
  time_seconds INTEGER,
  distance_meters REAL,
  previous_pr_id UUID,
  improvement_seconds INTEGER,
  improvement_percent REAL,
  achieved_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Heart rate zones
CREATE TABLE heart_rate_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  max_heart_rate INTEGER NOT NULL,
  resting_heart_rate INTEGER,
  zone1_min INTEGER DEFAULT 50,
  zone1_max INTEGER DEFAULT 60,
  zone2_min INTEGER DEFAULT 60,
  zone2_max INTEGER DEFAULT 70,
  zone3_min INTEGER DEFAULT 70,
  zone3_max INTEGER DEFAULT 80,
  zone4_min INTEGER DEFAULT 80,
  zone4_max INTEGER DEFAULT 90,
  zone5_min INTEGER DEFAULT 90,
  zone5_max INTEGER DEFAULT 100,
  source TEXT DEFAULT 'calculated',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Running shoes
CREATE TABLE running_shoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Shoe details
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  nickname TEXT,
  color TEXT,
  size TEXT,

  -- Purchase info
  purchase_date TIMESTAMP,
  purchase_price REAL,
  purchase_location TEXT,

  -- Mileage tracking
  initial_mileage REAL DEFAULT 0,
  total_mileage_meters REAL DEFAULT 0,
  replacement_threshold_meters REAL DEFAULT 643738, -- 400 miles in meters

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  retired_at TIMESTAMP,
  retired_reason TEXT,

  -- Notes
  notes TEXT,

  -- Activity count
  total_runs INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Running activity shoes (link table)
CREATE TABLE running_activity_shoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES running_activities(id) ON DELETE CASCADE NOT NULL,
  shoe_id UUID REFERENCES running_shoes(id) ON DELETE CASCADE NOT NULL,
  distance_meters REAL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_running_shoes_user_id ON running_shoes(user_id);
CREATE INDEX idx_running_shoes_is_active ON running_shoes(is_active);
CREATE INDEX idx_running_activity_shoes_activity_id ON running_activity_shoes(activity_id);
CREATE INDEX idx_running_activity_shoes_shoe_id ON running_activity_shoes(shoe_id);

-- RLS
ALTER TABLE running_shoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_activity_shoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shoes"
  ON running_shoes FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own activity shoes"
  ON running_activity_shoes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM running_activities
    WHERE id = running_activity_shoes.activity_id AND user_id = auth.uid()
  ));

-- Triggers
CREATE TRIGGER update_running_shoes_updated_at
  BEFORE UPDATE ON running_shoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 3: NUTRITION (Apple Health + Terra)
-- ============================================

-- Nutrition summaries (synced from health sources)
CREATE TABLE nutrition_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  calories INTEGER,
  protein REAL,
  carbohydrates REAL,
  fat REAL,
  fiber REAL,
  sugar REAL,
  sodium REAL,
  potassium REAL,
  calcium REAL,
  iron REAL,
  vitamin_a REAL,
  vitamin_c REAL,
  vitamin_d REAL,
  water_ml INTEGER,
  caffeine_mg INTEGER,
  source TEXT NOT NULL,
  last_synced_at TIMESTAMP,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Nutrition goals
CREATE TABLE nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT NOT NULL,
  target_calories INTEGER,
  target_protein REAL,
  target_carbohydrates REAL,
  target_fat REAL,
  target_fiber REAL,
  target_water_ml INTEGER,
  calculation_method TEXT,
  tdee_estimate INTEGER,
  activity_multiplier REAL,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Body measurements
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight_kg REAL,
  body_fat_percent REAL,
  muscle_mass_kg REAL,
  bone_mass_kg REAL,
  water_percent REAL,
  visceral_fat INTEGER,
  metabolic_age INTEGER,
  bmr INTEGER,
  waist_cm REAL,
  hips_cm REAL,
  chest_cm REAL,
  arm_cm REAL,
  thigh_cm REAL,
  source TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Terra API connections
CREATE TABLE terra_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  terra_user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_status TEXT,
  last_error TEXT,
  scopes TEXT[],
  webhook_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- PHASE 4: SOCIAL FEATURES
-- ============================================

-- Friendships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  initiated_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- Activity feed
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  reference_id UUID,
  reference_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  visibility TEXT DEFAULT 'friends',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Activity likes
CREATE TABLE activity_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activity_feed(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(activity_id, user_id)
);

-- Activity comments
CREATE TABLE activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activity_feed(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Challenges
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  target_unit TEXT,
  exercise_id UUID,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  visibility TEXT DEFAULT 'friends',
  max_participants INTEGER,
  status TEXT DEFAULT 'upcoming',
  prize TEXT,
  badge_id TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Challenge participants
CREATE TABLE challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  current_value INTEGER DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  rank INTEGER,
  status TEXT DEFAULT 'active',
  completed_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(challenge_id, user_id)
);

-- Shared workouts
CREATE TABLE shared_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  shared_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  share_type TEXT NOT NULL,
  visibility TEXT DEFAULT 'friends',
  share_link TEXT UNIQUE,
  view_count INTEGER DEFAULT 0,
  copy_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  reference_id UUID,
  reference_type TEXT,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  action_url TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- PHASE 5: ANALYTICS & INSIGHTS
-- ============================================

-- Daily workout analytics
CREATE TABLE daily_workout_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  workout_count INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  total_volume REAL DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  total_reps INTEGER DEFAULT 0,
  muscle_group_breakdown JSONB,
  exercise_count INTEGER DEFAULT 0,
  unique_exercises INTEGER DEFAULT 0,
  pr_count INTEGER DEFAULT 0,
  cardio_minutes INTEGER DEFAULT 0,
  calories_burned INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Weekly analytics
CREATE TABLE weekly_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  workout_count INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  avg_workout_duration REAL,
  total_volume REAL DEFAULT 0,
  volume_change REAL,
  training_days INTEGER DEFAULT 0,
  muscle_balance_score INTEGER,
  muscle_group_breakdown JSONB,
  pr_count INTEGER DEFAULT 0,
  estimated_weekly_tss REAL,
  planned_vs_completed REAL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Exercise analytics
CREATE TABLE exercise_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  total_sets INTEGER DEFAULT 0,
  total_reps INTEGER DEFAULT 0,
  total_volume REAL DEFAULT 0,
  times_performed INTEGER DEFAULT 0,
  current_max_1rm REAL,
  current_max_weight REAL,
  current_max_reps INTEGER,
  current_max_volume REAL,
  avg_weight REAL,
  avg_reps REAL,
  avg_rpe REAL,
  weight_trend TEXT,
  volume_trend TEXT,
  last_30_days_volume REAL,
  last_30_days_sets INTEGER,
  recent_history JSONB,
  avg_days_between_sessions REAL,
  last_performed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Training load
CREATE TABLE training_load (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  daily_load REAL,
  rpe_load REAL,
  acute_load REAL,
  chronic_load REAL,
  acute_chronic_ratio REAL,
  strain_score REAL,
  recovery_score REAL,
  resting_hr INTEGER,
  hrv_score REAL,
  sleep_hours REAL,
  sleep_quality INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Body part volume
CREATE TABLE body_part_volume (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  chest_sets INTEGER DEFAULT 0,
  back_sets INTEGER DEFAULT 0,
  shoulder_sets INTEGER DEFAULT 0,
  bicep_sets INTEGER DEFAULT 0,
  tricep_sets INTEGER DEFAULT 0,
  quad_sets INTEGER DEFAULT 0,
  hamstring_sets INTEGER DEFAULT 0,
  glute_sets INTEGER DEFAULT 0,
  calf_sets INTEGER DEFAULT 0,
  ab_sets INTEGER DEFAULT 0,
  undertrained_groups TEXT[],
  overtrained_groups TEXT[],
  balance_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- AI insights
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  insight_type TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'normal',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  actionable TEXT,
  related_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  data_points JSONB,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_acted_on BOOLEAN DEFAULT false,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User goals
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value REAL,
  target_unit TEXT,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  current_value REAL,
  start_value REAL,
  progress_percent REAL DEFAULT 0,
  start_date DATE,
  target_date DATE,
  status TEXT DEFAULT 'active',
  completed_at TIMESTAMP,
  predicted_completion_date DATE,
  on_track BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- PHASE 7: WEARABLE INTEGRATION
-- ============================================

-- Apple Health connections
CREATE TABLE apple_health_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP,
  sync_status TEXT,
  last_error TEXT,
  permissions JSONB,
  sync_workouts BOOLEAN DEFAULT true,
  sync_nutrition BOOLEAN DEFAULT true,
  sync_sleep BOOLEAN DEFAULT true,
  sync_heart_rate BOOLEAN DEFAULT true,
  sync_steps BOOLEAN DEFAULT true,
  sync_body_measurements BOOLEAN DEFAULT true,
  device_model TEXT,
  watch_model TEXT,
  os_version TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Daily health metrics
CREATE TABLE daily_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  steps INTEGER,
  active_minutes INTEGER,
  active_calories INTEGER,
  total_calories INTEGER,
  distance_meters REAL,
  floors_climbed INTEGER,
  resting_heart_rate INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  min_heart_rate INTEGER,
  heart_rate_variability REAL,
  respiratory_rate REAL,
  oxygen_saturation REAL,
  sleep_hours REAL,
  sleep_quality_score INTEGER,
  stress_level INTEGER,
  recovery_score INTEGER,
  body_battery INTEGER,
  menstrual_phase TEXT,
  source TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Sleep sessions
CREATE TABLE sleep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  date DATE NOT NULL,
  total_minutes INTEGER,
  time_in_bed INTEGER,
  time_to_fall_asleep INTEGER,
  awake_minutes INTEGER,
  rem_minutes INTEGER,
  light_minutes INTEGER,
  deep_minutes INTEGER,
  sleep_efficiency REAL,
  sleep_score INTEGER,
  awakenings INTEGER,
  avg_heart_rate INTEGER,
  min_heart_rate INTEGER,
  hrv_during_sleep REAL,
  avg_respiratory_rate REAL,
  oxygen_saturation_avg REAL,
  source TEXT NOT NULL,
  external_id TEXT,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Heart rate samples
CREATE TABLE heart_rate_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  heart_rate INTEGER NOT NULL,
  motion_context TEXT,
  source TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Wearable workouts
CREATE TABLE wearable_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  name TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER,
  active_calories INTEGER,
  total_calories INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  distance_meters REAL,
  route_polyline TEXT,
  elevation_gain REAL,
  raw_data JSONB,
  linked_workout_id UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Wearable sync queue
CREATE TABLE wearable_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT NOT NULL,
  data_types TEXT[],
  source TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error TEXT,
  from_date TIMESTAMP,
  to_date TIMESTAMP,
  records_processed INTEGER,
  records_failed INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- PHASE 8: SYNC & OFFLINE (PowerSync)
-- ============================================

-- Sync checkpoints
CREATE TABLE sync_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  bucket_name TEXT NOT NULL,
  last_synced_at TIMESTAMP,
  last_synced_op_id TEXT,
  sync_version INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'synced',
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  device_id TEXT,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Pending sync operations
CREATE TABLE pending_sync_ops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  op_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  local_data JSONB,
  server_data JSONB,
  merged_data JSONB,
  has_conflict BOOLEAN DEFAULT false,
  conflict_resolution TEXT,
  resolved_at TIMESTAMP,
  status TEXT DEFAULT 'pending',
  client_timestamp TIMESTAMP,
  server_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Sync audit log
CREATE TABLE sync_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  details JSONB,
  error_message TEXT,
  device_id TEXT,
  app_version TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Device registrations
CREATE TABLE device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_model TEXT,
  os_name TEXT,
  os_version TEXT,
  app_version TEXT,
  push_token TEXT,
  push_provider TEXT,
  push_enabled BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  last_active_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Offline queue
CREATE TABLE offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  payload JSONB NOT NULL,
  sequence_number INTEGER NOT NULL,
  client_timestamp TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMP,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- PHASE 2-8 INDEXES
-- ============================================

-- Running indexes
CREATE INDEX idx_running_activities_user_id ON running_activities(user_id);
CREATE INDEX idx_running_activities_started_at ON running_activities(started_at);
CREATE INDEX idx_running_programs_user_id ON running_programs(user_id);
CREATE INDEX idx_running_prs_user_id ON running_prs(user_id);

-- Nutrition indexes
CREATE INDEX idx_nutrition_summaries_user_id ON nutrition_summaries(user_id);
CREATE INDEX idx_nutrition_summaries_date ON nutrition_summaries(date);
CREATE INDEX idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX idx_terra_connections_user_id ON terra_connections(user_id);

-- Social indexes
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at);
CREATE INDEX idx_challenges_creator_id ON challenges(creator_id);
CREATE INDEX idx_challenge_participants_challenge_id ON challenge_participants(challenge_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Analytics indexes
CREATE INDEX idx_daily_workout_analytics_user_id ON daily_workout_analytics(user_id);
CREATE INDEX idx_daily_workout_analytics_date ON daily_workout_analytics(date);
CREATE INDEX idx_weekly_analytics_user_id ON weekly_analytics(user_id);
CREATE INDEX idx_exercise_analytics_user_id ON exercise_analytics(user_id);
CREATE INDEX idx_exercise_analytics_exercise_id ON exercise_analytics(exercise_id);
CREATE INDEX idx_training_load_user_id ON training_load(user_id);
CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);

-- Wearable indexes
CREATE INDEX idx_daily_health_metrics_user_id ON daily_health_metrics(user_id);
CREATE INDEX idx_daily_health_metrics_date ON daily_health_metrics(date);
CREATE INDEX idx_sleep_sessions_user_id ON sleep_sessions(user_id);
CREATE INDEX idx_heart_rate_samples_user_id ON heart_rate_samples(user_id);
CREATE INDEX idx_heart_rate_samples_timestamp ON heart_rate_samples(timestamp);
CREATE INDEX idx_wearable_workouts_user_id ON wearable_workouts(user_id);

-- Sync indexes
CREATE INDEX idx_sync_checkpoints_user_id ON sync_checkpoints(user_id);
CREATE INDEX idx_pending_sync_ops_user_id ON pending_sync_ops(user_id);
CREATE INDEX idx_device_registrations_user_id ON device_registrations(user_id);
CREATE INDEX idx_offline_queue_user_id ON offline_queue(user_id);
CREATE INDEX idx_offline_queue_status ON offline_queue(status);

-- ============================================
-- PHASE 2-8 RLS POLICIES
-- ============================================

-- Running tables
ALTER TABLE running_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_program_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_prs ENABLE ROW LEVEL SECURITY;
ALTER TABLE heart_rate_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own running activities" ON running_activities
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own running programs" ON running_programs
  FOR ALL USING (auth.uid() = user_id OR is_template = true);
CREATE POLICY "Users can view program workouts" ON running_program_workouts
  FOR SELECT USING (EXISTS (SELECT 1 FROM running_programs WHERE id = program_id AND (user_id = auth.uid() OR is_template = true)));
CREATE POLICY "Users can manage own running PRs" ON running_prs
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own HR zones" ON heart_rate_zones
  FOR ALL USING (auth.uid() = user_id);

-- Nutrition tables
ALTER TABLE nutrition_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE terra_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own nutrition" ON nutrition_summaries
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own nutrition goals" ON nutrition_goals
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own measurements" ON body_measurements
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own terra connections" ON terra_connections
  FOR ALL USING (auth.uid() = user_id);

-- Social tables
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own friendships" ON friendships
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can view friend activities" ON activity_feed
  FOR SELECT USING (visibility = 'public' OR user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM friendships WHERE status = 'accepted' AND
      ((user_id = auth.uid() AND friend_id = activity_feed.user_id) OR
       (friend_id = auth.uid() AND user_id = activity_feed.user_id))));
CREATE POLICY "Users can insert own activities" ON activity_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage likes" ON activity_likes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage comments" ON activity_comments
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view challenges" ON challenges
  FOR SELECT USING (visibility = 'public' OR creator_id = auth.uid() OR visibility = 'friends');
CREATE POLICY "Users can create challenges" ON challenges
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can manage challenge participation" ON challenge_participants
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage shared workouts" ON shared_workouts
  FOR ALL USING (auth.uid() = shared_by_user_id);
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Analytics tables
ALTER TABLE daily_workout_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_load ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_part_volume ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily analytics" ON daily_workout_analytics
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own weekly analytics" ON weekly_analytics
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own exercise analytics" ON exercise_analytics
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own training load" ON training_load
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own body part volume" ON body_part_volume
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own insights" ON ai_insights
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON user_goals
  FOR ALL USING (auth.uid() = user_id);

-- Wearable tables
ALTER TABLE apple_health_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE heart_rate_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own apple health" ON apple_health_connections
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own health metrics" ON daily_health_metrics
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sleep" ON sleep_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own HR samples" ON heart_rate_samples
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own wearable workouts" ON wearable_workouts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sync queue" ON wearable_sync_queue
  FOR ALL USING (auth.uid() = user_id);

-- Sync tables
ALTER TABLE sync_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_sync_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sync checkpoints" ON sync_checkpoints
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sync ops" ON pending_sync_ops
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own sync log" ON sync_audit_log
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own devices" ON device_registrations
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own offline queue" ON offline_queue
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- PHASE 2-8 TRIGGERS
-- ============================================

CREATE TRIGGER update_running_activities_updated_at
  BEFORE UPDATE ON running_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_running_programs_updated_at
  BEFORE UPDATE ON running_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_heart_rate_zones_updated_at
  BEFORE UPDATE ON heart_rate_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_summaries_updated_at
  BEFORE UPDATE ON nutrition_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_goals_updated_at
  BEFORE UPDATE ON nutrition_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terra_connections_updated_at
  BEFORE UPDATE ON terra_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_comments_updated_at
  BEFORE UPDATE ON activity_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenge_participants_updated_at
  BEFORE UPDATE ON challenge_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_workout_analytics_updated_at
  BEFORE UPDATE ON daily_workout_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_analytics_updated_at
  BEFORE UPDATE ON exercise_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apple_health_connections_updated_at
  BEFORE UPDATE ON apple_health_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_health_metrics_updated_at
  BEFORE UPDATE ON daily_health_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_checkpoints_updated_at
  BEFORE UPDATE ON sync_checkpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_registrations_updated_at
  BEFORE UPDATE ON device_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 6: CROSSFIT SUPPORT
-- ============================================

-- WOD type enum
CREATE TYPE wod_type AS ENUM (
  'amrap',
  'emom',
  'for_time',
  'chipper',
  'ladder',
  'tabata',
  'death_by',
  'custom'
);

-- CrossFit WOD library
CREATE TABLE crossfit_wods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE, -- 'Fran', 'Murph', etc.
  wod_type wod_type NOT NULL,
  description TEXT,

  -- Workout structure
  movements JSONB NOT NULL, -- [{ exercise, reps, weight, notes }]
  time_cap_minutes INTEGER,
  rounds INTEGER, -- for AMRAP
  interval_seconds INTEGER, -- for EMOM

  -- Metadata
  is_benchmark BOOLEAN DEFAULT false, -- "The Girls"
  is_hero_wod BOOLEAN DEFAULT false, -- Hero WODs
  difficulty_level TEXT, -- 'beginner', 'intermediate', 'advanced', 'elite'

  -- Standards
  rx_standards JSONB, -- { male: { weight: 135 }, female: { weight: 95 } }
  scaling_options JSONB, -- [{ name: 'scaled', modifications: [...] }]

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- WOD performance logs
CREATE TABLE wod_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  wod_id UUID REFERENCES crossfit_wods(id) ON DELETE SET NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,

  logged_at TIMESTAMP DEFAULT NOW() NOT NULL,

  -- Results (depends on wod_type)
  result_time_seconds INTEGER, -- for_time
  result_rounds INTEGER, -- AMRAP rounds
  result_reps INTEGER, -- AMRAP extra reps
  result_load JSONB, -- weights used { movement: weight }

  -- Scaling
  was_rx BOOLEAN DEFAULT false,
  scaling_notes TEXT,

  notes TEXT,

  -- Voice input
  raw_voice_input TEXT,
  voice_command_id UUID REFERENCES voice_commands(id),

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User benchmark tracking (best performances)
CREATE TABLE wod_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  wod_id UUID REFERENCES crossfit_wods(id) ON DELETE CASCADE NOT NULL,
  wod_log_id UUID REFERENCES wod_logs(id) ON DELETE SET NULL,

  -- Best results
  best_time_seconds INTEGER,
  best_rounds INTEGER,
  best_reps INTEGER,

  achieved_at TIMESTAMP NOT NULL,
  previous_best_time_seconds INTEGER,
  improvement_seconds INTEGER,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, wod_id)
);

-- ============================================
-- CROSSFIT INDEXES
-- ============================================

CREATE INDEX idx_crossfit_wods_wod_type ON crossfit_wods(wod_type);
CREATE INDEX idx_crossfit_wods_is_benchmark ON crossfit_wods(is_benchmark);
CREATE INDEX idx_crossfit_wods_is_hero_wod ON crossfit_wods(is_hero_wod);
CREATE INDEX idx_crossfit_wods_name ON crossfit_wods(name);

CREATE INDEX idx_wod_logs_user_id ON wod_logs(user_id);
CREATE INDEX idx_wod_logs_wod_id ON wod_logs(wod_id);
CREATE INDEX idx_wod_logs_logged_at ON wod_logs(logged_at);

CREATE INDEX idx_wod_benchmarks_user_id ON wod_benchmarks(user_id);
CREATE INDEX idx_wod_benchmarks_wod_id ON wod_benchmarks(wod_id);

-- ============================================
-- CROSSFIT RLS POLICIES
-- ============================================

ALTER TABLE crossfit_wods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wod_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wod_benchmarks ENABLE ROW LEVEL SECURITY;

-- WODs are readable by all authenticated users
CREATE POLICY "WODs are viewable by all users"
  ON crossfit_wods FOR SELECT
  TO authenticated
  USING (true);

-- WOD logs are private to the user
CREATE POLICY "Users can view their own WOD logs"
  ON wod_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own WOD logs"
  ON wod_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own WOD logs"
  ON wod_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own WOD logs"
  ON wod_logs FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- WOD benchmarks are private to the user
CREATE POLICY "Users can view their own WOD benchmarks"
  ON wod_benchmarks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own WOD benchmarks"
  ON wod_benchmarks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own WOD benchmarks"
  ON wod_benchmarks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own WOD benchmarks"
  ON wod_benchmarks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- CROSSFIT TRIGGERS
-- ============================================

CREATE TRIGGER update_wod_benchmarks_updated_at
  BEFORE UPDATE ON wod_benchmarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRAINING PROGRAMS & CALENDAR
-- ============================================

-- Training type preference enum
CREATE TYPE training_type_preference AS ENUM (
  'strength_only',
  'running_only',
  'hybrid',
  'crossfit',
  'undecided'
);

-- Primary goal enum
CREATE TYPE primary_goal AS ENUM (
  'build_muscle',
  'lose_fat',
  'get_stronger',
  'improve_endurance',
  'run_5k',
  'run_10k',
  'run_half_marathon',
  'run_marathon',
  'general_fitness',
  'sport_performance',
  'body_recomposition'
);

-- Program type enum
CREATE TYPE program_type AS ENUM (
  'strength',
  'running',
  'hybrid',
  'crossfit',
  'custom'
);

-- Program status enum
CREATE TYPE program_status AS ENUM (
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
);

-- Workout type enum for program days
CREATE TYPE workout_type AS ENUM (
  'push',
  'pull',
  'legs',
  'upper',
  'lower',
  'full_body',
  'chest_back',
  'shoulders_arms',
  'easy_run',
  'tempo_run',
  'interval_run',
  'long_run',
  'recovery',
  'rest',
  'crossfit',
  'custom'
);

-- Program questionnaire (premium feature)
CREATE TABLE program_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Training type & goals
  training_type training_type_preference NOT NULL,
  primary_goal primary_goal NOT NULL,
  secondary_goals TEXT[],

  -- Specific targets
  target_weight REAL,
  target_weight_unit TEXT DEFAULT 'lbs',
  target_body_fat_percent REAL,

  -- Running targets
  target_race_distance TEXT,
  target_race_time INTEGER,
  target_race_date TIMESTAMP,
  current_pace REAL,

  -- Strength targets
  target_bench_press REAL,
  target_squat REAL,
  target_deadlift REAL,

  -- Availability
  days_per_week INTEGER NOT NULL,
  preferred_days INTEGER[],
  session_duration INTEGER NOT NULL,
  preferred_time_of_day TEXT,

  -- Experience
  experience_level TEXT NOT NULL,
  years_training REAL,

  -- Strength background
  has_strength_experience BOOLEAN DEFAULT false,
  current_bench_press REAL,
  current_squat REAL,
  current_deadlift REAL,

  -- Running background
  has_running_experience BOOLEAN DEFAULT false,
  weekly_mileage REAL,
  longest_run REAL,
  recent_race_time INTEGER,
  recent_race_distance TEXT,

  -- Equipment
  training_location TEXT,
  available_equipment TEXT[],
  has_cardio_equipment BOOLEAN DEFAULT false,
  cardio_equipment TEXT[],

  -- Running environment
  running_environment TEXT,
  has_gps_watch BOOLEAN DEFAULT false,
  has_heart_rate_monitor BOOLEAN DEFAULT false,

  -- Health
  current_injuries TEXT[],
  past_injuries TEXT[],
  exercises_to_avoid TEXT[],
  health_conditions TEXT[],
  mobility_limitations TEXT,

  -- Preferences
  favorite_exercises TEXT[],
  disliked_exercises TEXT[],
  preferred_rep_ranges TEXT,
  preferred_split TEXT,
  preferred_run_types TEXT[],

  -- Lifestyle
  sleep_hours REAL,
  stress_level TEXT,
  nutrition_tracking BOOLEAN DEFAULT false,
  supplements_used TEXT[],

  -- Program preferences
  program_duration INTEGER,
  wants_deload_weeks BOOLEAN DEFAULT true,
  deload_frequency INTEGER,
  wants_progressive_overload BOOLEAN DEFAULT true,
  wants_variety BOOLEAN DEFAULT true,

  -- Additional context
  additional_notes TEXT,
  previous_programs_used TEXT[],
  what_worked TEXT,
  what_didnt_work TEXT,

  -- Metadata
  is_premium BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Training programs
CREATE TABLE training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Program info
  name TEXT NOT NULL,
  description TEXT,
  program_type program_type NOT NULL,

  -- Duration
  duration_weeks INTEGER NOT NULL,
  days_per_week INTEGER NOT NULL,

  -- Goals & context
  primary_goal TEXT,
  secondary_goals TEXT[],
  target_event TEXT,
  target_date DATE,

  -- Generation context
  questionnaire_responses JSONB,
  generation_prompt JSONB,
  ai_model TEXT,
  rag_sources TEXT[],

  -- Status & progress
  status program_status DEFAULT 'draft',
  current_week INTEGER DEFAULT 1,
  current_day INTEGER DEFAULT 1,
  start_date DATE,
  end_date DATE,
  completed_at TIMESTAMP,

  -- Adherence tracking
  total_workouts_scheduled INTEGER DEFAULT 0,
  total_workouts_completed INTEGER DEFAULT 0,
  adherence_percent REAL,

  -- Premium feature flag
  is_premium BOOLEAN DEFAULT true,

  -- Template options
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  template_source UUID,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Program weeks
CREATE TABLE program_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES training_programs(id) ON DELETE CASCADE NOT NULL,

  week_number INTEGER NOT NULL,
  name TEXT,
  focus TEXT,
  description TEXT,

  -- Targets for the week
  target_volume INTEGER,
  target_mileage REAL,
  intensity_level TEXT,

  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Program days
CREATE TABLE program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES training_programs(id) ON DELETE CASCADE NOT NULL,
  week_id UUID REFERENCES program_weeks(id) ON DELETE CASCADE NOT NULL,

  -- Schedule
  week_number INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  day_number INTEGER NOT NULL,

  -- Workout info
  workout_type workout_type NOT NULL,
  name TEXT,
  description TEXT,
  estimated_duration INTEGER,

  -- For running days
  target_distance_meters REAL,
  target_duration_seconds INTEGER,
  target_pace TEXT,
  intervals JSONB,

  -- Notes
  coach_notes TEXT,
  warmup_notes TEXT,
  cooldown_notes TEXT,

  -- Completion tracking
  is_completed BOOLEAN DEFAULT false,
  completed_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  completed_run_id UUID REFERENCES running_activities(id) ON DELETE SET NULL,
  completed_at TIMESTAMP,
  scheduled_date DATE,

  order_in_day INTEGER DEFAULT 1,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Program exercises
CREATE TABLE program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id UUID REFERENCES program_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,

  -- Order
  exercise_order INTEGER NOT NULL,

  -- Prescription
  sets INTEGER NOT NULL,
  reps_min INTEGER,
  reps_max INTEGER,
  reps_target TEXT,
  rpe_target REAL,
  percentage_of_1rm REAL,
  rest_seconds INTEGER,

  -- Tempo
  tempo TEXT,

  -- Notes
  notes TEXT,
  substitute_exercise_ids UUID[],

  -- Superset
  superset_group INTEGER,
  superset_order INTEGER,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Training calendar
CREATE TABLE training_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Date
  scheduled_date DATE NOT NULL,

  -- Activity type
  activity_type TEXT NOT NULL,

  -- References
  program_id UUID REFERENCES training_programs(id) ON DELETE CASCADE,
  program_day_id UUID REFERENCES program_days(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  running_activity_id UUID REFERENCES running_activities(id) ON DELETE SET NULL,

  -- Display info
  title TEXT NOT NULL,
  description TEXT,
  workout_type TEXT,
  estimated_duration INTEGER,

  -- Status
  status TEXT DEFAULT 'scheduled',
  completed_at TIMESTAMP,

  -- Notes
  user_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Program adherence
CREATE TABLE program_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES training_programs(id) ON DELETE CASCADE NOT NULL,
  program_day_id UUID REFERENCES program_days(id) ON DELETE CASCADE NOT NULL,

  scheduled_date DATE NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending',

  -- Completion metrics
  completion_percent REAL,
  exercises_completed INTEGER,
  exercises_scheduled INTEGER,

  -- Rescheduling
  rescheduled_to DATE,
  rescheduled_from DATE,

  -- Notes
  skip_reason TEXT,
  notes TEXT,

  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- TRAINING PROGRAMS INDEXES
-- ============================================

CREATE INDEX idx_program_questionnaire_user_id ON program_questionnaire(user_id);
CREATE INDEX idx_training_programs_user_id ON training_programs(user_id);
CREATE INDEX idx_training_programs_status ON training_programs(status);
CREATE INDEX idx_program_weeks_program_id ON program_weeks(program_id);
CREATE INDEX idx_program_days_program_id ON program_days(program_id);
CREATE INDEX idx_program_days_week_id ON program_days(week_id);
CREATE INDEX idx_program_exercises_program_day_id ON program_exercises(program_day_id);
CREATE INDEX idx_training_calendar_user_id ON training_calendar(user_id);
CREATE INDEX idx_training_calendar_scheduled_date ON training_calendar(scheduled_date);
CREATE INDEX idx_training_calendar_program_id ON training_calendar(program_id);
CREATE INDEX idx_program_adherence_user_id ON program_adherence(user_id);
CREATE INDEX idx_program_adherence_program_id ON program_adherence(program_id);

-- ============================================
-- TRAINING PROGRAMS RLS POLICIES
-- ============================================

ALTER TABLE program_questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_adherence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own questionnaire"
  ON program_questionnaire FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own programs"
  ON training_programs FOR ALL
  USING (auth.uid() = user_id OR (is_template = true AND is_public = true));

CREATE POLICY "Users can view program weeks"
  ON program_weeks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM training_programs
    WHERE id = program_weeks.program_id
    AND (user_id = auth.uid() OR (is_template = true AND is_public = true))
  ));

CREATE POLICY "Users can manage own program weeks"
  ON program_weeks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_programs
    WHERE id = program_weeks.program_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can view program days"
  ON program_days FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM training_programs
    WHERE id = program_days.program_id
    AND (user_id = auth.uid() OR (is_template = true AND is_public = true))
  ));

CREATE POLICY "Users can manage own program days"
  ON program_days FOR ALL
  USING (EXISTS (
    SELECT 1 FROM training_programs
    WHERE id = program_days.program_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can view program exercises"
  ON program_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM program_days pd
    JOIN training_programs tp ON tp.id = pd.program_id
    WHERE pd.id = program_exercises.program_day_id
    AND (tp.user_id = auth.uid() OR (tp.is_template = true AND tp.is_public = true))
  ));

CREATE POLICY "Users can manage own program exercises"
  ON program_exercises FOR ALL
  USING (EXISTS (
    SELECT 1 FROM program_days pd
    JOIN training_programs tp ON tp.id = pd.program_id
    WHERE pd.id = program_exercises.program_day_id AND tp.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own calendar"
  ON training_calendar FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own adherence"
  ON program_adherence FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- TRAINING PROGRAMS TRIGGERS
-- ============================================

CREATE TRIGGER update_program_questionnaire_updated_at
  BEFORE UPDATE ON program_questionnaire
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_programs_updated_at
  BEFORE UPDATE ON training_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_calendar_updated_at
  BEFORE UPDATE ON training_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
