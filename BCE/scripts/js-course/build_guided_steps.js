// Builds cleanly structured, English-only interactive steps (keywords, headings, points, arrows)
// and runnable JS/HTML starters for all 39 lessons of the JavaScript Mastery Workbook.

function extractKeywords(text, extra = []) {
  const found = new Set(extra.filter(Boolean));
  const codeTokens = text.match(/\b(?:const|let|var|function\*?|class|extends|super|async|await|try|catch|finally|throw|for(?:\.\.\.(?:of|in))?|while|switch|break|continue|Map|Set|WeakMap|Promise(?:\.\w+)?|Array(?:\.\w+)?|Object(?:\.\w+)?|JSON(?:\.\w+)?|RegExp|Date|Intl\.\w+|fetch|AbortController|localStorage|sessionStorage|document|querySelector(?:All)?|addEventListener|createElement|DocumentFragment|structuredClone|typeof|instanceof|NaN|BigInt|Symbol|ES6\+?)\b|\?\?|\?\.|===|==|\.\.\.\w+/g) || [];
  for (const tok of codeTokens) {
    if (found.size >= 6) break;
    found.add(tok);
  }
  const topicWords = text.match(/\b(?:Hoisting|TDZ|Closures?|Recursion|Callbacks?|Debounce|Memoization|Currying|Destructuring|Prototypes?|Polymorphism|Delegation|Bubbling|Capturing|Event Loop|Microtasks?|Macrotasks?|Validation|Express|REST API|Git|Vite|Big-O|Sliding Window|Two Pointers|Binary Search|Dynamic Programming|BFS|XSS)\b/gi) || [];
  for (const w of topicWords) {
    if (found.size >= 6) break;
    found.add(w);
  }
  return Array.from(found).slice(0, 6);
}

function splitToArrowPoints(text) {
  const parts = String(text || '')
    .split(/(?:;\s*|\s*—\s*|,\s+(?=[a-zA-Z])|:\s+(?=[^/]))/)
    .map(s => s.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return [`Key Focus → ${text.trim()}`];
  }

  const hasColonHeader = /^([^:]{2,32}):\s+(.+)$/.exec(text.trim());
  if (hasColonHeader) {
    const subParts = hasColonHeader[2].split(/;\s*/).map(s => s.trim()).filter(Boolean);
    return subParts.map((sp, i) => (i === 0 ? `${hasColonHeader[1].trim()} → ${sp}` : `Note → ${sp}`));
  }

  return parts.map((p, idx) => {
    if (idx === 0) return `Core → ${p}`;
    return `Detail → ${p}`;
  });
}

