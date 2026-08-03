-- ==========================================
-- 079: MULTI-TENANT ARCHITECTURE
-- ==========================================

-- 1. Create global Institutions table
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    plan_id UUID REFERENCES public.pricing_plans(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);

-- 2. Create Institution Requests table
CREATE TABLE IF NOT EXISTS public.institution_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institute_name TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    phone TEXT,
    students_count INTEGER,
    faculty_count INTEGER,
    plan_selected TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'info_required')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- ADD INSTITUTION_ID TO TENANT TABLES
-- ==========================================

-- A function to safely add institution_id column if it doesn't exist
DO $$
DECLARE
    t_name TEXT;
    table_list TEXT[] := ARRAY[
        'profiles',
        'instructor_applications',
        'courses',
        'lessons',
        'assignments',
        'submissions',
        'badges',
        'user_badges',
        'enrollments',
        'lesson_progress',
        'xp_logs',
        'feedbacks',
        'notices',
        'monthly_rewards',
        'doubts',
        'doubt_replies',
        'doubt_views',
        'reply_votes',
        'doubt_tags',
        'doubt_likes',
        'course_polls',
        'course_poll_options',
        'course_poll_votes',
        'certificates',
        'course_alerts',
        'chats',
        'chat_participants',
        'chat_conversations',
        'chat_members',
        'chat_messages',
        'message_reactions',
        'message_deliveries',
        'hall_of_fame',
        'story_views',
        'story_reactions',
        'activity_feed',
        'story_likes',
        'hall_of_fame_stories',
        'subscriptions',
        'payment_settings',
        'transactions',
        'payments',
        'invoices',
        'coupon_usage',
        'refunds',
        'audit_logs'
    ];
BEGIN
    FOREACH t_name IN ARRAY table_list
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            -- Check if institution_id already exists
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'institution_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;', t_name);
                EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_institution_id ON public.%I(institution_id);', t_name, t_name);
            END IF;
        END IF;
    END LOOP;
END
$$;

-- Note: In a production migration, we would populate institution_id for existing records here before enforcing constraints.
-- Assuming single-tenant initially, we could make an 'hq' institution and update all.
-- But since it's a migration for an early startup, we'll leave it nullable and let app logic handle it or set a default tenant later.

-- Optional: Create a default institution and map existing data to it (to avoid breaking current LMS state)
DO $$
DECLARE
    default_inst_id UUID;
    t_name TEXT;
    table_list TEXT[] := ARRAY[
        'profiles',
        'instructor_applications',
        'courses',
        'lessons',
        'assignments',
        'submissions',
        'badges',
        'user_badges',
        'enrollments',
        'lesson_progress',
        'xp_logs',
        'feedbacks',
        'notices',
        'monthly_rewards',
        'doubts',
        'doubt_replies',
        'doubt_views',
        'reply_votes',
        'doubt_tags',
        'doubt_likes',
        'course_polls',
        'course_poll_options',
        'course_poll_votes',
        'certificates',
        'course_alerts',
        'chats',
        'chat_participants',
        'chat_conversations',
        'chat_members',
        'chat_messages',
        'message_reactions',
        'message_deliveries',
        'hall_of_fame',
        'story_views',
        'story_reactions',
        'activity_feed',
        'story_likes',
        'hall_of_fame_stories',
        'subscriptions',
        'payment_settings',
        'transactions',
        'payments',
        'invoices',
        'coupon_usage',
        'refunds',
        'audit_logs'
    ];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.institutions WHERE slug = 'main-campus') THEN
        INSERT INTO public.institutions (name, slug, domain, status)
        VALUES ('Main Campus', 'main-campus', 'main.smartlearn.ai', 'active')
        RETURNING id INTO default_inst_id;
        
        -- Update all existing records to point to this default institution
        FOREACH t_name IN ARRAY table_list
        LOOP
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
                EXECUTE format('UPDATE public.%I SET institution_id = %L WHERE institution_id IS NULL;', t_name, default_inst_id);
            END IF;
        END LOOP;
    END IF;
END
$$;

-- RLS Enforcement strategy:
-- The most effective way is altering existing policies, but since there are hundreds of policies, 
-- in Next.js backend we will primarily use application-level isolation (Supabase service role + strict standard `.eq('institution_id', value)` queries).
-- We can add a function to easily check tenant access.
CREATE OR REPLACE FUNCTION public.check_tenant_access(req_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_inst UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT institution_id INTO user_inst FROM public.profiles WHERE id = auth.uid();
    
    -- If user doesn't have an institution, deny.
    IF user_inst IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN user_inst = req_institution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
