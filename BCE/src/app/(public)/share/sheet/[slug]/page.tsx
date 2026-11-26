import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PublicSheetViewer from './PublicSheetViewer';
import SqlSheetDetailClient from '@/features/code-arena/components/sql-sheet/SqlSheetDetailClient';
import RoadmapSheetDetailClient from '@/features/code-arena/components/roadmap/RoadmapSheetDetailClient';
import AptitudeSheetDetailClient from '@/features/code-arena/components/aptitude-sheet/AptitudeSheetDetailClient';
import {
  fetchAllAptitudeQuestions,
  fetchAptitudeChaptersAndProgress,
} from '@/features/code-arena/data/aptitudeSheetTypes';
import TcsPrepSheetDetailClient from '@/features/code-arena/components/tcs-prep/TcsPrepSheetDetailClient';
import {
  fetchAllTcsQuestions,
  fetchTcsPrepCoreData,
} from '@/features/code-arena/data/tcsPrepTypes';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getPublicSheetData(slugOrId: string) {
  const supabase = getSupabaseClient();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

  let query = supabase
    .from('coding_sheets')
    .select('id, slug, is_public, published_at, title, description, created_at, enrollment_access, created_by, attachment_url, attachment_type, youtube_url, sheet_type, metadata, profiles!coding_sheets_created_by_fkey(name, avatar_url, role)');

  if (isUUID) {
    query = query.eq('id', slugOrId);
  } else {
    query = query.eq('slug', slugOrId);
  }

  const { data: sheet, error: sheetError } = await query.maybeSingle();

  // Security Gate: Must be public
  if (sheetError || !sheet || !sheet.is_public) return null;

  let problems: any[] = [];
  let sqlQuestions: any[] = [];
  let roadmapLevels: any[] = [];
  let roadmapProblems: any[] = [];
  let aptitudeChapters: any[] = [];
  let aptitudeQuestions: any[] = [];
  let tcsData: { chapters: any[]; questions: any[]; drills: any[]; mockHeaders: any[] } | null = null;

  if ((sheet as any).sheet_type === 'SQL') {
    const { data: sqlData } = await supabase
      .from('coding_sheet_sql_questions')
      .select('id, question_number, type, section, difficulty, question, options, correct_option, correct_answer, solution_sql, basic_concepts, explanation_points, incorrect_options, step_by_step, clause_breakdown')
      .eq('sheet_id', sheet.id)
      .order('question_number', { ascending: true });
    sqlQuestions = sqlData || [];
  } else if ((sheet as any).sheet_type === 'APTITUDE') {
    const [aptQuestions, { chapters }] = await Promise.all([
      fetchAllAptitudeQuestions(supabase, sheet.id),
      fetchAptitudeChaptersAndProgress(supabase, sheet.id),
    ]);
    aptitudeChapters = chapters;
    aptitudeQuestions = aptQuestions;
  } else if ((sheet as any).sheet_type === 'TCS_PREP') {
    const [tcsQs, core] = await Promise.all([
      fetchAllTcsQuestions(supabase, sheet.id),
      fetchTcsPrepCoreData(supabase, sheet.id),
    ]);
    tcsData = {
      chapters: core.chapters,
      questions: tcsQs,
      drills: core.drills,
      mockHeaders: core.mockHeaders,
    };
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
    // Fetch public problem details
    const { data: problemsData } = await supabase
      .from('coding_sheet_problems')
      .select('order_index, youtube_url, text_solution, coding_problems(id, title, difficulty, source_type, external_platform, external_problem_id, external_url, tags)')
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

  return {
    id: sheet.id,
    slug: sheet.slug || sheet.id,
    title: sheet.title,
    description: sheet.description || '',
    created_by: sheet.created_by,
    created_at: sheet.created_at,
    is_public: sheet.is_public,
    published_at: sheet.published_at,
    enrollment_access: sheet.enrollment_access,
    attachment_url: sheet.attachment_url,
    attachment_type: sheet.attachment_type,
    youtube_url: sheet.youtube_url,
    sheet_type: (sheet as any).sheet_type || 'DSA',
    metadata: (sheet as any).metadata || {},
    creator,
    problems,
    sqlQuestions,
    roadmapLevels,
    roadmapProblems,
    aptitudeChapters,
    aptitudeQuestions,
    tcsData,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sheet = await getPublicSheetData(slug);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smartlearn.in';

  if (!sheet) {
    return {
      title: 'Coding Sheet Not Found | Smart Learn',
      description: 'The requested coding sheet does not exist or is private.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const problemCount =
    sheet.sheet_type === 'SQL'
      ? sheet.sqlQuestions.length
      : sheet.sheet_type === 'APTITUDE'
      ? sheet.aptitudeQuestions.length
      : sheet.sheet_type === 'TCS_PREP'
      ? (sheet.tcsData?.questions.length || 1427)
      : sheet.sheet_type === 'ROADMAP'
      ? sheet.roadmapProblems.length
      : sheet.problems.length;
  const curator = sheet.creator?.name ? ` by ${sheet.creator.name}` : '';
  const title = `${sheet.title} (${problemCount} Problems) | Smart Learn Coding Sheet`;
  const description = sheet.description || `Practice curated coding problems${curator} on Smart Learn Code Arena.`;
  const canonicalUrl = `${baseUrl}/share/sheet/${sheet.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'Smart Learn Code Arena',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function PublicSheetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sheet = await getPublicSheetData(slug);

  if (!sheet) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://smartlearn.in');
  const shareUrl = `${baseUrl}/share/sheet/${sheet.slug || sheet.id}`;

  if (sheet.sheet_type === 'SQL') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #f8fafc)', paddingTop: '12px' }}>
        <SqlSheetDetailClient
          sheet={sheet}
          questions={sheet.sqlQuestions}
          initialProgress={[]}
          isPublicPreview={true}
        />
      </div>
    );
  }

  if (sheet.sheet_type === 'APTITUDE') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #f8fafc)', paddingTop: '12px' }}>
        <AptitudeSheetDetailClient
          sheet={sheet}
          chapters={sheet.aptitudeChapters}
          questions={sheet.aptitudeQuestions}
          initialProgress={[]}
          isPublicPreview={true}
        />
      </div>
    );
  }

  if (sheet.sheet_type === 'TCS_PREP' && sheet.tcsData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #f8fafc)', paddingTop: '12px' }}>
        <TcsPrepSheetDetailClient
          sheet={sheet}
          chapters={sheet.tcsData.chapters}
          questions={sheet.tcsData.questions}
          drills={sheet.tcsData.drills}
          mockHeaders={sheet.tcsData.mockHeaders}
          initialProgress={[]}
          initialMockAttempts={[]}
          isPublicPreview={true}
        />
      </div>
    );
  }

  if (sheet.sheet_type === 'ROADMAP') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #f8fafc)', paddingTop: '12px', paddingInline: '2px' }}>
        <RoadmapSheetDetailClient
          sheet={sheet}
          levels={sheet.roadmapLevels}
          problems={sheet.roadmapProblems}
          initialProgress={[]}
          isPublicPreview={true}
        />
      </div>
    );
  }

  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Public Sheet…</div>}>
      <PublicSheetViewer sheet={sheet} shareUrl={shareUrl} />
    </Suspense>
  );
}
