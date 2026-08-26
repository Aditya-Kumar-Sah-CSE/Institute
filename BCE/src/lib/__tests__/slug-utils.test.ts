import { slugifyTitle } from '../slug-utils';

function runTests() {
  console.log('Testing slugifyTitle...');

  const tests = [
    { input: 'Two Sum', expected: 'two-sum' },
    { input: 'Recursion & Backtracking', expected: 'recursion-and-backtracking' },
    { input: '  Graph / BFS  ', expected: 'graph-bfs' },
    { input: 'Binary Search (Advanced!)', expected: 'binary-search-advanced' },
    { input: '  --  Multiple --- Hyphens  --  ', expected: 'multiple-hyphens' },
    { input: 'Café & Résumé', expected: 'cafe-and-resume' },
    { input: '', expected: 'coding-sheet' },
    { input: '   ', expected: 'coding-sheet' },
  ];

  let passed = 0;
  for (const t of tests) {
    const actual = slugifyTitle(t.input);
    if (actual === t.expected) {
      console.log(`✓ "${t.input}" -> "${actual}"`);
      passed++;
    } else {
      console.error(`✗ FAIL: "${t.input}" -> expected "${t.expected}", got "${actual}"`);
    }
  }

  console.log(`Result: ${passed}/${tests.length} tests passed.`);
  if (passed !== tests.length) {
    process.exit(1);
  }
}

runTests();
