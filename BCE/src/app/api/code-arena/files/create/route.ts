import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createWorkspaceItem } from '@/features/code-arena/workspace-db';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path, kind } = await request.json();
    
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }
    if (kind !== 'file' && kind !== 'directory') {
      return NextResponse.json({ error: 'Invalid kind. Must be file or directory' }, { status: 400 });
    }

    await createWorkspaceItem(supabase, user.id, path, kind);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error creating workspace item:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
