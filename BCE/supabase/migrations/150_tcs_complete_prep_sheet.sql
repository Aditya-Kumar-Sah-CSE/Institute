-- Migration 150: Complete TCS NQT Prep Sheet (47 Chapters, 1,427 MCQs, Passage Recall, Email Writing, 23 C++ Coding Labs) + 13 Full-Length TCS Pattern Mock Papers & Deep Analytics

-- 1. Extend coding_sheets.sheet_type constraint to allow 'TCS_PREP'
ALTER TABLE public.coding_sheets
  DROP CONSTRAINT IF EXISTS coding_sheets_sheet_type_check;

ALTER TABLE public.coding_sheets
  ADD CONSTRAINT coding_sheets_sheet_type_check CHECK (sheet_type IN ('DSA', 'SQL', 'ROADMAP', 'APTITUDE', 'TCS_PREP'));

-- 2. Syllabus Chapters (47 Chapters: 22 Quant, 16 Logical, 9 Verbal)
CREATE TABLE IF NOT EXISTS public.coding_sheet_tcs_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability')),
  question_count INTEGER NOT NULL DEFAULT 0,
  start_q INTEGER NOT NULL DEFAULT 1,
  end_q INTEGER NOT NULL DEFAULT 1,
  theory JSONB NOT NULL DEFAULT '[]'::jsonb,
  short_tricks JSONB NOT NULL DEFAULT '[]'::jsonb,
  solved_example TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_tcs_chapters_sheet_num ON public.coding_sheet_tcs_chapters(sheet_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_tcs_chapters_category ON public.coding_sheet_tcs_chapters(sheet_id, category);

ALTER TABLE public.coding_sheet_tcs_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TCS chapters readable by all" ON public.coding_sheet_tcs_chapters;
CREATE POLICY "TCS chapters readable by all"
  ON public.coding_sheet_tcs_chapters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage TCS chapters" ON public.coding_sheet_tcs_chapters;
CREATE POLICY "Staff manage TCS chapters"
  ON public.coding_sheet_tcs_chapters
  FOR ALL
  USING (public.can_create_learning_content())
  WITH CHECK (public.can_create_learning_content());

-- 3. Prep MCQs (1,427 MCQs across 47 chapters, incl. Ch 35 Non-Verbal diagram URLs)
CREATE TABLE IF NOT EXISTS public.coding_sheet_tcs_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  chapter_number INTEGER NOT NULL,
  chapter_question_number INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability')),
  section TEXT NOT NULL,
  chapter_title TEXT NOT NULL,
  level_label TEXT NOT NULL DEFAULT 'Basic',
  difficulty TEXT NOT NULL DEFAULT 'EASY' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_tcs_q_sheet_num ON public.coding_sheet_tcs_questions(sheet_id, question_number);
CREATE INDEX IF NOT EXISTS idx_tcs_q_sheet_ch ON public.coding_sheet_tcs_questions(sheet_id, chapter_number, chapter_question_number);
CREATE INDEX IF NOT EXISTS idx_tcs_q_sheet_cat ON public.coding_sheet_tcs_questions(sheet_id, category);

ALTER TABLE public.coding_sheet_tcs_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TCS questions readable by all" ON public.coding_sheet_tcs_questions;
CREATE POLICY "TCS questions readable by all"
  ON public.coding_sheet_tcs_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage TCS questions" ON public.coding_sheet_tcs_questions;
CREATE POLICY "Staff manage TCS questions"
  ON public.coding_sheet_tcs_questions
  FOR ALL
  USING (public.can_create_learning_content())
  WITH CHECK (public.can_create_learning_content());

-- 4. Interactive Drills (8 Passage Recall + 3 Email Writing + 23 C++ Coding = 34 Drills)
CREATE TABLE IF NOT EXISTS public.coding_sheet_tcs_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  drill_code TEXT NOT NULL,
  drill_type TEXT NOT NULL CHECK (drill_type IN ('PASSAGE_RECALL', 'EMAIL_WRITING', 'CODING')),
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  prompt TEXT NOT NULL,
  sample_input TEXT NOT NULL DEFAULT '',
  sample_output TEXT NOT NULL DEFAULT '',
  hint TEXT NOT NULL DEFAULT '',
  solution_text TEXT NOT NULL DEFAULT '',
  solution_code TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, drill_code)
);

CREATE INDEX IF NOT EXISTS idx_tcs_drills_sheet_order ON public.coding_sheet_tcs_drills(sheet_id, order_index);

