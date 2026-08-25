import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { goal_id, task_id, task_name, duration_mins } = await request.json();

    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single();

    // Enforce single active session at a time
    const { data: activeSessions } = await supabase
      .from('goal_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .limit(1);

    if (activeSessions && activeSessions.length > 0) {
      return NextResponse.json({ error: 'A focus session is already in progress.' }, { status: 400 });
    }

    let activeGoalId = goal_id;
    if (!activeGoalId) {
      // Find or create default goal
      const { data: currentGoal } = await supabase
        .from('student_goals')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentGoal) {
        activeGoalId = currentGoal.id;
      } else {
        const { data: newGoal, error: createGoalErr } = await supabase
          .from('student_goals')
          .insert({
            user_id: user.id,
            institution_id: profile?.institution_id || null,
            goal_text: 'Daily Routine Focus',
            duration_mins: duration_mins || 30,
            routine: true,
            status: 'active'
          })
          .select('id')
          .single();

        if (createGoalErr) throw createGoalErr;
        activeGoalId = newGoal.id;
      }
    }

    const { data, error } = await supabase
      .from('goal_sessions')
      .insert({
        goal_id: activeGoalId,
        user_id: user.id,
        institution_id: profile?.institution_id || null,
        duration_mins: duration_mins || 30,
        status: 'in_progress',
        progress_mins: 0,
        task_id: task_id || null,
        task_name: task_name || null,
        started_at: new Date().toISOString(),
        is_paused: false,
        cumulative_pause_seconds: 0
      })
      .select('*, student_goals(goal_text)')
      .single();

    if (error) throw error;
    
    return NextResponse.json({ session: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { session_id, action, progress_mins } = await request.json();

    // Fetch current session state
    const { data: session, error: fetchErr } = await supabase
      .from('goal_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (action === 'pause') {
      if (!session.is_paused) {
        updates.is_paused = true;
        updates.last_paused_at = new Date().toISOString();
      }
    } else if (action === 'resume') {
      if (session.is_paused) {
        updates.is_paused = false;
        const lastPaused = new Date(session.last_paused_at).getTime();
        const pauseDelta = Math.floor((Date.now() - lastPaused) / 1000);
        updates.cumulative_pause_seconds = session.cumulative_pause_seconds + pauseDelta;
        updates.last_paused_at = null;
      }
    } else if (action === 'complete' || action === 'abandon') {
      const now = new Date();
      updates.status = action === 'complete' ? 'completed' : 'abandoned';
      updates.ended_at = now.toISOString();

      // Calculate final actual elapsed seconds
      let finalPaused = session.cumulative_pause_seconds;
      if (session.is_paused && session.last_paused_at) {
        const lastPaused = new Date(session.last_paused_at).getTime();
        finalPaused += Math.floor((now.getTime() - lastPaused) / 1000);
      }
      const totalElapsedSecs = Math.max(0, Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000) - finalPaused);
      updates.progress_mins = Math.floor(totalElapsedSecs / 60);
      updates.is_paused = false;
      updates.last_paused_at = null;

      // If completing a routine task, mark it as completed today
      if (action === 'complete' && session.task_id && session.task_name) {
        await supabase
          .from('daily_routine_completions')
          .upsert({
            user_id: user.id,
            institution_id: session.institution_id || null,
            task_id: session.task_id,
            task_name: session.task_name,
            completed_date: new Date().toISOString().split('T')[0],
            status: 'completed'
          }, {
            onConflict: 'user_id, task_id, completed_date'
          });
      }
    } else if (progress_mins !== undefined) {
      updates.progress_mins = progress_mins;
    }

    const { data: updatedSession, error: updateErr } = await supabase
      .from('goal_sessions')
      .update(updates)
      .eq('id', session_id)
      .eq('user_id', user.id)
      .select('*, student_goals(goal_text)')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ session: updatedSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  let query = supabase
    .from('goal_sessions')
    .select('*, student_goals(goal_text)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('status', 'in_progress');
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sessions: data || [] });
}
