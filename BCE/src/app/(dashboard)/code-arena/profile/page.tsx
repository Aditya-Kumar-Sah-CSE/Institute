import { redirect } from 'next/navigation';
import { getCodeArenaActor } from '@/features/code-arena/server';
import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import CodingProfileHero from '@/features/code-arena/components/profile/CodingProfileHero';
import CompetitiveOverview from '@/features/code-arena/components/profile/CompetitiveOverview';
import CodeforcesProfileCard from '@/features/code-arena/components/profile/CodeforcesProfileCard';
import LeetCodeProfileCard from '@/features/code-arena/components/profile/LeetCodeProfileCard';
import CodeChefProfileCard from '@/features/code-arena/components/profile/CodeChefProfileCard';
import GfgProfileCard from '@/features/code-arena/components/profile/GfgProfileCard';
import RecentCodingActivity from '@/features/code-arena/components/profile/RecentCodingActivity';
import MobileCodeArenaToggle from '@/features/code-arena/components/MobileCodeArenaToggle';
import '@/features/code-arena/components/CodeArena.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CodingProfilePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { supabase, user: currentUser } = await getCodeArenaActor();
  const { id: queryId } = await searchParams;

  if (!currentUser && !queryId) {
    redirect('/login');
  }

  const targetId = queryId || currentUser?.id;
  if (!targetId) {
    redirect('/login');
  }
  const isOwnProfile = currentUser ? targetId === currentUser.id : false;

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
  const ccAccount = accounts?.find(a => a.platform === 'CODECHEF');
  const gfgAccount = accounts?.find(a => a.platform === 'GEEKSFORGEEKS' || a.platform === 'GFG');

  // Total Submissions from BCE to merge into activity
  const { data: bceSubmissions } = await supabase
    .from('coding_submissions')
    .select('id, problem_id, status, language, created_at, coding_problems(title, difficulty, provider)')
    .eq('student_id', targetId)
    .order('created_at', { ascending: false })
    .limit(30);

  // Fetch last 3 years of accepted BCE submissions for contribution calendar
  const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
  const { data: bceAcceptedHistory } = await supabase
    .from('coding_submissions')
    .select('created_at')
    .eq('student_id', targetId)
    .eq('status', 'ACCEPTED')
    .gte('created_at', threeYearsAgo);

  const bceDaily: Record<string, number> = {};
  (bceAcceptedHistory || []).forEach((sub: any) => {
    try {
      const dateStr = new Date(sub.created_at).toISOString().slice(0, 10);
      bceDaily[dateStr] = (bceDaily[dateStr] || 0) + 1;
    } catch (e) {
      // Ignored
    }
  });

  // Extract external platform activity maps
  const cfDaily = cfAccount?.metadata?.cf_daily_activity || {};
  const lcDaily = lcAccount?.metadata?.lc_daily_activity || {};

  // Build unified daily activity map for the last 365 days
  const dailyActivity: Record<string, { bce: number; cf: number; lc: number; total: number }> = {};
  const allDates = new Set<string>([
    ...Object.keys(bceDaily),
    ...Object.keys(cfDaily),
    ...Object.keys(lcDaily),
  ]);

  allDates.forEach((dateStr) => {
    const bceCount = bceDaily[dateStr] || 0;
    const cfCount = cfDaily[dateStr] || 0;
    const lcCount = lcDaily[dateStr] || 0;
    dailyActivity[dateStr] = {
      bce: bceCount,
      cf: cfCount,
      lc: lcCount,
      total: bceCount + cfCount + lcCount,
    };
  });

  return (
    <div className="code-arena-profile-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <MobileCodeArenaToggle />
      
      {/* Compact IDE Header Bar */}
      <header className="code-arena-header-compact" style={{ marginBottom: '4px' }}>
        <div className="code-arena-header-left">
          <Link
            href="/code-arena"
            style={{
              display: 'grid',
              placeItems: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            title="Back to Code Arena"
            aria-label="Back to Code Arena"
            className="oj-icon-btn"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="code-arena-header-title">
              Code Arena
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            <Trophy size={13} /> Programmer Profile
          </div>
        </div>
      </header>

      <CodingProfileHero 
        profile={profile} 
        codeforcesConnected={!!cfAccount}
        leetCodeConnected={!!lcAccount}
        codechefConnected={!!ccAccount}
        gfgConnected={!!gfgAccount}
        isOwnProfile={isOwnProfile}
        dailyActivity={dailyActivity}
      />
      
      <div className="profile-grid-container">
        <div className="profile-main-column">
          <CompetitiveOverview
            bceSolved={bceSolved || 0}
            streak={profile?.streak_days || 0}
            cfRating={cfAccount?.rating || null}
            lcSolved={lcAccount?.problems_solved || null}
            ccRating={ccAccount?.rating || null}
            ccMaxRating={ccAccount?.max_rating || null}
            ccStars={ccAccount?.metadata?.stars || null}
          />
          
          <div className="platform-cards-grid">
            <GfgProfileCard account={gfgAccount} isOwnProfile={isOwnProfile} />
            <CodeChefProfileCard account={ccAccount} isOwnProfile={isOwnProfile} />
            <CodeforcesProfileCard account={cfAccount} isOwnProfile={isOwnProfile} />
            <LeetCodeProfileCard account={lcAccount} isOwnProfile={isOwnProfile} />
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
