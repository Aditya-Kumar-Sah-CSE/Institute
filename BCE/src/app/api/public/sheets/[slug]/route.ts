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

    const problems = (problemsData || []).map((p: any) => ({
      ...p.coding_problems,
      order_index: p.order_index,
      youtube_url: p.youtube_url || null,
      text_solution: p.text_solution || null,
    }));

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
        creator,
        problems,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: err?.message || 'Failed to fetch public sheet.' } },
      { status: 500 }
    );
  }
}
