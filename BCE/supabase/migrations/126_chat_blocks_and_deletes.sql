-- Migration for Chat Blocking and Deletion
CREATE TABLE IF NOT EXISTS chat_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- RLS for chat_blocks
ALTER TABLE chat_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blocks involving them" ON chat_blocks
  FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can block others" ON chat_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others" ON chat_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- RLS for chat_conversations Deletion
-- A user can delete a conversation if:
-- 1. It is a personal chat and they are a member.
-- 2. It is a group chat and they are the owner or an admin.
CREATE POLICY "Users can delete chats they own or are part of" ON chat_conversations
  FOR DELETE USING (
    id IN (
      SELECT conversation_id FROM chat_members 
      WHERE user_id = auth.uid() AND (
        (SELECT type FROM chat_conversations c WHERE c.id = chat_members.conversation_id) = 'personal' 
        OR role IN ('owner', 'admin')
      )
    )
  );

-- Helper function to check if two users are blocked
CREATE OR REPLACE FUNCTION is_chat_blocked(user1 UUID, user2 UUID) RETURNS BOOLEAN AS $$
DECLARE
  is_blocked BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM chat_blocks 
    WHERE (blocker_id = user1 AND blocked_id = user2) 
       OR (blocker_id = user2 AND blocked_id = user1)
  ) INTO is_blocked;
  RETURN is_blocked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
