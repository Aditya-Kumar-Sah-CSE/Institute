-- Migration: 113_monthly_coding_ranking.sql
-- Description: Adds student_completed_problems table, updates monthly_rewards table, and upgrades the monthly winners calculation RPC.

-- 1. Create table for tracking unique solved problems across platforms
CREATE TABLE IF NOT EXISTS public.student_completed_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('SMART_LEARN', 'LEETCODE', 'CODECHEF')),
  problem_id TEXT NOT NULL, -- problem slug or id
  solved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, platform, problem_id)
);

-- Optimize queries for monthly ranges and student lookups
CREATE INDEX IF NOT EXISTS idx_student_completed_problems_range 
  ON public.student_completed_problems(solved_at, student_id);

-- Enable Row Level Security
ALTER TABLE public.student_completed_problems ENABLE ROW LEVEL SECURITY;

-- Policies for student_completed_problems
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can view own completed problems') THEN
    CREATE POLICY "Students can view own completed problems" ON public.student_completed_problems
      FOR SELECT USING (student_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view any completed problems if public') THEN
    CREATE POLICY "Users can view any completed problems if public" ON public.student_completed_problems
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.student_external_accounts
          WHERE student_external_accounts.student_id = student_completed_problems.student_id
            AND student_external_accounts.is_public = TRUE
        ) OR student_id = auth.uid()
      );
  END IF;
END $$;

-- 2. Add problems_solved column to monthly_rewards table
ALTER TABLE public.monthly_rewards 
  ADD COLUMN IF NOT EXISTS problems_solved INTEGER DEFAULT 0;

-- 3. Backfill historic local Smart Learn (BCE) accepted submissions
INSERT INTO public.student_completed_problems (student_id, platform, problem_id, solved_at)
SELECT DISTINCT student_id, 'SMART_LEARN', problem_id, created_at
FROM public.coding_submissions
WHERE status = 'ACCEPTED'
ON CONFLICT (student_id, platform, problem_id) DO NOTHING;

-- 4. Backfill LeetCode from metadata history if available
INSERT INTO public.student_completed_problems (student_id, platform, problem_id, solved_at)
SELECT 
  student_id,
  'LEETCODE',
  (sub->>'slug') as problem_id,
  COALESCE(to_timestamp((sub->>'time')::numeric / 1000), connected_at) as solved_at
FROM public.student_external_accounts,
jsonb_array_elements(metadata->'recent_submissions') as sub
WHERE platform = 'LEETCODE'
  AND sub->>'slug' IS NOT NULL
ON CONFLICT (student_id, platform, problem_id) DO NOTHING;

-- 5. Upgrade Function to compute winners based on coding performance
CREATE OR REPLACE FUNCTION get_and_award_last_month_winners()
RETURNS VOID AS $$
DECLARE
  v_target_month DATE;
  v_winners_exist BOOLEAN;
BEGIN
  -- We use date_trunc('month', NOW() - INTERVAL '1 month') because the reward awarded
  -- represents the winner for the PREVIOUS calendar month.
  v_target_month := date_trunc('month', NOW() - INTERVAL '1 month')::DATE;

  -- Check if winners for this month are already computed
  SELECT EXISTS (
    SELECT 1 FROM monthly_rewards WHERE month_date = v_target_month
  ) INTO v_winners_exist;

  -- If not computed, compute and insert top 10 based on solved count in that month
  IF NOT v_winners_exist THEN
    INSERT INTO monthly_rewards (user_id, month_date, rank, problems_solved)
    SELECT 
      p.id as user_id,
      v_target_month,
      row_number() OVER (ORDER BY COUNT(cp.id) DESC, p.created_at ASC) as rank,
      COUNT(cp.id) as problems_solved
    FROM profiles p
    JOIN student_completed_problems cp ON p.id = cp.student_id
    WHERE p.role = 'student'
      AND p.email != 'iambestadi@gmail.com'
      AND cp.solved_at >= v_target_month
      AND cp.solved_at < v_target_month + INTERVAL '1 month'
    GROUP BY p.id, p.created_at
    HAVING COUNT(cp.id) > 0
    ORDER BY COUNT(cp.id) DESC, p.created_at ASC
    LIMIT 10;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear previous wrong XP-based rewards for current/previous month to force recalculation
DELETE FROM monthly_rewards 
WHERE month_date = date_trunc('month', NOW() - INTERVAL '1 month')::DATE
   OR month_date = date_trunc('month', NOW())::DATE;
