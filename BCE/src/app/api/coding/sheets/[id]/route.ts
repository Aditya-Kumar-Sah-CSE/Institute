import { NextResponse } from 'next/server';
import { getCodeArenaActor } from '@/features/code-arena/server';
import { generateUniqueSheetSlug } from '@/lib/slug-utils';
import { createClient as createRawClient } from '@supabase/supabase-js';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getCodeArenaActor();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // UUID regex check
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Fetch sheet details by ID or slug
  let sheetQuery = supabase
    .from('coding_sheets')
    .select('id, slug, is_public, published_at, title, description, created_by, created_at, enrollment_access');

  if (isUUID) {
    sheetQuery = sheetQuery.eq('id', id);
  } else {
    sheetQuery = sheetQuery.eq('slug', id);
  }

  const { data: sheet, error: sheetError } = await sheetQuery.maybeSingle();

  if (sheetError || !sheet) {
    return NextResponse.json({ success: false, error: { message: sheetError?.message || 'Coding sheet not found.' } }, { status: 404 });
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

    const { data: sheet } = await sheetQuery.maybeSingle();

    if (!sheet) {
      return NextResponse.json({ success: false, error: { message: 'Sheet not found' } }, { status: 404 });
    }

    if (!isInstructor) {
      return NextResponse.json({ success: false, error: { message: 'Forbidden: Only instructors can edit coding sheets.' } }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, problems, enrollment_access, enrollment_passcode, is_public, regenerate_slug, problem_id, youtube_url, text_solution } = body;

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

  const { data: sheet } = await sheetQuery.maybeSingle();
  if (!sheet) {
    return NextResponse.json({ success: false, error: { message: 'Sheet not found' } }, { status: 404 });
  }

  if (!isInstructor) {
    return NextResponse.json({ success: false, error: { message: 'Forbidden: Only instructors can delete coding sheets.' } }, { status: 403 });
  }

  const { error: deleteError } = await serviceRoleClient.from('coding_sheets').delete().eq('id', sheet.id);
  if (deleteError) {
    return NextResponse.json({ success: false, error: { message: deleteError.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
