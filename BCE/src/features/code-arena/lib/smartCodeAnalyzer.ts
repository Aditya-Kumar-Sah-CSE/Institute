/**
 * Smart Agent Code Analysis & Constraint Testcase Generator
 * Evaluates real-time code complexity, key logic, 1-10 scoring, and optimization recommendations.
 */

export interface SmartAgentAnalysis {
  analyzedTime: string;
  timeExplanation: string;
  analyzedSpace: string;
  spaceExplanation: string;
  overallRating: number;
  ratingLabel: string;
  keyLogic: string[];
  optimizationTip: string;
  isOptimal: boolean;
}

/**
 * Strips comments and string literals to prevent false positives in regex checks
 */
function cleanSourceCode(code: string): string {
  if (!code) return '';
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
    .replace(/\/\/.*/g, '')            // remove single-line comments
    .replace(/"(?:[^"\\]|\\.)*"/g, '""') // remove string literals
    .replace(/'(?:[^'\\]|\\.)*'/g, "''"); // remove char literals
}

/**
 * Real-time Smart Code Analyzer running in the background as the user types.
 */
export function analyzeCodeWithSmartAgent(
  code: string = '',
  language: string = 'cpp',
  metadata?: any,
  problemTitle?: string,
  passedTests?: number,
  totalTests?: number,
  runtimeMs: number = 12,
  memoryMb: number = 14.5
): SmartAgentAnalysis {
  const metaTime = metadata?.optimal_worst_case_time || metadata?.time_complexity;
  const metaSpace = metadata?.optimal_auxiliary_space || metadata?.space_complexity;

  const clean = cleanSourceCode(code);

  // 1. Loop and Control Structure Analysis
  const forMatches = clean.match(/\bfor\s*\([^)]*\)/g) || [];
  const whileMatches = clean.match(/\bwhile\s*\([^)]*\)/g) || [];
  const totalLoops = forMatches.length + whileMatches.length;

  const nestedLoopRegex = /(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)\s*\([^)]*\)/;
  const tripleNestedRegex = /(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)/;

  const hasSort = /\b(?:sort|stable_sort|qsort|Arrays\.sort|Collections\.sort|\.sort)\b/.test(clean);
  const hasBinarySearch = /\b(?:binary_search|lower_bound|upper_bound|bisect)\b/.test(clean) || 
    (/(?:low|left)\s*<=\s*(?:high|right)/.test(clean) && /(?:>>\s*1|\/\s*2)/.test(clean));
  
  // Recursion detection: function calling itself
  const hasRecursion = /\b([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{[\s\S]*?\b\1\s*\(/.test(clean);

  // Pattern detection
  const hasTwoPointers = /(?:left|low)\s*\+\+|(?:\bright|high)\s*--/.test(clean) && totalLoops > 0;
  const hasHashMap = /\b(?:unordered_map|HashMap|Map\(|dict\(|\bdict\b|\bhash\b)/i.test(clean);
  const hasMathFormula = /\*|\/|\%/.test(clean) && totalLoops === 0 && !hasRecursion;

  // 2. Determine Time Complexity (TC)
  let analyzedTime = 'O(1)';
  let timeExplanation = 'Constant Time: Direct closed-form scalar operations';
  let approach = 'Direct Mathematical / Constant Form';
  let loopDesc = 'Zero iterative loops: executes in constant time';

  if (tripleNestedRegex.test(clean)) {
    analyzedTime = 'O(N³)';
    timeExplanation = 'Cubic Time: 3 levels of nested iterations';
    approach = 'Brute-force Cubic Search';
    loopDesc = '3 nested loops scaling with N³ operations';
  } else if (nestedLoopRegex.test(clean)) {
    analyzedTime = 'O(N²)';
    timeExplanation = 'Quadratic Time: Nested iteration loops detected';
    approach = hasTwoPointers ? 'Nested Pointer Scan' : 'Quadratic Traversal';
    loopDesc = 'Outer and inner loop executing up to N² comparisons';
  } else if (hasSort) {
    analyzedTime = 'O(N log N)';
    timeExplanation = 'Log-Linear Time: Sorting operations detected';
    approach = 'Sort & Search Pattern';
    loopDesc = 'Comparison sort dominant step O(N log N)';
  } else if (hasBinarySearch) {
    analyzedTime = 'O(log N)';
    timeExplanation = 'Logarithmic Time: Binary search / bisection detected';
    approach = 'Binary Search / Bisection';
    loopDesc = 'Search space halved each step in O(log N)';
  } else if (totalLoops > 0) {
    analyzedTime = 'O(N)';
    timeExplanation = 'Linear Time: Single traversal loop detected';
    approach = hasTwoPointers ? 'Two-Pointer Linear Scan' : hasHashMap ? 'Hash-Mapped Linear Pass' : 'Single-Pass Linear Traversal';
    loopDesc = 'Single loop traversal performing O(1) operations per element';
  } else if (hasRecursion) {
    analyzedTime = 'O(N)';
    timeExplanation = 'Linear Recursion: Function call stack traversal';
    approach = 'Recursive Traversal';
    loopDesc = 'Call-stack traversal of depth N';
  }

  // 3. Determine Space Complexity (SC)
  const has2DStructure = /vector\s*<\s*vector|\[\]\s*\[\]|\bnew\s+\w+\s*\[[^\]]+\]\s*\[/.test(clean);
  const hasCollections = /\b(?:vector|set|unordered_set|map|unordered_map|queue|priority_queue|stack|list|ArrayList|HashMap|HashSet|Array\(|\[\])\b/.test(clean);

  let analyzedSpace = 'O(1)';
  let spaceExplanation = 'Constant Space: Uses scalar variables in-place';
  let memoryDesc = 'O(1) in-place auxiliary memory without extra heap buffers';

  if (has2DStructure) {
    analyzedSpace = 'O(N²)';
    spaceExplanation = 'Quadratic Space: 2D matrix or nested collections';
    memoryDesc = 'Auxiliary 2D matrix allocating O(N²) memory';
  } else if (hasCollections) {
    analyzedSpace = 'O(N)';
    spaceExplanation = 'Linear Space: Dynamic collection / buffer memory';
    memoryDesc = 'Dynamic auxiliary buffer scaling linearly with N';
  } else if (hasRecursion) {
    analyzedSpace = 'O(N)';
    spaceExplanation = 'Linear Auxiliary Space: Function call stack frame';
    memoryDesc = 'Recursive call stack consuming O(N) stack frames';
  }

  // 4. Check Optimality
  const isOptimal = metaTime ? (analyzedTime === metaTime || analyzedTime === 'O(1)') : (analyzedTime === 'O(1)' || analyzedTime === 'O(N)');

  // 5. Compute Rating Score (1 to 10)
  let score = 9.8;
  if (analyzedTime === 'O(N³)') score = 6.2;
  else if (analyzedTime === 'O(N²)') score = metaTime === 'O(N²)' ? 9.0 : 7.4;
  else if (analyzedTime === 'O(N log N)') score = 8.8;
  else if (analyzedTime === 'O(N)') score = 9.5;
  else if (analyzedTime === 'O(1)' || analyzedTime === 'O(log N)') score = 9.9;

  // Factor in runtime & test pass rate if available
  if (totalTests && totalTests > 0 && passedTests !== undefined) {
    const accuracyRatio = passedTests / totalTests;
    score = score * accuracyRatio;
  }
  const overallRating = Number(Math.max(1.0, Math.min(10.0, score)).toFixed(1));

  let ratingLabel = 'Good Solution';
  if (overallRating >= 9.2) ratingLabel = 'Optimal Solution';
  else if (overallRating >= 8.2) ratingLabel = 'High Efficiency';
  else if (overallRating < 7.0) ratingLabel = 'Needs Optimization';

  // 6. Generate Crisp Key Logic Bullets (No large paragraphs!)
  const keyLogic = [
    `Approach: ${approach}`,
    `Iteration: ${loopDesc}`,
    `Memory: ${memoryDesc}`
  ];

  // 7. Concise Code Optimization Tip (Strictly <= 100 words)
  let optimizationTip = '';
  if (analyzedTime === 'O(N³)' || (analyzedTime === 'O(N²)' && metaTime && metaTime !== 'O(N²)')) {
    optimizationTip = 'Optimize the nested loops by using a hash map (unordered_map) or frequency array to store previously seen values. This reduces element lookups from quadratic O(N²) to linear O(N) time and avoids TLE on large constraints (N ≥ 10⁵).';
  } else if (analyzedTime === 'O(N log N)' && (metaTime === 'O(N)' || !metaTime)) {
    optimizationTip = 'If elements have a bounded integer range, replace comparison sort with bucket or counting sort to achieve O(N) linear time, or use a single hash-set pass if duplicate check is required.';
  } else if (analyzedTime === 'O(1)') {
    optimizationTip = 'Excellent closed-form mathematical solution! Ensure 64-bit integers (long long in C++, BigInt/long in Java) are used during multiplication to prevent intermediate integer overflow on extreme boundary constraints.';
  } else {
    // O(N) Optimal advice
    if (language === 'cpp' || language === 'cpp17') {
      optimizationTip = 'Solution is algorithmically optimal! For competitive runtime performance: add fast I/O (cin.tie(NULL); ios_base::sync_with_stdio(false);), pass vectors and strings by const reference, and use reserve() when sizing is known.';
    } else if (language === 'python' || language === 'py') {
      optimizationTip = 'Algorithmically optimal O(N) single-pass solution! To speed up Python execution, use sys.stdin.readline for fast input and list comprehensions instead of manual element appends in loops.';
    } else {
      optimizationTip = 'Algorithmically optimal single-pass solution! Keep allocations in-place without duplicating input arrays, and ensure scalar counter types avoid unnecessary boxing or garbage collection pauses.';
    }
  }

  return {
    analyzedTime,
    timeExplanation,
    analyzedSpace,
    spaceExplanation,
    overallRating,
    ratingLabel,
    keyLogic,
    optimizationTip,
    isOptimal
  };
}

/**
 * Extracts and formats a boundary testcase matching the problem's last constraint,
 * ensuring expectedOutput is populated whenever available.
 */
export function extractConstraintTestCase(
  constraintsStr?: string | null,
  metadata?: any,
  samples: any[] = [],
  knownTestCases: any[] = []
): { input: string; expectedOutput: string; name: string } | null {
  // Priority 1: Check knownTestCases (e.g. from DB) for verified boundary testcase with expected_output
  const hidden = (knownTestCases || []).filter(c => c.is_hidden);
  if (hidden.length > 0) {
    const boundary = hidden[hidden.length - 1];
    return {
      input: boundary.input,
      expectedOutput: boundary.expected_output || '',
      name: `Constraint (${boundary.sample_name || 'Boundary'})`
    };
  }

  // Priority 2: Check metadata extreme_test_case
  if (metadata?.extreme_test_case && typeof metadata.extreme_test_case === 'string') {
    const extremeStr = metadata.extreme_test_case.trim();
    const expMatch = extremeStr.match(/(?:expected(?:\s*output|\s*digit\s*sum|\s*sum|\s*value)?\s*(?:=|:|\bis\b)\s*|output:\s*)([^\.,;\r\n]+)/i);
    const expectedFromMeta = expMatch ? expMatch[1].trim() : '';

    const matchN = extremeStr.match(/(?:N|n|k|target|x|val)\s*=\s*([0-9\^eE+,]+)/i);
    if (matchN) {
      const cleanVal = matchN[1].replace(/,/g, '');
      const parsedVal = parseExponentialOrPower(cleanVal);
      if (parsedVal) {
        return {
          input: formatConstraintInput(parsedVal, samples),
          expectedOutput: expectedFromMeta,
          name: `Constraint (${matchN[0].replace(/,/g, '')})`
        };
      }
    }
  }

  if (!constraintsStr || typeof constraintsStr !== 'string') return null;

  // Clean HTML tags & entities
  const cleanStr = constraintsStr
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '');

  const lines = cleanStr
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^(time\s*limit|memory\s*limit|standard\s*codeforces)/i.test(l));

  if (lines.length === 0) return null;

  // The last constraint line (as requested by user: "jo last constrain h")
  const lastLine = lines[lines.length - 1];

  // Look for patterns like "<= 10^6", "<= 1e9", "<= 100000", etc. (match exponent/scientific forms BEFORE plain ints!)
  const boundMatches = Array.from(lastLine.matchAll(/(?:<=|<)\s*(\d+e[+-]?\d+|[0-9]+\^[0-9]+|[0-9]+)/gi));
  if (boundMatches.length > 0) {
    const lastMatch = boundMatches[boundMatches.length - 1][1];
    const val = parseExponentialOrPower(lastMatch);
    if (val) {
      const displayLabel = lastLine.length > 25 ? `${lastLine.slice(0, 22)}…` : lastLine;
      return {
        input: formatConstraintInput(val, samples),
        expectedOutput: '',
        name: `Constraint (${displayLabel})`
      };
    }
  }

  // Fallback: search for numbers like 10^6, 10^5, or >= 1000 in the last line
  const anyNumMatch = lastLine.match(/10\^[0-9]+|[0-9]{3,}/);
  if (anyNumMatch) {
    const val = parseExponentialOrPower(anyNumMatch[0]);
    if (val) {
      return {
        input: formatConstraintInput(val, samples),
        expectedOutput: '',
        name: `Constraint (${anyNumMatch[0]})`
      };
    }
  }

  return null;
}

function parseExponentialOrPower(str: string): string {
  if (str.includes('^')) {
    const parts = str.split('^').map(s => parseInt(s.trim(), 10));
    if (!isNaN(parts[0]) && !isNaN(parts[1])) {
      return String(Math.pow(parts[0], Math.min(parts[1], 15)));
    }
  }
  if (/^\d+e\d+$/i.test(str)) {
    return String(Number(str));
  }
  // Leetcode HTML superscript converted e.g. 104 -> 10^4 = 10000
  if (str === '104') return '10000';
  if (str === '105') return '100000';
  if (str === '106') return '1000000';
  if (str === '109') return '1000000000';
  return str;
}

function formatConstraintInput(val: string, samples: any[] = []): string {
  if (!samples || samples.length === 0 || !samples[0]?.input) {
    return val;
  }
  const sampleInput = String(samples[0].input).trim();
  const sampleLines = sampleInput.split(/\r?\n/);

  // Handle LeetCode-style named parameter inputs like "a = [3,2,1,5,2]" or "a = [1,2], k = 3"
  if (sampleLines.length === 1 && /^[a-zA-Z_]\w*\s*=/.test(sampleInput)) {
    const numVal = Math.min(Math.max(1, parseInt(val, 10) || 5), 100000);
    // Replace the first numeric scalar or keep valid bracketed array with safe synthetic values
    const parts = sampleInput.split(/,\s*(?=[a-zA-Z_]\w*\s*=)/);
    return parts
      .map((part, idx) => {
        const eqIdx = part.indexOf('=');
        if (eqIdx === -1) return part;
        const label = part.slice(0, eqIdx).trim();
        const rhs = part.slice(eqIdx + 1).trim();
        if (rhs.startsWith('[')) {
          if (rhs.startsWith('[[') || rhs.startsWith('[(')) {
            return `${label} = ${rhs}`;
          }
          if (idx === parts.length - 1 || parts.length === 1) {
            return `${label} = [${Array.from({ length: 5 }, (_, i) => i + 1).join(',')}]`;
          }
          return `${label} = ${rhs}`;
        }
        if (rhs.startsWith('"')) return `${label} = ${rhs}`;
        return idx === parts.length - 1 ? `${label} = ${numVal}` : `${label} = ${rhs}`;
      })
      .join(', ');
  }

  // If sample is single line array
  if (sampleLines.length === 1) {
    if (sampleInput.startsWith('[') && sampleInput.endsWith(']')) {
      return `[${val}]`;
    }
    return val;
  }

  // If sample has multiple lines e.g. "5\n1 2 3 4 5"
  if (sampleLines.length >= 2) {
    const firstLineNum = parseInt(sampleLines[0], 10);
    if (!isNaN(firstLineNum)) {
      const n = Math.min(parseInt(val, 10) || 5, 8);
      const items = Array.from({ length: n }, (_, i) => i + 1).join(' ');
      return `${n}\n${items}`;
    }
  }

  return val;
}

