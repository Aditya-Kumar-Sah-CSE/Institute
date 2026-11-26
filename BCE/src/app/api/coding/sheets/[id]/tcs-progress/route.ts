import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';
import { awardXP } from '@/features/auth/actions/auth';
import type { TcsDrillType } from '@/features/code-arena/data/tcsPrepTypes';

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
      .from('coding_sheet_tcs_progress')
      .select('item_key, item_type, is_solved, is_bookmarked, selected_option, submitted_text, submitted_code, attempts, xp_awarded, solved_at')
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
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
      itemKey,
      itemType,
      isSolved = true,
      selectedOption,
      submittedText,
      submittedCode,
      isBookmarked,
    } = body as {
      itemKey?: string;
      itemType?: 'MCQ' | TcsDrillType;
      isSolved?: boolean;
      selectedOption?: string | null;
      submittedText?: string | null;
      submittedCode?: string | null;
      isBookmarked?: boolean;
    };

    if (!itemKey || !itemType) {
      return NextResponse.json(
        { success: false, error: { message: 'itemKey and itemType are required.' } },
        { status: 400 }
      );
    }

    const adminSb = await createAdminClient();
    const { data: existing } = await adminSb
      .from('coding_sheet_tcs_progress')
      .select('*')
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
      .eq('item_key', itemKey)
      .maybeSingle();

    let xpAwardedNow = 0;
    let newProfileXp: number | undefined;
    const shouldAwardXp = isSolved && (!existing || !existing.is_solved || (existing.xp_awarded || 0) === 0);

    if (shouldAwardXp) {
      let sourceUuid = sheet.id;
      let label = `TCS Prep ${itemKey}`;

      if (itemType === 'MCQ') {
        const qNum = Number(itemKey.replace(/^MCQ-/, ''));
        const { data: qMeta } = await adminSb
          .from('coding_sheet_tcs_questions')
          .select('id, difficulty, chapter_number')
          .eq('sheet_id', sheet.id)
          .eq('question_number', qNum)
          .maybeSingle();
        if (qMeta?.id) sourceUuid = qMeta.id;
        const diff = (qMeta?.difficulty || 'EASY').toUpperCase();
        xpAwardedNow = diff === 'HARD' ? 8 : diff === 'MEDIUM' ? 5 : 3;
        label = `TCS Prep Q${qNum} (Ch ${qMeta?.chapter_number || ''})`;
      } else {
        const { data: dMeta } = await adminSb
          .from('coding_sheet_tcs_drills')
          .select('id, difficulty, title')
          .eq('sheet_id', sheet.id)
          .eq('drill_code', itemKey)
          .maybeSingle();
        if (dMeta?.id) sourceUuid = dMeta.id;
        const diff = (dMeta?.difficulty || 'MEDIUM').toUpperCase();
        xpAwardedNow =
          itemType === 'CODING'
            ? diff === 'HARD'
              ? 20
              : diff === 'MEDIUM'
              ? 15
              : 10
            : itemType === 'EMAIL_WRITING'
            ? 10
            : 8;
        label = `TCS Prep ${dMeta?.title || itemKey}`;
      }

      try {
        const xpResult = await awardXP(user.id, xpAwardedNow, label, 'tcs_prep_sheet', sourceUuid);
        if (xpResult && typeof xpResult.newXP === 'number') {
          newProfileXp = xpResult.newXP;
        }
      } catch (xpErr) {
        console.error('TCS Prep XP error:', xpErr);
        xpAwardedNow = 0;
      }
    }

    const nextIsSolved = existing?.is_solved ? true : Boolean(isSolved);
    const payload = {
      sheet_id: sheet.id,
      user_id: user.id,
      item_key: itemKey,
      item_type: itemType,
      is_solved: nextIsSolved,
      is_bookmarked: typeof isBookmarked === 'boolean' ? isBookmarked : Boolean(existing?.is_bookmarked),
      selected_option: selectedOption !== undefined ? selectedOption : existing?.selected_option ?? null,
      submitted_text: submittedText !== undefined ? submittedText : existing?.submitted_text ?? null,
      submitted_code: submittedCode !== undefined ? submittedCode : existing?.submitted_code ?? null,
      attempts: (existing?.attempts || 0) + 1,
      xp_awarded: (existing?.xp_awarded || 0) + xpAwardedNow,
      solved_at: nextIsSolved ? existing?.solved_at || new Date().toISOString() : null,
    };

    const { data: saved, error: upsertErr } = await adminSb
      .from('coding_sheet_tcs_progress')
      .upsert(payload, { onConflict: 'sheet_id,user_id,item_key' })
      .select()
      .single();

    if (upsertErr) {
      return NextResponse.json({ success: false, error: { message: upsertErr.message } }, { status: 500 });
    }

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
    return NextResponse.json({ success: false, error: { message: err?.message || 'Save failed' } }, { status: 500 });
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
    const { itemKey, itemType = 'MCQ', isBookmarked } = body as {
      itemKey?: string;
      itemType?: 'MCQ' | TcsDrillType;
      isBookmarked?: boolean;
    };

    if (!itemKey || typeof isBookmarked !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { message: 'itemKey and boolean isBookmarked are required.' } },
        { status: 400 }
      );
    }

    const adminSb = await createAdminClient();
    const { data: existing } = await adminSb
      .from('coding_sheet_tcs_progress')
      .select('*')
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
      .eq('item_key', itemKey)
      .maybeSingle();

    const payload = {
      sheet_id: sheet.id,
      user_id: user.id,
      item_key: itemKey,
      item_type: existing?.item_type || itemType,
      is_solved: existing?.is_solved ?? false,
      is_bookmarked: isBookmarked,
      selected_option: existing?.selected_option ?? null,
      submitted_text: existing?.submitted_text ?? null,
      submitted_code: existing?.submitted_code ?? null,
      attempts: existing?.attempts ?? 0,
      xp_awarded: existing?.xp_awarded ?? 0,
      solved_at: existing?.solved_at ?? null,
    };

    const { data: saved, error } = await adminSb
      .from('coding_sheet_tcs_progress')
      .upsert(payload, { onConflict: 'sheet_id,user_id,item_key' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err?.message || 'Bookmark failed' } }, { status: 500 });
  }
}

