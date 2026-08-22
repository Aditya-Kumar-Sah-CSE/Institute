import { createClient } from '@/lib/supabase/server';
import { CheckCircle2, ShieldAlert, Award, Calendar, Trophy, BadgeCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface VerifyProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VerifyCertificatePage({ params }: VerifyProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Try to find the certificate by UUID id OR certificate_code
  let certQuery = supabase
    .from('certificates')
    .select(`
      id,
      xp_earned,
      tasks_completed,
      total_tasks,
      course_rank,
      issued_at,
      company_name,
      certificate_code,
      accuracy,
      duration_minutes,
      profiles(name),
      courses(title),
      coding_battles(title)
    `);

  // If id looks like a UUID, search by ID, else search by certificate_code
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  
  if (isUuid) {
    certQuery = certQuery.eq('id', id);
  } else {
    certQuery = certQuery.eq('certificate_code', id);
  }

  const { data: cert, error } = await certQuery.maybeSingle();

  if (error || !cert) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
        color: '#f8fafc'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: 'rgba(30, 41, 59, 0.4)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          <ShieldAlert size={64} style={{ color: '#f87171', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px 0', color: '#f87171' }}>Invalid Certificate</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: 1.6 }}>
            The certificate ID you are trying to verify is invalid, has been revoked, or does not exist in the database.
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
            Return to Home
          </Link>
        </div>
      </main>
    );
  }

  const issueDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isBattle = Boolean(cert.coding_battles);
  const resourceTitle = isBattle ? (cert.coding_battles as any)?.title : (cert.courses as any)?.title;

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, #0b0f19 0%, #020617 100%)',
      display: 'grid',
      placeItems: 'center',
      padding: '32px 16px',
      fontFamily: 'system-ui, sans-serif',
      color: '#f8fafc'
    }}>
      <div style={{
        maxWidth: '540px',
        width: '100%',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        borderRadius: '20px',
        padding: '40px 32px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 0 40px rgba(6, 182, 212, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-10%',
          width: '200px', height: '200px',
          background: 'rgba(6, 182, 212, 0.2)',
          borderRadius: '50%', filter: 'blur(60px)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-10%',
          width: '200px', height: '200px',
          background: 'rgba(168, 85, 247, 0.15)',
          borderRadius: '50%', filter: 'blur(60px)'
        }} />

        {/* Verification Status Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '2px solid #22c55e',
            color: '#22c55e',
            width: '64px', height: '64px',
            borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            marginBottom: '16px',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)'
          }}>
            <BadgeCheck size={38} />
          </div>
          <div style={{
            fontSize: '11px', fontWeight: 800, color: '#22c55e',
            textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px'
          }}>
            Official Verification Successful
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#ffffff' }}>Verified Certificate</h1>
        </div>

        {/* Certificate Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Recipient Name</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{(cert.profiles as any)?.name}</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Credential Title</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neon-cyan)', textShadow: '0 0 10px rgba(6, 182, 212, 0.2)' }}>{resourceTitle}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Credential Type: {isBattle ? 'Coding Battle Achievement' : 'Course Completion Certificate'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 120px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Issue Date</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} style={{ color: '#a855f7' }} /> {issueDate}
              </div>
            </div>

            <div style={{ flex: '1 1 120px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Certificate ID</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace' }}>
                {cert.certificate_code || cert.id.substring(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '4px' }}>
            <div style={{ flex: '1 1 100px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Score / Grade</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>{cert.xp_earned} PTS</div>
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Rank</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>#{cert.course_rank}</div>
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Solved Tasks</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>{cert.tasks_completed} / {cert.total_tasks}</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
            Issued by <strong style={{ color: '#94a3b8' }}>{cert.company_name}</strong>
          </div>
          <Link href="/" style={{
            fontSize: '13px', color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600,
            transition: 'color 0.2s'
          }}>
            ← Return to BCE Platform
          </Link>
        </div>
      </div>
    </main>
  );
}
