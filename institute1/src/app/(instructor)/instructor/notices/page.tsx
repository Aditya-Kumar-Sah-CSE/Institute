import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getNotices } from '@/features/notices/actions';
import NoticeManager from '@/features/notices/components/NoticeManager';
import type { Notice } from '@/features/notices/components/NoticeBoard';

export const metadata = {
  title: 'Manage Notices | Instructor | Smart Learning',
};

export default async function InstructorNoticesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).single();

  if (profile?.role !== 'instructor' || profile?.status !== 'active') {
    redirect('/dashboard');
  }

  const notices = await getNotices();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div>
        <h1 className="text-gradient" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>
          Manage Notices
        </h1>
        <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>
          Broadcast announcements to all students. You can only delete notices that you have created.
        </p>
      </div>

      <NoticeManager notices={notices as Notice[]} currentUserId={user.id} currentUserRole={profile.role} />
    </div>
  );
}
