// Topics 1 to 8: Deep micro-concepts modeled on javascript.info + freeCodeCamp + ES2023-2025
// Format per step: title, keywords, definition, syntax, examples[], keyPoints[], testCases[], starterCode

module.exports = {
  1: [
    {
      title: 'JavaScript Runtimes: Browser DevTools vs Node.js',
      keywords: ['DevTools (F12)', 'Node.js CLI', '<script defer>', 'V8 Engine'],
      definition: 'JavaScript executes inside two primary environments: web browsers (DOM + Web APIs) and Node.js (file system, server I/O, CLI scripts).',
      syntax: `// Browser HTML attachment (recommended)\n<script defer src="app.js"></script>\n\n// Terminal execution with Node.js\nnode app.js`,
      examples: [
        {
          title: 'Example 1: Detect Active Runtime Environment',
          code: `const env = typeof window === 'undefined' ? 'Node.js Server/CLI' : 'Browser DOM';\nconsole.log('Running inside:', env);`
        },
        {
          title: 'Example 2: <script defer> Order-Safe HTML Pattern',
          language: 'html',
          code: `<!DOCTYPE html>\n<html>\n<head>\n  <script defer src="app.js"></script>\n</head>\n<body>\n  <h1 id="title">Loaded safely before JS runs</h1>\n</body>\n</html>`
        }
      ],
      keyPoints: [
        'Use <script defer> in HTML <head> so DOM parses first while script downloads in parallel',
        'Use Node.js (`node file.js`) for fast backend scripts, tooling, and DSA testing'
      ],
      testCases: [
        { label: 'Node / Sandbox check', input: 'typeof window', expected: '"undefined" in Node CLI' },
        { label: 'Console log output', input: "console.log('Ready')", expected: 'Prints Ready cleanly to stdout' }
      ],
      starterCode: `const env = typeof window === 'undefined' ? 'Node.js CLI' : 'Browser DOM';\nconsole.log('Active runtime:', env);\nconsole.assert(typeof env === 'string', 'Runtime check failed');`
    },
    {
      title: 'Console Inspection Methods Beyond console.log()',
      keywords: ['console.log()', 'console.table()', 'console.time()', 'console.assert()'],
      definition: 'Built-in console helpers format structured objects, measure runtime performance, and assert invariants during debugging.',
      syntax: `console.log(val1, val2);\nconsole.table(arrayOfObjects);\nconsole.time('label'); ... console.timeEnd('label');\nconsole.assert(condition, 'Failure message');`,
      examples: [
        {
          title: 'Example 1: Formatting Objects & Tabular Data',
          code: `const users = [\n  { name: 'Asha', score: 95 },\n  { name: 'Vikram', score: 88 }\n];\nconsole.log('Named log:', { count: users.length });\nconsole.table(users);`
        },
        {
          title: 'Example 2: Benchmarking & Assertions',
          code: `console.time('sumLoop');\nlet sum = 0;\nfor (let i = 1; i <= 10000; i++) sum += i;\nconsole.timeEnd('sumLoop');\nconsole.assert(sum === 50005000, 'Math mismatch');`
        }
      ],
      testCases: [
        { label: 'Tabular view', input: 'console.table([{ a: 1 }])', expected: 'ASCII table with index and columns' },
        { label: 'Silent assertion pass', input: 'console.assert(2 + 2 === 4, "err")', expected: 'No error logged when condition is true' }
      ],
      starterCode: `const lessons = [\n  { topic: 'Variables', tasks: 6 },\n  { topic: 'Closures', tasks: 6 }\n];\nconsole.table(lessons);\nconsole.assert(lessons.length === 2, 'Expected 2 rows');`
    },
    {
      title: 'Variables: const vs let vs var',
      keywords: ['const', 'let', 'var', 'Block Scope', 'Mutability'],
      definition: 'Always default to `const` (immutable binding); use `let` when a binding must be reassigned; avoid `var` because it is function-scoped and leaks out of blocks.',
      syntax: `const FIXED_BINDING = value;   // cannot reassign variable\nlet mutableCounter = 0;        // block-scoped & reassignable`,
      examples: [
        {
          title: 'Example 1: const Binding vs Mutating Reference Contents',
          code: `const tags = ['js'];\ntags.push('es6');       // Allowed: mutates array contents\nconsole.log(tags);      // ['js', 'es6']\n// tags = ['new'];      // TypeError: Assignment to constant variable`
        },
        {
          title: 'Example 2: Block Scope (let vs var Leak)',
          code: `if (true) {\n  let safe = 'only inside block';\n  var leaked = 'escapes if-block!';\n}\nconsole.log(leaked); // Works (unintended leak)\n// console.log(safe); // ReferenceError`
        }
      ],
      keyPoints: [
        '`const` freezes the variable reference, NOT object/array contents inside it',
        'Using `let` prevents accidental loop/if-block scoping bugs'
      ],
      testCases: [
        { label: 'Mutate const array', input: 'const a = [1]; a.push(2);', expected: '[1, 2] without TypeError' },
        { label: 'Reassign const', input: 'const x = 1; x = 2;', expected: 'Throws TypeError' }
      ],
      starterCode: `const appName = 'SmartLearn';\nlet points = 10;\npoints += 5;\nconst skills = ['HTML', 'CSS'];\nskills.push('JS');\nconsole.log({ appName, points, skills });`
    },
    {
      title: 'Naming Conventions, Identifiers & Comments',
      keywords: ['camelCase', 'UPPER_SNAKE_CASE', 'Identifiers', '// Comments'],
      definition: 'Use `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for module constants, `PascalCase` for classes, and write comments to explain why rather than what.',
      syntax: `const MAX_RETRIES = 3;          // Constant configuration\nlet activeUserCount = 42;       // camelCase variable\n/* Multi-line explanation */`,
      examples: [
        {
          title: 'Example 1: Clean Identifier Naming vs Invalid Syntax',
          code: `const firstName = 'Riya';\nconst $price = 99;\nconst _internalFlag = false;\n// const 1stItem = 1; // Invalid: cannot start with digit\nconsole.log({ firstName, $price, _internalFlag });`
        },
        {
          title: 'Example 2: Good "Why" Comment',
          code: `// Offset by 1 because API pages are 1-indexed\nconst nextPage = currentPageIndex + 1;\nconsole.log(nextPage);`
        }
      ],
      testCases: [
        { label: 'Valid $ and _ prefix', input: 'let _id = 1, $el = "btn"', expected: 'Both parse cleanly as valid identifiers' }
      ],
      starterCode: `const MAX_UPLOAD_MB = 5;\nlet uploadedFilesCount = 2;\nconsole.log({ MAX_UPLOAD_MB, uploadedFilesCount });`
    }
  ],

  2: [
    {
      title: 'The 7 Primitive Data Types & typeof Quirks',
      keywords: ['string', 'number', 'bigint', 'boolean', 'undefined', 'null', 'symbol', 'typeof'],
      definition: 'JavaScript defines exactly 7 immutable primitive types plus `object`. The `typeof` operator identifies primitives safely except `null`, which famously returns `"object"`.',
      syntax: `typeof value; // 'string' | 'number' | 'bigint' | 'boolean' | 'undefined' | 'symbol' | 'object' | 'function'`,
      examples: [
        {
          title: 'Example 1: Inspect All 7 Primitives',
          code: `const vals = ['hi', 42, 9007199254740993n, true, undefined, null, Symbol('k')];\nvals.forEach(v => console.log(String(v), '=>', typeof v));`
        },
        {
          title: 'Example 2: Checking Arrays & null Correctly',
          code: `const x = null;\nconst arr = [1, 2];\nconsole.log('Is null?', x === null);\nconsole.log('Is array?', Array.isArray(arr), 'vs typeof:', typeof arr);`
        }
      ],
      keyPoints: [
        '`null` vs `undefined` → `null` is intentional empty value; `undefined` means unassigned',
        '`BigInt` requires `n` suffix (`10n`) for integers above `2^53 - 1`'
      ],
      testCases: [
        { label: 'Legacy typeof null quirk', input: 'typeof null', expected: '"object"' },
        { label: 'Safe array check', input: 'Array.isArray([])', expected: 'true' },
        { label: 'typeof NaN', input: 'typeof NaN', expected: '"number"' }
      ],
      starterCode: `console.log('typeof null:', typeof null);\nconsole.log('typeof 42n:', typeof 42n);\nconsole.log('Array.isArray([]):', Array.isArray([]));`
    },
    {
      title: 'Equality: Strict (===) vs Loose (==) & Object.is()',
      keywords: ['===', '==', 'Type Coercion', 'Object.is()', 'NaN'],
      definition: 'Always prefer `===` (strict equality: no hidden type conversion). Loose equality (`==`) triggers complex coercion rules; `Object.is()` accurately treats `NaN` as equal to `NaN`.',
      syntax: `a === b         // Strict (same type & value)\na == b          // Loose (performs coercion)\nObject.is(a, b) // Exact SameValue check (handles NaN & -0)`,
      examples: [
        {
          title: 'Example 1: Surprises of Loose Equality vs Strict',
          code: `console.log("'5' == 5:", '5' == 5);\nconsole.log("'5' === 5:", '5' === 5);\nconsole.log("'' == 0:", '' == 0);\nconsole.log('null == undefined:', null == undefined);`
        },
        {
          title: 'Example 2: Handling NaN & Floating-Point 0.1 + 0.2',
          code: `console.log('NaN === NaN:', NaN === NaN);\nconsole.log('Object.is(NaN, NaN):', Object.is(NaN, NaN));\nconst epsEqual = (a, b) => Math.abs(a - b) < Number.EPSILON;\nconsole.log('0.1 + 0.2 ≈ 0.3:', epsEqual(0.1 + 0.2, 0.3));`
        }
      ],
      testCases: [
        { label: 'Empty string == 0', input: "'' == 0", expected: 'true (coerced to number 0)' },
        { label: 'NaN check', input: 'Number.isNaN(NaN)', expected: 'true' },
        { label: 'Floating point epsilon', input: '0.1 + 0.2 === 0.3', expected: 'false' }
      ],
      starterCode: `console.log('=== check:', '5' === 5);\nconsole.log('Object.is NaN:', Object.is(NaN, NaN));\nconsole.log('Precision gap:', 0.1 + 0.2);`
    },
    {
      title: 'Truthy, Falsy & Short-Circuit Logic (&&, ||)',
      keywords: ['Falsy Values', 'Truthy', '&&', '||', 'Short-Circuit'],
      definition: 'Only 8 values are falsy (`false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`). Every other value—including `[]`, `{}`, and `"0"`—is truthy.',
      syntax: `const left || right; // returns first truthy operand\nconst cond && expr;  // evaluates expr only if cond is truthy`,
      examples: [
        {
          title: 'Example 1: Verify All 8 Falsy vs Surprising Truthy Values',
          code: `const items = [false, 0, -0, 0n, '', null, undefined, NaN, '0', [], {}];\nconsole.table(items.map(v => ({ value: String(v), truthy: Boolean(v) })));`
        },
        {
          title: 'Example 2: Short-Circuit Guard',
          code: `const isLoggedIn = true;\nisLoggedIn && console.log('Welcome to dashboard');`
        }
      ],
      testCases: [
        { label: 'String zero', input: "Boolean('0')", expected: 'true' },
        { label: 'Empty array', input: 'Boolean([])', expected: 'true' },
        { label: 'Empty string', input: "Boolean('')", expected: 'false' }
      ],
      starterCode: `const testVals = [0, '', null, '0', [], {}];\ntestVals.forEach(v => console.log(JSON.stringify(v), '->', Boolean(v)));`
    },
    {
      title: 'Nullish Coalescing (??), Optional Chaining (?.) & Logical Assignment',
      keywords: ['??', '?.', '??=', '||=', 'Nullish Guard'],
      definition: '`??` only falls back when a value is `null` or `undefined` (keeping valid `0`, `false`, or `""`), while `?.` avoids runtime crashes when reading missing nested paths.',
      syntax: `const val = input ?? defaultVal;     // fallback ONLY for null/undefined\nconst city = user?.address?.city;      // undefined instead of TypeError\nconfig.timeout ??= 3000;               // assign only if null/undefined`,
      examples: [
        {
          title: 'Example 1: Why ?? Beats || for Zero Counts & Booleans',
          code: `const count = 0;\nconsole.log('With ||:', count || 10);   // Bug: 10\nconsole.log('With ??:', count ?? 10);   // Safe: 0`
        },
        {
          title: 'Example 2: Optional Chaining on Properties, Methods & Arrays',
          code: `const user = { name: 'Dev' };\nconsole.log('City:', user?.address?.city ?? 'Not set');\nconsole.log('Optional method:', user.greet?.());\nconsole.log('Optional index:', user.tags?.[0]);`
        }
      ],
      testCases: [
        { label: 'Zero preserved by ??', input: '0 ?? 50', expected: '0' },
        { label: 'Empty string preserved', input: "'' ?? 'fallback'", expected: "''" },
        { label: 'Missing nested key', input: '({})?.a?.b', expected: 'undefined (no error)' }
      ],
      starterCode: `const prefs = { retries: 0, theme: '' };\nconsole.log('retries:', prefs.retries ?? 3);\nconsole.log('city:', prefs?.profile?.city ?? 'Unknown');`
    },
    {
      title: 'Arithmetic (** , %) & Explicit Type Conversion',
      keywords: ['Number()', 'parseInt()', 'String()', 'Boolean()', '**'],
      definition: 'Implicit `+` coercion concatenates strings (`"5" + 3 -> "53"`), while `-`/`*` coerce to numbers. Use explicit `Number()`, `parseInt(str, 10)`, and `String()` for predictable conversions.',
      syntax: `Number('42')       // 42 (whole string must be numeric)\nparseInt('42px', 10) // 42 (parses leading digits)\nString(123)        // '123'`,
      examples: [
        {
          title: 'Example 1: Coercion Trap (+ vs -)',
          code: `console.log("'5' + 3 =", '5' + 3);  // '53'\nconsole.log("'5' - 3 =", '5' - 3);  // 2\nconsole.log('2 ** 5 =', 2 ** 5);    // 32`
        },
        {
          title: 'Example 2: parseInt vs Number Validation',
          code: `console.log("Number('42px'):", Number('42px'));\nconsole.log("parseInt('42px', 10):", parseInt('42px', 10));\nconsole.log("Number(''):", Number(''));`
        }
      ],
      testCases: [
        { label: 'Strict whole string', input: "Number('42px')", expected: 'NaN' },
        { label: 'Prefix integer parse', input: "parseInt('42px', 10)", expected: '42' }
      ],
      starterCode: `console.log("'5' + 3:", '5' + 3);\nconsole.log("'5' - 3:", '5' - 3);\nconsole.log("Number('42px'):", Number('42px'));\nconsole.log("parseInt('42px', 10):", parseInt('42px', 10));`
    }
  ],

  3: [
    {
      title: 'Conditionals: if/else, Ternary (? :) & switch',
      keywords: ['if / else', 'Ternary (? :)', 'switch', 'break'],
      definition: 'Branch execution cleanly using `if/else` for ranges, ternary `? :` for concise single expressions, and `switch` (which uses strict `===`) for fixed multi-case matches.',
      syntax: `const label = score >= 50 ? 'Pass' : 'Fail';\n\nswitch (role) {\n  case 'admin': return 1;\n  default: return 0;\n}`,
      examples: [
        {
          title: 'Example 1: Ternary vs Multi-Branch Grading',
          code: `const marks = 86;\nconst grade = marks >= 90 ? 'A+' : marks >= 75 ? 'A' : 'B';\nconsole.log('Grade:', grade);`
        },
        {
          title: 'Example 2: Strict Matching in switch (with fall-through warning)',
          code: `const code = 200;\nswitch (code) {\n  case 200:\n  case 201:\n    console.log('Success response');\n    break;\n  default:\n    console.log('Other status');\n}`
        }
      ],
      testCases: [
        { label: 'Missing break fall-through', input: 'switch(1){case 1: a=1; case 2: a=2;}', expected: 'a becomes 2 (falls through)' },
        { label: 'Strict switch match', input: 'switch("1"){case 1: ...}', expected: 'Does NOT match case 1' }
      ],
      starterCode: `function dayType(day) {\n  switch (day) {\n    case 'Sat':\n    case 'Sun':\n      return 'Weekend';\n    default:\n      return 'Weekday';\n  }\n}\nconsole.log(dayType('Sat'), dayType('Mon'));`
    },
    {
      title: 'Guard Clauses & Early Return Pattern',
      keywords: ['Guard Clause', 'Early Return', 'Flat Code'],
      definition: 'Handle invalid inputs or edge cases immediately at the start of a function with `return` or `throw`, keeping main logic shallow and readable.',
      syntax: `function fn(input) {\n  if (!input) return fallback;\n  if (input.invalid) throw new Error('Bad input');\n  // happy path logic without deep nesting\n}`,
      examples: [
        {
          title: 'Example 1: Flatten Nested Conditionals',
          code: `function calculateDiscount(user, total) {\n  if (!user) return 0;\n  if (total <= 0) return 0;\n  return user.isVip ? total * 0.2 : total * 0.05;\n}\nconsole.log(calculateDiscount({ isVip: true }, 1000));`
        }
      ],
      testCases: [
        { label: 'Null guard', input: 'calculateDiscount(null, 500)', expected: '0' },
        { label: 'VIP calculation', input: 'calculateDiscount({ isVip: true }, 1000)', expected: '200' }
      ],
      starterCode: `function withdraw(balance, amt) {\n  if (amt <= 0) return 'Amount must be > 0';\n  if (amt > balance) return 'Insufficient balance';\n  return \`New balance: \${balance - amt}\`;\n}\nconsole.log(withdraw(500, 150));`
    },
    {
      title: 'Loops: for, while, do...while, for...of, for...in',
      keywords: ['for', 'while', 'do...while', 'for...of', 'for...in'],
      definition: 'Use `for...of` to iterate values of any iterable (Array, String, Map, Set), `for` when index matters, `while` for unknown iterations, and reserve `for...in` strictly for object keys.',
      syntax: `for (const item of iterable) { ... }   // values\nfor (const key in plainObj) { ... }   // own enumerable string keys`,
      examples: [
        {
          title: 'Example 1: for...of on Arrays & Strings vs for...in Trap',
          code: `for (const ch of 'JS!') console.log('char:', ch);\nconst obj = { a: 1, b: 2 };\nfor (const k in obj) {\n  if (Object.hasOwn(obj, k)) console.log(k, obj[k]);\n}`
        },
        {
          title: 'Example 2: while vs do...while Guarantee',
          code: `let n = 0;\ndo {\n  console.log('Runs at least once even when n===0');\n} while (n > 0);`
        }
      ],
      keyPoints: [
        'Never use `for...in` on arrays (keys are strings and may include prototype properties)',
        'Use `do...while` only when the loop body must run at least once'
      ],
      testCases: [
        { label: 'for...of output', input: "for (const x of [10, 20])", expected: 'Yields numeric values 10, 20' },
        { label: 'do...while min run', input: 'condition = false initially', expected: 'Executes body 1 time' }
      ],
      starterCode: `const langs = ['JS', 'TS', 'SQL'];\nfor (const lang of langs) console.log('Lang:', lang);\nlet countdown = 3;\nwhile (countdown > 0) console.log(countdown--);`
    },
    {
      title: 'Loop Control: break, continue, Labels & Off-by-One',
      keywords: ['break', 'continue', 'Labeled Loop', 'Off-by-One'],
      definition: '`break` terminates the nearest loop immediately; `continue` skips only the current iteration; labeled loops let you break outer nested loops.',
      syntax: `outer: for (let i = 0; i < 3; i++) {\n  for (let j = 0; j < 3; j++) {\n    if (i === j && j === 1) break outer;\n  }\n}`,
      examples: [
        {
          title: 'Example 1: Skip Evens & Stop at Threshold',
          code: `for (let i = 1; i <= 10; i++) {\n  if (i % 2 === 0) continue;\n  if (i > 7) break;\n  console.log(i); // 1, 3, 5, 7\n}`
        },
        {
          title: 'Example 2: Safe Index Bounds (Avoid Off-by-One)',
          code: `const arr = ['A', 'B', 'C'];\nfor (let i = 0; i < arr.length; i++) {\n  console.log(i, arr[i]); // stops before undefined arr[3]\n}`
        }
      ],
      testCases: [
        { label: 'Odd filter before 8', input: '1..10 with continue on even & break > 7', expected: '1, 3, 5, 7' }
      ],
      starterCode: `for (let i = 1; i <= 10; i++) {\n  if (i % 2 === 0) continue;\n  if (i > 7) break;\n  console.log(i);\n}`
    }
  ],

  4: [
    {
      title: 'Declarations vs Expressions vs Arrow Functions',
      keywords: ['Declaration', 'Expression', 'Arrow =>', 'Hoisting', 'Lexical this'],
      definition: 'Function declarations hoist completely above calls; function expressions & arrow functions do not hoist their initialization and arrows bind `this` lexically.',
      syntax: `function sum(a, b) { return a + b; }          // hoisted\nconst mul = (a, b) => a * b;                  // implicit return\nconst makeObj = id => ({ id });               // wrap {} in ()`,
      examples: [
        {
          title: 'Example 1: Hoisting & Concise Object Return',
          code: `console.log(greet('Asha')); // Works before declaration!\nfunction greet(n) { return \`Hi \${n}\`; }\n\nconst createTag = label => ({ label, active: true });\nconsole.log(createTag('ES6'));`
        },
        {
          title: 'Example 2: Missing Braces Trap with Objects',
          code: `const broken = id => { id };       // returns undefined!\nconst fixed = id => ({ id });      // returns { id }\nconsole.log(broken(5), fixed(5));`
        }
      ],
      testCases: [
        { label: 'Call hoisted declaration early', input: 'greet("Asha") before function', expected: '"Hi Asha"' },
        { label: 'Arrow returning object', input: 'id => ({ id })', expected: '{ id: ... }' }
      ],
      starterCode: `console.log(double(7));\nfunction double(n) { return n * 2; }\nconst makeUser = name => ({ name, role: 'student' });\nconsole.log(makeUser('Riya'));`
    },
    {
      title: 'Default Parameters & Rest Syntax (...args)',
      keywords: ['Default Params', 'Rest ...args', 'Array.isArray()'],
      definition: 'Default parameters evaluate when an argument is omitted or explicitly `undefined`. Rest syntax (`...args`) bundles trailing arguments into a genuine Array (replacing legacy `arguments`).',
      syntax: `function connect(host = 'localhost', ...ports) {\n  // ports is a real Array with map/reduce\n}`,
      examples: [
        {
          title: 'Example 1: Undefined Triggers Default, null Does Not',
          code: `const logRate = (rate = 10) => rate;\nconsole.log('omitted:', logRate(), 'undefined:', logRate(undefined), 'null:', logRate(null));`
        },
        {
          title: 'Example 2: Real Array Methods on Rest Parameters',
          code: `function sumAll(factor = 1, ...nums) {\n  return nums.reduce((acc, n) => acc + n, 0) * factor;\n}\nconsole.log('Sum:', sumAll(2, 5, 10, 15));`
        }
      ],
      testCases: [
        { label: 'Default on undefined', input: 'logRate(undefined)', expected: '10' },
        { label: 'Null bypasses default', input: 'logRate(null)', expected: 'null' }
      ],
      starterCode: `const sumAll = (mult = 1, ...nums) => nums.reduce((s, x) => s + x, 0) * mult;\nconsole.log(sumAll(2, 10, 20, 30)); // 120`
    },
    {
      title: 'Callbacks & Higher-Order Functions (First-Class Functions)',
      keywords: ['Callback', 'Higher-Order Function', 'First-Class'],
      definition: 'Because JS functions are first-class values, higher-order functions can accept functions as arguments or return newly constructed functions.',
      syntax: `function withLogging(fn) {\n  return (...args) => {\n    console.log('Args:', args);\n    return fn(...args);\n  };\n}`,
      examples: [
        {
          title: 'Example 1: Higher-Order Retry / Repeat Helper',
          code: `function repeat(n, action) {\n  for (let i = 0; i < n; i++) action(i);\n}\nrepeat(3, idx => console.log('Tick', idx));`
        },
        {
          title: 'Example 2: Returning Customized Functions',
          code: `const makeValidator = minLen => str => str.length >= minLen;\nconst validPassword = makeValidator(8);\nconsole.log(validPassword('1234'), validPassword('strongPass9'));`
        }
      ],
      testCases: [
        { label: 'Short password rejected', input: "validPassword('1234')", expected: 'false' },
        { label: 'Valid password accepted', input: "validPassword('strongPass9')", expected: 'true' }
      ],
      starterCode: `const applyTwice = (x, fn) => fn(fn(x));\nconsole.log(applyTwice(3, n => n * 2)); // 12`
    },
    {
      title: 'Pure Functions vs Side Effects',
      keywords: ['Pure Function', 'Side Effects', 'Immutability'],
      definition: 'A pure function maps identical inputs to identical outputs without mutating external variables, DOM state, or input parameters.',
      syntax: `// Pure: clones input array\nconst addItem = (list, x) => [...list, x];\n\n// Impure: mutates caller's array\nconst addImpure = (list, x) => { list.push(x); return list; };`,
      examples: [
        {
          title: 'Example 1: Keeping State Immutable',
          code: `const orig = [1, 2];\nconst next = (arr, item) => [...arr, item];\nconsole.log('next:', next(orig, 3), 'orig intact:', orig);`
        }
      ],
      testCases: [
        { label: 'Input array unchanged', input: 'next([1, 2], 3)', expected: 'Returns [1,2,3]; original remains [1,2]' }
      ],
      starterCode: `const scores = [10, 20];\nconst appendScore = (arr, s) => [...arr, s];\nconsole.log('Updated:', appendScore(scores, 30), 'Original:', scores);`
    },
    {
      title: 'Recursion & Base Case Safety',
      keywords: ['Recursion', 'Base Case', 'Call Stack', 'Stack Overflow'],
      definition: 'Recursion solves problems by calling itself on smaller subproblems until hitting a terminating base case.',
      syntax: `function recurse(n) {\n  if (baseCondition) return baseValue;\n  return combine(n, recurse(smallerN));\n}`,
      examples: [
        {
          title: 'Example 1: Factorial & Sum Recursively',
          code: `const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));\nconsole.log('5! =', factorial(5));`
        },
        {
          title: 'Example 2: Traversing Deep Nested Comments / Trees',
          code: `const countNodes = node => 1 + (node.children || []).reduce((s, c) => s + countNodes(c), 0);\nconst tree = { id: 1, children: [{ id: 2 }, { id: 3, children: [{ id: 4 }] }] };\nconsole.log('Total nodes:', countNodes(tree));`
        }
      ],
      testCases: [
        { label: 'Factorial 0 base case', input: 'factorial(0)', expected: '1' },
        { label: 'Tree node count', input: '4-node nested object', expected: '4' }
      ],
      starterCode: `const sumDigits = n => (n < 10 ? n : (n % 10) + sumDigits(Math.floor(n / 10)));\nconsole.log('sumDigits(492) =', sumDigits(492)); // 15`
    },
    {
      title: 'IIFE & Function Composition (compose / pipe)',
      keywords: ['IIFE', 'compose()', 'pipe()', 'Function Chaining'],
      definition: 'IIFEs run immediately to isolate private variables; `pipe`/`compose` wire small unary functions together sequentially into readable data pipelines.',
      syntax: `const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);\nconst compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);`,
      examples: [
        {
          title: 'Example 1: Left-to-Right Pipeline with pipe()',
          code: `const pipe = (...fns) => x => fns.reduce((acc, fn) => fn(acc), x);\nconst slugify = pipe(\n  s => s.trim(),\n  s => s.toLowerCase(),\n  s => s.replace(/\\s+/g, '-')\n);\nconsole.log(slugify('  Hello JavaScript World  '));`
        },
        {
          title: 'Example 2: IIFE Isolated Scope',
          code: `const idSeed = (() => {\n  let next = 1000;\n  return () => ++next;\n})();\nconsole.log(idSeed(), idSeed());`
        }
      ],
      testCases: [
        { label: 'Slug pipeline', input: '"  JS Mastery  "', expected: '"js-mastery"' },
        { label: 'IIFE private counter', input: 'idSeed(), idSeed()', expected: '1001, 1002' }
      ],
      starterCode: `const pipe = (...fns) => x => fns.reduce((v, fn) => fn(v), x);\nconst cleanTitle = pipe(s => s.trim(), s => s.toUpperCase(), s => s + '!');\nconsole.log(cleanTitle('  modern js  '));`
    }
  ],

  5: [
    {
      title: 'Global, Function, Block & Module Scope',
      keywords: ['Global Scope', 'Function Scope', 'Block Scope', 'Module Scope'],
      definition: 'Scope controls variable visibility: `let`/`const` obey `{ ... }` blocks, `var` obeys enclosing function scope, and ES Modules keep top-level bindings file-private.',
      syntax: `{\n  const blockOnly = 1; // hidden outside {}\n}\nfunction fn() {\n  var fnOnly = 2;    // hidden outside fn\n}`,
      examples: [
        {
          title: 'Example 1: Block Scope Shadowing Without Leaks',
          code: `const mode = 'global';\n{\n  const mode = 'block';\n  console.log('Inside:', mode);\n}\nconsole.log('Outside:', mode);`
        }
      ],
      testCases: [
        { label: 'Shadowed inner binding', input: 'inner const mode vs outer const mode', expected: 'Inside: "block", Outside: "global"' }
      ],
      starterCode: `const x = 'outer';\nif (true) {\n  const x = 'inner';\n  console.log('block:', x);\n}\nconsole.log('global:', x);`
    },
    {
      title: 'Lexical Scope & The Scope Chain',
      keywords: ['Lexical Scope', 'Scope Chain', 'Static Binding'],
      definition: 'JS looks up variables based on where functions are physically defined in source code (lexical scope), walking outward through parent environments up to `globalThis`.',
      syntax: `const outer = 'A';\nfunction f() {\n  // Always sees 'A' from its definition environment\n  return outer;\n}`,
      examples: [
        {
          title: 'Example 1: Definition Site Beats Call Site',
          code: `const token = 'OUTER';\nfunction printToken() {\n  console.log(token);\n}\nfunction wrapper() {\n  const token = 'INNER';\n  printToken(); // Logs 'OUTER', NOT 'INNER'!\n}\nwrapper();`
        }
      ],
      testCases: [
        { label: 'Lexical lookup inside wrapper', input: 'wrapper() calls outer printToken()', expected: 'Logs "OUTER"' }
      ],
      starterCode: `const level = 'ROOT';\nfunction read() { console.log(level); }\nfunction run() { const level = 'LOCAL'; read(); }\nrun();`
    },
    {
      title: 'Hoisting & The Temporal Dead Zone (TDZ)',
      keywords: ['Hoisting', 'TDZ', 'ReferenceError', 'TypeError'],
      definition: 'Engine registers declarations before running code: `var` initializes early to `undefined`, whereas `let`/`const` stay uninitialized in the TDZ (throwing `ReferenceError` on early access).',
      syntax: `console.log(a); // undefined (var hoisted)\nvar a = 5;\n\n// console.log(b); // ReferenceError (TDZ!)\nlet b = 5;`,
      examples: [
        {
          title: 'Example 1: Inspect Hoisting Differences Safely',
          code: `console.log('var x:', x);\nvar x = 10;\ntry {\n  // Eval/nested ref inside TDZ check simulation\n  console.log(y);\n  let y = 20;\n} catch (e) {\n  console.log('TDZ Error:', e.name, '-', e.message);\n}`
        }
      ],
      testCases: [
        { label: 'var before init', input: 'console.log(x); var x = 10;', expected: 'undefined' },
        { label: 'let before init', input: 'console.log(y); let y = 20;', expected: 'Throws ReferenceError' }
      ],
      starterCode: `console.log('Hoisted var:', v);\nvar v = 42;\ntry {\n  console.log(z);\n  let z = 1;\n} catch (err) {\n  console.log('Caught TDZ:', err.name);\n}`
    },
    {
      title: 'Closures & The Classic Loop Trap (var vs let)',
      keywords: ['Closure', 'Lexical Environment', 'Private State', 'Loop Trap'],
      definition: 'A closure allows an inner function to retain live references to outer local variables long after the outer function returns.',
      syntax: `function makeCounter() {\n  let count = 0;\n  return () => ++count;\n}`,
      examples: [
        {
          title: 'Example 1: Independent Private State per Instance',
          code: `function makeCounter(start = 0) {\n  let n = start;\n  return { inc: () => ++n, val: () => n };\n}\nconst a = makeCounter(10);\nconst b = makeCounter(0);\na.inc();\nconsole.log('a:', a.val(), 'b:', b.val()); // 11 vs 0`
        },
        {
          title: 'Example 2: setTimeout Loop Bug (var -> 3,3,3 vs let -> 0,1,2)',
          code: `for (var i = 0; i < 3; i++) setTimeout(() => console.log('var:', i), 0);\nfor (let j = 0; j < 3; j++) setTimeout(() => console.log('let:', j), 10);`
        }
      ],
      testCases: [
        { label: 'Two counter isolation', input: 'a.inc() does not affect b.val()', expected: 'a: 11, b: 0' },
        { label: 'var loop async output', input: 'for(var i=0;i<3;i++) setTimeout', expected: '3, 3, 3' }
      ],
      starterCode: `for (var i = 0; i < 3; i++) setTimeout(() => console.log('var:', i), 0);\nfor (let j = 0; j < 3; j++) setTimeout(() => console.log('let:', j), 20);`
    },
    {
      title: 'Production Closure Patterns: once(), memoize(), debounce()',
      keywords: ['once()', 'memoize()', 'debounce()', 'throttle()', 'Cache'],
      definition: 'Closures power essential utilities by hiding internal timers, `called` flags, and `Map` caches cleanly across invocations.',
      syntax: `function debounce(fn, ms) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}`,
      examples: [
        {
          title: 'Example 1: once(fn) & memoize(fn)',
          code: `const once = fn => {\n  let done = false, val;\n  return (...a) => done ? val : (done = true, val = fn(...a));\n};\nconst initApp = once(() => 'Booted once!');\nconsole.log(initApp(), initApp());`
        },
        {
          title: 'Example 2: Debounced Search Simulation',
          code: `function debounce(fn, ms = 100) {\n  let t;\n  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };\n}\nconst search = debounce(q => console.log('API query:', q), 80);\nsearch('j'); search('ja'); search('javascript');`
        }
      ],
      testCases: [
        { label: 'Rapid calls debounced', input: 'search("j"); search("ja"); search("javascript")', expected: 'Only prints "API query: javascript"' }
      ],
      starterCode: `function once(fn) {\n  let called = false, res;\n  return (...a) => (called ? res : ((called = true), (res = fn(...a))));\n}\nconst connectDB = once(() => 'Connected #' + Math.random().toFixed(2));\nconsole.log(connectDB(), connectDB());`
    }
  ],

  6: [
    {
      title: 'Array Mutations: Stack, Queue, slice() vs splice()',
      keywords: ['push / pop', 'shift / unshift', 'slice()', 'splice()', 'Mutation'],
      definition: '`push`/`pop`/`shift`/`unshift`/`splice` modify the original array in place; `slice` and spread `[...arr]` leave the original array untouched.',
      syntax: `arr.slice(start, end)             // non-mutating copy [start, end)\narr.splice(start, delCount, ...ins) // mutates in place`,
      examples: [
        {
          title: 'Example 1: slice vs splice Behavior',
          code: `const arr = [10, 20, 30, 40];\nconsole.log('slice(1,3):', arr.slice(1, 3), 'orig:', arr);\nconst removed = arr.splice(1, 2, 99);\nconsole.log('removed:', removed, 'mutated:', arr);`
        }
      ],
      testCases: [
        { label: 'End index exclusive in slice', input: '[10, 20, 30, 40].slice(1, 3)', expected: '[20, 30]' }
      ],
      starterCode: `const nums = [10, 20, 30, 40];\nconsole.log('slice(1,3):', nums.slice(1, 3));\nnums.splice(1, 1, 999);\nconsole.log('after splice:', nums);`
    },
    {
      title: 'Transforming Arrays: map(), filter(), flatMap()',
      keywords: ['map()', 'filter()', 'flatMap()', 'Immutable Pipeline'],
      definition: '`map` transforms each element 1-to-1, `filter` keeps elements passing a predicate, and `flatMap` maps + flattens 1 nesting level efficiently.',
      syntax: `arr.map(x => newX)\narr.filter(x => boolCondition)\narr.flatMap(x => [x, x * 2])`,
      examples: [
        {
          title: 'Example 1: Filter & Transform Price Pipeline',
          code: `const items = [{ n: 'Pen', p: 20 }, { n: 'Book', p: 250 }];\nconst labels = items.filter(i => i.p > 50).map(i => \`\${i.n}: ₹\${i.p}\`);\nconsole.log(labels);`
        },
        {
          title: 'Example 2: Tokenizing Sentences with flatMap()',
          code: `const lines = ['hello js', 'modern arrays'];\nconsole.log(lines.flatMap(l => l.split(' ')));`
        }
      ],
      testCases: [
        { label: 'flatMap flatten 1 level', input: "['a b', 'c'].flatMap(s => s.split(' '))", expected: "['a', 'b', 'c']" }
      ],
      starterCode: `const sentences = ['Learn JS', 'Build Projects'];\nconsole.log(sentences.flatMap(s => s.split(' ')));`
    },
    {
      title: 'Folding & Grouping: reduce() & ES2024 Object.groupBy()',
      keywords: ['reduce()', 'Object.groupBy()', 'Map.groupBy()', 'ES2024'],
      definition: '`reduce` accumulates an array into a single value, object, or frequency map; ES2024 `Object.groupBy()` groups elements natively in one line.',
      syntax: `arr.reduce((acc, cur) => nextAcc, initialVal)\nObject.groupBy(items, item => item.category) // ES2024`,
      examples: [
        {
          title: 'Example 1: Frequency Counter with reduce()',
          code: `const votes = ['js', 'ts', 'js', 'py', 'js'];\nconst counts = votes.reduce((m, v) => ((m[v] = (m[v] || 0) + 1), m), {});\nconsole.log(counts);`
        },
        {
          title: 'Example 2: ES2024 Native Grouping (Object.groupBy)',
          code: `const stock = [{ item: 'Apple', type: 'fruit' }, { item: 'Carrot', type: 'veg' }, { item: 'Mango', type: 'fruit' }];\nconst grouped = Object.groupBy ? Object.groupBy(stock, x => x.type) : stock.reduce((a, x) => ((a[x.type] ||= []).push(x), a), {});\nconsole.log(grouped);`
        }
      ],
      testCases: [
        { label: 'reduce empty array safety', input: '[].reduce((a, b) => a + b, 0)', expected: '0 (supply initialValue!)' }
      ],
      starterCode: `const expenses = [{ cat: 'food', amt: 120 }, { cat: 'tech', amt: 800 }, { cat: 'food', amt: 80 }];\nconst total = expenses.reduce((s, e) => s + e.amt, 0);\nconsole.log('Total:', total);`
    },
    {
      title: 'Searching: find, some, every & ES2023 findLast / at(-1)',
      keywords: ['find()', 'some()', 'every()', 'findLast()', 'at(-1)', 'ES2023'],
      definition: 'Use `find`/`findLast` to locate matching elements forward or backward, `some`/`every` for boolean checks, and `.at(-1)` for negative indexing.',
      syntax: `arr.at(-1)                 // last element\narr.findLast(predicate)    // ES2023 reverse search\narr.some(fn) / arr.every(fn)`,
      examples: [
        {
          title: 'Example 1: Reverse Search with ES2023 findLast()',
          code: `const tx = [{ id: 1, status: 'pending' }, { id: 2, status: 'ok' }, { id: 3, status: 'pending' }];\nconsole.log('Last pending:', tx.findLast(t => t.status === 'pending'));\nconsole.log('Last item:', tx.at(-1));`
        }
      ],
      testCases: [
        { label: 'at(-1) empty array', input: '[].at(-1)', expected: 'undefined' },
        { label: 'every on empty array', input: '[].every(x => x > 0)', expected: 'true' }
      ],
      starterCode: `const nums = [4, 12, 8, 19, 3];\nconsole.log('Last > 10:', nums.findLast(n => n > 10));\nconsole.log('Has > 15?', nums.some(n => n > 15));\nconsole.log('Last elem:', nums.at(-1));`
    },
    {
      title: 'Numeric Sorting & ES2023 Non-Mutating Methods (toSorted / toReversed)',
      keywords: ['sort((a,b)=>a-b)', 'toSorted()', 'toReversed()', 'with()', 'ES2023'],
      definition: 'Default `.sort()` sorts alphabetically by UTF-16 code units (`[10, 2]` -> `[10, 2]`), mutating in place. Always supply `(a, b) => a - b` for numbers and prefer ES2023 `toSorted()` / `toReversed()` to avoid mutations.',
      syntax: `[...nums].sort((a, b) => a - b)  // safe ascending clone\nnums.toSorted((a, b) => a - b)   // ES2023 non-mutating\nnums.with(idx, newVal)           // ES2023 immutable replace`,
      examples: [
        {
          title: 'Example 1: Numeric Comparator vs Default String Trap',
          code: `const nums = [100, 20, 3];\nconsole.log('Buggy default .sort():', [...nums].sort());\nconsole.log('Immutable .toSorted():', nums.toSorted((a, b) => a - b));\nconsole.log('Original intact:', nums);`
        }
      ],
      testCases: [
        { label: 'Default string sort bug', input: '[100, 20, 3].sort()', expected: '[100, 20, 3] (NOT [3, 20, 100]!)' },
        { label: 'toSorted immutability', input: 'nums.toSorted((a,b)=>a-b)', expected: 'Original array stays unchanged' }
      ],
      starterCode: `const scores = [45, 9, 120, 30];\nconst asc = scores.toSorted((a, b) => a - b);\nconsole.log({ asc, scoresIntact: scores });`
    }
  ],

  7: [
    {
      title: 'String Immutability, UTF-16 Emoji Length & Slicing',
      keywords: ['Immutability', 'UTF-16', '[...str].length', 'slice()'],
      definition: 'Strings are immutable in JS (`s[0] = "x"` fails silently). Strings store UTF-16 code units, so emojis count as `.length === 2`; spread `[...str]` to handle Unicode code points safely.',
      syntax: `str.slice(start, end)    // supports negative indices\n[...emojiString].length  // true Unicode glyph count`,
      examples: [
        {
          title: 'Example 1: Reverse Strings & Handle Emojis Safely',
          code: `const word = 'Hi🚀!';\nconsole.log('.length:', word.length, 'vs [...word].length:', [...word].length);\nconsole.log('Safe reverse:', [...word].reverse().join(''));`
        }
      ],
      testCases: [
        { label: 'Emoji code units', input: "'🚀'.length", expected: '2 (surrogate pair)' },
        { label: 'Spread code point length', input: "[...'🚀'].length", expected: '1' }
      ],
      starterCode: `const greeting = 'Code🚀';\nconsole.log('UTF-16 length:', greeting.length);\nconsole.log('Real glyph length:', [...greeting].length);`
    },
    {
      title: 'Core String Transformations & Template Literals',
      keywords: ['split()', 'join()', 'trim()', 'replaceAll()', 'padStart()', 'Template Literals'],
      definition: 'Chain non-mutating string helpers to sanitize inputs, format fixed-width timestamps, and build multi-line strings with `${expr}` interpolation.',
      syntax: `'5'.padStart(2, '0')         // '05'\nstr.trim().replaceAll(' ', '-')`,
      examples: [
        {
          title: 'Example 1: Zero-Padding Clock Format & Slug Conversion',
          code: `const h = 9, m = 4;\nconsole.log(\`\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}\`);\nconsole.log('  Clean URL Slug  '.trim().toLowerCase().replaceAll(' ', '-'));`
        }
      ],
      testCases: [
        { label: 'padStart formatting', input: "'4'.padStart(3, '0')", expected: '"004"' },
        { label: 'replaceAll every hit', input: "'a-b-c'.replaceAll('-', '_')", expected: '"a_b_c"' }
      ],
      starterCode: `const title = '  JS String Labs  ';\nconsole.log(title.trim().toLowerCase().replaceAll(' ', '-'));\nconsole.log('7'.padStart(2, '0') + ':05');`
    },
    {
      title: 'Regular Expressions: Flags, Character Classes & Quantifiers',
      keywords: ['RegExp', '/g /i /m', '\\d \\w \\s', '+ * ? {n}', 'Lookahead'],
      definition: 'Regular expressions match text patterns declaratively using character classes (`\\d` digits, `\\w` word chars), quantifiers (`+`, `*`, `{m,n}`), and flags (`g` global, `i` case-insensitive).',
      syntax: `/pattern/flags\nnew RegExp(dynamicStr, 'gi')`,
      examples: [
        {
          title: 'Example 1: Digits, Anchors (^ $) & Non-Greedy Matching',
          code: `console.log('Exact 4 digits:', /^\\d{4}$/.test('2026'));\nconsole.log('Greedy:', '<b>a</b><b>b</b>'.match(/<b>.*<\\/b>/)[0]);\nconsole.log('Lazy *?:', '<b>a</b><b>b</b>'.match(/<b>.*?<\\/b>/g));`
        }
      ],
      testCases: [
        { label: 'Full string anchor', input: '/^\\d{4}$/.test("2026a")', expected: 'false' }
      ],
      starterCode: `const phoneRe = /^\\d{3}-\\d{4}$/;\nconsole.log(phoneRe.test('555-1234'), phoneRe.test('abc-1234'));`
    },
    {
      title: 'Regex Methods: test(), match(), matchAll() & Capturing Groups',
      keywords: ['test()', 'match()', 'matchAll()', 'Named Groups (?<name>)'],
      definition: '`test()` returns a fast boolean; `match(/.../g)` collects matched substrings; `matchAll()` yields detailed iterators including capturing groups.',
      syntax: `regex.test(str)                 // boolean\nstr.matchAll(/(?<id>#\\d+)/g)    // iterator with .groups`,
      examples: [
        {
          title: 'Example 1: Extract Named Capture Groups via matchAll()',
          code: `const log = 'User #101 bought #204 and #999';\nconst matches = [...log.matchAll(/#(?<orderId>\\d+)/g)];\nconsole.log(matches.map(m => m.groups.orderId));`
        }
      ],
      testCases: [
        { label: 'Empty match guard', input: "('abc'.match(/\\d+/g) || []).length", expected: '0 (never crashes on null!)' }
      ],
      starterCode: `const txt = 'Orders: #101, #204';\nfor (const m of txt.matchAll(/#(?<num>\\d+)/g)) {\n  console.log('Order number:', m.groups.num);\n}`
    }
  ],

  8: [
    {
      title: 'Object Literals, Computed Keys & Destructuring',
      keywords: ['Destructuring', 'Computed [key]', 'Shorthand', 'Nested Rename'],
      definition: 'Create expressive objects with shorthand properties (`{ name }`), dynamic `[key]` expressions, and nested destructuring with fallback defaults.',
      syntax: `const { name, address: { city = 'Remote' } = {} } = user;\nconst dynamic = { [propName]: val };`,
      examples: [
        {
          title: 'Example 1: Dynamic Keys & Safe Nested Defaults',
          code: `const field = 'score';\nconst user = { name: 'Ravi', [field]: 98 };\nconst { name, address: { city = 'Ranchi' } = {} } = user;\nconsole.log({ name, city, score: user.score });`
        }
      ],
      testCases: [
        { label: 'Default nested destructuring', input: 'user has no address', expected: 'city defaults safely to "Ranchi"' }
      ],
      starterCode: `const key = 'role';\nconst dev = { name: 'Asha', [key]: 'Engineer' };\nconst { name, role, team = 'Core' } = dev;\nconsole.log({ name, role, team });`
    },
    {
      title: 'Object Inspection: keys/values/entries, Object.hasOwn & freeze',
      keywords: ['Object.entries()', 'Object.fromEntries()', 'Object.hasOwn()', 'Object.freeze()'],
      definition: 'Convert objects cleanly to `[key, value]` arrays for functional transformation (`Object.entries` + `fromEntries`), verify own keys with `Object.hasOwn`, and shallow-lock edits via `Object.freeze`.',
      syntax: `Object.entries(obj)        // [[k, v], ...]\nObject.fromEntries(pairs)  // { k: v }\nObject.hasOwn(obj, 'k')    // true only if own property`,
      examples: [
        {
          title: 'Example 1: Transform Object Prices Using entries + fromEntries',
          code: `const prices = { coffee: 100, tea: 60 };\nconst doubled = Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, v * 2]));\nconsole.log(doubled);`
        }
      ],
      testCases: [
        { label: 'hasOwn vs in', input: 'Object.hasOwn({}, "toString")', expected: 'false (ignores inherited prototype)' }
      ],
      starterCode: `const scores = { a: 10, b: 20 };\nconst inverted = Object.fromEntries(Object.entries(scores).map(([k, v]) => [v, k]));\nconsole.log(inverted);`
    },
    {
      title: 'Shallow vs Deep Copy: Spread vs structuredClone() & JSON',
      keywords: ['structuredClone()', 'Shallow Copy', 'JSON.stringify()', 'Nested Reference'],
      definition: 'Spread `{ ...obj }` only copies top-level references (nested objects still mutate together). Use native `structuredClone(obj)` for reliable deep copies.',
      syntax: `const shallow = { ...obj };\nconst deep = structuredClone(obj);`,
      examples: [
        {
          title: 'Example 1: Shallow Trap vs structuredClone Fix',
          code: `const orig = { meta: { score: 10 } };\nconst s = { ...orig };\nconst d = structuredClone(orig);\nd.meta.score = 99;\ns.meta.score = 50;\nconsole.log({ orig: orig.meta.score, deep: d.meta.score }); // orig becomes 50, deep stays 99!`
        }
      ],
      testCases: [
        { label: 'structuredClone isolation', input: 'mutate deep clone nested prop', expected: 'Original nested object stays untouched' }
      ],
      starterCode: `const a = { user: { name: 'Dev' } };\nconst b = structuredClone(a);\nb.user.name = 'Changed';\nconsole.log({ orig: a.user.name, clone: b.user.name });`
    },
    {
      title: 'The this Keyword: Implicit, Explicit (call/apply/bind) & Arrow Lexical',
      keywords: ['this', 'call()', 'apply()', 'bind()', 'Implicit Context'],
      definition: 'For regular functions, `this` depends on *how* the function is called (`obj.fn()`, `call/apply/bind`, or `new`). For arrow functions, `this` is fixed lexically to where it was created.',
      syntax: `fn.call(ctx, arg1, arg2)\nfn.apply(ctx, [arg1, arg2])\nconst boundFn = fn.bind(ctx);`,
      examples: [
        {
          title: 'Example 1: Fixing Lost this After Method Extraction',
          code: `const user = { name: 'Kabir', greet(city) { return \`\${this.name} from \${city}\`; } };\nconst detached = user.greet;\nconsole.log('call:', detached.call(user, 'Delhi'));\nconsole.log('apply:', detached.apply(user, ['Pune']));\nconst bound = detached.bind(user);\nconsole.log('bind:', bound('Mumbai'));`
        }
      ],
      testCases: [
        { label: 'Lost receiver context', input: 'const f = obj.m; f() in strict mode', expected: 'this is undefined (TypeError reading this.prop)' }
      ],
      starterCode: `const hero = { name: 'Nova', say(msg) { return \`\${this.name}: \${msg}\`; } };\nconst detached = hero.say;\nconsole.log(detached.call(hero, 'Ready!'));\nconsole.log(detached.bind(hero)('Bound!'));`
    },
    {
      title: 'Map, Set & ES2025 Native Set Operations',
      keywords: ['Map', 'Set', 'WeakMap', 'intersection()', 'union()', 'ES2025'],
      definition: '`Map` stores arbitrary keys (even objects) in insertion order; `Set` enforces uniqueness with O(1) lookups and gains ES2025 set methods (`union`, `intersection`, `difference`).',
      syntax: `const m = new Map([[keyObj, val]]);\nconst s = new Set([1, 2, 3]);\ns.has(2) // O(1)`,
      examples: [
        {
          title: 'Example 1: Unique Deduplication & Map Frequency Counter',
          code: `const pro = new Set(['Alice', 'Bob', 'Charlie']);\nconst active = new Set(['Bob', 'David']);\nconst both = pro.intersection ? [...pro.intersection(active)] : [...pro].filter(x => active.has(x));\nconsole.log('Active Pro:', both);`
        }
      ],
      testCases: [
        { label: 'Set deduplication', input: 'new Set([1, 1, 2]).size', expected: '2' }
      ],
      starterCode: `const a = new Set([1, 2, 3]);\nconst b = new Set([2, 3, 4]);\nconst intersection = a.intersection ? [...a.intersection(b)] : [...a].filter(x => b.has(x));\nconsole.log('Intersection:', intersection);`
    }
  ]
};

