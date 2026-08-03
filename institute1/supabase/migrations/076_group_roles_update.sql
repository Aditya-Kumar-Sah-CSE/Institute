-- ==========================================
-- UPDATE CHAT ROLES TO MATCH REQUIREMENT
-- ==========================================

-- Drop the previous check constraint for roles
ALTER TABLE chat_members DROP CONSTRAINT IF EXISTS chat_members_role_check;

-- Migrate existing roles logically
UPDATE chat_members SET role = 'founder' WHERE role = 'owner';
UPDATE chat_members SET role = 'co-founder' WHERE role = 'admin'; 
UPDATE chat_members SET role = 'admin' WHERE role = 'moderator';

-- Add the new exact check constraint
ALTER TABLE chat_members ADD CONSTRAINT chat_members_role_check CHECK (role IN ('founder', 'co-founder', 'admin', 'member', 'pending'));
