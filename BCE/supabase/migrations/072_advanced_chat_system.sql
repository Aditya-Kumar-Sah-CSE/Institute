-- ==========================================
-- ROLLBACK MVP TABLES FROM 071
-- ==========================================
DROP FUNCTION IF EXISTS get_direct_chat(UUID, UUID);
DROP TABLE IF EXISTS story_likes CASCADE;
DROP TABLE IF EXISTS hall_of_fame_stories CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chats CASCADE;

-- ==========================================
-- 1. CAMPUS CHAT SYSTEM (NORMALIZED)
-- ==========================================
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('personal', 'group')),
  name TEXT, 
  description TEXT,
  icon_url TEXT,
  is_private BOOLEAN DEFAULT true, -- If false, it's a public auto-join group
  join_requires_approval BOOLEAN DEFAULT false,
  settings_jsonb JSONB DEFAULT '{"announcement_mode": false, "allow_attachments": true}'::jsonb,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

CREATE TABLE chat_members (
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member', 'pending')),
  mute_until TIMESTAMPTZ,
  last_read_message_id UUID, -- For robust read receipts
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(conversation_id, user_id)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT, -- Nullable if it's only an attachment
  attachment_type TEXT CHECK (attachment_type IN ('text', 'image', 'video', 'pdf', 'audio', 'lesson', 'assignment', 'notice', 'course', 'doubt')),
  attachment_link TEXT, -- Could be a URL or an internal resource ID (UUID string)
  reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL, -- Self reference for replies
  is_edited BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  deleted_for_everyone BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE message_reactions (
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);
-- Delivery read receipts are tracked optimally by last_read_message_id in chat_members to save DB writes,
-- but for exact timestamps we can use message_deliveries
CREATE TABLE message_deliveries (
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('delivered', 'read')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(message_id, user_id)
);

-- Indexes for scaling messages
CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_chat_messages_conn_id ON chat_messages(conversation_id) WHERE deleted_for_everyone = false;
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- ==========================================
-- 2. HALL OF FAME (STORIES)
-- ==========================================
CREATE TABLE hall_of_fame (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('badge', 'leaderboard', 'xp', 'certificate', 'course', 'faculty')),
  reference_id UUID, -- Depending on category, this links to badges.id, courses.id, etc.
  caption TEXT,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE TABLE story_views (
  story_id UUID REFERENCES hall_of_fame(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE story_reactions (
  story_id UUID REFERENCES hall_of_fame(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, user_id)
);

CREATE INDEX idx_stories_user_active ON hall_of_fame(user_id, expires_at) WHERE is_hidden = false;

-- ==========================================
-- 3. ACTIVITY FEED
-- ==========================================
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  metadata JSONB, -- Stores dynamic keys like { "badge_name": "JS Master", "course_name": "React" }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_created ON activity_feed(created_at DESC);

-- ==========================================
-- SECURITY (RLS)
-- ==========================================
-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_of_fame ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;


-- Conversation Security
CREATE POLICY "Conversations viewable by members" ON chat_conversations
  FOR SELECT USING (
    id IN (SELECT conversation_id FROM chat_members WHERE user_id = auth.uid() AND role != 'pending')
  );

-- Chat Members Security
CREATE POLICY "Members can view participants" ON chat_members
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM chat_members WHERE user_id = auth.uid())
  );

-- Chat Messages Security
CREATE POLICY "Members can view messages" ON chat_messages
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM chat_members WHERE user_id = auth.uid() AND role != 'pending')
  );

CREATE POLICY "Members can insert messages" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND 
    conversation_id IN (
      SELECT conversation_id FROM chat_members 
      WHERE user_id = auth.uid() AND role != 'pending'
    )
  );

CREATE POLICY "Senders can edit their own active messages" ON chat_messages
  FOR UPDATE USING (
    sender_id = auth.uid() AND deleted_for_everyone = false 
    AND (EXTRACT(EPOCH FROM (NOW() - created_at)) / 60) <= 5 -- 5 minutes edit window limit
  );


-- Hall of Fame RLS
CREATE POLICY "Anyone can view active stories" ON hall_of_fame
  FOR SELECT USING (auth.role() = 'authenticated' AND is_hidden = false);

CREATE POLICY "Users insert own story" ON hall_of_fame
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users edit own story" ON hall_of_fame
  FOR UPDATE USING (user_id = auth.uid());


-- Activity Feed RLS
CREATE POLICY "Everyone views activity" ON activity_feed
  FOR SELECT USING (auth.role() = 'authenticated');


-- ==========================================
-- HELPERS & RPCs
-- ==========================================
-- Fetch a direct conversation ID between two users efficiently
CREATE OR REPLACE FUNCTION get_or_create_direct_chat(peer_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  me_id UUID := auth.uid();
BEGIN
  -- Search for existing personal conversation
  SELECT cm1.conversation_id INTO conv_id
  FROM chat_members cm1
  JOIN chat_members cm2 ON cm1.conversation_id = cm2.conversation_id
  JOIN chat_conversations c ON c.id = cm1.conversation_id
  WHERE c.type = 'personal'
    AND cm1.user_id = me_id
    AND cm2.user_id = peer_id
  LIMIT 1;

  -- Create if missing
  IF conv_id IS NULL THEN
    INSERT INTO chat_conversations (type, is_private) VALUES ('personal', true) RETURNING id INTO conv_id;
    INSERT INTO chat_members (conversation_id, user_id, role) VALUES (conv_id, me_id, 'owner'), (conv_id, peer_id, 'member');
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- REALTIME
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE hall_of_fame;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
