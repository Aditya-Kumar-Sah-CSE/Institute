import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PublicSheetViewer from './PublicSheetViewer';

// Use anon client for fetching public sheet data
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
    .select('id, slug, title, description, created_at, enrollment_access, created_by, profiles!coding_sheets_created_by_fkey(name, avatar_url, role)');

  if (isUUID) {
    query = query.eq('id', slugOrId);
  } else {
    query = query.eq('slug', slugOrId);
  }

  const { data: sheet, error: sheetError } = await query.maybeSingle();
  if (sheetError || !sheet) return null;

  // Fetch problems
  const { data: problemsData } = await supabase
    .from('coding_sheet_problems')
    .select('order_index, youtube_url, text_solution, coding_problems(id, title, difficulty, source_type, external_platform, external_problem_id, external_url, tags)')
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

  return {
    id: sheet.id,
    slug: sheet.slug || sheet.id,
    title: sheet.title,
    description: sheet.description || '',
    created_at: sheet.created_at,
    enrollment_access: sheet.enrollment_access,
    creator,
    problems,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sheet = await getPublicSheetData(slug);

  if (!sheet) {
    return {
      title: 'Coding Sheet Not Found | Code Arena',
      description: 'The requested coding sheet does not exist or has been removed.',
    };
  }

  const problemCount = sheet.problems.length;
  const curator = sheet.creator?.name ? ` by ${sheet.creator.name}` : '';
  const title = `${sheet.title} (${problemCount} Problems) | Code Arena Practice Sheet`;
  const description = sheet.description || `Practice curated coding problems${curator} on Code Arena.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Code Arena',
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

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://smartlearn.in'}/share/sheet/${sheet.slug || sheet.id}`;

  return <PublicSheetViewer sheet={sheet} shareUrl={shareUrl} />;
}
