import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import BadgeDisplay from '@/components/shared/BadgeDisplay';
import Card from '@/components/ui/Card';
import Image from 'next/image';
import ProfileViewTracker from '@/components/shared/ProfileViewTracker';
import ShareProfileButton from '@/components/shared/ShareProfileButton';
import UserAvatar from '@/components/shared/UserAvatar';
import EnrolledCoursesList from '@/components/shared/EnrolledCoursesList';
import { User } from 'lucide-react';
import '../../profile/Profile.css';

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabase = await createClient();

  let profile = null;
  let earnedBadges = [];
  let allBadges = [];
  let enrollments = null;
  let teachingCourses = null;

  try {
    // Fetch the public profile
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, xp, level, role, streak_days, social_links, linkedin_url, institute_id, instructor_id, graduation_period, cgpa, sgpa, created_at, professional_details')
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
    if (profile.role === 'student') {
      // Fetch badges (viewable by everyone) for students
      const [badgesRes, userBadgesRes] = await Promise.all([
        supabase.from('badges').select('*').order('created_at', { ascending: true }),
        supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', id)
      ]);
      allBadges = badgesRes.data || [];
      earnedBadges = userBadgesRes.data || [];
    }

    // Fetch enrollments or teaching courses using authenticated client (respects RLS)
    if (profile.role === 'student') {
      const { data: enrData } = await supabase
        .from('enrollments')
        .select('*, course:courses(title, thumbnail_url)')
        .eq('user_id', id);
      enrollments = enrData;
    } else {
      const { data: tcData } = await supabase
        .from('courses')
        .select('id, title, thumbnail_url')
        .eq('created_by', id);
      teachingCourses = tcData;
    }
  } catch (err) {
    console.error('Error fetching extra profile data:', err);
  }

  const socialLinksRaw = profile.social_links;
  const socialLinks = (typeof socialLinksRaw === 'object' && socialLinksRaw !== null) 
    ? { ...(socialLinksRaw as Record<string, string>) } 
    : {};
    
  if (profile.linkedin_url) {
    socialLinks['linkedin'] = profile.linkedin_url;
  }

  const profDetails = profile.professional_details || {};

  return (
    <div className="profile-page">
      <ProfileViewTracker viewedId={id} />
      
      <div className="profile-header glass-card">
        <div style={{ position: 'relative', width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--glass-border)' }}>
          <UserAvatar url={profile.avatar_url} name={profile.name} size={120} />
        </div>
        
        <div className="profile-info-large" style={{ flex: 1, minWidth: '250px' }}>
          <div style={{ marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap', justifyContent: 'inherit' }}>
            <h1 className="profile-name" style={{ margin: 0 }}>{profile.name}</h1>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: profile.role === 'admin' 
                ? (profile.email === 'iambestadi@gmail.com' ? 'rgba(255, 42, 133, 0.1)' : 'rgba(255, 215, 0, 0.1)')
                : profile.role === 'instructor' 
                  ? 'rgba(176, 38, 255, 0.1)' 
                  : 'rgba(0, 240, 255, 0.1)',
              color: profile.role === 'admin'
                ? (profile.email === 'iambestadi@gmail.com' ? 'var(--neon-pink)' : 'var(--neon-gold)')
                : profile.role === 'instructor'
                  ? 'var(--neon-purple)'
                  : 'var(--neon-cyan)',
              border: '1px solid currentColor'
            }}>
              {profile.role === 'admin' 
                ? (profile.email === 'iambestadi@gmail.com' ? <><span className="role-text-full">Developer</span><span className="role-text-short">DEV</span></> : <><span className="role-text-full">Admin</span><span className="role-text-short">ADM</span></>)
                : profile.role === 'instructor' 
                  ? <><span className="role-text-full">Faculty</span><span className="role-text-short">FAC</span></> 
                  : <><span className="role-text-full">Student</span><span className="role-text-short">STU</span></>}
            </div>
          </div>
          
          {profile.institute_id && (
            <p className="profile-email" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
              Roll No / Reg. No: <span style={{ color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>{profile.institute_id}</span>
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
          
          {profile.role === 'student' && (
            <div className="profile-badges-quick">
              <LevelBadge level={profile.level} size="lg" />
              <div className="profile-streak-pill">
                🔥 {profile.streak_days} Day Streak
              </div>
            </div>
          )}
          
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <ShareProfileButton userId={id} />
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {profile.role === 'student' ? (
          <>
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
            <EnrolledCoursesList enrollments={enrollments || []} />
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
          </>
        ) : (
          <>
            <div className="profile-col-main">
              <Card variant="glass" className="profile-section">
                <h2 className="section-title-sm">Professional Info</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {profile.created_at && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Joined Institute</span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
                        {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {profile.graduation_period && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Graduation Batch</span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
                        {profile.graduation_period}
                      </span>
                    </div>
                  )}
                  {profDetails.experience_years && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Experience</span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
                        {profDetails.experience_years} Years
                      </span>
                    </div>
                  )}
                  {profDetails.phd_details && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>PhD Details</span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
                        {profDetails.phd_details}
                      </span>
                    </div>
                  )}
                  {profDetails.mtech_details && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>MTech Details</span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
                        {profDetails.mtech_details}
                      </span>
                    </div>
                  )}
                  {profDetails.btech_details && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>BTech Details</span>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)' }}>
                        {profDetails.btech_details}
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              <Card variant="glass" className="profile-section">
                <h2 className="section-title-sm">Courses Teaching</h2>
                {teachingCourses && teachingCourses.length > 0 ? (
                  <div className="enrollments-list">
                    {teachingCourses.map((tc: any) => (
                      <div key={tc.id} className="enrollment-item">
                        <div className="enrollment-icon">🏫</div>
                        <div className="enrollment-details">
                          <h4>{tc.title}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No courses currently teaching.</p>
                )}
              </Card>
            </div>

            <div className="profile-col-side">
              {Object.keys(socialLinks).length > 0 && (
                <Card variant="glass" className="profile-section">
                  <h2 className="section-title-sm">Social Presence</h2>
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
          </>
        )}
      </div>
    </div>
  );
}
