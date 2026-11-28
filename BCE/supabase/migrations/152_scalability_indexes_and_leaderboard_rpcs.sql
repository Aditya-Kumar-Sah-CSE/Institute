-- Migration 152: High-Concurrency Indexes & Server-Side Aggregation RPCs
-- Designed for 2,000+ active students and 50+ concurrent users.

-- 1. Covering & Composite Indexes for Hot Query Paths
CREATE INDEX IF NOT EXISTS idx_sql_progress_sheet_solved_cover
  ON public.coding_sheet_sql_progress(sheet_id, is_solved) INCLUDE (user_id, question_number);

CREATE INDEX IF NOT EXISTS idx_aptitude_progress_sheet_solved_cover
  ON public.coding_sheet_aptitude_progress(sheet_id, is_solved) INCLUDE (user_id, question_number);

CREATE INDEX IF NOT EXISTS idx_tcs_progress_sheet_solved_cover
  ON public.coding_sheet_tcs_progress(sheet_id, is_solved, item_type) INCLUDE (user_id, item_key);

CREATE INDEX IF NOT EXISTS idx_roadmap_progress_sheet_solved_cover
  ON public.coding_sheet_roadmap_progress(sheet_id, is_solved) INCLUDE (user_id, problem_code);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_prob_status_student
  ON public.coding_submissions(problem_id, status, student_id);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_student_status_prob
  ON public.coding_submissions(student_id, status, problem_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sheet_enrollments_sheet_enrolled
  ON public.coding_sheet_enrollments(sheet_id, enrolled_at DESC);

CREATE INDEX IF NOT EXISTS idx_sheet_enrollments_user
  ON public.coding_sheet_enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard
  ON public.profiles(role, is_verified, xp DESC)
  WHERE last_login_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_catalog
  ON public.courses(is_published, is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_status_prog
  ON public.enrollments(course_id, status, progress DESC);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_status_course
  ON public.enrollments(user_id, status, course_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_completed
  ON public.lesson_progress(user_id, completed, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_reviews_pub
  ON public.course_reviews(course_id, status, is_public);

CREATE INDEX IF NOT EXISTS idx_sheet_reviews_pub
  ON public.sheet_reviews(sheet_id, status, is_public);

CREATE INDEX IF NOT EXISTS idx_student_apps_status
  ON public.student_apps(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notices_expires_created
  ON public.notices(expires_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_notices_course_created
  ON public.course_notices(course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_global_polls_expires
  ON public.global_polls(expires_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_polls_course_created
  ON public.course_polls(course_id, created_at DESC);

-- 2. RPC: Fast Sheet Community Stats (replaces full-table scans on all 5 sheet types)
CREATE OR REPLACE FUNCTION public.get_sheet_community_stats(
  p_sheet_id UUID,
  p_sheet_type TEXT DEFAULT 'DSA',
  p_limit INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type TEXT := UPPER(COALESCE(p_sheet_type, 'DSA'));
  v_total_solvers INT := 0;
  v_total_solved_sum BIGINT := 0;
  v_top JSONB := '[]'::jsonb;
  v_lim INT := GREATEST(1, LEAST(COALESCE(p_limit, 30), 100));
BEGIN
  IF v_type = 'SQL' THEN
    WITH agg AS (
      SELECT user_id, COUNT(DISTINCT question_number)::INT AS solved_count
      FROM public.coding_sheet_sql_progress
      WHERE sheet_id = p_sheet_id AND is_solved = true
      GROUP BY user_id
    )
    SELECT
      COUNT(*)::INT,
      COALESCE(SUM(solved_count), 0)::BIGINT,
      COALESCE(
        (SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT a.user_id, COALESCE(p.name, 'SQL Learner') AS name, p.avatar_url, a.solved_count
          FROM agg a
          LEFT JOIN public.profiles p ON p.id = a.user_id
          ORDER BY a.solved_count DESC, a.user_id
          LIMIT v_lim
        ) t),
        '[]'::jsonb
      )
    INTO v_total_solvers, v_total_solved_sum, v_top
    FROM agg;

  ELSIF v_type = 'APTITUDE' THEN
    WITH agg AS (
      SELECT user_id, COUNT(DISTINCT question_number)::INT AS solved_count
      FROM public.coding_sheet_aptitude_progress
      WHERE sheet_id = p_sheet_id AND is_solved = true
      GROUP BY user_id
    )
    SELECT
      COUNT(*)::INT,
      COALESCE(SUM(solved_count), 0)::BIGINT,
      COALESCE(
        (SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT a.user_id, COALESCE(p.name, 'Aptitude Learner') AS name, p.avatar_url, a.solved_count
          FROM agg a
          LEFT JOIN public.profiles p ON p.id = a.user_id
          ORDER BY a.solved_count DESC, a.user_id
          LIMIT v_lim
        ) t),
        '[]'::jsonb
      )
    INTO v_total_solvers, v_total_solved_sum, v_top
    FROM agg;

  ELSIF v_type = 'TCS_PREP' THEN
    WITH agg AS (
      SELECT user_id, COUNT(DISTINCT item_key)::INT AS solved_count
      FROM public.coding_sheet_tcs_progress
      WHERE sheet_id = p_sheet_id AND is_solved = true
      GROUP BY user_id
    )
    SELECT
      COUNT(*)::INT,
      COALESCE(SUM(solved_count), 0)::BIGINT,
      COALESCE(
        (SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT a.user_id, COALESCE(p.name, 'TCS Prep Learner') AS name, p.avatar_url, a.solved_count
          FROM agg a
          LEFT JOIN public.profiles p ON p.id = a.user_id
          ORDER BY a.solved_count DESC, a.user_id
          LIMIT v_lim
        ) t),
        '[]'::jsonb
      )
    INTO v_total_solvers, v_total_solved_sum, v_top
    FROM agg;

  ELSIF v_type = 'ROADMAP' THEN
    WITH agg AS (
      SELECT user_id, COUNT(DISTINCT problem_code)::INT AS solved_count
      FROM public.coding_sheet_roadmap_progress
      WHERE sheet_id = p_sheet_id AND is_solved = true
      GROUP BY user_id
    )
    SELECT
      COUNT(*)::INT,
      COALESCE(SUM(solved_count), 0)::BIGINT,
      COALESCE(
        (SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT a.user_id, COALESCE(p.name, 'Roadmap Learner') AS name, p.avatar_url, a.solved_count
          FROM agg a
          LEFT JOIN public.profiles p ON p.id = a.user_id
          ORDER BY a.solved_count DESC, a.user_id
          LIMIT v_lim
        ) t),
        '[]'::jsonb
      )
    INTO v_total_solvers, v_total_solved_sum, v_top
    FROM agg;

  ELSE
    WITH agg AS (
      SELECT s.student_id AS user_id, COUNT(DISTINCT s.problem_id)::INT AS solved_count
      FROM public.coding_submissions s
      INNER JOIN public.coding_sheet_problems sp ON sp.problem_id = s.problem_id
      WHERE sp.sheet_id = p_sheet_id AND s.status = 'ACCEPTED'
      GROUP BY s.student_id
    )
    SELECT
      COUNT(*)::INT,
      COALESCE(SUM(solved_count), 0)::BIGINT,
      COALESCE(
        (SELECT jsonb_agg(row_to_json(t)) FROM (
          SELECT a.user_id, COALESCE(p.name, 'Anonymous Solver') AS name, p.avatar_url, a.solved_count
          FROM agg a
          LEFT JOIN public.profiles p ON p.id = a.user_id
          ORDER BY a.solved_count DESC, a.user_id
          LIMIT v_lim
        ) t),
        '[]'::jsonb
      )
    INTO v_total_solvers, v_total_solved_sum, v_top
    FROM agg;
  END IF;

  RETURN jsonb_build_object(
    'total_solvers', COALESCE(v_total_solvers, 0),
    'total_solved_sum', COALESCE(v_total_solved_sum, 0),
    'top_solvers', COALESCE(v_top, '[]'::jsonb)
  );
END;
$$;

-- 3. RPC: Fast Sheet Completion Rank (for certificates)
CREATE OR REPLACE FUNCTION public.get_user_sheet_completion_rank(
  p_sheet_id UUID,
  p_sheet_type TEXT,
  p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type TEXT := UPPER(COALESCE(p_sheet_type, 'DSA'));
  v_existing INT := 0;
BEGIN
  SELECT COUNT(*)::INT
  INTO v_existing
  FROM public.certificates
  WHERE sheet_id = p_sheet_id AND user_id <> p_user_id;

  RETURN v_existing + 1;
END;
$$;

-- 4. RPC: Fast Per-Sheet Solved Counts for /code-arena/sheets
CREATE OR REPLACE FUNCTION public.get_user_sheet_solved_counts(p_user_id UUID)
RETURNS TABLE(sheet_id UUID, solved_count INT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sheet_id, COUNT(DISTINCT question_number)::INT AS solved_count
  FROM public.coding_sheet_sql_progress
  WHERE user_id = p_user_id AND is_solved = true
  GROUP BY sheet_id
  UNION ALL
  SELECT sheet_id, COUNT(DISTINCT problem_code)::INT AS solved_count
  FROM public.coding_sheet_roadmap_progress
  WHERE user_id = p_user_id AND is_solved = true
  GROUP BY sheet_id
  UNION ALL
  SELECT sheet_id, COUNT(DISTINCT question_number)::INT AS solved_count
  FROM public.coding_sheet_aptitude_progress
  WHERE user_id = p_user_id AND is_solved = true
  GROUP BY sheet_id
  UNION ALL
  SELECT sheet_id, COUNT(DISTINCT item_key)::INT AS solved_count
  FROM public.coding_sheet_tcs_progress
  WHERE user_id = p_user_id AND is_solved = true
  GROUP BY sheet_id;
$$;

-- 5. RPC: Atomic Profile XP Increment (eliminates read-modify-write race & extra round-trips)
CREATE OR REPLACE FUNCTION public.increment_profile_xp(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET
    xp = COALESCE(xp, 0) + GREATEST(0, p_amount),
    last_active_at = NOW()
  WHERE id = p_user_id
  RETURNING xp;
$$;

GRANT EXECUTE ON FUNCTION public.get_sheet_community_stats(UUID, TEXT, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_sheet_completion_rank(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sheet_solved_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_profile_xp(UUID, INT) TO service_role;

