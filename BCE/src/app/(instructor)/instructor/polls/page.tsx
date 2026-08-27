import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getGlobalPolls } from '@/features/polls/actions';
import GlobalPollBoard from '@/features/polls/components/GlobalPollBoard';
import type { GlobalPoll } from '@/features/polls/components/GlobalPollCard';
import GlobalPollManager from '@/features/polls/components/GlobalPollManager';

export const metadata = {
  title: 'Manage Polls | Instructor | Smart Learning',
};

export default async function InstructorPollsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email, status')
    .eq('id', user.id)
    .single();

  const isInstructor = 
    profile && (
      (profile.role === 'instructor' && profile.status === 'active') ||
      ['admin', 'developer', 'superadmin', 'super_admin'].includes(profile.role) ||
      profile.email?.trim().toLowerCase() === 'iambestadi@gmail.com'
    );

  if (!isInstructor) {
    redirect('/dashboard');
  }

  const polls = await getGlobalPolls();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div>
        <h1 className="text-gradient" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>
          Manage Global Polls
        </h1>
        <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>
          Broadcast global polls to all students. You can delete any polls you create.
        </p>
      </div>

      <GlobalPollManager />

      <div style={{ marginTop: 'var(--space-lg)' }}>
        <h2 style={{ marginBottom: 'var(--space-md)' }}>Existing Polls</h2>
        <GlobalPollBoard 
          polls={polls as GlobalPoll[]} 
          currentUserId={user.id} 
          currentUserRole={profile.role}
          currentUserEmail={profile.email}
        />
      </div>
    </div>
  );
}
