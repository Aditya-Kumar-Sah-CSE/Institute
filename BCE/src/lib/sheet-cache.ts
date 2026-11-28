import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { unstable_cache, revalidateTag } from 'next/cache';
import { gzipSync } from 'node:zlib';

const MEM_CACHE_MAX = 80;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface GlobalSheetCacheState {
  mem: Map<string, CacheEntry<any>>;
  inFlight: Map<string, Promise<any>>;
}

const g = globalThis as unknown as { __smartLearnSheetCache?: GlobalSheetCacheState };
if (!g.__smartLearnSheetCache) {
  g.__smartLearnSheetCache = {
    mem: new Map(),
    inFlight: new Map(),
  };
}
const cacheState = g.__smartLearnSheetCache;

function memGet<T>(key: string): T | undefined {
  const entry = cacheState.mem.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cacheState.mem.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function memSet<T>(key: string, value: T, ttlMs: number) {
  if (cacheState.mem.size >= MEM_CACHE_MAX) {
    const oldest = cacheState.mem.keys().next().value;
    if (oldest !== undefined) cacheState.mem.delete(oldest);
  }
  cacheState.mem.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function withCoalescedMemory<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = memGet<T>(key);
  if (hit !== undefined) return hit;

  const existing = cacheState.inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const pending = (async () => {
    try {
      const value = await loader();
      if (value !== null && value !== undefined) {
        memSet(key, value, ttlMs);
      }
      return value;
    } finally {
      cacheState.inFlight.delete(key);
    }
  })();

  cacheState.inFlight.set(key, pending);
  return pending;
}

let cachedAnonClient: ReturnType<typeof createClient> | null = null;
export function getPublicSheetAnonClient() {
  if (!cachedAnonClient) {
    cachedAnonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return cachedAnonClient;
}

let cachedServiceClient: ReturnType<typeof createClient> | null = null;
export function getSheetServiceClient() {
  if (!cachedServiceClient) {
    cachedServiceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return cachedServiceClient;
}

export interface CachedCompanySettings {
  company_name?: string;
  logo_url?: string;
  is_admission_pinned?: boolean;
}

const getCompanySettingsNextCached = unstable_cache(
  async (): Promise<CachedCompanySettings | null> => {
    const supabase = getPublicSheetAnonClient();
    const { data } = await supabase
      .from('company_settings')
      .select('company_name, logo_url, is_admission_pinned')
      .maybeSingle();
    if (!data) return null;
    const row = data as Record<string, any>;
    return {
      company_name: row.company_name ?? undefined,
      logo_url: row.logo_url ?? undefined,
      is_admission_pinned: row.is_admission_pinned ?? undefined,
    };
  },
  ['company-settings-shared-v1'],
  { revalidate: 120, tags: ['company-settings'] }
);

export async function getCompanySettingsCached(): Promise<CachedCompanySettings | null> {
  return withCoalescedMemory('company-settings', 60_000, () => getCompanySettingsNextCached());
}

async function fetchSheetCurriculumFromClient(
  client: ReturnType<typeof createClient>,
  sheetId: string,
  sheetType: string
) {
  let problems: any[] = [];
  let sqlQuestions: any[] = [];
  let roadmapLevels: any[] = [];
  let roadmapProblems: any[] = [];
  let aptitudeChapters: any[] = [];
  let aptitudeQuestions: any[] = [];
  let tcsPayload: {
    chapters: any[];
    questions: any[];
    drills: any[];
    mockHeaders: any[];
  } | null = null;

  if (sheetType === 'SQL') {
    const { data: sqlData } = await client
      .from('coding_sheet_sql_questions')
      .select(
        'id, question_number, type, section, difficulty, question, options, correct_option, correct_answer, solution_sql, basic_concepts, explanation_points, incorrect_options, step_by_step, clause_breakdown'
      )
      .eq('sheet_id', sheetId)
      .order('question_number', { ascending: true });
    sqlQuestions = sqlData || [];
  } else if (sheetType === 'APTITUDE') {
    const { fetchAllAptitudeQuestions, fetchAptitudeChaptersAndProgress } = await import(
      '@/features/code-arena/data/aptitudeSheetTypes'
    );
    const [aptQs, { chapters }] = await Promise.all([
      fetchAllAptitudeQuestions(client, sheetId),
      fetchAptitudeChaptersAndProgress(client, sheetId),
    ]);
    aptitudeChapters = chapters;
    aptitudeQuestions = aptQs;
  } else if (sheetType === 'TCS_PREP') {
    const { fetchAllTcsQuestions, fetchTcsPrepCoreData } = await import(
      '@/features/code-arena/data/tcsPrepTypes'
    );
    const [tcsQs, core] = await Promise.all([
      fetchAllTcsQuestions(client, sheetId),
      fetchTcsPrepCoreData(client, sheetId),
    ]);
    tcsPayload = {
      chapters: core.chapters,
      questions: tcsQs,
      drills: core.drills,
      mockHeaders: core.mockHeaders,
    };
  } else if (sheetType === 'ROADMAP') {
    const [{ data: lvlData }, { data: probData }] = await Promise.all([
      client
        .from('coding_sheet_roadmap_levels')
        .select('id, level_number, title, subtitle, description, target_problem_count, is_unlocked, theory_modules, revision_data, meta')
        .eq('sheet_id', sheetId)
        .order('level_number', { ascending: true }),
      client
        .from('coding_sheet_roadmap_problems')
        .select('id, problem_code, order_index, level_number, batch_name, topic, title, difficulty, company_tags, problem_statement, description, constraints, test_cases, theory, brute_force, optimized, explanation, edge_cases')
        .eq('sheet_id', sheetId)
        .order('order_index', { ascending: true }),
    ]);
    roadmapLevels = lvlData || [];
    roadmapProblems = probData || [];
  } else {
    const [{ data: problemsData }, { data: lvlData }] = await Promise.all([
      client
        .from('coding_sheet_problems')
        .select(
          'order_index, youtube_url, text_solution, coding_problems(id, title, difficulty, source_type, external_platform, external_problem_id, external_url, tags)'
        )
        .eq('sheet_id', sheetId)
        .order('order_index', { ascending: true }),
      client
        .from('coding_sheet_roadmap_levels')
        .select('id, level_number, title, subtitle, description, target_problem_count, is_unlocked, theory_modules, revision_data, meta')
        .eq('sheet_id', sheetId)
        .order('level_number', { ascending: true }),
    ]);

    problems = (problemsData || []).map((p: any) => ({
      ...p.coding_problems,
      order_index: p.order_index,
      youtube_url: p.youtube_url || null,
      text_solution: p.text_solution || null,
    }));
    roadmapLevels = lvlData || [];
  }

  return {
    problems,
    sqlQuestions,
    roadmapLevels,
    roadmapProblems,
    aptitudeChapters,
    aptitudeQuestions,
    tcsPayload,
  };
}

export interface SerializedPublicSheetPayload {
  payload: any;
  jsonBytes: Uint8Array;
  gzipBytes: Uint8Array;
}

const getPublicSheetNextCached = unstable_cache(
  async (slug: string) => {
    const supabase = getPublicSheetAnonClient();
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
        attachment_url,
        attachment_type,
        youtube_url,
        profiles!coding_sheets_created_by_fkey(name, avatar_url, role)
      `);

    query = isUUID ? query.eq('id', slug) : query.eq('slug', slug);

    const { data: sheet, error: sheetError } = await query.maybeSingle();
    if (sheetError || !sheet || !(sheet as any).is_public) {
      return null;
    }

    const s = sheet as any;
    const curriculum = await fetchSheetCurriculumFromClient(
      supabase,
      s.id,
      s.sheet_type || 'DSA'
    );

    const creator = s.profiles
      ? {
          name: s.profiles.name,
          avatar_url: s.profiles.avatar_url,
          role: s.profiles.role,
        }
      : null;

    return {
      id: s.id,
      slug: s.slug || s.id,
      title: s.title,
      description: s.description || '',
      created_by: s.created_by,
      created_at: s.created_at,
      is_public: s.is_public,
      published_at: s.published_at,
      enrollment_access: s.enrollment_access,
      attachment_url: s.attachment_url,
      attachment_type: s.attachment_type,
      youtube_url: s.youtube_url,
      sheet_type: s.sheet_type || 'DSA',
      metadata: s.metadata || {},
      creator,
      problems: curriculum.problems,
      sqlQuestions: curriculum.sqlQuestions,
      roadmapLevels: curriculum.roadmapLevels,
      roadmapProblems: curriculum.roadmapProblems,
      aptitudeChapters: curriculum.aptitudeChapters,
      aptitudeQuestions: curriculum.aptitudeQuestions,
      tcsData: curriculum.tcsPayload,
    };
  },
  ['public-sheet-full-v2'],
  { revalidate: 180, tags: ['public-sheets'] }
);

export async function getSerializedPublicSheet(
  slug: string
): Promise<SerializedPublicSheetPayload | null> {
  const key = `pub-sheet:${slug}`;
  return withCoalescedMemory(key, 60_000, async () => {
    const payload = await getPublicSheetNextCached(slug);
    if (!payload) return null;
    const jsonString = JSON.stringify({ success: true, data: payload });
    const jsonBytes = new Uint8Array(Buffer.from(jsonString, 'utf8'));
    const gzipBytes = new Uint8Array(gzipSync(jsonBytes, { level: 4 }));
    return { payload, jsonBytes, gzipBytes };
  });
}

const getAuthCurriculumNextCached = unstable_cache(
  async (sheetId: string, sheetType: string) => {
    const serviceClient = getSheetServiceClient();
    return fetchSheetCurriculumFromClient(serviceClient, sheetId, sheetType);
  },
  ['sheet-curriculum-v1'],
  { revalidate: 120, tags: ['sheet-curriculum'] }
);

export async function getCachedAuthenticatedSheetCurriculum(
  sheetId: string,
  sheetType: string
) {
  return withCoalescedMemory(`curriculum:${sheetId}:${sheetType}`, 90_000, () =>
    getAuthCurriculumNextCached(sheetId, sheetType)
  );
}

export async function getCachedSheetCommunityData(
  sheetId: string,
  sheetType: string,
  includeEmail: boolean
) {
  const key = `community:${sheetId}:${sheetType}:${includeEmail ? 'staff' : 'student'}`;
  return withCoalescedMemory(key, 20_000, async () => {
    const serviceRoleClient = getSheetServiceClient();
    const [{ data: enrollmentsData, count: enrollmentsCount }, { data: statsRaw }] = await Promise.all([
      serviceRoleClient
        .from('coding_sheet_enrollments')
        .select(
          includeEmail
            ? 'user_id, enrolled_at, profiles(id, name, avatar_url, email)'
            : 'user_id, enrolled_at, profiles(id, name, avatar_url)',
          { count: 'exact' }
        )
        .eq('sheet_id', sheetId)
        .order('enrolled_at', { ascending: false })
        .limit(30),
      serviceRoleClient.rpc('get_sheet_community_stats', {
        p_sheet_id: sheetId,
        p_sheet_type: sheetType,
        p_limit: 30,
      } as any),
    ]);

    return {
      enrollmentsData: enrollmentsData || [],
      enrollmentsCount: enrollmentsCount || 0,
      statsRaw: statsRaw || null,
    };
  });
}

export function invalidateSheetCache(sheetId: string, slug?: string | null) {
  for (const key of cacheState.mem.keys()) {
    if (
      key.includes(sheetId) ||
      (slug && key === `pub-sheet:${slug}`)
    ) {
      cacheState.mem.delete(key);
    }
  }
  try {
    revalidateTag('public-sheets', { expire: 0 });
    revalidateTag('sheet-curriculum', { expire: 0 });
  } catch {
    // Best-effort outside RSC/action context
  }
}

