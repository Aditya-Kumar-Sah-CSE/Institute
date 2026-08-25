import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_routine_completions')
    .select('*')
    .eq('user_id', user.id)
    .eq('completed_date', dateStr);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ completions: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { task_id, task_name, date, action, status } = await request.json();
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single();

    if (action === 'delete') {
      const { error } = await supabase
        .from('daily_routine_completions')
        .delete()
        .eq('user_id', user.id)
        .eq('task_id', task_id)
        .eq('completed_date', targetDate);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Upsert completion or skip status
    const targetStatus = status || 'completed'; // 'completed' or 'skipped'
    const { data, error } = await supabase
      .from('daily_routine_completions')
      .upsert({
        user_id: user.id,
        institution_id: profile?.institution_id || null,
        task_id,
        task_name,
        completed_date: targetDate,
        status: targetStatus
      }, {
        onConflict: 'user_id, task_id, completed_date'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ completion: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
