-- Faculty Badges for Course (Batch) Creation
INSERT INTO badges (name, icon, description, condition_type, condition_value, bonus_xp) VALUES
('First Batch', '🌱', 'Created your 1st course/batch', 'courses_created', 1, 100),
('Growing Mentor', '🌟', 'Created your 5th course/batch', 'courses_created', 5, 250),
('Seasoned Instructor', '🎓', 'Created your 10th course/batch', 'courses_created', 10, 500),
('Prolific Educator', '🏛️', 'Created your 50th course/batch', 'courses_created', 50, 2000),
('Century Creator', '👑', 'Created your 100th course/batch', 'courses_created', 100, 5000),
('Master Architect', '🌌', 'Created your 500th course/batch', 'courses_created', 500, 10000),
('Legendary Founder', '🏆', 'Created your 1000th course/batch', 'courses_created', 1000, 25000);
