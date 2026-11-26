/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

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
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env');
  process.exit(1);
}

const SHEET_SLUG = 'tcs-nqt-complete-prep-2027';
const SHEET_TITLE = 'TCS NQT Complete Prep & 13 Mock Tests (47 Chapters · 1,427 MCQs · 23 C++ Labs)';
const SHEET_DESCRIPTION =
  'Complete TCS NQT & Placement Syllabus Preparation: 47 Chapters (22 Quant, 16 Logical, 9 Verbal = 1,427 MCQs + Ch 35 Diagrams), 8 Timed Passage Recalls (30s/90s), 3 Formal Email Labs, 23 C++17 Coding Problems + 13 Full-Length 191-Min TCS Pattern Mock Tests with Deep Per-Paper & Cross-Mock Analytics.';
const CREATOR_USER_ID = 'd175f6b1-ef9d-428a-8a26-14365a624ae9';

async function run() {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/150_tcs_complete_prep_sheet.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  const pgSql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false }, max: 1 });
  try {
    console.log('Applying migration 150_tcs_complete_prep_sheet.sql...');
    await pgSql.unsafe(migrationSql);
    console.log('Migration 150 applied cleanly.');

    const prepPath = path.resolve(__dirname, '../../src/features/code-arena/data/tcs-syllabus-prep.json');
    const mocksPath = path.resolve(__dirname, '../../src/features/code-arena/data/tcs-mock-papers.json');
    const prep = JSON.parse(fs.readFileSync(prepPath, 'utf8'));
    const mocks = JSON.parse(fs.readFileSync(mocksPath, 'utf8'));

    const chapters = prep.chapters || [];
    const questions = prep.questions || [];
    const drills = prep.drills || [];

    console.log(`Loaded: ${chapters.length} chapters, ${questions.length} MCQs, ${drills.length} drills, ${mocks.length} mock papers.`);
    if (chapters.length !== 47 || questions.length !== 1427 || drills.length !== 34 || mocks.length !== 13) {
      throw new Error(`Unexpected counts: ch=${chapters.length}, q=${questions.length}, drills=${drills.length}, mocks=${mocks.length}`);
    }

    const metadata = {
      source: 'TCS Syllabus Edition + 13 Mock Test Papers',
      total_count: questions.length,
      chapter_count: chapters.length,
      drill_count: drills.length,
      mock_count: mocks.length,
      mock_items_total: mocks.reduce((acc, m) => acc + (m.total_items || 81), 0),
      categories: [
        { name: 'Quantitative Aptitude', chapter_count: 22, question_count: questions.filter((q) => q.category === 'Quantitative Aptitude').length },
        { name: 'Logical Reasoning', chapter_count: 16, question_count: questions.filter((q) => q.category === 'Logical Reasoning').length },
        { name: 'Verbal Ability', chapter_count: 9, question_count: questions.filter((q) => q.category === 'Verbal Ability').length },
      ],
    };

    const existing = await pgSql`SELECT id FROM public.coding_sheets WHERE slug = ${SHEET_SLUG} LIMIT 1`;
    let sheetId;
    if (existing.length > 0) {
      sheetId = existing[0].id;
      await pgSql`
        UPDATE public.coding_sheets
        SET title = ${SHEET_TITLE},
            description = ${SHEET_DESCRIPTION},
            sheet_type = 'TCS_PREP',
            is_public = true,
            enrollment_access = 'public',
            metadata = ${pgSql.json(metadata)},
            updated_at = NOW()
        WHERE id = ${sheetId}
      `;
    } else {
      const inserted = await pgSql`
        INSERT INTO public.coding_sheets (
          title, description, slug, sheet_type, is_public, published_at,
          enrollment_access, enrollment_passcode, created_by, metadata
        ) VALUES (
          ${SHEET_TITLE}, ${SHEET_DESCRIPTION}, ${SHEET_SLUG}, 'TCS_PREP', true, NOW(),
          'public', NULL, ${CREATOR_USER_ID}, ${pgSql.json(metadata)}
        )
        RETURNING id
      `;
      sheetId = inserted[0].id;
    }
    console.log(`TCS Prep Sheet ID: ${sheetId} (slug: ${SHEET_SLUG})`);

    // Upsert 47 chapters
    for (const ch of chapters) {
      await pgSql`
        INSERT INTO public.coding_sheet_tcs_chapters (
          sheet_id, chapter_number, title, category, question_count, start_q, end_q,
          theory, short_tricks, solved_example
        ) VALUES (
          ${sheetId}, ${ch.chapter_number}, ${ch.title}, ${ch.category},
          ${ch.question_count}, ${ch.start_q}, ${ch.end_q},
          ${pgSql.json(ch.theory || [])}, ${pgSql.json(ch.short_tricks || [])}, ${ch.solved_example || ''}
        )
        ON CONFLICT (sheet_id, chapter_number) DO UPDATE SET
          title = EXCLUDED.title,
          category = EXCLUDED.category,
          question_count = EXCLUDED.question_count,
          start_q = EXCLUDED.start_q,
          end_q = EXCLUDED.end_q,
          theory = EXCLUDED.theory,
          short_tricks = EXCLUDED.short_tricks,
          solved_example = EXCLUDED.solved_example
      `;
    }
    console.log(`Synced ${chapters.length} chapters.`);

    // Upsert 1,427 MCQs in batches
    const BATCH = 200;
    for (let i = 0; i < questions.length; i += BATCH) {
      const chunk = questions.slice(i, i + BATCH).map((q) => ({
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
        options: q.options,
        correct_option: q.correct_option,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        image_url: q.image_url || null,
      }));
      await pgSql`
        INSERT INTO public.coding_sheet_tcs_questions ${pgSql(
          chunk,
          'sheet_id', 'question_number', 'chapter_number', 'chapter_question_number',
          'category', 'section', 'chapter_title', 'level_label', 'difficulty',
          'question', 'options', 'correct_option', 'correct_answer', 'explanation', 'image_url'
        )}
        ON CONFLICT (sheet_id, question_number) DO UPDATE SET
          chapter_number = EXCLUDED.chapter_number,
          chapter_question_number = EXCLUDED.chapter_question_number,
          category = EXCLUDED.category,
          section = EXCLUDED.section,
          chapter_title = EXCLUDED.chapter_title,
          level_label = EXCLUDED.level_label,
          difficulty = EXCLUDED.difficulty,
          question = EXCLUDED.question,
          options = EXCLUDED.options,
          correct_option = EXCLUDED.correct_option,
          correct_answer = EXCLUDED.correct_answer,
          explanation = EXCLUDED.explanation,
          image_url = EXCLUDED.image_url
      `;
      console.log(`Upserted MCQs ${i + 1}..${Math.min(i + BATCH, questions.length)}`);
    }

    // Upsert 34 Drills
    for (const d of drills) {
      await pgSql`
        INSERT INTO public.coding_sheet_tcs_drills (
          sheet_id, drill_code, drill_type, order_index, title, difficulty,
          prompt, sample_input, sample_output, hint, solution_text, solution_code, meta
        ) VALUES (
          ${sheetId}, ${d.drill_code}, ${d.drill_type}, ${d.order_index}, ${d.title}, ${d.difficulty},
          ${d.prompt}, ${d.sample_input || ''}, ${d.sample_output || ''}, ${d.hint || ''},
          ${d.solution_text || ''}, ${d.solution_code || null}, ${pgSql.json(d.meta || {})}
        )
        ON CONFLICT (sheet_id, drill_code) DO UPDATE SET
          drill_type = EXCLUDED.drill_type,
          order_index = EXCLUDED.order_index,
          title = EXCLUDED.title,
          difficulty = EXCLUDED.difficulty,
          prompt = EXCLUDED.prompt,
          sample_input = EXCLUDED.sample_input,
          sample_output = EXCLUDED.sample_output,
          hint = EXCLUDED.hint,
          solution_text = EXCLUDED.solution_text,
          solution_code = EXCLUDED.solution_code,
          meta = EXCLUDED.meta
      `;
    }
    console.log(`Synced ${drills.length} interactive drills (Passage Recall, Email Writing, C++ Coding).`);

    // Upsert 13 Full-Length Mock Papers
    for (const m of mocks) {
      await pgSql`
        INSERT INTO public.coding_sheet_tcs_mocks (
          sheet_id, paper_number, title, total_minutes, total_items, sections, items
        ) VALUES (
          ${sheetId}, ${m.paper_number}, ${m.title}, ${m.total_minutes || 191},
          ${m.total_items || 81}, ${pgSql.json(m.sections || [])}, ${pgSql.json(m.items || [])}
        )
        ON CONFLICT (sheet_id, paper_number) DO UPDATE SET
          title = EXCLUDED.title,
          total_minutes = EXCLUDED.total_minutes,
          total_items = EXCLUDED.total_items,
          sections = EXCLUDED.sections,
          items = EXCLUDED.items
      `;
    }
    console.log(`Synced ${mocks.length} full-length TCS mock papers (${mocks.reduce((s, m) => s + m.items.length, 0)} total items).`);
    console.log('DONE! TCS NQT Complete Prep & 13 Mock Tests seeded cleanly.');
  } finally {
    await pgSql.end();
  }
}

run().catch((err) => {
  console.error('Seeder failed:', err);
  process.exit(1);
});

