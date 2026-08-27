import { createClient } from '@/lib/supabase/server';
import { getGlobalPolls } from '@/features/polls/actions';
import GlobalPollBoard from '@/features/polls/components/GlobalPollBoard';
import type { GlobalPoll } from '@/features/polls/components/GlobalPollCard';
import GlobalPollManager from '@/features/polls/components/GlobalPollManager';

export const metadata = {
  title: 'Global Polls | Smart Learning',
};

export default async function PollsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  const polls = await getGlobalPolls();

  const authorizedRoles = ['admin', 'instructor', 'developer', 'superadmin', 'super_admin'];
  const isAuthorized = 
    profile && (
      authorizedRoles.includes(profile.role) || 
      profile.email?.trim().toLowerCase() === 'iambestadi@gmail.com'
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>
            Global Polls
          </h1>
          <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>
            Participate in institute-wide voting and see what others think.
          </p>
        </div>
        
        {isAuthorized && (
          <div style={{ marginTop: 'var(--space-xs)' }}>
            <GlobalPollManager hideHeading={true} />
          </div>
        )}
      </div>

      <GlobalPollBoard 
        polls={polls as GlobalPoll[]} 
        currentUserId={user.id} 
        currentUserRole={profile?.role || 'student'}
        currentUserEmail={profile?.email}
      />
    </div>
  );
}
