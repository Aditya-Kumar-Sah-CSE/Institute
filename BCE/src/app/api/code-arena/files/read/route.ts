import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { readWorkspaceFile } from '@/features/code-arena/workspace-db';

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const content = await readWorkspaceFile(supabase, user.id, path);
    return NextResponse.json({ content });
  } catch (err: any) {
    console.error('Error reading file:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
