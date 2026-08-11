-- ==========================================
-- Migration 081: Fix RLS Policy for chat_conversations INSERT and SELECT
-- ==========================================

-- Ensure INSERT policy exists for authenticated users
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.chat_conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.chat_conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update SELECT policy so creator can SELECT the newly inserted conversation before members are added
DROP POLICY IF EXISTS "Conversations viewable by members" ON public.chat_conversations;
CREATE POLICY "Conversations viewable by members" ON public.chat_conversations
  FOR SELECT USING (
    created_by = auth.uid() OR public.is_chat_member(id, auth.uid())
  );
