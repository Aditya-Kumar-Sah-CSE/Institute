import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // 1. Try to cleanup registrations for past contests (fail-safe)
    try {
      await supabase
        .from('contest_registrations')
        .delete()
        .lt('end_time', twoHoursAgo);
    } catch (e) {
      console.warn('Contest cleanup warning:', e);
    }

    // 2. Fetch registrations for user
    const { data, error } = await supabase
      .from('contest_registrations')
      .select('id, platform, contest_id, registered, status, end_time, verified_at, updated_at')
      .eq('user_id', user.id);

    if (error) {
      console.warn('Fetch contest_registrations DB error:', error);
      // Fallback gracefully if table or column does not exist yet
      return NextResponse.json({ registrations: [] });
    }

    return NextResponse.json({ registrations: data || [] });
  } catch (e: any) {
    console.warn('Contest registrations API error:', e);
    return NextResponse.json({ registrations: [] });
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { platform, contestId, status = 'pending_verification', endTime } = await request.json();

    if (!platform || !contestId) {
      return NextResponse.json({ error: 'Missing platform or contestId' }, { status: 400 });
    }

    const formattedEndTime = endTime ? new Date(Number(endTime)).toISOString() : null;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Clean up expired registrations safely
    try {
      await supabase
        .from('contest_registrations')
        .delete()
        .lt('end_time', twoHoursAgo);
    } catch (e) {
      console.warn('Contest cleanup warning:', e);
    }

    // Upsert registration intent
    const { data, error } = await supabase
      .from('contest_registrations')
      .upsert({
        user_id: user.id,
        platform,
        contest_id: contestId,
        registered: false,
        status,
        end_time: formattedEndTime,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,platform,contest_id' })
      .select()
      .single();

    if (error) {
      console.warn('Upsert contest_registrations DB error:', error);
      return NextResponse.json({
        success: true,
        registration: {
          platform,
          contest_id: contestId,
          registered: false,
          status,
          end_time: formattedEndTime
        }
      });
    }

    return NextResponse.json({ success: true, registration: data });
  } catch (e: any) {
    console.warn('Contest registration POST error:', e);
    return NextResponse.json({
      success: true,
      registration: {
        platform: '',
        contest_id: '',
        registered: false,
        status: 'pending_verification'
      }
    });
  }
}
