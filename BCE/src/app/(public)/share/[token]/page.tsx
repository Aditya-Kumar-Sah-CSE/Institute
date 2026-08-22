import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ShieldAlert, Globe, Lock, BookOpen, User, Award, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import CertificateRenderer from '@/features/code-arena/components/CertificateRenderer';
import PublicCourseViewer from './PublicCourseViewer';
import PublicProfileViewer from './PublicProfileViewer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ShareProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function PublicSharePage({ params }: ShareProps) {
  const { token } = await params;
  const supabase = await createClient();

  // 1. Fetch share token
  const { data: shareToken, error: tokenError } = await supabase
    .from('public_share_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  // 2. Handle invalid token
  if (tokenError || !shareToken) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #0b0f19 0%, #020617 100%)',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
        color: '#f8fafc'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          <ShieldAlert size={64} style={{ color: '#f87171', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px 0', color: '#f87171' }}>Invalid Shared Link</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: 1.6 }}>
            This public shared link is invalid or no longer available.
          </p>
          <Link href="/" style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '10px 24px',
            borderRadius: '8px',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'background 0.2s'
          }}>
            Return to BCE
          </Link>
        </div>
      </main>
    );
  }

  // 3. Handle expired or revoked token
  const isExpired = new Date(shareToken.expires_at).getTime() < Date.now();
  if (isExpired || shareToken.revoked_at) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #0b0f19 0%, #020617 100%)',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
        color: '#f8fafc'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(250, 204, 21, 0.2)',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          <ShieldAlert size={64} style={{ color: '#facc15', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px 0', color: '#facc15' }}>Share Link Expired</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: 1.6 }}>
            This shared link was active for 30 minutes and has now expired. Please request a new link.
          </p>
          <Link href="/" style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '10px 24px',
            borderRadius: '8px',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'background 0.2s'
          }}>
            Return to BCE
          </Link>
        </div>
      </main>
    );
  }

  // 4. Fetch the target resource based on resource_type
  let contentElement = null;

  if (shareToken.resource_type === 'certificate') {
    const { data: cert } = await supabase
      .from('certificates')
      .select('*, courses(title, created_by), coding_battles(title, created_by), profiles!certificates_user_id_fkey(name, role)')
      .eq('id', shareToken.resource_id)
      .maybeSingle();

    if (!cert) notFound();

    contentElement = (
      <div style={{ padding: '20px 0', width: '100%' }}>
        <CertificateRenderer
          cert={cert}
          isPublicShare={true}
          shareToken={token}
          shareExpiresAt={shareToken.expires_at}
        />
      </div>
    );
  } else if (shareToken.resource_type === 'course') {
    const { data: course } = await supabase
      .from('courses')
      .select('id, title, description, difficulty, is_completed, created_at, created_by')
      .eq('id', shareToken.resource_id)
      .maybeSingle();

    if (!course) notFound();

    contentElement = (
      <PublicCourseViewer 
        course={course}
        shareExpiresAt={shareToken.expires_at}
      />
    );
  } else if (shareToken.resource_type === 'profile' || shareToken.resource_type === 'coding_profile') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', shareToken.resource_id)
      .maybeSingle();

    if (!profile) notFound();

    contentElement = (
      <PublicProfileViewer 
        profile={profile}
        isCodingProfile={shareToken.resource_type === 'coding_profile'}
        shareExpiresAt={shareToken.expires_at}
      />
    );
  } else if (shareToken.resource_type === 'badge') {
    const { data: badge } = await supabase
      .from('badges')
      .select('*')
      .eq('id', shareToken.resource_id)
      .maybeSingle();

    if (!badge) notFound();

    contentElement = (
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        margin: '40px auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <Award size={72} style={{ color: '#fbbf24', marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.3))' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0' }}>{badge.name}</h2>
        <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
          Official Achievement Badge
        </div>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: 1.6 }}>
          {badge.description}
        </p>
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          Link expires at: {new Date(shareToken.expires_at).toLocaleTimeString()}
        </div>
      </div>
    );
  } else {
    notFound();
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #0b0f19 0%, #020617 100%)',
      padding: '24px 16px',
      fontFamily: 'system-ui, sans-serif',
      color: '#f8fafc'
    }}>
      {/* Brand header */}
      <div style={{ maxWidth: '1080px', margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} style={{ color: 'var(--neon-cyan)' }} />
          <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '1px', color: '#ffffff' }}>BCE PUBLIC GATEWAY</span>
        </div>
        <Link href="/" style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none', fontWeight: 600 }}>
          Join BCE Platform →
        </Link>
      </div>

      {contentElement}
    </main>
  );
}
