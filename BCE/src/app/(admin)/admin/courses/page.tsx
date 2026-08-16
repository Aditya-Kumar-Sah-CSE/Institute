import { createClient } from '@/lib/supabase/server';
import CourseManager from '@/features/admin/components/CourseManager';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export default async function AdminCoursesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();

  const query = supabase
    .from('courses')
    .select('*, profiles!courses_created_by_fkey(name), course_instructors(instructor_id)')
    .order('created_at', { ascending: false });
  
  const { data: courses } = await query;

  const { data: instructors } = await supabase
    .from('profiles')
    .select('id, name, full_name, email')
    .in('role', ['instructor', 'admin', 'developer']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Manage Courses</h1>
      </div>
      <CourseManager 
        courses={courses || []} 
        instructors={instructors || []}
        currentUserId={user?.id} 
        userRole={profile?.role} 
      />
    </div>
  );
}




