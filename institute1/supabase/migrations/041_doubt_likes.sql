-- Add doubt_likes table
CREATE TABLE IF NOT EXISTS public.doubt_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    UNIQUE(doubt_id, user_id)
);

-- Add likes_count to doubts table
ALTER TABLE public.doubts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.doubt_likes ENABLE ROW LEVEL SECURITY;

-- Policies for doubt_likes
CREATE POLICY "Users can view likes for doubts they can access"
    ON public.doubt_likes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.doubts 
            WHERE id = public.doubt_likes.doubt_id 
            AND public.has_batch_access(public.doubts.batch)
        )
    );

CREATE POLICY "Users can like doubts they can access"
    ON public.doubt_likes
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.doubts 
            WHERE id = doubt_id 
            AND public.has_batch_access(public.doubts.batch)
        )
    );

CREATE POLICY "Users can unlike their own likes"
    ON public.doubt_likes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update likes_count
CREATE OR REPLACE FUNCTION public.update_doubt_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.doubts SET likes_count = likes_count + 1 WHERE id = NEW.doubt_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.doubts SET likes_count = likes_count - 1 WHERE id = OLD.doubt_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_doubt_likes_count_trigger ON public.doubt_likes;

CREATE TRIGGER update_doubt_likes_count_trigger
    AFTER INSERT OR DELETE ON public.doubt_likes
    FOR EACH ROW EXECUTE PROCEDURE public.update_doubt_likes_count();
