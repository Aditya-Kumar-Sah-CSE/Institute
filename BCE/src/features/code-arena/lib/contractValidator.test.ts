import { validateContract, compareValues, resolveContract, parseExpectedOutput } from './contractValidator';
import type { ProblemSignature } from '../types';

function runTests() {
  console.log('--- RUNNING UNIVERSAL CONTRACT VALIDATOR TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`, detail || '');
      failed++;
    }
  }

  // 1. Remove Element: Return + Mutated Array (Unordered)
  const removeElementSig: ProblemSignature = {
    name: 'removeElement',
    params: [
      { name: 'nums', type: 'number[]', mutated: true },
      { name: 'val', type: 'number' },
    ],
    return: { type: 'number' },
    outputContract: {
      type: 'return_and_mutation',
      targetParam: 'nums',
      lengthRef: 'return_value',
      ordering: 'unordered',
    },
  };

  const removeElementResult = validateContract(
    removeElementSig,
    {
      returnValue: 5,
      afterState: { nums: [0, 1, 4, 0, 3, 2, 2, 2], val: 2 },
    },
    '5, nums = [0,1,4,0,3]'
  );

  assert(
    removeElementResult.passed,
    'Remove Element: valid permutation of first 5 elements passes',
    removeElementResult.mismatchInfo
  );

  assert(
    removeElementResult.actualFormatted.includes('k = 5'),
    'Remove Element: actual output contains k = 5'
  );

  const removeElementWildcardResult = validateContract(
    removeElementSig,
    {
      returnValue: 2,
      afterState: { nums: [2, 2], val: 3 },
    },
    'k = 2, nums = [2,2,_,_]'
  );

  assert(
    removeElementWildcardResult.passed,
    'Remove Element: wildcard expected format [2,2,_,_] passes with user output [2,2]',
    removeElementWildcardResult.mismatchInfo
  );

  assert(
    removeElementWildcardResult.expectedFormatted.includes('[2,2]'),
    'Remove Element: expectedFormatted is cleanly sliced to first k elements [2,2]'
  );

  const removeElementWrongVal = validateContract(
    removeElementSig,
    {
      returnValue: 5,
      afterState: { nums: [0, 1, 4, 0, 9, 2, 2, 2], val: 2 },
    },
    '5, nums = [0,1,4,0,3]'
  );
  assert(!removeElementWrongVal.passed, 'Remove Element: wrong elements fail validation');

  // 2. Remove Duplicates: Return + Mutated Array (Exact Order)
  const removeDuplicatesSig: ProblemSignature = {
    name: 'removeDuplicates',
    params: [{ name: 'nums', type: 'number[]', mutated: true }],
    return: { type: 'number' },
    outputContract: {
      type: 'return_and_mutation',
      targetParam: 'nums',
      lengthRef: 'return_value',
      ordering: 'exact',
    },
  };

  const removeDuplicatesResult = validateContract(
    removeDuplicatesSig,
    {
      returnValue: 2,
      afterState: { nums: [1, 2, 2] },
    },
    '2, nums = [1, 2]'
  );
  assert(removeDuplicatesResult.passed, 'Remove Duplicates: exact order matching passes');

  const removeDuplicatesWrongOrder = validateContract(
    removeDuplicatesSig,
    {
      returnValue: 2,
      afterState: { nums: [2, 1, 2] },
    },
    '2, nums = [1, 2]'
  );
  assert(!removeDuplicatesWrongOrder.passed, 'Remove Duplicates: wrong order fails under exact ordering');

  // 3. Move Zeroes: In-Place Mutation Only (Void Return)
  const moveZeroesSig: ProblemSignature = {
    name: 'moveZeroes',
    params: [{ name: 'nums', type: 'number[]', mutated: true }],
    return: { type: 'void' },
  };

  const moveZeroesResult = validateContract(
    moveZeroesSig,
    {
      returnValue: undefined,
      afterState: { nums: [1, 3, 12, 0, 0] },
    },
    '[1, 3, 12, 0, 0]'
  );
  assert(moveZeroesResult.passed, 'Move Zeroes: void return mutated array validation');

  // 4. Floating Point Tolerance
  assert(
    compareValues(3.14159265, 3.14159, { floatTolerance: 1e-4 }),
    'Float tolerance: close values match within tolerance'
  );
  assert(
    !compareValues(3.14159265, 3.14159, { floatTolerance: 1e-6 }),
    'Float tolerance: distant values fail'
  );

  // 5. Group Anagrams: Unordered Groups
  const groupAnagramsSig: ProblemSignature = {
    name: 'groupAnagrams',
    params: [{ name: 'strs', type: 'string[]' }],
    return: { type: 'string[][]' },
    outputContract: {
      type: 'return_value',
      ordering: 'unordered_groups',
    },
  };

  const groupAnagramsResult = validateContract(
    groupAnagramsSig,
    {
      returnValue: [['nat', 'tan'], ['ate', 'eat', 'tea'], ['bat']],
      afterState: {},
    },
    '[["bat"],["nat","tan"],["ate","eat","tea"]]'
  );
  assert(groupAnagramsResult.passed, 'Group Anagrams: unordered groups pass validation');

  // 6. Auto-Inference for Untagged "Remove Element" signature
  const untaggedRemoveElementSig: ProblemSignature = {
    name: 'removeElement',
    params: [{ name: 'nums', type: 'number[]' }],
    return: { type: 'number' },
  };

  const autoInferredContract = resolveContract(untaggedRemoveElementSig, '5, nums = [0,1,4,0,3]');
  assert(
    autoInferredContract.type === 'return_and_mutation' && autoInferredContract.ordering === 'unordered',
    'Auto-inference: correctly infers return_and_mutation contract for removeElement'
  );

  console.log(`\nSUMMARY: Passed ${passed}, Failed ${failed}`);
  if (failed > 0) process.exit(1);
}

runTests();
