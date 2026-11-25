import type { RoadmapTestCase } from '../data/roadmapSheetTypes';

export interface ParsedCppParam {
  name: string;
  rawType: string;
  baseType:
    | 'int'
    | 'long long'
    | 'uint32_t'
    | 'double'
    | 'bool'
    | 'char'
    | 'string'
    | 'vector<int>'
    | 'vector<char>'
    | 'vector<string>'
    | 'vector<pair<int,int>>'
    | 'vector<array<int,2>>'
    | 'vector<array<int,3>>'
    | 'vector<array<int,4>>'
    | 'vector<vector<int>>'
    | 'vector<vector<string>>';
  isMutableRef: boolean;
}

export interface ParsedCppSignature {
  name: string;
  returnType: string;
  params: ParsedCppParam[];
}

function classifyCppType(rawType: string): ParsedCppParam['baseType'] {
  const compact = rawType
    .replace(/\bconst\b/g, '')
    .replace(/&/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (/vector\s*<\s*vector\s*<\s*string\s*>\s*>/i.test(compact)) return 'vector<vector<string>>';
  if (/vector\s*<\s*vector\s*<\s*int\s*>\s*>/i.test(compact)) return 'vector<vector<int>>';
  if (/vector\s*<\s*pair\s*<\s*int\s*,\s*int\s*>\s*>/i.test(compact)) return 'vector<pair<int,int>>';
  if (/vector\s*<\s*array\s*<\s*int\s*,\s*2\s*>\s*>/i.test(compact)) return 'vector<array<int,2>>';
  if (/vector\s*<\s*array\s*<\s*int\s*,\s*3\s*>\s*>/i.test(compact)) return 'vector<array<int,3>>';
  if (/vector\s*<\s*array\s*<\s*int\s*,\s*4\s*>\s*>/i.test(compact)) return 'vector<array<int,4>>';
  if (/vector\s*<\s*string\s*>/i.test(compact)) return 'vector<string>';
  if (/vector\s*<\s*char\s*>/i.test(compact)) return 'vector<char>';
  if (/vector\s*<\s*int\s*>/i.test(compact)) return 'vector<int>';
  if (/long\s+long/i.test(compact)) return 'long long';
  if (/uint32_t|unsigned\s+int/i.test(compact)) return 'uint32_t';
  if (/double|float/i.test(compact)) return 'double';
  if (/bool/i.test(compact)) return 'bool';
  if (/char/i.test(compact)) return 'char';
  if (/string/i.test(compact)) return 'string';
  return 'int';
}

/**
 * Extracts the primary entry function signature from a C++ snippet.
 * Takes the LAST top-level function so helper utilities declared above
 * (e.g. sq before isHappy, isV before reverseVowels, isP before validPalindrome)
 * are skipped cleanly.
 */
export function parsePrimaryCppSignature(code: string): ParsedCppSignature | null {
  if (!code) return null;
  const cleaned = code
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const fnRegex =
    /(?:^|[}\n;])\s*(?:inline\s+)?((?:long\s+long|unsigned\s+int|uint32_t|bool|int|double|float|void|char|string|vector<\s*vector<[^>{};]+>\s*>|vector<[^>{};]+>))\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\{/g;

  const matches: Array<{ returnType: string; name: string; rawParams: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = fnRegex.exec(cleaned)) !== null) {
    const fnName = match[2].trim();
    if (['main', 'if', 'for', 'while', 'switch'].includes(fnName)) continue;
    matches.push({
      returnType: match[1].trim().replace(/\s+/g, ' '),
      name: fnName,
      rawParams: match[3].trim(),
    });
  }

  if (matches.length === 0) return null;
  const primary = matches[matches.length - 1];
  const params: ParsedCppParam[] = [];

  if (primary.rawParams) {
    // Split params respecting template angle brackets like vector<vector<int>>
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of primary.rawParams) {
      if (ch === '<') depth++;
      else if (ch === '>') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());

    for (const part of parts) {
      const m = part.match(/^([\s\S]+?)\s+([a-zA-Z_]\w*)$/);
      if (m) {
        const rawType = m[1].trim();
        const name = m[2].trim();
        const isMutableRef = rawType.includes('&') && !/\bconst\b/.test(rawType);
        params.push({
          name,
          rawType,
          baseType: classifyCppType(rawType),
          isMutableRef,
        });
      }
    }
  }

  return {
    name: primary.name,
    returnType: primary.returnType,
    params,
  };
}

