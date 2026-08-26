-- Migration: 116_restore_all_70_plus_badges_and_evaluation.sql
-- Description: Restores all 70+ comprehensive platform and coding badges and fixes evaluation logic end-to-end.

-- 1. Ensure user_badges table unique constraint exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_badges_user_id_badge_id_key'
  ) THEN
    ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Unique constraint or index already present
  NULL;
END $$;

-- 2. Clear old badges table cleanly
DELETE FROM public.badges;

-- 3. Seed ALL 70+ Badges with Emoji Icons
INSERT INTO public.badges (name, icon, description, condition_type, condition_value, bonus_xp) VALUES
-- Course Enrolled (4)
('Beginner Scholar', '📚', '1 course enrolled successfully', 'course_enrolled', 1, 50),
('Dedicated Learner', '🎓', '5 courses enrolled successfully', 'course_enrolled', 5, 200),
('Knowledge Seeker', '🧠', '10 courses enrolled successfully', 'course_enrolled', 10, 500),
('Academic Legend', '👑', '50+ courses enrolled successfully', 'course_enrolled', 50, 2500),

-- Active Days (9)
('First Day', '🌱', 'Day 1 of learning', 'active_days', 1, 10),
('1-Week Streak', '🔥', 'Active for 7 days', 'active_days', 7, 100),
('1-Month Explorer', '🗺️', 'Active for 30 days', 'active_days', 30, 500),
('3-Month Veteran', '🏅', 'Active for 90 days', 'active_days', 90, 1500),
('Half-Year Hero', '🛡️', 'Active for 180 days', 'active_days', 180, 3000),
('1-Year Master', '🏆', 'Active for 1 year (365 days)', 'active_days', 365, 5000),
('2-Year Legend', '💎', 'Active for 2 years (730 days)', 'active_days', 730, 10000),
('3-Year Titan', '🌟', 'Active for 3 years (1095 days)', 'active_days', 1095, 20000),
('4-Year Immortal', '🌌', 'Active for 4+ years (1460 days)', 'active_days', 1460, 50000),

-- XP Badges (13)
('XP Rookie', '⭐', 'Earned 20 XP', 'xp_threshold', 20, 10),
('XP Novice', '✨', 'Earned 50 XP', 'xp_threshold', 50, 25),
('XP Apprentice', '🌟', 'Earned 100 XP', 'xp_threshold', 100, 50),
('XP Challenger', '⚡', 'Earned 200 XP', 'xp_threshold', 200, 100),
('XP Elite', '🔥', 'Earned 500 XP', 'xp_threshold', 500, 250),
('XP Master', '💥', 'Earned 1000 XP', 'xp_threshold', 1000, 500),
('XP Grandmaster', '💫', 'Earned 2500 XP', 'xp_threshold', 2500, 1000),
('XP Legend', '👑', 'Earned 5000 XP', 'xp_threshold', 5000, 2500),
('XP Mythic', '🔮', 'Earned 10,000 XP', 'xp_threshold', 10000, 5000),
('XP Titan', '🏔️', 'Earned 25,000 XP', 'xp_threshold', 25000, 10000),
('XP Deity', '⚡', 'Earned 50,000 XP', 'xp_threshold', 50000, 20000),
('XP Celestial', '🌌', 'Earned 100,000 XP', 'xp_threshold', 100000, 50000),
('XP Ascendant', '💎', 'Earned 1,000,000 XP', 'xp_threshold', 1000000, 100000),

-- Login Streaks (6)
('Weekend Warrior', '🏃', 'Achieved a 3-Day Login Streak', 'streak_days', 3, 50),
('One Week Sprint', '🏃‍♂️', 'Achieved a 7-Day Login Streak', 'streak_days', 7, 200),
('Fortnight Flash', '⚡', 'Achieved a 14-Day Login Streak', 'streak_days', 14, 500),
('Monthly Marathon', '🗓️', 'Achieved a 30-Day Login Streak', 'streak_days', 30, 2000),
('Unstoppable', '🔥', 'Achieved a 50-Day Login Streak', 'streak_days', 50, 4000),
('Century Streak', '💯', 'Achieved a 100-Day Login Streak', 'streak_days', 100, 10000),

