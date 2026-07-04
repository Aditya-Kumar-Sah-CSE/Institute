-- Create doubts table
CREATE TABLE IF NOT EXISTS public.doubts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    batch TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Create doubt_replies table
CREATE TABLE IF NOT EXISTS public.doubt_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    is_accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_replies ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has access to a batch
CREATE OR REPLACE FUNCTION public.has_batch_access(target_batch TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_batch TEXT;
BEGIN
    SELECT role, graduation_period INTO user_role, user_batch 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    IF user_role IN ('admin', 'instructor') THEN
        RETURN TRUE;
    END IF;
    
    RETURN user_batch = target_batch;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for Doubts
CREATE POLICY "Users can view doubts in their batch or all if admin/instructor"
    ON public.doubts
    FOR SELECT
    USING (public.has_batch_access(batch));

CREATE POLICY "Users can insert doubts in their batch"
    ON public.doubts
    FOR INSERT
    WITH CHECK (public.has_batch_access(batch));

CREATE POLICY "Users can update their own doubts or if admin/instructor"
    ON public.doubts
    FOR UPDATE
    USING (auth.uid() = user_id OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))));

CREATE POLICY "Users can delete their own doubts or if admin/instructor"
    ON public.doubts
    FOR DELETE
    USING (auth.uid() = user_id OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))));


-- RLS for Doubt Replies
CREATE POLICY "Users can view replies for doubts they can access"
    ON public.doubt_replies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.doubts 
            WHERE id = public.doubt_replies.doubt_id 
            AND public.has_batch_access(public.doubts.batch)
        )
    );

CREATE POLICY "Users can insert replies for doubts they can access"
    ON public.doubt_replies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.doubts 
            WHERE id = doubt_id 
            AND public.has_batch_access(public.doubts.batch)
        )
    );

CREATE POLICY "Users can update their own replies or if admin/instructor"
    ON public.doubt_replies
    FOR UPDATE
    USING (auth.uid() = user_id OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))));

CREATE POLICY "Users can delete their own replies or if admin/instructor"
    ON public.doubt_replies
    FOR DELETE
    USING (auth.uid() = user_id OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'instructor'))));

-- Allow the creator of the doubt to mark a reply as accepted
CREATE POLICY "Doubt creators can accept replies"
    ON public.doubt_replies
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.doubts 
            WHERE id = public.doubt_replies.doubt_id 
            AND public.doubts.user_id = auth.uid()
        )
    );
