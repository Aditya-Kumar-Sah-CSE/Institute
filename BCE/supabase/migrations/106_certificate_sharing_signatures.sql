-- 1. Modify certificates table to support Coding Battles and customization
ALTER TABLE public.certificates ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.certificates 
  ADD COLUMN IF NOT EXISTS battle_id UUID REFERENCES public.coding_battles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS certificate_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS accuracy NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signature_type TEXT NOT NULL DEFAULT 'default' CHECK (signature_type IN ('default', 'upload', 'draw')),
  ADD COLUMN IF NOT EXISTS signature_name TEXT DEFAULT 'Aditya Kumar Sah',
  ADD COLUMN IF NOT EXISTS signature_designation TEXT DEFAULT 'The Developer & The Coder',
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

-- Drop old check constraint if it exists and add nullable check
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS check_course_or_battle;
ALTER TABLE public.certificates ADD CONSTRAINT check_course_or_battle 
  CHECK (
    (course_id IS NOT NULL AND battle_id IS NULL) OR 
    (course_id IS NULL AND battle_id IS NOT NULL)
  );

-- Drop unique constraint that requires course_id and replace with flexible ones
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_user_id_course_id_key;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_user_course_unique UNIQUE (user_id, course_id);
ALTER TABLE public.certificates ADD CONSTRAINT certificates_user_battle_unique UNIQUE (user_id, battle_id);

-- Create public_share_tokens table for the 30-minute temporary public sharing system
CREATE TABLE IF NOT EXISTS public.public_share_tokens (
  token TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL, -- 'course', 'profile', 'coding_profile', 'badge', 'certificate'
  resource_id TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Enable RLS for public_share_tokens
ALTER TABLE public.public_share_tokens ENABLE ROW LEVEL SECURITY;

-- Select policy: public can select active non-expired share tokens
CREATE POLICY "Anyone can view active share tokens"
  ON public.public_share_tokens FOR SELECT
  USING (expires_at > NOW() AND revoked_at IS NULL);

-- Manage policy: creator can manage their tokens
CREATE POLICY "Users can manage their own share tokens"
  ON public.public_share_tokens FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create performance indexes for certificates and share tokens
CREATE INDEX IF NOT EXISTS idx_certificates_battle_id ON public.certificates(battle_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_share_tokens_resource ON public.public_share_tokens(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires_at ON public.public_share_tokens(expires_at);

-- Drop read RLS policy on certificates and make it viewable by public so verification and public share work
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
CREATE POLICY "Anyone can view certificates"
  ON public.certificates FOR SELECT
  USING (true);