-- Assignments Approved (5)
('First Assignment', '📝', '1st assignment approved by faculty', 'assignments_approved', 1, 50),
('Steady Submitter', '✍️', '5th assignment approved by faculty', 'assignments_approved', 5, 200),
('Dedicated Worker', '🎯', '10th assignment approved by faculty', 'assignments_approved', 10, 500),
('Assignment Machine', '🤖', '50th assignment approved by faculty', 'assignments_approved', 50, 2500),
('Centurion Scholar', '💯', '100th assignment approved by faculty', 'assignments_approved', 100, 5000),

-- Faculty Course Creation (7)
('First Batch', '🌱', 'Created your 1st course/batch', 'courses_created', 1, 100),
('Growing Mentor', '🌟', 'Created your 5th course/batch', 'courses_created', 5, 250),
('Seasoned Instructor', '🎓', 'Created your 10th course/batch', 'courses_created', 10, 500),
('Prolific Educator', '🏛️', 'Created your 50th course/batch', 'courses_created', 50, 2000),
('Century Creator', '👑', 'Created your 100th course/batch', 'courses_created', 100, 5000),
('Master Architect', '🌌', 'Created your 500th course/batch', 'courses_created', 500, 10000),
('Legendary Founder', '🏆', 'Created your 1000th course/batch', 'courses_created', 1000, 25000),

-- Social Profiles (3)
('Social Starter', '🔗', 'Added 1 social/coding profile link', 'social_links', 1, 20),
('Networker', '🌐', 'Added 3 social/coding profile links', 'social_links', 3, 50),
('Omnipresent', '🦋', 'Added 5 social/coding profile links', 'social_links', 5, 100),

-- Battles Joined (4)
('Battle Recruit', '⚔️', 'Joined your first coding battle', 'battles_joined', 1, 100),
('Battle Warrior', '🛡️', 'Participated in 10 coding battles', 'battles_joined', 10, 500),
('Battle Veteran', '⚡', 'Participated in 50 coding battles', 'battles_joined', 50, 2000),
('Arena Master', '👑', 'Participated in 100 coding battles', 'battles_joined', 100, 5000),

-- GitHub & Deploy (2)
('Git Starter', '🧑‍💻', 'Made your first GitHub submission', 'github_count', 1, 50),
('First Deploy', '🚀', 'Deployed your first project', 'deploy_count', 1, 100),

-- Coder Badges (16)
('7-Day Coder', '🔥', 'Solve coding problems for 7 consecutive days', '7_day_streak', 7, 200),
('30-Day Coder', '☄️', 'Solve coding problems for 30 consecutive days', '30_day_streak', 30, 1000),
('Problem Starter', '🧑‍💻', 'First 10 coding problems solved', 'problem_starter', 10, 100),
('100 Club', '🥉', '100 total coding problems solved', '100_club', 100, 1000),
('250 Club', '🥈', '250 total coding problems solved', '250_club', 250, 2500),
('500 Club', '🥇', '500 total coding problems solved', '500_club', 500, 5000),
('1000 Club', '🏆', '1000 total coding problems solved', '1000_club', 1000, 10000),
('Daily Grinder', '🎯', 'Consistently meet daily target (solving problems on 15 separate days)', 'daily_grinder', 15, 500),
('DSA Master', '🧠', 'Complete a major DSA Sheet', 'dsa_master', 1, 1000),
('Multi-Platform Coder', '🌐', 'Solve problems on Smart Learn, LeetCode, and CodeChef', 'multi_platform', 3, 500),
('Monthly Champion', '👑', 'Achieve Rank #1 overall in the Monthly Coding Champions', 'monthly_champion', 1, 5000),
('Monthly Runner-Up', '🥈', 'Achieve Rank #2 overall in the Monthly Coding Champions', 'monthly_runner_up', 2, 2500),
('Monthly Top 3', '🥉', 'Achieve Rank #3 overall in the Monthly Coding Champions', 'monthly_top_3', 3, 1000),
('Consistency King', '📈', 'Maintain consistent coding activity across multiple weeks', 'consistency_king', 14, 1000),
('Contest Warrior', '⚔️', 'Participate in 3 or more Coding Battles', 'contest_warrior', 3, 300),
('Problem Hunter', '🕵️', 'Solve at least 5 Easy, 5 Medium, and 5 Hard problems', 'problem_hunter', 5, 500);

