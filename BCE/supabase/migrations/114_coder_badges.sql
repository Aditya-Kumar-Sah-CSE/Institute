-- Migration: 114_coder_badges.sql
-- Description: Sets up the Coder Badges definitions, schema enhancements, and award evaluation functions.

-- Ensure is_seen helper field exists in user_badges if not already there
ALTER TABLE public.user_badges ADD COLUMN IF NOT EXISTS is_seen BOOLEAN DEFAULT false;

-- Clear old badges and user badge references to start with clean professional definitions
DELETE FROM public.badges;

-- Seed professional coder badges without emojis, using Lucide icon aliases as string keys
INSERT INTO public.badges (name, icon, description, condition_type, condition_value) VALUES
('7-Day Streak', 'flame', 'Solve problems for 7 consecutive days', '7_day_streak', 7),
('30-Day Streak', 'flame', 'Solve problems for 30 consecutive days', '30_day_streak', 30),
('Problem Starter', 'code', 'First 10 problems solved', 'problem_starter', 10),
('100 Club', 'trophy', '100 total problems solved', '100_club', 100),
('250 Club', 'trophy', '250 total problems solved', '250_club', 250),
('500 Club', 'trophy', '500 total problems solved', '500_club', 500),
('1000 Club', 'trophy', '1000 total problems solved', '1000_club', 1000),
('Daily Grinder', 'target', 'Consistently meet daily target (solving problems on 15 separate days)', 'daily_grinder', 15),
('DSA Master', 'brain', 'Complete a major DSA Sheet', 'dsa_master', 1),
('Multi-Platform Coder', 'globe', 'Solve problems on Smart Learn, LeetCode, and CodeChef', 'multi_platform', 3),
('Monthly Champion', 'crown', 'Achieve Rank #1 overall in the Monthly Coding Champions', 'monthly_champion', 1),
('Monthly Runner-Up', 'crown', 'Achieve Rank #2 overall in the Monthly Coding Champions', 'monthly_runner_up', 2),
('Monthly Top 3', 'crown', 'Achieve Rank #3 overall in the Monthly Coding Champions', 'monthly_top_3', 3),
('Consistency King', 'trending-up', 'Maintain consistent coding activity across multiple weeks (streak days)', 'consistency_king', 14),
('Contest Warrior', 'swords', 'Participate in 3 or more Coding Battles', 'contest_warrior', 3),
('Problem Hunter', 'search', 'Solve at least 5 Easy, 5 Medium, and 5 Hard problems', 'problem_hunter', 5);

-- Stored Procedure to evaluate and award coding badges server-side
CREATE OR REPLACE FUNCTION public.evaluate_student_badges(p_student_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_solved INT;
  v_platforms_count INT;
  v_unique_days_count INT;
  v_max_streak INT;
  v_daily_grinder_days INT;
  v_dsa_sheets_completed INT;
  v_best_monthly_rank INT;
  v_contests_joined INT;
  v_easy_solved INT;
  v_medium_solved INT;
  v_hard_solved INT;
  v_badge RECORD;
  v_eligible BOOLEAN;
BEGIN
  -- 1. Precalculate metrics
  
  -- Total unique solved problems count
  SELECT COUNT(*) INTO v_total_solved
  FROM public.student_completed_problems
  WHERE student_id = p_student_id;

  -- Platforms count
  SELECT COUNT(DISTINCT platform) INTO v_platforms_count
  FROM public.student_completed_problems
  WHERE student_id = p_student_id;

  -- Solved days (distinct dates solved)
  SELECT COUNT(DISTINCT DATE(solved_at)) INTO v_unique_days_count
  FROM public.student_completed_problems
  WHERE student_id = p_student_id;

  -- Max consecutive streak days from student_completed_problems dates
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

  -- Daily Grinder days (days with at least 1 solved problem)
  v_daily_grinder_days := v_unique_days_count;

  -- DSA Sheets completed
  -- For each sheet_id, check if all coding_sheet_problems.problem_id are in student_completed_problems
  SELECT COALESCE(COUNT(DISTINCT enrollments.sheet_id), 0) INTO v_dsa_sheets_completed
  FROM public.coding_sheet_enrollments enrollments
  WHERE enrollments.student_id = p_student_id AND enrollments.progress >= 1.0;

  -- Best Monthly Rank from monthly_rewards
  SELECT COALESCE(MIN(rank), 9999) INTO v_best_monthly_rank
  FROM public.monthly_rewards
  WHERE user_id = p_student_id;

  -- Contests joined
  SELECT COUNT(DISTINCT battle_id) INTO v_contests_joined
  FROM public.coding_battle_participants
  WHERE student_id = p_student_id;

  -- Solved by difficulty
  -- Let's query from coding_problems where student solved them
  SELECT 
    COALESCE(SUM(CASE WHEN cp.difficulty = 'EASY' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cp.difficulty = 'MEDIUM' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN cp.difficulty = 'HARD' THEN 1 ELSE 0 END), 0)
  INTO v_easy_solved, v_medium_solved, v_hard_solved
  FROM public.student_completed_problems scp
  JOIN public.coding_problems cp ON scp.problem_id = cp.id::TEXT
  WHERE scp.student_id = p_student_id AND scp.platform = 'SMART_LEARN';

  -- 2. Loop through all badges to award the eligible ones
  FOR v_badge IN SELECT * FROM public.badges LOOP
    v_eligible := false;
    
    CASE v_badge.condition_type
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
        v_eligible := (v_daily_grinder_days >= v_badge.condition_value);
      WHEN 'dsa_master' THEN
        v_eligible := (v_dsa_sheets_completed >= v_badge.condition_value);
      WHEN 'multi_platform' THEN
        -- Needs to solve on all 3 platforms
        v_eligible := (v_platforms_count >= v_badge.condition_value);
      WHEN 'monthly_champion' THEN
        v_eligible := (v_best_monthly_rank = 1);
      WHEN 'monthly_runner_up' THEN
        v_eligible := (v_best_monthly_rank = 2);
      WHEN 'monthly_top_3' THEN
        v_eligible := (v_best_monthly_rank <= 3);
      WHEN 'consistency_king' THEN
        -- Consistency: total active days or streak
        v_eligible := (v_max_streak >= v_badge.condition_value);
      WHEN 'contest_warrior' THEN
        v_eligible := (v_contests_joined >= v_badge.condition_value);
      WHEN 'problem_hunter' THEN
        v_eligible := (v_easy_solved >= v_badge.condition_value AND v_medium_solved >= v_badge.condition_value AND v_hard_solved >= v_badge.condition_value);
      ELSE
        v_eligible := false;
    END CASE;

    -- Award badge if eligible and not already earned
    IF v_eligible THEN
      INSERT INTO public.user_badges (id, user_id, badge_id, earned_at, is_seen)
      VALUES (uuid_generate_v4(), p_student_id, v_badge.id, NOW(), false)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
