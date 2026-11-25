-- Migration 146: DSA Roadmap Mastery Sheet (Extensible Levels 1-5: ~520 Problems, Hinglish Theory, Brute vs Optimal, Revision & C++ Sandbox)

-- 1. Allow 'ROADMAP' in coding_sheets.sheet_type
ALTER TABLE public.coding_sheets
  ADD COLUMN IF NOT EXISTS sheet_type TEXT NOT NULL DEFAULT 'DSA';

ALTER TABLE public.coding_sheets
  DROP CONSTRAINT IF EXISTS coding_sheets_sheet_type_check;

ALTER TABLE public.coding_sheets
  ADD CONSTRAINT coding_sheets_sheet_type_check CHECK (sheet_type IN ('DSA', 'SQL', 'ROADMAP'));

ALTER TABLE public.coding_sheets
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_coding_sheets_sheet_type ON public.coding_sheets(sheet_type);

-- 2. Level metadata, Hinglish theory modules & level revision data
CREATE TABLE IF NOT EXISTS public.coding_sheet_roadmap_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 10),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  target_problem_count INTEGER NOT NULL DEFAULT 0,
  is_unlocked BOOLEAN NOT NULL DEFAULT true,
  theory_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, level_number)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_levels_sheet_num ON public.coding_sheet_roadmap_levels(sheet_id, level_number);

ALTER TABLE public.coding_sheet_roadmap_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roadmap levels readable by all" ON public.coding_sheet_roadmap_levels;
CREATE POLICY "Roadmap levels readable by all"
  ON public.coding_sheet_roadmap_levels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage roadmap levels" ON public.coding_sheet_roadmap_levels;
CREATE POLICY "Staff manage roadmap levels"
  ON public.coding_sheet_roadmap_levels
  FOR ALL
  USING (public.can_create_learning_content())
  WITH CHECK (public.can_create_learning_content());

DROP TRIGGER IF EXISTS roadmap_levels_touch_updated_at ON public.coding_sheet_roadmap_levels;
CREATE TRIGGER roadmap_levels_touch_updated_at
  BEFORE UPDATE ON public.coding_sheet_roadmap_levels
  FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();

-- 3. Problems table for Roadmap sheets (L1-001..L5-xxx)
CREATE TABLE IF NOT EXISTS public.coding_sheet_roadmap_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  problem_code TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  level_number INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 10),
  batch_name TEXT,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'EASY' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  company_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  problem_statement TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  theory TEXT NOT NULL DEFAULT '',
  brute_force JSONB NOT NULL DEFAULT '{}'::jsonb,
  optimized JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation TEXT NOT NULL DEFAULT '',
  edge_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, problem_code)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_problems_sheet_order ON public.coding_sheet_roadmap_problems(sheet_id, order_index);
CREATE INDEX IF NOT EXISTS idx_roadmap_problems_sheet_level ON public.coding_sheet_roadmap_problems(sheet_id, level_number, order_index);
CREATE INDEX IF NOT EXISTS idx_roadmap_problems_sheet_topic ON public.coding_sheet_roadmap_problems(sheet_id, topic);

ALTER TABLE public.coding_sheet_roadmap_problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roadmap problems readable by all" ON public.coding_sheet_roadmap_problems;
CREATE POLICY "Roadmap problems readable by all"
  ON public.coding_sheet_roadmap_problems
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage roadmap problems" ON public.coding_sheet_roadmap_problems;
CREATE POLICY "Staff manage roadmap problems"
  ON public.coding_sheet_roadmap_problems
  FOR ALL
  USING (public.can_create_learning_content())
  WITH CHECK (public.can_create_learning_content());

-- 4. Per-user progress, code saves, bookmarks, revision toggles, and XP tracking
CREATE TABLE IF NOT EXISTS public.coding_sheet_roadmap_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_code TEXT NOT NULL,
  level_number INTEGER NOT NULL DEFAULT 1,
  is_solved BOOLEAN NOT NULL DEFAULT false,
  is_revised BOOLEAN NOT NULL DEFAULT false,
  is_bookmarked BOOLEAN NOT NULL DEFAULT false,
  submitted_code TEXT,
  language TEXT NOT NULL DEFAULT 'cpp17',
  attempts INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  solved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, user_id, problem_code)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_progress_sheet_user ON public.coding_sheet_roadmap_progress(sheet_id, user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_progress_user_solved ON public.coding_sheet_roadmap_progress(user_id, is_solved);

ALTER TABLE public.coding_sheet_roadmap_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roadmap progress readable for stats" ON public.coding_sheet_roadmap_progress;
CREATE POLICY "Roadmap progress readable for stats"
  ON public.coding_sheet_roadmap_progress
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own roadmap progress" ON public.coding_sheet_roadmap_progress;
CREATE POLICY "Users insert own roadmap progress"
  ON public.coding_sheet_roadmap_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own roadmap progress" ON public.coding_sheet_roadmap_progress;
CREATE POLICY "Users update own roadmap progress"
  ON public.coding_sheet_roadmap_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own roadmap progress" ON public.coding_sheet_roadmap_progress;
CREATE POLICY "Users delete own roadmap progress"
  ON public.coding_sheet_roadmap_progress
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS roadmap_progress_touch_updated_at ON public.coding_sheet_roadmap_progress;
CREATE TRIGGER roadmap_progress_touch_updated_at
  BEFORE UPDATE ON public.coding_sheet_roadmap_progress
  FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();

NOTIFY pgrst, 'reload schema';

