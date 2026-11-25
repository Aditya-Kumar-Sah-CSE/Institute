-- ==========================================
-- COURSE MCQs & ENHANCED WORKBOOK METADATA
-- ==========================================

CREATE TABLE IF NOT EXISTS public.course_mcqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  question_text TEXT,
  question_image_url TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'scratch' CHECK (source_type IN ('image', 'scratch')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  competency_id UUID,
  topic_id UUID,
  difficulty TEXT DEFAULT 'medium',
  marks INT DEFAULT 1,
  category TEXT,
  explanation TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.course_mcqs DROP CONSTRAINT IF EXISTS course_mcqs_correct_option_check;
ALTER TABLE public.course_mcqs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.course_mcqs ADD COLUMN IF NOT EXISTS explanation TEXT;

CREATE TABLE IF NOT EXISTS public.course_mcq_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_mcqs_course_id ON public.course_mcqs(course_id);
CREATE INDEX IF NOT EXISTS idx_course_mcqs_course_cat ON public.course_mcqs(course_id, category, display_order);
CREATE INDEX IF NOT EXISTS idx_course_mcq_attempts_course_user ON public.course_mcq_attempts(course_id, user_id);

ALTER TABLE public.course_mcqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_mcq_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View active course MCQs" ON public.course_mcqs;
CREATE POLICY "View active course MCQs" ON public.course_mcqs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage course MCQs" ON public.course_mcqs;
CREATE POLICY "Manage course MCQs" ON public.course_mcqs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND lower(profiles.role) IN ('admin', 'super_admin', 'superadmin', 'instructor', 'developer')
    )
  );

DROP POLICY IF EXISTS "View own MCQ attempts" ON public.course_mcq_attempts;
CREATE POLICY "View own MCQ attempts" ON public.course_mcq_attempts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Insert own MCQ attempts" ON public.course_mcq_attempts;
CREATE POLICY "Insert own MCQ attempts" ON public.course_mcq_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

