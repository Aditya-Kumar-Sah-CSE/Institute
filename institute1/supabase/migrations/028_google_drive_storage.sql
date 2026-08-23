-- Migration: 028_google_drive_storage.sql
-- Description: Schema and RLS policies for 1-click Google Drive OAuth tokens and file metadata tracking.

CREATE TABLE IF NOT EXISTS public.user_google_drive_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    email TEXT NOT NULL,
    root_folder_id TEXT,
    subfolders JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_drive_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    google_drive_file_id TEXT NOT NULL,
    google_drive_folder_id TEXT,
    filename TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT DEFAULT 0,
    category TEXT DEFAULT 'Other',
    web_view_link TEXT,
    web_content_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_drive_files_user_id ON public.user_drive_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_drive_files_category ON public.user_drive_files(category);
CREATE INDEX IF NOT EXISTS idx_user_drive_files_drive_id ON public.user_drive_files(google_drive_file_id);

-- Enable RLS
ALTER TABLE public.user_google_drive_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drive_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_google_drive_tokens
CREATE POLICY "Users can manage their own Google Drive tokens"
    ON public.user_google_drive_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_drive_files
CREATE POLICY "Users can manage their own Drive files metadata"
    ON public.user_drive_files
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
