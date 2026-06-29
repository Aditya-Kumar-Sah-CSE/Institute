import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import BadgeDisplay from '@/components/shared/BadgeDisplay';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import AvatarUpload from './components/AvatarUpload';
import GithubConnect from './components/GithubConnect';
import SocialLinksConnect from './components/SocialLinksConnect';
import AcademicInfoConnect from './components/AcademicInfoConnect';
import { getPastMonthlyRewards } from '@/features/gamification/actions/monthly-rewards';
import './Profile.css';
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: allBadges } = await supabase.from('badges').select('*').order('created_at', { ascending: true });
  const { data: earnedBadges } = await supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', user.id);
  const { data: xpLogs } = await supabase.from('xp_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
  const adminSb = await createAdminClient();
  const { data: enrollments } = await supabase.from('enrollments').select('*, course:courses(title, thumbnail_url)').eq('user_id', user.id);
  const { data: appData, error: appError } = await adminSb.from('instructor_applications').select('status').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle();

  // Fetch monthly rewards
  const monthlyRewards = await getPastMonthlyRewards(user.id);
  // Sort descending by month_date
  const latestReward = monthlyRewards.length > 0 ? monthlyRewards.sort((a, b) => new Date(b.month_date).getTime() - new Date(a.month_date).getTime())[0] : null;

  if (!profile) return <div>Profile not found.</div>;

  return (
    <div className="profile-page">
      {latestReward && latestReward.rank <= 10 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1))',
          border: '1px solid var(--neon-gold)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-md) var(--space-xl)',
          marginBottom: 'var(--space-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.15)'
        }}>
          <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 5px rgba(255,215,0,0.8))' }}>👑</span>
          <div>
            <h2 style={{ color: 'var(--neon-gold)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2xs)' }}>Institute Topper</h2>
            <p className="text-secondary" style={{ fontSize: 'var(--text-md)' }}>
              Congratulations! You ranked <strong>#{latestReward.rank}</strong> in the leaderboard last month.
            </p>
          </div>
        </div>
      )}

      <div className="profile-header glass-card">
        <AvatarUpload 
          userId={user.id} 
          currentAvatarUrl={profile.avatar_url} 
          name={profile.name} 
        />
        <div className="profile-info-large">
          <h1 className="profile-name">{profile.name}</h1>
          <p className="profile-email">{profile.email}</p>
          {profile.institute_id && (
            <p className="profile-email" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
              Institute ID: <span style={{ color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>{profile.institute_id}</span>
            </p>
          )}
          {profile.instructor_id && (
            <p className="profile-email" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
              Instructor ID: <span style={{ color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>{profile.instructor_id}</span>
            </p>
          )}
          {profile.graduation_period && (
            <p className="profile-email" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
              Batch: <span style={{ color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>{profile.graduation_period}</span>
            </p>
          )}
          {profile.cgpa !== null && profile.cgpa !== undefined && (
            <p className="profile-email" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
              CGPA: <span style={{ color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>{profile.cgpa}</span>
            </p>
          )}
          <div className="profile-badges-quick">
            <LevelBadge level={profile.level} size="lg" />
            <div className="profile-streak-pill">
              🔥 {profile.streak_days} Day Streak
            </div>
          </div>
          
          {profile.role !== 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                {profile.role !== 'instructor' && (!appData || appData.status === 'rejected') && (
                  <Link href={appData?.status === 'rejected' ? '/apply-instructor?reapply=true' : '/apply-instructor'} style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" size="sm">
                      Apply as Instructor or Faculty
                    </Button>
                  </Link>
                )}
                {(appData?.status === 'pending' || appData?.status === 'approved' || profile.role === 'instructor') && (
                  <span style={{ 
                    fontSize: 'var(--text-sm)', 
                    fontWeight: 'var(--weight-bold)', 
                    color: (appData?.status === 'pending') ? '#eab308' : '#22c55e',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    backgroundColor: (appData?.status === 'pending') ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)'
                  }}>
                    Status: {appData?.status === 'pending' ? 'Pending' : 'Approved as faculty'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-col-main">
          <Card variant="glass" className="profile-section">
            <h2 className="section-title-sm">Current Progress</h2>
            <XPBar xp={profile.xp} size="lg" />
          </Card>

          <Card variant="glass" className="profile-section">
            <h2 className="section-title-sm">Badges ({earnedBadges?.length || 0}/{allBadges?.length || 0})</h2>
            <BadgeDisplay allBadges={allBadges || []} earnedBadges={earnedBadges || []} />
          </Card>

          <Card variant="glass" className="profile-section">
            <h2 className="section-title-sm">Enrolled Courses</h2>
            {enrollments && enrollments.length > 0 ? (
              <div className="enrollments-list">
                {enrollments.map(enr => (
                  <div key={enr.id} className="enrollment-item">
                    <div className="enrollment-icon">🎓</div>
                    <div className="enrollment-details">
                      <h4>{enr.course?.title}</h4>
                      <div className="enrollment-progress">
                        <div className="progress-bar-small">
                          <div className="progress-fill-small" style={{ width: `${Math.round(enr.progress * 100)}%` }} />
                        </div>
                        <span className="progress-text">{Math.round(enr.progress * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No courses enrolled yet.</p>
            )}
          </Card>
        </div>

        <div className="profile-col-side">
          <Card variant="glass" className="profile-section">
            <h2 className="section-title-sm">Integrations</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <GithubConnect userId={user.id} initialUsername={profile.github_username} />
              <SocialLinksConnect userId={user.id} initialLinks={profile.social_links as Record<string, string> | null} />
            </div>
          </Card>

          <Card variant="glass" className="profile-section">
            <h2 className="section-title-sm">Academic Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <AcademicInfoConnect 
                userId={user.id} 
                initialGraduationPeriod={profile.graduation_period}
                initialCgpa={profile.cgpa}
                initialSgpa={profile.sgpa as Record<string, number> | null}
              />
            </div>
          </Card>

          <Card variant="glass" className="profile-section">
            <h2 className="section-title-sm">Recent Activity</h2>
            {xpLogs && xpLogs.length > 0 ? (
              <ul className="activity-list">
                {xpLogs.map(log => (
                  <li key={log.id} className="activity-item">
                    <span className="activity-action">{log.action}</span>
                    <span className="activity-xp text-gradient">+{log.xp_amount} XP</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No recent activity.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
