import { createAdminClient } from '@/lib/supabase/server';
import { AppRole, normalizeAgentRole, canAccessPage } from '@/lib/auth/agent-permissions';

export interface EntityResolutionResult<T> {
  matched: boolean;
  entity?: T;
  confidence: number;
  ambiguous: boolean;
  candidates?: T[];
  reason?: string;
  route?: string;
}

export interface CourseEntity {
  id: string;
  title: string;
  slug?: string;
  isPublished?: boolean;
}

export interface DSASheetEntity {
  id: string;
  title: string;
  slug?: string;
  isPublished?: boolean;
}

export interface DSAProblemEntity {
  id: string;
  title: string;
  slug?: string;
  sheetId?: string;
  orderIndex?: number;
}

// ─── IN-MEMORY TTL CACHE (5 MIN) FOR CATALOG INDEXES ───
interface CacheEntry<T> {
  timestamp: number;
  data: T[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let courseCache: CacheEntry<CourseEntity> | null = null;
let sheetCache: CacheEntry<DSASheetEntity> | null = null;
const problemCacheMap = new Map<string, CacheEntry<DSAProblemEntity>>();

export function invalidateCourseCache(): void {
  courseCache = null;
}

export function invalidateSheetCache(): void {
  sheetCache = null;
}

export function invalidateProblemCache(sheetId?: string): void {
  if (sheetId) {
    problemCacheMap.delete(sheetId);
  } else {
    problemCacheMap.clear();
  }
}

export function invalidateAllEntityCaches(): void {
  courseCache = null;
  sheetCache = null;
  problemCacheMap.clear();
}

// Navigation filler words in English & Hinglish
const FILLER_WORDS = new Set([
  'kholo', 'khol', 'kholna', 'kholne', 'open', 'show', 'dikhao', 'dikha', 'view', 'go', 'goto', 'navigate',
  'wala', 'wali', 'wale', 'karo', 'kardo', 'do', 'par', 'me', 'mein', 'ka', 'ki', 'ke', 'ko',
  'please', 'mujhe', 'mera', 'meri', 'mere', 'iska', 'iski', 'iske', 'this', 'that', 'the', 'a', 'an'
]);

/**
 * Normalizes raw speech/text input into clean tokens for matching.
 */
export function normalizeQuery(rawQuery: string): string {
  if (!rawQuery) return '';
  
  // Clean punctuation & lower-case
  const cleaned = rawQuery
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Filter out filler words while preserving key acronyms (e.g., "dbms", "dsa" if standalone, "itw")
  const tokens = cleaned.split(' ').filter(token => {
    if (token.length <= 1) return false;
    return !FILLER_WORDS.has(token);
  });

  return tokens.map(t => t === 'basic' ? 'basics' : t).join(' ');
}

/**
 * Computes acronym string for multi-word titles (e.g. "Database Management System" -> "dbms")
 */
function getAcronym(text: string): string {
  return text
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toLowerCase();
}

/**
 * Basic Levenshtein distance for fuzzy matching typos
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates match score (0.0 to 1.0) between query and target title.
 * Enforces deterministic scoring priority:
 * 1. Exact canonical title (1.0)
 * 2. Exact normalized title (1.0)
 * 3. Exact token-set match (0.95)
 * 4. Strong multi-token match (0.85)
 * 5. Partial token match (0.65)
 * 6. No match (0)
 */
function scoreMatch(queryNorm: string, rawQuery: string, title: string): number {
  const titleLower = title.toLowerCase().trim();
  const titleNorm = normalizeQuery(title);
  const titleAcronym = getAcronym(title);
  const rawLower = rawQuery.toLowerCase().trim();

  // 1. Exact canonical title match
  if (rawLower === titleLower) return 1.0;

  // 2. Exact normalized title match (including basic <-> basics equivalence)
  if (queryNorm === titleNorm) return 1.0;

  // Lexical token sets comparison
  const normalizeTok = (t: string) => t === 'basic' ? 'basics' : t;
  const queryTokens = queryNorm.split(' ').map(normalizeTok).filter(Boolean);
  const titleTokens = titleNorm.split(' ').map(normalizeTok).filter(Boolean);

  // 3. Exact token-set match (same set of normalized entity tokens regardless of order)
  const isExactTokenSet = queryTokens.length === titleTokens.length &&
    queryTokens.every(q => titleTokens.includes(q)) &&
    titleTokens.every(t => queryTokens.includes(t));
  if (isExactTokenSet && queryTokens.length > 0) return 0.95;

  // Acronym match
  if (queryNorm === titleAcronym || rawLower === titleAcronym) {
    return 0.92;
  }

  // 4. Strong multi-token match
  let matchedCount = 0;
  for (const qTok of queryTokens) {
    if (titleTokens.some(tTok => tTok === qTok || tTok.includes(qTok) || qTok.includes(tTok))) {
      matchedCount++;
    }
  }

  if (queryTokens.length > 0) {
    const ratio = matchedCount / queryTokens.length;
    if (ratio === 1.0) return 0.88;
    if (ratio >= 0.66) return 0.78;
    if (ratio >= 0.5) return 0.65;
  }

  // Prefix match
  if (titleNorm.startsWith(queryNorm) || queryNorm.startsWith(titleNorm)) return 0.75;

  // 5. Fuzzy Levenshtein for minor typos
  const distance = levenshteinDistance(queryNorm, titleNorm);
  const maxLen = Math.max(queryNorm.length, titleNorm.length);
  if (maxLen > 0) {
    const similarity = 1 - distance / maxLen;
    if (similarity >= 0.75) return similarity * 0.7;
  }

  return 0;
}

// ─── CACHED DATA FETCHERS ───

async function getCachedCourses(): Promise<CourseEntity[]> {
  const now = Date.now();
  if (courseCache && (now - courseCache.timestamp < CACHE_TTL_MS)) {
    return courseCache.data;
  }

  const adminClient = await createAdminClient();
  const { data } = await adminClient
    .from('courses')
    .select('id, title, slug, is_published')
    .eq('is_published', true);

  const courses: CourseEntity[] = (data || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    isPublished: c.is_published
  }));

