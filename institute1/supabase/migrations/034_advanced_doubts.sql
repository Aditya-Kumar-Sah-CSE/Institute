-- ==========================================
-- ADVANCED DOUBTS SYSTEM UPGRADE
-- ==========================================

-- 1. Alter existing `doubt_replies` table
ALTER TABLE public.doubt_replies
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.doubt_replies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS upvotes_count INTEGER DEFAULT 0;

-- 2. Create `doubt_views` table
CREATE TABLE IF NOT EXISTS public.doubt_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    UNIQUE(doubt_id, user_id)
);

-- 3. Create `reply_votes` table (Upvotes)
CREATE TABLE IF NOT EXISTS public.reply_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID REFERENCES public.doubt_replies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    UNIQUE(reply_id, user_id)
);

-- 4. Create `doubt_tags` table
CREATE TABLE IF NOT EXISTS public.doubt_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    UNIQUE(doubt_id, tag_name)
);

-- 5. Create `notifications` table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'mention', 'reply', 'faculty_reply', 'accepted', 'upvote'
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 6. Trigger to automatically update `upvotes_count` on `doubt_replies`
CREATE OR REPLACE FUNCTION public.update_reply_upvotes_count()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'upvote' THEN
            UPDATE public.doubt_replies SET upvotes_count = upvotes_count + 1 WHERE id = NEW.reply_id;
        ELSIF NEW.vote_type = 'downvote' THEN
            UPDATE public.doubt_replies SET upvotes_count = upvotes_count - 1 WHERE id = NEW.reply_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'upvote' THEN
            UPDATE public.doubt_replies SET upvotes_count = upvotes_count - 1 WHERE id = OLD.reply_id;
        ELSIF OLD.vote_type = 'downvote' THEN
            UPDATE public.doubt_replies SET upvotes_count = upvotes_count + 1 WHERE id = OLD.reply_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.vote_type != NEW.vote_type THEN
            IF NEW.vote_type = 'upvote' THEN
                UPDATE public.doubt_replies SET upvotes_count = upvotes_count + 2 WHERE id = NEW.reply_id;
            ELSIF NEW.vote_type = 'downvote' THEN
                UPDATE public.doubt_replies SET upvotes_count = upvotes_count - 2 WHERE id = NEW.reply_id;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_reply_vote_changed ON public.reply_votes;
CREATE TRIGGER on_reply_vote_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.reply_votes
    FOR EACH ROW EXECUTE PROCEDURE public.update_reply_upvotes_count();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.doubt_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Doubt Views RLS
CREATE POLICY "Users can view views for doubts they can access"
    ON public.doubt_views FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.doubts WHERE id = doubt_views.doubt_id AND public.has_batch_access(batch)));

CREATE POLICY "Users can insert their own view"
    ON public.doubt_views FOR INSERT
    WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.doubts WHERE id = doubt_id AND public.has_batch_access(batch)));

-- Reply Votes RLS
CREATE POLICY "Users can view votes for replies they can access"
    ON public.reply_votes FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.doubt_replies WHERE id = reply_votes.reply_id));

CREATE POLICY "Users can insert/update/delete their own votes"
    ON public.reply_votes FOR ALL
    USING (auth.uid() = user_id);

-- Doubt Tags RLS
CREATE POLICY "Anyone with batch access can view tags"
    ON public.doubt_tags FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.doubts WHERE id = doubt_tags.doubt_id AND public.has_batch_access(batch)));

CREATE POLICY "Doubt creator or faculty can manage tags"
    ON public.doubt_tags FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.doubts WHERE id = doubt_tags.doubt_id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))
    );

-- Notifications RLS
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can update their own notifications (mark as read)"
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT WITH CHECK (true); -- Usually handled by server actions

-- ==========================================
-- STORAGE BUCKET FOR DOUBT MEDIA
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('doubt_media', 'doubt_media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Doubt media is publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'doubt_media');

CREATE POLICY "Authenticated users can upload doubt media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'doubt_media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own doubt media"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'doubt_media' AND auth.uid() = owner);
