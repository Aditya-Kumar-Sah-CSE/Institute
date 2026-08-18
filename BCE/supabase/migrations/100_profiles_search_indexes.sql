-- =========================================================================
-- INDEXES FOR FAST PROFILE LOOKUPS AND SEARCHING BY NAME AND EMAIL
-- =========================================================================

-- Scoped lookups by institute_id and role
CREATE INDEX IF NOT EXISTS idx_profiles_institute_role ON public.profiles(institute_id, role);

-- Case-insensitive searches on name and email
CREATE INDEX IF NOT EXISTS idx_profiles_lower_email ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_lower_name ON public.profiles(lower(name));
