import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import BadgeDisplay from '@/components/shared/BadgeDisplay';
import Card from '@/components/ui/Card';
import Image from 'next/image';
import ProfileViewTracker from '@/components/shared/ProfileViewTracker';
import '../../profile/Profile.css';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabase = await createClient();

  let profile = null;
  let earnedBadges = [];
  let allBadges = [];
  let enrollments = null;

  try {
    // Fetch the public profile
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, xp, level, role, streak_days, social_links, institute_id, instructor_id, graduation_period, cgpa, sgpa')
      .eq('id', id)
      .maybeSingle();
      
    if (error) {
      console.error('Supabase profile fetch error:', error);
    }
    
    profile = data;
  } catch (err) {
    console.error('Error fetching profile:', err);
  }

  if (!profile) {
    return (
      <div className="profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-2xl)', maxWidth: '500px' }}>
          <h2 style={{ color: 'var(--neon-red)', marginBottom: 'var(--space-md)' }}>Profile Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            We couldn't find a student or faculty profile with this ID. They may have been removed or the link is invalid.
          </p>
        </Card>
      </div>
    );
  }

  try {
    // Fetch badges (viewable by everyone)
    const [badgesRes, userBadgesRes] = await Promise.all([
      supabase.from('badges').select('*').order('created_at', { ascending: true }),
      supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', id)
    ]);
    allBadges = badgesRes.data || [];
    earnedBadges = userBadgesRes.data || [];

    // Fetch enrollments securely via admin client (read-only display)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminSb = await createAdminClient();
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
      <ProfileViewTracker viewedId={id} />
      
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
          {(profile.sgpa && Object.keys(profile.sgpa).length > 0) && (
            <Card variant="glass" className="profile-section">
              <h2 className="section-title-sm">Semester GPAs</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                {Object.entries(profile.sgpa as Record<string, number>).map(([sem, val]) => (
                  <div key={sem} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-xs) var(--space-sm)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{sem}</span>
                    <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold' }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
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
