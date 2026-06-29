-- Add total_active_days to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_active_days INTEGER DEFAULT 0;

-- Initialize total_active_days with streak_days for existing users
UPDATE profiles SET total_active_days = streak_days WHERE total_active_days = 0;

-- Delete old seed badges to start fresh with realistic badges
DELETE FROM badges;

-- Seed new badges

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
