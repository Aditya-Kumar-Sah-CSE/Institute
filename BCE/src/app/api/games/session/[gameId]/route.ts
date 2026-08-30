import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID parameter missing' }, { status: 400 });
    }

    const adminSb = await createAdminClient();

    const { data: session, error } = await adminSb
      .from('game_sessions')
      .select(`
        *,
        host:profiles!host_id(id, name, avatar_url),
        guest:profiles!guest_id(id, name, avatar_url)
      `)
      .eq('id', gameId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
