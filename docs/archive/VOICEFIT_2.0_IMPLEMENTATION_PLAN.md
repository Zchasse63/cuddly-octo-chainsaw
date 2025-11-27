# VoiceFit 2.0 Complete Implementation Plan

**Goal**: Achieve full feature parity with original VoiceFit while using the new tRPC/TypeScript stack

**Current State**: 7 tables, basic workout logging
**Target State**: 41+ tables, full feature set

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **API** | tRPC v11 | Type-safe API layer |
| **ORM** | Drizzle | TypeScript ORM for Supabase |
| **Database** | Supabase PostgreSQL | Primary data store |
| **Search** | Upstash Search | Hybrid semantic + keyword search |
| **Cache** | Upstash Redis | Caching, rate limiting |
| **AI/LLM** | OpenAI SDK (Grok) | Voice parsing, AI coach |
| **Offline** | PowerSync | Offline-first sync |
| **Mobile** | Expo SDK 53 + Expo Router | React Native app |
| **Web** | Next.js 14 | Dashboard & web app |

---

## Phase 1: Database Foundation & Core Schema (Week 1-2)

### 1.1 Upstash Setup

#### Upstash Search (Hybrid Search)
```typescript
// apps/backend/src/lib/upstash.ts
import { Search } from '@upstash/search';
import { Redis } from '@upstash/redis';

export const search = new Search({
  url: process.env.UPSTASH_SEARCH_REST_URL!,
  token: process.env.UPSTASH_SEARCH_REST_TOKEN!,
});

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

#### Upstash Search Indexes (Namespaces)
Create the following indexes in Upstash Search dashboard:

| Index Name | Purpose | Fields |
|------------|---------|--------|
| `exercises` | Exercise matching | name, synonyms, description, muscle_group |
| `exercise_cues` | Coaching cues retrieval | cue_text, exercise_name, cue_type |
| `knowledge_base` | RAG for AI coach | content, title, category, tags |

### 1.2 New Database Tables

#### User & Profile Management (4 tables)

```sql
-- User onboarding tracking
CREATE TABLE user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_step TEXT DEFAULT 'welcome',
  steps_completed TEXT[] DEFAULT '{}',
  is_complete BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User streaks
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

-- User badges/achievements
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_id TEXT NOT NULL, -- 'first_workout', 'pr_club', 'streak_7', etc.
  badge_type TEXT NOT NULL, -- 'strength', 'running', 'streak', 'milestone'
  earned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  metadata JSONB, -- { exerciseId, weight, reps, etc. }
  UNIQUE(user_id, badge_id)
);

-- Badge definitions (static reference)
CREATE TABLE badge_definitions (
  id TEXT PRIMARY KEY, -- 'first_workout', 'bench_200', etc.
  name TEXT NOT NULL,
  description TEXT,
  badge_type TEXT NOT NULL,
  icon_url TEXT,
  criteria JSONB, -- { type: 'pr', exercise: 'bench_press', weight: 200 }
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Enhanced Exercise Database (5 tables)

```sql
-- Update exercises table (no embedding - that's in Upstash Search)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS normalized_name TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS phonetic_key TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS base_movement TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS parent_exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS progression_order INTEGER;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS upstash_indexed BOOLEAN DEFAULT false;

-- Exercise muscles (many-to-many)
CREATE TABLE exercise_muscles (
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  muscle_group TEXT NOT NULL,
  activation_level TEXT DEFAULT 'primary', -- 'primary', 'secondary', 'stabilizer'
  PRIMARY KEY (exercise_id, muscle_group)
);

-- Exercise cues for coaching (content indexed in Upstash Search)
CREATE TABLE exercise_cues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  cue_text TEXT NOT NULL,
  cue_type TEXT NOT NULL, -- 'setup', 'execution', 'breathing', 'common_mistake'
  upstash_indexed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Exercise media (videos, images)
CREATE TABLE exercise_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL, -- 'video', 'image', 'gif'
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER, -- for videos
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Exercise substitutions
CREATE TABLE exercise_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  substitute_exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  reason TEXT, -- 'injury', 'equipment', 'difficulty'
  affected_body_part TEXT, -- body part being protected
  similarity_score REAL DEFAULT 0.8, -- 0-1
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Body part stress levels per exercise
CREATE TABLE exercise_body_part_stress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  body_part TEXT NOT NULL,
  stress_level TEXT NOT NULL, -- 'low', 'medium', 'high'
  UNIQUE(exercise_id, body_part)
);
```

#### Voice Commands & AI (3 tables)

```sql
-- Voice command history and fine-tuning data
CREATE TABLE voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  workout_set_id UUID REFERENCES workout_sets(id) ON DELETE SET NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,

  -- Voice input
  raw_transcript TEXT NOT NULL,
  audio_url TEXT, -- optional audio file

  -- Parsing results
  parsed_output JSONB, -- { exercise, sets, reps, weight, rpe }
  confidence REAL, -- 0-1 parsing confidence
  model_used TEXT, -- 'grok-2', 'fine-tuned-v1'

  -- Search results from Upstash
  search_results JSONB, -- top matches from Upstash Search
  search_latency_ms INTEGER,

  -- Correction tracking (for fine-tuning)
  was_corrected BOOLEAN DEFAULT false,
  corrected_output JSONB,
  correction_type TEXT, -- 'exercise', 'reps', 'weight', 'full'

  -- Performance
  latency_ms INTEGER,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Fine-tuned model tracking
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

-- RAG knowledge base (content indexed in Upstash Search)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id TEXT UNIQUE NOT NULL,
  chunk_type TEXT NOT NULL, -- 'exercise_guide', 'nutrition', 'recovery', 'program'
  category TEXT, -- 'strength', 'running', 'mobility', 'injury'
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT[],
  metadata JSONB,
  source TEXT, -- 'internal', 'article_url'
  upstash_indexed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

#### Enhanced Workout Tracking (2 tables)

```sql
-- Update workout_sets to link voice commands
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS voice_command_id UUID REFERENCES voice_commands(id) ON DELETE SET NULL;
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS was_prescribed BOOLEAN DEFAULT false;
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS prescribed_reps INTEGER;
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS prescribed_weight REAL;

-- Detailed PR history (enhanced from personal_records)
CREATE TABLE pr_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  workout_set_id UUID REFERENCES workout_sets(id) ON DELETE SET NULL,

  pr_type TEXT NOT NULL, -- '1rm', '3rm', '5rm', 'volume', 'reps_at_weight'
  value REAL NOT NULL,
  weight REAL,
  reps INTEGER,

  -- Context
  estimated_1rm REAL,
  previous_pr_id UUID REFERENCES pr_history(id),
  improvement_percent REAL,

  achieved_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, exercise_id, pr_type, achieved_at)
);
```

#### AI Chat & Conversations (2 tables)

```sql
-- Conversation threads
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  context_type TEXT, -- 'general', 'workout', 'program', 'injury'
  context_id UUID, -- workout_id, program_id, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Individual messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata JSONB, -- { tokens_used, model, latency_ms }
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### 1.3 Upstash Search Indexing Service

