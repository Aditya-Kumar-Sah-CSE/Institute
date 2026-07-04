-- Create function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create notices table
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Policies for notices
CREATE POLICY "Anyone can view notices"
    ON public.notices FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins and instructors can insert notices"
    ON public.notices FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

CREATE POLICY "Admins can update any notice, instructors can update their own"
    ON public.notices FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        (
            author_id = auth.uid() AND
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'instructor'
            )
        )
    );

CREATE POLICY "Admins can delete any notice, instructors can delete their own"
    ON public.notices FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        (
            author_id = auth.uid() AND
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'instructor'
            )
        )
    );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_notices_updated_at ON public.notices;
CREATE TRIGGER update_notices_updated_at
    BEFORE UPDATE ON public.notices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
