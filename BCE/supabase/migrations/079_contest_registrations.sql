-- Create contest_registrations table for tracking verified contest registrations
CREATE TABLE IF NOT EXISTS contest_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  contest_id TEXT NOT NULL,
  registered BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'unverified', -- 'unverified', 'pending_verification', 'verifying', 'verified', 'failed'
  end_time TIMESTAMPTZ, -- Contest end time for automatic cleanup
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, platform, contest_id)
);

-- Index for fast user query & cleanup execution
CREATE INDEX IF NOT EXISTS idx_contest_registrations_user ON contest_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_registrations_platform_contest ON contest_registrations(platform, contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_registrations_end_time ON contest_registrations(end_time);

-- Enable RLS
ALTER TABLE contest_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own contest registrations"
  ON contest_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contest registrations"
  ON contest_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contest registrations"
  ON contest_registrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contest registrations"
  ON contest_registrations FOR DELETE
  USING (auth.uid() = user_id);
