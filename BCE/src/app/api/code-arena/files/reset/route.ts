import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { initWorkspaceIfNeeded } from '@/features/code-arena/workspace-db';

export async function POST() {
  try {
    const { supabase, user } = await getCodeArenaActor();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all files and folders
    const { error: deleteError } = await supabase
      .from('student_workspace_files')
      .delete()
      .eq('student_id', user.id);

    if (deleteError) {
      throw new Error(`Failed to clear workspace files: ${deleteError.message}`);
    }

    // Initialize workspace default templates
    await initWorkspaceIfNeeded(supabase, user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error resetting workspace:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
