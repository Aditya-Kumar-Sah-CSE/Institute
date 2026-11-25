const fs = require('fs');
const path = require('path');
const postgres = require('postgres');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(__dirname, '../../.env');
const env = {};
fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .forEach((line) => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      let v = line.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[k] = v;
    }
  });

const DATABASE_URL = env.DATABASE_URL;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing DATABASE_URL, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const SHEET_SLUG = 'dsa-company-roadmap-520';
const SHEET_TITLE = 'DSA for Freshers: Company Roadmap (Levels 1–5)';
const SHEET_DESCRIPTION =
  'Complete 5-Level Structured DSA Mastery Roadmap (~520 curated problems for TCS Digital, Infosys, Wipro, Cognizant, Capgemini & Product Companies). Level 1 (90 Foundation problems) active with Hinglish Theory Modules, Brute Force vs Optimized C++17 solutions, interactive Test Cases, Level Revision Cheat Sheets & Full Arena IDE.';
const CREATOR_USER_ID = 'd175f6b1-ef9d-428a-8a26-14365a624ae9';

const ROADMAP_BLUEPRINT = [
  {
    level_number: 1,
    title: 'Foundation',
    subtitle: 'Arrays, Strings, Math & Number Theory, Hashing, Matrix, Bits & Recursion Basics',
    description:
      'Build rock-solid fundamentals for TCS Digital, Infosys, Wipro, Cognizant, Capgemini & base rounds. Master complexity analysis, array/string manipulation, hashing patterns, basic recursion, and level-end revision drills.',
    target_problem_count: 90,
  },
  {
    level_number: 2,
    title: 'Core Patterns',
    subtitle: 'Two Pointers, Sliding Window, Prefix Sum, Kadane, Binary Search & Sorting',
    description:
      'Combine Level 1 primitives into high-frequency interview patterns: fixed/variable sliding windows, subarray sum + hashmap, Binary Search on Answer, and custom comparator sorting.',
    target_problem_count: 130,
  },
  {
    level_number: 3,
    title: 'Data Structures',
    subtitle: 'Monotonic Stack, Queue/Deque, Linked List, Heap/PQ, Intervals & Greedy',
    description:
      'Essential data structures for mid-level & product interviews: next greater element, fast/slow pointers, cycle detection, Top-K heaps, and interval scheduling.',
    target_problem_count: 120,
  },
  {
    level_number: 4,
    title: 'Trees & Backtracking',
    subtitle: 'Binary Trees (DFS/BFS, LCA, Diameter), BST, Trie & Backtracking',
    description:
      'Master hierarchical structures and state-space search: tree traversals, BST invariants, prefix tries, subsets, permutations, and N-Queens.',
    target_problem_count: 80,
  },
  {
    level_number: 5,
    title: 'Advanced Algorithms',
    subtitle: 'Graphs (BFS/DFS, Topo, DSU, Dijkstra), Dynamic Programming & Bit Manipulation',
    description:
      'Edge-giving product company mastery: shortest paths, union-find, 1D/2D DP, knapsack, LCS/LIS, partition DP, and bitmask tricks.',
    target_problem_count: 100,
  },
];

