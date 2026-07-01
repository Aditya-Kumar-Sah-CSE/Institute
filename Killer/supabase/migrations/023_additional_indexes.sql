-- =========================================================================
-- ADDITIONAL PERFORMANCE INDEXES FOR FREQUENTLY QUERIED PATTERNS
-- =========================================================================

-- Enrollment lookups by course (instructor approval, course student lists)
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);

-- Enrollment status filtering (pending/approved/rejected queries)
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);

-- Composite index for enrollment uniqueness lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course_status ON public.enrollments(user_id, course_id, status);

-- Course ownership lookups (instructor course management)
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON public.courses(created_by);

-- Profile role checks (RLS policies query this constantly)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Feedback user lookups
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON public.feedbacks(user_id);

-- Feedback category filtering (separating notifications from doubts)
CREATE INDEX IF NOT EXISTS idx_feedbacks_category ON public.feedbacks(category);

-- Lesson progress by lesson (completion status checks)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);

-- XP log source lookups (badge checking queries this)
CREATE INDEX IF NOT EXISTS idx_xp_log_source_type ON public.xp_log(source_type);

-- Instructor applications user lookup
CREATE INDEX IF NOT EXISTS idx_instructor_applications_user_id ON public.instructor_applications(user_id);

-- Notices author lookup
CREATE INDEX IF NOT EXISTS idx_notices_author_id ON public.notices(author_id);
