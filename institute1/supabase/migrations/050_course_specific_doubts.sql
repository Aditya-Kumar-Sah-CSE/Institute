-- ==========================================
-- RESTRICT DOUBT REPLIES TO ENROLLED STUDENTS
-- ==========================================

-- Drop the existing insert policy for doubt_replies
DROP POLICY IF EXISTS "Users can insert replies for doubts they can access" ON public.doubt_replies;

-- Recreate with strict course enrollment check
CREATE POLICY "Users can insert replies for doubts they can access"
    ON public.doubt_replies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.doubts d
            WHERE d.id = doubt_id 
            AND public.has_batch_access(d.batch)
            AND (
                d.course_id IS NULL 
                OR EXISTS (
                    SELECT 1 FROM public.enrollments e 
                    WHERE e.course_id = d.course_id 
                    AND e.user_id = auth.uid() 
                    AND e.status = 'approved'
                )
                OR EXISTS (
                    SELECT 1 FROM public.courses c
                    WHERE c.id = d.course_id AND c.created_by = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid() AND p.role IN ('admin', 'instructor')
                )
            )
        )
    );
