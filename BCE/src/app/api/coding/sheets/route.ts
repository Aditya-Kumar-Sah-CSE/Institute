import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { generateUniqueSheetSlug } from '@/lib/slug-utils';

export async function GET() {
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('coding_sheets')
    .select('id, slug, is_public, published_at, title, description, created_by, created_at, enrollment_access, coding_sheet_problems(problem_id)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const { supabase, user, isInstructor } = await getCodeArenaActor();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }

  if (!isInstructor) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Only instructors and admins can create coding sheets.' } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { title, description, problems = [], enrollment_access = 'public', enrollment_passcode = null, is_public = true } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'SHEET_TITLE_REQUIRED', message: 'Please enter a sheet name.' } },
        { status: 400 }
      );
    }

    if (!Array.isArray(problems) || problems.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_PROBLEMS', message: 'Please add at least one problem to the sheet.' } },
        { status: 400 }
      );
    }

    // 1. Insert coding sheet
    const validAccess = ['public', 'restricted', 'private'];
    const accessValue = validAccess.includes(enrollment_access) ? enrollment_access : 'public';
    const slug = await generateUniqueSheetSlug(supabase, title.trim());

    const isPublicBool = Boolean(is_public);
    const nowIso = new Date().toISOString();

    const { data: sheet, error: createError } = await supabase
      .from('coding_sheets')
      .insert({
        title: title.trim(),
        slug,
        is_public: isPublicBool,
        published_at: isPublicBool ? nowIso : null,
        description: description || null,
        created_by: user.id,
        enrollment_access: accessValue,
        enrollment_passcode: accessValue === 'restricted' ? (enrollment_passcode || null) : null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Coding sheet creation DB error:', createError);
      return NextResponse.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: createError.message || 'Failed to save coding sheet.' } },
        { status: 400 }
      );
    }

    // 2. Link problems
    const problemLinks = problems.map((pId: string, idx: number) => ({
      sheet_id: sheet.id,
      problem_id: pId,
      order_index: idx,
    }));

    const { error: linkError } = await supabase.from('coding_sheet_problems').insert(problemLinks);
    if (linkError) {
      console.error('Sheet problem link error:', linkError);
      // Rollback coding sheet if link fails
      await supabase.from('coding_sheets').delete().eq('id', sheet.id);
      return NextResponse.json(
        { success: false, error: { code: 'PROBLEM_LINK_FAILED', message: 'Could not attach problems to sheet.' } },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: sheet }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err.message || 'Coding sheet creation failed' } },
      { status: 500 }
    );
  }
}
