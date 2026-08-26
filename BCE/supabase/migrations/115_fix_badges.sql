-- Migration: 115_fix_badges.sql
-- Description: Reverts to the old emoji UI for badges and includes coding badges.

-- Delete all current badges (will cascade to user_badges if they are set to cascade, but since we re-insert the same conditions, users will earn them back when checkBadges runs)
DELETE FROM public.badges;

-- Seed general realistic badges
-- 1. Course Enrolled (faculty approved)
INSERT INTO badges (name, icon, description, condition_type, condition_value) VALUES
('Beginner Scholar', '📚', '1 course enrolled successfully', 'course_enrolled', 1),
('Dedicated Learner', '🎓', '5 courses enrolled successfully', 'course_enrolled', 5),
('Knowledge Seeker', '🧠', '10 courses enrolled successfully', 'course_enrolled', 10),
('Academic Legend', '👑', '50+ courses enrolled successfully', 'course_enrolled', 50);

-- 2. Active Days
INSERT INTO badges (name, icon, description, condition_type, condition_value) VALUES
('First Day', '🌱', 'Day 1 of learning', 'active_days', 1),
('1-Week Streak', '🔥', 'Active for 7 days', 'active_days', 7),
('1-Month Explorer', '🗺️', 'Active for 30 days', 'active_days', 30),
('3-Month Veteran', '🏅', 'Active for 90 days', 'active_days', 90),
('Half-Year Hero', '🛡️', 'Active for 180 days', 'active_days', 180),
('1-Year Master', '🏆', 'Active for 1 year (365 days)', 'active_days', 365),
('2-Year Legend', '💎', 'Active for 2 years (730 days)', 'active_days', 730),
('3-Year Titan', '🌟', 'Active for 3 years (1095 days)', 'active_days', 1095),
('4-Year Immortal', '🌌', 'Active for 4+ years (1460 days)', 'active_days', 1460);

-- 3. XP Badges
INSERT INTO badges (name, icon, description, condition_type, condition_value) VALUES
('XP Rookie', '⭐', 'Earned 20 XP', 'xp_threshold', 20),
('XP Novice', '⭐⭐', 'Earned 50 XP', 'xp_threshold', 50),
('XP Apprentice', '⭐⭐⭐', 'Earned 100 XP', 'xp_threshold', 100),
('XP Challenger', '⚡', 'Earned 200 XP', 'xp_threshold', 200),
('XP Elite', '🔥', 'Earned 500 XP', 'xp_threshold', 500),
('XP Master', '💥', 'Earned 1000 XP', 'xp_threshold', 1000),
('XP Grandmaster', '💫', 'Earned 2500 XP', 'xp_threshold', 2500),
('XP Legend', '👑', 'Earned 5000 XP', 'xp_threshold', 5000),
('XP Mythic', '🌟', 'Earned 10,000 XP', 'xp_threshold', 10000),
('XP Titan', '🏔️', 'Earned 25,000 XP', 'xp_threshold', 25000),
('XP Deity', '⚡', 'Earned 50,000 XP', 'xp_threshold', 50000),
('XP Celestial', '✨', 'Earned 100,000 XP', 'xp_threshold', 100000),
('XP Ascendant', '🌌', 'Earned 1,000,000 XP', 'xp_threshold', 1000000);

-- 4. Coding Badges (With Emojis!)
INSERT INTO badges (name, icon, description, condition_type, condition_value) VALUES
('7-Day Coder', '🔥', 'Solve coding problems for 7 consecutive days', '7_day_streak', 7),
('30-Day Coder', '☄️', 'Solve coding problems for 30 consecutive days', '30_day_streak', 30),
('Problem Starter', '🧑‍💻', 'First 10 coding problems solved', 'problem_starter', 10),
('100 Club', '🥉', '100 total coding problems solved', '100_club', 100),
('250 Club', '🥈', '250 total coding problems solved', '250_club', 250),
('500 Club', '🥇', '500 total coding problems solved', '500_club', 500),
('1000 Club', '🏆', '1000 total coding problems solved', '1000_club', 1000),
('Daily Grinder', '🎯', 'Consistently meet daily target (solving problems on 15 separate days)', 'daily_grinder', 15),
('DSA Master', '🧠', 'Complete a major DSA Sheet', 'dsa_master', 1),
('Multi-Platform Coder', '🌐', 'Solve problems on Smart Learn, LeetCode, and CodeChef', 'multi_platform', 3),
('Monthly Champion', '👑', 'Achieve Rank #1 overall in the Monthly Coding Champions', 'monthly_champion', 1),
('Monthly Runner-Up', '🥈', 'Achieve Rank #2 overall in the Monthly Coding Champions', 'monthly_runner_up', 2),
('Monthly Top 3', '🥉', 'Achieve Rank #3 overall in the Monthly Coding Champions', 'monthly_top_3', 3),
('Consistency King', '📈', 'Maintain consistent coding activity across multiple weeks', 'consistency_king', 14),
('Contest Warrior', '⚔️', 'Participate in 3 or more Coding Battles', 'contest_warrior', 3),
('Problem Hunter', '🕵️', 'Solve at least 5 Easy, 5 Medium, and 5 Hard problems', 'problem_hunter', 5);
