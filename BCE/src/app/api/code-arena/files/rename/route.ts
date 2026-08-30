import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { renameWorkspaceItem } from '@/features/code-arena/workspace-db';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { oldPath, newPath } = await request.json();
    
    if (!oldPath || !newPath) {
      return NextResponse.json({ error: 'oldPath and newPath are required' }, { status: 400 });
    }

    await renameWorkspaceItem(supabase, user.id, oldPath, newPath);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error renaming workspace item:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
