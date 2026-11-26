import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { createAdminClient } from '@/lib/supabase/server';
import { awardXP } from '@/features/auth/actions/auth';
import {
  evaluateTcsMockSubmission,
  type TcsMockPaperFull,
  type TcsMockResponseEntry,
} from '@/features/code-arena/data/tcsPrepTypes';

async function resolveSheet(supabase: any, idOrSlug: string) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const query = supabase.from('coding_sheets').select('id, slug, title, sheet_type, is_public');
  const { data } = await (isUUID ? query.eq('id', idOrSlug) : query.eq('slug', idOrSlug)).maybeSingle();
  return data;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  const sheet = await resolveSheet(supabase, id);

  if (!sheet) {
    return NextResponse.json({ success: false, error: { message: 'Sheet not found' } }, { status: 404 });
  }

  const url = new URL(request.url);
  const paperParam = url.searchParams.get('paper');
  const paperNum = paperParam ? parseInt(paperParam, 10) : null;

  if (paperNum && !Number.isNaN(paperNum)) {
    const { data: paper, error } = await supabase
      .from('coding_sheet_tcs_mocks')
      .select('id, paper_number, title, total_minutes, total_items, sections, items')
      .eq('sheet_id', sheet.id)
      .eq('paper_number', paperNum)
      .maybeSingle();

    if (error || !paper) {
      return NextResponse.json({ success: false, error: { message: 'Mock paper not found' } }, { status: 404 });
    }

    let attempts: any[] = [];
    if (user) {
      const { data: attData } = await supabase
        .from('coding_sheet_tcs_mock_attempts')
        .select('*')
        .eq('sheet_id', sheet.id)
        .eq('user_id', user.id)
        .eq('paper_number', paperNum)
        .order('completed_at', { ascending: false });
      attempts = attData || [];
    }

    return NextResponse.json({ success: true, paper, attempts });
  }

  const { data: papers } = await supabase
    .from('coding_sheet_tcs_mocks')
    .select('id, paper_number, title, total_minutes, total_items, sections')
    .eq('sheet_id', sheet.id)
    .order('paper_number', { ascending: true });

  return NextResponse.json({ success: true, papers: papers || [] });
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
      paperNumber,
      mode = 'EXAM',
      responses = {},
      sectionTimesSec = {},
    } = body as {
      paperNumber?: number;
      mode?: 'EXAM' | 'PRACTICE';
      responses?: Record<number, TcsMockResponseEntry>;
      sectionTimesSec?: Record<string, number>;
    };

    if (!paperNumber || paperNumber < 1 || paperNumber > 20) {
      return NextResponse.json(
        { success: false, error: { message: 'Valid paperNumber is required.' } },
        { status: 400 }
      );
    }

    const adminSb = await createAdminClient();
    const { data: paper, error: pErr } = await adminSb
      .from('coding_sheet_tcs_mocks')
      .select('id, paper_number, title, total_minutes, total_items, sections, items')
      .eq('sheet_id', sheet.id)
      .eq('paper_number', paperNumber)
      .maybeSingle();

    if (pErr || !paper) {
      return NextResponse.json({ success: false, error: { message: 'Mock paper not found' } }, { status: 404 });
    }

    const fullPaper = paper as TcsMockPaperFull;
    const evaluation = evaluateTcsMockSubmission(fullPaper, responses, sectionTimesSec);

    const { count: priorAttemptsForPaper } = await adminSb
      .from('coding_sheet_tcs_mock_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('sheet_id', sheet.id)
      .eq('user_id', user.id)
      .eq('paper_number', paperNumber);

    // Award meaningful XP on first completion of a mock paper (+15 base + accuracy bonus, capped at +60)
    let xpAwardedNow = 0;
    if ((priorAttemptsForPaper || 0) === 0 && (evaluation.mcqCorrect + evaluation.codingSolved > 0 || evaluation.writingScore > 0)) {
      xpAwardedNow = Math.min(
        60,
        15 + Math.floor(evaluation.mcqCorrect / 3) + evaluation.codingSolved * 10
      );
      try {
        await awardXP(
          user.id,
          xpAwardedNow,
          `TCS Pattern Mock Paper ${paperNumber} (${Math.round(evaluation.totalScore)}/${evaluation.maxScore})`,
          'tcs_prep_mock',
          paper.id
        );
      } catch (xpErr) {
        console.error('Mock XP award failed:', xpErr);
        xpAwardedNow = 0;
      }
    }

    const insertPayload = {
      sheet_id: sheet.id,
      user_id: user.id,
      paper_number: paperNumber,
      mode: mode === 'PRACTICE' ? 'PRACTICE' : 'EXAM',
      total_score: evaluation.totalScore,
      max_score: evaluation.maxScore,
      mcq_correct: evaluation.mcqCorrect,
      mcq_wrong: evaluation.mcqWrong,
      mcq_unattempted: evaluation.mcqUnattempted,
      writing_score: evaluation.writingScore,
      coding_solved: evaluation.codingSolved,
      accuracy_pct: evaluation.accuracyPct,
      total_time_sec: evaluation.totalTimeSec,
      section_stats: evaluation.sectionStats,
      topic_stats: evaluation.topicStats,
      responses,
      xp_awarded: xpAwardedNow,
    };

    const { data: attempt, error: insErr } = await adminSb
      .from('coding_sheet_tcs_mock_attempts')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insErr) {
      return NextResponse.json({ success: false, error: { message: insErr.message } }, { status: 500 });
    }

    await adminSb
      .from('coding_sheet_enrollments')
      .upsert({ sheet_id: sheet.id, user_id: user.id }, { onConflict: 'sheet_id,user_id' });

    return NextResponse.json({
      success: true,
      attempt,
      paper: fullPaper,
      xpAwarded: xpAwardedNow,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { message: err?.message || 'Mock submission failed' } }, { status: 500 });
  }
}