function normalizeDifficulty(rawDiff) {
  const d = String(rawDiff || 'EASY').trim().toUpperCase();
  if (d === 'HARD') return 'HARD';
  if (d === 'MEDIUM') return 'MEDIUM';
  return 'EASY';
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeContractType(cppType) {
  const clean = String(cppType || '')
    .replace(/\bconst\b/g, '')
    .replace(/&/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (/vector\s*<\s*vector\s*<\s*string\s*>\s*>/i.test(clean)) return 'vector<vector<string>>';
  if (/vector\s*<\s*vector\s*<\s*int\s*>\s*>/i.test(clean)) return 'integer[][]';
  if (/vector\s*<\s*string\s*>/i.test(clean)) return 'string[]';
  if (/vector\s*<\s*char\s*>/i.test(clean)) return 'character[]';
  if (/vector\s*<\s*int\s*>/i.test(clean)) return 'integer[]';
  if (/uint32_t|unsigned\s+int/i.test(clean)) return 'uint32_t';
  if (/long\s+long/i.test(clean)) return 'long';
  if (/double|float/i.test(clean)) return 'double';
  if (/bool/i.test(clean)) return 'boolean';
  if (/char/i.test(clean)) return 'character';
  if (/string/i.test(clean)) return 'string';
  if (/void/i.test(clean)) return 'void';
  return 'integer';
}

function parseCppSignatureFromSnippet(code) {
  if (!code) return null;
  const cleaned = code.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const fnRegex =
    /(?:^|[}\n;])\s*(?:inline\s+)?((?:long\s+long|unsigned\s+int|uint32_t|bool|int|double|float|void|char|string|vector<\s*vector<[^>{};]+>\s*>|vector<[^>{};]+>))\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\{/g;

  const matches = [];
  let m;
  while ((m = fnRegex.exec(cleaned)) !== null) {
    const fnName = m[2].trim();
    if (['main', 'if', 'for', 'while', 'switch'].includes(fnName)) continue;
    matches.push({
      rawRet: m[1].trim().replace(/\s+/g, ' '),
      name: fnName,
      rawParams: m[3].trim(),
    });
  }
  if (matches.length === 0) return null;
  const primary = matches[matches.length - 1];

  const paramParts = [];
  if (primary.rawParams) {
    let depth = 0;
    let cur = '';
    for (const ch of primary.rawParams) {
      if (ch === '<') depth++;
      else if (ch === '>') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) {
        if (cur.trim()) paramParts.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) paramParts.push(cur.trim());
  }

  const params = paramParts.map((part, idx) => {
    const pm = part.match(/^([\s\S]+?)\s+([a-zA-Z_]\w*)$/);
    const rawType = pm ? pm[1].trim() : part;
    const pName = pm ? pm[2].trim() : `arg${idx}`;
    return {
      name: pName,
      rawType,
      type: normalizeContractType(rawType),
    };
  });

  const retType = normalizeContractType(primary.rawRet);
  return {
    name: primary.name,
    rawRet: primary.rawRet,
    rawParamsStr: primary.rawParams,
    params,
    return: { type: retType },
  };
}

function splitTopLevelArgs(input) {
  const parts = [];
  let depth = 0;
  let inDouble = false;
  let cur = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : '';
    if (ch === '"' && prev !== '\\') inDouble = !inDouble;
    else if (!inDouble) {
      if (ch === '[' || ch === '(') depth++;
      else if (ch === ']' || ch === ')') depth = Math.max(0, depth - 1);
    }
    if (ch === ',' && depth === 0 && !inDouble) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function stripParamLabel(tok) {
  const m = tok.match(/^[a-zA-Z_]\w*\s*=\s*([\s\S]+)$/);
  return m ? m[1].trim() : tok.trim();
}

function stripOuterQuotes(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function formatTestCaseForHarness(prob, tc, sig) {
  const params = sig?.params || [];
  let formattedInput = String(tc.input || '').trim();

  if (params.length === 1 && params[0].type === 'string') {
    const rawVal = stripOuterQuotes(stripParamLabel(formattedInput));
    formattedInput = `${params[0].name} = ${JSON.stringify(rawVal)}`;
  } else if (params.length > 0) {
    const rawArgs = splitTopLevelArgs(formattedInput);
    const outParts = params.map((p, idx) => {
      const rawToken = rawArgs[idx] !== undefined ? stripParamLabel(rawArgs[idx]) : '';
      if (p.type === 'string') {
        return `${p.name} = ${JSON.stringify(stripOuterQuotes(rawToken))}`;
      }
      if (p.type === 'character') {
        const ch = stripOuterQuotes(rawToken)[0] || 'a';
        return `${p.name} = ${JSON.stringify(ch)}`;
      }
      if (p.type === 'string[]') {
        const inner = rawToken.replace(/^\[/, '').replace(/\]$/, '').trim();
        const items = inner ? inner.split(',').map((s) => stripOuterQuotes(s.trim())) : [];
        return `${p.name} = ${JSON.stringify(items)}`;
      }
      if (p.type === 'character[]') {
        const inner = rawToken.replace(/^\[/, '').replace(/\]$/, '').trim();
        const items = inner ? inner.split(',').map((s) => stripOuterQuotes(s.trim())[0] || '') : [];
        return `${p.name} = ${JSON.stringify(items)}`;
      }
      return `${p.name} = ${rawToken}`;
    });
    formattedInput = outParts.join(', ');
  }

  let formattedExpected = String(tc.output || '').trim();
  const retType = sig?.return?.type || 'integer';

  // Normalize "k, [el1, el2, ...]" -> "k, <firstParamName> = [el1, el2]"
  const prefixMatch = formattedExpected.match(/^(\d+)\s*,\s*\[([^\]]*)\]$/);
  if (prefixMatch && params[0]) {
    const kVal = prefixMatch[1];
    const firstParam = params[0];
    const items = prefixMatch[2]
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x && x !== '...' && x !== '_');
    const serializedArr =
      firstParam.type === 'character[]'
        ? JSON.stringify(items.map((x) => stripOuterQuotes(x)[0] || x))
        : `[${items.join(',')}]`;
    formattedExpected = `${kVal}, ${firstParam.name} = ${serializedArr}`;
  } else if (retType === 'vector<vector<string>>') {
    // e.g. [[bat],[nat,tan],[ate,eat,tea]] -> [["bat"],["nat","tan"],["ate","eat","tea"]]
    const inner = formattedExpected.replace(/^\[/, '').replace(/\]$/, '');
    const grps = inner.match(/\[[^\]]*\]/g) || [];
    const parsedGrps = grps.map((g) => {
      const gInner = g.slice(1, -1).trim();
      return gInner ? gInner.split(',').map((s) => stripOuterQuotes(s.trim())) : [];
    });
    formattedExpected = JSON.stringify(parsedGrps);
  } else if (retType === 'string' && (!formattedExpected || !formattedExpected.startsWith('"'))) {
    formattedExpected = JSON.stringify(stripOuterQuotes(formattedExpected));
  } else if (retType === 'void' && params[0]?.type === 'string') {
    formattedExpected = JSON.stringify(stripOuterQuotes(formattedExpected));
  }

  return {
    input: formattedInput,
    expected_output: formattedExpected,
    is_hidden: false,
    sample_name: undefined,
  };
}

function mapSignatureForStarter(prob, sig) {
  const fnName = sig?.name || 'solve';
  const cppRet = sig?.rawRet || 'void';
  const cppParams = sig?.rawParamsStr || '';

  const toJavaType = (t) => {
    switch (t) {
      case 'integer':
      case 'uint32_t':
        return 'int';
      case 'long':
        return 'long';
      case 'double':
        return 'double';
      case 'boolean':
        return 'boolean';
      case 'character':
        return 'char';
      case 'string':
        return 'String';
      case 'integer[]':
        return 'int[]';
      case 'character[]':
        return 'char[]';
      case 'string[]':
        return 'String[]';
      case 'integer[][]':
        return 'int[][]';
      case 'vector<vector<string>>':
        return 'List<List<String>>';
      case 'void':
        return 'void';
      default:
        return 'int';
    }
  };

  const toJavaDefault = (t) => {
    switch (t) {
      case 'void':
        return '';
      case 'boolean':
        return 'return false;';
      case 'string':
        return 'return "";';
      case 'double':
        return 'return 0.0;';
      case 'integer[]':
        return 'return new int[0];';
      case 'character[]':
        return 'return new char[0];';
      case 'string[]':
        return 'return new String[0];';
      case 'integer[][]':
        return 'return new int[0][0];';
      case 'vector<vector<string>>':
        return 'return new ArrayList<>();';
      default:
        return 'return 0;';
    }
  };

  const toCppDefault = (cppType) => {
    if (cppType === 'void') return '';
    if (cppType === 'bool') return 'return false;';
    if (cppType === 'string') return 'return "";';
    if (cppType.startsWith('vector')) return 'return {};';
    return 'return 0;';
  };

  // Detect helper signature above primary if any (e.g., isHappy has int sq(int n), reverseVowels has isV, etc.)
  let helperComment = '';
  const code = prob.optimized?.code_cpp || '';
  if (code) {
    const idx = code.lastIndexOf(fnName);
    if (idx > 0) {
      const prefix = code.slice(0, idx).trim();
      const firstOpen = prefix.lastIndexOf('}');
      if (firstOpen > 0) {
        helperComment = `    // Helper methods can be added inside Solution\n`;
      }
    }
  }

  const pyParams = (sig?.params || []).map((p) => p.name).join(', ');
  const javaParams = (sig?.params || []).map((p) => `${toJavaType(p.type)} ${p.name}`).join(', ');
  const jsParams = pyParams;

  const cppStarter = `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
${helperComment}    ${cppRet} ${fnName}(${cppParams}) {
        // ${prob.title}
        ${toCppDefault(cppRet)}
    }
};`;

  const pyStarter = `class Solution:
    def ${fnName}(self${pyParams ? `, ${pyParams}` : ''}):
        # ${prob.title}
        pass`;

  const javaStarter = `import java.util.*;

class Solution {
    public ${toJavaType(sig?.return?.type)} ${fnName}(${javaParams}) {
        // ${prob.title}
        ${toJavaDefault(sig?.return?.type)}
    }
}`;

  const jsStarter = `/**
 * ${prob.title}
 */
var ${fnName} = function(${jsParams}) {
    
};`;

  const cStarter = `#include <stdio.h>

int main(void) {
    // ${prob.title}
    return 0;
}`;

  return {
    cpp17: cppStarter,
    python: pyStarter,
    java: javaStarter,
    javascript: jsStarter,
    c: cStarter,
  };
}

function buildDescriptionHtml(prob, sig) {
  const companies = (prob.company_tags || []).join(', ');
  const paramDesc = (sig?.params || []).map((p) => `${p.rawType} ${p.name}`).join(', ');

  let html = `<p><strong>Problem Statement:</strong><br/>${escapeHtml(prob.problem_statement)}</p>`;
  if (prob.description && prob.description !== prob.problem_statement) {
    html += `<p><strong>Hinglish Summary:</strong><br/>${escapeHtml(prob.description)}</p>`;
  }
  if (companies) {
    html += `<p><strong>Frequently Asked In:</strong> ${escapeHtml(companies)} <em>(indicative interview trends)</em></p>`;
  }
  if (sig) {
    html += `<p><strong>C++17 Function Signature:</strong> <code>${escapeHtml(sig.rawRet)} ${escapeHtml(sig.name)}(${escapeHtml(paramDesc)})</code></p>`;
  }
  return html;
}

function formatCppPretty(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let src = raw.replace(/\r\n/g, '\n').trim();
  // Preserve multi-line code if already multi-line (>2 lines), just normalise trailing spaces
  if (src.split('\n').length > 2) return src;

  // Token-aware single-line C++ pretty printer:
  // Keeps strings, chars, comments, `for(...)` clauses, and vector initializer lists `{1, 2}` intact.
  let out = '';
  let indent = 0;
  let parenDepth = 0;
  let forParenDepth = -1;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let lineStart = true;

  const pushIndent = () => {
    out += '    '.repeat(Math.max(0, indent));
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const prev = i > 0 ? src[i - 1] : '';
    const next = i + 1 < src.length ? src[i + 1] : '';

    if (inLineComment) {
      out += ch;
      if (ch === '\n') {
        inLineComment = false;
        lineStart = true;
      }
      continue;
    }

    if (ch === '"' && !inSingle && prev !== '\\') {
      inDouble = !inDouble;
      if (lineStart) {
        pushIndent();
        lineStart = false;
      }
      out += ch;
      continue;
    }
    if (ch === "'" && !inDouble && prev !== '\\') {
      inSingle = !inSingle;
      if (lineStart) {
        pushIndent();
        lineStart = false;
      }
      out += ch;
      continue;
    }
    if (inDouble || inSingle) {
      out += ch;
      continue;
    }

    if (ch === '/' && next === '/') {
      if (lineStart) {
        pushIndent();
        lineStart = false;
      }
      out += '/';
      inLineComment = true;
      continue;
    }

    // Track `for (...)` header so inner `;` stays on the same line
    if (src.slice(i, i + 4).match(/^for\b/) && !/[a-zA-Z0-9_]/.test(prev)) {
      if (lineStart) {
        pushIndent();
        lineStart = false;
      }
      out += 'for';
      i += 2;
      forParenDepth = parenDepth + 1;
      continue;
    }

    if (ch === '(') {
      parenDepth++;
      if (lineStart) {
        pushIndent();
        lineStart = false;
      }
      out += ch;
      continue;
    }
    if (ch === ')') {
      if (parenDepth === forParenDepth) forParenDepth = -1;
      parenDepth = Math.max(0, parenDepth - 1);
      out += ch;
      continue;
    }

    // Keep short initializer lists like `{}` or `{0, 1}` or `{a, b}` after `return`, `=`, `(`, `,` inline
    if (ch === '{') {
      const lookBack = out.trimEnd();
      const beforeChar = lookBack[lookBack.length - 1] || '';
      const closeIdx = src.indexOf('}', i);
      const inner = closeIdx !== -1 ? src.slice(i + 1, closeIdx) : '';
      const isShortInitializer =
        (beforeChar === '=' || beforeChar === ',' || /\breturn$/.test(lookBack) || beforeChar === '(' || beforeChar === '[' || beforeChar === ':') &&
        closeIdx !== -1 &&
        !inner.includes(';') &&
        !inner.includes('{') &&
        inner.length < 40;

      if (isShortInitializer) {
        out += src.slice(i, closeIdx + 1);
        i = closeIdx;
        lineStart = false;
        continue;
      }

      if (!lineStart && !out.endsWith(' ')) out += ' ';
      if (lineStart) {
        pushIndent();
        lineStart = false;
      }
      out += '{\n';
      indent++;
      lineStart = true;
      continue;
    }

    if (ch === '}') {
      indent = Math.max(0, indent - 1);
      if (!lineStart) out += '\n';
      pushIndent();
      out += '}';
      // Keep `else` on same line as `}` if followed by `else`
      const rest = src.slice(i + 1).trimStart();
      if (rest.startsWith('else')) {
        out += ' ';
        lineStart = false;
      } else if (rest.startsWith(';')) {
        out += ';';
        i = src.indexOf(';', i);
        out += '\n';
        lineStart = true;
      } else {
        out += '\n';
        lineStart = true;
      }
      continue;
    }

    if (ch === ';' && forParenDepth === -1) {
      if (lineStart) {
        pushIndent();
        lineStart = false;
      }
      out += ';\n';
      lineStart = true;
      continue;
    }

    if (ch === ' ' || ch === '\t' || ch === '\n') {
      if (!lineStart && !out.endsWith(' ') && !out.endsWith('\n')) {
        out += ' ';
      }
      continue;
    }

    if (lineStart) {
      pushIndent();
      lineStart = false;
    }
    out += ch;
  }

  // Clean tidy blank spaces & spacing after keywords like `if(`, `for(`, `while(`
  return out
    .split('\n')
    .map((l) => l.replace(/\s+$/, '').replace(/\b(if|for|while|switch)\(/g, '$1 ('))
    .filter((l, idx, arr) => !(l === '' && arr[idx - 1] === ''))
    .join('\n')
    .trim();
}

function buildTextSolutionMarkdown(prob) {
  const bf = prob.brute_force || {};
  const opt = prob.optimized || {};
  const parts = [];
  parts.push(`### 1. Brute Force Approach`);
  if (bf.approach) parts.push(`${bf.approach}`);
  parts.push(`- **Time Complexity:** \`${bf.time || 'N/A'}\` | **Space Complexity:** \`${bf.space || 'N/A'}\``);
  if (bf.code_cpp) {
    parts.push(`\`\`\`cpp\n${formatCppPretty(bf.code_cpp)}\n\`\`\``);
  }

  parts.push(`### 2. Optimized Interview Approach`);
  if (opt.approach) parts.push(`${opt.approach}`);
  parts.push(`- **Time Complexity:** \`${opt.time || 'N/A'}\` | **Space Complexity:** \`${opt.space || 'N/A'}\``);
  if (opt.code_cpp) {
    parts.push(`\`\`\`cpp\n${formatCppPretty(opt.code_cpp)}\n\`\`\``);
  }

  if (prob.explanation) {
    parts.push(`### 3. Hinglish Step-by-Step Explanation\n${prob.explanation}`);
  }
  if (Array.isArray(prob.edge_cases) && prob.edge_cases.length > 0) {
    parts.push(`### 4. Key Edge Cases\n${prob.edge_cases.map((e) => `- ${e}`).join('\n')}`);
  }
  return parts.join('\n\n');
}

function loadLevelBatches(dataDir) {
  const files = fs
    .readdirSync(dataDir)
    .map((name) => {
      const m = name.match(/^level(\d+)_part(\d+)\.json$/i);
      return m ? { name, level: Number(m[1]), part: Number(m[2]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.level !== b.level ? a.level - b.level : a.part - b.part));

  const byLevel = new Map();
  for (const f of files) {
    const parsed = JSON.parse(fs.readFileSync(path.join(dataDir, f.name), 'utf8'));
    if (!byLevel.has(f.level)) {
      byLevel.set(f.level, {
        levelNumber: f.level,
        theoryModules: [],
        problems: [],
        revisionData: {},
        meta: {},
      });
    }
    const bucket = byLevel.get(f.level);
    const batchLabel = parsed?.meta?.batch || `Part ${f.part}`;
    if (Array.isArray(parsed.theory)) {
      for (const th of parsed.theory) bucket.theoryModules.push({ ...th, batch: batchLabel, part: f.part });
    }
    if (Array.isArray(parsed.problems)) {
      for (const p of parsed.problems) bucket.problems.push({ ...p, batch_name: batchLabel });
    }
    if (parsed.level_revision) bucket.revisionData = parsed.level_revision;
    if (parsed.meta) bucket.meta = { ...bucket.meta, ...parsed.meta };
  }
  return byLevel;
}

async function run() {
  const dataDir = path.resolve(__dirname, '../../src/features/code-arena/data/dsa-roadmap');
  const levelMap = loadLevelBatches(dataDir);

  const allProblems = [];
  const levelRows = [];
  let globalNum = 1;

  for (const bp of ROADMAP_BLUEPRINT) {
    const loaded = levelMap.get(bp.level_number);
    const probs = loaded ? loaded.problems : [];
    levelRows.push({
      level_number: bp.level_number,
      title: bp.title,
      subtitle: bp.subtitle,
      description: bp.description,
      target_problem_count: probs.length > 0 ? probs.length : bp.target_problem_count,
      is_unlocked: probs.length > 0,
      theory_modules: loaded ? loaded.theoryModules : [],
      revision_data: loaded ? loaded.revisionData : {},
      meta: loaded ? loaded.meta : {},
    });
    for (const p of probs) {
      allProblems.push({ ...p, globalNum: globalNum++ });
    }
  }

  console.log(`Loaded ${allProblems.length} roadmap problems to seed into standard coding_problems + coding_sheet_problems.`);

  const metadata = {
    source: 'DSA for Freshers: Company Roadmap (Levels 1–5)',
    roadmap_enabled: true,
    total_count: allProblems.length,
    planned_total_count: ROADMAP_BLUEPRINT.reduce((acc, l) => acc + l.target_problem_count, 0),
    unlocked_levels: Array.from(levelMap.keys()).sort((a, b) => a - b),
  };

  // 1. Ensure coding_sheets row uses standard sheet_type = 'DSA'
  const pgSql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });
  let sheetId;
  try {
    const existing = await pgSql`SELECT id FROM public.coding_sheets WHERE slug = ${SHEET_SLUG} LIMIT 1`;
    if (existing.length > 0) {
      sheetId = existing[0].id;
      await pgSql`
        UPDATE public.coding_sheets
        SET title = ${SHEET_TITLE},
            description = ${SHEET_DESCRIPTION},
            sheet_type = 'DSA',
            is_public = true,
            enrollment_access = 'public',
            metadata = ${pgSql.json(metadata)},
            updated_at = NOW()
        WHERE id = ${sheetId}
      `;
    } else {
      const inserted = await pgSql`
        INSERT INTO public.coding_sheets (
          title, description, slug, sheet_type, is_public, published_at,
          enrollment_access, enrollment_passcode, created_by, metadata
        ) VALUES (
          ${SHEET_TITLE}, ${SHEET_DESCRIPTION}, ${SHEET_SLUG}, 'DSA', true, NOW(),
          'public', NULL, ${CREATOR_USER_ID}, ${pgSql.json(metadata)}
        )
        RETURNING id
      `;
      sheetId = inserted[0].id;
    }
  } finally {
    await pgSql.end();
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 2. Sync coding_sheet_roadmap_levels (for optional Level Theory & Revision modals inside SheetDetailClient)
  const { error: lvlErr } = await supabase
    .from('coding_sheet_roadmap_levels')
    .upsert(levelRows.map((l) => ({ sheet_id: sheetId, ...l })), { onConflict: 'sheet_id,level_number' });
  if (lvlErr) throw lvlErr;

  // 3. Upsert every problem into coding_problems, coding_problem_test_cases, and coding_sheet_problems
  let processed = 0;
  let totalTcs = 0;

  for (const prob of allProblems) {
    const padNum = String(prob.globalNum).padStart(3, '0');
    const codeSlug = `roadmap-${slugify(prob.id)}-${slugify(prob.title)}`.slice(0, 120);
    const sig = parseCppSignatureFromSnippet(prob.optimized?.code_cpp || prob.brute_force?.code_cpp || '');

    // Assign specialized outputContract when needed
    let contractSig = null;
    if (sig) {
      contractSig = {
        name: sig.name,
        params: sig.params.map((p) => ({ name: p.name, type: p.type })),
        return: sig.return,
      };
      const firstTcOut = String(prob.test_cases?.[0]?.output || '');
      if (prob.id === 'L1-015') {
        contractSig.outputContract = { type: 'return_value', ordering: 'unordered' };
      } else if (prob.id === 'L1-066') {
        contractSig.outputContract = { type: 'return_value', ordering: 'unordered_groups' };
      } else if (/^\d+\s*,\s*\[/.test(firstTcOut) && sig.params[0]) {
        contractSig.outputContract = {
          type: 'return_and_mutation',
          targetParam: sig.params[0].name,
          lengthRef: 'return_value',
          ordering: prob.id === 'L1-051' ? 'unordered' : 'exact',
        };
      } else if (sig.return.type === 'void' && sig.params[0]) {
        contractSig.outputContract = {
          type: 'mutated_parameter',
          targetParam: sig.params[0].name,
          ordering: 'exact',
        };
      }
    }

    const inputDesc = (sig?.params || []).map((p) => `${p.name} (${p.rawType})`).join(', ') || 'Standard Input';
    const outputDesc = sig
      ? sig.return.type === 'void'
        ? `In-place modified ${sig.params[0]?.name || 'input'}`
        : `${sig.rawRet}`
      : 'Standard Output';

    const tcs = Array.isArray(prob.test_cases) ? prob.test_cases : [];
    const lastTc = tcs[tcs.length - 1];

    const problemPayload = {
      title: `${padNum}. ${prob.title}`,
      slug: codeSlug,
      description: buildDescriptionHtml(prob, sig),
      difficulty: normalizeDifficulty(prob.difficulty),
      tags: Array.from(new Set([prob.topic, `Level ${prob.level || 1}`, ...(prob.company_tags || []).slice(0, 4)])),
      constraints: Array.isArray(prob.constraints) ? prob.constraints.join('\n') : '',
      input_format: inputDesc,
      output_format: outputDesc,
      time_limit_ms: 2000,
      memory_limit_mb: 256,
      supported_languages: ['cpp17', 'python', 'java', 'javascript', 'c'],
      source_type: 'INTERNAL',
      external_platform: null,
      external_problem_id: prob.id,
      is_published: true,
      created_by: CREATOR_USER_ID,
      starter_code: mapSignatureForStarter(prob, sig),
      signature: contractSig,
      examples: tcs.map((tc, i) => ({
        input: tc.input,
        output: tc.output,
        explanation: tc.explanation || undefined,
        sample_name: `Example ${i + 1}`,
      })),
      explanation: `${prob.theory ? `**Concept Theory:** ${prob.theory}\n\n` : ''}${prob.explanation || ''}`,
      hints: [
        ...(prob.theory ? [`Concept Theory: ${prob.theory}`] : []),
        ...(prob.brute_force?.approach
          ? [`Brute Force (${prob.brute_force.time}, ${prob.brute_force.space}): ${prob.brute_force.approach}`]
          : []),
        ...(prob.optimized?.approach
          ? [`Optimized Hint (${prob.optimized.time}, ${prob.optimized.space}): ${prob.optimized.approach}`]
          : []),
      ],
      metadata: {
        source: 'DSA Roadmap',
        level: prob.level || 1,
        problem_code: prob.id,
        group_topic: prob.topic,
        question_number: prob.globalNum,
        company_tags: prob.company_tags || [],
        optimal_worst_case_time: prob.optimized?.time || '',
        optimal_auxiliary_space: prob.optimized?.space || '',
        edge_cases: Array.isArray(prob.edge_cases) ? prob.edge_cases.join(' | ') : '',
        extreme_test_case: lastTc ? `Input: ${lastTc.input} -> Expected: ${lastTc.output}` : '',
        assumptions: 'company_tags indicative interview trends. Return via Solution class method (C++17 / Python / Java / JS).',
      },
    };

    const { data: existingProb } = await supabase
      .from('coding_problems')
      .select('id')
      .eq('slug', codeSlug)
      .maybeSingle();

    let problemId;
    if (existingProb) {
      problemId = existingProb.id;
      const { error: uErr } = await supabase.from('coding_problems').update(problemPayload).eq('id', problemId);
      if (uErr) throw uErr;
    } else {
      const { data: insProb, error: iErr } = await supabase
        .from('coding_problems')
        .insert(problemPayload)
        .select('id')
        .single();
      if (iErr) throw iErr;
      problemId = insProb.id;
    }

    // Replace test cases cleanly
    await supabase.from('coding_problem_test_cases').delete().eq('problem_id', problemId);

    const tcRows = tcs.map((tc, tIdx) => {
      const normalized = formatTestCaseForHarness(prob, tc, sig);
      return {
        problem_id: problemId,
        input: normalized.input,
        expected_output: normalized.expected_output,
        is_hidden: tIdx >= 2, // first 2 are Sample 1 & Sample 2; 3rd+ become Hidden/Constraint cases just like TCS 220!
        sample_name: tIdx < 2 ? `Sample ${tIdx + 1}` : `Boundary ${tIdx + 1}`,
        order_index: tIdx,
      };
    });

    if (tcRows.length > 0) {
      const { error: tcErr } = await supabase.from('coding_problem_test_cases').insert(tcRows);
      if (tcErr) throw tcErr;
      totalTcs += tcRows.length;
    }

    const { error: linkErr } = await supabase.from('coding_sheet_problems').upsert(
      {
        sheet_id: sheetId,
        problem_id: problemId,
        order_index: prob.globalNum - 1,
        text_solution: buildTextSolutionMarkdown(prob),
      },
      { onConflict: 'sheet_id,problem_id' }
    );
    if (linkErr) throw linkErr;

    processed++;
    if (processed % 15 === 0 || processed === allProblems.length) {
      console.log(`Processed ${processed} / ${allProblems.length} problems...`);
    }
  }

  const { count: linkedCount } = await supabase
    .from('coding_sheet_problems')
    .select('*', { count: 'exact', head: true })
    .eq('sheet_id', sheetId);

  console.log(`\nDONE! Sheet "${SHEET_TITLE}" (id=${sheetId}, sheet_type='DSA', slug=${SHEET_SLUG}) -> ${linkedCount} problems linked, ${totalTcs} test cases inserted.`);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
