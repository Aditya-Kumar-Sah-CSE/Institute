const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ts = require('typescript');
const postgres = require('postgres');
const { createInteractiveStepsForLesson } = require('./build_guided_steps');

const BCE_ROOT = path.join('d:', 'smart learn', 'BCE');
const DATA_DIR = path.join(BCE_ROOT, 'src', 'features', 'courses', 'data', 'js-mastery-workbook');

// Load DB URL from BCE/.env
const env = {};
for (const line of fs.readFileSync(path.join(BCE_ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}
assert(env.DATABASE_URL, 'DATABASE_URL missing in BCE/.env');

const sql = postgres(env.DATABASE_URL, { max: 1 });

// Load extracted 70-page PDF dataset
const meta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'meta.json'), 'utf8'));
const topicsPartA = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'topics_partA.json'), 'utf8'));
const taskSolutions = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'task_solutions_partA.json'), 'utf8'));
const projectsPartB = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'projects_partB.json'), 'utf8'));
const c1Theory = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'interview_C1_theory.json'), 'utf8'));
const c2Coding = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'interview_C2_coding.json'), 'utf8'));
const c3Output = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'interview_C3_output.json'), 'utf8'));
const mcqsPartD = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'mcqs_partD.json'), 'utf8'));

assert.strictEqual(topicsPartA.length, 16);
assert.strictEqual(projectsPartB.length, 12);
assert.strictEqual(c1Theory.length, 418);
assert.strictEqual(c2Coding.length, 123);
assert.strictEqual(c3Output.length, 52);
assert.strictEqual(mcqsPartD.length, 150);

