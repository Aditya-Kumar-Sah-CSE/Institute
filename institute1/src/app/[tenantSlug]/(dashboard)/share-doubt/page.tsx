import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ShareDoubtForm from './ShareDoubtForm';

export default async function ShareDoubtPage(props: {
  searchParams: Promise<{ fileUrl?: string; fileName?: string; files?: string }>;
}) {
  const searchParams = await props.searchParams;
  let fileUrl = searchParams.fileUrl || '';
  let fileName = searchParams.fileName || '';
  const filesParam = searchParams.files;

  if (filesParam) {
    try {
      const decoded = filesParam.startsWith('[') ? filesParam : decodeURIComponent(filesParam);
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && parsed.length > 0) {
        fileUrl = parsed[0].url || '';
        fileName = parsed[0].name || '';
      }
    } catch (err) {
      console.warn('Failed to parse files param in ShareDoubtPage:', err);
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch courses enrolled by this student
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id, courses(*)')
    .eq('user_id', user.id);
    
  const enrolledCourses = enrollments 
    ? enrollments.map((e: any) => e.courses).filter(Boolean)
    : [];

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient">Ask Doubt from Shared File</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          To ask a doubt, select the course and lesson this material belongs to.
        </p>
      </div>

      <ShareDoubtForm
        fileUrl={fileUrl}
        fileName={fileName}
        courses={enrolledCourses}
      />
    </div>
  );
}
