import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';
import { awardXP } from '@/features/auth/actions/auth';

async function resolveSheet(supabase: any, idOrSlug: string) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const query = supabase.from('coding_sheets').select('id, slug, title, sheet_type');
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

  const PAGE = 1000;
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('coding_sheet_aptitude_progress')
      .select('question_number, is_solved, is_bookmarked, selected_option, attempts, xp_awarded, solved_at')
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
      .order('question_number', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  return NextResponse.json({ success: true, data: rows });
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
      isSolved = true,
      selectedOption = null,
      isBookmarked,
    } = body as {
      questionNumber?: number;
      isSolved?: boolean;
      selectedOption?: string | null;
      isBookmarked?: boolean;
    };

    if (!questionNumber || questionNumber < 1) {
      return NextResponse.json(
        { success: false, error: { message: 'Valid questionNumber is required.' } },
        { status: 400 }
      );
    }

    const adminSb = await createAdminClient();
    const { data: existing } = await adminSb
      .from('coding_sheet_aptitude_progress')
      .select('*')
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
      .eq('question_number', questionNumber)
      .maybeSingle();

    let xpAwardedNow = 0;
    let newProfileXp: number | undefined;
    const shouldAwardXp = isSolved && (!existing || !existing.is_solved || (existing.xp_awarded || 0) === 0);

    if (shouldAwardXp) {
      const { data: qMeta } = await adminSb
        .from('coding_sheet_aptitude_questions')
        .select('id, difficulty, chapter_number')
        .eq('sheet_id', sheet.id)
        .eq('question_number', questionNumber)
        .maybeSingle();

      const diff = (qMeta?.difficulty || 'EASY').toUpperCase();
      xpAwardedNow = diff === 'HARD' ? 8 : diff === 'MEDIUM' ? 5 : 3;

      try {
        const sourceUuid = qMeta?.id || sheet.id;
        const xpResult = await awardXP(
          user.id,
          xpAwardedNow,
          `Placement Aptitude Q${questionNumber} (Ch ${qMeta?.chapter_number || ''})`,
          'aptitude_sheet',
          sourceUuid
        );
        if (xpResult && typeof xpResult.newXP === 'number') {
          newProfileXp = xpResult.newXP;
        }
      } catch (xpErr) {
        console.error('Aptitude XP award error:', xpErr);
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
      is_solved: nextIsSolved,
      is_bookmarked: typeof isBookmarked === 'boolean' ? isBookmarked : Boolean(existing?.is_bookmarked),
      selected_option: selectedOption !== undefined ? selectedOption : existing?.selected_option || null,
      attempts: nextAttempts,
      xp_awarded: nextTotalXp,
      solved_at: nextIsSolved ? existing?.solved_at || new Date().toISOString() : null,
    };

    const { data: saved, error: upsertErr } = await adminSb
      .from('coding_sheet_aptitude_progress')
      .upsert(payload, { onConflict: 'sheet_id,user_id,question_number' })
      .select()
      .single();

    if (upsertErr) {
      return NextResponse.json({ success: false, error: { message: upsertErr.message } }, { status: 500 });
    }

    // Auto-enroll user if they practiced directly
    await adminSb
      .from('coding_sheet_enrollments')
      .upsert({ sheet_id: sheet.id, user_id: user.id }, { onConflict: 'sheet_id,user_id' });

    return NextResponse.json({
      success: true,
      data: saved,
      xpAwarded: xpAwardedNow,
      newProfileXp,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err?.message || 'Failed to save progress' } }, { status: 500 });
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
    const { questionNumber, isBookmarked } = body as {
      questionNumber?: number;
      isBookmarked?: boolean;
    };

    if (!questionNumber || typeof isBookmarked !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { message: 'questionNumber and boolean isBookmarked are required.' } },
        { status: 400 }
      );
    }

    const adminSb = await createAdminClient();
    const { data: existing } = await adminSb
      .from('coding_sheet_aptitude_progress')
      .select('*')
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
      .eq('question_number', questionNumber)
      .maybeSingle();

    const payload = {
      sheet_id: sheet.id,
      user_id: user.id,
      question_number: questionNumber,
      is_solved: existing?.is_solved ?? false,
      is_bookmarked: isBookmarked,
      selected_option: existing?.selected_option ?? null,
      attempts: existing?.attempts ?? 0,
      xp_awarded: existing?.xp_awarded ?? 0,
      solved_at: existing?.solved_at ?? null,
    };

    const { data: saved, error } = await adminSb
      .from('coding_sheet_aptitude_progress')
      .upsert(payload, { onConflict: 'sheet_id,user_id,question_number' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err?.message || 'Bookmark toggle failed' } }, { status: 500 });
  }
}