/** Splits top-level comma-separated arguments in a display test input. */
function splitTopLevelArgs(input: string): string[] {
  const parts: string[] = [];
  let bracketDepth = 0;
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let cur = '';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : '';
    if (ch === '"' && !inSingleQuote && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === "'" && !inDoubleQuote && prev !== '\\') {
      // Treat apostrophe inside unquoted sentence like "Let's take" carefully: only toggle if matching closing quote or preceded by space/start
      inSingleQuote = !inSingleQuote;
    } else if (!inDoubleQuote) {
      if (ch === '[' || ch === '(') bracketDepth++;
      else if (ch === ']' || ch === ')') bracketDepth = Math.max(0, bracketDepth - 1);
    }

    if (ch === ',' && bracketDepth === 0 && !inDoubleQuote) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function stripParamLabel(token: string): string {
  const m = token.match(/^[a-zA-Z_]\w*\s*=\s*([\s\S]+)$/);
  return m ? m[1].trim() : token.trim();
}

function stripSurroundingQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseIntList(raw: string): number[] {
  const inner = raw.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n));
}

function parseStringList(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  return inner.split(',').map((item) => stripSurroundingQuotes(item.trim()));
}

function parseIntMatrix(raw: string): number[][] {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const rows: number[][] = [];
  const rowMatches = trimmed.slice(1, -1).match(/\[[^\]]*\]/g) || [];
  for (const r of rowMatches) {
    rows.push(parseIntList(r));
  }
  return rows;
}

/**
 * Serializes a display test case input (e.g. "[3,2,1,5,2]", "s=anagram, t=nagaram",
 * "A man, a plan, a canal: Panama") into a clean line-based stdin for our generated C++ driver.
 */
export function buildRoadmapStdin(rawInput: string, sig: ParsedCppSignature | null): string {
  if (!sig || sig.params.length === 0) return rawInput;

  // Special case: single string parameter may contain commas (like "A man, a plan, a canal: Panama")
  if (sig.params.length === 1 && sig.params[0].baseType === 'string') {
    const cleaned = stripSurroundingQuotes(stripParamLabel(rawInput));
    return `${cleaned}\n`;
  }

  const rawArgs = splitTopLevelArgs(rawInput);
  const lines: string[] = [];

  sig.params.forEach((param, idx) => {
    const token = rawArgs[idx] !== undefined ? stripParamLabel(rawArgs[idx]) : '';
    switch (param.baseType) {
      case 'vector<int>': {
        const arr = parseIntList(token);
        lines.push(String(arr.length));
        if (arr.length > 0) lines.push(arr.join(' '));
        break;
      }
      case 'vector<char>': {
        const arr = parseStringList(token).map((s) => (s.length > 0 ? s[0] : ' '));
        lines.push(String(arr.length));
        if (arr.length > 0) lines.push(arr.join(' '));
        break;
      }
      case 'vector<string>': {
        const arr = parseStringList(token);
        lines.push(String(arr.length));
        for (const item of arr) lines.push(item);
        break;
      }
      case 'vector<vector<int>>': {
        const mat = parseIntMatrix(token);
        lines.push(String(mat.length));
        for (const row of mat) {
          lines.push(String(row.length));
          if (row.length > 0) lines.push(row.join(' '));
        }
        break;
      }
      case 'vector<pair<int,int>>':
      case 'vector<array<int,2>>':
      case 'vector<array<int,3>>':
      case 'vector<array<int,4>>': {
        const normalized = token.replace(/\(/g, '[').replace(/\)/g, ']');
        const mat = parseIntMatrix(normalized);
        lines.push(String(mat.length));
        for (const row of mat) {
          if (row.length > 0) lines.push(row.join(' '));
        }
        break;
      }
      case 'string': {
        lines.push(stripSurroundingQuotes(token));
        break;
      }
      case 'char': {
        const s = stripSurroundingQuotes(token);
        lines.push(s[0] || 'a');
        break;
      }
      case 'bool': {
        lines.push(/true|1/i.test(token) ? '1' : '0');
        break;
      }
      default: {
        lines.push(token || '0');
        break;
      }
    }
  });

  return lines.join('\n') + '\n';
}

