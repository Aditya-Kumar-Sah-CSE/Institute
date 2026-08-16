-- Drop and redefine delete policy for course_alerts
DROP POLICY IF EXISTS "Course participants can delete alerts" ON public.course_alerts;

CREATE POLICY "Course participants can delete alerts"
    ON public.course_alerts FOR DELETE
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_alerts.course_id AND c.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
