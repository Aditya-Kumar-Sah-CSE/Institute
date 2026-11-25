const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join('d:', 'smart learn', 'BCE', 'src', 'features', 'courses', 'data', 'js-mastery-workbook');

// Bespoke interactive starter demos for every Topic 1-16 concept bullet (so students can test EVERY individual concept!)
function buildConceptStarter(topicId, bulletIdx, bulletText, fallbackCode) {
  const map = {
    1: [
      `// DevTools & Node Console Demo\nconsole.log('Node/Browser active!');\nconsole.table([{ env: 'Node/Browser', status: 'Ready' }]);`,
      `// Browser <script> vs Node CLI output check\nconst runtime = typeof window === 'undefined' ? 'Node.js Runtime' : 'Browser DOM';\nconsole.log('Running inside:', runtime);`,
      `// var vs let vs const\nconst appName = 'SmartLearn JS';\nlet progress = 10;\nprogress += 15;\nconsole.log({ appName, progress });\n// appName = 'Other'; // Uncomment to test TypeError`,
      `// camelCase naming & valid identifiers\nconst studentFirstName = 'Asha';\nconst maxRetryCount = 3;\nconsole.log(studentFirstName, maxRetryCount);`,
      `// Single-line & Multi-line comments\n/* Calculate square cleanly */\nconst square = n => n * n;\nconsole.log('square(6) =', square(6));`
    ],
    2: [
      `// 7 Primitive Data Types in JS\nconst vals = [42, 'JS', true, null, undefined, 9007199254740993n, Symbol('id')];\nvals.forEach(v => console.log(String(v), '=> typeof:', typeof v));`,
      `// Operators: Arithmetic, ??, and ?.\nconst user = { profile: { score: 0 } };\nconsole.log('score with ??:', user?.profile?.score ?? 100);\nconsole.log('score with ||:', user?.profile?.score || 100);\nconsole.log('2 ** 5 =', 2 ** 5);`,
      `// == vs === comparison\nconsole.log("'5' == 5:", '5' == 5);\nconsole.log("'5' === 5:", '5' === 5);\nconsole.log("null == undefined:", null == undefined);\nconsole.log("null === undefined:", null === undefined);`,
      `// Falsy values check: false, 0, -0, 0n, '', null, undefined, NaN\nconst items = [0, '', null, undefined, NaN, false, '0', [], {}];\nconsole.log(items.map(x => ({ val: String(x), truthy: Boolean(x) })));`,
      `// Explicit Conversion: Number(), String(), Boolean()\nconsole.log(Number('42'), Number('42px'), parseInt('42px', 10));\nconsole.log(String(123), Boolean(''), Boolean('false'));`
    ],
    3: [
      `// Conditional branching: if / else / ternary\nconst marks = 84;\nconst grade = marks >= 90 ? 'A+' : marks >= 75 ? 'A' : 'B';\nconsole.log('Grade:', grade);`,
      `// Switch statement with break\nconst day = 'Mon';\nswitch (day) {\n  case 'Mon': console.log('Start of week'); break;\n  case 'Fri': console.log('Weekend soon'); break;\n  default: console.log('Regular day');\n}`,
      `// Loops: for vs while vs for...of\nfor (let i = 1; i <= 3; i++) console.log('for:', i);\nfor (const ch of 'JS') console.log('for...of:', ch);`,
      `// break & continue inside loops\nfor (let i = 1; i <= 7; i++) {\n  if (i === 3) continue;\n  if (i === 6) break;\n  console.log('i =', i);\n}`
    ],
    4: [
      `// Declaration vs Expression vs Arrow\nconsole.log(addDecl(2, 3)); // Hoisted!\nfunction addDecl(a, b) { return a + b; }\nconst addArrow = (a, b) => a + b;\nconsole.log(addArrow(4, 5));`,
      `// Default params & Rest operator (...args)\nfunction sumAll(multiplier = 1, ...nums) {\n  return nums.reduce((acc, n) => acc + n, 0) * multiplier;\n}\nconsole.log(sumAll(2, 10, 20, 30));`,
      `// Higher-order function & Callback\nfunction applyTwice(x, fn) { return fn(fn(x)); }\nconsole.log(applyTwice(3, n => n * 2));`,
      `// Pure vs Impure function demo\nconst pureAdd = (arr, x) => [...arr, x];\nconst base = [1, 2];\nconsole.log('new:', pureAdd(base, 3), 'original:', base);`
    ],
    5: [
      `// Block vs Function scope\n{\n  let blockVar = 'only inside block';\n  var fnScoped = 'leaks outside block';\n  console.log(blockVar);\n}\nconsole.log(fnScoped);`,
      `// Hoisting & TDZ\nconsole.log('var x:', x);\nvar x = 99;\n// console.log(y); // Uncomment to trigger TDZ ReferenceError\nlet y = 10;`,
      `// Closures: inner function remembers outer lexical scope\nfunction makeMultiplier(factor) {\n  return n => n * factor;\n}\nconst triple = makeMultiplier(3);\nconsole.log(triple(7), triple(12));`
    ],
    6: [
      `// Stack/Queue array mutations: push, pop, shift, unshift\nconst q = ['a', 'b'];\nq.push('c');\nconsole.log('pop:', q.pop(), 'shift:', q.shift(), 'remaining:', q);`,
      `// slice (non-mutating) vs splice (mutating)\nconst nums = [10, 20, 30, 40, 50];\nconsole.log('slice(1,3):', nums.slice(1, 3), 'nums untouched:', nums);\nnums.splice(1, 2, 99);\nconsole.log('after splice:', nums);`,
      `// map, filter, reduce pipeline\nconst orders = [120, 450, 80, 600];\nconst bigTotal = orders.filter(x => x > 100).map(x => x * 1.1).reduce((s, x) => s + x, 0);\nconsole.log('Total:', bigTotal.toFixed(2));`,
      `// Numeric sort comparator vs string sort trap\nconst a = [100, 20, 3];\nconsole.log('wrong default sort:', [...a].sort());\nconsole.log('numeric sort:', [...a].sort((x, y) => x - y));`
    ],
    7: [
      `// String immutability & slicing\nconst s = '  JavaScript Mastery  ';\nconsole.log(s.trim().slice(0, 10).toUpperCase());`,
      `// split, join, replaceAll, template literals\nconst title = 'hello world js';\nconsole.log(title.split(' ').join('-'));`,
      `// RegExp flags g, i & test/match\nconst txt = 'Orders: #101, #204, #999';\nconsole.log('matches:', txt.match(/#\\d+/g));\nconsole.log('has JS?', /javascript/i.test('Learn JavaScript'));`
    ],
    8: [
      `// Object CRUD, Computed Keys & Shorthand\nconst key = 'role';\nconst dev = { name: 'Riya', [key]: 'Engineer' };\nconsole.log(Object.entries(dev));`,
      `// JSON.stringify / JSON.parse & structuredClone\nconst obj = { a: 1, nested: { b: 2 } };\nconst clone = structuredClone(obj);\nclone.nested.b = 999;\nconsole.log({ orig: obj.nested.b, clone: clone.nested.b });`,
      `// this keyword & call/apply/bind\nconst user = { name: 'Kabir', say(city) { return \`\${this.name} in \${city}\`; } };\nconst unbound = user.say;\nconsole.log('bound:', unbound.bind(user)('Delhi'));`
    ],
    9: [
      `// Destructuring, Spread & Rest\nconst cfg = { host: 'localhost', port: 3000, tls: false };\nconst { host, ...rest } = cfg;\nconsole.log(host, rest);`,
      `// Set & Map modern collections\nconst tags = new Set(['js', 'node', 'js']);\nconst map = new Map([['js', 10]]);\nconsole.log('unique size:', tags.size, 'map:', map.get('js'));`,
      `// Iterators & Generators (function*)\nfunction* countUp(limit) { for (let i = 1; i <= limit; i++) yield i; }\nconsole.log([...countUp(4)]);`
    ],
    10: [
      `// Prototype chain check\nconst arr = [1, 2];\nconsole.log('Array proto?', Object.getPrototypeOf(arr) === Array.prototype);\nconsole.log('has toString via Object.prototype?', 'toString' in arr);`,
      `// Class inheritance, super, getter & private #field\nclass Account {\n  #bal = 0;\n  constructor(b) { this.#bal = b; }\n  get balance() { return this.#bal; }\n  deposit(x) { this.#bal += x; }\n}\nconst a = new Account(100); a.deposit(50); console.log(a.balance);`
    ],
    11: [
      `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <h2 id="heading">Hello DOM!</h2>\n  <button id="btn" style="padding:8px 14px;background:#06b6d4;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:bold">Change Text &amp; Color</button>\n  <script>\n    document.querySelector('#btn').addEventListener('click', () => {\n      const h = document.querySelector('#heading');\n      h.textContent = 'DOM Updated Dynamically!';\n      h.style.color = '#34d399';\n      console.log('Heading updated!');\n    });\n  </script>\n</body></html>`
    ],
    12: [
      `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <h3>Event Delegation Demo</h3>\n  <ul id="list" style="list-style:none;padding:0;display:flex;gap:8px">\n    <li><button data-item="Alpha" style="padding:8px 12px;border-radius:6px;cursor:pointer">Alpha</button></li>\n    <li><button data-item="Beta" style="padding:8px 12px;border-radius:6px;cursor:pointer">Beta</button></li>\n    <li><button data-item="Gamma" style="padding:8px 12px;border-radius:6px;cursor:pointer">Gamma</button></li>\n  </ul>\n  <p id="out">Click any button (1 listener handles all!)</p>\n  <script>\n    document.querySelector('#list').addEventListener('click', e => {\n      const btn = e.target.closest('button');\n      if (!btn) return;\n      document.querySelector('#out').textContent = 'Delegated Click: ' + btn.dataset.item;\n      console.log('Clicked:', btn.dataset.item);\n    });\n  </script>\n</body></html>`
    ],
    13: [
      `// Event Loop Order: Sync -> Microtask -> Macrotask\nconsole.log('1: Sync start');\nsetTimeout(() => console.log('4: Macrotask setTimeout'), 0);\nPromise.resolve().then(() => console.log('3: Microtask Promise'));\nconsole.log('2: Sync end');`,
      `// async/await & Promise.all\nconst wait = (ms, val) => new Promise(r => setTimeout(() => r(val), ms));\n(async () => {\n  const results = await Promise.all([wait(50, 'User'), wait(50, 'Orders')]);\n  console.log('Fetched together:', results);\n})();`
    ],
    14: [
      `// Custom Error class & try/catch/finally\nclass ValidationError extends Error {\n  constructor(msg) { super(msg); this.name = 'ValidationError'; }\n}\ntry {\n  throw new ValidationError('Email missing @');\n} catch (e) {\n  console.log(e instanceof ValidationError, e.name, ':', e.message);\n} finally {\n  console.log('Finally cleanup always runs');\n}`
    ],
    15: [
      `// Node.js tooling & REST check simulation\nconst apiRoutes = [\n  { method: 'GET', path: '/todos', status: 200 },\n  { method: 'POST', path: '/todos', status: 201 }\n];\nconsole.table(apiRoutes);`
    ],
    16: [
      `// Big-O & Binary Search Lab\nfunction binarySearch(arr, target) {\n  let l = 0, r = arr.length - 1;\n  while (l <= r) {\n    const m = (l + r) >> 1;\n    if (arr[m] === target) return m;\n    arr[m] < target ? (l = m + 1) : (r = m - 1);\n  }\n  return -1;\n}\nconsole.log('Index of 23:', binarySearch([2, 5, 11, 23, 45, 70], 23));`
    ]
  };
  const arr = map[topicId] || [];
  return arr[bulletIdx] || arr[0] || fallbackCode;
}