function getCppReaderSnippet(param: ParsedCppParam, varName: string): string {
  switch (param.baseType) {
    case 'vector<int>':
      return `    int __n_${varName} = 0; cin >> __n_${varName}; vector<int> ${varName}(__n_${varName}); for (int &__x : ${varName}) cin >> __x;`;
    case 'vector<char>':
      return `    int __n_${varName} = 0; cin >> __n_${varName}; vector<char> ${varName}(__n_${varName}); for (int __i = 0; __i < __n_${varName}; ++__i) { cin >> ${varName}[__i]; }`;
    case 'vector<string>':
      return `    int __n_${varName} = 0; cin >> __n_${varName}; string __dummy_${varName}; getline(cin, __dummy_${varName}); vector<string> ${varName}(__n_${varName}); for (int __i = 0; __i < __n_${varName}; ++__i) getline(cin, ${varName}[__i]);`;
    case 'vector<vector<int>>':
      return `    int __r_${varName} = 0; cin >> __r_${varName}; vector<vector<int>> ${varName}(__r_${varName}); for (int __i = 0; __i < __r_${varName}; ++__i) { int __c = 0; cin >> __c; ${varName}[__i].resize(__c); for (int &__x : ${varName}[__i]) cin >> __x; }`;
    case 'vector<pair<int,int>>':
      return `    int __n_${varName} = 0; cin >> __n_${varName}; vector<pair<int,int>> ${varName}(__n_${varName}); for (int __i = 0; __i < __n_${varName}; ++__i) cin >> ${varName}[__i].first >> ${varName}[__i].second;`;
    case 'vector<array<int,2>>':
    case 'vector<array<int,3>>':
    case 'vector<array<int,4>>': {
      const nDims = param.baseType.endsWith('4>>') ? 4 : param.baseType.endsWith('3>>') ? 3 : 2;
      return `    int __n_${varName} = 0; cin >> __n_${varName}; vector<array<int,${nDims}>> ${varName}(__n_${varName}); for (int __i = 0; __i < __n_${varName}; ++__i) for (int __j = 0; __j < ${nDims}; ++__j) cin >> ${varName}[__i][__j];`;
    }
    case 'string':
      return `    string ${varName}; if (cin.peek() == '\\n') cin.get(); getline(cin, ${varName}); if (!${varName}.empty() && ${varName}.back() == '\\r') ${varName}.pop_back();`;
    case 'char':
      return `    char ${varName} = '\\0'; cin >> ${varName};`;
    case 'bool':
      return `    int __b_${varName} = 0; cin >> __b_${varName}; bool ${varName} = (__b_${varName} != 0);`;
    case 'double':
      return `    double ${varName} = 0; cin >> ${varName};`;
    case 'long long':
      return `    long long ${varName} = 0; cin >> ${varName};`;
    case 'uint32_t':
      return `    uint32_t ${varName} = 0; cin >> ${varName};`;
    default:
      return `    int ${varName} = 0; cin >> ${varName};`;
  }
}

