import { createClient } from '@/lib/supabase/server';
import LeaderboardTable from '@/features/leaderboard/components/LeaderboardTable';
import CourseFilter from '@/features/leaderboard/components/CourseFilter';
import type { LeaderboardEntry, LevelName } from '@/types';

export default async function LeaderboardPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const params = await searchParams;
  const filter = params.filter || 'global';

  const coursesQuery = supabase.from('courses').select('id, title').eq('is_published', true);

  let profilesQuery;
  let enrollmentsQuery;

  if (filter === 'global' || filter === 'weekly') {
    profilesQuery = supabase
      .from('profiles')
      .select('*, user_badges(count)')
      .neq('role', 'admin')
      .neq('role', 'instructor')
      .order('xp', { ascending: false })
      .limit(50);
  } else {
    enrollmentsQuery = supabase
      .from('enrollments')
      .select('progress, user_id, profiles!inner(id, name, avatar_url, xp, level, role, user_badges(count))')
      .eq('course_id', filter)
      .neq('profiles.role', 'admin')
      .neq('profiles.role', 'instructor')
      .order('progress', { ascending: false })
      .limit(50);
  }

  const [coursesRes, profilesRes, enrollmentsRes] = await Promise.all([
    coursesQuery,
    profilesQuery ? profilesQuery : Promise.resolve({ data: null }),
    enrollmentsQuery ? enrollmentsQuery : Promise.resolve({ data: null })
  ]);

  const courses = coursesRes.data;
  let entries: LeaderboardEntry[] = [];

  if (filter === 'global' || filter === 'weekly') {
    entries = (profilesRes.data || []).map((p, index) => ({
      rank: index + 1,
      id: p.id,
      name: p.name,
      avatar_url: p.avatar_url,
      xp: p.xp,
      level: p.level,
      badge_count: p.user_badges[0]?.count || 0
    }));
  } else {
    interface DBEnrollmentItem {
      progress: number;
      user_id: string;
      profiles: {
        id: string;
        name: string;
        avatar_url: string | null;
        xp: number;
        level: LevelName;
        role: string;
        user_badges: { count: number }[];
      };
    }

    // Sort further by XP if progress is tied (which it usually is when multiple complete a course)
    const sorted = (enrollmentsRes.data as unknown as DBEnrollmentItem[] || []).sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      return b.profiles.xp - a.profiles.xp; // tiebreaker: overall XP
    });

    entries = sorted.map((e, index) => ({
      rank: index + 1,
      id: e.profiles.id,
      name: e.profiles.name,
      avatar_url: e.profiles.avatar_url,
      xp: e.profiles.xp, // Global XP 
      level: e.profiles.level,
      badge_count: e.profiles.user_badges[0]?.count || 0
    }));
  }

  return (
    <div className="leaderboard-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Hall of Fame</h1>
        <p className="text-secondary">Compete on institute-wide and batch-specific leaderboards and earn your spot on the leaderboard.</p>
      </div>

      <div className="leaderboard-filters" style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <CourseFilter courses={courses || []} currentFilter={filter} />
      </div>

      <LeaderboardTable entries={entries} currentUserId={user?.id} />
    </div>
  );
}
