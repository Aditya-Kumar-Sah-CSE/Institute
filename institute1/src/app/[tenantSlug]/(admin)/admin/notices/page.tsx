import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getNotices } from '@/features/notices/actions';
import NoticeManager from '@/features/notices/components/NoticeManager';
import type { Notice } from '@/features/notices/components/NoticeBoard';
import { resolveTenantCache } from '@/lib/tenant/tenantCache';

export const metadata = {
  title: 'Manage Notices | Admin | Smart Learning',
};

export default async function AdminNoticesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'admin') {
    return null;
  }

  const tenant = await resolveTenantCache(tenantSlug, 'development');
  const notices = await getNotices(undefined, tenant?.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div>
        <h1 className="text-gradient" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>
          Manage Notices
        </h1>
        <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>
          Broadcast announcements to all users.
        </p>
      </div>

      <NoticeManager notices={notices as Notice[]} currentUserId={user.id} currentUserRole={profile.role} institutionId={tenant?.id} />
    </div>
  );
}


