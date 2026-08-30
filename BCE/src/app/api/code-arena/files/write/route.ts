import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { writeWorkspaceFile } from '@/features/code-arena/workspace-db';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path, content } = await request.json();
    
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    await writeWorkspaceFile(supabase, user.id, path, content ?? '');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error writing file:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
