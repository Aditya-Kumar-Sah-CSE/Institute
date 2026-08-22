import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isInstructor } = await getCodeArenaActor();

  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, { status: 401 });
  }

  // 1. Fetch the sheet with permission fields
  const { data: sheet, error: sheetError } = await supabase
    .from('coding_sheets')
    .select('id, enrollment_access, enrollment_passcode, created_by')
    .eq('id', id)
    .maybeSingle();

  if (sheetError || !sheet) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Coding sheet not found.' } }, { status: 404 });
  }

  // 2. Instructors/admins and sheet creators are always allowed
  if (isInstructor || sheet.created_by === user.id) {
    // Ensure enrollment record exists for tracking
    await supabase.from('coding_sheet_enrollments').upsert(
      { sheet_id: id, user_id: user.id },
      { onConflict: 'sheet_id,user_id' }
    );
    return NextResponse.json({ success: true, message: 'Enrolled successfully.' });
  }

  // 3. Check if already enrolled (idempotent)
  const { data: existing } = await supabase
    .from('coding_sheet_enrollments')
    .select('id')
    .eq('sheet_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: true, message: 'Already enrolled.' });
  }

  // 4. Permission check based on enrollment_access
  if (sheet.enrollment_access === 'private') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'This coding sheet is private. Only the instructor can grant access.' } },
      { status: 403 }
    );
  }

  if (sheet.enrollment_access === 'restricted') {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // No body provided
    }

    const providedPasscode = body?.passcode?.trim();
    if (!providedPasscode || providedPasscode !== sheet.enrollment_passcode) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PASSCODE', message: 'Incorrect enrollment passcode.' } },
        { status: 403 }
      );
    }
  }

  // 5. Authorized — create enrollment
  const { error: enrollError } = await supabase.from('coding_sheet_enrollments').insert({
    sheet_id: id,
    user_id: user.id,
  });

  if (enrollError) {
    // Handle unique constraint violation gracefully (race condition)
    if (enrollError.code === '23505') {
      return NextResponse.json({ success: true, message: 'Already enrolled.' });
    }
    return NextResponse.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: enrollError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: 'Enrolled successfully.' }, { status: 201 });
}
