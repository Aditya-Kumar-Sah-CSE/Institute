const fs = require('fs');
const path = require('path');
const postgres = require('postgres');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../../.env');
const env = {};
fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .forEach((line) => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      let v = line.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  });

const DATABASE_URL = env.DATABASE_URL;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing DATABASE_URL, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const SHEET_SLUG = 'dsa-company-roadmap-520';
const SHEET_TITLE = 'DSA for Freshers: Company Roadmap (Levels 1–5)';
const SHEET_DESCRIPTION =
  'Complete 5-Level Structured DSA Mastery Roadmap (~520 curated problems for TCS Digital, Infosys, Wipro, Cognizant, Capgemini & Product Companies). Includes Hinglish Concept Theory Modules, Brute Force vs Optimized C++17 Implementations, 3+ Interactive Test Cases, Edge Cases, Level-Wise Revision Cheat Sheets & Live C++ Sandbox.';
const CREATOR_USER_ID = 'd175f6b1-ef9d-428a-8a26-14365a624ae9';

const ROADMAP_BLUEPRINT = [
  {
    level_number: 1,
    title: 'Foundation',
    subtitle: 'Arrays, Strings, Math & Number Theory, Hashing, Matrix, Bits & Recursion Basics',
    description:
      'Build rock-solid fundamentals for TCS Digital, Infosys, Wipro, Cognizant, Capgemini & base rounds. Master complexity analysis, array/string manipulation, hashing patterns, basic recursion, and level-end revision drills.',
    target_problem_count: 90,
  },
  {
    level_number: 2,
    title: 'Core Patterns',
    subtitle: 'Two Pointers, Sliding Window, Prefix Sum, Kadane, Binary Search & Sorting',
    description:
      'Combine Level 1 primitives into high-frequency interview patterns: fixed/variable sliding windows, subarray sum + hashmap, Binary Search on Answer, and custom comparator sorting.',
    target_problem_count: 130,
  },
  {
    level_number: 3,
    title: 'Data Structures',
    subtitle: 'Monotonic Stack, Queue/Deque, Linked List, Heap/PQ, Intervals & Greedy',
    description:
      'Essential data structures for mid-level & product interviews: next greater element, fast/slow pointers, cycle detection, Top-K heaps, and interval scheduling.',
    target_problem_count: 120,
  },
  {
    level_number: 4,
    title: 'Trees & Backtracking',
    subtitle: 'Binary Trees (DFS/BFS, LCA, Diameter), BST, Trie & Backtracking',
    description:
      'Master hierarchical structures and state-space search: tree traversals, BST invariants, prefix tries, subsets, permutations, and N-Queens.',
    target_problem_count: 80,
  },
  {
    level_number: 5,
    title: 'Advanced Algorithms',
    subtitle: 'Graphs (BFS/DFS, Topo, DSU, Dijkstra), Dynamic Programming & Bit Manipulation',
    description:
      'Edge-giving product company mastery: shortest paths, union-find, 1D/2D DP, knapsack, LCS/LIS, partition DP, and bitmask tricks.',
    target_problem_count: 100,
  },
];

function normalizeDifficulty(rawDiff) {
  const d = String(rawDiff || 'EASY').trim().toUpperCase();
  if (d === 'HARD') return 'HARD';
  if (d === 'MEDIUM') return 'MEDIUM';
  return 'EASY';
}