  courseCache = { timestamp: now, data: courses };
  return courses;
}

async function getCachedDSASheets(): Promise<DSASheetEntity[]> {
  const now = Date.now();
  if (sheetCache && (now - sheetCache.timestamp < CACHE_TTL_MS)) {
    return sheetCache.data;
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('coding_sheets')
    .select('id, title, slug');

  if (error) {
    console.error('[getCachedDSASheets Error]:', error);
  }

  const sheets: DSASheetEntity[] = (data || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    isPublished: true
  }));

  sheetCache = { timestamp: now, data: sheets };
  return sheets;
}

async function getCachedDSAProblems(sheetId?: string): Promise<DSAProblemEntity[]> {
  const now = Date.now();
  const cacheKey = sheetId || 'all';
  const cached = problemCacheMap.get(cacheKey);

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const adminClient = await createAdminClient();
  let query = adminClient
    .from('coding_problems')
    .select('id, title, slug, sheet_id, order_index');

  if (sheetId) {
    query = query.eq('sheet_id', sheetId);
  }

  const { data } = await query;
  const problems: DSAProblemEntity[] = (data || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    sheetId: p.sheet_id,
    orderIndex: p.order_index
  }));

  problemCacheMap.set(cacheKey, { timestamp: now, data: problems });
  return problems;
}

// ─── PUBLIC RESOLVER APIs ───

/**
 * Resolves a course by user query string with authorization check.
 */
export async function resolveCourse(
  rawQuery: string,
  user: { id: string } | null,
  userRole?: string | null
): Promise<EntityResolutionResult<CourseEntity>> {
  const role = normalizeAgentRole(userRole);
  const normQuery = normalizeQuery(rawQuery);

  if (!normQuery && !rawQuery.trim()) {
    return { matched: false, confidence: 0, ambiguous: false, reason: 'Empty course query' };
  }

  const courses = await getCachedCourses();
  const scored = courses.map(c => ({
    entity: c,
    score: scoreMatch(normQuery, rawQuery, c.title)
  })).filter(s => s.score > 0.45);

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { matched: false, confidence: 0, ambiguous: false, reason: `Course "${rawQuery}" not found` };
  }

  const top = scored[0];
  const route = `/courses/${top.entity.id}`;

  // Authorization Check
  if (!canAccessPage(role, route)) {
    return {
      matched: false,
      confidence: 0,
      ambiguous: false,
      reason: 'Please log in first. This section is available to authenticated users.'
    };
  }

  // Ambiguity Check: If multiple candidates have score within 0.1 of top match
  const topCandidates = scored.filter(s => s.score >= top.score - 0.1 && s.score >= 0.7);
  if (topCandidates.length > 1) {
    return {
      matched: false,
      confidence: top.score,
      ambiguous: true,
      candidates: topCandidates.map(c => c.entity),
      reason: `I found multiple courses matching "${rawQuery}". Which one do you want?`
    };
  }

  return {
    matched: true,
    entity: top.entity,
    confidence: top.score,
    ambiguous: false,
    route
  };
}

function extractOrdinalIndex(query: string): number | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  const numMatch = q.match(/\b(\d+)(?:st|nd|rd|th)?\b/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    if (val >= 1 && val <= 50) return val;
  }
  if (/\b(first|pehli|pehla|1st)\b/i.test(q)) return 1;
  if (/\b(second|dusri|dusra|2nd)\b/i.test(q)) return 2;
  if (/\b(third|tisri|tisra|3rd)\b/i.test(q)) return 3;
  if (/\b(fourth|chauthi|chautha|4th)\b/i.test(q)) return 4;
  if (/\b(fifth|paanchvi|paanchva|5th)\b/i.test(q)) return 5;
  return undefined;
}

