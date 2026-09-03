import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import XPBar from '@/components/shared/XPBar';
import LevelBadge from '@/components/shared/LevelBadge';
import BadgeDisplay from '@/components/shared/BadgeDisplay';
import Card from '@/components/ui/Card';
import Image from 'next/image';
import ProfileViewTracker from '@/components/shared/ProfileViewTracker';
import ShareProfileButton from '@/components/shared/ShareProfileButton';
import UserAvatar from '@/components/shared/UserAvatar';
import EnrolledCoursesList from '@/components/shared/EnrolledCoursesList';
import { 
  User, ChefHat, Code2, Swords, Trophy, Globe
} from 'lucide-react';
import '../../profile/Profile.css';


export const dynamic = 'force-dynamic';

const getPlatformConfig = (platformId: string) => {
  const normalized = platformId.toLowerCase();
  switch (normalized) {
    case 'github':
      return {
        name: 'GitHub',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        ),
        color: '#f0f6fc',
        bg: 'rgba(240, 246, 252, 0.08)',
        border: 'rgba(240, 246, 252, 0.2)',
      };
    case 'linkedin':
      return {
        name: 'LinkedIn',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        ),
        color: '#0077b5',
        bg: 'rgba(10, 102, 194, 0.08)',
        border: 'rgba(10, 102, 194, 0.2)',
      };
    case 'x':
    case 'twitter':
      return {
        name: 'X (Twitter)',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        ),
        color: '#f8fafc',
        bg: 'rgba(255, 255, 255, 0.08)',
        border: 'rgba(255, 255, 255, 0.15)',
      };
    case 'leetcode':
      return {
        name: 'LeetCode',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M16.102 17.93l-2.697 2.607c-.466.45-1.211.45-1.677 0l-8.579-8.286A4.894 4.894 0 011.75 8.76a4.894 4.894 0 011.4-3.491 4.98 4.98 0 013.525-1.447c1.32-.012 2.585.501 3.51 1.424l4.24 4.1a1.214 1.214 0 001.71 0 1.189 1.189 0 000-1.696l-4.24-4.1A7.447 7.447 0 006.666 1.5 7.42 7.42 0 001.39 3.666a7.35 7.35 0 00-2.11 5.093c-.015 2.004.773 3.916 2.19 5.293l8.58 8.287a3.633 3.633 0 002.502 1.01 3.633 3.633 0 002.503-1.01l2.697-2.606a1.2 1.2 0 000-1.697 1.213 1.213 0 00-1.71 0z" />
          </svg>
        ),
        color: '#ffa116',
        bg: 'rgba(255, 161, 22, 0.08)',
        border: 'rgba(255, 161, 22, 0.2)',
      };
    case 'codeforces':
      return {
        name: 'Codeforces',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M4.5 7.5h3v14h-3zM10.5 2.5h3v19h-3zM16.5 11.5h3v10h-3z" />
          </svg>
        ),
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.08)',
        border: 'rgba(59, 130, 246, 0.2)',
      };
    case 'codechef':
      return {
        name: 'CodeChef',
        icon: <ChefHat size={18} />,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.08)',
        border: 'rgba(245, 158, 11, 0.2)',
      };
    case 'gfg':
      return {
        name: 'GeeksforGeeks',
        icon: <Code2 size={18} />,
        color: '#2f8d46',
        bg: 'rgba(47, 141, 70, 0.08)',
        border: 'rgba(47, 141, 70, 0.2)',
      };
    case 'codingninjas':
      return {
        name: 'Coding Ninjas',
        icon: <Swords size={18} />,
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.08)',
        border: 'rgba(249, 115, 22, 0.2)',
      };
    case 'codolio':
      return {
        name: 'Codolio',
        icon: <Trophy size={18} />,
        color: '#06b6d4',
        bg: 'rgba(6, 182, 212, 0.08)',
        border: 'rgba(6, 182, 212, 0.2)',
      };
    case 'youtube':
      return {
        name: 'YouTube',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
            <polygon points="10 15 15 12 10 9" />
          </svg>
        ),
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.08)',
        border: 'rgba(239, 68, 68, 0.2)',
      };
    case 'instagram':
      return {
        name: 'Instagram',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        ),
        color: '#ec4899',
        bg: 'rgba(236, 72, 153, 0.08)',
        border: 'rgba(236, 72, 153, 0.2)',
      };
    case 'discord':
      return {
        name: 'Discord',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 01.078.009c.12.099.246.195.373.289a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
          </svg>
        ),
        color: '#5865f2',
        bg: 'rgba(88, 101, 242, 0.08)',
        border: 'rgba(88, 101, 242, 0.2)',
      };
    case 'facebook':
      return {
        name: 'Facebook',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        ),
        color: '#1877f2',
        bg: 'rgba(24, 119, 242, 0.08)',
        border: 'rgba(24, 119, 242, 0.2)',
      };
    case 'portfolio':
    case 'website':
      return {
        name: 'Portfolio',
        icon: <Globe size={18} />,
        color: '#06b6d4',
        bg: 'rgba(6, 182, 212, 0.08)',
        border: 'rgba(6, 182, 212, 0.2)',
      };
    default:
      return {
        name: platformId.charAt(0).toUpperCase() + platformId.slice(1),
        icon: <Globe size={18} />,
        color: '#06b6d4',
        bg: 'rgba(6, 182, 212, 0.08)',
        border: 'rgba(6, 182, 212, 0.2)',
      };
  }
};

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
      .select('id, name, email, avatar_url, xp, level, role, streak_days, social_links, linkedin_url, institute_id, instructor_id, graduation_period, cgpa, sgpa, created_at, professional_details, college_name, qualifications, work_experience, skills, interests, external_certificates')
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
          <div style={{ marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)', flexWrap: 'nowrap', width: '100%' }}>
            <h1 className="profile-name" style={{ margin: 0, textAlign: 'center' }}>{profile.name}</h1>
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
          
          {profile.college_name && (
            <p className="profile-email" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-sm)' }}>
              College: <span style={{ color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>{profile.college_name}</span>
            </p>
          )}
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
          
          <div style={{ marginTop: 'var(--space-lg)', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <ShareProfileButton userId={id} />
            <Link 
              href={`/code-arena/profile?id=${id}`} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                textDecoration: 'none'
              }}
            >
              💻 Coding Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {profile.role === 'student' ? (
          <>
            <div className="profile-col-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
              <Card variant="glass" className="profile-section">
                <h2 className="section-title-sm">Current Progress</h2>
                <XPBar xp={profile.xp} size="lg" />
              </Card>

              {/* Skills & Interests Tags */}
              {((profile.skills && profile.skills.length > 0) || (profile.interests && profile.interests.length > 0)) && (
                <Card variant="glass" className="profile-section">
                  {profile.skills && profile.skills.length > 0 && (
                    <div style={{ marginBottom: profile.interests && profile.interests.length > 0 ? 'var(--space-md)' : 0 }}>
                      <h3 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Skills</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {profile.skills.map((s: string) => (
                          <span key={s} style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', color: 'var(--neon-cyan)', fontSize: '12px', fontWeight: 600 }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.interests && profile.interests.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Interests</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {profile.interests.map((i: string) => (
                          <span key={i} style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', color: 'var(--neon-pink)', fontSize: '12px', fontWeight: 600 }}>
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Qualifications */}
              {profile.qualifications && profile.qualifications.length > 0 && (
                <Card variant="glass" className="profile-section">
                  <h2 className="section-title-sm">Qualifications</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {profile.qualifications.map((q: any) => (
                      <div key={q.id || q.degree} style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{q.degree}</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--neon-cyan)' }}>{q.institution}</p>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {q.fieldOfStudy && <span>{q.fieldOfStudy}</span>}
                          {q.year && <span>Year: {q.year}</span>}
                          {q.grade && <span>Grade: {q.grade}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Work Experience */}
              {profile.work_experience && profile.work_experience.length > 0 && (
                <Card variant="glass" className="profile-section">
                  <h2 className="section-title-sm">Work Experience</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {profile.work_experience.map((w: any) => (
                      <div key={w.id || w.title} style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{w.title}</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--neon-purple)', fontWeight: 600 }}>{w.company}</p>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {w.startDate} {w.startDate && (w.endDate || w.current) ? '–' : ''} {w.current ? 'Present' : w.endDate}
                        </div>
                        {w.description && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{w.description}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* External Certifications */}
              {profile.external_certificates && profile.external_certificates.length > 0 && (
                <Card variant="glass" className="profile-section">
                  <h2 className="section-title-sm">Certifications & Credentials</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {profile.external_certificates.map((c: any) => (
                      <div key={c.id || c.title} style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(255, 215, 0, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                        <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neon-gold)' }}>{c.title}</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-primary)' }}>{c.issuer}</p>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {c.date && <span>Issued: {c.date}</span>}
                          {c.credentialUrl && (
                            <a href={c.credentialUrl.startsWith('http') ? c.credentialUrl : `https://${c.credentialUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}>
                              Verify Link ↗
                            </a>
                          )}
                          {c.fileUrl && (
                            <a href={c.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none' }}>
                              View Document 📄
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

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
                  <div className="connected-profiles-grid">
                    {Object.entries(socialLinks).map(([platform, url]) => {
                      const config = getPlatformConfig(platform);
                      return (
                        <a 
                          key={platform} 
                          href={url.startsWith('http') ? url : `https://${url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="connected-profile-link"
                        >
                          <span className="connected-profile-icon-wrapper" style={{ 
                            color: config.color,
                            background: config.bg,
                            border: `1px solid ${config.border}`
                          }}>
                            {config.icon}
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>{config.name}</span>
                        </a>
                      );
                    })}
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
                  <div className="connected-profiles-grid">
                    {Object.entries(socialLinks).map(([platform, url]) => {
                      const config = getPlatformConfig(platform);
                      return (
                        <a 
                          key={platform} 
                          href={url.startsWith('http') ? url : `https://${url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="connected-profile-link"
                        >
                          <span className="connected-profile-icon-wrapper" style={{ 
                            color: config.color,
                            background: config.bg,
                            border: `1px solid ${config.border}`
                          }}>
                            {config.icon}
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>{config.name}</span>
                        </a>
                      );
                    })}
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