function buildConceptStarter(topicId, bulletIdx, fallbackCode) {
  const map = {
    1: [
      `// DevTools & Node Console Demo\nconsole.log('Node / Browser Runtime Active!');\nconsole.table([\n  { env: 'Browser DevTools', shortcut: 'F12 / Ctrl+Shift+I' },\n  { env: 'Node.js 22 CLI', shortcut: 'node app.js' }\n]);`,
      `// Browser <script> vs Node CLI Runtime Check\nconst runtime = typeof window === 'undefined' ? 'Node.js Runtime' : 'Browser DOM';\nconsole.log('Executing inside:', runtime);`,
      `// var vs let vs const\nconst appName = 'SmartLearn JS';\nlet score = 10;\nscore += 15;\nconsole.log({ appName, score });\n// appName = 'Other'; // Uncomment to observe TypeError on const reassignment`,
      `// camelCase Naming & Valid Identifiers\nconst studentFirstName = 'Asha';\nconst maxRetryCount = 3;\nconsole.log({ studentFirstName, maxRetryCount });`,
      `// Single-Line & Multi-Line Comments\n/* Returns the square of n cleanly */\nconst square = n => n * n;\nconsole.log('square(6) =', square(6));`
    ],
    2: [
      `// 7 Primitive Data Types in JavaScript\nconst samples = [\n  42,\n  'JS',\n  true,\n  null,\n  undefined,\n  9007199254740993n,\n  Symbol('id')\n];\nsamples.forEach(v => console.log(String(v), '=> typeof:', typeof v));`,
      `// Arithmetic, Nullish Coalescing (??), and Optional Chaining (?.)\nconst user = { profile: { score: 0 } };\nconsole.log('Using ??:', user?.profile?.score ?? 100); // preserves 0\nconsole.log('Using ||:', user?.profile?.score || 100); // falls back on 0\nconsole.log('2 ** 5 =', 2 ** 5);`,
      `// Strict (===) vs Loose (==) Equality\nconsole.log("'5' == 5:", '5' == 5);\nconsole.log("'5' === 5:", '5' === 5);\nconsole.log('null == undefined:', null == undefined);\nconsole.log('null === undefined:', null === undefined);`,
      `// Truthy vs Falsy Values\nconst items = [false, 0, -0, 0n, '', null, undefined, NaN, '0', [], {}];\nconsole.table(items.map(x => ({ value: String(x), isTruthy: Boolean(x) })));`,
      `// Explicit Conversions: Number(), String(), Boolean()\nconsole.log(Number('42'), Number('42px'), parseInt('42px', 10));\nconsole.log(String(123), Boolean(''), Boolean('false'));`
    ],
    3: [
      `// Conditional Branching: if / else / ternary\nconst marks = 84;\nconst grade = marks >= 90 ? 'A+' : marks >= 75 ? 'A' : 'B';\nconsole.log('Grade:', grade);`,
      `// Loops: for, while, for...of, for...in\nfor (let i = 1; i <= 3; i++) {\n  console.log('for index:', i);\n}\nfor (const ch of 'JS') {\n  console.log('for...of char:', ch);\n}`,
      `// break & continue inside Loops\nfor (let i = 1; i <= 7; i++) {\n  if (i === 3) continue;\n  if (i === 6) break;\n  console.log('i =', i);\n}`,
      `// Guard Clauses & Early Return Pattern\nfunction processOrder(order) {\n  if (!order) return 'Invalid order';\n  if (order.amount <= 0) return 'Amount must be positive';\n  return \`Processed order #\${order.id}\`;\n}\nconsole.log(processOrder({ id: 101, amount: 250 }));`,
      `// Off-by-One Boundary Check (0 to arr.length - 1)\nconst items = ['A', 'B', 'C'];\nfor (let i = 0; i < items.length; i++) {\n  console.log(\`Index \${i}: \${items[i]}\`);\n}`
    ],
    4: [
      `// Function Declaration vs Expression vs Arrow\nconsole.log(addDecl(2, 3)); // Hoisted!\nfunction addDecl(a, b) {\n  return a + b;\n}\nconst addArrow = (a, b) => a + b;\nconsole.log(addArrow(4, 5));`,
      `// Default Parameters & Rest Syntax (...args)\nfunction sumAll(multiplier = 1, ...nums) {\n  return nums.reduce((acc, n) => acc + n, 0) * multiplier;\n}\nconsole.log(sumAll(2, 10, 20, 30));`,
      `// Higher-Order Functions & Callbacks\nfunction applyTwice(x, fn) {\n  return fn(fn(x));\n}\nconsole.log(applyTwice(3, n => n * 2));`,
      `// Pure Function vs Mutating Side Effect\nconst purePush = (arr, item) => [...arr, item];\nconst orig = [1, 2];\nconsole.log('new:', purePush(orig, 3), 'original untouched:', orig);`,
      `// Recursion with Base Case\nfunction factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}\nconsole.log('factorial(5) =', factorial(5));`,
      `// IIFE: Immediately Invoked Function Expression\nconst config = (() => {\n  const secret = 'scoped-value';\n  return { ready: true, len: secret.length };\n})();\nconsole.log(config);`
    ],
    5: [
      `// Global, Function & Block Scope\n{\n  const blockVar = 'confined to block';\n  var fnScoped = 'leaks outside block';\n  console.log(blockVar);\n}\nconsole.log(fnScoped);`,
      `// Lexical Scope & Scope Chain\nconst outer = 'level-1';\nfunction parent() {\n  const mid = 'level-2';\n  function child() {\n    console.log(outer, '->', mid);\n  }\n  child();\n}\nparent();`,
      `// Hoisting & Temporal Dead Zone (TDZ)\nconsole.log('var x before assign:', x);\nvar x = 99;\nlet y = 10;\nconsole.log('let y after init:', y);`,
      `// Closures: Retained Lexical Environment\nfunction makeMultiplier(factor) {\n  return n => n * factor;\n}\nconst triple = makeMultiplier(3);\nconsole.log(triple(7), triple(12));`,
      `// Closure Use Case: once()\nfunction once(fn) {\n  let called = false;\n  let result;\n  return (...args) => {\n    if (!called) {\n      called = true;\n      result = fn(...args);\n    }\n    return result;\n  };\n}\nconst init = once(() => 'Initialized once!');\nconsole.log(init(), init());`
    ],
    6: [
      `// Array Mutations: push, pop, shift, unshift\nconst queue = ['a', 'b'];\nqueue.push('c');\nconsole.log('pop:', queue.pop());\nconsole.log('shift:', queue.shift());\nconsole.log('remaining:', queue);`,
      `// slice (non-mutating) vs splice (mutating)\nconst nums = [10, 20, 30, 40, 50];\nconsole.log('slice(1, 3):', nums.slice(1, 3), 'untouched:', nums);\nnums.splice(1, 2, 99);\nconsole.log('after splice:', nums);`,
      `// map, filter & reduce Pipeline\nconst orders = [120, 450, 80, 600];\nconst total = orders\n  .filter(x => x > 100)\n  .map(x => x * 1.1)\n  .reduce((s, x) => s + x, 0);\nconsole.log('Total:', total.toFixed(2));`,
      `// Numeric Sort Comparator vs String Trap\nconst arr = [100, 20, 3];\nconsole.log('Default string sort:', [...arr].sort());\nconsole.log('Numeric sort:', [...arr].sort((x, y) => x - y));`,
      `// Array Destructuring & Spread\nconst [first, second, ...rest] = [10, 20, 30, 40];\nconsole.log({ first, second, rest });`,
      `// Non-Mutating Copy Before Reverse\nconst orig = [1, 2, 3];\nconst reversed = [...orig].reverse();\nconsole.log({ orig, reversed });`
    ],
    7: [
      `// String Immutability & Slicing\nconst raw = '  JavaScript Mastery  ';\nconsole.log(raw.trim().slice(0, 10).toUpperCase());`,
      `// split, join, replaceAll, padStart\nconst slug = 'hello world js'.split(' ').join('-');\nconsole.log({ slug, padded: '7'.padStart(3, '0') });`,
      `// Template Literals\nconst user = 'Asha';\nconst tasks = 96;\nconsole.log(\`Student: \${user} | Tasks: \${tasks}\`);`,
      `// RegExp Basics: Character Classes & Quantifiers\nconsole.log('Has code?', /\\d{3}-\\d{4}/.test('ID 555-1234'));\nconsole.log('Digits:', 'Room 402B'.match(/\\d+/g));`,
      `// test(), match(), matchAll(), replace()\nconst text = 'Orders: #101, #204, #999';\nconsole.log('Order IDs:', text.match(/#\\d+/g));\nconsole.log('Case-insensitive:', /javascript/i.test('Learn JavaScript'));`,
      `// Unicode Emoji Length Gotcha (UTF-16)\nconst emoji = '🚀';\nconsole.log('UTF-16 .length:', emoji.length);\nconsole.log('Code point length:', [...emoji].length);`
    ],
    8: [
      `// Object Literals, Computed Keys & Shorthand\nconst field = 'role';\nconst dev = { name: 'Riya', [field]: 'Engineer' };\nconsole.log(dev);`,
      `// Object.keys / values / entries / freeze\nconst cfg = Object.freeze({ host: 'localhost', port: 3000 });\nconsole.log('Entries:', Object.entries(cfg));`,
      `// Destructuring, Spread & Optional Chaining\nconst user = { name: 'Ravi', address: { city: 'Ranchi' } };\nconst { name, address: { city } } = user;\nconsole.log(name, city, user?.phone?.number ?? 'No phone');`,
      `// Explicit this Binding: call / apply / bind\nconst person = {\n  name: 'Kabir',\n  greet(city) {\n    return \`\${this.name} in \${city}\`;\n  }\n};\nconst fn = person.greet;\nconsole.log('Bound:', fn.bind(person)('Delhi'));`,
      `// JSON Serialization & Parsing\nconst data = { course: 'JS', weeks: 12 };\nconst json = JSON.stringify(data);\nconsole.log('Parsed back:', JSON.parse(json));`,
      `// Map & Set Collections\nconst unique = new Set([1, 2, 2, 3]);\nconst scores = new Map([['Alice', 95], ['Bob', 88]]);\nconsole.log('Set size:', unique.size, 'Alice:', scores.get('Alice'));`
    ],
    9: [
      `// Destructuring, Spread & Default Params\nfunction connect({ host = 'localhost', port = 3000 } = {}) {\n  return \`https://\${host}:\${port}\`;\n}\nconsole.log(connect({ port: 8080 }));`,
      `// Optional Chaining (?.) & Nullish Coalescing (??)\nconst settings = { retries: 0 };\nconsole.log('retries:', settings.retries ?? 3);\nconsole.log('timeout:', settings.network?.timeout ?? 5000);`,
      `// Iterators & Generators (function*)\nfunction* countUp(limit) {\n  for (let i = 1; i <= limit; i++) yield i;\n}\nconsole.log([...countUp(4)]);`,
      `// ES Modules Export/Import Pattern Reference\nconst mathModule = {\n  add: (a, b) => a + b,\n  greet: name => \`Hi \${name}\`\n};\nconsole.log(mathModule.greet('Dev'), mathModule.add(5, 7));`,
      `// Modern ES Methods: at(), flatMap(), structuredClone()\nconst arr = ['first', 'middle', 'last'];\nconsole.log('last via .at(-1):', arr.at(-1));\nconsole.log('flatMap:', [1, 2].flatMap(n => [n, n * 10]));`
    ],
    10: [
      `// Prototype Chain Inspection\nconst arr = [1, 2];\nconsole.log('Proto === Array.prototype:', Object.getPrototypeOf(arr) === Array.prototype);\nconsole.log('Inherits Object.prototype?', Object.getPrototypeOf(Array.prototype) === Object.prototype);`,
      `// Constructor Function & new Operator\nfunction User(name) {\n  this.name = name;\n}\nUser.prototype.sayHi = function () {\n  return \`Hi, I am \${this.name}\`;\n};\nconsole.log(new User('Asha').sayHi());`,
      `// Class Syntax, Constructor, Getters & Static Methods\nclass Rect {\n  constructor(w, h) { this.w = w; this.h = h; }\n  get area() { return this.w * this.h; }\n  static unit() { return new Rect(1, 1); }\n}\nconsole.log('Area:', new Rect(4, 5).area);`,
      `// Inheritance: extends & super\nclass Animal {\n  constructor(name) { this.name = name; }\n  speak() { return \`\${this.name} makes a sound\`; }\n}\nclass Dog extends Animal {\n  speak() { return \`\${this.name} barks!\`; }\n}\nconsole.log(new Dog('Rex').speak());`,
      `// Private Class Fields (#x)\nclass Account {\n  #balance = 0;\n  constructor(initial) { this.#balance = initial; }\n  get balance() { return this.#balance; }\n  deposit(amt) { this.#balance += amt; }\n}\nconst acc = new Account(100);\nacc.deposit(50);\nconsole.log('Balance:', acc.balance);`,
      `// Composition vs Inheritance\nconst canLog = name => ({ log: msg => console.log(\`[\${name}] \${msg}\`) });\nconst service = Object.assign({ status: 'UP' }, canLog('API'));\nservice.log('Running smoothly');`
    ],
    11: [
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 18px; background: #0f172a; color: #f8fafc; }\n    .card { background: #1e293b; border: 1px solid #334155; padding: 16px; border-radius: 10px; max-width: 420px; }\n    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h2 id="title">Selecting DOM Elements</h2>\n    <p class="desc">Click below to query and update via querySelector()</p>\n    <button id="btn">Update Title</button>\n  </div>\n  <script>\n    const heading = document.querySelector('#title');\n    document.querySelector('#btn').addEventListener('click', () => {\n      heading.textContent = 'Updated with querySelector!';\n      heading.style.color = '#38bdf8';\n    });\n  </script>\n</body>\n</html>`,
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 18px; background: #0f172a; color: #f8fafc; }\n    input { padding: 7px 10px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #fff; }\n    button { background: #10b981; color: #052e16; border: none; padding: 7px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }\n    li { margin-top: 6px; padding: 6px 10px; background: #1e293b; border-radius: 6px; }\n  </style>\n</head>\n<body>\n  <h3>Create & Append Elements Safely</h3>\n  <input id="itemInput" placeholder="New item..." />\n  <button id="addBtn">Add</button>\n  <ul id="list" style="list-style:none;padding:0"></ul>\n  <script>\n    const list = document.querySelector('#list');\n    const input = document.querySelector('#itemInput');\n    document.querySelector('#addBtn').addEventListener('click', () => {\n      const val = input.value.trim();\n      if (!val) return;\n      const li = document.createElement('li');\n      li.textContent = val;\n      list.append(li);\n      input.value = '';\n    });\n  </script>\n</body>\n</html>`,
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 18px; background: #0f172a; color: #f8fafc; }\n    .card { padding: 14px; border-radius: 8px; background: #1e293b; margin-top: 10px; }\n    .highlight { border: 2px solid #06b6d4; background: #082f49; }\n  </style>\n</head>\n<body>\n  <button id="toggle">Toggle Highlight Class</button>\n  <div id="box" class="card">Safe textContent renders HTML tags literally without XSS.</div>\n  <script>\n    const box = document.querySelector('#box');\n    document.querySelector('#toggle').addEventListener('click', () => {\n      box.classList.toggle('highlight');\n    });\n  </script>\n</body>\n</html>`
    ],
    12: [
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 18px; background: #0f172a; color: #f8fafc; }\n    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }\n  </style>\n</head>\n<body>\n  <h3>Event Delegation Demo</h3>\n  <div id="actions" style="display:flex;gap:8px;margin-bottom:10px">\n    <button data-action="Save">Save</button>\n    <button data-action="Share">Share</button>\n    <button data-action="Export">Export</button>\n  </div>\n  <p id="status">Click any button (handled by 1 parent listener)</p>\n  <script>\n    document.querySelector('#actions').addEventListener('click', e => {\n      const btn = e.target.closest('button');\n      if (!btn) return;\n      document.querySelector('#status').textContent = 'Clicked: ' + btn.dataset.action;\n    });\n  </script>\n</body>\n</html>`,
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 18px; background: #0f172a; color: #f8fafc; }\n    form { display: flex; gap: 8px; }\n    input { padding: 7px 10px; border-radius: 6px; border: 1px solid #334155; background: #1e293b; color: #fff; }\n    button { background: #10b981; color: #052e16; border: none; padding: 7px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; }\n  </style>\n</head>\n<body>\n  <h3>preventDefault() Form Handling</h3>\n  <form id="demoForm">\n    <input id="nameInput" placeholder="Enter your name" required />\n    <button type="submit">Submit</button>\n  </form>\n  <p id="msg"></p>\n  <script>\n    document.querySelector('#demoForm').addEventListener('submit', e => {\n      e.preventDefault();\n      const name = document.querySelector('#nameInput').value.trim();\n      document.querySelector('#msg').textContent = 'Submitted without reload: ' + name;\n    });\n  </script>\n</body>\n</html>`
    ],
    13: [
      `// Event Loop Execution Order: Sync -> Microtask -> Macrotask\nconsole.log('1: Sync start');\nsetTimeout(() => console.log('4: Macrotask setTimeout'), 0);\nPromise.resolve().then(() => console.log('3: Microtask Promise'));\nconsole.log('2: Sync end');`,
      `// Promise States & Chaining\nPromise.resolve(10)\n  .then(n => n * 2)\n  .then(n => console.log('Chained result:', n))\n  .catch(err => console.error(err))\n  .finally(() => console.log('Cleanup complete'));`,
      `// async/await + Promise.all Parallel Execution\nconst delay = (ms, val) => new Promise(r => setTimeout(() => r(val), ms));\n(async () => {\n  const [user, orders] = await Promise.all([\n    delay(40, 'User'),\n    delay(40, 'Orders')\n  ]);\n  console.log('Parallel resolved:', { user, orders });\n})();`
    ],
    14: [
      `// Custom Error Subclasses & try/catch/finally\nclass ValidationError extends Error {\n  constructor(msg) {\n    super(msg);\n    this.name = 'ValidationError';\n  }\n}\ntry {\n  throw new ValidationError('Email is missing @ symbol');\n} catch (err) {\n  console.log(err instanceof ValidationError, err.name, '->', err.message);\n} finally {\n  console.log('Finally block always executes');\n}`
    ],
    15: [
      `// Node.js REST Routes & Scripts Overview\nconst apiRoutes = [\n  { method: 'GET', path: '/todos', status: 200 },\n  { method: 'POST', path: '/todos', status: 201 },\n  { method: 'DELETE', path: '/todos/:id', status: 200 }\n];\nconsole.table(apiRoutes);`
    ],
    16: [
      `// Binary Search — O(log n) Time, O(1) Space\nfunction binarySearch(arr, target) {\n  let l = 0;\n  let r = arr.length - 1;\n  while (l <= r) {\n    const m = (l + r) >> 1;\n    if (arr[m] === target) return m;\n    if (arr[m] < target) l = m + 1;\n    else r = m - 1;\n  }\n  return -1;\n}\nconsole.log('Index of 23:', binarySearch([2, 5, 11, 23, 45, 70], 23));`
    ]
  };

  const list = map[topicId] || [];
  if (topicId === 11 || topicId === 12) {
    return list[bulletIdx % list.length] || list[0] || fallbackCode;
  }
  return list[bulletIdx] || list[0] || fallbackCode;
}

