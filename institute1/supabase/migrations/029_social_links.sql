-- Add social_links column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Insert new badges for adding profile links
INSERT INTO badges (name, icon, description, condition_type, condition_value, bonus_xp) VALUES
('Social Starter', '🔗', 'Added 1 social/coding profile link', 'social_links', 1, 20),
('Networker', '🌐', 'Added 3 social/coding profile links', 'social_links', 3, 50),
('Omnipresent', '🦋', 'Added 5 social/coding profile links', 'social_links', 5, 100);
