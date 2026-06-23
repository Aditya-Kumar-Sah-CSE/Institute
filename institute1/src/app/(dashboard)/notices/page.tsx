import { createClient } from '@/lib/supabase/server';
import { getNotices } from '@/features/notices/actions';
import NoticeBoard from '@/features/notices/components/NoticeBoard';
import type { Notice } from '@/features/notices/components/NoticeBoard';

export const metadata = {
  title: 'Notices | Smart Learning',
};

export default async function NoticesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const notices = await getNotices();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div>
        <h1 className="text-gradient" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>
          All Notices
        </h1>
        <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>
          Stay updated with the latest announcements from instructors.
        </p>
      </div>

      <NoticeBoard notices={notices as Notice[]} />
    </div>
  );
}
