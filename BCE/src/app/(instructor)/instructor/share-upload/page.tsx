import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ShareUploadForm from './ShareUploadForm';

export default async function ShareUploadPage(props: {
  searchParams: Promise<{ fileUrl?: string; fileName?: string }>;
}) {
  const searchParams = await props.searchParams;
  const fileUrl = searchParams.fileUrl || '';
  const fileName = searchParams.fileName || '';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch courses managed by this user
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient">Share Material Upload</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Associate your uploaded file with a course and lesson.
        </p>
      </div>

      <ShareUploadForm
        fileUrl={fileUrl}
        fileName={fileName}
        courses={courses || []}
      />
    </div>
  );
}
