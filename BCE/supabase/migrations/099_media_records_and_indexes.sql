-- Migration: 099_media_records_and_indexes.sql
-- Description: Creates the media_records metadata table, performance indexes, and sets up RLS and policies for attachments storage.

-- 1. Create media_records table
CREATE TABLE IF NOT EXISTS public.media_records (
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_id UUID, -- reference to message_id, story_item_id, etc.
    storage_key TEXT NOT NULL,
    mime_type TEXT,
    size BIGINT,
    checksum TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.media_records ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for media_records
CREATE POLICY "Users can manage their own media records"
ON public.media_records
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

GRANT ALL ON public.media_records TO authenticated;

-- 3. Performance & Sync Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created 
    ON public.chat_messages(conversation_id, created_at DESC) 
    WHERE deleted_for_everyone = false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_sync_updated 
    ON public.chat_messages(conversation_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_items_expires_at 
    ON public.story_items(expires_at) 
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_records_owner_id ON public.media_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_records_entity_id ON public.media_records(entity_id);
CREATE INDEX IF NOT EXISTS idx_media_records_storage_key ON public.media_records(storage_key);
CREATE INDEX IF NOT EXISTS idx_media_records_expires_at ON public.media_records(expires_at);

-- 4. Provision attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies to avoid duplication errors
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Attachments Access" ON storage.objects;
  DROP POLICY IF EXISTS "Insert Attachments Access" ON storage.objects;
  DROP POLICY IF EXISTS "Delete Attachments Access" ON storage.objects;
END $$;

CREATE POLICY "Public Attachments Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

CREATE POLICY "Insert Attachments Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'attachments' );

CREATE POLICY "Delete Attachments Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'attachments' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() = owner) );