```typescript
// apps/backend/src/services/search-indexer.ts
import { search } from '../lib/upstash';
import { db } from '../db';
import { exercises, exerciseCues, knowledgeBase } from '../db/schema';
import { eq } from 'drizzle-orm';

// Index exercises to Upstash Search
export async function indexExercises() {
  const unindexed = await db.query.exercises.findMany({
    where: eq(exercises.upstashIndexed, false),
  });

  for (const exercise of unindexed) {
    await search.upsert({
      index: 'exercises',
      id: exercise.id,
      data: {
        name: exercise.name,
        normalized_name: exercise.normalizedName,
        synonyms: exercise.synonyms?.join(' ') || '',
        description: exercise.description || '',
        primary_muscle: exercise.primaryMuscle,
        equipment: exercise.equipment?.join(' ') || '',
        movement_pattern: exercise.movementPattern || '',
      },
    });

    await db.update(exercises)
      .set({ upstashIndexed: true })
      .where(eq(exercises.id, exercise.id));
  }
}

// Index exercise cues for RAG
export async function indexExerciseCues() {
  const unindexed = await db.query.exerciseCues.findMany({
    where: eq(exerciseCues.upstashIndexed, false),
    with: { exercise: true },
  });

  for (const cue of unindexed) {
    await search.upsert({
      index: 'exercise_cues',
      id: cue.id,
      data: {
        cue_text: cue.cueText,
        cue_type: cue.cueType,
        exercise_name: cue.exercise.name,
        exercise_id: cue.exerciseId,
      },
    });

    await db.update(exerciseCues)
      .set({ upstashIndexed: true })
      .where(eq(exerciseCues.id, cue.id));
  }
}

// Index knowledge base for RAG
export async function indexKnowledgeBase() {
  const unindexed = await db.query.knowledgeBase.findMany({
    where: eq(knowledgeBase.upstashIndexed, false),
  });

  for (const chunk of unindexed) {
    await search.upsert({
      index: 'knowledge_base',
      id: chunk.id,
      data: {
        title: chunk.title || '',
        content: chunk.content,
        category: chunk.category || '',
        chunk_type: chunk.chunkType,
        tags: chunk.tags?.join(' ') || '',
      },
    });

    await db.update(knowledgeBase)
      .set({ upstashIndexed: true })
      .where(eq(knowledgeBase.id, chunk.id));
  }
}
```

### 1.4 Drizzle Schema Files

Create new schema files in `apps/backend/src/db/schema/`:

- `onboarding.ts` - user_onboarding
- `gamification.ts` - user_streaks, user_badges, badge_definitions
- `exercise-extended.ts` - exercise_muscles, exercise_cues, exercise_media, exercise_substitutions, exercise_body_part_stress
- `voice.ts` - voice_commands, fine_tuned_models
- `knowledge.ts` - knowledge_base
- `conversations.ts` - conversations, messages
- `pr-history.ts` - pr_history

### 1.5 New tRPC Routers

- `onboarding.ts` - Onboarding flow management
- `badges.ts` - Achievement system
- `streaks.ts` - Streak tracking
- `voice-commands.ts` - Voice command history & analytics
- `knowledge.ts` - RAG queries via Upstash Search
- `conversations.ts` - AI chat management
- `substitutions.ts` - Exercise substitution suggestions
- `search.ts` - Upstash Search queries

### 1.6 Exercise Matcher Service