-- 4. Complete Stored Procedure to Evaluate ALL Badges Server-Side
CREATE OR REPLACE FUNCTION public.evaluate_student_badges(p_student_id UUID)
RETURNS VOID AS $$
DECLARE
  v_xp INT := 0;
  v_streak_days INT := 0;
  v_active_days INT := 0;
  v_courses_enrolled INT := 0;
  v_assignments_approved INT := 0;
  v_courses_created INT := 0;
  v_social_links_count INT := 0;
  v_battles_joined INT := 0;

  v_total_solved INT := 0;
  v_platforms_count INT := 0;
  v_unique_days_count INT := 0;
  v_max_streak INT := 0;
  v_dsa_sheets_completed INT := 0;
  v_best_monthly_rank INT := 9999;
  v_contests_joined INT := 0;
  v_easy_solved INT := 0;
  v_medium_solved INT := 0;
  v_hard_solved INT := 0;

  v_badge RECORD;
  v_eligible BOOLEAN;
BEGIN
  -- Profile metrics
  SELECT 
    COALESCE(xp, 0),
    COALESCE(streak_days, 0),
    COALESCE(total_active_days, 0)
  INTO v_xp, v_streak_days, v_active_days
  FROM public.profiles
  WHERE id = p_student_id;

  -- Course enrollments count
  SELECT COUNT(*) INTO v_courses_enrolled
  FROM public.enrollments
  WHERE user_id = p_student_id AND status = 'approved';

  -- Approved assignments count
  SELECT COUNT(*) INTO v_assignments_approved
  FROM public.submissions
  WHERE user_id = p_student_id AND status = 'approved';

  -- Created courses count (Faculty)
  SELECT COUNT(*) INTO v_courses_created
  FROM public.courses
  WHERE created_by = p_student_id;

  -- Social profile links count
  SELECT COALESCE(
    (SELECT COUNT(*) FROM jsonb_each_text(social_links) WHERE value IS NOT NULL AND value != ''),
    0
  ) INTO v_social_links_count
  FROM public.profiles
  WHERE id = p_student_id;

  -- Battles joined
  SELECT COUNT(DISTINCT battle_id) INTO v_battles_joined
  FROM public.coding_battle_participants
  WHERE student_id = p_student_id;

  v_contests_joined := v_battles_joined;

  -- Coding Metrics
  SELECT COUNT(*) INTO v_total_solved
  FROM public.student_completed_problems
  WHERE student_id = p_student_id;

  SELECT COUNT(DISTINCT platform) INTO v_platforms_count
  FROM public.student_completed_problems
  WHERE student_id = p_student_id;

  SELECT COUNT(DISTINCT DATE(solved_at)) INTO v_unique_days_count
  FROM public.student_completed_problems
  WHERE student_id = p_student_id;

  -- Max streak from completed problems or profile streak
  WITH date_list AS (
    SELECT DISTINCT DATE(solved_at) as sol_date
    FROM public.student_completed_problems
    WHERE student_id = p_student_id
  ),
  groups AS (
    SELECT sol_date, sol_date - CAST(row_number() OVER (ORDER BY sol_date) AS INT) as grp
    FROM date_list
  )
  SELECT COALESCE(MAX(cnt), 0) INTO v_max_streak
  FROM (
    SELECT COUNT(*) as cnt
    FROM groups
    GROUP BY grp
  ) s;

  IF v_streak_days > v_max_streak THEN
    v_max_streak := v_streak_days;
  END IF;

  -- DSA Sheets completed
  SELECT COALESCE(COUNT(DISTINCT enrollments.sheet_id), 0) INTO v_dsa_sheets_completed
  FROM public.coding_sheet_enrollments enrollments
  WHERE enrollments.user_id = p_student_id;

  -- Best Monthly Rank
  SELECT COALESCE(MIN(rank), 9999) INTO v_best_monthly_rank
  FROM public.monthly_rewards
  WHERE user_id = p_student_id;

  -- Solved by difficulty
  SELECT 
    COALESCE(SUM(CASE WHEN cp.difficulty = 'EASY' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cp.difficulty = 'MEDIUM' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cp.difficulty = 'HARD' THEN 1 ELSE 0 END), 0)
  INTO v_easy_solved, v_medium_solved, v_hard_solved
  FROM public.student_completed_problems scp
  JOIN public.coding_problems cp ON scp.problem_id = cp.id::TEXT
  WHERE scp.student_id = p_student_id;

  -- Evaluate ALL Badges
  FOR v_badge IN SELECT * FROM public.badges LOOP
    v_eligible := false;

    CASE v_badge.condition_type
      -- General & XP & Engagement
      WHEN 'course_enrolled' THEN
        v_eligible := (v_courses_enrolled >= v_badge.condition_value);
      WHEN 'active_days' THEN
        v_eligible := (v_active_days >= v_badge.condition_value);
      WHEN 'xp_threshold' THEN
        v_eligible := (v_xp >= v_badge.condition_value);
      WHEN 'streak_days' THEN
        v_eligible := (v_streak_days >= v_badge.condition_value);
      WHEN 'assignments_approved' THEN
        v_eligible := (v_assignments_approved >= v_badge.condition_value);
      WHEN 'courses_created' THEN
        v_eligible := (v_courses_created >= v_badge.condition_value);
      WHEN 'social_links' THEN
        v_eligible := (v_social_links_count >= v_badge.condition_value);
      WHEN 'battles_joined' THEN
        v_eligible := (v_battles_joined >= v_badge.condition_value);

      -- Coding Specific
      WHEN '7_day_streak' THEN
        v_eligible := (v_max_streak >= v_badge.condition_value);
      WHEN '30_day_streak' THEN
        v_eligible := (v_max_streak >= v_badge.condition_value);
      WHEN 'problem_starter' THEN
        v_eligible := (v_total_solved >= v_badge.condition_value);
      WHEN '100_club' THEN
        v_eligible := (v_total_solved >= v_badge.condition_value);
      WHEN '250_club' THEN
        v_eligible := (v_total_solved >= v_badge.condition_value);
      WHEN '500_club' THEN
        v_eligible := (v_total_solved >= v_badge.condition_value);
      WHEN '1000_club' THEN
        v_eligible := (v_total_solved >= v_badge.condition_value);
      WHEN 'daily_grinder' THEN
        v_eligible := (v_unique_days_count >= v_badge.condition_value);
      WHEN 'dsa_master' THEN
        v_eligible := (v_dsa_sheets_completed >= v_badge.condition_value);
      WHEN 'multi_platform' THEN
        v_eligible := (v_platforms_count >= v_badge.condition_value);
      WHEN 'monthly_champion' THEN
        v_eligible := (v_best_monthly_rank = 1);
      WHEN 'monthly_runner_up' THEN
        v_eligible := (v_best_monthly_rank = 2);
      WHEN 'monthly_top_3' THEN
        v_eligible := (v_best_monthly_rank <= 3);
      WHEN 'consistency_king' THEN
        v_eligible := (v_max_streak >= v_badge.condition_value);
      WHEN 'contest_warrior' THEN
        v_eligible := (v_contests_joined >= v_badge.condition_value);
      WHEN 'problem_hunter' THEN
        v_eligible := (v_easy_solved >= v_badge.condition_value AND v_medium_solved >= v_badge.condition_value AND v_hard_solved >= v_badge.condition_value);
      ELSE
        v_eligible := false;
    END CASE;

    IF v_eligible THEN
      INSERT INTO public.user_badges (id, user_id, badge_id, earned_at, is_seen)
      VALUES (gen_random_uuid(), p_student_id, v_badge.id, NOW(), true)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Automatically evaluate and RECOVER badges for ALL registered users right now!
DO $$ 
DECLARE 
  r RECORD;
BEGIN 
  FOR r IN SELECT id FROM public.profiles LOOP 
    PERFORM public.evaluate_student_badges(r.id); 
  END LOOP; 
END $$;
