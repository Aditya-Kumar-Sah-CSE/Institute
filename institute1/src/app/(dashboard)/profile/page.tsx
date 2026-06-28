import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import BadgeDisplay from '@/components/shared/BadgeDisplay';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import AvatarUpload from './components/AvatarUpload';
import GithubConnect from './components/GithubConnect';
import './Profile.css';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: allBadges } = await supabase.from('badges').select('*').order('created_at', { ascending: true });
  const { data: earnedBadges } = await supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', user.id);
  const { data: xpLogs } = await supabase.from('xp_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
  const { data: enrollments } = await supabase.from('enrollments').select('*, course:courses(title, thumbnail_url)').eq('user_id', user.id);
  const { data: appData } = await supabase.from('instructor_applications').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();

  if (!profile) return <div>Profile not found.</div>;

  return (
    <div className="profile-page">
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
          <div className="profile-badges-quick">
            <LevelBadge level={profile.level} size="lg" />
            <div className="profile-streak-pill">
              🔥 {profile.streak_days} Day Streak
            </div>
          </div>
          
          {profile.role !== 'admin' && profile.role !== 'instructor' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              {appData?.status === 'pending' ? (
                <Button variant="secondary" size="sm" disabled>Apply as Instructor or Faculty</Button>
              ) : (
                <Link href={appData?.status === 'rejected' ? '/apply-instructor?reapply=true' : '/apply-instructor'} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" size="sm">
                    {appData?.status === 'rejected' ? 'Reapply as Instructor' : 'Apply as Instructor or Faculty'}
                  </Button>
                </Link>
              )}
              {appData?.status && (
                <span style={{ 
                  fontSize: 'var(--text-sm)', 
                  fontWeight: 'var(--weight-bold)', 
                  color: appData.status === 'pending' ? '#eab308' : 
                         appData.status === 'rejected' ? '#ef4444' : '#22c55e',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '1rem',
                  backgroundColor: appData.status === 'pending' ? 'rgba(234, 179, 8, 0.1)' : 
                                   appData.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'
                }}>
                  Status: {appData.status.charAt(0).toUpperCase() + appData.status.slice(1)}
                </span>
              )}
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
            <GithubConnect userId={user.id} initialUsername={profile.github_username} />
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