```typescript
// apps/backend/src/services/exercise-matcher.ts
import { search, redis } from '../lib/upstash';

interface MatchResult {
  exerciseId: string;
  exerciseName: string;
  confidence: number;
  matchType: 'semantic' | 'keyword' | 'hybrid';
}

export async function matchExercise(input: string): Promise<MatchResult[]> {
  // Check cache first
  const cacheKey = `exercise:${input.toLowerCase().trim()}`;
  const cached = await redis.get<MatchResult[]>(cacheKey);
  if (cached) return cached;

  // Query Upstash Search (hybrid: semantic + keyword)
  const results = await search.query({
    index: 'exercises',
    query: input,
    topK: 5,
  });

  const matches: MatchResult[] = results.map((r) => ({
    exerciseId: r.id,
    exerciseName: r.data.name as string,
    confidence: r.score,
    matchType: 'hybrid',
  }));

  // Cache for 1 hour
  await redis.set(cacheKey, matches, { ex: 3600 });

  return matches;
}

// RAG: Get relevant cues for an exercise
export async function getExerciseCues(exerciseId: string, query?: string) {
  const searchQuery = query || 'form tips common mistakes';

  const results = await search.query({
    index: 'exercise_cues',
    query: searchQuery,
    filter: `exercise_id = "${exerciseId}"`,
    topK: 5,
  });

  return results.map((r) => ({
    cueText: r.data.cue_text,
    cueType: r.data.cue_type,
  }));
}

// RAG: Get knowledge for AI coach
export async function getRelevantKnowledge(query: string, category?: string) {
  const filter = category ? `category = "${category}"` : undefined;

  const results = await search.query({
    index: 'knowledge_base',
    query,
    filter,
    topK: 5,
  });

  return results.map((r) => ({
    title: r.data.title,
    content: r.data.content,
    category: r.data.category,
  }));
}
```

---

## Phase 2: Program Generation System (Week 3-4)

### 2.1 Database Tables

```sql
-- Generated training programs
CREATE TABLE generated_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Program info
  name TEXT NOT NULL,
  program_type TEXT NOT NULL, -- 'strength', 'hypertrophy', 'running', 'hybrid'
  duration_weeks INTEGER NOT NULL,
  days_per_week INTEGER NOT NULL,

  -- Generation context
  generation_prompt JSONB, -- user preferences that created this
  ai_model_used TEXT,

  -- Status
  is_active BOOLEAN DEFAULT false,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Program weeks
CREATE TABLE program_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES generated_programs(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL,
  focus TEXT, -- 'volume', 'intensity', 'deload'
  notes TEXT,
  UNIQUE(program_id, week_number)
);

-- Program days
CREATE TABLE program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_week_id UUID REFERENCES program_weeks(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL, -- 1-7
  workout_name TEXT,
  workout_type TEXT, -- 'push', 'pull', 'legs', 'upper', 'lower', 'full_body'
  notes TEXT,
  UNIQUE(program_week_id, day_of_week)
);

-- Program exercises (prescribed exercises)
CREATE TABLE program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id UUID REFERENCES program_days(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  exercise_order INTEGER NOT NULL,

  -- Prescription
  sets INTEGER NOT NULL,
  reps_min INTEGER,
  reps_max INTEGER,
  reps_target TEXT, -- '8-12', 'AMRAP', '5x5'
  rpe_target REAL,
  rest_seconds INTEGER,

  -- Percentage-based programming
  percentage_of_1rm REAL,

  notes TEXT,
  superset_group INTEGER, -- for supersets

  UNIQUE(program_day_id, exercise_order)
);

-- Program adherence tracking
CREATE TABLE program_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES generated_programs(id) ON DELETE CASCADE NOT NULL,
  program_day_id UUID REFERENCES program_days(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,

  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'skipped', 'partial'
  completion_percent REAL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(program_id, scheduled_date)
);

-- Volume adjustment recommendations
CREATE TABLE volume_adjustment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  muscle_group TEXT NOT NULL,
  current_weekly_sets INTEGER,
  recommended_sets INTEGER,
  adjustment_type TEXT NOT NULL, -- 'increase', 'decrease', 'maintain'
  reason TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'dismissed'
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Warmup templates
CREATE TABLE warmup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  workout_type TEXT, -- 'push', 'pull', 'legs', 'running'
  duration_minutes INTEGER,
  exercises JSONB NOT NULL, -- [{ name, sets, reps, notes }]
  is_default BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- null = system template
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Cooldown templates
CREATE TABLE cooldown_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  workout_type TEXT,
  duration_minutes INTEGER,
  exercises JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### 2.2 New tRPC Routers

- `programs.ts` - Program CRUD, generation, activation
- `program-adherence.ts` - Adherence tracking, completion
- `volume.ts` - Volume analysis, adjustment recommendations
- `templates.ts` - Warmup/cooldown templates

### 2.3 New AI Services

- `program-generator.ts` - AI program generation with Grok
- `volume-analyzer.ts` - Analyze training volume by muscle group
- `deload-detector.ts` - Detect when deload is needed

---

## Phase 3: Health & Recovery System (Week 5-6)

### 3.1 Database Tables

```sql
-- Health metrics from wearables
CREATE TABLE health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'hrv', 'rhr', 'sleep_score', 'strain', 'recovery'
  value REAL NOT NULL,
  source TEXT NOT NULL, -- 'whoop', 'terra', 'garmin', 'apple_health', 'manual'
  recorded_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date, metric_type, source)
);

