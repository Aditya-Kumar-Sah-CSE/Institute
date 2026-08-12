-- Personal Code Arena workspace. Public handles only; no OAuth tokens or credentials are stored.
CREATE TABLE IF NOT EXISTS public.student_code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled snippet',
  language TEXT NOT NULL CHECK (language IN ('cpp17', 'c', 'java', 'python', 'javascript')),
  source_code TEXT NOT NULL DEFAULT '',
  stdin TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_code_snippets_student_updated ON public.student_code_snippets(student_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.student_external_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('CODEFORCES', 'LEETCODE')),
  username TEXT NOT NULL,
  external_user_id TEXT,
  profile_url TEXT NOT NULL,
  rating INTEGER,
  max_rating INTEGER,
  rank TEXT,
  problems_solved INTEGER,
  easy_solved INTEGER,
  medium_solved INTEGER,
  hard_solved INTEGER,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(student_id, platform),
  UNIQUE(platform, username)
);
CREATE INDEX IF NOT EXISTS idx_student_external_accounts_student ON public.student_external_accounts(student_id);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'student_code_snippets_touch_updated_at') THEN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'code_arena_touch_updated_at') THEN
      CREATE TRIGGER student_code_snippets_touch_updated_at BEFORE UPDATE ON public.student_code_snippets FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();
    END IF;
  END IF;
END $$;

ALTER TABLE public.student_code_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_external_accounts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students manage their own code snippets') THEN
    CREATE POLICY "Students manage their own code snippets" ON public.student_code_snippets FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students manage their own coding accounts') THEN
    CREATE POLICY "Students manage their own coding accounts" ON public.student_external_accounts FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public coding accounts are visible') THEN
    CREATE POLICY "Public coding accounts are visible" ON public.student_external_accounts FOR SELECT USING (student_id = auth.uid() OR is_public = TRUE);
  END IF;
END $$;
