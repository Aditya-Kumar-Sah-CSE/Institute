import { wrapCodeWithHarness, hasMainFunction } from '../harness';

function runHarnessTests() {
  console.log('Testing Code Arena Harness Generator...');

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

  // 1. Custom main() detection tests
  assert(hasMainFunction('int main() { return 0; }', 'cpp'), 'Detect C++ int main()');
  assert(hasMainFunction('int main (int argc, char** argv)', 'cpp17'), 'Detect C++ int main with args');
  assert(hasMainFunction('public static void main(String[] args)', 'java'), 'Detect Java main');
  assert(hasMainFunction("if __name__ == '__main__':\n    main()", 'python'), 'Detect Python __main__');
  assert(!hasMainFunction('class Solution { public: vector<int> twoSum() {} };', 'cpp'), 'No main in LeetCode Solution');

  // 2. Custom program bypass test
  const customCpp = 'int main() { cout << "Hello"; return 0; }';
  const dummySignature = { name: 'twoSum', params: [{ name: 'nums', type: 'integer[]' }], return: { type: 'integer[]' } };
  assert(wrapCodeWithHarness(customCpp, dummySignature, 'cpp') === customCpp, 'Bypass harness when custom main() exists');

  // 3. Two Sum C++ Scoping Test
  const studentTwoSum = `
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        return {0, 1};
    }
};`;

  const twoSumSig = {
    name: 'twoSum',
    params: [
      { name: 'nums', type: 'integer[]' },
      { name: 'target', type: 'integer' },
    ],
    return: { type: 'integer[]' },
  };

  const wrappedCpp = wrapCodeWithHarness(studentTwoSum, twoSumSig, 'cpp');
  
  assert(wrappedCpp.includes('HarnessParser::parseIntegerArray(cin)'), 'C++ harness uses HarnessParser::parseIntegerArray scoping');
  assert(wrappedCpp.includes('HarnessParser::parseInteger(cin)'), 'C++ harness uses HarnessParser::parseInteger scoping');
  assert(wrappedCpp.includes('skipParamLabel(in)'), 'C++ harness includes label cleaning');
  assert(!wrappedCpp.includes('auto arg0 = parseIntegerArray(cin);'), 'C++ harness has NO unqualified parseIntegerArray');

  // 4. String + String Test
  const strSig = {
    name: 'concatStrings',
    params: [
      { name: 's1', type: 'string' },
      { name: 's2', type: 'string' },
    ],
    return: { type: 'string' },
  };
  const wrappedStrCpp = wrapCodeWithHarness('class Solution {};', strSig, 'cpp');
  assert(wrappedStrCpp.includes('HarnessParser::parseString(cin)'), 'C++ harness supports string parameters');

  // 5. vector<string> Test
  const vecStrSig = {
    name: 'findWords',
    params: [
      { name: 'words', type: 'vector<string>' },
    ],
    return: { type: 'vector<string>' },
  };
  const wrappedVecStrCpp = wrapCodeWithHarness('class Solution {};', vecStrSig, 'cpp');
  assert(wrappedVecStrCpp.includes('HarnessParser::parseStringArray(cin)'), 'C++ harness supports string vector parameters');

  // 6. vector<vector<int>> (2D Matrix) Test
  const matrixSig = {
    name: 'floodFill',
    params: [
      { name: 'image', type: 'vector<vector<int>>' },
      { name: 'sr', type: 'int' },
      { name: 'sc', type: 'int' },
      { name: 'color', type: 'int' },
    ],
    return: { type: 'vector<vector<int>>' },
  };
  const wrappedMatrixCpp = wrapCodeWithHarness('class Solution {};', matrixSig, 'cpp');
  assert(wrappedMatrixCpp.includes('HarnessParser::parseIntegerMatrix(cin)'), 'C++ harness supports 2D integer matrix parameters');

  // 7. Long long & Bool Test
  const primitiveSig = {
    name: 'checkOverflow',
    params: [
      { name: 'val', type: 'long long' },
      { name: 'flag', type: 'bool' },
    ],
    return: { type: 'bool' },
  };
  const wrappedPrimCpp = wrapCodeWithHarness('class Solution {};', primitiveSig, 'cpp');
  assert(wrappedPrimCpp.includes('HarnessParser::parseLong(cin)'), 'C++ harness supports long long parameters');
  assert(wrappedPrimCpp.includes('HarnessParser::parseBool(cin)'), 'C++ harness supports bool parameters');

  console.log(`Summary: ${passed}/${total} harness tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runHarnessTests();
