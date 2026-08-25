import { NextResponse } from 'next/server';
import { checkMonthlyRewards, markMonthlyRewardSeen } from '@/features/gamification/actions/monthly-rewards';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rewards = await checkMonthlyRewards(user.id);
    
    // Determine the month date to show
    const now = new Date();
    // Subtract 1 month to get previous month
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    
    const targetMonthStr = rewards.length > 0 ? rewards[0].month_date : prevMonthStr;

    // Fetch the Top 3 champions for this target month
    const { data: champions, error: champError } = await supabase
      .from('monthly_rewards')
      .select('rank, problems_solved, profiles(name, avatar_url)')
      .eq('month_date', targetMonthStr)
      .lte('rank', 3)
      .order('rank', { ascending: true });

    if (champError) {
      console.error('Error fetching monthly champions:', champError);
    }

    // Format the champions list
    const formattedChampions = (champions || []).map((c: any) => ({
      rank: c.rank,
      problems_solved: c.problems_solved,
      name: c.profiles?.name || 'Student',
      avatar_url: c.profiles?.avatar_url || null,
    }));

    // Format month date into e.g. "July 2026"
    const [year, month] = targetMonthStr.split('-');
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return NextResponse.json({
      data: {
        unseenRewards: rewards || [],
        champions: formattedChampions,
        monthName,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (body.rewardId) {
      await markMonthlyRewardSeen(body.rewardId);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
