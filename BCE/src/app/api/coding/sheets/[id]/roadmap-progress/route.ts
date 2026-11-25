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
    .from('coding_sheet_roadmap_progress')
    .select('problem_code, level_number, is_solved, is_revised, is_bookmarked, submitted_code, language, attempts, xp_awarded, solved_at')
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
      problemCode,
      levelNumber = 1,
      isSolved,
      isRevised,
      isBookmarked,
      submittedCode,
      language = 'cpp17',
      incrementAttempts = false,
    } = body as {
      problemCode?: string;
      levelNumber?: number;
      isSolved?: boolean;
      isRevised?: boolean;
      isBookmarked?: boolean;
      submittedCode?: string | null;
      language?: string;
      incrementAttempts?: boolean;
    };

    if (!problemCode || !problemCode.trim()) {
      return NextResponse.json(
        { success: false, error: { message: 'problemCode is required (e.g. L1-001).' } },
        { status: 400 }
      );
    }

    const codeClean = problemCode.trim();
    const adminSb = await createAdminClient();

    const [{ data: existing }, { data: probMeta }] = await Promise.all([
      adminSb
        .from('coding_sheet_roadmap_progress')
        .select('*')
        .eq('sheet_id', sheet.id)
        .eq('user_id', user.id)
        .eq('problem_code', codeClean)
        .maybeSingle(),
      adminSb
        .from('coding_sheet_roadmap_problems')
        .select('id, level_number, difficulty')
        .eq('sheet_id', sheet.id)
        .eq('problem_code', codeClean)
        .maybeSingle(),
    ]);

    const resolvedLevel = Number(probMeta?.level_number || levelNumber || 1);
    const nextIsSolved = typeof isSolved === 'boolean' ? (existing?.is_solved ? true : isSolved) : Boolean(existing?.is_solved);
    const nextIsRevised = typeof isRevised === 'boolean' ? isRevised : Boolean(existing?.is_revised);
    const nextIsBookmarked = typeof isBookmarked === 'boolean' ? isBookmarked : Boolean(existing?.is_bookmarked);
    const nextAttempts = (existing?.attempts || 0) + (incrementAttempts ? 1 : 0);

    // Award XP ONLY the first time this problem is marked solved
    let xpAwardedNow = 0;
    let newProfileXp: number | undefined;
    const shouldAwardXp = Boolean(isSolved) && (!existing || !existing.is_solved || (existing.xp_awarded || 0) === 0);

    if (shouldAwardXp) {
      const diff = (probMeta?.difficulty || 'EASY').toUpperCase();
      xpAwardedNow = diff === 'HARD' ? 30 : diff === 'MEDIUM' ? 20 : 10;
      try {
        // xp_log.source_id is UUID; always pass problem row UUID (fallback to sheet.id UUID)
        const sourceUuid = probMeta?.id || sheet.id;
        const xpResult = await awardXP(
          user.id,
          xpAwardedNow,
          `DSA Roadmap ${codeClean} (${diff})`,
          'roadmap_sheet',
          sourceUuid
        );
        if (xpResult && typeof xpResult.newXP === 'number') {
          newProfileXp = xpResult.newXP;
        }
      } catch (xpErr) {
        console.error('Roadmap sheet XP award error:', xpErr);
        xpAwardedNow = 0;
      }
    }

    const nextTotalXp = (existing?.xp_awarded || 0) + xpAwardedNow;

    const payload = {
      sheet_id: sheet.id,
      user_id: user.id,
      problem_code: codeClean,
      level_number: resolvedLevel,
      is_solved: nextIsSolved,
      is_revised: nextIsRevised,
      is_bookmarked: nextIsBookmarked,
      submitted_code: submittedCode !== undefined ? submittedCode : existing?.submitted_code ?? null,
      language: language || existing?.language || 'cpp17',
      attempts: nextAttempts,
      xp_awarded: nextTotalXp,
      solved_at: nextIsSolved ? existing?.solved_at || new Date().toISOString() : null,
    };

    const { data: saved, error: upsertErr } = await adminSb
      .from('coding_sheet_roadmap_progress')
      .upsert(payload, { onConflict: 'sheet_id,user_id,problem_code' })
      .select('*')
      .single();

    if (upsertErr) {
      return NextResponse.json({ success: false, error: { message: upsertErr.message } }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: saved,
      xpAwarded: xpAwardedNow,
      newProfileXp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { message: err.message || 'Failed to save roadmap progress' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(request, { params });
}

