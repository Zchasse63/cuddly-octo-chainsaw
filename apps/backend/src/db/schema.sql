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

  -- Search optimization
  synonyms TEXT[],
  embedding REAL[],

  -- System
  is_custom BOOLEAN DEFAULT false,
  created_by_user_id UUID,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

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

-- ============================================
-- HELPER: Create user profile on signup
-- ============================================

-- This function creates a user record and profile when someone signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger on Supabase auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
