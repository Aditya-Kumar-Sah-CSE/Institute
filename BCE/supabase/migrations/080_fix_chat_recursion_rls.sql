-- ==========================================
-- Migration 080: Fix Infinite Recursion in chat_members RLS Policies
-- ==========================================

-- 1. Helper SECURITY DEFINER functions to bypass RLS recursion
CREATE OR REPLACE FUNCTION public.is_chat_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE conversation_id = p_conversation_id 
      AND user_id = p_user_id 
      AND (role IS NULL OR role != 'pending')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_chat_admin(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE conversation_id = p_conversation_id 
      AND user_id = p_user_id 
      AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.is_chat_member(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_chat_admin(UUID, UUID) TO authenticated, anon;

-- 2. Drop existing recursive policies on chat_members
DROP POLICY IF EXISTS "Members can view participants" ON public.chat_members;
DROP POLICY IF EXISTS "Users can update own membership or admins can update others" ON public.chat_members;
DROP POLICY IF EXISTS "Users can leave or admins can remove" ON public.chat_members;

-- Re-create clean non-recursive policies on chat_members
CREATE POLICY "Members can view participants" ON public.chat_members
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_chat_member(conversation_id, auth.uid())
  );

CREATE POLICY "Users can update own membership or admins can update others" ON public.chat_members
  FOR UPDATE USING (
    user_id = auth.uid() OR public.is_chat_admin(conversation_id, auth.uid())
  );

CREATE POLICY "Users can leave or admins can remove" ON public.chat_members
  FOR DELETE USING (
    user_id = auth.uid() OR public.is_chat_admin(conversation_id, auth.uid())
  );


-- 3. Drop existing recursive policies on chat_conversations
DROP POLICY IF EXISTS "Conversations viewable by members" ON public.chat_conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON public.chat_conversations;

CREATE POLICY "Conversations viewable by members" ON public.chat_conversations
  FOR SELECT USING (
    public.is_chat_member(id, auth.uid())
  );

CREATE POLICY "Admins can update conversations" ON public.chat_conversations
  FOR UPDATE USING (
    public.is_chat_admin(id, auth.uid())
  );


-- 4. Drop existing recursive policies on chat_messages
DROP POLICY IF EXISTS "Members can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members can insert messages" ON public.chat_messages;

CREATE POLICY "Members can view messages" ON public.chat_messages
  FOR SELECT USING (
    public.is_chat_member(conversation_id, auth.uid())
  );

CREATE POLICY "Members can insert messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND public.is_chat_member(conversation_id, auth.uid())
  );
