-- Code Arena foundation tables & triggers
CREATE TABLE IF NOT EXISTS public.coding_problems (
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

CREATE TABLE IF NOT EXISTS public.coding_problem_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  sample_name TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coding_battles (
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

CREATE TABLE IF NOT EXISTS public.coding_battle_problems (
  battle_id UUID NOT NULL REFERENCES public.coding_battles(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE RESTRICT,
  points INTEGER NOT NULL DEFAULT 100 CHECK (points > 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (battle_id, problem_id)
);

CREATE TABLE IF NOT EXISTS public.coding_battle_participants (
  battle_id UUID NOT NULL REFERENCES public.coding_battles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  rank INTEGER,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  PRIMARY KEY (battle_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.coding_submissions (
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

CREATE OR REPLACE FUNCTION public.code_arena_is_instructor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer') AND COALESCE(status, 'active') = 'active');
$$;

CREATE OR REPLACE FUNCTION public.code_arena_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coding_problems_touch_updated_at') THEN
    CREATE TRIGGER coding_problems_touch_updated_at BEFORE UPDATE ON public.coding_problems FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coding_battles_touch_updated_at') THEN
    CREATE TRIGGER coding_battles_touch_updated_at BEFORE UPDATE ON public.coding_battles FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();
  END IF;
END $$;

ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_problem_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_battle_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
