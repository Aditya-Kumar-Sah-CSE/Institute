import { resolveClientFastPath } from '../ai/client-fast-path';
import { normalizeQuery } from '../ai/entity-resolver';

/**
 * Regression Test Suite for DSA Sheet Navigation Resolution Chain.
 * Ensures specific sheet commands NEVER fall back to generic DSA sheet listing.
 */
function runNavigationTests() {
  console.log('=== Running DSA Sheet Navigation Resolution Tests ===\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    }
  }

  // 1. Test basic <-> basics lexical normalization equivalence & scoreMatch
  const norm1 = normalizeQuery('Leetcode 100 Basic Sheet kholo');
  const norm2 = normalizeQuery('Leetcode 100 Basics');
  assert(norm1.includes('basics') && norm2.includes('basics'), 'Lexical equivalence: basic <-> basics normalization');

  // Mock DOM cards
  const sampleCards = [
    { id: 'sheet_1', title: 'Leetcode 100 Basics', actionableElementIds: ['btn_1'] },
    { id: 'sheet_2', title: 'Leetcode 100 Intermediate', actionableElementIds: ['btn_2'] },
    { id: 'sheet_3', title: 'Striver 75', actionableElementIds: ['btn_3'] },
    { id: 'sheet_4', title: 'Blind 75', actionableElementIds: ['btn_4'] }
  ];

  // Mock interactive DOM elements
  const sampleElements = [
    { id: 'btn_1', text: 'View Sheet', parentCardTitle: 'Leetcode 100 Basics' },
    { id: 'btn_2', text: 'View Sheet', parentCardTitle: 'Leetcode 100 Intermediate' },
    { id: 'btn_3', text: 'View Sheet', parentCardTitle: 'Striver 75' },
    { id: 'btn_4', text: 'View Sheet', parentCardTitle: 'Blind 75' }
  ];

  const mockLiveContext = {
    snapshot: {
      cards: sampleCards,
      elementsList: sampleElements,
      actionableElements: sampleElements,
      elementsMap: new Map()
    }
  } as any;

  // 2. Test Specific Sheet Resolution on Live DOM
  const testCasesSpecific = [
    { prompt: 'Leetcode 100 Basics kholo', expectedTarget: 'btn_1' },
    { prompt: 'Leetcode 100 Basic Sheet kholo', expectedTarget: 'btn_1' },
    { prompt: 'open Leetcode 100 Basics', expectedTarget: 'btn_1' },
    { prompt: 'leetcode 100 basics open karo', expectedTarget: 'btn_1' },
    { prompt: 'Leetcode 100 Intermediate kholo', expectedTarget: 'btn_2' },
    { prompt: 'Striver 75 kholo', expectedTarget: 'btn_3' },
    { prompt: 'Blind 75 kholo', expectedTarget: 'btn_4' }
  ];

  for (const tc of testCasesSpecific) {
    const res = resolveClientFastPath(tc.prompt, 'student', undefined, mockLiveContext);
    const isTargetCorrect = res?.isMatch && res?.clientAction === 'interact' && res?.interactArgs?.targetText === tc.expectedTarget;
    assert(Boolean(isTargetCorrect), `Specific Sheet: "${tc.prompt}"`, `targetText = ${res?.interactArgs?.targetText}`);
  }

  // 3. Test Generic List Resolution
  const testCasesGeneric = [
    'open DSA sheets',
    'DSA sheets dikhao',
    'coding sheets kholo'
  ];

  for (const prompt of testCasesGeneric) {
    const res = resolveClientFastPath(prompt, 'student', undefined, mockLiveContext);
    const isGenericRoute = res?.isMatch && res?.targetRoute === '/code-arena/sheets';
    assert(Boolean(isGenericRoute), `Generic List: "${prompt}"`, `route = ${res?.targetRoute}`);
  }

  // 4. Test Ambiguity Detection
  const ambRes = resolveClientFastPath('Leetcode 100 kholo', 'student', undefined, mockLiveContext);
  assert(Boolean(ambRes?.isMatch && ambRes?.isAmbiguous), 'Ambiguous query: "Leetcode 100 kholo"');

  // 5. Test Nonexistent Sheet (MUST NOT open generic list)
  const nonExistentRes = resolveClientFastPath('NonExistentSheet 999 kholo', 'student', undefined, undefined);
  const didNotFallbackToGeneric = !nonExistentRes?.isMatch || nonExistentRes?.targetRoute !== '/code-arena/sheets';
  assert(didNotFallbackToGeneric, 'Fallback protection: "NonExistentSheet 999 kholo" MUST NOT open generic list');

  console.log(`\n=== Results: ${passed}/${total} tests passed ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runNavigationTests();