-- Sleep sessions
CREATE TABLE sleep_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,

  -- Scores
  quality_score REAL, -- 0-100
  efficiency_percent REAL,

  -- Stages (minutes)
  deep_sleep_minutes INTEGER,
  rem_sleep_minutes INTEGER,
  light_sleep_minutes INTEGER,
  awake_minutes INTEGER,

  -- Context
  source TEXT NOT NULL,
  metadata JSONB, -- raw data from provider

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Activity sessions from wearables
CREATE TABLE activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,

  activity_type TEXT NOT NULL, -- 'strength', 'running', 'cycling', 'swimming'
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,

  -- Metrics
  calories_burned INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  strain_score REAL, -- WHOOP strain

  source TEXT NOT NULL,
  external_id TEXT, -- ID from provider
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Enhanced readiness scores
ALTER TABLE readiness_scores ADD COLUMN IF NOT EXISTS recovery_percent REAL;
ALTER TABLE readiness_scores ADD COLUMN IF NOT EXISTS strain_score REAL;
ALTER TABLE readiness_scores ADD COLUMN IF NOT EXISTS training_recommendation TEXT; -- 'rest', 'light', 'moderate', 'hard'
ALTER TABLE readiness_scores ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Daily health snapshots (comprehensive)
CREATE TABLE health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Aggregated data
  snapshot_data JSONB NOT NULL, -- all metrics for the day
  data_completeness_score REAL, -- 0-1

  -- AI analysis
  ai_summary TEXT,
  training_recommendation TEXT,

  generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);

-- Daily summaries
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Training
  workouts_completed INTEGER DEFAULT 0,
  total_volume REAL, -- sets * reps * weight
  total_sets INTEGER,
  muscles_trained TEXT[],
  prs_hit INTEGER DEFAULT 0,

  -- Cardio
  total_distance_meters REAL,
  total_cardio_minutes INTEGER,

  -- Health
  calories_burned INTEGER,
  avg_heart_rate INTEGER,
  recovery_score REAL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);

-- Injury logging
CREATE TABLE injury_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  body_part TEXT NOT NULL,
  injury_type TEXT, -- 'strain', 'sprain', 'tendonitis', 'pain'
  severity TEXT NOT NULL, -- 'minor', 'moderate', 'severe'

  occurred_at TIMESTAMP,
  resolved_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  notes TEXT,
  affected_exercises TEXT[], -- exercises to avoid

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Nutrition logs
CREATE TABLE nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack'

  calories INTEGER,
  protein_grams REAL,
  carbs_grams REAL,
  fat_grams REAL,
  fiber_grams REAL,

  food_items JSONB, -- [{ name, quantity, calories, protein, ... }]
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### 3.2 New tRPC Routers

- `health-metrics.ts` - Health metric CRUD, aggregations
- `sleep.ts` - Sleep session tracking
- `activities.ts` - Activity session management
- `snapshots.ts` - Daily health snapshots
- `summaries.ts` - Daily training summaries
- `injuries.ts` - Injury tracking (enhance existing)
- `nutrition.ts` - Nutrition logging

### 3.3 Wearable Integration Services

- `wearables/whoop.ts` - WHOOP OAuth + API
- `wearables/terra.ts` - Terra API (Garmin, Oura, Apple Health, etc.)
- `wearables/stryd.ts` - Stryd running power

---

## Phase 4: Running & GPS Features (Week 7-8)

### 4.1 Database Tables

```sql
-- Detailed run tracking
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,

  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_seconds INTEGER,

  -- Distance & pace
  distance_meters REAL,
  avg_pace_min_per_km REAL,
  best_pace_min_per_km REAL,

  -- Heart rate
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,

  -- Elevation
  elevation_gain_meters REAL,
  elevation_loss_meters REAL,

  -- Cadence & power
  avg_cadence INTEGER, -- steps per minute
  avg_power_watts REAL, -- from Stryd

  -- Route
  route_data JSONB, -- [{ lat, lng, elevation, timestamp, pace, hr }]
  start_location JSONB, -- { lat, lng, name }
  end_location JSONB,

  -- Workout type
  run_type TEXT, -- 'easy', 'tempo', 'intervals', 'long', 'race'
  planned_workout JSONB, -- { type: 'intervals', segments: [...] }

  -- Conditions
  weather JSONB, -- { temp, humidity, wind, conditions }
  surface_type TEXT, -- 'road', 'trail', 'track', 'treadmill'

  -- Shoes
  shoe_id UUID REFERENCES running_shoes(id),

  notes TEXT,
  source TEXT DEFAULT 'app', -- 'app', 'garmin', 'strava'
  external_id TEXT,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Run splits (per km/mile)
CREATE TABLE run_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE NOT NULL,
  split_number INTEGER NOT NULL,
  distance_meters REAL NOT NULL,
  duration_seconds INTEGER NOT NULL,
  pace_min_per_km REAL,
  avg_heart_rate INTEGER,
  elevation_change_meters REAL,
  avg_cadence INTEGER,
  avg_power_watts REAL,
  UNIQUE(run_id, split_number)
);

-- Interval segments within runs
CREATE TABLE run_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE NOT NULL,
  interval_number INTEGER NOT NULL,
  interval_type TEXT NOT NULL, -- 'work', 'recovery', 'warmup', 'cooldown'
  target_pace REAL,
  actual_pace REAL,
  distance_meters REAL,
  duration_seconds INTEGER,
  avg_heart_rate INTEGER,
  UNIQUE(run_id, interval_number)
);

-- Running shoes
CREATE TABLE running_shoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  nickname TEXT,
  purchase_date DATE,
  initial_mileage_km REAL DEFAULT 0,
  current_mileage_km REAL DEFAULT 0,
  max_mileage_km REAL DEFAULT 800, -- alert threshold
  is_retired BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Running PRs
CREATE TABLE running_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
  distance_type TEXT NOT NULL, -- '1k', '1mi', '5k', '10k', 'half', 'marathon'
  time_seconds INTEGER NOT NULL,
  pace_min_per_km REAL,
  achieved_at TIMESTAMP NOT NULL,
  previous_pr_id UUID REFERENCES running_prs(id),
  improvement_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, distance_type, achieved_at)
);
```

