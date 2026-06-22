import { createClient } from '@/lib/supabase/server';
import CourseManager from '@/features/admin/components/CourseManager';

export default async function AdminCoursesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();

  let query = supabase.from('courses').select('*, profiles(name)').order('created_at', { ascending: false });
  
  if (profile?.role === 'instructor') {
    query = query.eq('created_by', user?.id).eq('is_deleted', false);
  }

  const { data: courses } = await query;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Manage Courses</h1>
      </div>
      <CourseManager courses={courses || []} />
    </div>
  );
}
