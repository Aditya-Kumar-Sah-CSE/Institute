-- Migration 098: Add is_pinned to chat_members for user-specific chat pinning
ALTER TABLE public.chat_members ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
