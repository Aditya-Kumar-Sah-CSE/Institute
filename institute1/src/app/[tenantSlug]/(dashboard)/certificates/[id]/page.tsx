import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import PrintButton from './PrintButton';
import './Certificate.css';

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single();

  let cert;
  let isOwner = false;
  let isAdmin = false;
  let isInstructor = false;

  if (id === 'dummy') {
    cert = {
      id: 'dummy',
      user_id: user.id,
      issued_at: new Date().toISOString(),
      institute_id: 'DUMMY-ID-1234',
      xp_earned: 5000,
      course_rank: 1,
      tasks_completed: 12,
      total_tasks: 12,
      days_active: 30,
      company_name: 'Your Institute',
      courses: {
        title: 'Sample Course Title',
        created_by: user.id
      },
      profiles: {
        name: currentUserProfile?.name || 'John Doe',
        role: 'student'
      }
    };
    isOwner = true;
  } else {
    const { data: fetchedCert, error } = await supabase
      .from('certificates')
      .select('*, courses(title, created_by), profiles!certificates_user_id_fkey(name, role)')
      .eq('id', id)
      .single();

    if (error || !fetchedCert) {
      notFound();
    }
    cert = fetchedCert;

    isOwner = cert.user_id === user.id;
    isAdmin = currentUserProfile?.role === 'admin';
    isInstructor = currentUserProfile?.role === 'instructor' && cert.courses?.created_by === user.id;
  }

  if (!isOwner && !isAdmin && !isInstructor) {
    return null;
  }

  const issueDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="certificate-page">
      <div className="certificate-actions">
        <Link href="/profile" style={{ textDecoration: 'none' }}>
          <Button variant="ghost" style={{ color: 'var(--text-secondary)' }}>← Back to Profile</Button>
        </Link>
        {/* We use a client-side print button, but since this is a server component, we'll just use a basic onClick script or wrap it in a client component. For simplicity, we can use an inline script on the button if needed, but in App Router we can just use a simple form or a button with onClick via a small client component. Let's just use a native button with window.print() if possible, but React Server Components don't allow onClick. So we'll use a small client wrapper for the print button. */}
        <PrintButton />
      </div>

      <div className="certificate-container" id="certificate-node">
        <div className="cert-corner top-right"></div>
        <div className="cert-corner bottom-left"></div>
        
        <div className="certificate-inner">
          <div className="cert-header">
            <h1 className="cert-title">Certificate</h1>
            <div className="cert-subtitle">of Completion</div>
          </div>

          <div className="cert-badge">
            <div className="cert-badge-text">
              100%<br/>Completed
            </div>
          </div>

          <div className="cert-body">
            <div className="cert-presented-to">This certificate is proudly presented to</div>
            <h2 className="cert-name">{cert.profiles?.name}</h2>
            <div className="cert-course">for successfully completing <strong>{cert.courses?.title}</strong></div>
            
            {cert.institute_id && (
              <div style={{ color: '#aaa', marginTop: '0.5rem', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Institute ID: {cert.institute_id}
              </div>
            )}

            <div className="cert-stats">
              <div className="cert-stat-box">
                <div className="cert-stat-value">{cert.xp_earned}</div>
                <div className="cert-stat-label">Total XP</div>
              </div>
              <div className="cert-stat-box">
                <div className="cert-stat-value">#{cert.course_rank}</div>
                <div className="cert-stat-label">Course Rank</div>
              </div>
              <div className="cert-stat-box">
                <div className="cert-stat-value">{cert.tasks_completed}/{cert.total_tasks}</div>
                <div className="cert-stat-label">Tasks Done</div>
              </div>
              <div className="cert-stat-box">
                <div className="cert-stat-value">{cert.days_active}</div>
                <div className="cert-stat-label">Days Active</div>
              </div>
            </div>
          </div>

          <div className="cert-footer">
            <div className="cert-signature">
              <div className="cert-signature-line">{issueDate}</div>
              <div className="cert-signature-label">Date</div>
            </div>
            <div className="cert-signature">
              <div className="cert-signature-line" style={{ fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontWeight: 'bold', fontSize: '1rem' }}>
                {cert.company_name}
              </div>
              <div className="cert-signature-label">Issued By</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
