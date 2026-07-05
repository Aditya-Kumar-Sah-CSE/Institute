import { createClient } from '@/lib/supabase/server';
import LeaderboardTable from '@/features/leaderboard/components/LeaderboardTable';
import CourseFilter from '@/features/leaderboard/components/CourseFilter';
import FacultySection from '@/features/courses/components/FacultySection';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import type { LeaderboardEntry, LevelName } from '@/types';
import Card from '@/components/ui/Card';
import { User } from 'lucide-react';

export default async function LeaderboardPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const params = await searchParams;
  const filter = params.filter || 'global';

  const coursesQuery = supabase.from('courses').select('id, title');

  let profilesQuery;
  let enrollmentsQuery;

  if (filter === 'global' || filter === 'weekly') {
    profilesQuery = supabase
      .from('profiles')
      .select('*, user_badges(count)')
      .eq('role', 'student')
      .neq('email', SUPER_ADMIN_EMAIL)
      .order('xp', { ascending: false })
      .limit(50);
  } else {
    enrollmentsQuery = supabase
      .from('enrollments')
      .select('progress, user_id, profiles!inner(id, name, avatar_url, xp, level, role, user_badges(count))')
      .eq('course_id', filter)
      .eq('profiles.role', 'student')
      .neq('profiles.email', SUPER_ADMIN_EMAIL)
      .order('progress', { ascending: false })
      .limit(50);
  }

  const facultyQuery = supabase
    .from('profiles')
    .select('id, name, avatar_url, role, institute_id, email')
    .in('role', ['instructor', 'admin'])
    .order('name', { ascending: true });

  const [coursesRes, profilesRes, enrollmentsRes, facultyRes] = await Promise.all([
    coursesQuery,
    profilesQuery ? profilesQuery : Promise.resolve({ data: null }),
    enrollmentsQuery ? enrollmentsQuery : Promise.resolve({ data: null }),
    facultyQuery
  ]);

  const rawAdmins = facultyRes.data || [];
  const developer = rawAdmins.find(fac => fac.email === SUPER_ADMIN_EMAIL && SUPER_ADMIN_EMAIL !== '');
  const faculty = rawAdmins.filter(
    fac => fac.email !== SUPER_ADMIN_EMAIL || SUPER_ADMIN_EMAIL === ''
  );

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

      {developer && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', margin: 0, marginBottom: 'var(--space-lg)' }}>Meet Developer</h2>
          <a href="https://portfolio-two-ashen-zseywond41.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <Card variant="glass" padding="md" className="hover-lift" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', textAlign: 'left', gap: 'var(--space-md)', width: '100%', maxWidth: '350px' }}>
              <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--glass-border)', flexShrink: 0 }}>
                {developer.avatar_url ? (
                  <img src={developer.avatar_url} alt={developer.name || 'Developer'} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: 'var(--bg-elevated)', color: 'var(--neon-cyan)' }}>
                    <User size={24} opacity={0.5} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 'var(--text-lg)', margin: 0, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{developer.name || 'Aditya Kumar Sah'}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--neon-cyan)', textTransform: 'capitalize', marginTop: '2px' }}>
                  Full Stack Developer
                </p>
              </div>
            </Card>
          </a>
        </div>
      )}

      {faculty.length > 0 && <FacultySection faculty={faculty} />}

      <div className="leaderboard-filters" style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <CourseFilter courses={courses || []} currentFilter={filter} />
      </div>

      <LeaderboardTable entries={entries} currentUserId={user?.id} />
    </div>
  );
}
