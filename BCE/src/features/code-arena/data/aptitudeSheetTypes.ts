export type AptitudeCategory = 'Quantitative Aptitude' | 'Logical Reasoning' | 'Verbal Ability';

export interface AptitudeChapter {
  id?: string;
  chapter_number: number;
  title: string;
  category: AptitudeCategory;
  question_count: number;
  start_q: number;
  end_q: number;
  theory: string[];
  short_tricks: string[];
  solved_example: string;
}

export interface AptitudeQuestion {
  id: string;
  question_number: number;
  chapter_number: number;
  chapter_question_number: number;
  category: AptitudeCategory;
  section: string;
  chapter_title: string;
  level_label: 'Basic' | 'Medium' | 'Advance' | string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  options: Record<string, string>;
  correct_option: string;
  correct_answer: string;
  explanation: string;
}

export interface AptitudeProgress {
  question_number: number;
  is_solved: boolean;
  is_bookmarked: boolean;
  selected_option?: string | null;
  attempts: number;
  xp_awarded?: number;
  solved_at?: string | null;
}

/**
 * Fetches all rows from a PostgREST query builder in 1,000-row pages so datasets
 * like the 1,139 Aptitude Mastery Sheet are never silently truncated by PostgREST max-rows.
 */
export async function fetchAllAptitudeQuestions(
  supabase: any,
  sheetId: string
): Promise<AptitudeQuestion[]> {
  const PAGE = 1000;
  const out: AptitudeQuestion[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('coding_sheet_aptitude_questions')
      .select(
        'id, question_number, chapter_number, chapter_question_number, category, section, chapter_title, level_label, difficulty, question, options, correct_option, correct_answer, explanation'
      )
      .eq('sheet_id', sheetId)
      .order('question_number', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error || !data || data.length === 0) break;
    out.push(...(data as AptitudeQuestion[]));
    if (data.length < PAGE) break;
  }
  return out;
}

export async function fetchAptitudeChaptersAndProgress(
  supabase: any,
  sheetId: string,
  userId?: string
): Promise<{
  chapters: AptitudeChapter[];
  progress: AptitudeProgress[];
}> {
  const chaptersPromise = supabase
    .from('coding_sheet_aptitude_chapters')
    .select('id, chapter_number, title, category, question_count, start_q, end_q, theory, short_tricks, solved_example')
    .eq('sheet_id', sheetId)
    .order('chapter_number', { ascending: true });

  const progressPromise = (async () => {
    if (!userId) return [];
    const PAGE = 1000;
    const out: AptitudeProgress[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('coding_sheet_aptitude_progress')
        .select('question_number, is_solved, is_bookmarked, selected_option, attempts, xp_awarded, solved_at')
        .eq('sheet_id', sheetId)
        .eq('user_id', userId)
        .order('question_number', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      out.push(...(data as AptitudeProgress[]));
      if (data.length < PAGE) break;
    }
    return out;
  })();

  const [{ data: chapData }, progress] = await Promise.all([chaptersPromise, progressPromise]);
  return {
    chapters: (chapData || []) as AptitudeChapter[],
    progress,
  };
}

/**
 * Fetches all solved rows for an aptitude sheet across all users in 1,000-row pages
 * so leaderboard counts, certificate rank, and landing preview solvers never truncate at 1,000 rows.
 */
export async function fetchAllSolvedAptitudeProgress(
  supabase: any,
  sheetId: string,
  includeProfiles = false
): Promise<Array<{ user_id: string; question_number: number; profiles?: { name?: string | null; avatar_url?: string | null } | null }>> {
  const PAGE = 1000;
  const selectCols = includeProfiles
    ? 'user_id, question_number, profiles!coding_sheet_aptitude_progress_user_id_fkey(name, avatar_url)'
    : 'user_id, question_number';
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('coding_sheet_aptitude_progress')
      .select(selectCols)
      .eq('sheet_id', sheetId)
      .eq('is_solved', true)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}
