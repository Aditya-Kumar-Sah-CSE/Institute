import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';

  if (all) {
    const { data, error } = await supabase
      .from('student_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ goals: data || [] });
  }

  const { data, error } = await supabase
    .from('student_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ goal: data || null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { goal_text, duration_mins, routine, reminder_time } = await request.json();

    // Get user's institution (optional)
    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single();

    // Archive existing active goals
    await supabase
      .from('student_goals')
      .update({ status: 'archived' })
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Insert new goal
    const { data, error } = await supabase
      .from('student_goals')
      .insert({
        user_id: user.id,
        institution_id: profile?.institution_id || null,
        goal_text,
        duration_mins,
        routine,
        reminder_time: reminder_time || null,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ goal: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { goal_id, goal_text, duration_mins, routine, reminder_time, status } = body;

    const updateFields: any = { updated_at: new Date().toISOString() };
    if (goal_text !== undefined) updateFields.goal_text = goal_text;
    if (duration_mins !== undefined) updateFields.duration_mins = duration_mins;
    if (routine !== undefined) updateFields.routine = routine;
    if (reminder_time !== undefined) updateFields.reminder_time = reminder_time || null;
    if (status !== undefined) updateFields.status = status;

    const { data, error } = await supabase
      .from('student_goals')
      .update(updateFields)
      .eq('id', goal_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ goal: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const goal_id = searchParams.get('goal_id');

    if (!goal_id) {
      return NextResponse.json({ error: 'goal_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('student_goals')
      .delete()
      .eq('id', goal_id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


