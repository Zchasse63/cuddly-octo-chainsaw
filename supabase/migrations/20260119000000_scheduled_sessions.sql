-- Create scheduled_sessions table for coach session scheduling
CREATE TABLE IF NOT EXISTS scheduled_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  session_type TEXT NOT NULL CHECK (session_type IN ('check-in', 'workout-review', 'planning', 'other')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_scheduled_sessions_coach_id ON scheduled_sessions(coach_id);
CREATE INDEX idx_scheduled_sessions_client_id ON scheduled_sessions(client_id);
CREATE INDEX idx_scheduled_sessions_scheduled_at ON scheduled_sessions(scheduled_at);
CREATE INDEX idx_scheduled_sessions_status ON scheduled_sessions(status);
CREATE INDEX idx_scheduled_sessions_coach_scheduled ON scheduled_sessions(coach_id, scheduled_at, status);

-- Add RLS policies
ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own sessions"
  ON scheduled_sessions FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = client_id);

CREATE POLICY "Coaches can insert sessions for clients"
  ON scheduled_sessions FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own sessions"
  ON scheduled_sessions FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own sessions"
  ON scheduled_sessions FOR DELETE
  USING (auth.uid() = coach_id);
