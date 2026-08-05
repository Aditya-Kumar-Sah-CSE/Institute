-- Migration 078: Multi-Tenant Institutions Foundation
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT,
    logo TEXT,
    favicon TEXT,
    cover_image TEXT,
    description TEXT,
    primary_color TEXT DEFAULT '#4F46E5',
    secondary_color TEXT DEFAULT '#06B6D4',
    website TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    domain TEXT UNIQUE,
    subdomain TEXT UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast tenant lookup by slug, domain, or subdomain
CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_domain ON public.institutions(domain);
CREATE INDEX IF NOT EXISTS idx_institutions_subdomain ON public.institutions(subdomain);

-- Add institution_id to profiles table if not present
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_profiles_institution_id ON public.profiles(institution_id);
    END IF;
END $$;
