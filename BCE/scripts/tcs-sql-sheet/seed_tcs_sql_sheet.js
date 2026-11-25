const fs = require('fs');
const path = require('path');
const postgres = require('postgres');
const { createClient } = require('@supabase/supabase-js');

// 1. Load .env
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

const SHEET_SLUG = 'tcs-sql-mastery-530';
const SHEET_TITLE = 'TCS SQL Mastery Sheet (530+ MCQ & Queries)';
const SHEET_DESCRIPTION =
  'Complete TCS NQT, Digital & Prime SQL Preparation Sheet — 382 MCQs across 11 core DBMS/SQL modules + 148 Step-by-Step Query Challenges with Clause Breakdowns, Live In-Browser SQL Playground, Schema Reference, Dialect Notes (MySQL / PostgreSQL / SQL Server / Oracle), and Quick Revision Cheat Sheet.';
const CREATOR_USER_ID = 'd175f6b1-ef9d-428a-8a26-14365a624ae9';

function deriveDifficulty(q) {
  const sec = (q.section || '').toLowerCase();
  if (
    sec.includes('part 1:') ||
    sec.includes('part 2:') ||
    sec.includes('part 3:') ||
    sec.includes('part 4:') ||
    sec.includes('query practice 1:') ||
    sec.includes('query practice 2:')
  ) {
    return 'EASY';
  }
  if (
    sec.includes('part 9:') ||
    sec.includes('part 10:') ||
    sec.includes('part 11:') ||
    sec.includes('query practice 7:') ||
    sec.includes('query practice 8:')
  ) {
    return 'HARD';
  }
  return 'MEDIUM';
}

async function run() {
  // Step 1: Apply SQL migration 145
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/145_tcs_sql_mastery_sheet.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration 145_tcs_sql_mastery_sheet.sql...');
  const pgSql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });
  try {
    await pgSql.unsafe(migrationSql);
    console.log('Migration 145 applied cleanly.');
  } finally {
    await pgSql.end();
  }

  // Wait for PostgREST schema cache reload notification to settle
  await new Promise((r) => setTimeout(r, 2500));

  // Step 2: Load 530 SQL questions JSON
  const jsonPath = path.resolve(__dirname, '../../src/features/code-arena/data/tcs-sql-mastery.json');
  const dataset = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const questions = Array.isArray(dataset.questions) ? dataset.questions : [];

  console.log(`Loaded ${questions.length} SQL questions (MCQs: ${dataset.mcq_count}, Queries: ${dataset.query_count}).`);
  if (questions.length !== 530) {
    throw new Error(`Expected 530 questions, found ${questions.length}`);
  }

  // Build section summary for metadata
  const sectionCounts = {};
  questions.forEach((q) => {
    sectionCounts[q.section] = (sectionCounts[q.section] || 0) + 1;
  });

  const metadata = {
    source: 'SQL Mastery for TCS & IT Interviews',
    total_count: questions.length,
    mcq_count: questions.filter((q) => q.type === 'MCQ').length,
    query_count: questions.filter((q) => q.type === 'QUERY').length,
    sections: Object.entries(sectionCounts).map(([name, count]) => ({ name, count })),
  };

  // Step 3: Upsert sheet directly in Postgres (guaranteed immediate visibility even before pgrst cache)
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
            sheet_type = 'SQL',
            is_public = true,
            enrollment_access = 'public',
            metadata = ${pgUpsert.json(metadata)},
            updated_at = NOW()
        WHERE id = ${sheetId}
      `;
      console.log(`Updated existing SQL sheet: ${sheetId}`);
    } else {
      const inserted = await pgUpsert`
        INSERT INTO public.coding_sheets (
          title, description, slug, sheet_type, is_public, published_at,
          enrollment_access, enrollment_passcode, created_by, metadata
        ) VALUES (
          ${SHEET_TITLE}, ${SHEET_DESCRIPTION}, ${SHEET_SLUG}, 'SQL', true, NOW(),
          'public', NULL, ${CREATOR_USER_ID}, ${pgUpsert.json(metadata)}
        )
        RETURNING id
      `;
      sheetId = inserted[0].id;
      console.log(`Created new SQL sheet: ${sheetId}`);
    }

    // Step 4: Batch upsert all 530 questions cleanly via Postgres
    const rows = questions.map((q) => ({
      sheet_id: sheetId,
      question_number: q.id,
      type: q.type,
      section: q.section,
      difficulty: deriveDifficulty(q),
      question: q.question,
      options: q.options ? JSON.stringify(q.options) : null,
      correct_option: q.correct_option || null,
      correct_answer: q.correct_answer || null,
      solution_sql: q.solution_sql || null,
      basic_concepts: JSON.stringify(Array.isArray(q.basic_concepts) ? q.basic_concepts : []),
      explanation_points: JSON.stringify(Array.isArray(q.explanation_points) ? q.explanation_points : []),
      incorrect_options: JSON.stringify(q.incorrect_options || {}),
      step_by_step: JSON.stringify(Array.isArray(q.step_by_step) ? q.step_by_step : []),
      clause_breakdown: JSON.stringify(Array.isArray(q.clause_breakdown) ? q.clause_breakdown : []),
    }));

    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      for (const r of batch) {
        await pgUpsert`
          INSERT INTO public.coding_sheet_sql_questions (
            sheet_id, question_number, type, section, difficulty, question,
            options, correct_option, correct_answer, solution_sql,
            basic_concepts, explanation_points, incorrect_options, step_by_step, clause_breakdown
          ) VALUES (
            ${r.sheet_id}, ${r.question_number}, ${r.type}, ${r.section}, ${r.difficulty}, ${r.question},
            ${r.options}::jsonb, ${r.correct_option}, ${r.correct_answer}, ${r.solution_sql},
            ${r.basic_concepts}::jsonb, ${r.explanation_points}::jsonb, ${r.incorrect_options}::jsonb, ${r.step_by_step}::jsonb, ${r.clause_breakdown}::jsonb
          )
          ON CONFLICT (sheet_id, question_number) DO UPDATE SET
            type = EXCLUDED.type,
            section = EXCLUDED.section,
            difficulty = EXCLUDED.difficulty,
            question = EXCLUDED.question,
            options = EXCLUDED.options,
            correct_option = EXCLUDED.correct_option,
            correct_answer = EXCLUDED.correct_answer,
            solution_sql = EXCLUDED.solution_sql,
            basic_concepts = EXCLUDED.basic_concepts,
            explanation_points = EXCLUDED.explanation_points,
            incorrect_options = EXCLUDED.incorrect_options,
            step_by_step = EXCLUDED.step_by_step,
            clause_breakdown = EXCLUDED.clause_breakdown
        `;
      }
      console.log(`Upserted batch ${i + 1}..${Math.min(i + BATCH_SIZE, rows.length)}`);
    }

    await pgUpsert`NOTIFY pgrst, 'reload schema'`;
  } finally {
    await pgUpsert.end();
  }

  // Step 5: Verify via Supabase REST
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { count: dbCount, error: countErr } = await supabase
    .from('coding_sheet_sql_questions')
    .select('id', { count: 'exact', head: true })
    .eq('sheet_id', sheetId);
  if (countErr) throw countErr;

  console.log(`\nDONE! Sheet "${SHEET_TITLE}" (id=${sheetId}, slug=${SHEET_SLUG}) has ${dbCount} questions in Supabase.`);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
