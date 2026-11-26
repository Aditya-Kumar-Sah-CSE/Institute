export type TcsCategory = 'Quantitative Aptitude' | 'Logical Reasoning' | 'Verbal Ability';

export interface TcsChapter {
  id?: string;
  chapter_number: number;
  title: string;
  category: TcsCategory;
  question_count: number;
  start_q: number;
  end_q: number;
  theory: string[];
  short_tricks: string[];
  solved_example: string;
}

export interface TcsPrepQuestion {
  id: string;
  question_number: number;
  chapter_number: number;
  chapter_question_number: number;
  category: TcsCategory;
  section: string;
  chapter_title: string;
  level_label: 'Basic' | 'Medium' | 'Advance' | string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  options: Record<string, string>;
  correct_option: string;
  correct_answer: string;
  explanation: string;
  image_url?: string | null;
}

export type TcsDrillType = 'PASSAGE_RECALL' | 'EMAIL_WRITING' | 'CODING';

export interface TcsDrill {
  id?: string;
  drill_code: string;
  drill_type: TcsDrillType;
  order_index: number;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  prompt: string;
  sample_input: string;
  sample_output: string;
  hint: string;
  solution_text: string;
  solution_code?: string | null;
  meta: {
    read_seconds?: number;
    write_seconds?: number;
    time_seconds?: number;
    keywords?: string[];
    level_label?: string;
    problem_number?: number;
  };
}

export interface TcsMockSectionSpec {
  key: string;
  name: string;
  questions: number;
  minutes: number;
  q_range: [number, number];
}

export interface TcsMockItem {
  question_number: number;
  item_type: 'MCQ' | 'PASSAGE_RECALL' | 'EMAIL_WRITING' | 'CODING';
  section: string;
  section_minutes: number;
  topic: string;
  chapter_number: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  title?: string;
  options?: Record<string, string>;
  correct_option?: string;
  correct_answer?: string;
  explanation?: string;
  read_seconds?: number;
  write_seconds?: number;
  keywords?: string[];
  checklist?: string;
  time_seconds?: number;
  checklist_points?: string[];
  sample_solution?: string;
  input_spec?: string;
  output_spec?: string;
  constraints?: string;
  sample_input?: string;
  sample_output?: string;
  editorial_notes?: string;
  solution_code?: string;
}

export interface TcsMockPaperHeader {
  id?: string;
  paper_number: number;
  title: string;
  total_minutes: number;
  total_items: number;
  sections: TcsMockSectionSpec[];
}

export interface TcsMockPaperFull extends TcsMockPaperHeader {
  items: TcsMockItem[];
}

export interface TcsProgress {
  item_key: string;
  item_type: 'MCQ' | TcsDrillType;
  is_solved: boolean;
  is_bookmarked: boolean;
  selected_option?: string | null;
  submitted_text?: string | null;
  submitted_code?: string | null;
  attempts: number;
  xp_awarded?: number;
  solved_at?: string | null;
}

export interface TcsMockResponseEntry {
  selectedOption?: string;
  textResponse?: string;
  codeResponse?: string;
  language?: string;
  codingPassed?: boolean;
  timeSpentSec?: number;
}

export interface TcsMockSectionStat {
  key: string;
  name: string;
  totalItems: number;
  budgetSeconds: number;
  spentSeconds: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  score: number;
  maxScore: number;
  accuracyPct: number;
  avgSecPerItem: number;
  pacingStatus: 'Fast' | 'Optimal' | 'Overtime';
}

export interface TcsMockTopicStat {
  topic: string;
  chapterNumber: number;
  total: number;
  correct: number;
  wrong: number;
  unattempted: number;
  accuracyPct: number;
  avgTimeSec: number;
}