const COURSE_TITLE = 'JavaScript Mastery Workbook (Zero to Interview-Ready)';
const CREATOR_ID = 'd175f6b1-ef9d-428a-8a26-14365a624ae9'; // ADITYA KUMAR SAH (super_admin)

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function prettyJS(code) {
  const sf = ts.createSourceFile('s.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (sf.parseDiagnostics && sf.parseDiagnostics.length > 0) return code;
  const transformer = ctx => root => {
    const visit = n => {
      const updated = ts.visitEachChild(n, visit, ctx);
      if (ts.isBlock(updated)) return ts.factory.createBlock(updated.statements, true);
      return updated;
    };
    return ts.visitNode(root, visit);
  };
  const res = ts.transform(sf, [transformer]);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  return printer.printFile(res.transformed[0]).trim();
}

function weekTimestamp(weekNum) {
  const day = String(weekNum).padStart(2, '0');
  return new Date(`2026-11-${day}T12:00:00Z`);
}

// HTML Builders (all minified between tags inside .wb-lesson so white-space: pre-wrap never leaks stray gaps)
function buildOrientationHtml() {
  const planRows = meta.studyPlan
    .map(w => `<tr><td><strong>Week ${w.week}</strong></td><td>${esc(w.focus)}</td><td>${esc(w.output)}</td></tr>`)
    .join('');

  return `<div class="wb-lesson">` +
    `<div class="wb-hero">` +
      `<div class="wb-badges">` +
        `<span class="wb-badge">16 Roadmap Topics</span>` +
        `<span class="wb-badge">96 Step-by-Step Tasks</span>` +
        `<span class="wb-badge">12 Guided Projects</span>` +
        `<span class="wb-badge">593 Interview Questions</span>` +
        `<span class="wb-badge wb-badge-ok">150 Live MCQs</span>` +
      `</div>` +
      `<h2>${esc(meta.title)}</h2>` +
      `<p>${esc(meta.subtitle)}</p>` +
      `<p><strong>Language:</strong> ${esc(meta.language)} • <strong>Verified on:</strong> Node.js 22 &amp; Browser DevTools • <strong>Prepared:</strong> ${esc(meta.preparedDate)}</p>` +
    `</div>` +
    `<div class="wb-card">` +
      `<h3>How to Use This Workbook</h3>` +
      `<ul>${meta.howToUse.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` +
    `</div>` +
    `<div class="wb-callout">` +
      `<h3>Content Kahan Se Aaya (Research Notes)</h3>` +
      meta.researchNotes.map(n => `<p>${esc(n)}</p>`).join('') +
    `</div>` +
    `<div class="wb-card">` +
      `<h3>12-Week Study Plan (Daily 1.5–2 Ghante)</h3>` +
      `<div class="wb-table-wrap"><table><thead><tr><th>Week</th><th>Focus</th><th>Expected Output</th></tr></thead><tbody>${planRows}</tbody></table></div>` +
    `</div>` +
  `</div>`;
}

function buildTopicHtml(topic) {
  const bullets = topic.kyaSeekhnaHai.map(b => `<li>${esc(b)}</li>`).join('');
  const tasksHtml = topic.tasks
    .map(task => {
      const steps = task.steps.map(s => `<li><strong>Step ${s.step}:</strong> ${esc(s.text)}</li>`).join('');
      const sol = taskSolutions[task.id] || '';
      return `<div class="wb-task">` +
        `<div class="wb-qa-q">${esc(task.id)} — ${esc(task.title)}</div>` +
        `<ul>${steps}</ul>` +
        (sol
          ? `<details><summary>Reference JS Solution (pehle khud try karo, phir verify karo)</summary><pre><code>${esc(sol)}</code></pre></details>`
          : '') +
      `</div>`;
    })
    .join('');

  return `<div class="wb-lesson">` +
    `<div class="wb-hero">` +
      `<div class="wb-badges">` +
        `<span class="wb-badge">${esc(topic.phase)}</span>` +
        `<span class="wb-badge wb-badge-ok">Topic ${topic.id} of 16</span>` +
        `<span class="wb-badge">6 Step-by-Step Tasks</span>` +
      `</div>` +
      `<h2>${topic.id}. ${esc(topic.title)}</h2>` +
      `<p>Roadmap ka order follow karo: pehle concepts aur example code samjho, phir har practice task khud run karo.</p>` +
    `</div>` +
    `<div class="wb-card">` +
      `<h3>Kya Seekhna Hai</h3>` +
      `<ul>${bullets}</ul>` +
    `</div>` +
    `<div class="wb-card">` +
      `<h3>Core Code Example</h3>` +
      `<pre><code>${esc(topic.codeExample)}</code></pre>` +
    `</div>` +
    `<div class="wb-task-grid">` +
      `<h3>Practice Tasks (Step-by-Step Guided)</h3>` +
      tasksHtml +
    `</div>` +
  `</div>`;
}

function buildProjectHtml(project) {
  const skillsHtml = project.skills.map(s => `<span class="wb-badge">${esc(s)}</span>`).join('');
  const stepsHtml = project.steps.map(s => `<li>${esc(s)}</li>`).join('');

  return `<div class="wb-lesson">` +
    `<div class="wb-hero">` +
      `<div class="wb-badges">` +
        `<span class="wb-badge wb-badge-warn">Project ${project.id} of 12</span>` +
        `<span class="wb-badge">Level: ${esc(project.level)}</span>` +
        skillsHtml +
      `</div>` +
      `<h2>Project ${project.id}: ${esc(project.title)}</h2>` +
      `<p>Har project ko chhote steps mein todkar banao: pehle HTML skeleton, phir JS logic, phir UI polish aur edge-case testing. Assignments tab mein apna solution / GitHub repo submit karo!</p>` +
    `</div>` +
    `<div class="wb-card">` +
      `<h3>Step-by-Step Build Guide</h3>` +
      `<ol>${stepsHtml}</ol>` +
    `</div>` +
    `<div class="wb-card">` +
      `<h3>Starter Code</h3>` +
      `<pre><code>${esc(project.starterCode)}</code></pre>` +
    `</div>` +
  `</div>`;
}

function buildC1GroupHtml(title, badgeText, categories, questions) {
  const catSet = Array.from(new Set(questions.map(q => q.category)));
  const groupedSections = catSet
    .map(cat => {
      const list = questions.filter(q => q.category === cat);
      const cards = list
        .map(
          q =>
            `<div class="wb-qa">` +
              `<div class="wb-qa-q">${esc(q.id)}. ${esc(q.question)}</div>` +
              `<details><summary>Show Answer</summary><p>${esc(q.answer)}</p></details>` +
            `</div>`
        )
        .join('');
      return `<div class="wb-task-grid"><h3>${esc(cat)} (${list.length} Questions)</h3>${cards}</div>`;
    })
    .join('');

  return `<div class="wb-lesson">` +
    `<div class="wb-hero">` +
      `<div class="wb-badges">` +
        `<span class="wb-badge">Part C1 • Interview Theory</span>` +
        `<span class="wb-badge wb-badge-ok">${esc(badgeText)}</span>` +
        categories.map(c => `<span class="wb-badge">${esc(c)}</span>`).join('') +
      `</div>` +
      `<h2>${esc(title)}</h2>` +
      `<p>Workbook Rule: Roz 15–20 questions active-recall se bolkar try karo, phir Show Answer par click karke compare karo.</p>` +
    `</div>` +
    groupedSections +
  `</div>`;
}

function buildC2CodingHtml(title, startNum, endNum) {
  const subset = c2Coding.filter(q => q.num >= startNum && q.num <= endNum);
  const cards = subset
    .map(q => {
      const formatted = prettyJS(q.solution);
      const isFormattedCode = formatted !== q.solution || /^[a-zA-Z_$]/.test(q.solution) && !/buckets;|binary tree|Stack ya|Lengths ka/.test(q.solution);
      const solBlock = isFormattedCode && formatted.length > 0 && !/Array of buckets|Array-based complete|Stack ya counter|Lengths ka difference/.test(formatted)
        ? `<pre><code>${esc(formatted)}</code></pre>`
        : `<p>${esc(q.solution)}</p>`;
      return `<div class="wb-qa">` +
        `<div class="wb-qa-q">${esc(q.id)}. ${esc(q.prompt)}</div>` +
        `<details><summary>Show Verified JS Solution</summary>${solBlock}</details>` +
      `</div>`;
    })
    .join('');

  return `<div class="wb-lesson">` +
    `<div class="wb-hero">` +
      `<div class="wb-badges">` +
        `<span class="wb-badge">Part C2 • Coding Problems</span>` +
        `<span class="wb-badge wb-badge-ok">Q${startNum}–Q${endNum} (${subset.length} Problems)</span>` +
      `</div>` +
      `<h2>${esc(title)}</h2>` +
      `<p>Solutions JavaScript (Node.js 22 verified) mein hain. Kuch helpers (jaise <code>gcd</code>, <code>freq</code>, <code>T</code>) pehle ke snippets se reuse hote hain. Pehle khud code likhne ki koshish karo!</p>` +
    `</div>` +
    `<div class="wb-task-grid">${cards}</div>` +
  `</div>`;
}

function buildC3OutputHtml() {
  const cards = c3Output
    .map(q => {
      const formatted = prettyJS(q.code.replace(/\s+/g, ' ').trim()) || q.code;
      return `<div class="wb-qa">` +
        `<div class="wb-qa-q">${esc(q.id)}. ${esc(q.prompt)}</div>` +
        `<pre><code>${esc(formatted)}</code></pre>` +
        `<details><summary>Check Verified Output &amp; Explanation</summary>` +
          `<p><strong>Answer:</strong> <code>${esc(q.answer)}</code></p>` +
          (q.explanation ? `<p><strong>Reason:</strong> ${esc(q.explanation)}</p>` : '') +
        `</details>` +
      `</div>`;
    })
    .join('');

  return `<div class="wb-lesson">` +
    `<div class="wb-hero">` +
      `<div class="wb-badges">` +
        `<span class="wb-badge">Part C3 • Output Prediction</span>` +
        `<span class="wb-badge wb-badge-warn">52 Tricky Snippets (Q542–Q593)</span>` +
        `<span class="wb-badge wb-badge-ok">Node.js 22 Verified</span>` +
      `</div>` +
      `<h2>C3. Output Prediction Labs (Q542–Q593)</h2>` +
      `<p>Har snippet ka output pehle dry-run karke socho (coercion, hoisting, event loop, <code>this</code>, prototypes), phir Answer expand karo.</p>` +
    `</div>` +
    `<div class="wb-task-grid">${cards}</div>` +
  `</div>`;
}

function buildAppendixHtml() {
  const resHtml = meta.freeResources
    .map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noreferrer"><strong>${esc(r.name)}</strong></a> — ${esc(r.desc)}</li>`)
    .join('');
  const checkHtml = meta.checklist.map(c => `<li>☐ ${esc(c)}</li>`).join('');
  const keyRows = mcqsPartD
    .map(
      m =>
        `<tr><td><strong>${m.num}</strong></td><td><code>${m.correct_option}</code></td><td>${esc(m.category)}</td><td>${esc(m.explanation || '-')}</td></tr>`
    )
    .join('');

  return `<div class="wb-lesson">` +
    `<div class="wb-hero">` +
      `<div class="wb-badges">` +
        `<span class="wb-badge wb-badge-ok">150 MCQs Reference Key</span>` +
        `<span class="wb-badge">Free Resources</span>` +
        `<span class="wb-badge wb-badge-warn">Interview Checklist</span>` +
      `</div>` +
      `<h2>Appendix: Free Resources, Interview Checklist &amp; MCQ Answer Key</h2>` +
      `<p>Self-test complete karne ke liye course page par <strong>Course MCQs (150)</strong> tab attempt karo! Niche complete reference key aur interview-readiness checklist di gayi hai.</p>` +
    `</div>` +
    `<div class="wb-card">` +
      `<h3>Interview Se Pehle 7-Point Checklist</h3>` +
      `<ul>${checkHtml}</ul>` +
    `</div>` +
    `<div class="wb-card">` +
      `<h3>Recommended Free Resources</h3>` +
      `<ul>${resHtml}</ul>` +
    `</div>` +
    `<div class="wb-card">` +
      `<h3>Part D: Complete MCQ Answer Key &amp; Workbook Explanations (1–150)</h3>` +
      `<details><summary>Open Complete 150-MCQ Answer Key Table</summary>` +
        `<div class="wb-table-wrap"><table><thead><tr><th>#</th><th>Ans</th><th>Section</th><th>Workbook Explanation</th></tr></thead><tbody>${keyRows}</tbody></table></div>` +
      `</details>` +
    `</div>` +
  `</div>`;
}

// Assemble full 12-week ordered curriculum (39 Lessons + 17 Assignments)
const curriculum = [
  // WEEK 1 (Topics 1-3 + Orientation + Project 1)
  { week: 1, title: '0. Course Overview & Plan', xp: 25, notes: buildOrientationHtml() },
  { week: 1, title: '1. Setup, Console aur Variables', xp: 40, notes: buildTopicHtml(topicsPartA[0]) },
  { week: 1, title: '2. Data Types aur Coercion', xp: 40, notes: buildTopicHtml(topicsPartA[1]) },
  {
    week: 1,
    title: '3. Control Flow aur Loops',
    xp: 40,
    notes: buildTopicHtml(topicsPartA[2]),
    assignment: {
      title: 'Week 1 Coding Lab: FizzBuzz, Pyramid & Digit Reversal',
      type: 'code',
      xp_reward: 35,
      requires_github: false,
      requires_deploy: false,
      description: 'Tasks 3.1, 3.4 aur 3.6 solve karke apna Node.js solution code submit karo: (1) 1..100 FizzBuzz, (2) n-row Star Pyramid using .repeat(), (3) while-loop digit sum + reversed integer.'
    }
  },
  {
    week: 1,
    title: 'P1: Tip & Bill Splitter',
    xp: 35,
    notes: buildProjectHtml(projectsPartB[0]),
    assignment: {
      title: 'Project 1 Submission: Tip & Bill Splitter',
      type: 'any',
      xp_reward: 60,
      requires_github: true,
      requires_deploy: false,
      description: 'Guided Project 1 build karo (HTML inputs, calc() validation, Intl.NumberFormat INR formatting, Enter key trigger). Code paste karo ya GitHub repo link submit karo!'
    }
  },

  // WEEK 2 (Topics 4-5)
  { week: 2, title: '4. Functions & Higher-Order', xp: 45, notes: buildTopicHtml(topicsPartA[3]) },
  {
    week: 2,
    title: '5. Scope, Hoisting & Closures',
    xp: 45,
    notes: buildTopicHtml(topicsPartA[4]),
    assignment: {
      title: 'Week 2 Coding Lab: once(), memoize() & debounce()',
      type: 'code',
      xp_reward: 45,
      requires_github: false,
      requires_deploy: false,
      description: 'Tasks 5.2, 5.3, 5.4, 5.5 ke liye closure-based BankAccount (private balance), once(fn), memoize(fn), aur debounce(fn, ms) implement karke submit karo.'
    }
  },

  // WEEK 3 (Topics 6-7)
  { week: 3, title: '6. Arrays aur Array Methods', xp: 45, notes: buildTopicHtml(topicsPartA[5]) },
  {
    week: 3,
    title: '7. Strings & Regular Expressions',
    xp: 45,
    notes: buildTopicHtml(topicsPartA[6]),
    assignment: {
      title: 'Week 3 Coding Lab: Two Sum, Anagrams & Word Frequency',
      type: 'code',
      xp_reward: 45,
      requires_github: false,
      requires_deploy: false,
      description: 'Week 3 target (20 coding problems): Array Two Sum (O(n) Map), Rotate Right by k, Word Frequency Counter, aur Group Anagrams implement karke submit karo.'
    }
  },

  // WEEK 4 (Topics 8-9 + Project 2)
  { week: 4, title: '8. Objects, JSON aur this', xp: 45, notes: buildTopicHtml(topicsPartA[7]) },
  { week: 4, title: '9. ES6+ Features aur Modules', xp: 45, notes: buildTopicHtml(topicsPartA[8]) },
  {
    week: 4,
    title: 'P2: Todo App + localStorage',
    xp: 40,
    notes: buildProjectHtml(projectsPartB[1]),
    assignment: {
      title: 'Project 2 Submission: Todo App with localStorage',
      type: 'any',
      xp_reward: 75,
      requires_github: true,
      requires_deploy: true,
      description: 'Todo App with localStorage persistence, All/Active/Done filters, edit double-click aur event delegation build karke GitHub/Live URL ya code submit karo.'
    }
  },

  // WEEK 5 (Topic 10)
  {
    week: 5,
    title: '10. Prototypes, Classes & OOP',
    xp: 50,
    notes: buildTopicHtml(topicsPartA[9]),
    assignment: {
      title: 'Week 5 Coding Lab: BankAccount (#balance) & EventEmitter',
      type: 'code',
      xp_reward: 50,
      requires_github: false,
      requires_deploy: false,
      description: 'Tasks 10.2 & 10.5 complete karo: private #balance ke saath BankAccount class (validation errors + getter) aur on/off/emit EventEmitter class.'
    }
  },

  // WEEK 6 (Topics 11-12 + Projects 3, 4, 5)
  { week: 6, title: '11. DOM Manipulation & UI', xp: 45, notes: buildTopicHtml(topicsPartA[10]) },
  { week: 6, title: '12. Events & Event Delegation', xp: 45, notes: buildTopicHtml(topicsPartA[11]) },
  {
    week: 6,
    title: 'P3: Clock, Stopwatch & Timer',
    xp: 35,
    notes: buildProjectHtml(projectsPartB[2]),
    assignment: {
      title: 'Project 3 Submission: Digital Clock, Stopwatch & Countdown',
      type: 'any',
      xp_reward: 65,
      requires_github: true,
      requires_deploy: false,
      description: 'Digital Clock (12h/24h toggle), Stopwatch (Start/Pause/Reset/Lap) aur Countdown Timer build karke submit karo.'
    }
  },
  {
    week: 6,
    title: 'P4: Interactive Quiz App',
    xp: 35,
    notes: buildProjectHtml(projectsPartB[3]),
    assignment: {
      title: 'Project 4 Submission: Quiz App with Scoring & Progress',
      type: 'any',
      xp_reward: 70,
      requires_github: true,
      requires_deploy: true,
      description: 'Dynamic MCQ Quiz App (score tracking, per-question timer, highScore in localStorage, Restart flow) build karke submit karo.'
    }
  },
  {
    week: 6,
    title: 'P5: State-Machine Calculator',
    xp: 35,
    notes: buildProjectHtml(projectsPartB[4]),
    assignment: {
      title: 'Project 5 Submission: Event-Delegated Calculator (No eval)',
      type: 'any',
      xp_reward: 75,
      requires_github: true,
      requires_deploy: true,
      description: 'Calculator without eval() using cur/prev/op state machine, keyboard support, Clear/Backspace aur divide-by-zero handling.'
    }
  },

  // WEEK 7 (Topic 13 + Project 6)
  { week: 7, title: '13. Async JS, Promises & Fetch', xp: 55, notes: buildTopicHtml(topicsPartA[12]) },
  {
    week: 7,
    title: 'P6: Weather & User Fetch App',
    xp: 40,
    notes: buildProjectHtml(projectsPartB[5]),
    assignment: {
      title: 'Project 6 Submission: Live API Fetch App with Cache & States',
      type: 'any',
      xp_reward: 80,
      requires_github: true,
      requires_deploy: true,
      description: 'Open-Meteo Weather / Random User Explorer using async/await, response.ok checks, Loading/Error UI states aur retry button.'
    }
  },

  // WEEK 8 (Topic 14 + Projects 7, 8)
  { week: 8, title: '14. Error Handling & Debugging', xp: 50, notes: buildTopicHtml(topicsPartA[13]) },
  {
    week: 8,
    title: 'P7: Personal Expense Tracker',
    xp: 40,
    notes: buildProjectHtml(projectsPartB[6]),
    assignment: {
      title: 'Project 7 Submission: Expense Tracker (Income/Expense + CSV)',
      type: 'any',
      xp_reward: 80,
      requires_github: true,
      requires_deploy: true,
      description: 'Expense Tracker with reduce()-driven totals, category/month filters, localStorage persistence aur CSV export.'
    }
  },
  {
    week: 8,
    title: 'P8: Tic-Tac-Toe Win Game',
    xp: 40,
    notes: buildProjectHtml(projectsPartB[7]),
    assignment: {
      title: 'Project 8 Submission: Tic-Tac-Toe with Win Highlight',
      type: 'any',
      xp_reward: 80,
      requires_github: true,
      requires_deploy: true,
      description: 'Tic-Tac-Toe board with 8 win combinations, draw detection, winning line highlight, scoreboard aur Restart button.'
    }
  },

  // WEEK 9 (Topic 15 + Project 12 REST API)
  { week: 9, title: '15. Node.js, npm & Tooling', xp: 50, notes: buildTopicHtml(topicsPartA[14]) },
  {
    week: 9,
    title: 'P12: REST API (Node+Express)',
    xp: 45,
    notes: buildProjectHtml(projectsPartB[11]),
    assignment: {
      title: 'Project 12 Submission: Express CRUD REST API + Validation',
      type: 'github',
      xp_reward: 100,
      requires_github: true,
      requires_deploy: false,
      description: 'Node + Express REST API build karo: GET/POST/PUT/DELETE routes, logging/error middleware, request validation, HTTP status codes (201/400/404) & JSON file persistence.'
    }
  },

  // WEEK 10 (Topic 16 DSA)
  {
    week: 10,
    title: '16. DSA Patterns in JavaScript',
    xp: 60,
    notes: buildTopicHtml(topicsPartA[15]),
    assignment: {
      title: 'Week 10 DSA Coding Lab: Stack, Kadane, Sliding Window & BFS',
      type: 'code',
      xp_reward: 65,
      requires_github: false,
      requires_deploy: false,
      description: 'Topic 16 tasks implement aur submit karo: Valid Parentheses, Kadane Max Subarray Sum, Longest Substring Without Repeating Characters, aur Unweighted Graph BFS Shortest Path.'
    }
  },

  // WEEK 11 (Complete Part C: 593 Interview Q&As across C1.1-C1.6, C2.1-C2.2, C3)
  {
    week: 11,
    title: 'C1.1 Variables & Loops (Q1-61)',
    xp: 35,
    notes: buildC1GroupHtml(
      'C1.1 Variables, Data Types & Control Flow (Q1–Q61)',
      '61 Theory Q&As',
      ['Variables, Data Types & Operators', 'Control Flow & Loops'],
      c1Theory.filter(q => q.num >= 1 && q.num <= 61)
    )
  },
  {
    week: 11,
    title: 'C1.2 Functions & Closures (Q62-133)',
    xp: 40,
    notes: buildC1GroupHtml(
      'C1.2 Functions, Scope, Hoisting, Closures & this (Q62–Q133)',
      '72 Theory Q&As',
      ['Functions', 'Scope, Hoisting, Closures & this'],
      c1Theory.filter(q => q.num >= 62 && q.num <= 133)
    )
  },
  {
    week: 11,
    title: 'C1.3 Arrays & Strings (Q134-217)',
    xp: 40,
    notes: buildC1GroupHtml(
      'C1.3 Arrays & Strings Interview Theory (Q134–Q217)',
      '84 Theory Q&As',
      ['Arrays', 'Strings'],
      c1Theory.filter(q => q.num >= 134 && q.num <= 217)
    )
  },
  {
    week: 11,
    title: 'C1.4 Objects & ES6+ (Q218-291)',
    xp: 40,
    notes: buildC1GroupHtml(
      'C1.4 Objects, Prototypes & ES6+ Features (Q218–Q291)',
      '74 Theory Q&As',
      ['Objects & Prototypes', 'ES6+ Modern Features'],
      c1Theory.filter(q => q.num >= 218 && q.num <= 291)
    )
  },
  {
    week: 11,
    title: 'C1.5 Async & Event Loop (Q292-336)',
    xp: 40,
    notes: buildC1GroupHtml(
      'C1.5 Async JS, Promises & Event Loop (Q292–Q336)',
      '45 Theory Q&As',
      ['Async JS, Promises & Event Loop'],
      c1Theory.filter(q => q.num >= 292 && q.num <= 336)
    )
  },
  {
    week: 11,
    title: 'C1.6 DOM, Browser & Node (Q337-418)',
    xp: 40,
    notes: buildC1GroupHtml(
      'C1.6 DOM, Events, Browser APIs, Testing & Node (Q337–Q418)',
      '82 Theory Q&As',
      ['DOM, Events & Browser APIs', 'Errors, Debugging, Testing & Node'],
      c1Theory.filter(q => q.num >= 337 && q.num <= 418)
    )
  },
  {
    week: 11,
    title: 'C2.1 Coding: Math & Arrays (Q419-475)',
    xp: 50,
    notes: buildC2CodingHtml('C2.1 Coding Problems: Math, Strings & Arrays (Q419–Q475)', 419, 475)
  },
  {
    week: 11,
    title: 'C2.2 Coding: Objects & DSA (Q476-541)',
    xp: 50,
    notes: buildC2CodingHtml('C2.2 Coding Problems: Objects, Async, Patterns & DSA (Q476–Q541)', 476, 541)
  },
  {
    week: 11,
    title: 'C3. Output Prediction (Q542-593)',
    xp: 50,
    notes: buildC3OutputHtml()
  },

  // WEEK 12 (Projects 9-11 Portfolio Polish + Appendix & 150 MCQ Key)
  {
    week: 12,
    title: 'P9: Image Slider Carousel',
    xp: 35,
    notes: buildProjectHtml(projectsPartB[8]),
    assignment: {
      title: 'Project 9 Submission: Accessible Auto-Play Image Carousel',
      type: 'any',
      xp_reward: 75,
      requires_github: true,
      requires_deploy: false,
      description: 'Next/Prev buttons, indicator dots, hover pause, keyboard arrow keys & swipe-ready Carousel build karo.'
    }
  },
  {
    week: 12,
    title: 'P10: Password Strength Generator',
    xp: 35,
    notes: buildProjectHtml(projectsPartB[9]),
    assignment: {
      title: 'Project 10 Submission: Password Generator & Strength Meter',
      type: 'any',
      xp_reward: 75,
      requires_github: true,
      requires_deploy: true,
      description: 'Crypto-random password generator with length slider, character toggles, live strength bar & Clipboard copy feedback.'
    }
  },
  {
    week: 12,
    title: 'P11: Debounced Movie Search',
    xp: 45,
    notes: buildProjectHtml(projectsPartB[10]),
    assignment: {
      title: 'Project 11 Submission: Debounced Search with AbortController',
      type: 'any',
      xp_reward: 90,
      requires_github: true,
      requires_deploy: true,
      description: 'Movie/Book search with 400ms debounce, AbortController stale-request cancel, Pagination + Favorites saved in localStorage.'
    }
  },
  {
    week: 12,
    title: 'Appendix: MCQ Key & Checklist',
    xp: 40,
    notes: buildAppendixHtml()
  }
];

(async () => {
  try {
    // 1. Verify creator exists
    const creatorRows = await sql`SELECT id, name FROM public.profiles WHERE id = ${CREATOR_ID}`;
    assert(creatorRows.length === 1, `Creator profile ${CREATOR_ID} not found`);

    // 2. Upsert course cleanly inside transaction
    const courseResult = await sql.begin(async tx => {
      const existing = await tx`
        SELECT id FROM public.courses WHERE title = ${COURSE_TITLE} AND is_deleted = false LIMIT 1
      `;

      const courseDescription =
        'Complete 12-Week JavaScript Mastery LMS Course built 100% from the 70-Page JavaScript Mastery Workbook: ' +
        '16 Roadmap Topics, 96 Step-by-Step Practice Tasks (with verified JS solutions), 12 Guided Projects with GitHub/Live submissions, ' +
        '593 Interview Q&As (418 Theory + 123 Coding + 52 Node.js 22 Output Prediction), and 150 Interactive Course MCQs with Explanations.';
      const tags = ['JavaScript', 'ES6+', 'DOM', 'Async JS', 'Node.js', 'DSA', 'Interview Prep', '12-Week Roadmap'];

      let courseId;
      if (existing.length > 0) {
        courseId = existing[0].id;
        await tx`
          UPDATE public.courses
          SET description = ${courseDescription},
              difficulty = 'skill',
              tags = ${tags},
              is_published = true,
              enrollment_restriction = 'any'
          WHERE id = ${courseId}
        `;
        // Clean existing course content before re-seeding idempotently
        await tx`DELETE FROM public.course_mcqs WHERE course_id = ${courseId}`;
        await tx`DELETE FROM public.lessons WHERE course_id = ${courseId}`;
        await tx`DELETE FROM public.course_notices WHERE course_id = ${courseId}`;
        await tx`DELETE FROM public.course_polls WHERE course_id = ${courseId}`;
      } else {
        const inserted = await tx`
          INSERT INTO public.courses (title, description, difficulty, tags, is_published, enrollment_restriction, created_by)
          VALUES (${COURSE_TITLE}, ${courseDescription}, 'skill', ${tags}, true, 'any', ${CREATOR_ID})
          RETURNING id
        `;
        courseId = inserted[0].id;
      }

      // Ensure creator is linked as course instructor (avoiding duplicates)
      const instExists = await tx`
        SELECT 1 FROM public.course_instructors WHERE course_id = ${courseId} AND instructor_id = ${CREATOR_ID}
      `;
      if (instExists.length === 0) {
        await tx`
          INSERT INTO public.course_instructors (course_id, instructor_id) VALUES (${courseId}, ${CREATOR_ID})
        `;
      }

      // 3. Insert all 39 lessons (with deeply split interactive_steps) & 17 assignments
      let sortOrder = 1;
      let assignmentCount = 0;
      let totalInteractiveSteps = 0;
      for (const item of curriculum) {
        const createdAt = weekTimestamp(item.week);
        const interactiveSteps = createInteractiveStepsForLesson(item, {
          meta,
          topicsPartA,
          taskSolutions,
          projectsPartB,
          c1Theory,
          c2Coding,
          c3Output,
          mcqsPartD,
          prettyJS,
        });
        totalInteractiveSteps += interactiveSteps.length;

        const lessonRows = await tx`
          INSERT INTO public.lessons (course_id, title, youtube_url, notes, pdf_url, xp_reward, sort_order, week_number, interactive_steps, created_at)
          VALUES (${courseId}, ${item.title}, NULL, ${item.notes}, NULL, ${item.xp}, ${sortOrder}, ${item.week}, ${tx.json(interactiveSteps)}, ${createdAt})
          RETURNING id
        `;
        const lessonId = lessonRows[0].id;
        sortOrder++;

        if (item.assignment) {
          const a = item.assignment;
          await tx`
            INSERT INTO public.assignments (lesson_id, title, type, description, xp_reward, requires_github, requires_deploy)
            VALUES (${lessonId}, ${a.title}, ${a.type}, ${a.description}, ${a.xp_reward}, ${a.requires_github}, ${a.requires_deploy})
          `;
          assignmentCount++;
        }
      }

      // 4. Insert all 150 Course MCQs (Part D)
      for (const m of mcqsPartD) {
        const difficulty = m.num <= 60 ? 'easy' : m.num <= 120 ? 'medium' : 'hard';
        await tx`
          INSERT INTO public.course_mcqs (
            course_id, question_text, option_a, option_b, option_c, option_d,
            correct_option, source_type, display_order, is_active, difficulty, marks, category, explanation, created_by
          )
          VALUES (
            ${courseId}, ${m.question}, ${m.option_a}, ${m.option_b}, ${m.option_c}, ${m.option_d},
            ${m.correct_option}, 'scratch', ${m.num}, true, ${difficulty}, 1, ${m.category}, ${m.explanation}, ${CREATOR_ID}
          )
        `;
      }

      // 5. Insert Welcome Notice & Pre-Interview Strategy Notice
      await tx`
        INSERT INTO public.course_notices (course_id, created_by, title, content)
        VALUES
          (
            ${courseId},
            ${CREATOR_ID},
            'Welcome to JavaScript Mastery Workbook (12-Week LMS Plan)',
            'Workbook workflow follow karo: Week 1 se Week 12 tak har topic mein pehle Example Code + Step 1-3 khud code karke try karo (copy-paste mat karo), phir Week 11 ke 593 Interview Questions aur Course MCQs tab mein 150 Node.js 22 verified MCQs attempt karo.'
          ),
          (
            ${courseId},
            ${CREATOR_ID},
            'GitHub Portfolio Rule (Projects 1 to 12)',
            'Kam se kam 3 polished projects (jaise Expense Tracker, Debounced Movie Search, aur Node+Express REST API) GitHub README + screenshot ke saath live deploy karke Assignments tab mein submit karo!'
          )
      `;

      // 6. Insert Interactive Course Orientation Poll
      const pollRows = await tx`
        INSERT INTO public.course_polls (course_id, created_by, question, is_multiple_choice)
        VALUES (
          ${courseId},
          ${CREATOR_ID},
          'Which JavaScript Mastery track are you focusing on this week?',
          false
        )
        RETURNING id
      `;
      const pollId = pollRows[0].id;
      for (const opt of [
        'Phase 1–2: Foundations, Closures & Arrays (Weeks 1–3)',
        'Phase 3–4: ES6+, DOM & Async Projects (Weeks 4–8)',
        'Phase 5: Node REST API & JS DSA Patterns (Weeks 9–10)',
        'Part C & D: 593 Interview Q&As + 150 MCQs (Weeks 11–12)'
      ]) {
        await tx`
          INSERT INTO public.course_poll_options (poll_id, option_text) VALUES (${pollId}, ${opt})
        `;
      }

      // 7. Recompute & verify courses.lesson_count & courses.total_xp explicitly just in case
      const statsRows = await tx`
        SELECT
          (SELECT count(*)::int FROM public.lessons WHERE course_id = ${courseId}) as lc,
          (
            COALESCE((SELECT sum(xp_reward)::int FROM public.lessons WHERE course_id = ${courseId}), 0) +
            COALESCE((SELECT sum(a.xp_reward)::int FROM public.assignments a JOIN public.lessons l ON l.id = a.lesson_id WHERE l.course_id = ${courseId}), 0)
          ) as txp
      `;

      const courseFinal = await tx`
        SELECT id, title, difficulty, lesson_count, total_xp, is_published
        FROM public.courses WHERE id = ${courseId}
      `;

      return {
        course: courseFinal[0],
        computedStats: statsRows[0],
        lessonCount: curriculum.length,
        totalInteractiveSteps,
        assignmentCount,
        mcqCount: mcqsPartD.length
      };
    });

    console.log('SEED SUCCESS:', JSON.stringify(courseResult, null, 2));
  } catch (err) {
    console.error('SEED ERROR:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
})();