function buildHtmlProjectStarter(project) {
  const safeTitle = project.title.replace(/</g, '&lt;');
  const commonHead = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; margin: 0; }
    .card { max-width: 480px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    h2 { margin-top: 0; font-size: 18px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
    input, select { flex: 1; min-width: 110px; padding: 8px 10px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-weight: 700; }
    button.sec { background: #334155; color: #e2e8f0; }
    .out { margin-top: 12px; padding: 10px 12px; border-radius: 8px; background: #0f172a; border: 1px solid #334155; font-size: 14px; }
    .board { display: grid; grid-template-columns: repeat(3, 64px); gap: 6px; margin: 12px 0; }
    .cell { height: 64px; font-size: 22px; font-weight: 800; background: #0f172a; color: #38bdf8; border: 1px solid #334155; border-radius: 8px; }
    li { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #0f172a; border-radius: 6px; margin-top: 6px; cursor: pointer; }
    li.done span { text-decoration: line-through; opacity: 0.6; }
  </style>
</head>`;

  const templates = {
    1: `${commonHead}
<body>
  <div class="card">
    <h2>Tip &amp; Bill Splitter</h2>
    <div class="row">
      <input id="bill" type="number" value="1000" placeholder="Bill (INR)" />
      <select id="pct">
        <option value="10">10% Tip</option>
        <option value="15">15% Tip</option>
        <option value="20">20% Tip</option>
      </select>
      <input id="people" type="number" value="4" min="1" placeholder="People" />
    </div>
    <button id="calcBtn">Calculate Split</button>
    <div id="result" class="out">Enter values and click Calculate Split</div>
  </div>
  <script>
${project.starterCode}
    const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    const runCalc = () => {
      try {
        const bill = Number(document.querySelector('#bill').value);
        const pct = Number(document.querySelector('#pct').value);
        const people = Number(document.querySelector('#people').value);
        const { total, perPerson } = calc(bill, pct, people);
        document.querySelector('#result').textContent = \`Total: \${fmt.format(total)} | Per Person: \${fmt.format(perPerson)}\`;
      } catch (e) {
        document.querySelector('#result').textContent = e.message;
      }
    };
    document.querySelector('#calcBtn').addEventListener('click', runCalc);
    runCalc();
  </script>
</body>
</html>`,
    2: `${commonHead}
<body>
  <div class="card">
    <h2>Todo App + localStorage</h2>
    <div class="row">
      <input id="todoInput" placeholder="Add a new task..." />
      <button id="addBtn">Add</button>
    </div>
    <div class="row">
      <button class="sec" data-filter="all">All</button>
      <button class="sec" data-filter="active">Active</button>
      <button class="sec" data-filter="done">Done</button>
    </div>
    <ul id="list" style="list-style:none;padding:0;margin:0"></ul>
  </div>
  <script>
    const list = document.querySelector('#list');
    let filter = 'all';
    let todos = (() => {
      try { return JSON.parse(localStorage.getItem('todos') || '[]'); } catch { return []; }
    })();
    if (todos.length === 0) {
      todos = [{ id: 1, text: 'Practice JavaScript DOM', done: false }];
    }
    const visible = () => todos.filter(t => filter === 'all' ? true : filter === 'done' ? t.done : !t.done);
${project.starterCode}
    document.querySelector('#addBtn').addEventListener('click', () => {
      const inp = document.querySelector('#todoInput');
      if (!inp.value.trim()) return;
      todos.push({ id: Date.now(), text: inp.value.trim(), done: false });
      inp.value = '';
      save(); render();
    });
    list.addEventListener('click', e => {
      const li = e.target.closest('li');
      if (!li) return;
      todos = todos.map(t => t.id === Number(li.dataset.id) ? { ...t, done: !t.done } : t);
      save(); render();
    });
    document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      render();
    }));
    render();
  </script>
</body>
</html>`,
    3: `${commonHead}
<body>
  <div class="card">
    <h2>Digital Clock &amp; Stopwatch</h2>
    <div id="clock" class="out" style="font-size:24px;font-weight:800;text-align:center">--:--:--</div>
    <div id="sw" class="out" style="font-size:22px;font-family:monospace;text-align:center">00:00</div>
    <div class="row" style="justify-content:center">
      <button id="startBtn">Start</button>
      <button id="pauseBtn" class="sec">Pause</button>
      <button id="resetBtn" class="sec">Reset</button>
    </div>
  </div>
  <script>
${project.starterCode}
    const clockEl = document.querySelector('#clock');
    const swEl = document.querySelector('#sw');
    setInterval(() => { clockEl.textContent = new Date().toLocaleTimeString(); }, 500);
    clockEl.textContent = new Date().toLocaleTimeString();
    let elapsed = 0, start = 0, timer = null;
    document.querySelector('#startBtn').addEventListener('click', () => {
      if (timer) return;
      start = Date.now() - elapsed;
      timer = setInterval(() => {
        elapsed = Date.now() - start;
        swEl.textContent = fmt(elapsed);
      }, 100);
    });
    document.querySelector('#pauseBtn').addEventListener('click', () => { clearInterval(timer); timer = null; });
    document.querySelector('#resetBtn').addEventListener('click', () => { clearInterval(timer); timer = null; elapsed = 0; swEl.textContent = '00:00'; });
  </script>
</body>
</html>`,
    4: `${commonHead}
<body>
  <div class="card">
    <h2>JavaScript Quiz App</h2>
    <p id="qText" style="font-weight:700"></p>
    <div id="opts" style="display:flex;flex-direction:column;gap:8px"></div>
    <div id="scoreBox" class="out">Score: 0</div>
  </div>
  <script>
    let current = 0, score = 0, answered = false;
${project.starterCode}
    questions.push({ q: 'Which returns a new array?', options: ['forEach', 'map', 'push', 'splice'], answer: 1 });
    function renderQ() {
      const q = questions[current];
      document.querySelector('#qText').textContent = \`Q\${current + 1}. \${q.q}\`;
      const opts = document.querySelector('#opts');
      opts.replaceChildren(...q.options.map((label, i) => {
        const b = document.createElement('button');
        b.className = 'sec';
        b.textContent = label;
        b.onclick = () => {
          pick(i);
          document.querySelector('#scoreBox').textContent = \`Score: \${score} / \${questions.length}\`;
          if (current < questions.length - 1) { current++; answered = false; setTimeout(renderQ, 400); }
        };
        return b;
      }));
    }
    renderQ();
  </script>
</body>
</html>`,
    5: `${commonHead}
<body>
  <div class="card">
    <h2>Calculator (No eval)</h2>
    <div id="disp" class="out" style="font-size:22px;text-align:right;font-family:monospace">0</div>
    <div id="pad" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px"></div>
  </div>
  <script>
${project.starterCode}
    const keys = ['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'];
    let cur = '', prev = '', op = '';
    const disp = document.querySelector('#disp');
    const pad = document.querySelector('#pad');
    keys.forEach(k => {
      const b = document.createElement('button');
      b.className = 'sec';
      b.textContent = k;
      b.dataset.key = k;
      pad.append(b);
    });
    pad.addEventListener('click', e => {
      const k = e.target.dataset?.key;
      if (!k) return;
      if (k === 'C') { cur = ''; prev = ''; op = ''; disp.textContent = '0'; return; }
      if ('+-*/'.includes(k)) { prev = cur || '0'; op = k; cur = ''; return; }
      if (k === '=' && prev && op && cur) {
        const r = compute(prev, cur, op);
        cur = Number.isNaN(r) ? 'Error' : String(r);
        prev = ''; op = ''; disp.textContent = cur; return;
      }
      if (!'+-*/='.includes(k)) { cur += k; disp.textContent = cur; }
    });
  </script>
</body>
</html>`,
    6: `${commonHead}
<body>
  <div class="card">
    <h2>Live API Fetch Explorer</h2>
    <div class="row">
      <button id="loadBtn">Fetch Sample User</button>
    </div>
    <div id="out" class="out">Click "Fetch Sample User" to test fetch + AbortController.</div>
  </div>
  <script>
${project.starterCode}
    document.querySelector('#loadBtn').addEventListener('click', async () => {
      const out = document.querySelector('#out');
      out.textContent = 'Loading...';
      try {
        const user = await load('https://jsonplaceholder.typicode.com/users/1');
        out.textContent = \`\${user.name} (@\${user.username}) — \${user.email}\`;
      } catch (err) {
        out.textContent = 'Fetch failed: ' + err.message;
      }
    });
  </script>
</body>
</html>`,
    7: `${commonHead}
<body>
  <div class="card">
    <h2>Expense Tracker</h2>
    <div class="row">
      <input id="desc" placeholder="Description" />
      <input id="amt" type="number" placeholder="Amount" />
      <select id="type"><option value="income">Income</option><option value="expense">Expense</option></select>
      <button id="addBtn">Add</button>
    </div>
    <div id="summary" class="out">Balance: ₹0</div>
  </div>
  <script>
    const expenses = [
      { type: 'income', amount: 5000 },
      { type: 'expense', amount: 1200 }
    ];
    function renderTotals() {
${project.starterCode}
      document.querySelector('#summary').textContent = \`Income: ₹\${totals.income} | Expense: ₹\${totals.expense} | Balance: ₹\${balance}\`;
    }
    document.querySelector('#addBtn').addEventListener('click', () => {
      const amount = Number(document.querySelector('#amt').value);
      if (amount <= 0) return;
      expenses.push({ type: document.querySelector('#type').value, amount });
      document.querySelector('#amt').value = '';
      renderTotals();
    });
    renderTotals();
  </script>
</body>
</html>`,
    8: `${commonHead}
<body>
  <div class="card">
    <h2>Tic-Tac-Toe</h2>
    <div id="status" class="out">Turn: X</div>
    <div id="board" class="board"></div>
    <button id="resetBtn">Restart Game</button>
  </div>
  <script>
    let board = Array(9).fill(null);
    let turn = 'X';
${project.starterCode}
    const boardEl = document.querySelector('#board');
    const statusEl = document.querySelector('#status');
    function render() {
      boardEl.replaceChildren(...board.map((val, idx) => {
        const btn = document.createElement('button');
        btn.className = 'cell';
        btn.dataset.index = idx;
        btn.textContent = val || '';
        return btn;
      }));
      const w = winner();
      statusEl.textContent = w ? \`Winner: \${w}!\` : board.every(Boolean) ? 'Draw!' : \`Turn: \${turn}\`;
    }
    boardEl.addEventListener('click', e => {
      const i = e.target.dataset?.index;
      if (i === undefined || board[i] || winner()) return;
      board[i] = turn;
      turn = turn === 'X' ? 'O' : 'X';
      render();
    });
    document.querySelector('#resetBtn').addEventListener('click', () => { board = Array(9).fill(null); turn = 'X'; render(); });
    render();
  </script>
</body>
</html>`,
    9: `${commonHead}
<body>
  <div class="card">
    <h2>Image Slider / Carousel</h2>
    <div style="overflow:hidden;border-radius:8px;border:1px solid #334155">
      <div id="track" style="display:flex;transition:transform 0.3s ease">
        <div class="slide" style="min-width:100%;padding:32px;text-align:center;background:#082f49;box-sizing:border-box">Slide 1: ES6+ Foundations</div>
        <div class="slide" style="min-width:100%;padding:32px;text-align:center;background:#1e1b4b;box-sizing:border-box">Slide 2: DOM &amp; Events</div>
        <div class="slide" style="min-width:100%;padding:32px;text-align:center;background:#064e3b;box-sizing:border-box">Slide 3: Async JavaScript</div>
      </div>
    </div>
    <div class="row" style="justify-content:space-between;margin-top:12px">
      <button id="prev">← Prev</button>
      <button id="next">Next →</button>
    </div>
  </div>
  <script>
    let index = 0;
    const track = document.querySelector('#track');
    const slides = document.querySelectorAll('.slide');
${project.starterCode}
    document.querySelector('#prev').addEventListener('click', () => go(index - 1));
    document.querySelector('#next').addEventListener('click', () => go(index + 1));
  </script>
</body>
</html>`,
    10: `${commonHead}
<body>
  <div class="card">
    <h2>Password Generator &amp; Strength Meter</h2>
    <div class="row">
      <label>Length: <span id="lenVal">12</span></label>
      <input id="len" type="range" min="6" max="24" value="12" />
    </div>
    <div class="row">
      <button id="genBtn">Generate Password</button>
    </div>
    <div id="pwOut" class="out" style="font-family:monospace;font-weight:700">Click Generate</div>
  </div>
  <script>
    const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
${project.starterCode}
    const lenEl = document.querySelector('#len');
    const renderPw = () => {
      const len = Number(lenEl.value);
      document.querySelector('#lenVal').textContent = len;
      const pw = gen(len, POOL);
      const strength = len >= 14 ? 'Strong' : len >= 10 ? 'Medium' : 'Weak';
      document.querySelector('#pwOut').textContent = \`\${pw} (\${strength})\`;
    };
    lenEl.addEventListener('input', renderPw);
    document.querySelector('#genBtn').addEventListener('click', renderPw);
    renderPw();
  </script>
</body>
</html>`,
    11: `${commonHead}
<body>
  <div class="card">
    <h2>Debounced Book Search (AbortController)</h2>
    <input id="searchBox" placeholder="Type book title (e.g. javascript)..." />
    <ul id="results" style="list-style:none;padding:0;margin:10px 0 0 0"></ul>
  </div>
  <script>
    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    function render(docs = []) {
      document.querySelector('#results').replaceChildren(...docs.slice(0, 4).map(d => {
        const li = document.createElement('li');
        li.textContent = d.title || 'Untitled';
        return li;
      }));
    }
${project.starterCode}
    document.querySelector('#searchBox').addEventListener('input', e => {
      const q = e.target.value.trim();
      if (q.length >= 2) search(q);
    });
  </script>
</body>
</html>`
  };

  return templates[project.id] || templates[1];
}

const topicsDeep1 = require('./data/topics_deep_curriculum');
const topicsDeep2 = require('./data/topics_deep_curriculum_2');
const tasksMetadata = require('./data/tasks_metadata');
const projectScaffolds = require('./data/projects_guided_scaffolds');

function createInteractiveStepsForLesson(
  item,
  { meta, topicsPartA, taskSolutions, projectsPartB, c1Theory, c2Coding, c3Output, mcqsPartD, prettyJS, isExecutableJS }
) {
  const title = item.title;
  const steps = [];
  let stepNum = 1;
  const push = obj => {
    steps.push({ id: `${item.week}-${stepNum}`, stepNumber: stepNum++, ...obj });
  };

  // 1. Course Overview & 12-Week Plan
  if (title.startsWith('0. Course Overview')) {
    push({
      kind: 'overview',
      badge: 'Module 1/3 • Blueprint',
      title: 'Welcome to JavaScript Mastery Workbook',
      keywords: ['16 Topics', '96 Tasks', '12 Projects', '593 Q&As', '150 MCQs'],
      summary: 'Complete 12-week interactive roadmap taking you from basics to DSA & Node.js.',
      sections: [
        {
          heading: 'Workbook Modules',
          points: [
            'Core Roadmap → 16 ordered topics from Variables to Async JS, Node & DSA',
            'Guided Practice → 96 step-by-step tasks with progressive hints & solutions',
            'Real Web Projects → 12 browser & Node apps with live Web Preview',
            'Interview Prep → 593 Q&As (Theory, Coding, Output) + 150 interactive MCQs'
          ]
        }
      ],
      starterCode:
        `// Run your first JavaScript snippet in the Right Console!\n` +
        `const roadmap = {\n  topics: 16,\n  tasks: 96,\n  projects: 12,\n  interviewQAs: 593,\n  mcqs: 150\n};\n` +
        `console.log('Smart Learn JS Ready!');\nconsole.table(roadmap);`,
      runMode: 'javascript',
      analysisFocus: 'Course overview and JS runtime initialization check'
    });

    push({
      kind: 'concept',
      badge: 'Module 2/3 • Study Method',
      title: 'Workbook Study Method & Curriculum Alignment',
      keywords: ['Active Coding', 'No Copy-Paste', '3-Step Hints', 'Node.js 22'],
      summary: 'Follow a read -> code live -> solve -> verify loop for every topic.',
      definition: 'Every lesson pairs deep concept cards with live multi-example sandboxes, 6 progressive TODO tasks, and automated input -> expected checks verified on Node.js 22.',
      syntax: 'Read Concept -> Load Example in IDE -> Solve TODO Steps -> Verify Test Cases',
      examples: [
        {
          title: 'Example 1: Active Verification Pattern with console.assert()',
          code: `function practiceStep(concept) {\n  return \`Read -> Code Live -> Solve Task -> Verify (\${concept})\`;\n}\nconst msg = practiceStep('Closures');\nconsole.log(msg);\nconsole.assert(msg.includes('Closures'), 'Expected concept name');`,
          explanation: 'Per MDN, `console.assert(condition, message)` evaluates silently when truthy (`msg.includes(\'Closures\') === true`) and logs an assertion failure only when invariants break — ideal for fast self-tests.'
        }
      ],
      testCases: [
        { label: 'Active loop output', input: "practiceStep('Closures')", expected: '"Read -> Code Live -> Solve Task -> Verify (Closures)"' },
        { label: 'Assertion verification', input: 'console.assert(condition, msg)', expected: 'Passes silently when invariant holds' }
      ],
      sections: [
        { heading: 'Study Rules', points: meta.howToUse },
        { heading: 'Curriculum Alignment', points: meta.researchNotes }
      ],
      runMode: 'javascript',
      starterCode:
        `// Active Practice Loop Demo\nfunction practiceStep(concept) {\n` +
        `  return \`Read -> Code Live -> Solve Task -> Check Edge Case (\${concept})\`;\n}\n` +
        `console.log(practiceStep('Closures'));`
    });

    push({
      kind: 'overview',
      badge: 'Module 3/3 • 12-Week Plan',
      title: '12-Week Study Plan (1.5–2 Hours Daily)',
      keywords: ['12 Weeks', 'Weekly Targets', 'Milestones', 'Portfolio'],
      summary: 'Weeks 1–12 in the left Syllabus follow this exact structured order.',
      tableRows: meta.studyPlan.map(w => ({
        col1: `Week ${w.week}`,
        col2: w.focus,
        col3: w.output
      })),
      runMode: 'none'
    });
    return steps;
  }

  // 2. Appendix & Final Checklist
  if (title.startsWith('Appendix:')) {
    push({
      kind: 'checklist',
      badge: 'Final Gate 1/3 • Checklist',
      title: 'Pre-Interview 7-Point Readiness Checklist',
      keywords: ['Closures', 'Event Loop', 'Async/Await', 'DSA', 'DevTools'],
      summary: 'Verify you can implement all 7 core skills from scratch before interviews.',
      sections: [
        {
          heading: '7 Verification Gates',
          points: meta.checklist.map((itemText, idx) => `Gate ${idx + 1} → ${itemText}`)
        }
      ],
      runMode: 'javascript',
      starterCode:
        `// Quick Self-Test: Debounce Utility\nconst debounce = (fn, ms = 300) => {\n  let t;\n  return (...args) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...args), ms);\n  };\n};\nconst log = debounce(msg => console.log('Debounced:', msg), 50);\nlog('first');\nlog('second');`
    });

    push({
      kind: 'overview',
      badge: 'Final Gate 2/3 • Resources',
      title: 'Curated Free Practice Platforms & Docs',
      keywords: ['MDN', 'javascript.info', 'freeCodeCamp', 'Odin Project', 'LeetCode'],
      summary: 'Recommended external references for daily documentation and DSA drills.',
      sections: [
        {
          heading: 'Recommended Free Platforms',
          points: meta.freeResources.map(r => `${r.name} → ${r.desc} (${r.url})`)
        }
      ],
      runMode: 'none'
    });

    push({
      kind: 'overview',
      badge: 'Final Gate 3/3 • 150 MCQ Key',
      title: 'Part D: Complete MCQ Answer Key & Explanations (1–150)',
      keywords: ['150 MCQs', 'Answer Key', 'Explanations', 'Self-Test'],
      summary: 'Take the quiz in the Course MCQs tab, then review all 150 answer keys below.',
      tableRows: mcqsPartD.map(m => ({
        col1: `Q${m.num} (${m.correct_option})`,
        col2: m.category,
        col3: m.explanation || '-'
      })),
      runMode: 'none'
    });
    return steps;
  }

  // 3. Part A Topics (1..16) -> Deep Micro-Concepts + Core Lab + 6 Guided Tasks
  const topicMatch = title.match(/^(\d{1,2})\.\s/);
  if (topicMatch) {
    const topicId = Number(topicMatch[1]);
    const topic = topicsPartA.find(t => t.id === topicId);
    if (topic) {
      const isDomTopic = topicId === 11 || topicId === 12;
      const taskRunMode = isDomTopic ? 'html_preview' : 'javascript';
      const deepConcepts = topicsDeep1[topicId] || topicsDeep2[topicId] || [];

      deepConcepts.forEach((concept, idx) => {
        const conceptRunMode =
          typeof concept.starterCode === 'string' && concept.starterCode.includes('<html')
            ? 'html_preview'
            : 'javascript';

        push({
          kind: 'concept',
          badge: `Concept ${idx + 1}/${deepConcepts.length}`,
          title: concept.title,
          keywords: concept.keywords,
          summary: concept.definition,
          definition: concept.definition,
          syntax: concept.syntax,
          examples: concept.examples,
          keyPoints: concept.keyPoints,
          testCases: concept.testCases,
          starterCode: concept.starterCode,
          runMode: conceptRunMode,
          analysisFocus: `Topic ${topicId} (${topic.title}) — ${concept.title}`
        });
      });

      const coreStarter =
        isDomTopic && !topic.codeExample.includes('<html')
          ? `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 18px; background: #0f172a; color: #f8fafc; }\n    .box { max-width: 420px; background: #1e293b; border: 1px solid #334155; padding: 16px; border-radius: 10px; }\n    li { padding: 6px 10px; margin-top: 6px; background: #0f172a; border-radius: 6px; }\n    .done { text-decoration: line-through; opacity: 0.6; }\n  </style>\n</head>\n<body>\n  <div id="app" class="box">\n    <h3 style="margin-top:0">Topic ${topic.id} Sandbox</h3>\n    <ul id="list" style="list-style:none;padding:0">\n      <li class="item">Sample existing task (click me)</li>\n    </ul>\n  </div>\n  <script>\n${topic.codeExample}\n  </script>\n</body>\n</html>`
          : prettyJS(topic.codeExample);

      const coreKeywords = Array.from(
        new Set(deepConcepts.flatMap(c => (Array.isArray(c.keywords) ? c.keywords : [])))
      ).slice(0, 6);

      const coreExplanations = {
        1: '`const` locks `name` against reassignment while `let` allows updating `score` (`+= 5`), and template literals interpolate JS expressions dynamically via `${...}`.',
        2: '`+` performs string concatenation when either operand is a string (`\'53\'`), `-` coerces strings numerically via `ToNumber()` (`2`), and `??` keeps `0` whereas `||` overwrites all falsy values with `\'d\'`.',
        3: '`if (i % 2 === 0) continue` short-circuits even iterations directly to `i++`, printing strictly odd numbers `1`, `3`, and `5`.',
        4: 'Default parameter `(b = 0)` applies only when `b` is omitted or `undefined`, while rest syntax `(...n)` gathers extra trailing numbers into a genuine Array supporting `.reduce()`.',
        5: '`inc` and `get` share a private lexical closure over `let c = 0` inside `makeCounter()`, preserving updated state (`2`) after `makeCounter()` finishes.',
        6: 'Spreading `[...nums]` avoids in-place `.sort()` mutation, while comparator `(a, b) => a - b` ensures numeric order alongside non-mutating `.map()`, `.filter()`, and `.reduce()`.',
        7: 'Strings are immutable, so chaining `.split(\' \').map(w => w[0]).join(\'\')` yields initials `\'HJW\'` cleanly, while `RegExp.prototype.test()` checks patterns as a fast boolean.',
        8: 'Nested destructuring extracts `city` directly, optional chaining `user?.phone?.number` safely returns `undefined` instead of `TypeError`, and `JSON.stringify()` omits `undefined` keys.',
        9: 'ES Modules run in isolated strict scope: named exports (`{ add }`) and the single `default` export (`greet`) are statically linked by `import` declarations for tree-shaking.',
        10: 'Private field `#sound` stays strictly encapsulated inside `Animal`; subclass `Dog` initializes parent state via `super(n, \'woof\')` first and inherits `.speak()` on its prototype chain.',
        11: 'Using `document.createElement` + `li.textContent` writes plain characters rather than parsing HTML (preventing DOM XSS), `classList.add` adds tokens safely, and `.append()` attaches nodes cleanly.',
        12: 'Event bubbling propagates clicks up to `#list`, letting one parent listener resolve the clicked `<li>` cleanly via `e.target.closest(\'li\')` even if nested elements were clicked.',
        13: 'Per MDN Fetch API specs, `fetch()` only rejects on network failures — HTTP `404`/`500` resolves with `r.ok === false`, so checking `if (!r.ok) throw` routes HTTP errors into `catch` reliably.',
        14: 'Extending `Error` preserves stack traces and `instanceof` checks while `this.name = \'ValidationError\'` identifies domain failures cleanly inside `catch` blocks.',
        15: 'Node\'s `node:http` `createServer` handles incoming requests asynchronously on the event loop, setting explicit `Content-Type: application/json` headers and ending responses with JSON strings.',
        16: 'Binary search halves the sorted interval `[l, r]` per iteration using signed bitwise midpoint `(l + r) >> 1`, achieving `O(log n)` time and `O(1)` extra space.'
      };

      push({
        kind: 'code_lab',
        badge: 'Workbook Core Lab',
        title: `${topic.id}. ${topic.title} — Integrated Code Lab`,
        keywords: coreKeywords.length ? coreKeywords : [`Topic ${topic.id}`, 'Core Lab'],
        summary: `Consolidated runnable walkthrough combining core techniques from ${topic.title}.`,
        definition: `Run and modify this unified ${topic.title} sandbox to see how multiple concepts fit together in practice.`,
        examples: [
          {
            title: `Complete Topic ${topic.id} Walkthrough`,
            language: isDomTopic ? 'html' : 'javascript',
            code: coreStarter,
            explanation: coreExplanations[topic.id] || `Walkthrough combining core primitives and patterns from ${topic.title}.`
          }
        ],
        keyPoints: Array.isArray(topic.kyaSeekhnaHai) ? topic.kyaSeekhnaHai.slice(0, 5) : undefined,
        starterCode: coreStarter,
        runMode: taskRunMode,
        analysisFocus: `Explain Topic ${topic.id} Core Code Example line by line`
      });

      topic.tasks.forEach((task, tIdx) => {
        const sol = prettyJS(taskSolutions[task.id] || '');
        const tMeta = tasksMetadata[task.id] || {};
        const todoComments = (task.steps || [])
          .map(st => `// TODO (Step ${st.step}): ${st.text}`)
          .join('\n');
        const starter = isDomTopic
          ? `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 18px; background: #0f172a; color: #f8fafc; }\n    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; }\n  </style>\n</head>\n<body>\n  <h2 id="title">Task ${task.id}</h2>\n  <div id="app">\n    <button id="toggleBtn">Run Action</button>\n    <ul id="list"></ul>\n  </div>\n  <script>\n    // Task ${task.id}: ${task.title}\n${todoComments
              .split('\n')
              .map(line => '    ' + line)
              .join('\n')}\n  </script>\n</body>\n</html>`
          : `// Task ${task.id}: ${task.title}\n${todoComments}\n\n`;

        push({
          kind: 'task',
          badge: `Practice Task ${task.id} (${tIdx + 1}/6)`,
          title: `Task ${task.id}: ${task.title}`,
          keywords: Array.isArray(tMeta.keywords) && tMeta.keywords.length ? tMeta.keywords : [`Task ${task.id}`],
          summary: task.title,
          definition: task.title,
          syntax: tMeta.syntax,
          testCases: tMeta.testCases,
          hints: task.steps,
          starterCode: starter,
          solutionCode: sol,
          runMode: taskRunMode,
          analysisFocus: `Task ${task.id}: ${task.title}`
        });
      });

      if (item.assignment) {
        push({
          kind: 'assignment',
          badge: 'Milestone Assignment',
          title: item.assignment.title,
          keywords: [`+${item.assignment.xp_reward} XP`, 'Submission', 'Code Review'],
          summary: item.assignment.description,
          sections: [
            {
              heading: 'Submission Checklist',
              points: [
                `Reward → +${item.assignment.xp_reward} XP upon approval`,
                'Verify → Test all required tasks cleanly before submitting below'
              ]
            }
          ],
          runMode: 'none'
        });
      }
      return steps;
    }
  }

  // 4. Part B Guided Projects (P1..P12) -> Blueprint + Incremental TODO Milestones
  const projMatch = title.match(/^P(\d{1,2}):\s/);
  if (projMatch) {
    const pid = Number(projMatch[1]);
    const project = projectsPartB.find(p => p.id === pid);
    if (project) {
      const isRestApi = pid === 12;
      const runMode = isRestApi ? 'javascript' : 'html_preview';
      const scaffold = projectScaffolds[pid];

      if (scaffold) {
        push({
          kind: 'project_overview',
          badge: `Project ${pid}/12 • Blueprint`,
          title: `Project ${pid}: ${project.title}`,
          keywords: scaffold.overview.keywords,
          summary: scaffold.overview.definition,
          definition: scaffold.overview.definition,
          syntax: scaffold.overview.syntax,
          sections: [
            {
              heading: 'Build Architecture',
              points: scaffold.overview.architecture
            }
          ],
          testCases: scaffold.overview.testCases,
          starterCode: scaffold.overview.starterCode,
          runMode,
          analysisFocus: `Project ${pid} Architecture & Starter Setup: ${project.title}`
        });

        scaffold.milestones.forEach((m, mIdx) => {
          push({
            kind: 'project_milestone',
            badge: `Build Milestone ${mIdx + 1}/${scaffold.milestones.length}`,
            title: m.title,
            keywords: m.keywords,
            summary: m.definition,
            definition: m.definition,
            syntax: m.syntax,
            sections: m.sections,
            testCases: m.testCases,
            hints: m.hints,
            starterCode: m.starterCode,
            solutionCode: m.solutionCode,
            runMode,
            analysisFocus: `Project ${pid} Milestone ${mIdx + 1}: ${m.title}`
          });
        });
      } else {
        const fallbackStarter = isRestApi ? prettyJS(project.starterCode) : buildHtmlProjectStarter(project);
        push({
          kind: 'project_overview',
          badge: `Project ${pid}/12 • Blueprint`,
          title: `Project ${pid}: ${project.title}`,
          keywords: project.skills.slice(0, 6),
          summary: `Level: ${project.level}`,
          starterCode: fallbackStarter,
          runMode,
          analysisFocus: `Project ${pid}: ${project.title}`
        });
      }

      if (item.assignment) {
        push({
          kind: 'assignment',
          badge: 'Project Submission',
          title: item.assignment.title,
          keywords: [`+${item.assignment.xp_reward} XP`, 'GitHub Repo', 'Live Demo'],
          summary: item.assignment.description,
          sections: [
            {
              heading: 'Submission Requirements',
              points: [
                `Reward → +${item.assignment.xp_reward} XP`,
                'Submit → Paste verified code or GitHub/Deploy URL below'
              ]
            }
          ],
          runMode: 'none'
        });
      }
      return steps;
    }
  }

  // 5. Part C1 Interview Theory (10-question active-recall decks)
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
      const cats = Array.from(new Set(deck.map(d => d.category)));
      push({
        kind: 'interview_theory',
        badge: `Theory Deck ${dNum}/${totalDecks}`,
        title: `${deck[0].id}–${deck[deck.length - 1].id}: ${cats.join(' • ')}`,
        keywords: [...cats, `${deck.length} Questions`, 'Active Recall'],
        summary: 'Answer each question aloud before revealing the verified answer; test ideas in the Right IDE.',
        qaItems: deck.map(q => ({ id: q.id, question: q.question, answer: q.answer })),
        starterCode: `// Quick Scratchpad for ${deck[0].id}–${deck[deck.length - 1].id}\nconsole.log('Test any interview concept live!');`,
        runMode: 'javascript',
        analysisFocus: `Interview Theory ${deck[0].id}-${deck[deck.length - 1].id} (${cats.join(', ')})`
      });
    }
    return steps;
  }

  // 6. Part C2 Interview Coding (8-problem coding sets)
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
      const firstRunnable = deck.find(q => isExecutableJS(q.solution));
      push({
        kind: 'interview_coding',
        badge: `Coding Set ${dNum}/${totalDecks}`,
        title: `Coding Problems ${deck[0].id}–${deck[deck.length - 1].id}`,
        keywords: [`${deck.length} Problems`, 'Scratch Coding', 'Node.js 22 Verified'],
        summary: 'Write your solution first in the Right IDE, then click Answer or Load IDE to verify & benchmark.',
        qaItems: deck.map(q => {
          const runnable = isExecutableJS(q.solution);
          return runnable
            ? { id: q.id, question: q.prompt, code: prettyJS(q.solution) }
            : { id: q.id, question: q.prompt, answer: q.solution };
        }),
        starterCode:
          (firstRunnable ? prettyJS(firstRunnable.solution) : '// Solve the coding problems on the left!') +
          `\n\n// Add a sample call below & click Run Code!`,
        runMode: 'javascript',
        analysisFocus: `Interview Coding Problems ${deck[0].id}-${deck[deck.length - 1].id}`
      });
    }
    return steps;
  }

  // 7. Part C3 Output Prediction (Q542-Q593) -> Interactive 6-Snippet Verification Labs
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
        keywords: ['Output Prediction', 'Coercion', 'Event Loop', 'Node.js 22'],
        summary: 'Predict each snippet output mentally before clicking Load IDE or Answer to inspect explanation.',
        qaItems: deck.map(q => ({
          id: q.id,
          question: q.prompt,
          code: prettyJS(q.code) || q.code,
          answer: q.answer,
          explanation: q.explanation
        })),
        starterCode: prettyJS(deck[0].code) || deck[0].code,
        runMode: 'javascript',
        analysisFocus: `Output Prediction Set ${deck[0].id}-${deck[deck.length - 1].id}`
      });
    }
    return steps;
  }

  return steps;
}

module.exports = { createInteractiveStepsForLesson };
