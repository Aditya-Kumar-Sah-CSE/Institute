-- 1. Add assignments_approved Badges
INSERT INTO badges (name, icon, description, condition_type, condition_value) VALUES
('First Assignment', '📝', '1st assignment approved by faculty', 'assignments_approved', 1),
('Steady Submitter', '✍️', '5th assignment approved by faculty', 'assignments_approved', 5),
('Dedicated Worker', '🎯', '10th assignment approved by faculty', 'assignments_approved', 10),
('Assignment Machine', '🤖', '50th assignment approved by faculty', 'assignments_approved', 50),
('Centurion Scholar', '💯', '100th assignment approved by faculty', 'assignments_approved', 100);

-- 2. Add is_seen to user_badges for the Celebration Popup
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS is_seen BOOLEAN DEFAULT false;

-- 3. Set existing user_badges to true so they don't trigger popups retroactively
UPDATE user_badges SET is_seen = true WHERE is_seen = false;
