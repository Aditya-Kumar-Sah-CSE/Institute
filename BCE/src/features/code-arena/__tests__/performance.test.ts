import { wrapCodeWithHarness } from '../harness';
import {
  getCachedProblemSignature,
  setCachedProblemSignature,
  getCachedHiddenTests,
  setCachedHiddenTests,
} from '../judge';

function runPerformanceTests() {
  console.log('Testing Code Arena Performance & Caching Infrastructure...');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`✓ ${msg}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${msg}`);
    }
  }

  // 1. Signature Caching Latency Benchmark
  const dummySignature = {
    name: 'twoSum',
    params: [
      { name: 'nums', type: 'integer[]' },
      { name: 'target', type: 'integer' },
    ],
    return: { type: 'integer[]' },
  };

  const probId = 'test-prob-123';
  setCachedProblemSignature(probId, dummySignature);

  const startCacheLookup = performance.now();
  const cachedSig = getCachedProblemSignature(probId);
  const cacheLookupTime = performance.now() - startCacheLookup;

  assert(cachedSig !== null && cachedSig.name === 'twoSum', 'Problem signature retrieved from in-memory cache');
  assert(cacheLookupTime < 1, `In-memory metadata cache lookup latency is < 1ms (actual: ${cacheLookupTime.toFixed(3)}ms)`);

  // 2. Testcases Caching Benchmark
  const dummyTests = [
    { input: '[2,7,11,15]\n9', expected_output: '[0,1]' },
    { input: '[3,2,4]\n6', expected_output: '[1,2]' },
  ];
  setCachedHiddenTests(probId, dummyTests);
  const cachedTests = getCachedHiddenTests(probId);
  assert(cachedTests !== null && cachedTests.length === 2, 'Hidden testcases retrieved from in-memory cache');

  // 3. Driver Harness Generation Benchmark
  const studentCode = `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        vector<int> res;
        for (int i = 0; i < nums.size(); i++) {
            for (int j = i + 1; j < nums.size(); j++) {
                if (nums[j] == target - nums[i]) {
                    res.push_back(i);
                    res.push_back(j);
                }
            }
        }
        return res;
    }
};`;

  const startHarnessGen = performance.now();
  const wrappedCode = wrapCodeWithHarness(studentCode, dummySignature, 'cpp');
  const harnessGenTime = performance.now() - startHarnessGen;

  assert(wrappedCode.length > studentCode.length, 'Driver harness successfully generated');
  assert(harnessGenTime < 5, `Driver harness generation latency is < 5ms (actual: ${harnessGenTime.toFixed(3)}ms)`);
  assert(wrappedCode.includes('HarnessParser::parseIntegerArray(cin)'), 'Generated harness uses scoped HarnessParser');

  console.log(`Summary: ${passed}/${total} performance benchmark tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runPerformanceTests();
