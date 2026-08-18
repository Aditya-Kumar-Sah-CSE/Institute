-- ==========================================
-- Migration 096: RLS Policies for message_reactions
-- ==========================================

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS message_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone view message reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users insert message reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users delete message reactions" ON message_reactions;

-- Allow authenticated users to view message reactions
CREATE POLICY "Anyone view message reactions" ON message_reactions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert their own message reactions
CREATE POLICY "Users insert message reactions" ON message_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to delete their own message reactions
CREATE POLICY "Users delete message reactions" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());
