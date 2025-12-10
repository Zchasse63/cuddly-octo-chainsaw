-- ============================================
-- COACH-CLIENT RELATIONSHIP SCHEMA
-- ============================================
-- Migration to add coach-client relationship infrastructure
-- including assignment tracking, notes, and RLS policies.

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE coach_client_status AS ENUM ('pending', 'active', 'inactive', 'terminated');
CREATE TYPE coach_note_category AS ENUM ('general', 'workout', 'nutrition', 'injury', 'progress', 'goal', 'check_in');

-- ============================================
-- TABLES
-- ============================================

-- Coach-Client relationship assignments
CREATE TABLE coach_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationship parties
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Status workflow: pending → active → inactive/terminated
  status coach_client_status NOT NULL DEFAULT 'pending',
  
  -- Assignment metadata
  assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP,
  terminated_at TIMESTAMP,
  termination_reason TEXT,
  
  -- Coach's private notes about this relationship
  relationship_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Prevent duplicate assignments
  UNIQUE(coach_id, client_id)
);

-- Coach notes about clients
CREATE TABLE coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  title TEXT,
  content TEXT NOT NULL,
  category coach_note_category DEFAULT 'general',
  
  -- Organization
  is_pinned BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add coach columns to training_programs
ALTER TABLE training_programs
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS created_by_coach_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_coach_clients_coach_id ON coach_clients(coach_id);
CREATE INDEX idx_coach_clients_client_id ON coach_clients(client_id);
CREATE INDEX idx_coach_clients_status ON coach_clients(status);
CREATE INDEX idx_coach_clients_coach_status ON coach_clients(coach_id, status);

CREATE INDEX idx_coach_notes_coach_id ON coach_notes(coach_id);
CREATE INDEX idx_coach_notes_client_id ON coach_notes(client_id);
CREATE INDEX idx_coach_notes_coach_client ON coach_notes(coach_id, client_id);
CREATE INDEX idx_coach_notes_category ON coach_notes(category);

CREATE INDEX idx_training_programs_coach_id ON training_programs(created_by_coach_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_coach_clients_updated_at
  BEFORE UPDATE ON coach_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_notes_updated_at
  BEFORE UPDATE ON coach_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

-- Coach clients table policies
CREATE POLICY "Coaches can view own client list" ON coach_clients
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Clients can view own coach assignment" ON coach_clients
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Coaches can create client assignments" ON coach_clients
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own assignments" ON coach_clients
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own assignments" ON coach_clients
  FOR DELETE USING (auth.uid() = coach_id);

-- Coach notes table policies
CREATE POLICY "Coaches can view own notes" ON coach_notes
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create notes" ON coach_notes
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update own notes" ON coach_notes
  FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete own notes" ON coach_notes
  FOR DELETE USING (auth.uid() = coach_id);

-- ============================================
-- COACH ACCESS TO CLIENT DATA
-- ============================================
-- These policies extend existing tables to allow coaches
-- to view (SELECT only) their active clients' data.

-- Helper function to check if user is coach of a client
CREATE OR REPLACE FUNCTION is_coach_of(client_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM coach_clients
    WHERE coach_id = auth.uid()
      AND client_id = client_user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workouts: Coaches can view client workouts
CREATE POLICY "Coaches can view client workouts" ON workouts
  FOR SELECT USING (is_coach_of(user_id));

-- Workout sets: Coaches can view client workout sets
CREATE POLICY "Coaches can view client workout sets" ON workout_sets
  FOR SELECT USING (is_coach_of(user_id));

-- Personal records: Coaches can view client PRs
CREATE POLICY "Coaches can view client PRs" ON personal_records
  FOR SELECT USING (is_coach_of(user_id));

-- Readiness scores: Coaches can view client readiness
CREATE POLICY "Coaches can view client readiness" ON readiness_scores
  FOR SELECT USING (is_coach_of(user_id));

-- User profiles: Coaches can view client profiles
CREATE POLICY "Coaches can view client profiles" ON user_profiles
  FOR SELECT USING (is_coach_of(user_id));

-- Training programs: Coaches can view client programs
CREATE POLICY "Coaches can view client programs" ON training_programs
  FOR SELECT USING (is_coach_of(user_id));

-- Running activities: Coaches can view client runs
CREATE POLICY "Coaches can view client runs" ON running_activities
  FOR SELECT USING (is_coach_of(user_id));

-- Daily health metrics: Coaches can view client health data
CREATE POLICY "Coaches can view client health" ON daily_health_metrics
  FOR SELECT USING (is_coach_of(user_id));

-- Sleep sessions: Coaches can view client sleep
CREATE POLICY "Coaches can view client sleep" ON sleep_sessions
  FOR SELECT USING (is_coach_of(user_id));

-- Nutrition summaries: Coaches can view client nutrition
CREATE POLICY "Coaches can view client nutrition" ON nutrition_summaries
  FOR SELECT USING (is_coach_of(user_id));

-- Conversations: Coaches can view coach-type conversations with clients
CREATE POLICY "Coaches can view client coach conversations" ON conversations
  FOR SELECT USING (
    conversation_type = 'coach' AND is_coach_of(user_id)
  );

-- Messages: Coaches can view messages in coach conversations
CREATE POLICY "Coaches can view coach conversation messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.conversation_type = 'coach'
        AND is_coach_of(c.user_id)
    )
  );

-- Coaches can insert messages in coach conversations with their clients
CREATE POLICY "Coaches can send messages to clients" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.conversation_type = 'coach'
        AND is_coach_of(c.user_id)
    )
  );

