import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAnonSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Coding sheet not found.' } },
        { status: 404 }
      );
    }

    const supabase = getAnonSupabaseClient();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    let query = supabase
      .from('coding_sheets')
      .select(`
        id, 
        slug, 
        title, 
        description, 
        created_at, 
        is_public, 
        published_at, 
        enrollment_access, 
        sheet_type,
        metadata,
        created_by, 
        profiles!coding_sheets_created_by_fkey(name, avatar_url, role)
      `);

    if (isUUID) {
      query = query.eq('id', slug);
    } else {
      query = query.eq('slug', slug);
    }

    const { data: sheet, error: sheetError } = await query.maybeSingle();

    // Security Gate: Must exist and be public
    if (sheetError || !sheet || !sheet.is_public) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Coding sheet not found or is private.' } },
        { status: 404 }
      );
    }

    let problems: any[] = [];
    let sqlQuestions: any[] = [];
    let roadmapLevels: any[] = [];
    let roadmapProblems: any[] = [];
    let aptitudeChapters: any[] = [];
    let aptitudeQuestions: any[] = [];

    if ((sheet as any).sheet_type === 'SQL') {
      const { data: sqlData } = await supabase
        .from('coding_sheet_sql_questions')
        .select('id, question_number, type, section, difficulty, question, options, correct_option, correct_answer, solution_sql, basic_concepts, explanation_points, incorrect_options, step_by_step, clause_breakdown')
        .eq('sheet_id', sheet.id)
        .order('question_number', { ascending: true });
      sqlQuestions = sqlData || [];
    } else if ((sheet as any).sheet_type === 'APTITUDE') {
      const { fetchAllAptitudeQuestions, fetchAptitudeChaptersAndProgress } = await import(
        '@/features/code-arena/data/aptitudeSheetTypes'
      );
      const [aptQs, { chapters }] = await Promise.all([
        fetchAllAptitudeQuestions(supabase, sheet.id),
        fetchAptitudeChaptersAndProgress(supabase, sheet.id),
      ]);
      aptitudeChapters = chapters;
      aptitudeQuestions = aptQs;
    } else if ((sheet as any).sheet_type === 'ROADMAP') {
      const [{ data: lvlData }, { data: probData }] = await Promise.all([
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
      roadmapLevels = lvlData || [];
      roadmapProblems = probData || [];
    } else {
      // Fetch public problem list
      const { data: problemsData } = await supabase
        .from('coding_sheet_problems')
        .select(`
          order_index, 
          youtube_url, 
          text_solution, 
          coding_problems(id, title, difficulty, source_type, external_platform, external_problem_id, external_url, tags)
        `)
        .eq('sheet_id', sheet.id)
        .order('order_index', { ascending: true });

      problems = (problemsData || []).map((p: any) => ({
        ...p.coding_problems,
        order_index: p.order_index,
        youtube_url: p.youtube_url || null,
        text_solution: p.text_solution || null,
      }));
    }

    const creator = (sheet as any).profiles
      ? {
          name: (sheet as any).profiles.name,
          avatar_url: (sheet as any).profiles.avatar_url,
          role: (sheet as any).profiles.role,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        id: sheet.id,
        slug: sheet.slug || sheet.id,
        title: sheet.title,
        description: sheet.description || '',
        created_at: sheet.created_at,
        is_public: sheet.is_public,
        published_at: sheet.published_at,
        enrollment_access: sheet.enrollment_access,
        sheet_type: (sheet as any).sheet_type || 'DSA',
        metadata: (sheet as any).metadata || {},
        creator,
        problems,
        sqlQuestions,
        roadmapLevels,
        roadmapProblems,
        aptitudeChapters,
        aptitudeQuestions,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err?.message || 'Failed to fetch public sheet.' } },
      { status: 500 }
    );
  }
}
