// Topics 9 to 16: Modern JS, OOP, DOM, Events, Async, Error Handling, Node.js, DSA (with MDN/spec explanations)

module.exports = {
  9: [
    {
      title: 'Destructuring Parameters & Rest / Spread Patterns',
      keywords: ['Named Params', 'Default = {}', 'Spread ...', 'Rest ...'],
      definition: 'Destructure option objects directly inside function parameter lists with safe `= {}` fallback so callers never hit undefined property crashes.',
      syntax: `function init({ host = 'localhost', port = 3000 } = {}) {\n  return \`http://\${host}:\${port}\`;\n}`,
      examples: [
        {
          title: 'Example 1: Safe Named Config Objects',
          code: `function fetchPage({ url, method = 'GET', retries = 2 } = {}) {\n  return { url, method, retries };\n}\nconsole.log(fetchPage({ url: '/api/users' }));\nconsole.log(fetchPage()); // Still works cleanly!`,
          explanation: 'Providing `= {}` as default parameter prevents `TypeError: Cannot destructure property of undefined` when `fetchPage()` is called without arguments, allowing each destructured field default (`method`, `retries`) to evaluate cleanly.'
        }
      ],
      testCases: [
        { label: 'Missing options object', input: 'fetchPage()', expected: 'Uses default {} instead of TypeError' }
      ],
      starterCode: `function connect({ host = '127.0.0.1', port = 5432 } = {}) {\n  console.log(\`postgres://\${host}:\${port}\`);\n}\nconnect({ port: 3000 });\nconnect();`
    },
    {
      title: 'ES Modules: Named vs Default Exports & Dynamic import()',
      keywords: ['export / import', 'Named Export', 'Default Export', 'Dynamic import()'],
      definition: 'ES Modules isolate each file in its own strict scope. Static `import` enables bundler tree-shaking; dynamic `import(path)` returns a Promise for lazy code-splitting.',
      syntax: `export const add = (a, b) => a + b;      // named export\nexport default function main() {}        // single default export\nconst mod = await import('./heavy.js');  // lazy dynamic load`,
      examples: [
        {
          title: 'Example 1: Named + Default Import Contract',
          code: `// utils.js\nexport const clamp = (n, min, max) => Math.min(max, Math.max(min, n));\nexport default function greet(u) { return \`Hi \${u}\`; }\n\n// app.js\nimport greet, { clamp } from './utils.js';`,
          explanation: 'Each ES module runs strictly scoped once per module graph: static `import` statements link named exports (`{ clamp }`) and at most one `default` export (`greet`) at parse time, allowing bundlers like Vite to tree-shake unused exports.'
        }
      ],
      testCases: [
        { label: 'Dynamic import return', input: "typeof import('./x.js')", expected: 'Returns a Promise resolving to module exports' }
      ],
      starterCode: `const mathMod = {\n  add: (a, b) => a + b,\n  clamp: (n, min, max) => Math.min(max, Math.max(min, n))\n};\nconsole.log('clamp(150, 0, 100):', mathMod.clamp(150, 0, 100));`
    },
    {
      title: 'Iterators, Generators (function*) & ES2025 Lazy Helpers',
      keywords: ['function*', 'yield', 'next()', 'Lazy Sequence', 'ES2025'],
      definition: 'Generator functions (`function*`) pause and yield values on demand via `{ value, done }`, enabling infinite ID streams and lazy memory-light pipelines.',
      syntax: `function* gen() {\n  yield 1;\n  yield 2;\n}\nconst it = gen(); it.next(); // { value: 1, done: false }`,
      examples: [
        {
          title: 'Example 1: Infinite Sequence Generator with Early Stop',
          code: `function* idGen(prefix = 'USR') {\n  let id = 1;\n  while (true) yield \`\${prefix}_\${id++}\`;\n}\nconst g = idGen();\nconsole.log(g.next().value, g.next().value, g.next().value);`,
          explanation: 'Calling a `function*` returns a suspended Generator object instead of executing its body; execution pauses at every `yield` and resumes only when `.next()` is called, so `while (true)` produces infinite IDs safely in `O(1)` memory.'
        }
      ],
      testCases: [
        { label: 'Bounded finite spread', input: '[...range(1, 4)]', expected: '[1, 2, 3, 4]' }
      ],
      starterCode: `function* range(start, end) {\n  for (let i = start; i <= end; i++) yield i;\n}\nconsole.log([...range(1, 5)]);`
    },
    {
      title: 'Symbols, WeakMap Metadata & Modern ES Highlights',
      keywords: ['Symbol', 'WeakMap', 'WeakSet', 'Memory Safe'],
      definition: '`WeakMap` binds private metadata to object keys weakly so garbage collection reclaims unused keys automatically without memory leaks.',
      syntax: `const secret = new WeakMap();\nsecret.set(userObj, { token: 'abc' });`,
      examples: [
        {
          title: 'Example 1: Attaching Private Object Metadata Without Memory Leaks',
          code: `const meta = new WeakMap();\nlet obj = { id: 1 };\nmeta.set(obj, { clicks: 5 });\nconsole.log('Clicks:', meta.get(obj).clicks);\nobj = null; // WeakMap entry can now be garbage collected!`,
          explanation: 'Per MDN, `WeakMap` holds weak references to object keys: once `obj = null` removes all strong references, both the key and its associated entry become eligible for automatic garbage collection (which is why `WeakMap` is intentionally non-enumerable and lacks `.size`).'
        }
      ],
      testCases: [
        { label: 'WeakMap primitive key guard', input: 'new WeakMap().set("str", 1)', expected: 'Throws TypeError (keys must be objects/registered symbols)' }
      ],
      starterCode: `const cache = new WeakMap();\nconst user = { name: 'Dev' };\ncache.set(user, { role: 'Admin' });\nconsole.log(cache.get(user));`
    }
  ],

  10: [
    {
      title: 'Prototypes & The [[Prototype]] Lookup Chain',
      keywords: ['Prototype Chain', 'Object.getPrototypeOf()', '[[Prototype]]', 'null'],
      definition: 'Every JS object delegates missing property lookups up its hidden `[[Prototype]]` chain until resolved or hitting `null` at the root.',
      syntax: `Object.getPrototypeOf(instance) === Constructor.prototype`,
      examples: [
        {
          title: 'Example 1: Walking the Prototype Chain Up to null',
          code: `const arr = [1, 2];\nlet p = Object.getPrototypeOf(arr);\nconsole.log('1st proto === Array.prototype:', p === Array.prototype);\np = Object.getPrototypeOf(p);\nconsole.log('2nd proto === Object.prototype:', p === Object.prototype);\nconsole.log('End of chain:', Object.getPrototypeOf(p));`,
          explanation: 'When reading a missing property on `arr`, JS traverses `[[Prototype]]` links via `Array.prototype` (giving `.map`/`.push`) -> `Object.prototype` (giving `.toString`) until `Object.getPrototypeOf(Object.prototype)` terminates cleanly at `null`.'
        }
      ],
      testCases: [
        { label: 'Root prototype end', input: 'Object.getPrototypeOf(Object.prototype)', expected: 'null' }
      ],
      starterCode: `const list = [10, 20];\nconsole.log(Object.getPrototypeOf(list) === Array.prototype);\nconsole.log(Object.getPrototypeOf(Object.prototype));`
    },
    {
      title: 'ES6 Classes: constructor, Getters/Setters & static',
      keywords: ['class', 'constructor', 'get / set', 'static'],
      definition: 'Classes provide clean syntax over prototypes: `constructor` initializes fields, `get`/`set` compute properties dynamically, and `static` binds utilities directly to the class.',
      syntax: `class Name {\n  constructor(x) { this.x = x; }\n  get value() { return this.x; }\n  static create() { return new Name(0); }\n}`,
      examples: [
        {
          title: 'Example 1: Computed Getter + Static Factory',
          code: `class Rectangle {\n  constructor(w, h) { this.w = w; this.h = h; }\n  get area() { return this.w * this.h; }\n  static square(s) { return new Rectangle(s, s); }\n}\nconsole.log('Area:', Rectangle.square(5).area);`,
          explanation: '`static square()` attaches to the `Rectangle` constructor function itself (not `Rectangle.prototype`), acting as a named factory, while `get area()` runs on property access (`instance.area`) without needing parentheses `()`.'
        }
      ],
      testCases: [
        { label: 'Static access on instance', input: 'new Rectangle(2,3).square', expected: 'undefined (static exists on Class only)' }
      ],
      starterCode: `class Temp {\n  constructor(c) { this.c = c; }\n  get fahrenheit() { return this.c * 1.8 + 32; }\n}\nconsole.log('25C in F:', new Temp(25).fahrenheit);`
    },
    {
      title: 'Inheritance (extends / super) & Private Fields (#x)',
      keywords: ['extends', 'super()', 'Override', '#privateField'],
      definition: 'Subclasses inherit parent methods via `extends` and must call `super()` before touching `this`. Private fields (`#balance`) enforce true runtime encapsulation.',
      syntax: `class Child extends Parent {\n  #secret;\n  constructor(v) { super(v); this.#secret = v; }\n}`,
      examples: [
        {
          title: 'Example 1: Private #balance Field Guard',
          code: `class Wallet {\n  #balance = 0;\n  constructor(init = 0) { this.#balance = init; }\n  deposit(amt) { if (amt > 0) this.#balance += amt; }\n  get balance() { return this.#balance; }\n}\nconst w = new Wallet(100);\nw.deposit(50);\nconsole.log('Balance:', w.balance);`,
          explanation: 'Hash private fields (`#balance`) are enforced by the ECMAScript spec at parse and runtime: they live in an internal slot invisible to `Object.keys()`, subclasses, or external `w.#balance` reads (`SyntaxError`), exposing state strictly through `deposit()` and `get balance()`.'
        }
      ],
      testCases: [
        { label: 'Private external access', input: 'w.#balance outside class', expected: 'Throws SyntaxError' }
      ],
      starterCode: `class Animal {\n  constructor(n) { this.n = n; }\n  speak() { return \`\${this.n} speaks\`; }\n}\nclass Dog extends Animal {\n  speak() { return \`\${this.n} barks!\`; }\n}\nconsole.log(new Dog('Rex').speak());`
    },
    {
      title: 'Composition Over Inheritance (Factories & Mixins)',
      keywords: ['Composition', 'Factory Function', 'Mixin', 'has-a'],
      definition: 'Prefer assembling small behavior objects/functions (`has-a`) rather than rigid deep class hierarchies (`is-a`), eliminating fragile base-class bugs.',
      syntax: `const withLogs = name => ({ log: msg => console.log(\`[\${name}] \${msg}\`) });\nconst worker = { ...state, ...withLogs('Worker') };`,
      examples: [
        {
          title: 'Example 1: Composable Behavior Without `new` or `this` Traps',
          code: `const canSave = key => ({ save: data => console.log('Saved under', key, data) });\nconst userService = Object.assign({ name: 'Users' }, canSave('users_v1'));\nuserService.save({ id: 1 });`,
          explanation: 'Returning plain behavior objects merged via `Object.assign` locks `key` inside a closure (`canSave`), eliminating deep inheritance chains, `new` forgetfulness, and broken `this` context when methods are detached.'
        }
      ],
      testCases: [
        { label: 'Factory avoids new keyword', input: 'createUser() called without new', expected: 'Works without losing this' }
      ],
      starterCode: `const withTimer = () => ({ now: () => new Date().toISOString() });\nconst job = Object.assign({ id: 'sync' }, withTimer());\nconsole.log(job.id, job.now());`
    }
  ],

  11: [
    {
      title: 'Selecting DOM Elements & NodeList vs HTMLCollection',
      keywords: ['querySelector()', 'querySelectorAll()', 'getElementById()', 'Static NodeList'],
      definition: '`querySelector()` selects the first CSS match (`null` if missing); `querySelectorAll()` returns a static `NodeList` supporting `.forEach()` directly.',
      syntax: `const el = document.querySelector('#id .class');\nconst all = document.querySelectorAll('li.item'); // static NodeList`,
      examples: [
        {
          title: 'Example 1: Live Interactive DOM Query & Style Update',
          language: 'html',
          code: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <h2 id="heading">DOM Query Demo</h2>\n  <button id="btn">Highlight All Items</button>\n  <ul><li class="row">Alpha</li><li class="row">Beta</li></ul>\n  <script>\n    document.querySelector('#btn').addEventListener('click', () => {\n      document.querySelectorAll('.row').forEach((li, i) => {\n        li.style.color = '#38bdf8';\n        li.textContent = \`Item #\${i + 1}: \${li.textContent}\`;\n      });\n    });\n  </script>\n</body></html>`,
          explanation: '`querySelectorAll(\'.row\')` returns a *static* `NodeList` (snapshot unaffected by later DOM edits) that implements `.forEach()` directly, unlike legacy live `HTMLCollection` objects from `getElementsByClassName`.'
        }
      ],
      testCases: [
        { label: 'Missing selector guard', input: "document.querySelector('#none')", expected: 'Returns null (use optional chaining ?. before accessing props)' }
      ],
      starterCode: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <h3 id="title">Selecting DOM Elements</h3>\n  <button id="btn">Change Color</button>\n  <script>\n    document.querySelector('#btn').addEventListener('click', () => {\n      const t = document.querySelector('#title');\n      t.textContent = 'Updated via querySelector!';\n      t.style.color = '#34d399';\n    });\n  </script>\n</body></html>`
    },
    {
      title: 'Safe Node Creation, XSS Prevention & DocumentFragment',
      keywords: ['createElement()', 'textContent', 'innerHTML XSS', 'DocumentFragment', 'replaceChildren()'],
      definition: 'Always insert user-supplied text via `.textContent` (never `.innerHTML`) to prevent XSS injection; batch multiple appends using `DocumentFragment` + `replaceChildren()`.',
      syntax: `const frag = document.createDocumentFragment();\nitems.forEach(t => {\n  const li = document.createElement('li');\n  li.textContent = t;\n  frag.append(li);\n});\nul.replaceChildren(frag);`,
      examples: [
        {
          title: 'Example 1: Safe Batch List Rendering (No XSS)',
          language: 'html',
          code: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <input id="inp" value="<script>alert(1)</script>" />\n  <button id="add">Render Safely</button>\n  <ul id="list"></ul>\n  <script>\n    document.querySelector('#add').addEventListener('click', () => {\n      const li = document.createElement('li');\n      li.textContent = document.querySelector('#inp').value; // Rendered safely as text!\n      document.querySelector('#list').append(li);\n    });\n  </script>\n</body></html>`,
          explanation: 'Per MDN Security guides, assigning to `.textContent` inserts raw characters inside a DOM `Text` node without running the HTML parser — neutralizing `<script>` and `onerror=` XSS attacks that `.innerHTML` would execute.'
        }
      ],
      testCases: [
        { label: 'textContent script escape', input: 'li.textContent = "<img onerror=alert(1)>"', expected: 'Renders literal angle brackets harmlessly, never executes JS' }
      ],
      starterCode: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <input id="itemInput" placeholder="Add list item..." />\n  <button id="addBtn">Add</button>\n  <ul id="list"></ul>\n  <script>\n    document.querySelector('#addBtn').addEventListener('click', () => {\n      const inp = document.querySelector('#itemInput');\n      if (!inp.value.trim()) return;\n      const li = document.createElement('li');\n      li.textContent = inp.value.trim();\n      document.querySelector('#list').append(li);\n      inp.value = '';\n    });\n  </script>\n</body></html>`
    },
    {
      title: 'classList, dataset Attributes & DOM Tree Traversal',
      keywords: ['classList.toggle()', 'dataset', 'closest()', 'parentElement'],
      definition: 'Control styles cleanly via `classList`, attach metadata via `data-*` (`el.dataset.id`), and traverse ancestors safely using `el.closest(selector)`.',
      syntax: `el.classList.toggle('active');\nel.dataset.userId           // reads data-user-id="..."\ne.target.closest('li')      // nearest matching ancestor`,
      examples: [
        {
          title: 'Example 1: Toggle Classes & Read data-* Attributes',
          language: 'html',
          code: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <style>.active { outline: 2px solid #38bdf8; background: #082f49; padding: 8px; }</style>\n  <div id="card" data-status="draft">Click button to toggle state</div>\n  <button id="tog">Toggle Class</button>\n  <script>\n    document.querySelector('#tog').addEventListener('click', () => {\n      const c = document.querySelector('#card');\n      c.classList.toggle('active');\n      c.dataset.status = c.classList.contains('active') ? 'published' : 'draft';\n      c.textContent = 'Status: ' + c.dataset.status;\n    });\n  </script>\n</body></html>`,
          explanation: '`classList.toggle()` adds/removes one CSS token cleanly without clobbering existing classes (unlike overwriting `className`), while `data-status` syncs automatically with `c.dataset.status` in the DOM attribute map.'
        }
      ],
      testCases: [
        { label: 'CamelCase dataset lookup', input: 'data-task-id="42"', expected: 'el.dataset.taskId === "42"' }
      ],
      starterCode: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <style>.on { border: 2px solid #10b981; padding: 10px; }</style>\n  <div id="box" data-mode="off">Box</div>\n  <button id="btn">Toggle</button>\n  <script>\n    document.querySelector('#btn').addEventListener('click', () => {\n      const box = document.querySelector('#box');\n      box.classList.toggle('on');\n    });\n  </script>\n</body></html>`
    }
  ],

  12: [
    {
      title: 'addEventListener, Event Object & Bubbling vs Capturing',
      keywords: ['addEventListener()', 'target vs currentTarget', 'Bubbling', 'Capturing', 'stopPropagation()'],
      definition: 'DOM events travel down in Capturing phase (`{ capture: true }`) and bubble back up from `e.target` (clicked element) to ancestors (`e.currentTarget`).',
      syntax: `el.addEventListener('click', e => {\n  // e.target: clicked inner element\n  // e.currentTarget: element owning listener\n}, { once: true });`,
      examples: [
        {
          title: 'Example 1: Trace Capture -> Target -> Bubble Execution Order',
          language: 'html',
          code: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <div id="outer" style="padding:14px;border:1px solid #38bdf8">\n    Outer <button id="inner">Click Inner</button>\n  </div>\n  <pre id="log"></pre>\n  <script>\n    const log = m => document.querySelector('#log').textContent += m + '\\n';\n    document.querySelector('#outer').addEventListener('click', () => log('1. Outer Capture'), { capture: true });\n    document.querySelector('#inner').addEventListener('click', () => log('2. Inner Target'));\n    document.querySelector('#outer').addEventListener('click', () => log('3. Outer Bubble'));\n  </script>\n</body></html>`,
          explanation: 'Per DOM Events spec, propagation happens in 3 strict phases: Capture travels top-down (`#outer` capture listener fires first), Target executes on `#inner`, then Bubble travels back upward (`#outer` default listener fires last).'
        }
      ],
      testCases: [
        { label: 'Propagation order', input: 'Click #inner inside #outer', expected: 'Logs Capture first, then Target, then Bubble' }
      ],
      starterCode: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <button id="onceBtn">Runs Only Once</button>\n  <p id="out"></p>\n  <script>\n    document.querySelector('#onceBtn').addEventListener('click', () => {\n      document.querySelector('#out').textContent = 'Clicked (listener removed automatically!)';\n    }, { once: true });\n  </script>\n</body></html>`
    },
    {
      title: 'Event Delegation & Dynamic Elements',
      keywords: ['Event Delegation', 'e.target.closest()', 'data-action'],
      definition: 'Attach ONE listener to a parent container and use `e.target.closest(...)` to handle clicks across dozens of existing or dynamically appended children.',
      syntax: `parentList.addEventListener('click', e => {\n  const btn = e.target.closest('button[data-action]');\n  if (!btn) return;\n});`,
      examples: [
        {
          title: 'Example 1: 1 Parent Listener Handling Multiple Action Buttons',
          language: 'html',
          code: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <div id="bar" style="display:flex;gap:8px">\n    <button data-act="Edit">Edit</button>\n    <button data-act="Delete">Delete</button>\n  </div>\n  <p id="msg">Click an action</p>\n  <script>\n    document.querySelector('#bar').addEventListener('click', e => {\n      const btn = e.target.closest('button');\n      if (!btn) return;\n      document.querySelector('#msg').textContent = 'Action: ' + btn.dataset.act;\n    });\n  </script>\n</body></html>`,
          explanation: 'Click events bubble up to parent `#bar`, so a single delegated listener handles every existing or future button (`e.target.closest(\'button\')` also resolves inner icons reliably and returns `null` when clicking empty gaps).'
        }
      ],
      testCases: [
        { label: 'Click gap guard', input: 'Click container padding between buttons', expected: 'e.target.closest("button") returns null cleanly' }
      ],
      starterCode: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <ul id="menu" style="list-style:none;padding:0">\n    <li><button data-item="Alpha">Alpha</button></li>\n    <li><button data-item="Beta">Beta</button></li>\n  </ul>\n  <p id="picked"></p>\n  <script>\n    document.querySelector('#menu').addEventListener('click', e => {\n      const btn = e.target.closest('button');\n      if (btn) document.querySelector('#picked').textContent = 'Picked: ' + btn.dataset.item;\n    });\n  </script>\n</body></html>`
    },
    {
      title: 'Forms (preventDefault), Keyboard Shortcuts & CustomEvent',
      keywords: ['preventDefault()', 'keydown', 'input event', 'CustomEvent'],
      definition: 'Call `e.preventDefault()` on form submits to avoid page reloads, bind global keyboard shortcuts with `keydown`, and decouple widgets via `CustomEvent`.',
      syntax: `form.addEventListener('submit', e => { e.preventDefault(); });\nel.dispatchEvent(new CustomEvent('saved', { bubbles: true, detail }));`,
      examples: [
        {
          title: 'Example 1: Live Validation Form Without Reload',
          language: 'html',
          code: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <form id="f">\n    <input id="email" placeholder="Email..." />\n    <button type="submit">Submit</button>\n  </form>\n  <p id="res"></p>\n  <script>\n    document.querySelector('#f').addEventListener('submit', e => {\n      e.preventDefault();\n      const val = document.querySelector('#email').value.trim();\n      document.querySelector('#res').textContent = val.includes('@') ? 'Valid!' : 'Missing @';\n    });\n  </script>\n</body></html>`,
          explanation: 'HTML `<form>` submission defaults to navigating/reloading the page; calling `e.preventDefault()` cancels the browser navigation action so JS validates `#email` and updates `#res` inline without losing application state.'
        }
      ],
      testCases: [
        { label: 'Prevent reload', input: 'Submit form with valid email', expected: 'Updates #res inline with zero page navigation' }
      ],
      starterCode: `<!DOCTYPE html>\n<html><body style="font-family:sans-serif;padding:16px;background:#0f172a;color:#f8fafc">\n  <form id="f"><input id="txt" required /><button>Save</button></form>\n  <p id="out"></p>\n  <script>\n    document.querySelector('#f').addEventListener('submit', e => {\n      e.preventDefault();\n      document.querySelector('#out').textContent = 'Saved: ' + document.querySelector('#txt').value;\n    });\n  </script>\n</body></html>`
    }
  ],

  13: [
    {
      title: 'The Event Loop: Call Stack, Microtasks & Macrotasks',
      keywords: ['Event Loop', 'Call Stack', 'Microtask Queue', 'Macrotask Queue'],
      definition: 'Synchronous statements empty the Call Stack first -> ALL queued microtasks (`Promise.then`, `queueMicrotask`) drain next -> then ONE macrotask (`setTimeout`, `I/O`) executes per tick.',
      syntax: `// Priority: 1. Sync Code -> 2. Microtasks -> 3. Macrotasks (setTimeout)`,
      examples: [
        {
          title: 'Example 1: Predictable Execution Order (1 -> 4 -> 3 -> 2)',
          code: `console.log('1: Sync');\nsetTimeout(() => console.log('2: Macrotask (setTimeout)'), 0);\nPromise.resolve().then(() => console.log('3: Microtask (Promise)'));\nconsole.log('4: Sync end');`,
          explanation: 'Even with `0ms` delay, `setTimeout` enters the Macrotask queue: synchronous `1` and `4` finish on the Call Stack first, then the Event Loop drains the higher-priority Microtask queue (`3`) before picking macrotask `2`.'
        },
        {
          title: 'Example 2: queueMicrotask Priority Over Timers',
          code: `setTimeout(() => console.log('Timer'), 0);\nqueueMicrotask(() => console.log('Microtask runs BEFORE Timer'));`,
          explanation: 'Per MDN, `queueMicrotask()` schedules a callback onto the Microtask queue right after the active script completes and before yielding control to rendering or macrotask timers like `setTimeout`.'
        }
      ],
      testCases: [
        { label: 'Zero-delay timeout order', input: 'log(1); setTimeout(log(2),0); Promise.then(log(3)); log(4);', expected: '1, 4, 3, 2' }
      ],
      starterCode: `console.log(1);\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);`
    },
    {
      title: 'Promises, Chaining & ES2024 Promise.withResolvers()',
      keywords: ['Promise', 'pending/fulfilled/rejected', 'then/catch/finally', 'Promise.withResolvers()'],
      definition: 'A Promise wraps an eventual async value through 3 states (`pending` -> `fulfilled` or `rejected`). Each `.then()` returns a fresh Promise; `.finally()` runs cleanup unconditionally.',
      syntax: `new Promise((resolve, reject) => { ... })\n  .then(val => transform(val))\n  .catch(err => handle(err))\n  .finally(() => cleanup());`,
      examples: [
        {
          title: 'Example 1: Promise Transformation Chain + Rejection Skip',
          code: `Promise.resolve(5)\n  .then(x => x * 3)\n  .then(x => { if (x > 10) throw new Error('Too big'); return x; })\n  .catch(e => console.log('Caught cleanly:', e.message))\n  .finally(() => console.log('Finally always executes'));`,
          explanation: 'Throwing an `Error` inside any `.then()` rejects that step\'s returned Promise automatically, skipping downstream `.then()` handlers straight to `.catch()`, while `.finally()` executes regardless of fulfillment or rejection.'
        }
      ],
      testCases: [
        { label: 'throw inside .then', input: 'throw inside then()', expected: 'Rejects returned promise & jumps straight to .catch()' }
      ],
      starterCode: `const sleep = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));\nsleep(30, 'Data')\n  .then(d => d.toUpperCase())\n  .then(d => console.log('Resolved:', d));`
    },
    {
      title: 'Promise Combinators: all, allSettled, race & any',
      keywords: ['Promise.all', 'Promise.allSettled', 'Promise.race', 'Promise.any'],
      definition: '`all` fails fast on first error; `allSettled` waits for all fulfilled/rejected outcomes; `race` resolves/rejects with the first settled promise; `any` picks the first fulfilled one.',
      syntax: `await Promise.all([p1, p2])         // fast-fail concurrent\nawait Promise.allSettled([p1, p2])  // [{ status, value/reason }]`,
      examples: [
        {
          title: 'Example 1: Safe Concurrent Batch via Promise.allSettled()',
          code: `Promise.allSettled([\n  Promise.resolve('Profile OK'),\n  Promise.reject(new Error('Stats offline'))\n]).then(res => console.table(res.map(r => ({ status: r.status, detail: r.value || r.reason?.message }))));`,
          explanation: 'Unlike `Promise.all()` (which short-circuits immediately if any promise rejects), `Promise.allSettled()` waits for every input promise to finish and returns an array describing each `{ status, value | reason }` independently.'
        }
      ],
      testCases: [
        { label: 'Promise.all one rejection', input: 'Promise.all([resolve(1), reject("err")])', expected: 'Immediately rejects with "err"' }
      ],
      starterCode: `Promise.allSettled([\n  Promise.resolve(200),\n  Promise.reject('Timeout')\n]).then(res => console.log(res));`
    },
    {
      title: 'async / await, Concurrent Await & fetch() with AbortController',
      keywords: ['async / await', 'fetch()', 'res.ok Check', 'AbortController'],
      definition: 'Always wrap `await` inside `try/catch`, avoid sequential `await` inside loops when calls are independent, check `if (!res.ok)` on `fetch()` (404 resolves!), and cancel stale requests using `AbortController`.',
      syntax: `const ctrl = new AbortController();\nconst res = await fetch(url, { signal: ctrl.signal });\nif (!res.ok) throw new Error(\`HTTP \${res.status}\`);`,
      examples: [
        {
          title: 'Example 1: Parallel async/await + Error Guard Pattern',
          code: `const wait = (ms, val) => new Promise(r => setTimeout(() => r(val), ms));\n(async () => {\n  try {\n    const [a, b] = await Promise.all([wait(40, 'User'), wait(40, 'Posts')]);\n    console.log({ a, b });\n  } catch (err) {\n    console.error('Failed:', err.message);\n  }\n})();`,
          explanation: 'Awaiting independent `wait()` calls sequentially would take `40 + 40 = 80ms`; combining `await Promise.all([...])` runs them concurrently in ~`40ms` while funneling any failure cleanly into the surrounding `try/catch`.'
        }
      ],
      testCases: [
        { label: 'HTTP 404 fetch behavior', input: 'fetch("/missing-route")', expected: 'Resolves with res.ok === false (must throw manually!)' }
      ],
      starterCode: `const delay = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));\n(async () => {\n  const results = await Promise.all([delay(30, 'A'), delay(30, 'B')]);\n  console.log('Parallel:', results);\n})();`
    }
  ],

  14: [
    {
      title: 'try / catch / finally & Custom Error Classes',
      keywords: ['try / catch / finally', 'extends Error', 'instanceof', 'Stack Trace'],
      definition: 'Always throw `Error` subclasses (preserving stack traces and error names) rather than raw strings, inspect types via `instanceof`, and use `finally` for guaranteed cleanup.',
      syntax: `class ValidationError extends Error {\n  constructor(msg) { super(msg); this.name = 'ValidationError'; }\n}`,
      examples: [
        {
          title: 'Example 1: Discriminating Custom Error Subclasses cleanly',
          code: `class ValidationError extends Error {\n  constructor(m) { super(m); this.name = 'ValidationError'; }\n}\nfunction checkAge(age) {\n  if (age < 18) throw new ValidationError('Must be 18+');\n  return true;\n}\ntry {\n  checkAge(15);\n} catch (e) {\n  console.log(e instanceof ValidationError, e.name, '->', e.message);\n} finally {\n  console.log('Finally always cleans up loaders');\n}`,
          explanation: 'Subclassing built-in `Error` preserves stack traces and lets `catch` blocks test `e instanceof ValidationError` accurately, while `finally` executes unconditionally whether `try` succeeds, returns, or throws.'
        }
      ],
      testCases: [
        { label: 'finally execution order', input: 'return inside try + finally block', expected: 'finally runs before returning to caller' }
      ],
      starterCode: `class AuthError extends Error {\n  constructor(m) { super(m); this.name = 'AuthError'; }\n}\ntry {\n  throw new AuthError('Token expired');\n} catch (e) {\n  console.log(e.name + ':', e.message);\n}`
    },
    {
      title: 'Defensive Validation, Safe JSON Parsing & Global Error Listeners',
      keywords: ['safeParse()', 'window.onerror', 'unhandledrejection', 'Breakpoints'],
      definition: 'Guard `JSON.parse()` with `try/catch` fallbacks, validate untrusted inputs at boundaries, and use browser `error`/`unhandledrejection` listeners + DevTools breakpoints for root-cause inspection.',
      syntax: `const safeParse = (s, fb = null) => { try { return JSON.parse(s); } catch { return fb; } };`,
      examples: [
        {
          title: 'Example 1: Resilient Input Validator + Safe JSON Parser',
          code: `function safeParse(str, fallback = {}) {\n  try { return JSON.parse(str); } catch { return fallback; }\n}\nconsole.log('Valid:', safeParse('{"ok":true}'));\nconsole.log('Malformed:', safeParse('{broken', { recovered: true }));`,
          explanation: '`JSON.parse()` throws `SyntaxError` on malformed strings or corrupted storage data; isolating it inside `try/catch` contains the exception and returns a predictable `fallback` shape safely.'
        }
      ],
      testCases: [
        { label: 'Invalid JSON guard', input: 'safeParse("{bad", {})', expected: '{} without crashing' }
      ],
      starterCode: `const safeParse = (s, fb = null) => { try { return JSON.parse(s); } catch { return fb; } };\nconsole.log(safeParse('{"user":"Asha"}'), safeParse('bad-json', { empty: true }));`
    }
  ],

  15: [
    {
      title: 'Node.js Runtime, npm, package.json & CommonJS vs ESM',
      keywords: ['Node.js', 'package.json', 'CommonJS', 'ESM', 'SemVer'],
      definition: 'Node.js executes JS outside browsers using V8 + non-blocking libuv I/O. Manage packages cleanly via `package.json`, lock exact trees with `package-lock.json`, and configure `"type": "module"` for ESM imports.',
      syntax: `// package.json\n{\n  "type": "module",\n  "scripts": { "dev": "node --watch server.js" }\n}`,
      examples: [
        {
          title: 'Example 1: Inspect SemVer & Module Exports Metadata',
          code: `const pkg = { name: 'js-api', version: '1.4.2', type: 'module', scripts: { start: 'node index.js', lint: 'eslint .' } };\nconsole.table(pkg.scripts);\nconsole.log('SemVer Major.Minor.Patch:', pkg.version.split('.'));`,
          explanation: 'Setting `"type": "module"` in `package.json` configures Node.js to parse `.js` files as ES Modules (`import`/`export`), while `MAJOR.MINOR.PATCH` Semantic Versioning encodes breaking, additive, and patch upgrades.'
        }
      ],
      testCases: [
        { label: 'SemVer Breakdown', input: '1.4.2', expected: 'Major=1 (breaking), Minor=4 (feature), Patch=2 (bugfix)' }
      ],
      starterCode: `const scripts = { dev: 'node --watch index.js', test: 'node --test', lint: 'eslint .' };\nconsole.table(scripts);`
    },
    {
      title: 'Node HTTP, fs/promises, Express Middleware & Tooling (Vite)',
      keywords: ['fs/promises', 'node:http', 'Express', 'Middleware', 'Vite'],
      definition: 'Always use async `node:fs/promises` in servers (never `*Sync`), compose Express `(req, res, next)` middlewares cleanly, and bundle client apps with Vite.',
      syntax: `app.use(express.json());\napp.get('/todos', (req, res) => res.json(todos));\napp.post('/todos', (req, res) => res.status(201).json(item));`,
      examples: [
        {
          title: 'Example 1: Simulating HTTP Route Statuses & Validation',
          code: `function handleCreateTodo(body) {\n  if (!body?.text?.trim()) return { status: 400, json: { error: 'text required' } };\n  return { status: 201, json: { id: 1, text: body.text.trim(), done: false } };\n}\nconsole.log('Empty:', handleCreateTodo({}));\nconsole.log('Valid:', handleCreateTodo({ text: 'Learn Express' }));`,
          explanation: 'Guard checks validate required payload fields early (`body?.text?.trim()`), returning HTTP `400 Bad Request` on invalid input and semantic HTTP `201 Created` when constructing a new resource.'
        }
      ],
      testCases: [
        { label: 'Missing payload validation', input: 'POST /todos with {}', expected: 'HTTP 400 Bad Request' },
        { label: 'Created response', input: 'POST /todos with { text: "Hi" }', expected: 'HTTP 201 Created' }
      ],
      starterCode: `function createTodo(body) {\n  if (!body?.text) return { status: 400, error: 'text required' };\n  return { status: 201, data: { id: Date.now(), text: body.text } };\n}\nconsole.log(createTodo({}), createTodo({ text: 'API Lab' }));`
    }
  ],

  16: [
    {
      title: 'Big-O Complexity, Hash Maps & Two Pointers / Sliding Window',
      keywords: ['Big-O', 'O(n) Hash Map', 'Two Pointers', 'Sliding Window'],
      definition: 'Replace O(n²) nested loops with O(n) `Map`/`Set` lookups, Two Pointers on sorted data, and dynamic Sliding Windows over substrings/subarrays.',
      syntax: `const seen = new Map(); // O(1) lookup\n// Sliding window: expand right, shrink left when constraint breaks`,
      examples: [
        {
          title: 'Example 1: O(n) Two Sum with Map & Longest Unique Substring',
          code: `function twoSum(nums, target) {\n  const m = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    if (m.has(target - nums[i])) return [m.get(target - nums[i]), i];\n    m.set(nums[i], i);\n  }\n  return [];\n}\nconsole.log(twoSum([2, 7, 11, 15], 9));`,
          explanation: 'Recording each visited number -> index inside a hash `Map` enables `O(1)` average-time complement lookup (`target - nums[i]`), cutting Two Sum from `O(n^2)` nested loops down to single-pass `O(n)` time.'
        }
      ],
      testCases: [
        { label: 'Two Sum indices', input: '([2, 7, 11, 15], 9)', expected: '[0, 1] in O(n) time' }
      ],
      starterCode: `function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (map.has(need)) return [map.get(need), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}\nconsole.assert(JSON.stringify(twoSum([2, 7, 11, 15], 9)) === '[0,1]');\nconsole.log(twoSum([2, 7, 11, 15], 9));`
    },
    {
      title: 'Binary Search, Stacks & Dynamic Programming / Graph BFS',
      keywords: ['Binary Search', 'Stack LIFO', 'Kadane / DP', 'BFS Queue'],
      definition: 'Binary Search narrows sorted ranges in O(log n), Stacks verify balanced brackets in O(n), DP/Kadane reuses optimal subproblems, and Queue + Visited Set finds shortest unweighted paths via BFS.',
      syntax: `const mid = (l + r) >> 1;            // Binary Search midpoint\nconst stack = []; stack.push(x);       // LIFO Stack\nconst queue = [start]; visited.add(start); // BFS Graph Queue`,
      examples: [
        {
          title: 'Example 1: Valid Parentheses (Stack) & Binary Search',
          code: `function isValid(s) {\n  const st = [], map = { ')': '(', ']': '[', '}': '{' };\n  for (const ch of s) {\n    if ('([{'.includes(ch)) st.push(ch);\n    else if (st.pop() !== map[ch]) return false;\n  }\n  return st.length === 0;\n}\nconsole.log(isValid('({[]})'), isValid('(]'));`,
          explanation: 'A Last-In-First-Out (LIFO) stack matches nested brackets in `O(n)` linear time because the most recently opened bracket on top of `st` must close before any outer bracket (`st.pop() === map[ch]`).'
        }
      ],
      testCases: [
        { label: 'Balanced nested brackets', input: '"({[]})"', expected: 'true' },
        { label: 'Mismatched bracket', input: '"([)]"', expected: 'false' }
      ],
      starterCode: `function binarySearch(a, t) {\n  let l = 0, r = a.length - 1;\n  while (l <= r) {\n    const m = (l + r) >> 1;\n    if (a[m] === t) return m;\n    a[m] < t ? (l = m + 1) : (r = m - 1);\n  }\n  return -1;\n}\nconsole.log('Found 23 at index:', binarySearch([2, 5, 11, 23, 45], 23));`
    }
  ]
};
