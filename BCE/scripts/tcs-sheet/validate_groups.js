// BCE/scripts/tcs-sheet/validate_groups.js
const files = [
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
files.forEach((f, idx) => {
  const p = require('./' + f);
  console.log(`Group ${idx + 1} (${f}): ${p.length} problems`);
  allProblems.push(...p);
});

console.log('Total problems collected:', allProblems.length);

let errors = [];
let seenNums = new Set();
let seenSlugs = new Set();
let seenExternalIds = new Set();

allProblems.forEach((p) => {
  if (seenNums.has(p.num)) errors.push(`Duplicate num: ${p.num}`);
  seenNums.add(p.num);

  if (seenSlugs.has(p.slug)) errors.push(`Duplicate slug: ${p.slug}`);
  seenSlugs.add(p.slug);

  if (seenExternalIds.has(p.external_problem_id)) errors.push(`Duplicate external_problem_id: ${p.external_problem_id}`);
  seenExternalIds.add(p.external_problem_id);

  if (!p.testCases || p.testCases.length < 5) {
    errors.push(`Problem ${p.num} has fewer than 5 test cases (${p.testCases ? p.testCases.length : 0})`);
  } else {
    p.testCases.forEach((tc, tIdx) => {
      if (tc.input === undefined || tc.expected_output === undefined) {
        errors.push(`Problem ${p.num} TC ${tIdx} missing input or expected_output`);
      }
    });
  }
});

for (let i = 1; i <= 220; i++) {
  if (!seenNums.has(i)) {
    errors.push(`Missing problem num: ${i}`);
  }
}

if (errors.length === 0) {
  console.log('SUCCESS! Exactly 220 problems validated with >= 5 test cases each. No duplicates or missing numbers.');
} else {
  console.error('Errors found:', errors);
}

