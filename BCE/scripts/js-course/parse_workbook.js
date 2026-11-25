const fs = require('fs');
const path = require('path');
const assert = require('assert');

const RAW_PATH = 'C:/Users/adity/.gemini/antigravity/brain/ed784ced-db8d-4166-864b-0892b363871e/scratch/js_workbook_raw.txt';
const OUT_DIR = path.join('d:', 'smart learn', 'BCE', 'src', 'features', 'courses', 'data', 'js-mastery-workbook');
fs.mkdirSync(OUT_DIR, { recursive: true });

const raw = fs.readFileSync(RAW_PATH, 'utf8').replace(/\r/g, '');
const pages = raw.split('\f').map(p =>
  p
    .split('\n')
    .filter(l => !/^\s*JavaScript Mastery Workbook\s+Page \d+\s*$/.test(l))
    .join('\n')
);

// Helper: clean common minimum leading whitespace while keeping internal indentation
function dedentCode(lines) {
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return '';
  const minIndent = Math.min(...nonEmpty.map(l => l.match(/^ */)[0].length));
  return lines.map(l => l.slice(Math.min(minIndent, l.length))).join('\n').trimEnd();
}

// Helper: join wrapped prose lines while keeping blank/bullet structure
function cleanProseLines(lines) {
  return lines
    .map(l => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. Parse Meta (Page 4 + Page 70)
const page4Lines = pages[3].split('\n').map(l => l.trimEnd());
const howToUse = [
  'Roadmap (Part A) ko order mein follow karo. Har topic mein: kya seekhna hai, ek chhota code example aur 6 step-by-step practice tasks.',
  'Practice ka tareeka: pehle khud try karo, atak jao to sirf Step 1 dekho, phir Step 2. Code type karke chalao, copy-paste nahi.',
  'Projects (Part B) topics 4-14 ke baad shuru karo. Har project mein 7-8 guided steps aur starter code hai.',
  'Interview Q&A (Part C) ko roz 15-20 questions padho aur jawab bina dekhe bolkar check karo. Coding problems khud likho, phir solution se compare karo.',
  'MCQs (Part D) self-test hain. Answer key aur explanations end mein hain.',
  'Har snippet ko node file.js ya browser console mein chalakar verify karo. Is workbook ke output-prediction answers aur coding solutions Node.js 22 mein test kiye gaye hain.'
];

const researchNotes = [
  'Topic order standard curricula se align kiya gaya hai: javascript.info (language + browser parts), freeCodeCamp JS Algorithms & Data Structures (basic JS, ES6, OOP, FP, algorithms, projects), The Odin Project (Foundations + Full Stack JS), Udemy courses (fundamentals, DOM, async, APIs, deployment) aur WsCube Tech / Scaler ke JavaScript syllabus.',
  'Common sequence: fundamentals -> functions -> arrays/objects -> ES6+ -> DOM/events -> async/fetch -> error handling -> tooling -> projects -> interview practice.',
  'Interview questions commonly asked patterns hain jo service aur product companies ke JavaScript rounds mein baar baar aate hain. Sab content scratch se structured aur Node.js 22 verified hai.'
];

const studyPlan = [
  { week: 1, focus: 'Topics 1-3: setup, types, operators, loops', output: 'FizzBuzz, patterns, Project 1' },
  { week: 2, focus: 'Topic 4-5: functions, scope, closures', output: 'once/memoize/debounce likho' },
  { week: 3, focus: 'Topic 6-7: arrays, strings, regex', output: '20 coding problems' },
  { week: 4, focus: 'Topic 8-9: objects, this, ES6+, modules', output: 'Project 2 (Todo app)' },
  { week: 5, focus: 'Topic 10: prototypes, classes', output: 'Bank account + Emitter classes' },
  { week: 6, focus: 'Topic 11-12: DOM, events', output: 'Projects 3, 4, 5' },
  { week: 7, focus: 'Topic 13: async, fetch', output: 'Project 6' },
  { week: 8, focus: 'Topic 14: errors, debugging', output: 'Projects 7, 8' },
  { week: 9, focus: 'Topic 15: Node, npm, Git', output: 'Project 12 (API)' },
  { week: 10, focus: 'Topic 16: DSA patterns', output: '40 DSA problems' },
  { week: 11, focus: 'Interview Q&A + MCQs revision', output: '300 questions revise' },
  { week: 12, focus: 'Mock interviews + portfolio', output: 'Projects 9-11 polish, GitHub push' },
];

const freeResources = [
  { name: 'javascript.info', url: 'https://javascript.info', desc: 'The Modern JavaScript Tutorial (language + browser, tasks ke saath)' },
  { name: 'freeCodeCamp JS', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/', desc: 'JavaScript Algorithms and Data Structures (project-based)' },
  { name: 'The Odin Project', url: 'https://www.theodinproject.com', desc: 'Foundations aur Full Stack JavaScript path' },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', desc: 'Har JavaScript & Web API ka official reference' },
  { name: 'Udemy Complete JS / Masterclass', url: 'https://www.udemy.com', desc: 'Comprehensive video courses (sale par affordable)' },
  { name: 'WsCube Tech & Scaler Blogs', url: 'https://www.scaler.com/topics/javascript/', desc: 'Topic-by-topic JavaScript syllabus checklist' },
  { name: 'LeetCode / HackerRank / Codewars', url: 'https://leetcode.com', desc: 'Coding practice (JavaScript language select karke solve karo)' },
];

const checklist = [
  'Closures, this, hoisting, event loop ko bina dekhe samjha sakte ho.',
  'Promise.all / async-await / fetch error handling ka code likh sakte ho.',
  'map/filter/reduce se 10 problems solve kiye hain.',
  '3 projects GitHub par live hain (README + screenshot ke saath).',
  'Debounce, throttle, memoize, curry, deep clone khud likh sakte ho.',
  'Big-O ka basic idea hai aur array/string/hash-map problems 40+ solve kiye hain.',
  'Git, npm aur DevTools comfortably use kar lete ho.'
];

const meta = {
  title: 'JavaScript Mastery Workbook',
  subtitle: 'Zero se interview-ready tak: step-by-step roadmap, practice, guided projects, MCQs aur 500+ interview questions',
  preparedDate: '25 November 2026',
  language: 'Hinglish (Hindi + English) with JavaScript code',
  stats: { topics: 16, practiceTasks: 96, projects: 12, interviewQuestions: 593, mcqs: 150 },
  howToUse,
  researchNotes,
  studyPlan,
  freeResources,
  checklist
};

// Full concatenated document text for clean contiguous slicing across page breaks
const fullText = pages.slice(4).join('\n'); // starts from Page 5 (Part A)

const idxPartB = fullText.indexOf(' Part B: Small Guided Projects');
const idxPartC = fullText.indexOf(' Part C: Interview Questions (593)');
const idxC1 = fullText.indexOf(' C1. Concepts / Theory (418)');
const idxC2 = fullText.indexOf(' C2. Coding Problems with Solutions (123)');
const idxC3 = fullText.indexOf(' C3. Output Prediction (52)');
const idxPartD = fullText.indexOf(' Part D: MCQs (150)');
const idxKey = fullText.indexOf(' MCQ Answer Key');
const idxExplanations = fullText.indexOf(' Explanations (jahan zaroori)');
const idxAppendix = fullText.indexOf(' Appendix: Free Resources');

assert(idxPartB > 0 && idxPartC > idxPartB && idxC1 > idxPartC && idxC2 > idxC1 && idxC3 > idxC2 && idxPartD > idxC3 && idxKey > idxPartD && idxExplanations > idxKey && idxAppendix > idxExplanations, 'Section markers missing');

// ---------------- PART A PARSER ----------------
const partAText = fullText.slice(0, idxPartB);
const partALines = partAText.split('\n');
let currentPhase = '';
const topics = [];
let curTopic = null;
let mode = ''; // 'kya' | 'code' | 'tasks'
let bulletBuf = [];
let codeBuf = [];
let curTask = null;

function flushBullet() {
  if (bulletBuf.length > 0 && curTopic) {
    curTopic.kyaSeekhnaHai.push(cleanProseLines(bulletBuf));
    bulletBuf = [];
  }
}

for (const line of partALines) {
  const t = line.trim();
  if (!t || t.startsWith('Part A:') || t.startsWith('Har topic ka format') || t.startsWith('saath).')) continue;

  const phaseM = t.match(/^Phase \d+: .+$/);
  if (phaseM) {
    currentPhase = t;
    continue;
  }

  const topicM = line.match(/^ (\d{1,2})\. ([A-Z].+)$/);
  if (topicM) {
    flushBullet();
    if (curTopic && codeBuf.length > 0 && !curTopic.codeExample) {
      curTopic.codeExample = dedentCode(codeBuf);
      codeBuf = [];
    }
    curTask = null;
    curTopic = {
      id: Number(topicM[1]),
      title: topicM[2].trim(),
      phase: currentPhase,
      kyaSeekhnaHai: [],
      codeExample: '',
      tasks: []
    };
    topics.push(curTopic);
    mode = '';
    continue;
  }

  if (!curTopic) continue;

  if (t === 'Kya seekhna hai') {
    mode = 'kya';
    continue;
  }

  if (t === 'Practice tasks (step-by-step)') {
    flushBullet();
    if (codeBuf.length > 0) {
      curTopic.codeExample = dedentCode(codeBuf);
      codeBuf = [];
    }
    mode = 'tasks';
    continue;
  }

  if (mode === 'kya') {
    if (/^\s*•\s+/.test(line)) {
      flushBullet();
      bulletBuf.push(t.replace(/^•\s*/, ''));
    } else if (/^ {3}/.test(line) && !/^\s{4}[a-z]/.test(line)) {
      // Transition to code block (notice bullets wrap at indent ~4 cols, whereas code block starts around indent 3 with non-prose start or keyword/symbol)
      // Wait: check if bulletBuf ends mid-sentence or code starts! Look at wrapped bullets:
      // P5: '  • console.log() se output dekho; script ko HTML mein <script> se ya node file.js se chalao'
      // P6: '   console.log('5' + 3);' (indent 3!) vs wrapped bullet at indent 4!
      // Look carefully: wrapped bullet lines in `pdftotext -layout` ALWAYS have indent >= 4 matching after '  • '! Wait: let's check both!
      if (/^ {4}/.test(line) && bulletBuf.length > 0 && !/[;{}()=]$/.test(t) && !/^(const|let|var|function|class|async|for|if|try|import|console|npm|git|\/\/)/.test(t)) {
        bulletBuf.push(t);
      } else {
        flushBullet();
        mode = 'code';
        codeBuf.push(line);
      }
    } else {
      flushBullet();
      mode = 'code';
      codeBuf.push(line);
    }
    continue;
  }

  if (mode === 'code') {
    codeBuf.push(line);
    continue;
  }

  if (mode === 'tasks') {
    const taskM = line.match(/^ (\d{1,2}\.\d) (.+)$/);
    if (taskM) {
      curTask = { id: taskM[1], title: taskM[2].trim(), steps: [] };
      curTopic.tasks.push(curTask);
      continue;
    }
    const stepM = line.match(/^\s+Step (\d): (.+)$/);
    if (stepM && curTask) {
      curTask.steps.push({ step: Number(stepM[1]), text: stepM[2].trim() });
      continue;
    }
    if (curTask && curTask.steps.length > 0 && /^\s{6,}/.test(line)) {
      curTask.steps[curTask.steps.length - 1].text += ' ' + t;
    } else if (curTask && curTask.steps.length === 0) {
      curTask.title += ' ' + t;
    }
  }
}

console.log('Part A topics:', topics.length, 'tasks:', topics.reduce((a, b) => a + b.tasks.length, 0));
assert.strictEqual(topics.length, 16, 'Expected 16 topics in Part A');
assert.strictEqual(topics.reduce((a, b) => a + b.tasks.length, 0), 96, 'Expected 96 tasks in Part A');

// ---------------- PART B PARSER ----------------
const partBText = fullText.slice(idxPartB, idxPartC);
const partBLines = partBText.split('\n');
const projects = [];
let curProj = null;
let projMode = ''; // 'steps' | 'code'
let projCode = [];

for (const line of partBLines) {
  const t = line.trim();
  if (!t || t.startsWith('Part B:') || t.startsWith('Har project ko') || t.startsWith('baad browser')) continue;

  const pM = line.match(/^ Project (\d{1,2}): (.+)$/);
  if (pM) {
    if (curProj && projCode.length > 0) {
      curProj.starterCode = dedentCode(projCode);
      projCode = [];
    }
    curProj = {
      id: Number(pM[1]),
      title: pM[2].trim(),
      level: '',
      skills: [],
      steps: [],
      starterCode: ''
    };
    projects.push(curProj);
    projMode = 'meta';
    continue;
  }

  if (!curProj) continue;

  const lvlM = t.match(/^Level:\s*(.+?)\s*\|\s*Skills:\s*(.+)$/);
  if (lvlM) {
    curProj.level = lvlM[1].trim();
    curProj.skills = lvlM[2].split(',').map(s => s.trim()).filter(Boolean);
    projMode = 'steps';
    continue;
  }

  if (t === 'Starter code') {
    projMode = 'code';
    projCode = [];
    continue;
  }

  if (projMode === 'steps') {
    const stepM = line.match(/^ (\d{1,2})\. (.+)$/);
    if (stepM) {
      curProj.steps.push(stepM[2].trim());
    } else if (curProj.steps.length > 0) {
      curProj.steps[curProj.steps.length - 1] += ' ' + t;
    }
  } else if (projMode === 'code') {
    projCode.push(line);
  }
}
if (curProj && projCode.length > 0) {
  curProj.starterCode = dedentCode(projCode);
}
console.log('Part B projects:', projects.length);
assert.strictEqual(projects.length, 12, 'Expected 12 projects in Part B');

// ---------------- PART C1 PARSER (Q1..Q418) ----------------
const c1Text = fullText.slice(idxC1, idxC2);
const c1Lines = c1Text.split('\n');
const c1KnownCategories = [
  'Variables, Data Types & Operators',
  'Control Flow & Loops',
  'Functions',
  'Scope, Hoisting, Closures & this',
  'Arrays',
  'Strings',
  'Objects & Prototypes',
  'ES6+ Modern Features',
  'Async JS, Promises & Event Loop',
  'DOM, Events & Browser APIs',
  'Errors, Debugging, Testing & Node'
];
let curC1Cat = '';
const c1Questions = [];
let curQ = null;

for (const line of c1Lines) {
  const t = line.trim();
  if (!t || t.startsWith('C1. Concepts')) continue;
  if (c1KnownCategories.includes(t)) {
    curC1Cat = t;
    continue;
  }
  const qM = line.match(/^ Q(\d+)\.\s*(.+)$/);
  if (qM) {
    curQ = {
      num: Number(qM[1]),
      id: `Q${qM[1]}`,
      category: curC1Cat,
      question: qM[2].trim(),
      answerLines: []
    };
    c1Questions.push(curQ);
    continue;
  }
  if (curQ) {
    // Some Q titles wrap before answer starts, or answer starts indented ~4-5 spaces
    curQ.answerLines.push(line);
  }
}

// Re-join wrapped question/answer cleanly in C1
const c1Final = c1Questions.map(q => {
  let question = q.question;
  let ansIdx = 0;
  while (!/[?.]$/.test(question) && !question.includes('?') && ansIdx < q.answerLines.length) {
    const nxt = q.answerLines[ansIdx].trim();
    if (nxt) {
      question += ' ' + nxt;
      ansIdx++;
    } else break;
  }
  const answer = cleanProseLines(q.answerLines.slice(ansIdx));
  return { num: q.num, id: q.id, category: q.category, question, answer };
});
console.log('Part C1 count:', c1Final.length, 'first:', c1Final[0]?.id, 'last:', c1Final[c1Final.length - 1]?.id);
assert.strictEqual(c1Final.length, 418, 'Expected 418 C1 questions');

// ---------------- PART C2 PARSER (Q419..Q541) ----------------
const c2Text = fullText.slice(idxC2, idxC3);
const c2Lines = c2Text.split('\n');
const c2Questions = [];
let curC2 = null;
for (const line of c2Lines) {
  const t = line.trim();
  if (!t && !curC2) continue;
  if (t.startsWith('C2. Coding') || t.startsWith('Solutions JavaScript mein') || t.startsWith('koi function undefined')) continue;
  const qM = line.match(/^ Q(\d+)\.\s*(.+)$/);
  if (qM) {
    curC2 = {
      num: Number(qM[1]),
      id: `Q${qM[1]}`,
      prompt: qM[2].trim(),
      solutionLines: []
    };
    c2Questions.push(curC2);
    continue;
  }
  if (curC2) {
    curC2.solutionLines.push(line);
  }
}
const c2Final = c2Questions.map(q => {
  // Join soft-wrapped PDF lines cleanly (PDF wrapped long lines at col ~90-95; rejoin so JS statements don't break on `return\nexpr`)
  const joined = cleanProseLines(q.solutionLines);
  return {
    num: q.num,
    id: q.id,
    prompt: q.prompt,
    solution: joined
  };
});
console.log('Part C2 count:', c2Final.length, 'first:', c2Final[0]?.id, 'last:', c2Final[c2Final.length - 1]?.id);
assert.strictEqual(c2Final.length, 123, 'Expected 123 C2 questions');

// ---------------- PART C3 PARSER (Q542..Q593) ----------------
const c3Text = fullText.slice(idxC3, idxPartD);
const c3Lines = c3Text.split('\n');
const c3Questions = [];
let curC3 = null;
for (const line of c3Lines) {
  const t = line.trim();
  if (!t && !curC3) continue;
  if (t.startsWith('C3. Output') || t.startsWith('Har snippet ka output')) continue;
  const qM = line.match(/^ Q(\d+)\.\s*(.+)$/);
  if (qM) {
    curC3 = {
      num: Number(qM[1]),
      id: `Q${qM[1]}`,
      prompt: qM[2].trim(),
      bodyLines: []
    };
    c3Questions.push(curC3);
    continue;
  }
  if (curC3) {
    curC3.bodyLines.push(line);
  }
}

const c3Final = c3Questions.map(q => {
  const ansIdx = q.bodyLines.findIndex(l => /^\s*Answer:/.test(l));
  const codeLines = ansIdx >= 0 ? q.bodyLines.slice(0, ansIdx) : q.bodyLines;
  const ansLines = ansIdx >= 0 ? q.bodyLines.slice(ansIdx) : [];
  const rawAns = cleanProseLines(ansLines).replace(/^Answer:\s*/, '');
  const dashIdx = rawAns.indexOf(' - ');
  const answer = dashIdx >= 0 ? rawAns.slice(0, dashIdx).trim() : rawAns;
  const explanation = dashIdx >= 0 ? rawAns.slice(dashIdx + 3).trim() : '';
  return {
    num: q.num,
    id: q.id,
    prompt: q.prompt,
    code: dedentCode(codeLines),
    answer,
    explanation
  };
});
console.log('Part C3 count:', c3Final.length, 'first:', c3Final[0]?.id, 'last:', c3Final[c3Final.length - 1]?.id);
assert.strictEqual(c3Final.length, 52, 'Expected 52 C3 questions');

// ---------------- PART D PARSER (150 MCQs + Answer Key + Explanations) ----------------
const mcqText = fullText.slice(idxPartD, idxKey);
const keyText = fullText.slice(idxKey, idxExplanations);
const expText = fullText.slice(idxExplanations, idxAppendix);

const keyMap = {};
for (const m of keyText.matchAll(/(\d{1,3})-([A-D])\b/g)) {
  keyMap[Number(m[1])] = m[2];
}
console.log('Key map entries:', Object.keys(keyMap).length);
assert.strictEqual(Object.keys(keyMap).length, 150, 'Expected 150 answers in key');

const expMap = {};
let curExpNum = null;
for (const line of expText.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('Explanations (')) continue;
  const m = t.match(/^(\d{1,3})\s*\([A-D]\):\s*(.+)$/);
  if (m) {
    curExpNum = Number(m[1]);
    expMap[curExpNum] = m[2].trim();
  } else if (curExpNum) {
    expMap[curExpNum] += ' ' + t;
  }
}

const mcqCats = [
  'Basics: Variables, Types, Operators',
  'Control Flow, Loops & Functions',
  'Scope, Closures, this & Hoisting',
  'Arrays, Strings & Objects',
  'Async JS, DOM & Browser'
];
let curMcqCat = '';
const mcqs = [];
let curMcq = null;
let curOpt = null;

for (const line of mcqText.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('Part D:') || t.startsWith('Har question ka ek sahi option')) continue;
  if (mcqCats.includes(t)) {
    curMcqCat = t;
    continue;
  }
  const qM = line.match(/^ (\d{1,3})\.\s+(.+)$/);
  if (qM) {
    curOpt = null;
    curMcq = {
      num: Number(qM[1]),
      category: curMcqCat,
      question: qM[2].trim(),
      options: { A: '', B: '', C: '', D: '' }
    };
    mcqs.push(curMcq);
    continue;
  }
  const optM = line.match(/^\s+\(([A-D])\)\s*(.+)$/);
  if (optM && curMcq) {
    curOpt = optM[1];
    curMcq.options[curOpt] = optM[2].trim();
    continue;
  }
  if (curMcq) {
    if (curOpt) {
      curMcq.options[curOpt] += ' ' + t;
    } else {
      curMcq.question += ' ' + t;
    }
  }
}

const mcqsFinal = mcqs.map((m, idx) => {
  assert.strictEqual(m.num, idx + 1, `MCQ numbering mismatch at ${idx + 1}: got ${m.num}`);
  const ans = keyMap[m.num];
  assert(ans && ['A', 'B', 'C', 'D'].includes(ans), `Missing answer for MCQ ${m.num}`);
  assert(m.options.A && m.options.B && m.options.C && m.options.D, `Missing option in MCQ ${m.num}: ${JSON.stringify(m)}`);
  return {
    num: m.num,
    category: m.category,
    question: m.question,
    option_a: m.options.A,
    option_b: m.options.B,
    option_c: m.options.C,
    option_d: m.options.D,
    correct_option: ans,
    explanation: expMap[m.num] || null
  };
});

console.log('Part D MCQs parsed:', mcqsFinal.length, 'with explanations:', Object.keys(expMap).length);
assert.strictEqual(mcqsFinal.length, 150, 'Expected 150 MCQs');

// Write structured JSON files
fs.writeFileSync(path.join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'topics_partA.json'), JSON.stringify(topics, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'projects_partB.json'), JSON.stringify(projects, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'interview_C1_theory.json'), JSON.stringify(c1Final, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'interview_C2_coding.json'), JSON.stringify(c2Final, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'interview_C3_output.json'), JSON.stringify(c3Final, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'mcqs_partD.json'), JSON.stringify(mcqsFinal, null, 2));

console.log('ALL FILES WRITTEN TO', OUT_DIR);
