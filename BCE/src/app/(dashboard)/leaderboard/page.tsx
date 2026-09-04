import { createClient, createAdminClient } from '@/lib/supabase/server';
import LeaderboardTable from '@/features/leaderboard/components/LeaderboardTable';
import CourseFilter from '@/features/leaderboard/components/CourseFilter';
import FacultySection from '@/features/courses/components/FacultySection';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import type { LeaderboardEntry, LevelName } from '@/types';
import Card from '@/components/ui/Card';
import { User } from 'lucide-react';
import dynamic from 'next/dynamic';
import StudentAppShowcase from '@/features/leaderboard/components/StudentAppShowcase';

const StoryCarousel = dynamic(() => import('@/features/stories/components/StoryCarousel'), { 
  loading: () => <div className="skeleton-dash" style={{ height: '100px', borderRadius: '12px' }}></div> 
});

export default async function LeaderboardPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const params = await searchParams;
  const filter = params.filter || 'global';

  let userProfile = null;
  if (user) {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    userProfile = p;
  }
  const isShowcaseAdmin = userProfile && ['admin', 'developer'].includes(userProfile.role);

  // Load student app showcase data
  const { data: approvedApps } = await supabase
    .from('student_apps')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  let userSubmissions: any[] = [];
  if (user) {
    const { data: subs } = await supabase
      .from('student_apps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    userSubmissions = subs || [];
  }

  let pendingApps: any[] = [];
  if (isShowcaseAdmin) {
    const { data: pends } = await supabase
      .from('student_apps')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    pendingApps = pends || [];
  }

  const coursesQuery = supabase.from('courses').select('id, title').eq('is_deleted', false);

  let profilesQuery;
  let enrollmentsQuery;

  if (filter === 'global' || filter === 'weekly') {
    profilesQuery = supabase
      .from('profiles')
      .select('*, user_badges(count)')
      .eq('role', 'student')
      .neq('email', SUPER_ADMIN_EMAIL)
      .eq('is_verified', true)
      .not('last_login_at', 'is', null)
      .order('xp', { ascending: false })
      .limit(100);
  } else {
    const adminClient = await createAdminClient();
    enrollmentsQuery = adminClient
      .from('enrollments')
      .select('progress, user_id, profiles!inner(id, name, avatar_url, xp, level, role, is_verified, last_login_at, user_badges(count))')
      .eq('course_id', filter)
      .eq('profiles.role', 'student')
      .neq('profiles.email', SUPER_ADMIN_EMAIL)
      .eq('profiles.is_verified', true)
      .not('profiles.last_login_at', 'is', null)
      .order('progress', { ascending: false })
      .limit(100);
  }

  const facultyQuery = supabase
    .from('profiles')
    .select('id, name, avatar_url, role, institute_id, email')
    .in('role', ['instructor', 'admin', 'developer'])
    .order('name', { ascending: true });

  const [coursesRes, profilesRes, enrollmentsRes, facultyRes] = await Promise.all([
    coursesQuery,
    profilesQuery ? profilesQuery : Promise.resolve({ data: null }),
    enrollmentsQuery ? enrollmentsQuery : Promise.resolve({ data: null }),
    facultyQuery
  ]);

  const rawAdmins = facultyRes.data || [];
  
  let superAdminProfile = rawAdmins.find(
    fac => SUPER_ADMIN_EMAIL && fac.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
  );

  if (!superAdminProfile && SUPER_ADMIN_EMAIL) {
    const { data: saProfile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, role, institute_id, email')
      .eq('email', SUPER_ADMIN_EMAIL)
      .maybeSingle();
    if (saProfile) {
      superAdminProfile = saProfile;
    }
  }

  const devMap = new Map<string, any>();
  if (superAdminProfile) {
    devMap.set(superAdminProfile.id, superAdminProfile);
  }
  rawAdmins.forEach(fac => {
    if (fac.role === 'developer') {
      devMap.set(fac.id, fac);
    }
  });

  const developers = Array.from(devMap.values());
  const devIds = new Set(developers.map(d => d.id));

  const faculty = rawAdmins.filter(fac => !devIds.has(fac.id));

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
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1 className="text-gradient" style={{ margin: 0 }}>Hall of Fame</h1>
      </div>

      <div style={{ marginTop: 0 }}>
         {<StoryCarousel currentUserId={user?.id} currentUserAvatar={user?.user_metadata?.avatar_url} />}
      </div>

      <StudentAppShowcase
        approvedApps={approvedApps || []}
        pendingApps={pendingApps || []}
        userSubmissions={userSubmissions}
        currentUser={userProfile}
        isAdmin={!!isShowcaseAdmin}
      />

      <div className="leaderboard-filters" style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <CourseFilter courses={courses || []} currentFilter={filter} />
      </div>

      <LeaderboardTable entries={entries} currentUserId={user?.id} />

      {developers.length > 0 && (
        <div style={{ marginBottom: 'var(--space-md)', marginTop: 'var(--space-2xl)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', margin: 0, marginBottom: 'var(--space-lg)' }}>
            {developers.length > 1 ? 'Meet Developers' : 'Meet Developer'}
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: 'var(--space-lg)' 
          }}>
            {developers.map(dev => {
              const isSuperAdmin = SUPER_ADMIN_EMAIL && dev.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
              const roleDisplay = isSuperAdmin 
                ? 'Lead Developer' 
                : (dev.role === 'developer' ? 'Developer' : dev.role);

              return (
                <a 
                  key={dev.id}
                  href={isSuperAdmin ? "https://portfolio-two-ashen-zseywond41.vercel.app/" : `/users/${dev.id}`} 
                  target={isSuperAdmin ? "_blank" : "_self"} 
                  rel="noopener noreferrer" 
                  style={{ textDecoration: 'none' }}
                >
                  <Card variant="glass" padding="md" className="hover-lift" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', textAlign: 'left', gap: 'var(--space-md)', width: '100%' }}>
                    <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--glass-border)', flexShrink: 0 }}>
                      {dev.avatar_url ? (
                        <img src={dev.avatar_url} alt={dev.name || 'Developer'} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: 'var(--bg-elevated)', color: 'var(--neon-cyan)' }}>
                          <User size={24} opacity={0.5} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 'var(--text-lg)', margin: 0, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dev.name || 'Developer'}</h3>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--neon-cyan)', textTransform: 'capitalize', marginTop: '2px' }}>
                        {roleDisplay}
                      </p>
                    </div>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {faculty.length > 0 && <FacultySection faculty={faculty} />}
    </div>
  );
}
