import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { getWorkspaceTree } from '@/features/code-arena/workspace-db';

export async function GET() {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tree = await getWorkspaceTree(supabase, user.id);
    return NextResponse.json({ files: tree });
  } catch (err: any) {
    console.error('Error fetching workspace tree:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST endpoint to force initialization or re-fetch
export async function POST() {
  return GET();
}
