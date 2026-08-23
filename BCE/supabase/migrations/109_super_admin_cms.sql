CREATE TABLE IF NOT EXISTS public.global_feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.landing_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hero_badge TEXT,
  hero_heading TEXT,
  hero_highlight TEXT,
  hero_description TEXT,
  hero_image_url TEXT,
  hero_cta_text TEXT,
  hero_cta_link TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.landing_core_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Star',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_core_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads global feature flags" ON public.global_feature_flags FOR SELECT USING (true);
CREATE POLICY "Public reads landing content" ON public.landing_content FOR SELECT USING (true);
CREATE POLICY "Public reads active landing core features" ON public.landing_core_features FOR SELECT USING (is_active = true);

-- All writes use the service-role-backed Super Admin API; normal users receive no write policies.
CREATE INDEX IF NOT EXISTS idx_landing_core_features_sort ON public.landing_core_features(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_landing_gallery_sort ON public.landing_gallery(is_active, sort_order);