### 4.2 New tRPC Routers

- `runs.ts` - Run CRUD, GPS tracking
- `run-splits.ts` - Split analysis
- `run-intervals.ts` - Interval workout tracking
- `shoes.ts` - Shoe mileage tracking
- `running-prs.ts` - Running PR tracking

### 4.3 New Services

- `gps-processor.ts` - Process GPS data, calculate metrics
- `weather-service.ts` - OpenWeatherMap integration
- `pace-calculator.ts` - Pace zones, predictions

### 4.4 Mobile App Updates

- Enhanced `RunScreen` with live GPS tracking
- Interval workout UI
- Run history with maps
- Shoe management screen

---

## Phase 5: Coach & Client System (Week 9-10)

### 5.1 Database Tables

```sql
-- Coach-client relationships
CREATE TABLE client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  status TEXT DEFAULT 'active', -- 'active', 'paused', 'ended'
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP,

  -- Permissions
  can_view_workouts BOOLEAN DEFAULT true,
  can_view_nutrition BOOLEAN DEFAULT false,
  can_view_health BOOLEAN DEFAULT false,
  can_edit_programs BOOLEAN DEFAULT true,
  can_message BOOLEAN DEFAULT true,

  notes TEXT,

  UNIQUE(coach_id, client_id)
);

-- Coach-client invitations
CREATE TABLE coach_client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Invite target (either existing user or email)
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_email TEXT,

  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  invite_code TEXT UNIQUE,

  invited_at TIMESTAMP DEFAULT NOW() NOT NULL,
  responded_at TIMESTAMP,
  expires_at TIMESTAMP,

  message TEXT -- personal message from coach
);

-- Coach notes on clients
CREATE TABLE coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  note_type TEXT, -- 'general', 'workout', 'progress', 'concern'
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true, -- hidden from client

  related_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  related_program_id UUID REFERENCES generated_programs(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Program templates (coach-created)
CREATE TABLE program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  program_type TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  days_per_week INTEGER NOT NULL,
  difficulty_level TEXT,

  template_data JSONB NOT NULL, -- full program structure

  is_public BOOLEAN DEFAULT false, -- marketplace
  price_cents INTEGER, -- if selling

  times_used INTEGER DEFAULT 0,
  avg_rating REAL,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Client check-ins
CREATE TABLE client_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  check_in_date DATE NOT NULL,

  -- Self-reported data
  weight_kg REAL,
  sleep_quality INTEGER, -- 1-10
  energy_level INTEGER, -- 1-10
  stress_level INTEGER, -- 1-10
  soreness_level INTEGER, -- 1-10

  -- Progress photos (URLs)
  photos JSONB,

  notes TEXT,
  coach_feedback TEXT,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(client_id, check_in_date)
);
```

### 5.2 New tRPC Routers

- `coach/clients.ts` - Client management
- `coach/invitations.ts` - Invite flow
- `coach/notes.ts` - Client notes
- `coach/templates.ts` - Program templates
- `coach/check-ins.ts` - Check-in management
- `coach/analytics.ts` - Client analytics dashboard

### 5.3 Web Dashboard Pages

- `/dashboard` - Coach overview
- `/dashboard/clients` - Client list
- `/dashboard/clients/[id]` - Client detail
- `/dashboard/programs` - Program templates
- `/dashboard/programs/[id]` - Program builder
- `/dashboard/analytics` - Aggregated client analytics

---

## Phase 6: CrossFit Support (Week 11)

### 6.1 Database Tables

```sql
-- CrossFit WOD library
CREATE TABLE crossfit_wods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE, -- 'Fran', 'Murph', etc.
  wod_type TEXT NOT NULL, -- 'amrap', 'emom', 'for_time', 'chipper', 'ladder'
  description TEXT,

  -- Workout structure
  movements JSONB NOT NULL, -- [{ exercise, reps, weight, notes }]
  time_cap_minutes INTEGER,
  rounds INTEGER, -- for AMRAP
  interval_seconds INTEGER, -- for EMOM

  -- Metadata
  is_benchmark BOOLEAN DEFAULT false, -- "The Girls", "Hero WODs"
  is_hero_wod BOOLEAN DEFAULT false,
  difficulty_level TEXT,

  rx_standards JSONB, -- { male: { weight: 135 }, female: { weight: 95 } }
  scaling_options JSONB,

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
  result_load JSONB, -- weights used

  -- Scaling
  was_rx BOOLEAN DEFAULT false,
  scaling_notes TEXT,

  notes TEXT,

  -- Voice input
  raw_voice_input TEXT,
  voice_command_id UUID REFERENCES voice_commands(id),

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User benchmark tracking
CREATE TABLE wod_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  wod_id UUID REFERENCES crossfit_wods(id) ON DELETE CASCADE NOT NULL,
  wod_log_id UUID REFERENCES wod_logs(id) ON DELETE SET NULL,

  best_time_seconds INTEGER,
  best_rounds INTEGER,
  best_reps INTEGER,

  achieved_at TIMESTAMP NOT NULL,

  UNIQUE(user_id, wod_id)
);
```

