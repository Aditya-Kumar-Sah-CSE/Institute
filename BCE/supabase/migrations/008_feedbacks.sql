-- Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'Student', 'Faculty', etc.
    category TEXT NOT NULL, -- 'Doubt', 'Issue', 'Bug'
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedbacks (public or authenticated)
CREATE POLICY "Anyone can insert feedbacks"
    ON public.feedbacks
    FOR INSERT
    WITH CHECK (true);

-- Allow authenticated users to view feedbacks (so instructors and admins can view)
CREATE POLICY "Authenticated users can view feedbacks"
    ON public.feedbacks
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to update feedbacks (instructors/admins resolving)
CREATE POLICY "Authenticated users can update feedbacks"
    ON public.feedbacks
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete feedbacks (instructors/admins deleting)
CREATE POLICY "Authenticated users can delete feedbacks"
    ON public.feedbacks
    FOR DELETE
    USING (auth.role() = 'authenticated');
