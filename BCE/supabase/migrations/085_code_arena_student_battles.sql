-- Migration 085: Code Arena Student Battles & Join Code Schema
-- Enables both Faculty and Students to create battles, import external problems, and join via battle code.

-- 1. Add missing columns to public.coding_battles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coding_battles' AND column_name='creator_role') THEN
    ALTER TABLE public.coding_battles ADD COLUMN creator_role TEXT NOT NULL DEFAULT 'FACULTY' CHECK (creator_role IN ('FACULTY', 'STUDENT'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coding_battles' AND column_name='join_code') THEN
    ALTER TABLE public.coding_battles ADD COLUMN join_code TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coding_battles' AND column_name='visibility') THEN
    ALTER TABLE public.coding_battles ADD COLUMN visibility TEXT NOT NULL DEFAULT 'CODE' CHECK (visibility IN ('PRIVATE', 'CODE', 'BATCH'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coding_battles_join_code ON public.coding_battles(join_code);
CREATE INDEX IF NOT EXISTS idx_coding_battles_visibility ON public.coding_battles(visibility);

-- 2. Update RLS Policies for coding_problems
-- Allow any authenticated user (Faculty or Student) to insert/view problems they create or import
DROP POLICY IF EXISTS "Code Arena instructors manage owned problems" ON public.coding_problems;
CREATE POLICY "Code Arena users create and manage owned problems" ON public.coding_problems
  FOR ALL USING (created_by = auth.uid() OR public.code_arena_is_instructor())
  WITH CHECK (created_by = auth.uid() OR public.code_arena_is_instructor());

-- 3. Update RLS Policies for coding_problem_test_cases
DROP POLICY IF EXISTS "Code Arena instructors manage owned test cases" ON public.coding_problem_test_cases;
CREATE POLICY "Code Arena users manage owned test cases" ON public.coding_problem_test_cases
  FOR ALL USING (EXISTS (SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND (p.created_by = auth.uid() OR public.code_arena_is_instructor())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coding_problems p WHERE p.id = problem_id AND (p.created_by = auth.uid() OR public.code_arena_is_instructor())));

-- 4. Update RLS Policies for coding_battles
DROP POLICY IF EXISTS "Code Arena battles visible to faculty and participants" ON public.coding_battles;
CREATE POLICY "Code Arena battles visible to users" ON public.coding_battles
  FOR SELECT USING (
    created_by = auth.uid() OR
    visibility = 'CODE' OR
    public.code_arena_is_instructor() OR
    EXISTS (SELECT 1 FROM public.coding_battle_participants bp WHERE bp.battle_id = id AND bp.student_id = auth.uid())
  );

DROP POLICY IF EXISTS "Code Arena instructors manage owned battles" ON public.coding_battles;
CREATE POLICY "Code Arena users create and manage owned battles" ON public.coding_battles
  FOR ALL USING (created_by = auth.uid() OR public.code_arena_is_instructor())
  WITH CHECK (created_by = auth.uid());

-- 5. Update RLS Policies for coding_battle_problems
DROP POLICY IF EXISTS "Code Arena instructors manage battle problems" ON public.coding_battle_problems;
CREATE POLICY "Code Arena battle creators manage battle problems" ON public.coding_battle_problems
  FOR ALL USING (EXISTS (SELECT 1 FROM public.coding_battles b WHERE b.id = battle_id AND (b.created_by = auth.uid() OR public.code_arena_is_instructor())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coding_battles b WHERE b.id = battle_id AND b.created_by = auth.uid()));

-- 6. Update RLS Policies for coding_battle_participants
DROP POLICY IF EXISTS "Code Arena participants join assigned battles" ON public.coding_battle_participants;
CREATE POLICY "Code Arena participants join battles" ON public.coding_battle_participants
  FOR INSERT WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.coding_battles b
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE b.id = coding_battle_participants.battle_id
        AND b.status IN ('DRAFT', 'SCHEDULED', 'LIVE')
        AND (
          b.visibility = 'CODE' OR
          b.created_by = auth.uid() OR
          (b.batch_id IS NULL OR b.batch_id = p.graduation_period)
        )
    )
  );
