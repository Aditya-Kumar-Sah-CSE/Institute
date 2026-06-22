-- Seed basic badges
INSERT INTO badges (name, icon, description, condition_type, condition_value) VALUES
('Git Starter', '🧑‍💻', 'Made your first GitHub submission', 'github_count', 1),
('First Deploy', '🚀', 'Deployed your first project', 'deploy_count', 1),
('JS Master', '⚡', 'Earned 500+ XP in JavaScript', 'xp_threshold', 500),
('React Builder', '⚛️', 'Completed the React course', 'course_complete', 1),
('Full Stack Warrior', '🏆', 'Reached Pro level', 'xp_threshold', 3000),
('Streak Master', '🔥', '7-day learning streak', 'streak_days', 7);

-- Note: The super admin seeding is handled via a server action or direct database insertion
-- script because passwords need to be securely hashed via Supabase Auth.
-- We will create a script/API to bootstrap the super admin.
