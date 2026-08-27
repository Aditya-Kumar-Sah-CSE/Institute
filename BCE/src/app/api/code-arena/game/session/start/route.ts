import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function POST(req: Request) {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mode, level, wave } = body;

    if (!mode || !['challenge', 'infinite'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid game mode' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    // Insert session into DB
    const { data: session, error } = await supabase
      .from('breaker_sessions')
      .insert({
        user_id: user.id,
        mode,
        level: mode === 'challenge' ? (level || 1) : null,
        wave: mode === 'infinite' ? (wave || 1) : null,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        server_validation_metadata: {
          client_ip: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        }
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, sessionId: session.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
