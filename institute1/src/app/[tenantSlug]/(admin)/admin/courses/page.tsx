import { createClient } from '@/lib/supabase/server';
import CourseManager from '@/features/admin/components/CourseManager';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export default async function AdminCoursesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role, institution_id').eq('id', user?.id).single();
  const tenant = await resolveTenantCache(tenantSlug, 'development');

  let query = supabase.from('courses').select('*, profiles(name)').order('created_at', { ascending: false });
  
  // Explicitly filter by tenant to prevent cross-tenant data bleed
  if (tenant?.id) {
    query = query.eq('institution_id', tenant.id);
  }
  
  const { data: courses } = await query;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Manage Courses</h1>
      </div>
      <CourseManager courses={courses || []} currentUserId={user?.id} userRole={profile?.role} />
    </div>
  );
}




