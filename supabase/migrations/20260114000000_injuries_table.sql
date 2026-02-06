-- Create injury severity enum
CREATE TYPE injury_severity AS ENUM ('minor', 'moderate', 'severe', 'chronic');

-- Create injury status enum
CREATE TYPE injury_status AS ENUM ('active', 'recovering', 'healed', 'chronic');

-- Create injuries table
CREATE TABLE IF NOT EXISTS injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Injury details
  name TEXT NOT NULL,
  body_part TEXT NOT NULL,
  side TEXT,
  description TEXT,

  -- Severity and status
  severity injury_severity DEFAULT 'minor',
  status injury_status DEFAULT 'active',

  -- Dates
  injury_date TIMESTAMP WITH TIME ZONE,
  expected_recovery_date TIMESTAMP WITH TIME ZONE,
  healed_date TIMESTAMP WITH TIME ZONE,

  -- Exercise modifications
  exercises_to_avoid TEXT[],
  movements_to_avoid TEXT[],
  recommended_exercises TEXT[],

  -- Medical info
  diagnosed_by TEXT,
  treatment_notes TEXT,
  physical_therapy_notes TEXT,

  -- Flags
  is_active BOOLEAN DEFAULT true,
  affects_workouts BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_injuries_user_id ON injuries(user_id);
CREATE INDEX idx_injuries_body_part ON injuries(body_part);
CREATE INDEX idx_injuries_status ON injuries(status);
CREATE INDEX idx_injuries_severity ON injuries(severity);
CREATE INDEX idx_injuries_is_active ON injuries(is_active);

-- Enable RLS
ALTER TABLE injuries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own injuries"
  ON injuries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own injuries"
  ON injuries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own injuries"
  ON injuries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own injuries"
  ON injuries FOR DELETE
  USING (auth.uid() = user_id);
