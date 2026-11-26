-- Migration 149: Placement Aptitude Mastery Sheet (29 Chapters, 1,139 Practice MCQs, Theory, Short Tricks & Solved Examples)

-- 1. Extend coding_sheets.sheet_type constraint to allow 'APTITUDE'
ALTER TABLE public.coding_sheets
  DROP CONSTRAINT IF EXISTS coding_sheets_sheet_type_check;

ALTER TABLE public.coding_sheets
  ADD CONSTRAINT coding_sheets_sheet_type_check CHECK (sheet_type IN ('DSA', 'SQL', 'ROADMAP', 'APTITUDE'));

-- 2. Chapters table (29 Chapters with Theory, Short Tricks & Solved Examples)
CREATE TABLE IF NOT EXISTS public.coding_sheet_aptitude_chapters (
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

CREATE INDEX IF NOT EXISTS idx_aptitude_chapters_sheet_num ON public.coding_sheet_aptitude_chapters(sheet_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_aptitude_chapters_category ON public.coding_sheet_aptitude_chapters(sheet_id, category);

ALTER TABLE public.coding_sheet_aptitude_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aptitude chapters readable by all" ON public.coding_sheet_aptitude_chapters;
CREATE POLICY "Aptitude chapters readable by all"
  ON public.coding_sheet_aptitude_chapters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage aptitude chapters" ON public.coding_sheet_aptitude_chapters;
CREATE POLICY "Staff manage aptitude chapters"
  ON public.coding_sheet_aptitude_chapters
  FOR ALL
  USING (public.can_create_learning_content())
  WITH CHECK (public.can_create_learning_content());

-- 3. Questions table (1,139 MCQs with options, answer & step-by-step explanation)
CREATE TABLE IF NOT EXISTS public.coding_sheet_aptitude_questions (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_aptitude_q_sheet_num ON public.coding_sheet_aptitude_questions(sheet_id, question_number);
CREATE INDEX IF NOT EXISTS idx_aptitude_q_sheet_ch ON public.coding_sheet_aptitude_questions(sheet_id, chapter_number, chapter_question_number);
CREATE INDEX IF NOT EXISTS idx_aptitude_q_sheet_cat ON public.coding_sheet_aptitude_questions(sheet_id, category);

ALTER TABLE public.coding_sheet_aptitude_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aptitude questions readable by all" ON public.coding_sheet_aptitude_questions;
CREATE POLICY "Aptitude questions readable by all"
  ON public.coding_sheet_aptitude_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage aptitude questions" ON public.coding_sheet_aptitude_questions;
CREATE POLICY "Staff manage aptitude questions"
  ON public.coding_sheet_aptitude_questions
  FOR ALL
  USING (public.can_create_learning_content())
  WITH CHECK (public.can_create_learning_content());

-- 4. Per-user Aptitude progress, bookmarks & XP tracking
CREATE TABLE IF NOT EXISTS public.coding_sheet_aptitude_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  is_solved BOOLEAN NOT NULL DEFAULT true,
  is_bookmarked BOOLEAN NOT NULL DEFAULT false,
  selected_option TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  solved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sheet_id, user_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_aptitude_progress_sheet_user ON public.coding_sheet_aptitude_progress(sheet_id, user_id);
CREATE INDEX IF NOT EXISTS idx_aptitude_progress_user_solved ON public.coding_sheet_aptitude_progress(user_id, is_solved);

ALTER TABLE public.coding_sheet_aptitude_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aptitude progress readable for stats" ON public.coding_sheet_aptitude_progress;
CREATE POLICY "Aptitude progress readable for stats"
  ON public.coding_sheet_aptitude_progress
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own aptitude progress" ON public.coding_sheet_aptitude_progress;
CREATE POLICY "Users insert own aptitude progress"
  ON public.coding_sheet_aptitude_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own aptitude progress" ON public.coding_sheet_aptitude_progress;
CREATE POLICY "Users update own aptitude progress"
  ON public.coding_sheet_aptitude_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own aptitude progress" ON public.coding_sheet_aptitude_progress;
CREATE POLICY "Users delete own aptitude progress"
  ON public.coding_sheet_aptitude_progress
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS aptitude_progress_touch_updated_at ON public.coding_sheet_aptitude_progress;
CREATE TRIGGER aptitude_progress_touch_updated_at
  BEFORE UPDATE ON public.coding_sheet_aptitude_progress
  FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();

NOTIFY pgrst, 'reload schema';

