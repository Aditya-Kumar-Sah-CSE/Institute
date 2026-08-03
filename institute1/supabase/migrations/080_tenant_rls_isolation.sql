-- ==========================================
-- 080: MULTI-TENANT ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Function to determine if a row belongs to the current user's institution
CREATE OR REPLACE FUNCTION public.belongs_to_current_tenant(row_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_inst UUID;
BEGIN
    -- SuperAdmins can see everything
    IF public.is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Fetch user's institution
    SELECT institution_id INTO user_inst FROM public.profiles WHERE id = auth.uid();
    
    -- If user has no institution, deny. If row has no institution, deny (unless global).
    IF user_inst IS NULL OR row_institution_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN user_inst = row_institution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS for all tenant-specific tables and add comprehensive isolation policies.
-- We use a DO block to bulk-apply the policy.
DO $$
DECLARE
    t_name TEXT;
    table_list TEXT[] := ARRAY[
        'profiles',
        'courses',
        'lessons',
        'assignments',
        'submissions',
        'enrollments',
        'lesson_progress',
        'xp_logs',
        'notices',
        'course_alerts',
        'monthly_rewards',
        'doubts',
        'doubt_replies',
        'chats',
        'chat_messages',
        'hall_of_fame'
    ];
BEGIN
    FOREACH t_name IN ARRAY table_list
    LOOP
        -- Skip if table doesn't exist or doesn't have institution_id yet
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'institution_id') THEN
            
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
            
            -- Drop existing permissive policy if we created one before
            EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation policy for %I" ON public.%I;', t_name, t_name);
            
            -- Create the unified tenant isolation policy for SELECT, INSERT, UPDATE, DELETE
            EXECUTE format('
                CREATE POLICY "Tenant isolation policy for %I" 
                ON public.%I 
                FOR ALL 
                USING (public.belongs_to_current_tenant(institution_id))
                WITH CHECK (public.belongs_to_current_tenant(institution_id));
            ', t_name, t_name);

        END IF;
    END LOOP;
END
$$;

-- Modify profiles table specifically because a new user signing up needs to be assigned to an institution.
-- But signups are handled via backend service roles usually, so RLS might not block them if using service key.

-- Add index to speed up belongs_to_current_tenant
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(institution_id, id);
