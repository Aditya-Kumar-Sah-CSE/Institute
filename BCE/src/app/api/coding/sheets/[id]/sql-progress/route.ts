import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';
import { awardXP } from '@/features/auth/actions/auth';

async function resolveSheet(supabase: any, idOrSlug: string) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const query = supabase
    .from('coding_sheets')
    .select('id, slug, title, sheet_type');
  const { data } = await (isUUID ? query.eq('id', idOrSlug) : query.eq('slug', idOrSlug)).maybeSingle();
  return data;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const sheet = await resolveSheet(supabase, id);
  if (!sheet) {
    return NextResponse.json({ success: false, error: { message: 'Sheet not found' } }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('coding_sheet_sql_progress')
    .select('question_number, question_type, is_solved, is_bookmarked, selected_option, submitted_sql, attempts, xp_awarded, solved_at')
    .eq('sheet_id', sheet.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const sheet = await resolveSheet(supabase, id);
  if (!sheet) {
    return NextResponse.json({ success: false, error: { message: 'Sheet not found' } }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      questionNumber,
      questionType,
      isSolved = true,
      selectedOption = null,
      submittedSql = null,
      isBookmarked,
    } = body as {
      questionNumber?: number;
      questionType?: 'MCQ' | 'QUERY';
      isSolved?: boolean;
      selectedOption?: string | null;
      submittedSql?: string | null;
      isBookmarked?: boolean;
    };

    if (!questionNumber || !questionType || !['MCQ', 'QUERY'].includes(questionType)) {
      return NextResponse.json(
        { success: false, error: { message: 'questionNumber and valid questionType (MCQ|QUERY) are required.' } },
        { status: 400 }
      );
    }

    const adminSb = await createAdminClient();

    // Check existing progress record
    const { data: existing } = await adminSb
      .from('coding_sheet_sql_progress')
      .select('*')
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
      .eq('question_number', questionNumber)
      .maybeSingle();

    // Determine difficulty for XP award (only award XP on first time is_solved transitions to true)
    let xpAwardedNow = 0;
    const shouldAwardXp = isSolved && (!existing || !existing.is_solved || (existing.xp_awarded || 0) === 0);

    if (shouldAwardXp) {
      const { data: qMeta } = await adminSb
        .from('coding_sheet_sql_questions')
        .select('difficulty')
        .eq('sheet_id', sheet.id)
        .eq('question_number', questionNumber)
        .maybeSingle();

      const diff = (qMeta?.difficulty || 'EASY').toUpperCase();
      // Reward SQL Mastery solving cleanly (MCQ: 3/5/8, QUERY: 5/10/15)
      xpAwardedNow =
        questionType === 'QUERY'
          ? diff === 'HARD'
            ? 15
            : diff === 'MEDIUM'
            ? 10
            : 5
          : diff === 'HARD'
          ? 8
          : diff === 'MEDIUM'
          ? 5
          : 3;

      try {
        await awardXP(
          user.id,
          xpAwardedNow,
          `TCS SQL Q${questionNumber} (${questionType})`,
          'sql_sheet',
          `${sheet.id}:${questionNumber}`
        );
      } catch (xpErr) {
        console.error('SQL sheet XP award error:', xpErr);
        xpAwardedNow = 0;
      }
    }

    const nextAttempts = (existing?.attempts || 0) + 1;
    const nextIsSolved = existing?.is_solved ? true : Boolean(isSolved);
    const nextTotalXp = (existing?.xp_awarded || 0) + xpAwardedNow;

    const payload = {
      sheet_id: sheet.id,
      user_id: user.id,
      question_number: questionNumber,
      question_type: questionType,
      is_solved: nextIsSolved,
      is_bookmarked: typeof isBookmarked === 'boolean' ? isBookmarked : Boolean(existing?.is_bookmarked),
      selected_option: selectedOption !== undefined ? selectedOption : existing?.selected_option || null,
      submitted_sql: submittedSql !== undefined ? submittedSql : existing?.submitted_sql || null,
      attempts: nextAttempts,
      xp_awarded: nextTotalXp,
      solved_at: nextIsSolved ? existing?.solved_at || new Date().toISOString() : null,
    };

    const { data: saved, error: upsertErr } = await adminSb
      .from('coding_sheet_sql_progress')
      .upsert(payload, { onConflict: 'sheet_id,user_id,question_number' })
      .select('*')
      .single();

    if (upsertErr) {
      return NextResponse.json({ success: false, error: { message: upsertErr.message } }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: saved,
      xpAwarded: xpAwardedNow,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to save SQL progress' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) {
    return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const sheet = await resolveSheet(supabase, id);
  if (!sheet) {
    return NextResponse.json({ success: false, error: { message: 'Sheet not found' } }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { questionNumber, questionType, isBookmarked } = body as {
      questionNumber?: number;
      questionType?: 'MCQ' | 'QUERY';
      isBookmarked?: boolean;
    };

    if (!questionNumber || !questionType || typeof isBookmarked !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { message: 'questionNumber, questionType, and isBookmarked boolean are required.' } },
        { status: 400 }
      );
    }

    const adminSb = await createAdminClient();
    const { data: existing } = await adminSb
      .from('coding_sheet_sql_progress')
      .select('*')
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
      .eq('question_number', questionNumber)
      .maybeSingle();

    const payload = {
      sheet_id: sheet.id,
      user_id: user.id,
      question_number: questionNumber,
      question_type: questionType,
      is_solved: existing?.is_solved ?? false,
      is_bookmarked: isBookmarked,
      selected_option: existing?.selected_option ?? null,
      submitted_sql: existing?.submitted_sql ?? null,
      attempts: existing?.attempts ?? 0,
      xp_awarded: existing?.xp_awarded ?? 0,
      solved_at: existing?.solved_at ?? null,
    };

    const { data: saved, error } = await adminSb
      .from('coding_sheet_sql_progress')
      .upsert(payload, { onConflict: 'sheet_id,user_id,question_number' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err.message || 'Bookmark update failed' } }, { status: 500 });
  }
}

