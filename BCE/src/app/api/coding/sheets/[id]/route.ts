import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch sheet details
  const { data: sheet, error: sheetError } = await supabase
    .from('coding_sheets')
    .select('id, title, description, created_by, created_at')
    .eq('id', id)
    .maybeSingle();

  if (sheetError || !sheet) {
    return NextResponse.json({ success: false, error: { message: sheetError?.message || 'Coding sheet not found.' } }, { status: 404 });
  }

  // Fetch linked problems with metadata
  const { data: problemsData, error: problemsError } = await supabase
    .from('coding_sheet_problems')
    .select('order_index, coding_problems(id, title, difficulty, source_type, external_platform, external_problem_id, external_url, tags)')
    .eq('sheet_id', id)
    .order('order_index', { ascending: true });

  if (problemsError) {
    return NextResponse.json({ success: false, error: { message: problemsError.message } }, { status: 400 });
  }

  const problems = (problemsData || []).map((p: any) => ({
    ...p.coding_problems,
    order_index: p.order_index,
  }));

  return NextResponse.json({
    success: true,
    data: {
      ...sheet,
      problems,
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: sheet } = await supabase.from('coding_sheets').select('created_by').eq('id', id).single();
    if (!sheet) {
      return NextResponse.json({ success: false, error: { message: 'Sheet not found' } }, { status: 404 });
    }

    if (!isInstructor) {
      return NextResponse.json({ success: false, error: { message: 'Forbidden: Only instructors can edit coding sheets.' } }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, problems } = body;

    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description || null;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('coding_sheets')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return NextResponse.json({ success: false, error: { message: updateError.message } }, { status: 400 });
      }
    }

    if (problems !== undefined && Array.isArray(problems)) {
      // Re-link problems
      await supabase.from('coding_sheet_problems').delete().eq('sheet_id', id);

      if (problems.length > 0) {
        const problemLinks = problems.map((pId: string, idx: number) => ({
          sheet_id: id,
          problem_id: pId,
          order_index: idx,
        }));
        const { error: linkError } = await supabase.from('coding_sheet_problems').insert(problemLinks);
        if (linkError) {
          return NextResponse.json({ success: false, error: { message: 'Failed to update linked problems.' } }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Update failed' } }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sheet } = await supabase.from('coding_sheets').select('created_by').eq('id', id).single();
  if (!sheet) {
    return NextResponse.json({ success: false, error: { message: 'Sheet not found' } }, { status: 404 });
  }

  if (!isInstructor) {
    return NextResponse.json({ success: false, error: { message: 'Forbidden: Only instructors can delete coding sheets.' } }, { status: 403 });
  }

  const { error: deleteError } = await supabase.from('coding_sheets').delete().eq('id', id);
  if (deleteError) {
    return NextResponse.json({ success: false, error: { message: deleteError.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