ALTER TABLE public.coding_sheet_tcs_drills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TCS drills readable by all" ON public.coding_sheet_tcs_drills;
CREATE POLICY "TCS drills readable by all"
  ON public.coding_sheet_tcs_drills
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage TCS drills" ON public.coding_sheet_tcs_drills;
CREATE POLICY "Staff manage TCS drills"
  ON public.coding_sheet_tcs_drills
  FOR ALL
  USING (public.can_create_learning_content())
  WITH CHECK (public.can_create_learning_content());

-- 5. Full-Length TCS Pattern Mock Papers (Papers 1..13, each 81 items / 191 mins)
CREATE TABLE IF NOT EXISTS public.coding_sheet_tcs_mocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  paper_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  total_minutes INTEGER NOT NULL DEFAULT 191,
  total_items INTEGER NOT NULL DEFAULT 81,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, paper_number)
);

CREATE INDEX IF NOT EXISTS idx_tcs_mocks_sheet_paper ON public.coding_sheet_tcs_mocks(sheet_id, paper_number);

ALTER TABLE public.coding_sheet_tcs_mocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TCS mocks readable by all" ON public.coding_sheet_tcs_mocks;
CREATE POLICY "TCS mocks readable by all"
  ON public.coding_sheet_tcs_mocks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage TCS mocks" ON public.coding_sheet_tcs_mocks;
CREATE POLICY "Staff manage TCS mocks"
  ON public.coding_sheet_tcs_mocks
  FOR ALL
  USING (public.can_create_learning_content())
  WITH CHECK (public.can_create_learning_content());

-- 6. Per-user Prep Sheet Progress (MCQs + Passage Recall + Email Writing + C++ Coding)
CREATE TABLE IF NOT EXISTS public.coding_sheet_tcs_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('MCQ', 'PASSAGE_RECALL', 'EMAIL_WRITING', 'CODING')),
  is_solved BOOLEAN NOT NULL DEFAULT true,
  is_bookmarked BOOLEAN NOT NULL DEFAULT false,
  selected_option TEXT,
  submitted_text TEXT,
  submitted_code TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  solved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, user_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_tcs_progress_sheet_user ON public.coding_sheet_tcs_progress(sheet_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tcs_progress_user_solved ON public.coding_sheet_tcs_progress(user_id, is_solved);

ALTER TABLE public.coding_sheet_tcs_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TCS progress readable for stats" ON public.coding_sheet_tcs_progress;
CREATE POLICY "TCS progress readable for stats"
  ON public.coding_sheet_tcs_progress
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own TCS progress" ON public.coding_sheet_tcs_progress;
CREATE POLICY "Users insert own TCS progress"
  ON public.coding_sheet_tcs_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own TCS progress" ON public.coding_sheet_tcs_progress;
CREATE POLICY "Users update own TCS progress"
  ON public.coding_sheet_tcs_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own TCS progress" ON public.coding_sheet_tcs_progress;
CREATE POLICY "Users delete own TCS progress"
  ON public.coding_sheet_tcs_progress
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Full Mock Test Attempt History + Deep Analytics per Paper (1..13)
CREATE TABLE IF NOT EXISTS public.coding_sheet_tcs_mock_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paper_number INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'EXAM' CHECK (mode IN ('EXAM', 'PRACTICE')),
  total_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 81,
  mcq_correct INTEGER NOT NULL DEFAULT 0,
  mcq_wrong INTEGER NOT NULL DEFAULT 0,
  mcq_unattempted INTEGER NOT NULL DEFAULT 0,
  writing_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  coding_solved INTEGER NOT NULL DEFAULT 0,
  accuracy_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_time_sec INTEGER NOT NULL DEFAULT 0,
  section_stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  topic_stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tcs_mock_attempts_sheet_user ON public.coding_sheet_tcs_mock_attempts(sheet_id, user_id, paper_number, completed_at DESC);

ALTER TABLE public.coding_sheet_tcs_mock_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TCS mock attempts readable by owner or staff" ON public.coding_sheet_tcs_mock_attempts;
CREATE POLICY "TCS mock attempts readable by owner or staff"
  ON public.coding_sheet_tcs_mock_attempts
  FOR SELECT USING (auth.uid() = user_id OR public.can_create_learning_content());

DROP POLICY IF EXISTS "Users insert own TCS mock attempts" ON public.coding_sheet_tcs_mock_attempts;
CREATE POLICY "Users insert own TCS mock attempts"
  ON public.coding_sheet_tcs_mock_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own TCS mock attempts" ON public.coding_sheet_tcs_mock_attempts;
CREATE POLICY "Users update own TCS mock attempts"
  ON public.coding_sheet_tcs_mock_attempts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_tcs_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tcs_progress_touch_updated_at ON public.coding_sheet_tcs_progress;
CREATE TRIGGER tcs_progress_touch_updated_at
  BEFORE UPDATE ON public.coding_sheet_tcs_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_tcs_progress_updated_at();

