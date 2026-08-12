-- BCE Code Arena: secure metadata, submissions, battles and realtime foundation.
-- Existing profiles are reused. `batch_id` maps to profiles.graduation_period because BCE has no batches table.

CREATE TABLE public.coding_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  constraints TEXT,
  input_format TEXT,
  output_format TEXT,
  explanation TEXT,
  time_limit_ms INTEGER NOT NULL DEFAULT 2000 CHECK (time_limit_ms > 0),
  memory_limit_mb INTEGER NOT NULL DEFAULT 256 CHECK (memory_limit_mb > 0),
  supported_languages TEXT[] NOT NULL DEFAULT ARRAY['cpp17', 'c', 'java', 'python', 'javascript'],
  source_type TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (source_type IN ('INTERNAL', 'CODEFORCES', 'LEETCODE')),
  external_platform TEXT,
  external_problem_id TEXT,
  external_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (external_platform, external_problem_id)
);

CREATE TABLE public.coding_problem_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  sample_name TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.coding_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  batch_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

CREATE TABLE public.coding_battle_problems (
  battle_id UUID NOT NULL REFERENCES public.coding_battles(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE RESTRICT,
  points INTEGER NOT NULL DEFAULT 100 CHECK (points > 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (battle_id, problem_id)
);

CREATE TABLE public.coding_battle_participants (
  battle_id UUID NOT NULL REFERENCES public.coding_battles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  rank INTEGER,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  PRIMARY KEY (battle_id, student_id)
);

CREATE TABLE public.coding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  battle_id UUID REFERENCES public.coding_battles(id) ON DELETE SET NULL,
  language TEXT NOT NULL,
  source_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'ACCEPTED', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'SYSTEM_ERROR')),
  score INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  memory_used_mb INTEGER,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  total_tests INTEGER NOT NULL DEFAULT 0,
  compiler_output TEXT,
  runtime_output TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coding_problems_created_by ON public.coding_problems(created_by);
CREATE INDEX idx_coding_problems_source_type ON public.coding_problems(source_type);
CREATE INDEX idx_coding_problem_test_cases_problem_id ON public.coding_problem_test_cases(problem_id);
CREATE INDEX idx_coding_battles_created_by ON public.coding_battles(created_by);
CREATE INDEX idx_coding_battles_status ON public.coding_battles(status);
CREATE INDEX idx_coding_battle_participants_battle_id ON public.coding_battle_participants(battle_id);
CREATE INDEX idx_coding_battle_participants_student_id ON public.coding_battle_participants(student_id);
CREATE INDEX idx_coding_submissions_student_id ON public.coding_submissions(student_id);
CREATE INDEX idx_coding_submissions_problem_id ON public.coding_submissions(problem_id);
CREATE INDEX idx_coding_submissions_battle_id ON public.coding_submissions(battle_id);
CREATE INDEX idx_coding_submissions_created_at ON public.coding_submissions(created_at DESC);

CREATE OR REPLACE FUNCTION public.code_arena_is_instructor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer') AND COALESCE(status, 'active') = 'active');
$$;

CREATE OR REPLACE FUNCTION public.code_arena_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER coding_problems_touch_updated_at BEFORE UPDATE ON public.coding_problems FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();
CREATE TRIGGER coding_battles_touch_updated_at BEFORE UPDATE ON public.coding_battles FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();

ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_problem_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_battle_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Code Arena published problems readable" ON public.coding_problems FOR SELECT USING (is_published OR created_by = auth.uid() OR public.code_arena_is_instructor());
CREATE POLICY "Code Arena instructors manage owned problems" ON public.coding_problems FOR ALL USING (created_by = auth.uid() OR public.code_arena_is_instructor()) WITH CHECK (public.code_arena_is_instructor() AND created_by = auth.uid());
CREATE POLICY "Code Arena visible test cases only" ON public.coding_problem_test_cases FOR SELECT USING (NOT is_hidden AND EXISTS (SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND p.is_published) OR EXISTS (SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND (p.created_by = auth.uid() OR public.code_arena_is_instructor())));
CREATE POLICY "Code Arena instructors manage owned test cases" ON public.coding_problem_test_cases FOR ALL USING (EXISTS (SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND (p.created_by = auth.uid() OR public.code_arena_is_instructor()))) WITH CHECK (EXISTS (SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND p.created_by = auth.uid() AND public.code_arena_is_instructor()));
CREATE POLICY "Code Arena battles visible to faculty and participants" ON public.coding_battles FOR SELECT USING (public.code_arena_is_instructor() OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.coding_battle_participants bp WHERE bp.battle_id = id AND bp.student_id = auth.uid()));
CREATE POLICY "Code Arena instructors manage owned battles" ON public.coding_battles FOR ALL USING (created_by = auth.uid() OR public.code_arena_is_instructor()) WITH CHECK (public.code_arena_is_instructor() AND created_by = auth.uid());
CREATE POLICY "Code Arena battle problems readable with battle" ON public.coding_battle_problems FOR SELECT USING (EXISTS (SELECT 1 FROM public.coding_battles b WHERE b.id = battle_id AND (public.code_arena_is_instructor() OR b.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.coding_battle_participants bp WHERE bp.battle_id = b.id AND bp.student_id = auth.uid()))));
CREATE POLICY "Code Arena instructors manage battle problems" ON public.coding_battle_problems FOR ALL USING (EXISTS (SELECT 1 FROM public.coding_battles b WHERE b.id = battle_id AND b.created_by = auth.uid() AND public.code_arena_is_instructor())) WITH CHECK (EXISTS (SELECT 1 FROM public.coding_battles b WHERE b.id = battle_id AND b.created_by = auth.uid() AND public.code_arena_is_instructor()));
CREATE POLICY "Code Arena participants view battle roster" ON public.coding_battle_participants FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.coding_battles b WHERE b.id = battle_id AND (b.created_by = auth.uid() OR public.code_arena_is_instructor())));
CREATE POLICY "Code Arena participants join assigned battles" ON public.coding_battle_participants FOR INSERT WITH CHECK (student_id = auth.uid() AND (SELECT COUNT(*) FROM public.coding_battle_participants bp WHERE bp.battle_id = coding_battle_participants.battle_id) < 25 AND EXISTS (SELECT 1 FROM public.coding_battles b JOIN public.profiles p ON p.id = auth.uid() WHERE b.id = coding_battle_participants.battle_id AND b.status IN ('SCHEDULED','LIVE') AND (b.batch_id IS NULL OR b.batch_id = p.graduation_period)));
CREATE POLICY "Code Arena students view own submissions" ON public.coding_submissions FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND (p.created_by = auth.uid() OR public.code_arena_is_instructor())));
CREATE POLICY "Code Arena students create own valid submissions" ON public.coding_submissions FOR INSERT WITH CHECK (student_id = auth.uid() AND EXISTS (SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND p.is_published) AND (battle_id IS NULL OR EXISTS (SELECT 1 FROM public.coding_battles b JOIN public.coding_battle_participants bp ON bp.battle_id = b.id WHERE b.id = battle_id AND bp.student_id = auth.uid() AND b.status = 'LIVE' AND NOW() < b.end_time)));

ALTER TABLE public.coding_battle_participants REPLICA IDENTITY FULL;
ALTER TABLE public.coding_submissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coding_battle_participants, public.coding_submissions;
