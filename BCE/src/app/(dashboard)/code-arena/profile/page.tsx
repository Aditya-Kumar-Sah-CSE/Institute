import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import { getCodeArenaActor } from '@/features/code-arena/server';
import CodingAccounts from '@/features/code-arena/components/CodingAccounts';
import CompetitiveProgress from '@/features/code-arena/components/CompetitiveProgress';
import '@/features/code-arena/components/CodeArena.css';

export default async function CodingProfilePage() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) redirect('/login');

  const [{ count: solved }, { count: battles }, { data: accounts }] = await Promise.all([
    supabase
      .from('coding_submissions')
      .select('problem_id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'ACCEPTED'),
    supabase
      .from('coding_battle_participants')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id),
    supabase
      .from('student_external_accounts')
      .select('platform, username, rating, max_rating, rank, profile_url, problems_solved, easy_solved, medium_solved, hard_solved, last_synced_at')
      .eq('student_id', user.id),
  ]);

  return (
    <div className="code-arena-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div>
        <h1 className="text-gradient" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
          Coding Profile
        </h1>
        <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
          Your BCE coding history, competitive stats, and connected accounts.
        </p>
      </div>

      {/* Competitive Progress Widget */}
      <CompetitiveProgress
        bceSolved={solved || 0}
        battlesPlayed={battles || 0}
        accounts={accounts || []}
      />

      {/* Connected Accounts */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 var(--space-md) 0' }}>
          Connected Accounts
        </h2>
        <CodingAccounts initial={accounts || []} />
      </div>
    </div>
  );
}
