-- Migration 145: TCS SQL Mastery Sheet (530+ MCQs & Step-by-Step Queries inside DSA Sheets)

-- 1. Extend coding_sheets with sheet_type and metadata
ALTER TABLE public.coding_sheets
  ADD COLUMN IF NOT EXISTS sheet_type TEXT NOT NULL DEFAULT 'DSA';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coding_sheets_sheet_type_check'
  ) THEN
    ALTER TABLE public.coding_sheets
      ADD CONSTRAINT coding_sheets_sheet_type_check CHECK (sheet_type IN ('DSA', 'SQL'));
  END IF;
END $$;

ALTER TABLE public.coding_sheets
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_coding_sheets_sheet_type ON public.coding_sheets(sheet_type);

-- 2. Create coding_sheet_sql_questions table
CREATE TABLE IF NOT EXISTS public.coding_sheet_sql_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('MCQ', 'QUERY')),
  section TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'EASY' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  question TEXT NOT NULL,
  options JSONB,
  correct_option TEXT,
  correct_answer TEXT,
  solution_sql TEXT,
  basic_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  incorrect_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  step_by_step JSONB NOT NULL DEFAULT '[]'::jsonb,
  clause_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_sql_questions_sheet_num ON public.coding_sheet_sql_questions(sheet_id, question_number);
CREATE INDEX IF NOT EXISTS idx_sql_questions_sheet_type ON public.coding_sheet_sql_questions(sheet_id, type);
CREATE INDEX IF NOT EXISTS idx_sql_questions_sheet_section ON public.coding_sheet_sql_questions(sheet_id, section);

ALTER TABLE public.coding_sheet_sql_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SQL sheet questions readable by all" ON public.coding_sheet_sql_questions;
CREATE POLICY "SQL sheet questions readable by all"
  ON public.coding_sheet_sql_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage SQL sheet questions" ON public.coding_sheet_sql_questions;
CREATE POLICY "Staff manage SQL sheet questions"
  ON public.coding_sheet_sql_questions
  FOR ALL
  USING (public.can_create_learning_content())
  WITH CHECK (public.can_create_learning_content());

-- 3. Create coding_sheet_sql_progress table
CREATE TABLE IF NOT EXISTS public.coding_sheet_sql_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('MCQ', 'QUERY')),
  is_solved BOOLEAN NOT NULL DEFAULT true,
  is_bookmarked BOOLEAN NOT NULL DEFAULT false,
  selected_option TEXT,
  submitted_sql TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  solved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, user_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_sql_progress_sheet_user ON public.coding_sheet_sql_progress(sheet_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sql_progress_user_solved ON public.coding_sheet_sql_progress(user_id, is_solved);

ALTER TABLE public.coding_sheet_sql_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SQL progress readable for stats" ON public.coding_sheet_sql_progress;
CREATE POLICY "SQL progress readable for stats"
  ON public.coding_sheet_sql_progress
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own SQL progress" ON public.coding_sheet_sql_progress;
CREATE POLICY "Users insert own SQL progress"
  ON public.coding_sheet_sql_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own SQL progress" ON public.coding_sheet_sql_progress;
CREATE POLICY "Users update own SQL progress"
  ON public.coding_sheet_sql_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own SQL progress" ON public.coding_sheet_sql_progress;
CREATE POLICY "Users delete own SQL progress"
  ON public.coding_sheet_sql_progress
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS sql_progress_touch_updated_at ON public.coding_sheet_sql_progress;
CREATE TRIGGER sql_progress_touch_updated_at
  BEFORE UPDATE ON public.coding_sheet_sql_progress
  FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();

NOTIFY pgrst, 'reload schema';

