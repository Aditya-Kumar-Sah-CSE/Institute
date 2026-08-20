import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from('contest_registrations')
      .select('id, platform, contest_id, registered, status, verified_at, updated_at')
      .eq('user_id', user.id);

    if (error) {
      // If table doesn't exist yet, return empty list safely
      if (error.code === '42P01') {
        return NextResponse.json({ registrations: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ registrations: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch registrations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { platform, contestId, status = 'pending_verification' } = await request.json();

    if (!platform || !contestId) {
      return NextResponse.json({ error: 'Missing platform or contestId' }, { status: 400 });
    }

    // Try to record registration attempt in DB
    const { data, error } = await supabase
      .from('contest_registrations')
      .upsert({
        user_id: user.id,
        platform,
        contest_id: contestId,
        registered: false,
        status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,platform,contest_id' })
      .select()
      .single();

    if (error) {
      console.warn('Upsert contest_registrations error:', error);
      // Fallback response if DB table has not migrated yet
      return NextResponse.json({
        success: true,
        registration: {
          platform,
          contest_id: contestId,
          registered: false,
          status
        }
      });
    }

    return NextResponse.json({ success: true, registration: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update registration' }, { status: 500 });
  }
}
