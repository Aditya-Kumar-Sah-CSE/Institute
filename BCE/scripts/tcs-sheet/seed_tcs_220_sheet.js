// BCE/scripts/tcs-sheet/seed_tcs_220_sheet.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Parse .env
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Load all 14 group files
const groupFiles = [
  'group1_fundamentals.js',
  'group2_number_theory.js',
  'group3_arrays.js',
  'group4_strings.js',
  'group5_sorting_searching.js',
  'group6_matrix.js',
  'group7_hashing_subarrays.js',
  'group8_two_pointers_sliding.js',
  'group9_recursion_backtracking.js',
  'group10_stack_queue.js',
  'group11_linked_lists.js',
  'group12_trees_bst.js',
  'group13_graphs.js',
  'group14_greedy_dp.js'
];

let allProblems = [];
for (const file of groupFiles) {
  const proms = require(path.join(__dirname, file));
  allProblems.push(...proms);
}

console.log(`Loaded ${allProblems.length} problems across ${groupFiles.length} groups.`);
if (allProblems.length !== 220) {
  console.error(`Expected 220 problems, but loaded ${allProblems.length}! Aborting.`);
  process.exit(1);
}

const SUPER_ADMIN_USER_ID = 'd175f6b1-ef9d-428a-8a26-14365a624ae9';
const SHEET_SLUG = 'tcs-coding-preparation-220';
const SHEET_TITLE = 'TCS Coding Preparation (220 Problems)';

async function seedSheet() {
  console.log('\n--- Step 1: Ensure Sheet Exists ---');
  let { data: existingSheet, error: sheetFindErr } = await supabase
    .from('coding_sheets')
    .select('*')
    .eq('slug', SHEET_SLUG)
    .maybeSingle();

  if (sheetFindErr) {
    console.error('Error finding sheet:', sheetFindErr);
    process.exit(1);
  }

  let sheetId;
  if (!existingSheet) {
    console.log(`Sheet "${SHEET_TITLE}" not found. Creating new sheet...`);
    const { data: newSheet, error: createSheetErr } = await supabase
      .from('coding_sheets')
      .insert({
        title: SHEET_TITLE,
        description: 'Comprehensive 220-problem TCS Coding Preparation Sheet covering Programming Fundamentals, Number Theory, Arrays, Strings, Sorting & Searching, Matrix, Hashing, Two Pointers & Sliding Window, Recursion & Backtracking, Stack & Queue, Linked Lists, Trees & BST, Graphs, and Greedy & Dynamic Programming.',
        slug: SHEET_SLUG,
        is_public: true,
        enrollment_access: 'public',
        enrollment_passcode: null,
        created_by: SUPER_ADMIN_USER_ID,
        attachment_type: 'pdf'
      })
      .select()
      .single();

    if (createSheetErr) {
      console.error('Failed to create sheet:', createSheetErr);
      process.exit(1);
    }
    sheetId = newSheet.id;
    console.log(`Created new sheet with ID: ${sheetId}`);
  } else {
    sheetId = existingSheet.id;
    console.log(`Found existing sheet: ${sheetId}`);
  }

  console.log('\n--- Step 2: Upsert Problems & Test Cases in Batches ---');
  let totalProblemsProcessed = 0;
  let totalTestCasesInserted = 0;

  // Process in batches of 10 problems
  const BATCH_SIZE = 10;
  for (let i = 0; i < allProblems.length; i += BATCH_SIZE) {
    const chunk = allProblems.slice(i, i + BATCH_SIZE);

    for (const prob of chunk) {
      const problemData = {
        title: prob.title,
        slug: prob.slug,
        description: prob.description,
        difficulty: prob.difficulty,
        tags: prob.tags,
        constraints: prob.constraints,
        input_format: prob.input_format,
        output_format: prob.output_format,
        time_limit_ms: 2000,
        memory_limit_mb: 256,
        supported_languages: ['cpp17', 'c', 'java', 'python', 'javascript'],
        source_type: 'INTERNAL',
        external_platform: null,
        external_problem_id: prob.external_problem_id,
        is_published: true,
        created_by: SUPER_ADMIN_USER_ID,
        starter_code: prob.starter_code || {},
        metadata: {
          source: 'TCS',
          group_topic: prob.tags[0] || 'TCS Preparation',
          question_number: prob.num
        }
      };

      // Check if problem already exists by slug or external_problem_id
      const { data: existingProb } = await supabase
        .from('coding_problems')
        .select('id')
        .eq('slug', prob.slug)
        .maybeSingle();

      let problemId;
      if (existingProb) {
        problemId = existingProb.id;
        // Update
        const { error: updateErr } = await supabase
          .from('coding_problems')
          .update(problemData)
          .eq('id', problemId);
        if (updateErr) {
          console.error(`Error updating problem ${prob.num}:`, updateErr);
        }
      } else {
        // Insert
        const { data: insertedProb, error: insertErr } = await supabase
          .from('coding_problems')
          .insert(problemData)
          .select('id')
          .single();
        if (insertErr) {
          console.error(`Error inserting problem ${prob.num}:`, insertErr);
          continue;
        }
        problemId = insertedProb.id;
      }

      // Test cases: delete existing and insert new
      await supabase
        .from('coding_problem_test_cases')
        .delete()
        .eq('problem_id', problemId);

      const tcPayload = prob.testCases.map((tc, tIdx) => ({
        problem_id: problemId,
        input: tc.input,
        expected_output: tc.expected_output,
        is_hidden: tc.is_hidden,
        sample_name: tc.sample_name || `Testcase ${tIdx + 1}`,
        order_index: tIdx
      }));

      const { error: tcErr } = await supabase
        .from('coding_problem_test_cases')
        .insert(tcPayload);

      if (tcErr) {
        console.error(`Error inserting test cases for problem ${prob.num}:`, tcErr);
      } else {
        totalTestCasesInserted += tcPayload.length;
      }

      // Link to coding_sheet_problems
      const { error: linkErr } = await supabase
        .from('coding_sheet_problems')
        .upsert(
          {
            sheet_id: sheetId,
            problem_id: problemId,
            order_index: prob.num - 1
          },
          { onConflict: 'sheet_id,problem_id' }
        );

      if (linkErr) {
        console.error(`Error linking problem ${prob.num} to sheet:`, linkErr);
      }

      totalProblemsProcessed++;
    }

    console.log(`Processed ${Math.min(i + BATCH_SIZE, allProblems.length)} / ${allProblems.length} problems...`);
  }

  console.log('\n--- Step 3: Verification ---');
  const { count: linkedCount, error: countErr } = await supabase
    .from('coding_sheet_problems')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheetId);

  const { count: totalTcsProbs } = await supabase
    .from('coding_problems')
    .select('*', { count: 'exact', head: true })
    .like('slug', 'tcs-%');

  console.log(`\n================ SEED COMPLETE ================`);
  console.log(`Sheet: ${SHEET_TITLE}`);
  console.log(`Slug: ${SHEET_SLUG}`);
  console.log(`Sheet ID: ${sheetId}`);
  console.log(`Total TCS problems in database: ${totalTcsProbs}`);
  console.log(`Total problems linked to sheet: ${linkedCount}`);
  console.log(`Total test cases inserted: ${totalTestCasesInserted}`);
  console.log(`===============================================`);
}

seedSheet().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
