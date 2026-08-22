-- Create Coding Sheets and Coding Sheet Problems tables
CREATE TABLE IF NOT EXISTS public.coding_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coding_sheet_problems (
  sheet_id UUID NOT NULL REFERENCES public.coding_sheets(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sheet_id, problem_id)
);

-- Enable RLS
ALTER TABLE public.coding_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_sheet_problems ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
DROP POLICY IF EXISTS "Code Arena sheets readable by all" ON public.coding_sheets;
CREATE POLICY "Code Arena sheets readable by all" ON public.coding_sheets 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Code Arena instructors manage owned sheets" ON public.coding_sheets;
CREATE POLICY "Code Arena instructors manage owned sheets" ON public.coding_sheets 
  FOR ALL USING (created_by = auth.uid() OR public.code_arena_is_instructor()) 
  WITH CHECK (public.code_arena_is_instructor() AND created_by = auth.uid());

DROP POLICY IF EXISTS "Code Arena sheet problems readable by all" ON public.coding_sheet_problems;
CREATE POLICY "Code Arena sheet problems readable by all" ON public.coding_sheet_problems 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Code Arena instructors manage sheet problems" ON public.coding_sheet_problems;
CREATE POLICY "Code Arena instructors manage sheet problems" ON public.coding_sheet_problems 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.coding_sheets s WHERE s.id = sheet_id AND (s.created_by = auth.uid() OR public.code_arena_is_instructor()))) 
  WITH CHECK (EXISTS (SELECT 1 FROM public.coding_sheets s WHERE s.id = sheet_id AND s.created_by = auth.uid() AND public.code_arena_is_instructor()));

-- Setup touch trigger for coding_sheets updated_at
DROP TRIGGER IF EXISTS coding_sheets_touch_updated_at ON public.coding_sheets;
CREATE TRIGGER coding_sheets_touch_updated_at BEFORE UPDATE ON public.coding_sheets 
  FOR EACH ROW EXECUTE FUNCTION public.code_arena_touch_updated_at();
