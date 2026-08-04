-- ==========================================
-- 081: AUTO-INJECT INSTITUTION_ID TRIGGER
-- ==========================================
-- This migration ensures that any INSERT into a tenant-specific table 
-- automatically assigns the row to the current authenticated user's institution,
-- preventing data leakage and removing the need to hardcode `institution_id`
-- across 60+ backend server actions.

CREATE OR REPLACE FUNCTION public.auto_set_institution_id()
RETURNS TRIGGER AS $$
DECLARE
    user_inst UUID;
BEGIN
    -- If institution_id is explicitly provided (e.g., system service or SuperAdmin override), use it.
    IF NEW.institution_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Otherwise, fetch from current user's profile
    IF auth.uid() IS NOT NULL THEN
        SELECT institution_id INTO user_inst FROM public.profiles WHERE id = auth.uid();
        NEW.institution_id := user_inst;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Loop through all tenant-specific tables and apply the trigger
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
        -- Apply trigger only if table exists and has institution_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'institution_id') THEN
            
            EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_set_institution_id ON public.%I;', t_name);
            
            -- Only on INSERT
            EXECUTE format('
                CREATE TRIGGER trg_auto_set_institution_id
                BEFORE INSERT ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.auto_set_institution_id();
            ', t_name);
            
        END IF;
    END LOOP;
END
$$;

-- OPTIONAL BACKFILL SCRIPT (Runs instantly if you execute this migration)
-- This takes any currently orphaned rows (institution_id = NULL) and attaches them
-- to a default institution if one exists, ensuring current UI testing doesn't break due to invisible rows.
DO $$
DECLARE
    default_inst UUID;
    t_name TEXT;
    table_list TEXT[] := ARRAY[
        'profiles', 'courses', 'lessons', 'assignments', 'submissions',
        'enrollments', 'notices', 'chats', 'chat_messages', 'course_alerts'
    ];
BEGIN
    -- get the first active institution to use as fallback for orphaned rows
    SELECT id INTO default_inst FROM public.institutions WHERE status = 'active' LIMIT 1;
    
    IF default_inst IS NOT NULL THEN
        FOREACH t_name IN ARRAY table_list
        LOOP
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'institution_id') THEN
                EXECUTE format('UPDATE public.%I SET institution_id = %L WHERE institution_id IS NULL;', t_name, default_inst);
            END IF;
        END LOOP;
    END IF;
END
$$;
