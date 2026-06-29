import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import BadgeDisplay from '@/components/shared/BadgeDisplay';
import Card from '@/components/ui/Card';
import Image from 'next/image';
import '../../profile/Profile.css';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const supabase = await createClient();
  const adminSb = await createAdminClient();

  let profile = null;
  let earnedBadges = [];
  let allBadges = [];
  let enrollments = null;

  try {
    // Fetch the public profile
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, xp, level, role, streak_days, social_links')
      .eq('id', id)
      .single();
    
    profile = data;
  } catch (err) {
    console.error('Error fetching profile:', err);
  }

  if (!profile) return notFound();

  try {
    // Fetch badges (viewable by everyone)
    const [badgesRes, userBadgesRes] = await Promise.all([
      supabase.from('badges').select('*').order('created_at', { ascending: true }),
      supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', id)
    ]);
    allBadges = badgesRes.data || [];
    earnedBadges = userBadgesRes.data || [];

    // Fetch enrollments securely via admin client (read-only display)
    // Wrapped in try/catch in case service role key is missing locally
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: enrData } = await adminSb
        .from('enrollments')
        .select('*, course:courses(title, thumbnail_url)')
        .eq('user_id', id);
      enrollments = enrData;
    }
  } catch (err) {
    console.error('Error fetching extra profile data:', err);
  }

  const socialLinksRaw = profile.social_links;
  const socialLinks = (typeof socialLinksRaw === 'object' && socialLinksRaw !== null) 
    ? (socialLinksRaw as Record<string, string>) 
    : {};

  return (
    <div className="profile-page">
      <div className="profile-header glass-card">
        <div style={{ position: 'relative', width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--glass-border)' }}>
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.name || 'User'} fill style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}>
              {(profile.name || '?').charAt(0)}
            </div>
          )}
        </div>
        
        <div className="profile-info-large">
          <h1 className="profile-name">{profile.name}</h1>
          <p className="profile-email text-muted" style={{ textTransform: 'capitalize' }}>{profile.role}</p>
          
          <div className="profile-badges-quick">
            <LevelBadge level={profile.level} size="lg" />
            <div className="profile-streak-pill">
              🔥 {profile.streak_days} Day Streak
            </div>
          </div>
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
          {Object.keys(socialLinks).length > 0 && (
            <Card variant="glass" className="profile-section">
              <h2 className="section-title-sm">Connected Profiles</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {Object.entries(socialLinks).map(([platform, url]) => (
                  <a 
                    key={platform} 
                    href={url.startsWith('http') ? url : `https://${url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--space-sm)',
                      padding: 'var(--space-sm)',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--glass-border)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--neon-cyan)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  >
                    <span style={{ textTransform: 'capitalize', color: 'var(--neon-cyan)' }}>{platform}</span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
