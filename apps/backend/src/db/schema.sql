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
