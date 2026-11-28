-- Migration 153: Coding Club Mentors & Coordinators (Dynamic CMS + Auto-Archive by Term End Date)

CREATE TABLE IF NOT EXISTS public.club_faculty_mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  club_role TEXT NOT NULL DEFAULT 'Club Mentor',
  post TEXT NOT NULL DEFAULT '',
  timeline TEXT NOT NULL DEFAULT '2026 – Present',
  photo_url TEXT,
  profile_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.club_coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  profile_url TEXT,
  batch_label TEXT NOT NULL DEFAULT '28 Batch',
  term_label TEXT NOT NULL DEFAULT '2027 – 2028',
  term_end_date DATE NOT NULL DEFAULT '2028-12-31',
  status_mode TEXT NOT NULL DEFAULT 'auto' CHECK (status_mode IN ('auto', 'active', 'past')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_faculty_mentors_active_order
  ON public.club_faculty_mentors(is_active, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_club_coordinators_active_order
  ON public.club_coordinators(is_active, term_end_date DESC, sort_order, created_at);

ALTER TABLE public.club_faculty_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_coordinators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active club mentors" ON public.club_faculty_mentors;
CREATE POLICY "Public can view active club mentors"
  ON public.club_faculty_mentors
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admin can manage club mentors" ON public.club_faculty_mentors;
CREATE POLICY "Super admin can manage club mentors"
  ON public.club_faculty_mentors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Public can view active club coordinators" ON public.club_coordinators;
CREATE POLICY "Public can view active club coordinators"
  ON public.club_coordinators
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admin can manage club coordinators" ON public.club_coordinators;
CREATE POLICY "Super admin can manage club coordinators"
  ON public.club_coordinators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Seed initial Faculty Mentors only when empty so Super Admin edits persist
INSERT INTO public.club_faculty_mentors (name, club_role, post, timeline, photo_url, sort_order, is_active)
SELECT v.name, v.club_role, v.post, v.timeline, v.photo_url, v.sort_order, true
FROM (
  VALUES
    ('Dr. Mintu Singh', 'Club Mentor', 'Assistant Professor, Computer Science & Engineering', '2026 – Present', '/images/club/mintu-singh.png', 1),
    ('Dr. Abha Kumari', 'Club Mentor', 'Assistant Professor, Computer Science & Engineering', '2026 – Present', '/images/club/abha-kumari.png', 2)
) AS v(name, club_role, post, timeline, photo_url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.club_faculty_mentors);

-- Seed 27 Batch (2026 Past) & 28 Batch (2027-2028 Active until 2028-12-31) from Official Club Transition Notice
INSERT INTO public.club_coordinators (name, profile_url, batch_label, term_label, term_end_date, status_mode, sort_order, is_active)
SELECT v.name, NULL::TEXT, v.batch_label, v.term_label, v.term_end_date::DATE, 'auto', v.sort_order, true
FROM (
  VALUES
    -- Active / Newly Appointed Coordinators (28 Batch: Nov 2026 – End of 2028; auto-becomes Past on 2029-01-01)
    ('Aditya Kumar Sah', '28 Batch', '2027 – 2028', '2028-12-31', 1),
    ('Nitin Kumar', '28 Batch', '2027 – 2028', '2028-12-31', 2),
    ('Sharvi Raj', '28 Batch', '2027 – 2028', '2028-12-31', 3),
    ('Akanksha Kumari', '28 Batch', '2027 – 2028', '2028-12-31', 4),
    ('Saurav Kumar', '28 Batch', '2027 – 2028', '2028-12-31', 5),
    ('Shivam Kumar', '28 Batch', '2027 – 2028', '2028-12-31', 6),
    -- Past Coordinators (27 Batch: Transitioned Nov 2026)
    ('Satyam Kumar', '27 Batch', '2026', '2026-11-26', 1),
    ('Ravishankar Kumar', '27 Batch', '2026', '2026-11-26', 2),
    ('Vikash Kumar Singh', '27 Batch', '2026', '2026-11-26', 3),
    ('Priyansh Kumar', '27 Batch', '2026', '2026-11-26', 4),
    ('Pintu Kumar Yadav', '27 Batch', '2026', '2026-11-26', 5),
    ('Neha Kumari', '27 Batch', '2026', '2026-11-26', 6),
    ('Richa Kumari', '27 Batch', '2026', '2026-11-26', 7),
    ('Ayush Kumar Singh', '27 Batch', '2026', '2026-11-26', 8),
    ('Pawan Kumar', '27 Batch', '2026', '2026-11-26', 9),
    ('Varsha Swaraj', '27 Batch', '2026', '2026-11-26', 10),
    ('Salu Kumari', '27 Batch', '2026', '2026-11-26', 11),
    ('Raghuveer Kumar', '27 Batch', '2026', '2026-11-26', 12),
    ('Vikaash Kumar', '27 Batch', '2026', '2026-11-26', 13),
    ('Shubham Kumar', '27 Batch', '2026', '2026-11-26', 14)
) AS v(name, batch_label, term_label, term_end_date, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.club_coordinators);

