-- RLS Policy to allow poll creators and course instructors to delete polls
DROP POLICY IF EXISTS "Creators and course instructors can delete polls" ON public.course_polls;

CREATE POLICY "Creators and course instructors can delete polls"
    ON public.course_polls FOR DELETE
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_polls.course_id AND c.created_by = auth.uid()
        )
    );
