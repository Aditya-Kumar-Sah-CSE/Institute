-- ==========================================
-- UPDATE CHAT RLS POLICIES TO REFLECT NEW ROLES
-- ==========================================

DROP POLICY IF EXISTS "Admins can update conversations" ON chat_conversations;
CREATE POLICY "Admins can update conversations" ON chat_conversations
  FOR UPDATE USING (
    id IN (SELECT conversation_id FROM chat_members WHERE user_id = auth.uid() AND role IN ('founder', 'co-founder', 'admin'))
  );

DROP POLICY IF EXISTS "Users can update own membership or admins can update others" ON chat_members;
CREATE POLICY "Users can update own membership or admins can update others" ON chat_members
  FOR UPDATE USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM chat_members WHERE user_id = auth.uid() AND role IN ('founder', 'co-founder', 'admin'))
  );

DROP POLICY IF EXISTS "Users can leave or admins can remove" ON chat_members;
CREATE POLICY "Users can leave or admins can remove" ON chat_members
  FOR DELETE USING (
    user_id = auth.uid() OR
    conversation_id IN (SELECT conversation_id FROM chat_members WHERE user_id = auth.uid() AND role IN ('founder', 'co-founder', 'admin'))
  );
