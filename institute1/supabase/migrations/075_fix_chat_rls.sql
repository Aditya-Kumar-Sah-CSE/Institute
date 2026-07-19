-- ==========================================
-- FIX MISSING RLS POLICIES FOR CHAT SYSTEM
-- ==========================================

-- chat_conversations policies
CREATE POLICY "Authenticated users can create conversations" ON chat_conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update conversations" ON chat_conversations
  FOR UPDATE USING (
    id IN (SELECT conversation_id FROM chat_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

-- chat_members policies
CREATE POLICY "Authenticated users can insert members" ON chat_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own membership or admins can update others" ON chat_members
  FOR UPDATE USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM chat_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "Users can leave or admins can remove" ON chat_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM chat_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))
  );
