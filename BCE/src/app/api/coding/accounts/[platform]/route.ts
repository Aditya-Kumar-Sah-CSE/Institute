import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Normalize GFG alias → canonical GEEKSFORGEEKS
  const normalizedPlatform = platform.toUpperCase() === 'GFG' ? 'GEEKSFORGEEKS' : platform.toUpperCase();

  const { error } = await supabase
    .from('student_external_accounts')
    .delete()
    .eq('student_id', user.id)
    .eq('platform', normalizedPlatform);

  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : new NextResponse(null, { status: 204 });
}