/**
 * Wraps a standalone C++ solution snippet with a tailored `main()` driver if
 * the user has not already supplied `main()`. Supports void in-place mutation,
 * in-place return+mutation (e.g. removeDuplicates / removeElement / compress),
 * class Solution wrappers, and standard return types.
 */
export function buildRunnableRoadmapCpp(
  studentCode: string,
  referenceCppCode: string,
  expectedSampleOutput: string
): { code: string; signature: ParsedCppSignature | null; hasCustomMain: boolean } {
  if (/\bint\s+main\s*\(/.test(studentCode)) {
    return { code: studentCode, signature: null, hasCustomMain: true };
  }

  const sig = parsePrimaryCppSignature(studentCode) || parsePrimaryCppSignature(referenceCppCode);
  if (!sig) {
    return { code: studentCode, signature: null, hasCustomMain: false };
  }

  const hasHeaders = /#include\s*</.test(studentCode);
  const hasNamespace = /using\s+namespace\s+std\s*;/.test(studentCode);
  const headerBlock = `${hasHeaders ? '' : '#include <bits/stdc++.h>\n'}${hasNamespace ? '' : 'using namespace std;\n'}`;

  const readers = sig.params.map((p, idx) => getCppReaderSnippet(p, `arg${idx}`)).join('\n');
  const argsList = sig.params.map((_, idx) => `arg${idx}`).join(', ');
  const hasClassSolution = /\bclass\s+Solution\b/.test(studentCode);
  const callExpr = hasClassSolution ? `__sol.${sig.name}(${argsList})` : `${sig.name}(${argsList})`;

  const expectTrim = (expectedSampleOutput || '').trim();
  const expectsCountAndPrefix = /^(\d+)\s*,\s*\[/.test(expectTrim);

  let printBlock = '';
  if (sig.returnType === 'void') {
    printBlock = `
    ${callExpr};
    __roadmapPrint(arg0);`;
  } else if (expectsCountAndPrefix && sig.params[0]?.baseType.startsWith('vector<')) {
    printBlock = `
    auto __res = ${callExpr};
    cout << __res << ", ";
    vector<decltype(arg0[0])> __pref;
    for (int __i = 0; __i < (int)__res && __i < (int)arg0.size(); ++__i) __pref.push_back(arg0[__i]);
    __roadmapPrint(__pref);`;
  } else {
    printBlock = `
    auto __res = ${callExpr};
    __roadmapPrint(__res);`;
  }

  const driver = `${headerBlock}
${studentCode}

template <typename T>
inline void __roadmapPrintElem(const T& x) { cout << x; }
inline void __roadmapPrintElem(const string& x) { cout << x; }
inline void __roadmapPrintElem(char x) { cout << x; }
inline void __roadmapPrintElem(bool x) { cout << (x ? "true" : "false"); }

inline void __roadmapPrint(int x) { cout << x << "\\n"; }
inline void __roadmapPrint(long long x) { cout << x << "\\n"; }
inline void __roadmapPrint(uint32_t x) { cout << x << "\\n"; }
inline void __roadmapPrint(double x) {
    ostringstream oss;
    oss << setprecision(10) << x;
    string out = oss.str();
    cout << out << "\\n";
}
inline void __roadmapPrint(bool x) { cout << (x ? "true" : "false") << "\\n"; }
inline void __roadmapPrint(char x) { cout << x << "\\n"; }
inline void __roadmapPrint(const string& x) { cout << x << "\\n"; }

template <typename T>
inline void __roadmapPrint(const vector<T>& v) {
    cout << "[";
    for (size_t i = 0; i < v.size(); ++i) {
        __roadmapPrintElem(v[i]);
        if (i + 1 < v.size()) cout << ",";
    }
    cout << "]\\n";
}

template <typename T>
inline void __roadmapPrint(const vector<vector<T>>& m) {
    cout << "[";
    for (size_t i = 0; i < m.size(); ++i) {
        cout << "[";
        for (size_t j = 0; j < m[i].size(); ++j) {
            __roadmapPrintElem(m[i][j]);
            if (j + 1 < m[i].size()) cout << ",";
        }
        cout << "]";
        if (i + 1 < m.size()) cout << ",";
    }
    cout << "]\\n";
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
${hasClassSolution ? '    Solution __sol;\n' : ''}${readers}
${printBlock}
    return 0;
}
`;

  return { code: driver, signature: sig, hasCustomMain: false };
}

/**
 * Compares C++ program stdout against a Roadmap expected output cleanly,
 * tolerating float precision (1024 vs 1024.0), whitespace differences around commas,
 * wildcard placeholders (_, ...), and unordered nested sets (groupAnagrams).
 */
export function compareRoadmapOutputs(actualRaw: string, expectedRaw: string, problemCode?: string): boolean {
  const actual = (actualRaw || '').trim().replace(/\r/g, '');
  const expected = (expectedRaw || '').trim().replace(/\r/g, '');
  if (!expected) return true;
  if (actual === expected) return true;

  const compact = (s: string) => s.replace(/\s*,\s*/g, ',').replace(/^["']|["']$/g, '').trim();
  const aComp = compact(actual);
  const eComp = compact(expected);
  if (aComp === eComp) return true;

  // Numeric equality (e.g. "1024" vs "1024.0", or "0.25" vs "0.25000")
  if (!Number.isNaN(Number(aComp)) && !Number.isNaN(Number(eComp)) && aComp !== '' && eComp !== '') {
    return Math.abs(Number(aComp) - Number(eComp)) < 1e-5;
  }

  // In-place array prefix check like "2, [1,2,_]" or "2, [1,2,...]"
  const expPrefixMatch = expected.match(/^(\d+)\s*,\s*\[([^\]]*)\]$/);
  const actPrefixMatch = actual.match(/^(\d+)\s*,\s*\[([^\]]*)\]$/);
  if (expPrefixMatch && actPrefixMatch) {
    if (expPrefixMatch[1] !== actPrefixMatch[1]) return false;
    const expElems = expPrefixMatch[2]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== '_' && s !== '...');
    const actElems = actPrefixMatch[2].split(',').map((s) => s.trim()).filter(Boolean);
    if (problemCode === 'L1-051') {
      // removeElement: first k elements may appear in any order
      return [...expElems].sort().join(',') === [...actElems].sort().join(',');
    }
    return expElems.join(',') === actElems.slice(0, expElems.length).join(',');
  }

  // Group Anagrams (L1-066) or 3Sum/4Sum (L2-038/L2-040) unordered groups
  if ((problemCode === 'L1-066' || problemCode === 'L2-038' || problemCode === 'L2-040') && aComp.startsWith('[[') && eComp.startsWith('[[')) {
    const normalizeGroups = (raw: string) => {
      const inner = raw.slice(1, -1);
      const matches = inner.match(/\[[^\]]*\]/g) || [];
      return matches
        .map((grp) =>
          grp
            .slice(1, -1)
            .split(',')
            .map((x) => stripSurroundingQuotes(x.trim()))
            .filter(Boolean)
            .sort()
            .join('|')
        )
        .sort()
        .join('||');
    };
    if (normalizeGroups(aComp) === normalizeGroups(eComp)) return true;
  }

  // Intersection (L1-015, L2-085) can return elements in any order
  if ((problemCode === 'L1-015' || problemCode === 'L2-085') && aComp.startsWith('[') && eComp.startsWith('[')) {
    const normSet = (r: string) => r.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean).sort().join(',');
    if (normSet(aComp) === normSet(eComp)) return true;
  }

  return false;
}

export function buildPrebuiltHarnessCase(tc: RoadmapTestCase, sig: ParsedCppSignature | null) {
  return {
    input: buildRoadmapStdin(tc.input, sig),
    expectedOutput: '', // Validate in UI with compareRoadmapOutputs for exact support of void/prefix/group outputs
  };
}