function buildHtmlProjectStarter(project) {
  const safeTitle = project.title.replace(/</g, '&lt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; margin: 0; }
    .box { max-width: 480px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    button { background: #0ea5e9; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 700; }
  </style>
</head>
<body>
  <div class="box">
    <h2 style="margin-top:0">${safeTitle}</h2>
    <p id="status">Interactive preview ready! Edit HTML/CSS/JS here and click Run.</p>
    <div id="app"></div>
  </div>
  <script>
${project.starterCode}
  </script>
</body>
</html>`;
}

function createInteractiveStepsForLesson(item, { meta, topicsPartA, taskSolutions, projectsPartB, c1Theory, c2Coding, c3Output, mcqsPartD, prettyJS }) {
  const title = item.title;
  const steps = [];
  let stepNum = 1;
  const push = (obj) => {
    steps.push({ id: `${item.week}-${stepNum}`, stepNumber: stepNum++, ...obj });
  };

  // 1. Course Overview & 12-Week Plan
  if (title.startsWith('0. Course Overview')) {
    push({
      kind: 'overview',
      badge: 'Module 1/3 • Blueprint',
      title: 'Welcome to JavaScript Mastery Workbook',
      summary: `${meta.subtitle}. Ye poora 12-week guided course hai: 16 core topics, 96 step-by-step coding tasks, 12 real projects, 593 interview Q&As, aur 150 interactive MCQs.`,
      keyPoints: [
        '16 Roadmap Topics covering Basics se DSA & Node.js tak',
        '96 Practice Tasks — har task ka apna dedicated IDE & Terminal step',
        '12 Guided Projects with Live Web Preview & GitHub portfolio submissions',
        '593 Interview Q&As + 150 Node.js 22 verified MCQs'
      ],
      starterCode: `// Apna pehla JavaScript check Right Terminal me run karo!\nconst roadmap = {\n  topics: 16,\n  tasks: 96,\n  projects: 12,\n  interviewQAs: 593,\n  mcqs: 150\n};\nconsole.log('Namaste Smart Learn JS!');\nconsole.table(roadmap);`,
      runMode: 'javascript',
      analysisFocus: 'Course overview and JS runtime initialization check'
    });
    push({
      kind: 'concept',
      badge: 'Module 2/3 • How to Practice',
      title: 'Workbook Study Method & Research Alignment',
      summary: 'Is course me copy-paste nahi karna hai — har concept part padhkar turant Right Editor me run karo aur practice tasks pehle khud try karo.',
      keyPoints: [...meta.howToUse, ...meta.researchNotes],
      runMode: 'javascript',
      starterCode: `// Active Practice Rule Demo\nfunction practiceStep(concept) {\n  return \`Read -> Code Live -> Solve Task -> Check Edge Case (\${concept})\`;\n}\nconsole.log(practiceStep('Closures'));`
    });
    push({
      kind: 'overview',
      badge: 'Module 3/3 • 12-Week Roadmap',
      title: '12-Week Study Plan (Daily 1.5–2 Ghante)',
      summary: 'Har week ka exact focus aur target output niche table me diya gaya hai. Left Sidebar me Weeks 1 se 12 isi sequence me arranged hain.',
      tableRows: meta.studyPlan.map(w => ({ col1: `Week ${w.week}`, col2: w.focus, col3: w.output })),
      runMode: 'none'
    });
    return steps;
  }

  // 2. Appendix & Final Checklist
  if (title.startsWith('Appendix:')) {
    push({
      kind: 'checklist',
      badge: 'Final Gate 1/3 • Checklist',
      title: 'Interview Se Pehle 7-Point Readiness Checklist',
      summary: 'Interview rounds me jaane se pehle verify karo ki ye sabhi 7 skills bina reference dekhe confidently implement kar sakte ho.',
      keyPoints: meta.checklist,
      runMode: 'javascript',
      starterCode: `// Quick Interview Self-Test: Debounce + Deep Clone check\nconst debounce = (fn, ms = 300) => {\n  let t;\n  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };\n};\nconst log = debounce(msg => console.log('Debounced:', msg), 50);\nlog('first'); log('second');`
    });
    push({
      kind: 'overview',
      badge: 'Final Gate 2/3 • Resources',
      title: 'Curated Free Practice Platforms & Docs',
      summary: 'Book me recommended best free JavaScript & DSA resources daily practice ke liye:',
      keyPoints: meta.freeResources.map(r => `${r.name} (${r.url}) — ${r.desc}`),
      runMode: 'none'
    });
    push({
      kind: 'overview',
      badge: 'Final Gate 3/3 • 150 MCQ Key',
      title: 'Part D: Complete MCQ Answer Key & Explanations (1–150)',
      summary: 'Self-assessment ke liye Course detail page par "Course MCQs (150)" tab attempt karo! Niche complete reference answer key aur workbook explanations hain.',
      tableRows: mcqsPartD.map(m => ({ col1: `Q${m.num} (${m.correct_option})`, col2: m.category, col3: m.explanation || '-' })),
      runMode: 'none'
    });
    return steps;
  }

  // 3. Part A Topics (1..16) -> Split EACH concept bullet + Core Example + EACH individual Task!
  const topicMatch = title.match(/^(\d{1,2})\.\s/);
  if (topicMatch) {
    const topicId = Number(topicMatch[1]);
    const topic = topicsPartA.find(t => t.id === topicId);
    if (topic) {
      const isDomTopic = topicId === 11 || topicId === 12;
      const runMode = isDomTopic ? 'html_preview' : 'javascript';

      // Deeply divide theory bullets into individual Concept Steps!
      topic.kyaSeekhnaHai.forEach((bullet, idx) => {
        push({
          kind: 'concept',
          badge: `Theory Part ${idx + 1}/${topic.kyaSeekhnaHai.length}`,
          title: `${topic.phase.replace(/^Phase \d+:\s*/, '')} — Concept ${idx + 1}: ${bullet.split(/[:—-]/)[0].trim().slice(0, 60)}`,
          summary: bullet,
          keyPoints: [
            `Phase: ${topic.phase}`,
            'Right IDE me starter code run karke values change karke experiment karo.',
            'Output verify hone ke baad "Next Step ->" press karke agla concept/task kholo.'
          ],
          starterCode: buildConceptStarter(topicId, idx, bullet, topic.codeExample),
          runMode,
          analysisFocus: `Topic ${topicId} (${topic.title}) Concept ${idx + 1}: ${bullet}`
        });
      });

      // Core Workbook Code Example Step
      push({
        kind: 'code_lab',
        badge: 'Workbook Core Demo',
        title: `${topic.id}. Core Code Walkthrough`,
        summary: `Workbook ke Topic ${topic.id} ("${topic.title}") ka main example code. Isko Right Terminal/Preview me execute karke har line ka behaviour verify karo.`,
        codeSnippet: topic.codeExample,
        starterCode: isDomTopic && !topic.codeExample.includes('<html')
          ? `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <div id="app" class="box"><h2>Topic ${topic.id} Sandbox</h2><p id="msg">Ready</p><button id="btn">Click Me</button><ul id="list"></ul></div>\n  <script>\n${topic.codeExample}\n  </script>\n</body></html>`
          : topic.codeExample,
        runMode,
        analysisFocus: `Explain Topic ${topic.id} Core Code Example line by line`
      });

      // Individual Practice Tasks (1 task per screen, Coding Ninjas style!)
      topic.tasks.forEach((task, tIdx) => {
        const sol = taskSolutions[task.id] || '';
        const starter = isDomTopic
          ? `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <h2 id="title">Task ${task.id}</h2>\n  <div id="app">\n    <button id="toggleBtn">Action</button>\n    <ul id="list"></ul>\n  </div>\n  <script>\n    // ${task.title}\n    // Hint 1: ${task.steps[0]?.text || ''}\n  </script>\n</body></html>`
          : `// Task ${task.id}: ${task.title}\n// Step 1: ${task.steps[0]?.text || ''}\n\n`;
        push({
          kind: 'task',
          badge: `Practice Task ${task.id} (${tIdx + 1}/6)`,
          title: `Task ${task.id}: ${task.title}`,
          summary: 'Pehle Right IDE me khud solve karo! Atak jao to ek-ek karke Step 1, Step 2, Step 3 hints kholo, aur code chalane ke baad Reference Solution se compare karo.',
          hints: task.steps,
          starterCode: starter,
          solutionCode: sol,
          runMode,
          analysisFocus: `Task ${task.id}: ${task.title}`
        });
      });

      if (item.assignment) {
        push({
          kind: 'assignment',
          badge: 'Milestone Assignment',
          title: item.assignment.title,
          summary: item.assignment.description,
          keyPoints: [`Reward: +${item.assignment.xp_reward} XP`, 'Neeche apna verified code submit karo'],
          runMode: 'none'
        });
      }
      return steps;
    }
  }

  // 4. Part B Guided Projects (P1..P12) -> Divide into Brief + 3 Build Milestones + Submission
  const projMatch = title.match(/^P(\d{1,2}):\s/);
  if (projMatch) {
    const pid = Number(projMatch[1]);
    const project = projectsPartB.find(p => p.id === pid);
    if (project) {
      const isRestApi = pid === 12;
      const runMode = isRestApi ? 'javascript' : 'html_preview';
      const editorStarter = isRestApi ? project.starterCode : buildHtmlProjectStarter(project);

      push({
        kind: 'project_overview',
        badge: `Project ${pid}/12 • Overview`,
        title: `Project ${pid}: ${project.title}`,
        summary: `Level: ${project.level}. Pehle Right Pane me Starter Code inspect/run karo, phir ek-ek milestone build steps follow karke apni complete app banao.`,
        keyPoints: project.skills.map(s => `Skill: ${s}`),
        codeSnippet: project.starterCode,
        starterCode: editorStarter,
        runMode,
        analysisFocus: `Project ${pid} Architecture & Starter Setup: ${project.title}`
      });

      const chunkSize = Math.ceil(project.steps.length / 3);
      for (let i = 0; i < project.steps.length; i += chunkSize) {
        const mNum = Math.floor(i / chunkSize) + 1;
        const slice = project.steps.slice(i, i + chunkSize);
        push({
          kind: 'project_milestone',
          badge: `Build Milestone ${mNum}/${Math.ceil(project.steps.length / chunkSize)}`,
          title: `Steps ${i + 1}–${i + slice.length}: Build Phase ${mNum}`,
          summary: `Right Editor me Milestone ${mNum} ke requirements implement karke ${isRestApi ? 'JS Terminal' : 'Live Web Preview'} me test karo.`,
          keyPoints: slice.map((st, idx) => `Step ${i + idx + 1}: ${st}`),
          starterCode: editorStarter,
          runMode,
          analysisFocus: `Project ${pid} Milestone ${mNum}: ${slice.join(' | ')}`
        });
      }

      if (item.assignment) {
        push({
          kind: 'assignment',
          badge: 'Project Submission',
          title: item.assignment.title,
          summary: item.assignment.description,
          keyPoints: [`Reward: +${item.assignment.xp_reward} XP`, 'Code / GitHub Link / Live URL submit karo'],
          runMode: 'none'
        });
      }
      return steps;
    }
  }

  // 5. Part C1 Interview Theory -> Interactive 10-question Study Sets
  if (title.startsWith('C1.')) {
    const rangeM = title.match(/Q(\d+)-(\d+)/);
    const start = rangeM ? Number(rangeM[1]) : 1;
    const end = rangeM ? Number(rangeM[2]) : 61;
    const subset = c1Theory.filter(q => q.num >= start && q.num <= end);
    const DECK_SIZE = 10;
    const totalDecks = Math.ceil(subset.length / DECK_SIZE);
    for (let i = 0; i < subset.length; i += DECK_SIZE) {
      const deck = subset.slice(i, i + DECK_SIZE);
      const dNum = Math.floor(i / DECK_SIZE) + 1;
      const cats = Array.from(new Set(deck.map(d => d.category))).join(' • ');
      push({
        kind: 'interview_theory',
        badge: `Theory Deck ${dNum}/${totalDecks}`,
        title: `${deck[0].id}–${deck[deck.length - 1].id}: ${cats}`,
        summary: 'Har question ka jawab pehle khud sochkar bolo, phir "Reveal Answer" par click karo. Chaho to Right Terminal me example code test bhi kar sakte ho!',
        qaItems: deck.map(q => ({ id: q.id, question: q.question, answer: q.answer })),
        starterCode: `// Quick Scratchpad for ${deck[0].id}–${deck[deck.length - 1].id}\nconsole.log('Test any concept snippet live!');`,
        runMode: 'javascript',
        analysisFocus: `Interview Theory ${deck[0].id}-${deck[deck.length - 1].id} (${cats})`
      });
    }
    return steps;
  }

  // 6. Part C2 Interview Coding -> Interactive 8-Problem Coding Decks (with Load-to-Editor per problem!)
  if (title.startsWith('C2.')) {
    const rangeM = title.match(/Q(\d+)-(\d+)/);
    const start = rangeM ? Number(rangeM[1]) : 419;
    const end = rangeM ? Number(rangeM[2]) : 541;
    const subset = c2Coding.filter(q => q.num >= start && q.num <= end);
    const DECK_SIZE = 8;
    const totalDecks = Math.ceil(subset.length / DECK_SIZE);
    for (let i = 0; i < subset.length; i += DECK_SIZE) {
      const deck = subset.slice(i, i + DECK_SIZE);
      const dNum = Math.floor(i / DECK_SIZE) + 1;
      push({
        kind: 'interview_coding',
        badge: `Coding Set ${dNum}/${totalDecks}`,
        title: `Coding Problems ${deck[0].id}–${deck[deck.length - 1].id}`,
        summary: 'Kisi bhi problem ke "Load Solution in IDE ▶" button par click karke solution turant Right Editor & Node Terminal me run aur modify karo.',
        qaItems: deck.map(q => ({
          id: q.id,
          question: q.prompt,
          code: prettyJS(q.solution)
        })),
        starterCode: prettyJS(deck[0].solution) + `\n\n// Test your call above & press Run Code!`,
        runMode: 'javascript',
        analysisFocus: `Interview Coding Problems ${deck[0].id}-${deck[deck.length - 1].id}`
      });
    }
    return steps;
  }

  // 7. Part C3 Output Prediction (Q542-Q593) -> Interactive 6-Snippet Verification Decks!
  if (title.startsWith('C3.')) {
    const DECK_SIZE = 6;
    const totalDecks = Math.ceil(c3Output.length / DECK_SIZE);
    for (let i = 0; i < c3Output.length; i += DECK_SIZE) {
      const deck = c3Output.slice(i, i + DECK_SIZE);
      const dNum = Math.floor(i / DECK_SIZE) + 1;
      push({
        kind: 'interview_output',
        badge: `Output Lab ${dNum}/${totalDecks}`,
        title: `Output Prediction ${deck[0].id}–${deck[deck.length - 1].id}`,
        summary: 'Pehle output dimaag me dry-run karo, phir "Run Snippet ▶" par click karke Node.js 22 verified output check karo aur explanation dekho!',
        qaItems: deck.map(q => ({
          id: q.id,
          question: q.prompt,
          code: prettyJS(q.code.replace(/\s+/g, ' ').trim()) || q.code,
          answer: q.answer,
          explanation: q.explanation
        })),
        starterCode: prettyJS(deck[0].code.replace(/\s+/g, ' ').trim()) || deck[0].code,
        runMode: 'javascript',
        analysisFocus: `Output Prediction Set ${deck[0].id}-${deck[deck.length - 1].id}`
      });
    }
    return steps;
  }

  return steps;
}

module.exports = { createInteractiveStepsForLesson };