### 6.2 New tRPC Routers

- `wods.ts` - WOD library CRUD
- `wod-logs.ts` - WOD logging
- `wod-benchmarks.ts` - Benchmark tracking

### 6.3 Mobile App

- WOD library screen
- WOD detail/logging screen
- Benchmark history

---

## Phase 7: Offline Support & Sync (Week 12-13)

### 7.1 Technology: PowerSync

**PowerSync** - Built for Supabase, automatic bi-directional sync

### 7.2 PowerSync Setup

```typescript
// apps/mobile/src/lib/powersync.ts
import { PowerSyncDatabase } from '@powersync/react-native';
import { SupabaseConnector } from '@powersync/supabase';
import { AppSchema } from './powersync-schema';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'voicefit.db' },
});

export const connector = new SupabaseConnector({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  powerSync: db,
});

export async function initPowerSync() {
  await db.init();
  await db.connect(connector);
}
```

### 7.3 PowerSync Schema

```typescript
// apps/mobile/src/lib/powersync-schema.ts
import { Schema, Table, Column, ColumnType } from '@powersync/react-native';

export const AppSchema = new Schema([
  new Table({
    name: 'workouts',
    columns: [
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'name', type: ColumnType.TEXT }),
      new Column({ name: 'status', type: ColumnType.TEXT }),
      new Column({ name: 'started_at', type: ColumnType.TEXT }),
      new Column({ name: 'completed_at', type: ColumnType.TEXT }),
      new Column({ name: 'duration', type: ColumnType.INTEGER }),
    ],
  }),
  new Table({
    name: 'workout_sets',
    columns: [
      new Column({ name: 'workout_id', type: ColumnType.TEXT }),
      new Column({ name: 'exercise_id', type: ColumnType.TEXT }),
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'set_number', type: ColumnType.INTEGER }),
      new Column({ name: 'reps', type: ColumnType.INTEGER }),
      new Column({ name: 'weight', type: ColumnType.REAL }),
      new Column({ name: 'weight_unit', type: ColumnType.TEXT }),
      new Column({ name: 'rpe', type: ColumnType.REAL }),
      new Column({ name: 'is_pr', type: ColumnType.INTEGER }),
      new Column({ name: 'voice_transcript', type: ColumnType.TEXT }),
    ],
  }),
  new Table({
    name: 'exercises',
    columns: [
      new Column({ name: 'name', type: ColumnType.TEXT }),
      new Column({ name: 'primary_muscle', type: ColumnType.TEXT }),
      new Column({ name: 'equipment', type: ColumnType.TEXT }),
      new Column({ name: 'is_compound', type: ColumnType.INTEGER }),
    ],
  }),
  new Table({
    name: 'voice_commands',
    columns: [
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'workout_id', type: ColumnType.TEXT }),
      new Column({ name: 'raw_transcript', type: ColumnType.TEXT }),
      new Column({ name: 'parsed_output', type: ColumnType.TEXT }),
      new Column({ name: 'confidence', type: ColumnType.REAL }),
    ],
  }),
]);
```

### 7.4 Sync Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PowerSync (SQLite)                      │   │
│  │  - Works offline                                     │   │
│  │  - Automatic sync when online                        │   │
│  │  - Conflict resolution                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Automatic bi-directional sync
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 SUPABASE POSTGRESQL                         │
│                 (source of truth)                           │
└─────────────────────────────────────────────────────────────┘
```

### 7.5 Sync Tables (Priority Order)

1. `workout_sets` - Most critical for offline logging
2. `workouts` - Workout sessions
3. `voice_commands` - Voice logs
4. `exercises` - Read-only cache
5. `user_profiles` - User settings

### 7.6 Mobile App Changes

- Offline indicator component
- Sync status in settings
- Queue indicator for pending syncs
- Auto-sync on connectivity change

---

## Phase 8: AI Services & RAG (Week 14)

### 8.1 AI Coach with RAG

```typescript
// apps/backend/src/services/ai-coach.ts
import OpenAI from 'openai';
import { getRelevantKnowledge, getExerciseCues } from './exercise-matcher';
import { redis } from '../lib/upstash';

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

interface CoachContext {
  userId: string;
  currentWorkout?: any;
  recentPRs?: any[];
  injuries?: any[];
}

export async function askCoach(
  question: string,
  context: CoachContext
): Promise<string> {
  // 1. Get relevant knowledge from Upstash Search (RAG)
  const knowledge = await getRelevantKnowledge(question);

  // 2. Build context for AI
  const ragContext = knowledge.map(k => k.content).join('\n\n');

  // 3. Build system prompt with context
  const systemPrompt = `You are VoiceFit's AI fitness coach. You have access to the following knowledge:

${ragContext}

User context:
- Recent PRs: ${JSON.stringify(context.recentPRs || [])}
- Active injuries: ${JSON.stringify(context.injuries || [])}
- Current workout: ${JSON.stringify(context.currentWorkout || 'None')}

Provide helpful, concise fitness advice. If suggesting exercise substitutions, consider the user's injuries.`;

  // 4. Call Grok
  const response = await grok.chat.completions.create({
    model: 'grok-2',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'suggest_exercise_substitution',
          description: 'Suggest an alternative exercise',
          parameters: {
            type: 'object',
            properties: {
              exercise: { type: 'string' },
              reason: { type: 'string', enum: ['injury', 'equipment', 'preference'] },
              body_part: { type: 'string' },
            },
            required: ['exercise', 'reason'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_exercise_cues',
          description: 'Get form cues for an exercise',
          parameters: {
            type: 'object',
            properties: {
              exercise_id: { type: 'string' },
            },
            required: ['exercise_id'],
          },
        },
      },
    ],
  });

  // 5. Handle tool calls if any
  const message = response.choices[0].message;
  if (message.tool_calls) {
    // Process tool calls and get final response
    // ...
  }

  return message.content || '';
}

