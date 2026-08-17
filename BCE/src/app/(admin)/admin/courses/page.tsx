import { createClient } from '@/lib/supabase/server';
import CourseManager from '@/features/admin/components/CourseManager';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export default async function AdminCoursesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, full_name, email, role, institute_id')
    .eq('id', user?.id)
    .single();

  const query = supabase
    .from('courses')
    .select('*, profiles!courses_created_by_fkey(name), course_instructors(instructor_id)')
    .order('created_at', { ascending: false });
  
  const { data: courses } = await query;

  // Fetch all profiles with instructor/admin/developer roles for the faculty dropdown
  let instructorsQuery = supabase
    .from('profiles')
    .select('id, name, full_name, email, role, institute_id')
    .in('role', ['instructor', 'admin', 'developer', 'faculty', 'Instructor', 'Admin', 'Developer'])
    .order('full_name', { ascending: true });

  if (profile?.institute_id) {
    instructorsQuery = instructorsQuery.eq('institute_id', profile.institute_id);
  }

  const { data: instructors } = await instructorsQuery;

  // If the current user is not in the instructors list, include them
  let finalInstructors = instructors || [];
  if (profile && !finalInstructors.some((i: any) => i.id === profile.id)) {
    finalInstructors = [profile, ...finalInstructors];
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Manage Courses</h1>
      </div>
      <CourseManager 
        courses={courses || []} 
        instructors={finalInstructors}
        currentUserId={user?.id} 
        userRole={profile?.role} 
      />
    </div>
  );
}