/**
 * Resolves a DSA Sheet by user query string or ordinal index with authorization check.
 */
export async function resolveDSASheet(
  rawQuery: string,
  user: { id: string } | null,
  userRole?: string | null,
  sheetIndex?: number
): Promise<EntityResolutionResult<DSASheetEntity>> {
  const role = normalizeAgentRole(userRole);
  const normQuery = normalizeQuery(rawQuery);
  const targetIdx = sheetIndex || extractOrdinalIndex(rawQuery);

  const sheets = await getCachedDSASheets();

  if (targetIdx && targetIdx >= 1 && targetIdx <= sheets.length) {
    const matchedSheet = sheets[targetIdx - 1];
    const route = `/code-arena/sheets/${matchedSheet.id}`;
    if (canAccessPage(role, route)) {
      return {
        matched: true,
        entity: matchedSheet,
        confidence: 1.0,
        ambiguous: false,
        route
      };
    }
  }

  if (!normQuery && !rawQuery.trim()) {
    return { matched: false, confidence: 0, ambiguous: false, reason: 'Empty DSA sheet query' };
  }

  const scored = sheets.map(s => ({
    entity: s,
    score: scoreMatch(normQuery, rawQuery, s.title)
  })).filter(s => s.score > 0.45);

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { matched: false, confidence: 0, ambiguous: false, reason: `DSA sheet "${rawQuery}" not found` };
  }

  const top = scored[0];
  const route = `/code-arena/sheets/${top.entity.id}`;

  if (!canAccessPage(role, route)) {
    return {
      matched: false,
      confidence: 0,
      ambiguous: false,
      reason: 'Please log in first. This section is available to authenticated users.'
    };
  }

  const topCandidates = scored.filter(s => s.score >= top.score - 0.1 && s.score >= 0.7);
  if (topCandidates.length > 1) {
    return {
      matched: false,
      confidence: top.score,
      ambiguous: true,
      candidates: topCandidates.map(s => s.entity),
      reason: `I found multiple DSA sheets matching "${rawQuery}". Which one do you want?`
    };
  }

  return {
    matched: true,
    entity: top.entity,
    confidence: top.score,
    ambiguous: false,
    route
  };
}

/**
 * Resolves a DSA Problem by query or index order within a sheet.
 */
export async function resolveDSAProblem(
  rawQuery: string,
  sheetId?: string,
  problemIndex?: number,
  user?: { id: string } | null,
  userRole?: string | null
): Promise<EntityResolutionResult<DSAProblemEntity>> {
  const role = normalizeAgentRole(userRole);
  const normQuery = normalizeQuery(rawQuery);

  const problems = await getCachedDSAProblems(sheetId);

  // If problemIndex is requested (e.g. "Problem 4")
  if (problemIndex && problemIndex > 0) {
    const sorted = [...problems].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const matched = sorted[problemIndex - 1] || sorted.find(p => p.orderIndex === problemIndex);

    if (matched) {
      const route = `/code-arena/problems/${matched.id}`;
      if (!canAccessPage(role, route)) {
        return {
          matched: false,
          confidence: 0,
          ambiguous: false,
          reason: 'Please log in first. This section is available to authenticated users.'
        };
      }

      return {
        matched: true,
        entity: matched,
        confidence: 1.0,
        ambiguous: false,
        route
      };
    }
  }

  if (!normQuery && !rawQuery.trim()) {
    return { matched: false, confidence: 0, ambiguous: false, reason: 'Empty problem query' };
  }

  const scored = problems.map(p => ({
    entity: p,
    score: scoreMatch(normQuery, rawQuery, p.title)
  })).filter(s => s.score > 0.45);

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { matched: false, confidence: 0, ambiguous: false, reason: `Problem "${rawQuery}" not found` };
  }

  const top = scored[0];
  const route = `/code-arena/problems/${top.entity.id}`;

  if (!canAccessPage(role, route)) {
    return {
      matched: false,
      confidence: 0,
      ambiguous: false,
      reason: 'Please log in first. This section is available to authenticated users.'
    };
  }

  const topCandidates = scored.filter(s => s.score >= top.score - 0.1 && s.score >= 0.7);
  if (topCandidates.length > 1) {
    return {
      matched: false,
      confidence: top.score,
      ambiguous: true,
      candidates: topCandidates.map(p => p.entity),
      reason: `I found multiple problems matching "${rawQuery}". Which one do you want?`
    };
  }

  return {
    matched: true,
    entity: top.entity,
    confidence: top.score,
    ambiguous: false,
    route
  };
}
