import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    // Get all completed sessions for this user on the target date
    // Note: since ended_at is TIMESTAMPTZ, we filter between targetDate 00:00:00 and 23:59:59 UTC/Local
    // To keep it simple and consistent with completions DATE matching, we match ended_at date string:
    const { data: sessions, error } = await supabase
      .from('goal_sessions')
      .select('*, student_goals(goal_text)')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (error) throw error;

    // Filter sessions matching today's date (local representation comparison)
    const todaySessions = (sessions || []).filter(s => {
      if (!s.ended_at) return false;
      const d = s.ended_at.split('T')[0];
      return d === dateStr;
    });

    let totalFocusMins = 0;
    const goalSummaryMap: Record<string, { goal_text: string, focus_mins: number }> = {};

    todaySessions.forEach(s => {
      const mins = Number(s.progress_mins || 0);
      totalFocusMins += mins;

      const gId = s.goal_id;
      const gText = s.student_goals?.goal_text || 'Daily Routine Focus';
      if (!goalSummaryMap[gId]) {
        goalSummaryMap[gId] = { goal_text: gText, focus_mins: 0 };
      }
      goalSummaryMap[gId].focus_mins += mins;
    });

    const perGoalStats = Object.entries(goalSummaryMap).map(([goal_id, item]) => ({
      goal_id,
      goal_text: item.goal_text,
      focus_mins: item.focus_mins
    }));

    return NextResponse.json({
      total_focus_mins: totalFocusMins,
      per_goal_stats: perGoalStats
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
