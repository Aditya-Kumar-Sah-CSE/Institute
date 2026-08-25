import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { goal_id, duration_mins } = await request.json();

    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.institution_id) {
       return NextResponse.json({ error: 'No institution found' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('goal_sessions')
      .insert({
        goal_id,
        user_id: user.id,
        institution_id: profile.institution_id,
        duration_mins,
        status: 'in_progress',
        progress_mins: 0
      })
      .select()
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
    const { session_id, status, progress_mins } = await request.json();

    const { data, error } = await supabase
      .from('goal_sessions')
      .update({ 
        status, 
        progress_mins,
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    // Check if we need to update daily coding activity
    if (status === 'completed') {
       // Optional: Log completion event somewhere if needed
    }

    return NextResponse.json({ session: data });
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
