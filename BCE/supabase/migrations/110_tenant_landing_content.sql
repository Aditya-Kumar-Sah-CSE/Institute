CREATE TABLE IF NOT EXISTS public.tenant_landing_content (
  institution_id UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
  tagline TEXT,
  hero_badge TEXT,
  hero_heading TEXT,
  hero_highlight TEXT,
  hero_description TEXT,
  hero_image_url TEXT,
  hero_cta_text TEXT,
  hero_cta_link TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tenant_landing_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(institution_id, id)
);
CREATE TABLE IF NOT EXISTS public.tenant_landing_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Star',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.tenant_landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_landing_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_landing_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read tenant landing content" ON public.tenant_landing_content FOR SELECT USING (true);
CREATE POLICY "Public can read active tenant landing cards" ON public.tenant_landing_gallery FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active tenant landing features" ON public.tenant_landing_features FOR SELECT USING (is_active = true);
CREATE INDEX IF NOT EXISTS idx_tenant_landing_gallery_scope ON public.tenant_landing_gallery(institution_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_tenant_landing_features_scope ON public.tenant_landing_features(institution_id, is_active, sort_order);