export interface TcsMockAttempt {
  id: string;
  paper_number: number;
  mode: 'EXAM' | 'PRACTICE';
  total_score: number;
  max_score: number;
  mcq_correct: number;
  mcq_wrong: number;
  mcq_unattempted: number;
  writing_score: number;
  coding_solved: number;
  accuracy_pct: number;
  total_time_sec: number;
  section_stats: TcsMockSectionStat[];
  topic_stats: TcsMockTopicStat[];
  responses: Record<number, TcsMockResponseEntry>;
  xp_awarded: number;
  completed_at: string;
}

async function fetchPaginated<T>(
  buildQuery: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function fetchAllTcsQuestions(supabase: any, sheetId: string): Promise<TcsPrepQuestion[]> {
  return fetchPaginated<TcsPrepQuestion>((from, to) =>
    supabase
      .from('coding_sheet_tcs_questions')
      .select(
        'id, question_number, chapter_number, chapter_question_number, category, section, chapter_title, level_label, difficulty, question, options, correct_option, correct_answer, explanation, image_url'
      )
      .eq('sheet_id', sheetId)
      .order('question_number', { ascending: true })
      .range(from, to)
  );
}

export async function fetchAllSolvedTcsProgress(
  supabase: any,
  sheetId: string,
  includeProfiles = false
): Promise<Array<{ user_id: string; item_key: string; item_type: string; profiles?: { name?: string | null; avatar_url?: string | null } | null }>> {
  const selectCols = includeProfiles
    ? 'user_id, item_key, item_type, profiles!coding_sheet_tcs_progress_user_id_fkey(name, avatar_url)'
    : 'user_id, item_key, item_type';
  return fetchPaginated((from, to) =>
    supabase
      .from('coding_sheet_tcs_progress')
      .select(selectCols)
      .eq('sheet_id', sheetId)
      .eq('is_solved', true)
      .range(from, to)
  );
}

export async function fetchTcsPrepCoreData(
  supabase: any,
  sheetId: string,
  userId?: string
): Promise<{
  chapters: TcsChapter[];
  drills: TcsDrill[];
  mockHeaders: TcsMockPaperHeader[];
  progress: TcsProgress[];
  mockAttempts: TcsMockAttempt[];
}> {
  const [chapRes, drillRes, mockRes, progress, attemptsRes] = await Promise.all([
    supabase
      .from('coding_sheet_tcs_chapters')
      .select('id, chapter_number, title, category, question_count, start_q, end_q, theory, short_tricks, solved_example')
      .eq('sheet_id', sheetId)
      .order('chapter_number', { ascending: true }),
    supabase
      .from('coding_sheet_tcs_drills')
      .select('id, drill_code, drill_type, order_index, title, difficulty, prompt, sample_input, sample_output, hint, solution_text, solution_code, meta')
      .eq('sheet_id', sheetId)
      .order('order_index', { ascending: true }),
    supabase
      .from('coding_sheet_tcs_mocks')
      .select('id, paper_number, title, total_minutes, total_items, sections')
      .eq('sheet_id', sheetId)
      .order('paper_number', { ascending: true }),
    userId
      ? fetchPaginated<TcsProgress>((from, to) =>
          supabase
            .from('coding_sheet_tcs_progress')
            .select('item_key, item_type, is_solved, is_bookmarked, selected_option, submitted_text, submitted_code, attempts, xp_awarded, solved_at')
            .eq('sheet_id', sheetId)
            .eq('user_id', userId)
            .range(from, to)
        )
      : Promise.resolve([]),
    userId
      ? supabase
          .from('coding_sheet_tcs_mock_attempts')
          .select('*')
          .eq('sheet_id', sheetId)
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return {
    chapters: (chapRes.data || []) as TcsChapter[],
    drills: (drillRes.data || []) as TcsDrill[],
    mockHeaders: (mockRes.data || []) as TcsMockPaperHeader[],
    progress,
    mockAttempts: ((attemptsRes as any).data || []) as TcsMockAttempt[],
  };
}

export function scoreTextMatchRatio(answerText: string, expectedKeywords: string[]): number {
  const cleaned = (answerText || '').toLowerCase();
  if (!cleaned.trim() || expectedKeywords.length === 0) return 0;
  let hits = 0;
  for (const kw of expectedKeywords) {
    const tokens = kw
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    if (tokens.length === 0) continue;
    if (tokens.some((tok) => cleaned.includes(tok))) {
      hits++;
    }
  }
  return Math.min(1, hits / Math.max(1, Math.min(expectedKeywords.length, 6)));
}

export function evaluateTcsMockSubmission(
  paper: TcsMockPaperFull,
  responses: Record<number, TcsMockResponseEntry>,
  sectionTimesSec: Record<string, number>
) {
  let mcqCorrect = 0;
  let mcqWrong = 0;
  let mcqUnattempted = 0;
  let writingScore = 0;
  let codingSolved = 0;
  let totalTimeSec = 0;

  const topicMap = new Map<
    string,
    { topic: string; chapterNumber: number; total: number; correct: number; wrong: number; unattempted: number; timeSum: number }
  >();

  const sectionStats: TcsMockSectionStat[] = paper.sections.map((sec) => {
    const secItems = paper.items.filter(
      (it) => it.question_number >= sec.q_range[0] && it.question_number <= sec.q_range[1]
    );
    const budgetSeconds = sec.minutes * 60;
    const spentSeconds = Math.max(0, Math.round(sectionTimesSec[sec.key] || 0));
    totalTimeSec += spentSeconds;

    let secAttempted = 0;
    let secCorrect = 0;
    let secWrong = 0;
    let secUnattempted = 0;
    let secScore = 0;
    const secMaxScore = secItems.length;

    for (const item of secItems) {
      const resp = responses[item.question_number] || {};
      const itemTime = Math.max(0, Math.round(resp.timeSpentSec || 0));

      if (!topicMap.has(item.topic)) {
        topicMap.set(item.topic, {
          topic: item.topic,
          chapterNumber: item.chapter_number,
          total: 0,
          correct: 0,
          wrong: 0,
          unattempted: 0,
          timeSum: 0,
        });
      }
      const tEntry = topicMap.get(item.topic)!;
      tEntry.total++;
      tEntry.timeSum += itemTime;

      if (item.item_type === 'MCQ') {
        if (!resp.selectedOption) {
          mcqUnattempted++;
          secUnattempted++;
          tEntry.unattempted++;
        } else {
          secAttempted++;
          const isRight = resp.selectedOption.toUpperCase() === (item.correct_option || '').toUpperCase();
          if (isRight) {
            mcqCorrect++;
            secCorrect++;
            secScore += 1;
            tEntry.correct++;
          } else {
            mcqWrong++;
            secWrong++;
            tEntry.wrong++;
          }
        }
      } else if (item.item_type === 'PASSAGE_RECALL') {
        const txt = (resp.textResponse || '').trim();
        if (!txt) {
          secUnattempted++;
          tEntry.unattempted++;
        } else {
          secAttempted++;
          const ratio = scoreTextMatchRatio(txt, item.keywords || []);
          const pts = Number(ratio.toFixed(2));
          writingScore += pts;
          secScore += pts;
          if (ratio >= 0.5) {
            secCorrect++;
            tEntry.correct++;
          } else {
            secWrong++;
            tEntry.wrong++;
          }
        }
      } else if (item.item_type === 'EMAIL_WRITING') {
        const txt = (resp.textResponse || '').trim();
        if (!txt) {
          secUnattempted++;
          tEntry.unattempted++;
        } else {
          secAttempted++;
          const pts = Number(scoreTextMatchRatio(txt, item.checklist_points || ['subject', 'dear', 'regards']).toFixed(2));
          const hasStructure = /dear|hello|hi/i.test(txt) && /regards|sincerely|thanks/i.test(txt) ? 0.2 : 0;
          const finalPts = Math.min(1, Number((pts * 0.8 + hasStructure).toFixed(2)));
          writingScore += finalPts;
          secScore += finalPts;
          if (finalPts >= 0.55) {
            secCorrect++;
            tEntry.correct++;
          } else {
            secWrong++;
            tEntry.wrong++;
          }
        }
      } else if (item.item_type === 'CODING') {
        const hasCode = Boolean((resp.codeResponse || '').trim().length > 20);
        if (!hasCode) {
          secUnattempted++;
          tEntry.unattempted++;
        } else {
          secAttempted++;
          if (resp.codingPassed) {
            codingSolved++;
            secCorrect++;
            secScore += 1;
            tEntry.correct++;
          } else {
            secWrong++;
            tEntry.wrong++;
          }
        }
      }
    }

    const ratioUsed = budgetSeconds > 0 ? spentSeconds / budgetSeconds : 0;
    const pacingStatus: TcsMockSectionStat['pacingStatus'] =
      ratioUsed > 1.02 ? 'Overtime' : ratioUsed < 0.5 && secAttempted === secItems.length ? 'Fast' : 'Optimal';

    return {
      key: sec.key,
      name: sec.name,
      totalItems: secItems.length,
      budgetSeconds,
      spentSeconds,
      attempted: secAttempted,
      correct: secCorrect,
      wrong: secWrong,
      unattempted: secUnattempted,
      score: Number(secScore.toFixed(2)),
      maxScore: secMaxScore,
      accuracyPct: secAttempted > 0 ? Math.round((secCorrect / secAttempted) * 100) : 0,
      avgSecPerItem: secItems.length > 0 ? Math.round(spentSeconds / secItems.length) : 0,
      pacingStatus,
    };
  });

  const topicStats: TcsMockTopicStat[] = Array.from(topicMap.values())
    .map((t) => ({
      topic: t.topic,
      chapterNumber: t.chapterNumber,
      total: t.total,
      correct: t.correct,
      wrong: t.wrong,
      unattempted: t.unattempted,
      accuracyPct: t.correct + t.wrong > 0 ? Math.round((t.correct / (t.correct + t.wrong)) * 100) : 0,
      avgTimeSec: t.total > 0 ? Math.round(t.timeSum / t.total) : 0,
    }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct || b.wrong - a.wrong);

  const totalScore = Number((mcqCorrect + writingScore + codingSolved).toFixed(2));
  const totalAttempted = mcqCorrect + mcqWrong + Math.min(5, sectionStats[3]?.attempted ? sectionStats[3].attempted - Math.min(20, mcqCorrect + mcqWrong) : 0);
  const accuracyPct =
    mcqCorrect + mcqWrong > 0
      ? Number(((mcqCorrect / (mcqCorrect + mcqWrong)) * 100).toFixed(1))
      : totalAttempted > 0
      ? 100
      : 0;

  return {
    totalScore,
    maxScore: paper.total_items || 81,
    mcqCorrect,
    mcqWrong,
    mcqUnattempted,
    writingScore: Number(writingScore.toFixed(2)),
    codingSolved,
    accuracyPct,
    totalTimeSec,
    sectionStats,
    topicStats,
  };
}

export function getTcsReadinessTier(score: number, codingSolved: number) {
  if (score >= 62 && codingSolved >= 2) {
    return { label: 'TCS Prime Contender', color: '#10b981', hint: 'Strong score across Advanced Quant & both coding tracks.' };
  }
  if (score >= 48 && codingSolved >= 1) {
    return { label: 'TCS Digital Track', color: '#06b6d4', hint: 'Solid foundation + at least 1 coding solve. Push Coding Medium & Adv Quant for Prime.' };
  }
  if (score >= 34) {
    return { label: 'TCS Ninja Ready', color: '#f59e0b', hint: 'Good Foundation speed. Focus on Advanced Quant & Coding Easy to cross into Digital.' };
  }
  return { label: 'Foundation Building', color: '#f43f5e', hint: 'Revise weak chapters from the 47-chapter workbook and re-take under strict timer.' };
}

