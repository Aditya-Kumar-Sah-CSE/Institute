-- Update default Hero copy on landing page to reflect Debuggerzz — Official Coding Club of BCE Bhagalpur
-- Preserves hero_image_url, CTA links/text, and remains editable via /super-admin/landing.

UPDATE public.landing_content
SET
  hero_badge = 'Debuggerzz • Official Coding Club of BCE Bhagalpur',
  hero_heading = 'Debuggerzz Coding Club.',
  hero_highlight = 'Code. Compete. Conquer.',
  hero_description = 'The official student-driven coding and tech community of Bhagalpur College of Engineering (BCE Bhagalpur) — master DSA, practice SQL & mocks, compete in coding battles, and grow together.',
  updated_at = NOW()
WHERE id = 'default';

