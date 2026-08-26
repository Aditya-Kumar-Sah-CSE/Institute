import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import CertificateRenderer from '@/features/code-arena/components/CertificateRenderer';
import './Certificate.css';

export default async function CertificatePage({ 
  params,
  searchParams,
}: { 
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ courseId?: string; sheetId?: string; battleId?: string }>;
}) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};
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

  let cert: any;
  let isOwner = false;
  let isAdmin = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'developer';
  let isInstructor = false;
  let isPreview = false;

  if (id === 'dummy') {
    isPreview = true;
    isOwner = true;

    let targetCourse: any = null;
    let targetSheet: any = null;
    let targetBattle: any = null;

    if (sParams.courseId) {
      const { data } = await supabase
        .from('courses')
        .select('title, created_by')
        .eq('id', sParams.courseId)
        .maybeSingle();
      if (data) targetCourse = data;
    }

    if (sParams.sheetId) {
      const { data } = await supabase
        .from('coding_sheets')
        .select('title, created_by')
        .eq('id', sParams.sheetId)
        .maybeSingle();
      if (data) targetSheet = data;
    }

    if (sParams.battleId) {
      const { data } = await supabase
        .from('coding_battles')
        .select('title, created_by')
        .eq('id', sParams.battleId)
        .maybeSingle();
      if (data) targetBattle = data;
    }

    const isBattlePreview = Boolean(sParams.battleId || targetBattle);
    const isSheetPreview = Boolean(sParams.sheetId || targetSheet);

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
      company_name: 'Smart Learn Institute',
      certificate_code: 'PREVIEW-DUMMY-CERTIFICATE',
      signature_type: 'default',
      signature_name: 'Aditya Kumar Sah',
      signature_designation: 'The Developer & The Coder',
      courses: (!isBattlePreview && !isSheetPreview) ? {
        title: targetCourse?.title || 'Sample Course',
        created_by: targetCourse?.created_by || user.id,
      } : null,
      coding_sheets: isSheetPreview ? {
        title: targetSheet?.title || 'Sample Coding Sheet',
        created_by: targetSheet?.created_by || user.id,
      } : null,
      coding_battles: isBattlePreview ? {
        title: targetBattle?.title || 'Weekly Practice Battle #12',
        created_by: targetBattle?.created_by || user.id,
      } : null,
      profiles: {
        name: currentUserProfile?.name || 'Student Name',
        role: currentUserProfile?.role || 'student',
      },
    };

    const creatorId = targetCourse?.created_by || targetSheet?.created_by || targetBattle?.created_by;
    isInstructor = currentUserProfile?.role === 'instructor' && creatorId === user.id;
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
    isInstructor =
      (currentUserProfile?.role === 'instructor') &&
      (
        (cert.courses && cert.courses.created_by === user.id) ||
        (cert.coding_battles && (cert.coding_battles as any).created_by === user.id) ||
        (cert.coding_sheets && (cert.coding_sheets as any).created_by === user.id)
      );
  }

  // Allow owner of the certificate, or instructor of entity, or admin to view
  if (!isOwner && !isAdmin && !isInstructor) {
    redirect('/dashboard');
  }

  const canEditSettings = isAdmin || isInstructor;

  return (
    <div className="certificate-page" style={{ padding: '24px 16px', background: 'radial-gradient(circle at center, #0b0f19 0%, #020617 100%)', minHeight: '100vh', color: '#f8fafc' }}>
      <div className="certificate-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', maxWidth: '1080px', margin: '0 auto 24px auto' }}>
        <Link href="/profile" style={{ textDecoration: 'none' }}>
          <Button variant="ghost" style={{ color: 'var(--text-secondary)' }}>← Back to Profile</Button>
        </Link>
      </div>

      <CertificateRenderer 
        cert={cert} 
        isPublicShare={false} 
        canEditSettings={canEditSettings}
        isPreview={isPreview}
      />
    </div>
  );
}
