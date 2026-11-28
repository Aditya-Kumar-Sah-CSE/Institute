export interface ClubFacultyMentor {
  id: string;
  name: string;
  club_role: string;
  post: string;
  timeline: string;
  photo_url: string | null;
  profile_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CoordinatorStatusMode = 'auto' | 'active' | 'past';

export interface ClubCoordinator {
  id: string;
  name: string;
  profile_url: string | null;
  batch_label: string;
  term_label: string;
  term_end_date: string; // YYYY-MM-DD
  status_mode: CoordinatorStatusMode;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClubEventWinner {
  medal: string;
  name: string;
  detail: string;
}

export interface ClubEvent {
  id: string;
  title: string;
  badge_label: string;
  event_date_label: string;
  venue: string;
  description: string;
  winners: ClubEventWinner[];
  image_urls: string[];
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function getTodayIstDateString(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Resolves whether a coordinator belongs to 'active' or 'past' cohort.
 * When status_mode is 'auto', any coordinator whose term_end_date has passed
 * (e.g. 2028-12-31 once 2028 ends on 2029-01-01 IST) automatically transitions to 'past'.
 */
export function resolveCoordinatorStatus(
  coord: Pick<ClubCoordinator, 'term_end_date' | 'status_mode'>,
  todayIst = getTodayIstDateString()
): 'active' | 'past' {
  if (coord.status_mode === 'active') return 'active';
  if (coord.status_mode === 'past') return 'past';
  const endDate = String(coord.term_end_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return 'active';
  return todayIst <= endDate ? 'active' : 'past';
}

export function sanitizePublicHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme =
    /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')
      ? trimmed
      : `https://${trimmed}`;

  if (withScheme.startsWith('/') && !withScheme.startsWith('//')) {
    return withScheme.slice(0, 500);
  }

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString().slice(0, 500);
    }
  } catch {
    return null;
  }
  return null;
}

export function sanitizeClubPhotoUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/images/') && !trimmed.startsWith('//')) {
    return trimmed.slice(0, 500);
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString().slice(0, 1000);
    }
  } catch {
    return null;
  }
  return null;
}

