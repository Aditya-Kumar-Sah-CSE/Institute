-- Migration 098: Multi-Tenant Data Isolation & Verified Contest Registrations for Smart Learn SaaS

-- 1. Create contest_registrations table with mandatory institution_id isolation
CREATE TABLE IF NOT EXISTS contest_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  contest_id TEXT NOT NULL,
  registered BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'unverified', -- 'unverified', 'pending_verification', 'verifying', 'verified', 'failed'
  end_time TIMESTAMPTZ, -- Contest end time for 2-hour post-contest auto cleanup
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (institution_id, user_id, platform, contest_id)
);

-- Composite Performance Indexes for High Scale (100k+ Students)
CREATE INDEX IF NOT EXISTS idx_contest_reg_tenant_user ON contest_registrations(institution_id, user_id);
CREATE INDEX IF NOT EXISTS idx_contest_reg_platform_contest ON contest_registrations(institution_id, platform, contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_reg_end_time ON contest_registrations(end_time);

-- Enable RLS on contest_registrations
ALTER TABLE contest_registrations ENABLE ROW LEVEL SECURITY;

-- Tenant RLS Policies
DROP POLICY IF EXISTS "Tenant Isolation: View Contest Registrations" ON contest_registrations;
CREATE POLICY "Tenant Isolation: View Contest Registrations"
  ON contest_registrations FOR SELECT
  USING (
    user_id = auth.uid()
    AND institution_id = COALESCE(
      (SELECT institution_id FROM profiles WHERE id = auth.uid()),
      institution_id
    )
  );

DROP POLICY IF EXISTS "Tenant Isolation: Insert Contest Registrations" ON contest_registrations;
CREATE POLICY "Tenant Isolation: Insert Contest Registrations"
  ON contest_registrations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND institution_id = COALESCE(
      (SELECT institution_id FROM profiles WHERE id = auth.uid()),
      institution_id
    )
  );

DROP POLICY IF EXISTS "Tenant Isolation: Update Contest Registrations" ON contest_registrations;
CREATE POLICY "Tenant Isolation: Update Contest Registrations"
  ON contest_registrations FOR UPDATE
  USING (
    user_id = auth.uid()
    AND institution_id = COALESCE(
      (SELECT institution_id FROM profiles WHERE id = auth.uid()),
      institution_id
    )
  );

DROP POLICY IF EXISTS "Tenant Isolation: Delete Contest Registrations" ON contest_registrations;
CREATE POLICY "Tenant Isolation: Delete Contest Registrations"
  ON contest_registrations FOR DELETE
  USING (
    user_id = auth.uid()
    AND institution_id = COALESCE(
      (SELECT institution_id FROM profiles WHERE id = auth.uid()),
      institution_id
    )
  );

-- 2. Ensure institution_id isolation on chat_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_conversations' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE chat_conversations ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_institution ON chat_conversations(institution_id, id);

-- 3. Ensure institution_id isolation on code_arena_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'code_arena_submissions' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE code_arena_submissions ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_code_arena_submissions_institution ON code_arena_submissions(institution_id, user_id);
