-- Migration 154: Dynamic Coding Club & Campus Events with Photos + Winners

CREATE TABLE IF NOT EXISTS public.club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  badge_label TEXT NOT NULL DEFAULT 'Club Event',
  event_date_label TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  winners JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_events_active_order
  ON public.club_events(is_active, sort_order, created_at DESC);

ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active club events" ON public.club_events;
CREATE POLICY "Public can view active club events"
  ON public.club_events
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admin can manage club events" ON public.club_events;
CREATE POLICY "Super admin can manage club events"
  ON public.club_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

INSERT INTO public.club_events (
  title,
  badge_label,
  event_date_label,
  venue,
  description,
  winners,
  image_urls,
  sort_order,
  is_active
)
SELECT
  v.title,
  v.badge_label,
  v.event_date_label,
  v.venue,
  v.description,
  v.winners::jsonb,
  v.image_urls,
  1,
  true
FROM (
  VALUES (
    '🏆 Coding Contest — Winners Announcement! 💻🎉',
    'Winners Announcement',
    '10 Aug 2026 • 1.5 Hours',
    'CSE Department, BCE Bhagalpur',
    E'Today, we celebrated the talent, creativity, and problem-solving skills of the participants who took part in our Coding Contest!\nAfter an exciting competition featuring 3 DSA Problems (C only), we are thrilled to recognize our top performers and celebrate their achievement.',
    '[{"medal":"🥇","name":"Rajnish Kumar","detail":"2nd Year CSE"},{"medal":"🥈","name":"Aditya Kumar Sah","detail":"3rd Year CSE"},{"medal":"🥉","name":"Rohit Kumar","detail":"3rd Year CSE"},{"medal":"🏅","name":"Sneha Kumari","detail":"3rd Year CSE"}]',
    ARRAY[
      '/images/events/coding-contest-winner-1-rajnish.png',
      '/images/events/coding-contest-winner-2-aditya.jpg',
      '/images/events/coding-contest-poster.png'
    ]
  )
) AS v(title, badge_label, event_date_label, venue, description, winners, image_urls)
WHERE NOT EXISTS (SELECT 1 FROM public.club_events);

