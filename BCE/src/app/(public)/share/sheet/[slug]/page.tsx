import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PublicSheetViewer from './PublicSheetViewer';

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
    .select('id, slug, is_public, published_at, title, description, created_at, enrollment_access, created_by, profiles!coding_sheets_created_by_fkey(name, avatar_url, role)');

  if (isUUID) {
    query = query.eq('id', slugOrId);
  } else {
    query = query.eq('slug', slugOrId);
  }

  const { data: sheet, error: sheetError } = await query.maybeSingle();

  // Security Gate: Must be public
  if (sheetError || !sheet || !sheet.is_public) return null;

  // Fetch public problem details
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
    is_public: sheet.is_public,
    published_at: sheet.published_at,
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

  const problemCount = sheet.problems.length;
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

  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Public Sheet…</div>}>
      <PublicSheetViewer sheet={sheet} shareUrl={shareUrl} />
    </Suspense>
  );
}
