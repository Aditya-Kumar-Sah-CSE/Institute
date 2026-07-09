-- Insert Continuous Streaks (Independent from Active Days) (6 badges)
INSERT INTO badges (name, icon, description, condition_type, condition_value, bonus_xp) VALUES
('Weekend Warrior', '🏃', 'Achieved a 3-Day Login Streak', 'streak_days', 3, 50),
('One Week Sprint', '🏃‍♂️', 'Achieved a 7-Day Login Streak', 'streak_days', 7, 200),
('Fortnight Flash', '⚡', 'Achieved a 14-Day Login Streak', 'streak_days', 14, 500),
('Monthly Marathon', '🗓️', 'Achieved a 30-Day Login Streak', 'streak_days', 30, 2000),
('Unstoppable', '🔥', 'Achieved a 50-Day Login Streak', 'streak_days', 50, 4000),
('Century Streak', '💯', 'Achieved a 100-Day Login Streak', 'streak_days', 100, 10000);
