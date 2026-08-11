-- Add missing INSERT policy for chat_conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON chat_conversations;
CREATE POLICY "Authenticated users can create conversations" ON chat_conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add missing INSERT policy for chat_members
DROP POLICY IF EXISTS "Authenticated users can add members" ON chat_members;
CREATE POLICY "Authenticated users can add members" ON chat_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
