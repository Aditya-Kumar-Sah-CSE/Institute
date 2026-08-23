import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import BadgeDisplay from '@/components/shared/BadgeDisplay';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import AvatarUpload from './components/AvatarUpload';
import LinkedinConnect from './components/LinkedinConnect';
import SocialLinksConnect from './components/SocialLinksConnect';
import AcademicInfoConnect from './components/AcademicInfoConnect';
import ProfessionalInfoConnect from './components/ProfessionalInfoConnect';
import { DynamicCrownBanner as CrownBanner } from '@/components/DynamicWrappers';
import BasicInfoEdit from './components/BasicInfoEdit';
import ShareProfileButton from '@/components/shared/ShareProfileButton';
import EnrolledCoursesList from '@/components/shared/EnrolledCoursesList';
import { getPastMonthlyRewards } from '@/features/gamification/actions/monthly-rewards';
import RecentActivity from './components/RecentActivity';
import StorageUsageIndicator from '@/components/shared/StorageUsageIndicator';
import './Profile.css';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { getOrCreateProfile } = await import('@/lib/profile');

  if (!user) return null;

  const adminSb = await createAdminClient();

  const [
    profile,
    { data: allBadges },
    { data: earnedBadges },
    { data: xpLogs },
    { data: companySettings },
    { data: appData },
    monthlyRewards
  ] = await Promise.all([
    getOrCreateProfile(user),
    supabase.from('badges').select('*').order('created_at', { ascending: true }),
    supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', user.id),
    supabase.from('xp_log').select('id, action, xp_amount, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('company_settings').select('company_name').single(),
    adminSb.from('instructor_applications').select('status').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    getPastMonthlyRewards(user.id)
  ]);
  
  let enrollments = null;
  let teachingCourses = null;
  let certificates = null;

  if (profile?.role === 'student') {
    const [
      { data: enrollmentsData },
      { data: certData }
    ] = await Promise.all([
      supabase.from('enrollments').select('*, course:courses(title, thumbnail_url)').eq('user_id', user.id),
      supabase.from('certificates').select('*, courses(title)').eq('user_id', user.id).order('issued_at', { ascending: false })
    ]);
    enrollments = enrollmentsData;
    certificates = certData;
  } else if (profile) {
    const { data } = await adminSb.from('courses').select('id, title').eq('created_by', user.id);
    teachingCourses = data;
  }
  // Sort descending by month_date
  const latestReward = monthlyRewards.length > 0 ? monthlyRewards.sort((a, b) => new Date(b.month_date).getTime() - new Date(a.month_date).getTime())[0] : null;

  if (!profile) return <div>Profile not found.</div>;

  return (
    <div className="profile-page">
      {latestReward && latestReward.rank <= 10 && (
        <CrownBanner 
          rank={latestReward.rank} 
          companyName={companySettings?.company_name || 'Institute'} 
          monthDate={latestReward.month_date} 
        />
      )}

      <div className="profile-header glass-card">
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
          <ShareProfileButton userId={user.id} />
        </div>
        {/* Left Column: Profile Info */}
        <div className="profile-info-large" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', justifyContent: 'center' }}>
          <h1 className="profile-name">{profile.name}</h1>
          <p className="profile-email">{profile.email}</p>
          {profile.institute_id && (
            <p className="profile-email" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
              Institute ID: <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--weight-semibold)' }}>{profile.institute_id}</span>
            </p>
          )}
          
        </div>

        {/* Center Column: Avatar */}
        <div className="profile-avatar-wrapper" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <AvatarUpload 
            userId={user.id} 
            currentAvatarUrl={profile.avatar_url} 
            name={profile.name} 
          />
        </div>

        {/* Right Column: Info, Badges & Action */}
        <div className="profile-right-column" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 'var(--space-md)' }}>
          <div className="profile-batch-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', justifyContent: 'flex-end', width: '100%' }}>
            {profile.graduation_period && (
              <p className="profile-email" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                Batch: <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--weight-semibold)' }}>{profile.graduation_period}</span>
              </p>
            )}
            {profile.cgpa !== null && profile.cgpa !== undefined && (
              <p className="profile-email" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                CGPA: <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--weight-semibold)' }}>{profile.cgpa}</span>
              </p>
            )}
          </div>

          {profile.role === 'student' && (
            <div className="profile-badges-quick" style={{ marginTop: 0 }}>
              <LevelBadge level={profile.level} size="lg" />
              <div className="profile-streak-pill">
                🔥 {profile.streak_days} Day Streak
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'nowrap', justifyContent: 'space-between', width: '100%', marginTop: 'var(--space-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-md)', width: '100%', alignItems: 'center' }}>
              {profile.role !== 'admin' && (
                <div style={{ flex: 1 }}>
                  {profile.role !== 'instructor' && (!appData || appData.status === 'rejected') && (
                    <Link href={appData?.status === 'rejected' ? '/apply-instructor?reapply=true' : '/apply-instructor'} style={{ textDecoration: 'none', display: 'block', width: '100%' }}>
                      <Button variant="secondary" size="sm" style={{ height: "48px", backgroundColor: "#22c55e", color: "white", width: '100%' }}>
                        Apply as Instructor or Faculty
                      </Button>
                    </Link>
                  )}
                  {(appData?.status === 'pending' || appData?.status === 'approved' || profile.role === 'instructor') && (
                    <span style={{ 
                      display: 'inline-block',
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
              )}
              <BasicInfoEdit 
                initialName={profile.name} 
                initialRollNo={profile.institute_id} 
                initialBatch={profile.graduation_period} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {profile.role === 'student' ? (
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

            <Card variant="glass" className="profile-section">
              <h2 className="section-title-sm">My Certificates</h2>
              {certificates && certificates.length > 0 ? (
                <div className="enrollments-list">
                  {certificates.map((cert: any) => (
                    <Link key={cert.id} href={`/certificates/${cert.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="enrollment-item" style={{ cursor: 'pointer', border: '1px solid rgba(255, 215, 0, 0.3)', background: 'rgba(255, 215, 0, 0.05)' }}>
                        <div className="enrollment-icon" style={{ background: 'var(--neon-gold)', color: '#000' }}>📜</div>
                        <div className="enrollment-details">
                          <h4 style={{ color: 'var(--neon-gold)' }}>Certificate of Completion</h4>
                          <p className="text-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>{cert.courses?.title}</p>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', marginTop: '6px', color: 'var(--text-muted)' }}>
                            <span>Rank: #{cert.course_rank}</span>
                            <span>•</span>
                            <span>{new Date(cert.issued_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <p className="text-muted">No certificates earned yet.</p>
                  <Link href="/certificates/dummy" style={{ textDecoration: 'none' }}>
                    <div className="enrollment-item" style={{ cursor: 'pointer', border: '1px dashed rgba(255, 215, 0, 0.3)', opacity: 0.7 }}>
                      <div className="enrollment-icon" style={{ background: 'transparent', border: '1px solid var(--text-muted)' }}>🔒</div>
                      <div className="enrollment-details">
                        <h4 style={{ color: 'var(--text-secondary)' }}>Certificate of Completion</h4>
                        <p className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>Complete a course to unlock</p>
                        <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--neon-cyan)' }}>
                          Preview Template →
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="profile-col-main">
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
                <p className="text-muted">You are not instructing or managing any courses yet.</p>
              )}
            </Card>
          </div>
        )}

        <div className="profile-col-side">
          <Card variant="glass" className="profile-section">
            <h2 className="section-title-sm">Integrations</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <LinkedinConnect userId={user.id} initialUrl={profile.linkedin_url} />
              <SocialLinksConnect userId={user.id} initialLinks={profile.social_links as Record<string, string> | null} />
            </div>
          </Card>

          <Card variant="glass" className="profile-section">
            <h2 className="section-title-sm">{profile.role === 'student' ? 'Academic Details' : 'Professional Background'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {profile.role === 'student' ? (
                <AcademicInfoConnect 
                  userId={user.id} 
                  initialGraduationPeriod={profile.graduation_period}
                  initialCgpa={profile.cgpa}
                  initialSgpa={profile.sgpa as Record<string, number> | null}
                />
              ) : (
                <ProfessionalInfoConnect 
                  userId={user.id} 
                  initialProfessionalDetails={profile.professional_details}
                />
              )}
            </div>
          </Card>

          {profile.role === 'student' && (
            <Card variant="glass" className="profile-section">
              <h2 className="section-title-sm">Recent Activity</h2>
              <RecentActivity logs={xpLogs || []} userId={user.id} />
            </Card>
          )}

          <Card variant="glass" className="profile-section">
            <StorageUsageIndicator userId={user.id} />
          </Card>
        </div>
      </div>
    </div>
  );
}
