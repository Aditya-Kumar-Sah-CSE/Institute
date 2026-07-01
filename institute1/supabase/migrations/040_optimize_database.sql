-- ==========================================
-- DATABASE OPTIMIZATION INDEXES
-- ==========================================

-- 1. Doubts System Indexes
-- Speeds up fetching doubts by user
CREATE INDEX IF NOT EXISTS idx_doubts_user_id ON public.doubts(user_id);

-- Speeds up filtering doubts for the hub feed and sorting by newest
CREATE INDEX IF NOT EXISTS idx_doubts_batch_created_at ON public.doubts(batch, created_at DESC);

-- Speeds up fetching doubts specific to a lesson in a course
CREATE INDEX IF NOT EXISTS idx_doubts_course_lesson ON public.doubts(course_id, lesson_id);

-- Speeds up filtering open doubts for the hub
CREATE INDEX IF NOT EXISTS idx_doubts_open ON public.doubts(batch) WHERE status = 'open';

-- Speeds up fetching replies for a specific doubt
CREATE INDEX IF NOT EXISTS idx_doubt_replies_doubt_id ON public.doubt_replies(doubt_id);

-- Speeds up fetching replies made by a specific user
CREATE INDEX IF NOT EXISTS idx_doubt_replies_user_id ON public.doubt_replies(user_id);

-- Speeds up rendering nested thread replies
CREATE INDEX IF NOT EXISTS idx_doubt_replies_parent_id ON public.doubt_replies(parent_id);

-- Speeds up checking if a user has viewed a doubt
CREATE INDEX IF NOT EXISTS idx_doubt_views_user_id ON public.doubt_views(user_id);

-- Speeds up checking if a user has voted on a reply
CREATE INDEX IF NOT EXISTS idx_reply_votes_user_id ON public.reply_votes(user_id);


-- 2. Notifications System Indexes
-- Speeds up fetching a user's notifications sorted by latest
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- Speeds up fetching unread notification counts instantly
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;


-- 3. General Optimizations
-- Speeds up loading and sorting lessons by week inside a course
CREATE INDEX IF NOT EXISTS idx_lessons_course_week ON public.lessons(course_id, week_number);

-- Speeds up checking if a student is enrolled in a specific course
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON public.enrollments(user_id, course_id);
