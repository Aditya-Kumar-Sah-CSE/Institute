import { NextResponse } from 'next/server';
import { canManageSheet, getCodeArenaActor } from '@/features/code-arena/server';
import { generateUniqueSheetSlug } from '@/lib/slug-utils';
import { createClient as createRawClient } from '@supabase/supabase-js';
import {
  fetchAllAptitudeQuestions,
  fetchAptitudeChaptersAndProgress,
} from '@/features/code-arena/data/aptitudeSheetTypes';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // UUID regex check
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Fetch sheet details by ID or slug
  let sheetQuery = supabase
    .from('coding_sheets')
    .select('id, slug, is_public, published_at, title, description, created_by, created_at, enrollment_access, attachment_url, attachment_type, youtube_url, sheet_type, metadata');

  if (isUUID) {
    sheetQuery = sheetQuery.eq('id', id);
  } else {
    sheetQuery = sheetQuery.eq('slug', id);
  }

  const { data: sheet, error: sheetError } = await sheetQuery.maybeSingle();

  if (sheetError || !sheet) {
    return NextResponse.json({ success: false, error: { message: sheetError?.message || 'Coding sheet not found.' } }, { status: 404 });
  }

  if ((sheet as any).sheet_type === 'SQL') {
    const { data: sqlQuestions, error: sqlErr } = await supabase
      .from('coding_sheet_sql_questions')
      .select('id, question_number, type, section, difficulty, question, options, correct_option, correct_answer, solution_sql, basic_concepts, explanation_points, incorrect_options, step_by_step, clause_breakdown')
      .eq('sheet_id', sheet.id)
      .order('question_number', { ascending: true });

    if (sqlErr) {
      return NextResponse.json({ success: false, error: { message: sqlErr.message } }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...sheet,
        problems: [],
        sqlQuestions: sqlQuestions || [],
      },
    });
  }

  if ((sheet as any).sheet_type === 'APTITUDE') {
    const [aptitudeQuestions, { chapters: aptitudeChapters }] = await Promise.all([
      fetchAllAptitudeQuestions(supabase, sheet.id),
      fetchAptitudeChaptersAndProgress(supabase, sheet.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...sheet,
        problems: [],
        aptitudeChapters,
        aptitudeQuestions,
      },
    });
  }

  if ((sheet as any).sheet_type === 'TCS_PREP') {
    const { fetchAllTcsQuestions, fetchTcsPrepCoreData } = await import('@/features/code-arena/data/tcsPrepTypes');
    const [tcsQuestions, core] = await Promise.all([
      fetchAllTcsQuestions(supabase, sheet.id),
      fetchTcsPrepCoreData(supabase, sheet.id, user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...sheet,
        problems: [],
        tcsChapters: core.chapters,
        tcsQuestions,
        tcsDrills: core.drills,
        tcsMockHeaders: core.mockHeaders,
      },
    });
  }

  if ((sheet as any).sheet_type === 'ROADMAP') {
    const [{ data: roadmapLevels, error: lvlErr }, { data: roadmapProblems, error: probErr }] = await Promise.all([
      supabase
        .from('coding_sheet_roadmap_levels')
        .select('id, level_number, title, subtitle, description, target_problem_count, is_unlocked, theory_modules, revision_data, meta')
        .eq('sheet_id', sheet.id)
        .order('level_number', { ascending: true }),
      supabase
        .from('coding_sheet_roadmap_problems')
        .select('id, problem_code, order_index, level_number, batch_name, topic, title, difficulty, company_tags, problem_statement, description, constraints, test_cases, theory, brute_force, optimized, explanation, edge_cases')
        .eq('sheet_id', sheet.id)
        .order('order_index', { ascending: true }),
    ]);

    if (lvlErr || probErr) {
      return NextResponse.json(
        { success: false, error: { message: lvlErr?.message || probErr?.message || 'Failed to load roadmap data' } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...sheet,
        problems: [],
        roadmapLevels: roadmapLevels || [],
        roadmapProblems: roadmapProblems || [],
      },
    });
  }

  // Fetch linked problems with metadata
  const { data: problemsData, error: problemsError } = await supabase
    .from('coding_sheet_problems')
    .select('order_index, youtube_url, text_solution, coding_problems(id, title, difficulty, source_type, external_platform, external_problem_id, external_url, tags)')
    .eq('sheet_id', sheet.id)
    .order('order_index', { ascending: true });

  if (problemsError) {
    return NextResponse.json({ success: false, error: { message: problemsError.message } }, { status: 400 });
  }

  const problems = (problemsData || []).map((p: any) => ({
    ...p.coding_problems,
    order_index: p.order_index,
    youtube_url: p.youtube_url || null,
    text_solution: p.text_solution || null,
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

  const serviceRoleClient = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let sheetQuery = serviceRoleClient
      .from('coding_sheets')
      .select('id, created_by, title, slug, is_public, published_at');

    if (isUUID) {
      sheetQuery = sheetQuery.eq('id', id);
    } else {
      sheetQuery = sheetQuery.eq('slug', id);
    }

    const { data: sheet, error: sheetError } = await sheetQuery.maybeSingle();

    if (sheetError) {
      return NextResponse.json({ success: false, error: { message: `DB error: ${sheetError.message}` } }, { status: 500 });
    }

    if (!sheet) {
      return NextResponse.json({ success: false, error: { message: `Sheet not found (id parameter: "${id}")` } }, { status: 404 });
    }

    if (!canManageSheet({ user, isInstructor }, sheet.created_by)) {
      return NextResponse.json({ success: false, error: { message: 'Forbidden: Only instructors or sheet creators can edit coding sheets.' } }, { status: 403 });
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      problems, 
      enrollment_access, 
      enrollment_passcode, 
      is_public, 
      regenerate_slug, 
      problem_id, 
      youtube_url, 
      text_solution,
      attachment_url,
      attachment_type,
      editTarget,
      questionData,
    } = body;

    // Handle question / drill / problem content updates across all 5 sheet types
    if (editTarget && questionData && typeof questionData === 'object') {
      if (editTarget === 'tcs_question') {
        const qNum = Number(questionData.question_number);
        if (!Number.isFinite(qNum)) {
          return NextResponse.json({ success: false, error: { message: 'Invalid question_number' } }, { status: 400 });
        }
        const optKey = String(questionData.correct_option || 'A').toUpperCase();
        const opts = questionData.options && typeof questionData.options === 'object' ? questionData.options : undefined;
        const { error: qErr } = await serviceRoleClient
          .from('coding_sheet_tcs_questions')
          .update({
            question: questionData.question,
            options: opts,
            correct_option: optKey,
            correct_answer: opts && opts[optKey] !== undefined ? String(opts[optKey]) : questionData.correct_answer,
            difficulty: questionData.difficulty,
            level_label: questionData.level_label,
            chapter_title: questionData.chapter_title,
            explanation: questionData.explanation ?? '',
            image_url: questionData.image_url !== undefined ? (questionData.image_url || null) : undefined,
          })
          .eq('sheet_id', sheet.id)
          .eq('question_number', qNum);
        if (qErr) return NextResponse.json({ success: false, error: { message: qErr.message } }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      if (editTarget === 'tcs_drill') {
        const drillCode = String(questionData.drill_code || '').trim();
        if (!drillCode) {
          return NextResponse.json({ success: false, error: { message: 'Invalid drill_code' } }, { status: 400 });
        }
        const { error: qErr } = await serviceRoleClient
          .from('coding_sheet_tcs_drills')
          .update({
            title: questionData.title,
            difficulty: questionData.difficulty,
            prompt: questionData.prompt,
            hint: questionData.hint ?? '',
            solution_text: questionData.solution_text ?? '',
            solution_code: questionData.solution_code !== undefined ? questionData.solution_code : undefined,
          })
          .eq('sheet_id', sheet.id)
          .eq('drill_code', drillCode);
        if (qErr) return NextResponse.json({ success: false, error: { message: qErr.message } }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      if (editTarget === 'aptitude_question') {
        const qNum = Number(questionData.question_number);
        if (!Number.isFinite(qNum)) {
          return NextResponse.json({ success: false, error: { message: 'Invalid question_number' } }, { status: 400 });
        }
        const optKey = String(questionData.correct_option || 'A').toUpperCase();
        const opts = questionData.options && typeof questionData.options === 'object' ? questionData.options : undefined;
        const { error: qErr } = await serviceRoleClient
          .from('coding_sheet_aptitude_questions')
          .update({
            question: questionData.question,
            options: opts,
            correct_option: optKey,
            correct_answer: opts && opts[optKey] !== undefined ? String(opts[optKey]) : questionData.correct_answer,
            difficulty: questionData.difficulty,
            level_label: questionData.level_label,
            chapter_title: questionData.chapter_title,
            explanation: questionData.explanation ?? '',
          })
          .eq('sheet_id', sheet.id)
          .eq('question_number', qNum);
        if (qErr) return NextResponse.json({ success: false, error: { message: qErr.message } }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      if (editTarget === 'sql_question') {
        const qNum = Number(questionData.question_number);
        if (!Number.isFinite(qNum)) {
          return NextResponse.json({ success: false, error: { message: 'Invalid question_number' } }, { status: 400 });
        }
        const { error: qErr } = await serviceRoleClient
          .from('coding_sheet_sql_questions')
          .update({
            question: questionData.question,
            section: questionData.section,
            difficulty: questionData.difficulty,
            options: questionData.options !== undefined ? questionData.options : undefined,
            correct_option: questionData.correct_option !== undefined ? questionData.correct_option : undefined,
            correct_answer: questionData.correct_answer !== undefined ? questionData.correct_answer : undefined,
            solution_sql: questionData.solution_sql !== undefined ? questionData.solution_sql : undefined,
            explanation_points: Array.isArray(questionData.explanation_points) ? questionData.explanation_points : undefined,
          })
          .eq('sheet_id', sheet.id)
          .eq('question_number', qNum);
        if (qErr) return NextResponse.json({ success: false, error: { message: qErr.message } }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      if (editTarget === 'roadmap_problem') {
        const code = String(questionData.problem_code || '').trim();
        if (!code) {
          return NextResponse.json({ success: false, error: { message: 'Invalid problem_code' } }, { status: 400 });
        }
        const { error: qErr } = await serviceRoleClient
          .from('coding_sheet_roadmap_problems')
          .update({
            title: questionData.title,
            difficulty: questionData.difficulty,
            topic: questionData.topic,
            problem_statement: questionData.problem_statement,
            description: questionData.description ?? '',
            theory: questionData.theory ?? '',
            explanation: questionData.explanation ?? '',
          })
          .eq('sheet_id', sheet.id)
          .eq('problem_code', code);
        if (qErr) return NextResponse.json({ success: false, error: { message: qErr.message } }, { status: 400 });
        return NextResponse.json({ success: true });
      }

      if (editTarget === 'dsa_problem') {
        const pId = String(questionData.id || '').trim();
        if (!pId) {
          return NextResponse.json({ success: false, error: { message: 'Invalid problem id' } }, { status: 400 });
        }
        if (questionData.title !== undefined || questionData.difficulty !== undefined) {
          const probUpdates: Record<string, any> = {};
          if (questionData.title !== undefined) probUpdates.title = String(questionData.title).trim();
          if (questionData.difficulty !== undefined) probUpdates.difficulty = String(questionData.difficulty);
          const { error: pErr } = await serviceRoleClient
            .from('coding_problems')
            .update(probUpdates)
            .eq('id', pId);
          if (pErr) return NextResponse.json({ success: false, error: { message: pErr.message } }, { status: 400 });
        }
        if (questionData.text_solution !== undefined || questionData.youtube_url !== undefined) {
          const linkUpdates: Record<string, any> = {};
          if (questionData.text_solution !== undefined) linkUpdates.text_solution = questionData.text_solution || null;
          if (questionData.youtube_url !== undefined) linkUpdates.youtube_url = questionData.youtube_url || null;
          const { error: lErr } = await serviceRoleClient
            .from('coding_sheet_problems')
            .update(linkUpdates)
            .eq('sheet_id', sheet.id)
            .eq('problem_id', pId);
          if (lErr) return NextResponse.json({ success: false, error: { message: lErr.message } }, { status: 400 });
        }
        return NextResponse.json({ success: true });
      }
    }

    // Handle single problem's YT video and text solution update
    if (problem_id !== undefined) {
      const { error: updateProblemError } = await serviceRoleClient
        .from('coding_sheet_problems')
        .update({
          youtube_url: youtube_url !== undefined ? (youtube_url ? youtube_url.trim() : null) : undefined,
          text_solution: text_solution !== undefined ? (text_solution ? text_solution.trim() : null) : undefined,
        })
        .eq('sheet_id', sheet.id)
        .eq('problem_id', problem_id);

      if (updateProblemError) {
        return NextResponse.json({ success: false, error: { message: updateProblemError.message } }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    const updates: any = {};
    if (title !== undefined && title.trim() !== sheet.title) {
      updates.title = title.trim();
      // Important SDE Rule: Only regenerate slug if slug is currently missing or explicitly requested via regenerate_slug
      if (!sheet.slug || regenerate_slug) {
        updates.slug = await generateUniqueSheetSlug(serviceRoleClient, title.trim(), sheet.id);
      }
    } else if (regenerate_slug && sheet.title) {
      updates.slug = await generateUniqueSheetSlug(serviceRoleClient, sheet.title, sheet.id);
    }

    if (description !== undefined) updates.description = description || null;
    
    if (youtube_url !== undefined && problem_id === undefined) {
      updates.youtube_url = youtube_url ? youtube_url.trim() : null;
    }
    if (attachment_url !== undefined) {
      updates.attachment_url = attachment_url || null;
    }
    if (attachment_type !== undefined) {
      updates.attachment_type = attachment_type || null;
    }
    
    if (is_public !== undefined) {
      const isPublicBool = Boolean(is_public);
      updates.is_public = isPublicBool;
      if (isPublicBool && !sheet.published_at) {
        updates.published_at = new Date().toISOString();
      }
    }

    if (enrollment_access !== undefined) {
      const validAccess = ['public', 'restricted', 'private'];
      if (validAccess.includes(enrollment_access)) {
        updates.enrollment_access = enrollment_access;
        updates.enrollment_passcode = enrollment_access === 'restricted' ? (enrollment_passcode || null) : null;
      }
    } else if (enrollment_passcode !== undefined) {
      updates.enrollment_passcode = enrollment_passcode || null;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await serviceRoleClient
        .from('coding_sheets')
        .update(updates)
        .eq('id', sheet.id);

      if (updateError) {
        return NextResponse.json({ success: false, error: { message: updateError.message } }, { status: 400 });
      }
    }

    if (problems !== undefined && Array.isArray(problems)) {
      // 1. Fetch existing problem links to preserve youtube_url and text_solution
      const { data: existingLinks } = await serviceRoleClient
        .from('coding_sheet_problems')
        .select('problem_id, youtube_url, text_solution')
        .eq('sheet_id', sheet.id);

      const linksMap = new Map();
      (existingLinks || []).forEach(l => {
        linksMap.set(l.problem_id, { youtube_url: l.youtube_url, text_solution: l.text_solution });
      });

      // 2. Re-link problems
      await serviceRoleClient.from('coding_sheet_problems').delete().eq('sheet_id', sheet.id);

      if (problems.length > 0) {
        const problemLinks = problems.map((pId: string, idx: number) => {
          const existing = linksMap.get(pId) || {};
          return {
            sheet_id: sheet.id,
            problem_id: pId,
            order_index: idx,
            youtube_url: existing.youtube_url || null,
            text_solution: existing.text_solution || null,
          };
        });
        const { error: linkError } = await serviceRoleClient.from('coding_sheet_problems').insert(problemLinks);
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

  const serviceRoleClient = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  let sheetQuery = serviceRoleClient.from('coding_sheets').select('id, created_by');
  if (isUUID) {
    sheetQuery = sheetQuery.eq('id', id);
  } else {
    sheetQuery = sheetQuery.eq('slug', id);
  }

  const { data: sheet, error: sheetError } = await sheetQuery.maybeSingle();
  if (sheetError) {
    return NextResponse.json({ success: false, error: { message: `DB error: ${sheetError.message}` } }, { status: 500 });
  }
  if (!sheet) {
    return NextResponse.json({ success: false, error: { message: `Sheet not found (id parameter: "${id}")` } }, { status: 404 });
  }

  if (!canManageSheet({ user, isInstructor }, sheet.created_by)) {
    return NextResponse.json({ success: false, error: { message: 'Forbidden: Only instructors or sheet creators can delete coding sheets.' } }, { status: 403 });
  }

  const { error: deleteError } = await serviceRoleClient.from('coding_sheets').delete().eq('id', sheet.id);
  if (deleteError) {
    return NextResponse.json({ success: false, error: { message: deleteError.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
