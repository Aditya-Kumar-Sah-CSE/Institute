// BCE/scripts/tcs-sheet/apply_extreme_cases.js
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

async function applyExtremeCases() {
  console.log('Loading extreme test cases JSON...');
  const jsonFilePath = path.join(__dirname, 'extreme_test_cases.json');
  const extremeData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  const items = extremeData.items;

  console.log(`Loaded ${items.length} extreme case definitions.`);
  if (items.length !== 220) {
    console.error(`Expected 220 items, got ${items.length}!`);
    process.exit(1);
  }

  // Fetch all 220 TCS problems
  console.log('Fetching TCS problems from Supabase...');
  const { data: dbProblems, error: fetchErr } = await supabase
    .from('coding_problems')
    .select('id, title, slug, external_problem_id, metadata, hints')
    .like('external_problem_id', 'tcs-%')
    .order('external_problem_id', { ascending: true });

  if (fetchErr) {
    console.error('Error fetching problems:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${dbProblems.length} TCS problems in DB.`);
  if (dbProblems.length !== 220) {
    console.warn(`Warning: DB has ${dbProblems.length} problems, expected 220.`);
  }

  // Map each problem by its index / id
  let updatedCount = 0;
  const BATCH_SIZE = 15;

  for (let i = 0; i < dbProblems.length; i += BATCH_SIZE) {
    const chunk = dbProblems.slice(i, i + BATCH_SIZE);

    for (const prob of chunk) {
      // Find matching extreme item
      // External id is e.g. "tcs-001" -> 1
      const numMatch = prob.external_problem_id.match(/tcs-(\d+)/);
      const probNum = numMatch ? parseInt(numMatch[1], 10) : (i + 1);
      const extItem = items.find(it => it.id === probNum) || items[i];

      if (!extItem) {
        console.warn(`No extreme case found for problem ${prob.external_problem_id}`);
        continue;
      }

      const mergedMetadata = {
        ...(prob.metadata || {}),
        source: 'TCS',
        group_topic: extItem.topic || (prob.metadata && prob.metadata.group_topic) || 'TCS Preparation',
        question_number: extItem.id,
        extreme_test_case: extItem.extreme_test_case,
        edge_cases: extItem.edge_cases,
        optimal_worst_case_time: extItem.optimal_worst_case_time,
        optimal_auxiliary_space: extItem.optimal_auxiliary_space,
        assumptions: extItem.assumptions
      };

      const hints = [
        `🚨 Key Edge Cases: ${extItem.edge_cases}`,
        `🧪 Extreme Stress Test Case: ${extItem.extreme_test_case}`,
        `⏱️ Target Optimal Complexity: Time: ${extItem.optimal_worst_case_time} | Auxiliary Space: ${extItem.optimal_auxiliary_space}`,
        `📌 Assumptions & Constraints: ${extItem.assumptions}`
      ];

      const { error: updateErr } = await supabase
        .from('coding_problems')
        .update({
          metadata: mergedMetadata,
          hints: hints
        })
        .eq('id', prob.id);

      if (updateErr) {
        console.error(`Error updating problem ${prob.external_problem_id}:`, updateErr);
      } else {
        updatedCount++;
      }
    }

    console.log(`Updated ${Math.min(i + BATCH_SIZE, dbProblems.length)} / ${dbProblems.length} problems...`);
  }

  console.log(`\n================ SUCCESS ================`);
  console.log(`Successfully updated ${updatedCount} / ${dbProblems.length} TCS problems with extreme test cases & complexity.`);
  console.log(`=========================================\n`);
}

applyExtremeCases().catch(err => {
  console.error('Fatal error applying extreme cases:', err);
  process.exit(1);
});