// Streaming version for chat UI
export async function* streamCoachResponse(
  question: string,
  context: CoachContext
) {
  const knowledge = await getRelevantKnowledge(question);
  const ragContext = knowledge.map(k => k.content).join('\n\n');

  const stream = await grok.chat.completions.create({
    model: 'grok-2',
    messages: [
      { role: 'system', content: `You are VoiceFit's AI coach.\n\nKnowledge:\n${ragContext}` },
      { role: 'user', content: question },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
```

### 8.2 Voice Parser Service

```typescript
// apps/backend/src/services/voice-parser.ts
import OpenAI from 'openai';
import { matchExercise } from './exercise-matcher';
import { redis } from '../lib/upstash';

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

interface ParsedSet {
  exercise: string;
  exerciseId: string;
  reps: number;
  weight: number;
  weightUnit: 'lbs' | 'kg';
  rpe?: number;
  confidence: number;
}

export async function parseVoiceCommand(transcript: string): Promise<ParsedSet> {
  // 1. Check cache
  const cacheKey = `voice:${transcript.toLowerCase().trim()}`;
  const cached = await redis.get<ParsedSet>(cacheKey);
  if (cached) return cached;

  // 2. Match exercise using Upstash Search
  const exerciseMatches = await matchExercise(transcript);
  const bestMatch = exerciseMatches[0];

  // 3. Use Grok to parse the numbers
  const response = await grok.chat.completions.create({
    model: 'grok-2',
    messages: [
      {
        role: 'system',
        content: `Parse workout voice commands. Extract reps, weight, and RPE.
The exercise is: ${bestMatch.exerciseName}
Return JSON: { "reps": number, "weight": number, "weightUnit": "lbs"|"kg", "rpe": number|null }`,
      },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');

  const result: ParsedSet = {
    exercise: bestMatch.exerciseName,
    exerciseId: bestMatch.exerciseId,
    reps: parsed.reps || 0,
    weight: parsed.weight || 0,
    weightUnit: parsed.weightUnit || 'lbs',
    rpe: parsed.rpe,
    confidence: bestMatch.confidence,
  };

  // 4. Cache result
  await redis.set(cacheKey, result, { ex: 3600 });

  return result;
}
```

### 8.3 Knowledge Base Seeding

Content categories to index in Upstash Search:

- Exercise guides (form, common mistakes)
- Training principles (progressive overload, periodization)
- Nutrition basics (protein, macros, timing)
- Recovery protocols (sleep, deload, active recovery)
- Injury prevention (warmup, mobility, common issues)

---

## Phase 9: Mobile App Completion (Week 15-16)

### 9.1 New Screens

| Screen | Purpose |
|--------|---------|
| `OnboardingFlow` | Multi-step onboarding |
| `BadgesScreen` | Achievement gallery |
| `StreaksScreen` | Streak tracking |
| `PRsScreen` | Enhanced PR history |
| `RunHistoryScreen` | Run list with maps |
| `RunDetailScreen` | Individual run analysis |
| `ShoesScreen` | Shoe management |
| `WODLibraryScreen` | CrossFit WODs |
| `WODDetailScreen` | WOD logging |
| `ProgramsScreen` | Active/past programs |
| `ProgramDetailScreen` | Program view/edit |
| `NutritionScreen` | Macro tracking |
| `InjuryScreen` | Injury management |
| `WearablesScreen` | Connect wearables |
| `SettingsScreen` | Enhanced settings |

### 9.2 Enhanced Existing Screens

- `HomeScreen` - Streak display, daily summary, badges
- `WorkoutScreen` - Voice command confidence, exercise cues
- `CoachScreen` - RAG-powered responses, exercise swaps
- `ProfileScreen` - Comprehensive stats

### 9.3 New Components

- `VoiceCommandFeedback` - Show confidence, corrections
- `ExerciseCueCard` - Display coaching cues
- `StreakIndicator` - Current streak display
- `BadgeToast` - Badge earned notification
- `PRCelebration` - PR achievement animation
- `SyncIndicator` - Offline sync status (PowerSync)
- `MapView` - Run route display

---

## Phase 10: Web Dashboard Completion (Week 17-18)

### 10.1 Coach Dashboard Pages

```
/dashboard
├── /overview          # Summary stats
├── /clients           # Client list
│   └── /[id]          # Client detail
│       ├── /workouts  # Client workouts
│       ├── /programs  # Assigned programs
│       ├── /progress  # Progress charts
│       └── /notes     # Coach notes
├── /programs          # Program templates
│   ├── /new           # Create program
│   └── /[id]          # Edit program
├── /analytics         # Aggregated analytics
├── /invitations       # Pending invites
└── /settings          # Coach settings
```

### 10.2 User Web Portal

```
/app
├── /dashboard         # User overview
├── /workouts          # Workout history
├── /programs          # My programs
├── /analytics         # Personal analytics
├── /runs              # Run history
└── /settings          # User settings
```

---

## Database Table Summary

### Final Table Count: 45 tables

| Category | Tables | Count |
|----------|--------|-------|
| User & Profile | users, user_profiles, user_onboarding, user_streaks, user_badges, badge_definitions | 6 |
| Exercises | exercises, exercise_muscles, exercise_cues, exercise_media, exercise_substitutions, exercise_body_part_stress | 6 |
| Workouts | workouts, workout_sets, pr_history, personal_records | 4 |
| Voice & AI | voice_commands, fine_tuned_models, knowledge_base, conversations, messages | 5 |
| Programs | generated_programs, program_weeks, program_days, program_exercises, program_adherence, volume_adjustment_plans, warmup_templates, cooldown_templates | 8 |
| Health | readiness_scores, health_metrics, sleep_sessions, activity_sessions, health_snapshots, daily_summaries, injury_logs, nutrition_logs | 8 |
| Running | runs, run_splits, run_intervals, running_shoes, running_prs | 5 |
| Coach | client_assignments, coach_client_invitations, coach_notes, program_templates, client_check_ins | 5 |
| CrossFit | crossfit_wods, wod_logs, wod_benchmarks | 3 |

---

## External Services Summary

| Service | Purpose | Setup Required |
|---------|---------|----------------|
| **Supabase** | Database, Auth | Create project, run migrations |
| **Upstash Search** | Hybrid search (exercises, RAG) | Create indexes, index data |
| **Upstash Redis** | Caching, rate limiting | Create database |
| **Grok (xAI)** | AI coach, voice parsing | Get API key |
| **PowerSync** | Offline sync | Configure sync rules |
| **WHOOP** | Wearable data | OAuth app setup |
| **Terra** | Multi-wearable aggregation | API key |
| **OpenWeatherMap** | Weather for runs | API key |

---

## tRPC Router Summary

### Final Router Count: ~25 routers

```typescript
// apps/backend/src/routers/index.ts
export const appRouter = router({
  // Auth & User
  auth: authRouter,
  user: userRouter,
  onboarding: onboardingRouter,

  // Gamification
  badges: badgesRouter,
  streaks: streaksRouter,

  // Exercises & Search
  exercise: exerciseRouter,
  exerciseCues: exerciseCuesRouter,
  substitutions: substitutionsRouter,
  search: searchRouter, // Upstash Search queries

  // Workouts
  workout: workoutRouter,
  prHistory: prHistoryRouter,

  // Voice & AI
  voice: voiceRouter,
  voiceCommands: voiceCommandsRouter,
  knowledge: knowledgeRouter,
  conversations: conversationsRouter,
  coach: coachRouter,

  // Programs
  program: programRouter,
  programAdherence: programAdherenceRouter,
  volume: volumeRouter,
  templates: templatesRouter,

  // Health
  readiness: readinessRouter,
  healthMetrics: healthMetricsRouter,
  sleep: sleepRouter,
  activities: activitiesRouter,
  snapshots: snapshotsRouter,
  summaries: summariesRouter,
  injuries: injuryRouter,
  nutrition: nutritionRouter,

  // Running
  runs: runsRouter,
  shoes: shoesRouter,
  runningPrs: runningPrsRouter,

  // Coach System
  clientManagement: clientManagementRouter,
  coachInvitations: coachInvitationsRouter,
  coachNotes: coachNotesRouter,
  programTemplates: programTemplatesRouter,
  checkIns: checkInsRouter,

  // CrossFit
  wods: wodsRouter,
  wodLogs: wodLogsRouter,
});
```

---

## Timeline Summary

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Database Foundation & Upstash Setup | 2 weeks |
| 2 | Program Generation System | 2 weeks |
| 3 | Health & Recovery System | 2 weeks |
| 4 | Running & GPS Features | 2 weeks |
| 5 | Coach & Client System | 2 weeks |
| 6 | CrossFit Support | 1 week |
| 7 | Offline Support (PowerSync) | 2 weeks |
| 8 | AI Services & RAG | 1 week |
| 9 | Mobile App Completion | 2 weeks |
| 10 | Web Dashboard Completion | 2 weeks |

**Total: ~18 weeks**

---

## Environment Variables

```env
# Supabase
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Upstash Search
UPSTASH_SEARCH_REST_URL=https://your-search.upstash.io
UPSTASH_SEARCH_REST_TOKEN=your-search-token

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# AI (Grok)
XAI_API_KEY=your-xai-key

# PowerSync
POWERSYNC_URL=https://your-instance.powersync.co
POWERSYNC_TOKEN=your-token

# Wearables
WHOOP_CLIENT_ID=your-whoop-id
WHOOP_CLIENT_SECRET=your-whoop-secret
TERRA_API_KEY=your-terra-key

# Weather
OPENWEATHERMAP_API_KEY=your-owm-key
```

---

## Next Steps

1. Review and approve this plan
2. Create new Supabase project
3. Create Upstash Search indexes (exercises, exercise_cues, knowledge_base)
4. Create Upstash Redis database
5. Run Phase 1 SQL migrations
6. Begin implementing Phase 1 Drizzle schemas and routers

Ready to begin when you are.
