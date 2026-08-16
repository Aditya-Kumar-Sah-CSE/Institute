-- Migration 089: Multiple Faculty and Battle Fixes Schema
-- Creates course_instructors join table, populates it from existing courses, and updates RLS rules for battles/submissions.

-- 1. Create course_instructors table
CREATE TABLE IF NOT EXISTS public.course_instructors (
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, instructor_id)
);

CREATE INDEX IF NOT EXISTS idx_course_instructors_course_id ON public.course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor_id ON public.course_instructors(instructor_id);

-- 2. Populate course_instructors with existing course-instructor links
INSERT INTO public.course_instructors (course_id, instructor_id)
SELECT id, created_by 
FROM public.courses
WHERE created_by IS NOT NULL
ON CONFLICT (course_id, instructor_id) DO NOTHING;

-- 3. Enable RLS on course_instructors
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for course_instructors
DROP POLICY IF EXISTS "Allow authenticated read course_instructors" ON public.course_instructors;
CREATE POLICY "Allow authenticated read course_instructors" ON public.course_instructors
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow administrators and instructors write course_instructors" ON public.course_instructors;
CREATE POLICY "Allow administrators and instructors write course_instructors" ON public.course_instructors
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('instructor', 'admin', 'developer')
    )
  );

-- 5. RLS policy for updating coding_battle_participants (student can update team_id)
DROP POLICY IF EXISTS "Code Arena participants update own row" ON public.coding_battle_participants;
CREATE POLICY "Code Arena participants update own row" ON public.coding_battle_participants
  FOR UPDATE USING (
    student_id = auth.uid()
  )
  WITH CHECK (
    student_id = auth.uid()
  );

-- 6. RLS policy for inserting coding_submissions (allows battle participants / virtual practice submissions)
DROP POLICY IF EXISTS "Code Arena students create own valid submissions" ON public.coding_submissions;
CREATE POLICY "Code Arena students create own valid submissions" ON public.coding_submissions
  FOR INSERT WITH CHECK (
    student_id = auth.uid() AND
    (
      -- A. The problem is published
      EXISTS (
        SELECT 1 FROM public.coding_problems p 
        WHERE p.id = problem_id AND p.is_published
      )
      OR
      -- B. The problem is part of a battle where the user is a participant
      EXISTS (
        SELECT 1 FROM public.coding_battle_problems bp
        JOIN public.coding_battle_participants cp ON cp.battle_id = bp.battle_id
        WHERE bp.problem_id = problem_id AND cp.student_id = auth.uid()
      )
      OR
      -- C. The problem is part of a completed battle
      EXISTS (
        SELECT 1 FROM public.coding_battle_problems bp
        JOIN public.coding_battles b ON b.id = bp.battle_id
        WHERE bp.problem_id = problem_id AND b.status = 'COMPLETED'
      )
    ) AND
    (
      -- D. If they specify a battle_id, the battle must be currently live
      battle_id IS NULL OR 
      public.code_arena_is_battle_live_participant(battle_id, auth.uid())
    )
  );

-- 7. Grant permissions
GRANT ALL ON public.course_instructors TO authenticated;
