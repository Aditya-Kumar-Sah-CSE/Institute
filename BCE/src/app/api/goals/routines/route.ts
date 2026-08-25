import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ routines: data || [] });
}

// Bulk save: replace all routines for user
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { routines } = await request.json() as {
      routines: { time_slot: string; task_name: string; sort_order: number }[];
    };

    // Delete existing routines
    await supabase
      .from('daily_routines')
      .delete()
      .eq('user_id', user.id);

    if (routines && routines.length > 0) {
      const rows = routines.map((r, i) => ({
        user_id: user.id,
        time_slot: r.time_slot,
        task_name: r.task_name,
        sort_order: r.sort_order ?? i,
      }));

      const { error } = await supabase
        .from('daily_routines')
        .insert(rows);

      if (error) throw error;
    }

    // Return updated routines
    const { data } = await supabase
      .from('daily_routines')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ routines: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
