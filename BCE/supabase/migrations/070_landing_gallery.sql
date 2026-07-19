-- Landing Gallery Table for dynamic gallery on the landing page
CREATE TABLE IF NOT EXISTS landing_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE landing_gallery ENABLE ROW LEVEL SECURITY;

-- Everyone can read active gallery items
DROP POLICY IF EXISTS "Gallery viewable by everyone" ON landing_gallery;
CREATE POLICY "Gallery viewable by everyone" ON landing_gallery
  FOR SELECT USING (is_active = true);

-- Only admins can manage gallery
DROP POLICY IF EXISTS "Admins can manage gallery" ON landing_gallery;
CREATE POLICY "Admins can manage gallery" ON landing_gallery
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
