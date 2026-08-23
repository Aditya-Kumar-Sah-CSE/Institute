-- Public NPTEL catalogue data is global; a student only sees their own selections.
CREATE TABLE IF NOT EXISTS public.nptel_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  course_name TEXT NOT NULL,
  course_code TEXT,
  instructor TEXT,
  semester TEXT,
  year INTEGER,
  course_url TEXT,
  source TEXT NOT NULL DEFAULT 'configured_provider',
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nptel_courses_search ON public.nptel_courses (course_name, course_code);

CREATE TABLE IF NOT EXISTS public.student_nptel_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nptel_course_id UUID NOT NULL REFERENCES public.nptel_courses(id) ON DELETE RESTRICT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(student_id, nptel_course_id)
);

CREATE TABLE IF NOT EXISTS public.nptel_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nptel_course_id UUID NOT NULL REFERENCES public.nptel_courses(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  assignment_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  assignment_url TEXT,
  release_date TIMESTAMPTZ,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nptel_course_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_nptel_assignments_deadline ON public.nptel_assignments(nptel_course_id, deadline);

-- Extend the existing notification centre rather than create a second inbox.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reminder_type TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_nptel_reminder_once
  ON public.notifications(user_id, reference_id, reminder_type)
  WHERE reference_type = 'nptel_assignment' AND reminder_type IS NOT NULL;

ALTER TABLE public.nptel_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_nptel_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nptel_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can browse NPTEL catalogue" ON public.nptel_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students see their own NPTEL selections" ON public.student_nptel_courses FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students add their own NPTEL selections" ON public.student_nptel_courses FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update their own NPTEL selections" ON public.student_nptel_courses FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students see assignments for selected courses" ON public.nptel_assignments FOR SELECT USING (EXISTS (SELECT 1 FROM public.student_nptel_courses s WHERE s.nptel_course_id = nptel_assignments.nptel_course_id AND s.student_id = auth.uid() AND s.active));