function loadLevelBatches(dataDir) {
  if (!fs.existsSync(dataDir)) {
    throw new Error(`Roadmap data dir not found: ${dataDir}`);
  }
  const files = fs
    .readdirSync(dataDir)
    .map((name) => {
      const m = name.match(/^level(\d+)_part(\d+)\.json$/i);
      return m ? { name, level: Number(m[1]), part: Number(m[2]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.level !== b.level ? a.level - b.level : a.part - b.part));

  const byLevel = new Map();
  for (const f of files) {
    const fullPath = path.join(dataDir, f.name);
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (!byLevel.has(f.level)) {
      byLevel.set(f.level, {
        levelNumber: f.level,
        batches: [],
        theoryModules: [],
        problems: [],
        revisionData: {},
        meta: {},
      });
    }
    const bucket = byLevel.get(f.level);
    const batchLabel = parsed?.meta?.batch || `Part ${f.part}`;
    bucket.batches.push({ file: f.name, part: f.part, meta: parsed.meta || {} });

    if (Array.isArray(parsed.theory)) {
      for (const th of parsed.theory) {
        bucket.theoryModules.push({
          ...th,
          batch: batchLabel,
          part: f.part,
        });
      }
    }

    if (Array.isArray(parsed.problems)) {
      for (const prob of parsed.problems) {
        bucket.problems.push({
          ...prob,
          batch_name: batchLabel,
        });
      }
    }

    if (parsed.level_revision && typeof parsed.level_revision === 'object') {
      bucket.revisionData = parsed.level_revision;
    }

    if (parsed.meta && typeof parsed.meta === 'object') {
      bucket.meta = {
        ...bucket.meta,
        ...parsed.meta,
        parts_loaded: (bucket.meta.parts_loaded || 0) + 1,
      };
    }
  }

  return byLevel;
}

async function run() {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/146_dsa_roadmap_sheet.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration 146_dsa_roadmap_sheet.sql...');
  const pgSql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });
  try {
    await pgSql.unsafe(migrationSql);
    console.log('Migration 146 applied cleanly.');
  } finally {
    await pgSql.end();
  }

  await new Promise((r) => setTimeout(r, 2500));

  const dataDir = path.resolve(__dirname, '../../src/features/code-arena/data/dsa-roadmap');
  const levelMap = loadLevelBatches(dataDir);

  let allProblems = [];
  const topicCounts = {};
  const difficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const companyCounts = {};
  const levelRows = [];
  let globalOrder = 1;

  for (const bp of ROADMAP_BLUEPRINT) {
    const loaded = levelMap.get(bp.level_number);
    const problemsForLevel = loaded ? loaded.problems : [];
    const theoryForLevel = loaded ? loaded.theoryModules : [];
    const revisionForLevel = loaded ? loaded.revisionData : {};
    const isUnlocked = Boolean(loaded && problemsForLevel.length > 0);

    levelRows.push({
      level_number: bp.level_number,
      title: bp.title,
      subtitle: bp.subtitle,
      description: bp.description,
      target_problem_count: problemsForLevel.length > 0 ? problemsForLevel.length : bp.target_problem_count,
      is_unlocked: isUnlocked,
      theory_modules: theoryForLevel,
      revision_data: revisionForLevel,
      meta: loaded ? loaded.meta : {},
    });

    for (const p of problemsForLevel) {
      const diff = normalizeDifficulty(p.difficulty);
      topicCounts[p.topic] = (topicCounts[p.topic] || 0) + 1;
      difficultyCounts[diff] = (difficultyCounts[diff] || 0) + 1;
      for (const c of Array.isArray(p.company_tags) ? p.company_tags : []) {
        companyCounts[c] = (companyCounts[c] || 0) + 1;
      }

      allProblems.push({
        problem_code: String(p.id).trim(),
        order_index: globalOrder++,
        level_number: Number(p.level || bp.level_number),
        batch_name: p.batch_name || null,
        topic: String(p.topic || 'General').trim(),
        title: String(p.title || '').trim(),
        difficulty: diff,
        company_tags: Array.isArray(p.company_tags) ? p.company_tags : [],
        problem_statement: String(p.problem_statement || ''),
        description: String(p.description || ''),
        constraints: Array.isArray(p.constraints) ? p.constraints : [],
        test_cases: Array.isArray(p.test_cases) ? p.test_cases : [],
        theory: String(p.theory || ''),
        brute_force: p.brute_force && typeof p.brute_force === 'object' ? p.brute_force : {},
        optimized: p.optimized && typeof p.optimized === 'object' ? p.optimized : {},
        explanation: String(p.explanation || ''),
        edge_cases: Array.isArray(p.edge_cases) ? p.edge_cases : [],
      });
    }
  }

  console.log(`Loaded ${allProblems.length} problems across ${levelMap.size} unlocked level(s).`);

  const metadata = {
    source: 'DSA for Freshers: Mid-level & Product Company Roadmap (Levels 1–5)',
    language_for_code: 'C++17',
    language_for_explanations: 'Hinglish',
    total_count: allProblems.length,
    planned_total_count: ROADMAP_BLUEPRINT.reduce((acc, l) => acc + l.target_problem_count, 0),
    unlocked_levels: Array.from(levelMap.keys()).sort((a, b) => a - b),
    levels: levelRows.map((l) => ({
      level_number: l.level_number,
      title: l.title,
      subtitle: l.subtitle,
      target_problem_count: l.target_problem_count,
      is_unlocked: l.is_unlocked,
      theory_count: l.theory_modules.length,
    })),
    difficulties: difficultyCounts,
    topics: Object.entries(topicCounts).map(([name, count]) => ({ name, count })),
    top_companies: Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count })),
  };

  const pgUpsert = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });
  let sheetId;
  try {
    const existingRows = await pgUpsert`SELECT id FROM public.coding_sheets WHERE slug = ${SHEET_SLUG} LIMIT 1`;
    if (existingRows.length > 0) {
      sheetId = existingRows[0].id;
      await pgUpsert`
        UPDATE public.coding_sheets
        SET title = ${SHEET_TITLE},
            description = ${SHEET_DESCRIPTION},
            sheet_type = 'ROADMAP',
            is_public = true,
            enrollment_access = 'public',
            metadata = ${pgUpsert.json(metadata)},
            updated_at = NOW()
        WHERE id = ${sheetId}
      `;
      console.log(`Updated existing ROADMAP sheet: ${sheetId}`);
    } else {
      const inserted = await pgUpsert`
        INSERT INTO public.coding_sheets (
          title, description, slug, sheet_type, is_public, published_at,
          enrollment_access, enrollment_passcode, created_by, metadata
        ) VALUES (
          ${SHEET_TITLE}, ${SHEET_DESCRIPTION}, ${SHEET_SLUG}, 'ROADMAP', true, NOW(),
          'public', NULL, ${CREATOR_USER_ID}, ${pgUpsert.json(metadata)}
        )
        RETURNING id
      `;
      sheetId = inserted[0].id;
      console.log(`Created new ROADMAP sheet: ${sheetId}`);
    }

    const supabaseUpsert = createClient(SUPABASE_URL, SERVICE_KEY);

    const levelPayload = levelRows.map((l) => ({
      sheet_id: sheetId,
      ...l,
    }));
    const { error: lvlErr } = await supabaseUpsert
      .from('coding_sheet_roadmap_levels')
      .upsert(levelPayload, { onConflict: 'sheet_id,level_number' });
    if (lvlErr) throw lvlErr;
    console.log(`Upserted ${levelPayload.length} roadmap levels (1..5).`);

    const BATCH_SIZE = 50;
    const problemPayload = allProblems.map((p) => ({
      sheet_id: sheetId,
      ...p,
    }));
    for (let i = 0; i < problemPayload.length; i += BATCH_SIZE) {
      const batch = problemPayload.slice(i, i + BATCH_SIZE);
      const { error: probErr } = await supabaseUpsert
        .from('coding_sheet_roadmap_problems')
        .upsert(batch, { onConflict: 'sheet_id,problem_code' });
      if (probErr) throw probErr;
      console.log(`Upserted problem batch ${i + 1}..${Math.min(i + BATCH_SIZE, problemPayload.length)}`);
    }

    const typeCheck = await pgUpsert`
      SELECT
        COUNT(*) FILTER (WHERE jsonb_typeof(company_tags) = 'string') AS bad_tags,
        COUNT(*) FILTER (WHERE jsonb_typeof(constraints) = 'string') AS bad_cons,
        COUNT(*) FILTER (WHERE jsonb_typeof(test_cases) = 'string') AS bad_tc,
        COUNT(*) FILTER (WHERE jsonb_typeof(brute_force) = 'string') AS bad_bf,
        COUNT(*) FILTER (WHERE jsonb_typeof(optimized) = 'string') AS bad_opt,
        COUNT(*) FILTER (WHERE jsonb_typeof(edge_cases) = 'string') AS bad_ec
      FROM public.coding_sheet_roadmap_problems
      WHERE sheet_id = ${sheetId}
    `;
    console.log('JSONB type check on problems (all must be 0):', typeCheck[0]);

    const lvlTypeCheck = await pgUpsert`
      SELECT
        COUNT(*) FILTER (WHERE jsonb_typeof(theory_modules) = 'string') AS bad_theory,
        COUNT(*) FILTER (WHERE jsonb_typeof(revision_data) = 'string') AS bad_rev,
        COUNT(*) FILTER (WHERE jsonb_typeof(meta) = 'string') AS bad_meta
      FROM public.coding_sheet_roadmap_levels
      WHERE sheet_id = ${sheetId}
    `;
    console.log('JSONB type check on levels (all must be 0):', lvlTypeCheck[0]);

    await pgUpsert`NOTIFY pgrst, 'reload schema'`;
  } finally {
    await pgUpsert.end();
  }

  const supabaseVerify = createClient(SUPABASE_URL, SERVICE_KEY);
  const { count: probCount, error: pCountErr } = await supabaseVerify
    .from('coding_sheet_roadmap_problems')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', sheetId);
  if (pCountErr) throw pCountErr;

  const { count: lvlCount, error: lCountErr } = await supabaseVerify
    .from('coding_sheet_roadmap_levels')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', sheetId);
  if (lCountErr) throw lCountErr;

  console.log(`\nDONE! "${SHEET_TITLE}" (id=${sheetId}, slug=${SHEET_SLUG}) -> ${lvlCount} levels, ${probCount} active problems in Supabase.`);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

