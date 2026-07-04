-- =========================================================================
-- PERFORMANCE INDEXES ON FOREIGN KEYS AND FREQUENTLY LOOKED UP COLUMNS
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON public.assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_log_user_id ON public.xp_log(user_id);
