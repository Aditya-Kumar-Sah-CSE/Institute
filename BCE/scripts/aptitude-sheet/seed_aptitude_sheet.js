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

const SHEET_SLUG = 'placement-aptitude-mastery-1139';
const SHEET_TITLE = 'Placement Aptitude Mastery Sheet (1,139 MCQs · 29 Chapters)';
const SHEET_DESCRIPTION =
  'Complete Campus & Off-Campus Placement Aptitude Workbook — 1,139 Basic/Medium/Advance MCQs across 19 Quantitative Aptitude, 7 Logical Reasoning & 3 Verbal Ability Chapters with Theory Concepts, Short Tricks, Solved Examples, Step-by-Step Solutions, Wrong-Question Revision Queue & 1-Min/Q Timed Mock Tests.';
const CREATOR_USER_ID = 'd175f6b1-ef9d-428a-8a26-14365a624ae9';

async function run() {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/149_aptitude_mastery_sheet.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration 149_aptitude_mastery_sheet.sql...');
  const pgSql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });
  try {
    await pgSql.unsafe(migrationSql);
    console.log('Migration 149 applied cleanly.');
  } finally {
    await pgSql.end();
  }

  await new Promise((r) => setTimeout(r, 2000));

  const jsonPath = path.resolve(__dirname, '../../src/features/code-arena/data/placement-aptitude-mastery.json');
  const dataset = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const chapters = Array.isArray(dataset.chapters) ? dataset.chapters : [];
  const questions = Array.isArray(dataset.questions) ? dataset.questions : [];

  console.log(`Loaded ${chapters.length} chapters and ${questions.length} aptitude questions.`);
  if (chapters.length !== 29 || questions.length !== 1139) {
    throw new Error(`Expected 29 chapters & 1139 questions, got ${chapters.length} chapters & ${questions.length} questions`);
  }

  const metadata = {
    source: 'Placement Aptitude Practice Book',
    total_count: questions.length,
    chapter_count: chapters.length,
    categories: dataset.categories || [],
  };

  const pgUpsert = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });
  let sheetId;
  try {
    const existing = await pgUpsert`SELECT id FROM public.coding_sheets WHERE slug = ${SHEET_SLUG} LIMIT 1`;
    if (existing.length > 0) {
      sheetId = existing[0].id;
      await pgUpsert`
        UPDATE public.coding_sheets
        SET title = ${SHEET_TITLE},
            description = ${SHEET_DESCRIPTION},
            sheet_type = 'APTITUDE',
            is_public = true,
            enrollment_access = 'public',
            metadata = ${pgUpsert.json(metadata)},
            updated_at = NOW()
        WHERE id = ${sheetId}
      `;
    } else {
      const inserted = await pgUpsert`
        INSERT INTO public.coding_sheets (
          title, description, slug, sheet_type, is_public, published_at,
          enrollment_access, enrollment_passcode, created_by, metadata
        ) VALUES (
          ${SHEET_TITLE}, ${SHEET_DESCRIPTION}, ${SHEET_SLUG}, 'APTITUDE', true, NOW(),
          'public', NULL, ${CREATOR_USER_ID}, ${pgUpsert.json(metadata)}
        )
        RETURNING id
      `;
      sheetId = inserted[0].id;
    }
  } finally {
    await pgUpsert.end();
  }

  console.log(`Aptitude Sheet ID: ${sheetId} (slug: ${SHEET_SLUG})`);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Sync 29 Chapters
  const chapterRows = chapters.map((ch) => ({
    sheet_id: sheetId,
    chapter_number: ch.chapter_number,
    title: ch.title,
    category: ch.category,
    question_count: ch.question_count,
    start_q: ch.start_q,
    end_q: ch.end_q,
    theory: ch.theory || [],
    short_tricks: ch.short_tricks || [],
    solved_example: ch.solved_example || '',
  }));

  const { error: chErr } = await supabase
    .from('coding_sheet_aptitude_chapters')
    .upsert(chapterRows, { onConflict: 'sheet_id,chapter_number' });
  if (chErr) throw chErr;
  console.log(`Synced ${chapterRows.length} chapters.`);

  // Remove any stale question numbers above total and upsert in batches
  await supabase
    .from('coding_sheet_aptitude_questions')
    .delete()
    .eq('sheet_id', sheetId)
    .gt('question_number', questions.length);

  const BATCH_SIZE = 250;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const chunk = questions.slice(i, i + BATCH_SIZE).map((q) => ({
      sheet_id: sheetId,
      question_number: q.question_number,
      chapter_number: q.chapter_number,
      chapter_question_number: q.chapter_question_number,
      category: q.category,
      section: q.section,
      chapter_title: q.chapter_title,
      level_label: q.level_label,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options || {},
      correct_option: q.correct_option,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
    }));

    const { error: qErr } = await supabase
      .from('coding_sheet_aptitude_questions')
      .upsert(chunk, { onConflict: 'sheet_id,question_number' });
    if (qErr) throw qErr;
    console.log(`Upserted questions ${i + 1}..${Math.min(i + BATCH_SIZE, questions.length)}`);
  }

  console.log(`\nDONE! Seeded Placement Aptitude Mastery Sheet (${sheetId}): 29 chapters, 1,139 questions.`);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

