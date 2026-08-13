import { redirect } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import CodingProfileHero from '@/features/code-arena/components/profile/CodingProfileHero';
import CompetitiveOverview from '@/features/code-arena/components/profile/CompetitiveOverview';
import CodeforcesProfileCard from '@/features/code-arena/components/profile/CodeforcesProfileCard';
import LeetCodeProfileCard from '@/features/code-arena/components/profile/LeetCodeProfileCard';
import RecentCodingActivity from '@/features/code-arena/components/profile/RecentCodingActivity';
import MobileCodeArenaToggle from '@/features/code-arena/components/MobileCodeArenaToggle';
import '@/features/code-arena/components/CodeArena.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CodingProfilePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { supabase, user: currentUser } = await getCodeArenaActor();
  if (!currentUser) redirect('/login');

  const { id: queryId } = await searchParams;
  const targetId = queryId || currentUser.id;
  const isOwnProfile = targetId === currentUser.id;

  const [
    { data: profile },
    { count: bceSolved }, 
    { count: battles },
    { data: accounts }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', targetId).single(),
    supabase.from('coding_submissions').select('problem_id', { count: 'exact', head: true }).eq('student_id', targetId).eq('status', 'ACCEPTED'),
    supabase.from('coding_battle_participants').select('*', { count: 'exact', head: true }).eq('student_id', targetId),
    supabase.from('student_external_accounts').select('*').eq('student_id', targetId),
  ]);

  if (!profile) {
    redirect('/code-arena/profile');
  }

  const cfAccount = accounts?.find(a => a.platform === 'CODEFORCES');
  const lcAccount = accounts?.find(a => a.platform === 'LEETCODE');
  
  // Total Submissions from BCE to merge into activity
  const { data: bceSubmissions } = await supabase
    .from('coding_submissions')
    .select('id, problem_id, status, language, created_at, coding_problems(title, difficulty, provider)')
    .eq('student_id', targetId)
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <div className="code-arena-profile-page">
      <MobileCodeArenaToggle />
      <CodingProfileHero 
        profile={profile} 
        codeforcesConnected={!!cfAccount}
        leetCodeConnected={!!lcAccount}
        isOwnProfile={isOwnProfile}
      />
      
      <div className="profile-grid-container">
        <div className="profile-main-column">
          <CompetitiveOverview
            bceSolved={bceSolved || 0}
            streak={profile?.streak_days || 0}
            cfRating={cfAccount?.rating || null}
            lcSolved={lcAccount?.problems_solved || null}
          />
          
          <div className="platform-cards-grid">
            <CodeforcesProfileCard account={cfAccount} />
            <LeetCodeProfileCard account={lcAccount} />
          </div>
        </div>

        <div className="profile-side-column">
          <RecentCodingActivity 
            bceRecent={bceSubmissions || []} 
            cfRecent={cfAccount?.metadata?.recent_submissions || []} 
          />
        </div>
      </div>
    </div>
  );
}
