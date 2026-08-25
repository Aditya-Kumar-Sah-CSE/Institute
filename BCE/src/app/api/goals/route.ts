import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    // Get user's institution
    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.institution_id) {
       return NextResponse.json({ error: 'No institution found' }, { status: 400 });
    }

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
        institution_id: profile.institution_id,
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
    const { goal_id, status } = await request.json();

    const { data, error } = await supabase
      .from('student_goals')
      .update({ status, updated_at: new Date().toISOString() })
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
