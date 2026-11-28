import { Suspense, cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getSerializedPublicSheet } from '@/lib/sheet-cache';
import PublicSheetViewer from './PublicSheetViewer';
import SqlSheetDetailClient from '@/features/code-arena/components/sql-sheet/SqlSheetDetailClient';
import RoadmapSheetDetailClient from '@/features/code-arena/components/roadmap/RoadmapSheetDetailClient';
import AptitudeSheetDetailClient from '@/features/code-arena/components/aptitude-sheet/AptitudeSheetDetailClient';
import TcsPrepSheetDetailClient from '@/features/code-arena/components/tcs-prep/TcsPrepSheetDetailClient';

export const revalidate = 180;

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const getPublicSheetMetadata = cache(
  unstable_cache(
    async (slugOrId: string) => {
      const supabase = getSupabaseClient();
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      let query = supabase
        .from('coding_sheets')
        .select('id, slug, is_public, title, description, sheet_type, metadata, profiles!coding_sheets_created_by_fkey(name), coding_sheet_problems(count)');
      query = isUUID ? query.eq('id', slugOrId) : query.eq('slug', slugOrId);
      const { data: sheet, error } = await query.maybeSingle();
      if (error || !sheet || !sheet.is_public) return null;
      return sheet;
    },
    ['public-sheet-meta-v1'],
    { revalidate: 180 }
  )
);

const getPublicSheetData = cache(async (slugOrId: string) => {
  const serialized = await getSerializedPublicSheet(slugOrId);
  return serialized ? serialized.payload : null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sheet: any = await getPublicSheetMetadata(slug);
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
      ? (sheet.metadata?.total_count || 530)
      : sheet.sheet_type === 'APTITUDE'
      ? (sheet.metadata?.total_count || 1139)
      : sheet.sheet_type === 'TCS_PREP'
      ? (sheet.metadata?.total_count || 1427)
      : sheet.sheet_type === 'ROADMAP'
      ? (sheet.metadata?.total_count || 90)
      : (Array.isArray(sheet.coding_sheet_problems) ? (sheet.coding_sheet_problems[0]?.count || 0) : 0);
  const creatorName = Array.isArray(sheet.profiles) ? sheet.profiles[0]?.name : sheet.profiles?.name;
  const curator = creatorName ? ` by ${creatorName}` : '';
  const title = `${sheet.title} (${problemCount} Problems) | Smart Learn Coding Sheet`;
  const description = sheet.description || `Practice curated coding problems${curator} on Smart Learn Code Arena.`;
  const canonicalUrl = `${baseUrl}/share/sheet/${sheet.slug || sheet.id}`;

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
