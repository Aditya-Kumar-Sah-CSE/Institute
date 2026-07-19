-- ==========================================
-- CHAT SYSTEM
-- ==========================================

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('personal', 'group')),
  name TEXT, -- Nullable, used for groups
  is_open BOOLEAN DEFAULT true, -- If false, requires permission to join (for groups)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_participants (
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(chat_id, user_id)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- RLS POLICIES FOR CHAT
-- ==========================================

-- Chats: participants can read the chat record
CREATE POLICY "Participants can view their chats" ON chats
  FOR SELECT USING (
    id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Authenticated users can create chats" ON chats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Subquery for group updates
CREATE POLICY "Admins can update their group chats" ON chats
  FOR UPDATE USING (
    id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );


-- Chat Participants
CREATE POLICY "Users can view participants of their chats" ON chat_participants
  FOR SELECT USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add themselves to open chats or create chats" ON chat_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update participant status" ON chat_participants
  FOR UPDATE USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = auth.uid() AND role = 'admin'
    ) OR user_id = auth.uid() -- So a user can accept their own invite or leave
  );

CREATE POLICY "Admins can remove participants" ON chat_participants
  FOR DELETE USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = auth.uid() AND role = 'admin'
    ) OR user_id = auth.uid() -- A user can leave
  );


-- Chat Messages
CREATE POLICY "Participants can view messages" ON chat_messages
  FOR SELECT USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "Participants can insert messages" ON chat_messages
  FOR INSERT WITH CHECK (
    chat_id IN (
      SELECT chat_id FROM chat_participants 
      WHERE user_id = auth.uid() AND status = 'accepted'
    ) AND sender_id = auth.uid()
  );

CREATE POLICY "Senders can update their messages" ON chat_messages
  FOR UPDATE USING (sender_id = auth.uid());


-- ==========================================
-- HALL OF FAME (STATUS/STORIES)
-- ==========================================

CREATE TABLE hall_of_fame_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE SET NULL, -- Link to reward
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE TABLE story_likes (
  story_id UUID REFERENCES hall_of_fame_stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, user_id)
);

CREATE INDEX idx_stories_user_id ON hall_of_fame_stories(user_id);
CREATE INDEX idx_stories_active ON hall_of_fame_stories(expires_at) WHERE expires_at > NOW();

ALTER TABLE hall_of_fame_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active stories
CREATE POLICY "Anyone can view active stories" ON hall_of_fame_stories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create their own stories" ON hall_of_fame_stories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own stories" ON hall_of_fame_stories
  FOR DELETE USING (user_id = auth.uid());

-- Likes
CREATE POLICY "Anyone can view story likes" ON story_likes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can like stories" ON story_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike stories" ON story_likes
  FOR DELETE USING (user_id = auth.uid());

-- ==========================================
-- REALTIME ENABLEMENT
-- ==========================================
-- Need to enable realtime for chats to function instantly
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE hall_of_fame_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE story_likes;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION get_direct_chat(user1_id UUID, user2_id UUID)
RETURNS TABLE(chat_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT cp1.chat_id
  FROM chat_participants cp1
  JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
  JOIN chats c ON c.id = cp1.chat_id
  WHERE c.type = 'personal'
    AND cp1.user_id = user1_id
    AND cp2.user_id = user2_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

