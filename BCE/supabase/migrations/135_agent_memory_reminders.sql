-- Agent Persistent Memory & Reminders
-- Migration: 135_agent_memory_reminders.sql

-- Agent memory table for persistent fact storage
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent reminders table
CREATE TABLE IF NOT EXISTS agent_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  trigger_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'triggered', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performant querying
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_id ON agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user_category ON agent_memory(user_id, category);
CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON agent_memory(user_id, key);
CREATE INDEX IF NOT EXISTS idx_agent_reminders_user_id ON agent_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_reminders_trigger ON agent_reminders(user_id, status, trigger_at);

-- RLS policies
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reminders ENABLE ROW LEVEL SECURITY;

-- Users can only access their own memory and reminders
CREATE POLICY "Users can read own memory" ON agent_memory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory" ON agent_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memory" ON agent_memory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory" ON agent_memory
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own reminders" ON agent_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" ON agent_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON agent_reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON agent_reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for server-side agent operations
CREATE POLICY "Service role full access memory" ON agent_memory
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access reminders" ON agent_reminders
  FOR ALL USING (auth.role() = 'service_role');
