import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import CertificateRenderer from '@/features/code-arena/components/CertificateRenderer';
import './Certificate.css';

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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
      xp_earned: 1420,
      course_rank: 3,
      tasks_completed: 4,
      total_tasks: 5,
      accuracy: 85,
      duration_minutes: 42,
      company_name: 'BCE Code Arena',
      certificate_code: 'CB-2025-0524-1420-DUMMY',
      signature_type: 'default',
      signature_name: 'Aditya Kumar Sah',
      signature_designation: 'The Developer & The Coder',
      coding_battles: {
        title: 'Weekly Practice Battle #12',
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
      .select('*, courses(title, created_by), coding_battles(title, created_by), coding_sheets(title, created_by), profiles!certificates_user_id_fkey(name, role)')
      .eq('id', id)
      .single();

    if (error || !fetchedCert) {
      notFound();
    }
    cert = fetchedCert;

    isOwner = cert.user_id === user.id;
    isAdmin = currentUserProfile?.role === 'admin';
    isInstructor = 
      (currentUserProfile?.role === 'instructor') && 
      (
        (cert.courses && cert.courses.created_by === user.id) ||
        (cert.coding_battles && (cert.coding_battles as any).created_by === user.id)
      );
  }

  // Allow the owner of the certificate, or instructor of course/battle, or admin to view
  if (!isOwner && !isAdmin && !isInstructor) {
    redirect('/dashboard');
  }

  return (
    <div className="certificate-page" style={{ padding: '24px 16px', background: 'radial-gradient(circle at center, #0b0f19 0%, #020617 100%)', minHeight: '100vh', color: '#f8fafc' }}>
      <div className="certificate-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', maxWidth: '1080px', margin: '0 auto 24px auto' }}>
        <Link href="/profile" style={{ textDecoration: 'none' }}>
          <Button variant="ghost" style={{ color: 'var(--text-secondary)' }}>← Back to Profile</Button>
        </Link>
      </div>

      <CertificateRenderer cert={cert} isPublicShare={false} />
    </div>
  );
}
