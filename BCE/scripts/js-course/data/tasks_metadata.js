/**
 * Curated metadata, syntax signatures, accurate JS/Web keywords, and concrete
 * Input -> Expected test cases for all 96 Practice Tasks (1.1 through 16.6).
 * Kept 100% English with zero regex-guessed prose keywords.
 */

module.exports = {
  '1.1': {
    keywords: ['const', 'let', 'console.log', 'template literal', 'variables'],
    syntax: 'const name = "Aarav";\nlet age = 21;\nconsole.log(`${name} (${age})`);',
    testCases: [
      { label: 'Log formatted summary', input: 'name="Aarav", age=21, student=true', expected: '"Aarav, 21, student: true"' },
      { label: 'Block reassignment on const', input: 'name = "Other"', expected: 'TypeError: Assignment to constant variable' },
    ],
  },
  '1.2': {
    keywords: ['destructuring', 'swap', 'let', 'variables', 'mutation'],
    syntax: 'let a = 10, b = 25;\n[a, b] = [b, a];',
    testCases: [
      { label: 'Positive integers', input: 'a = 10, b = 25', expected: 'a = 25, b = 10' },
      { label: 'Negative and zero', input: 'a = -4, b = 0', expected: 'a = 0, b = -4' },
    ],
  },
  '1.3': {
    keywords: ['const', 'Array.push', 'reference', 'reassignment', 'TypeError'],
    syntax: 'const arr = [1];\narr.push(2); // OK (mutates heap object)\narr = [3];   // TypeError (reassigns binding)',
    testCases: [
      { label: 'Mutate via .push()', input: 'const arr = [1]; arr.push(2)', expected: '[1, 2]' },
      { label: 'Reassign binding', input: 'arr = [3]', expected: 'TypeError: Assignment to constant variable' },
    ],
  },
  '1.4': {
    keywords: ['typeof', 'primitives', 'null quirk', 'BigInt', 'Symbol'],
    syntax: 'console.log(typeof 42, typeof 42n, typeof Symbol("id"), typeof null);',
    testCases: [
      { label: 'Standard primitives', input: 'typeof "js", typeof 1n, typeof Symbol()', expected: '"string", "bigint", "symbol"' },
      { label: 'Legacy null bug', input: 'typeof null', expected: '"object" (use === null to check null)' },
    ],
  },
  '1.5': {
    keywords: ['hoisting', 'TDZ', 'var', 'let', 'ReferenceError'],
    syntax: 'console.log(a); // undefined\nvar a = 1;\nconsole.log(b); // ReferenceError (TDZ)\nlet b = 2;',
    testCases: [
      { label: 'var before declaration', input: 'console.log(x); var x = 5;', expected: 'undefined' },
      { label: 'let before declaration', input: 'console.log(y); let y = 5;', expected: 'ReferenceError: Cannot access before initialization' },
    ],
  },
  '1.6': {
    keywords: ['template literals', 'multiline', 'interpolation', 'expressions'],
    syntax: 'const card = `Name: ${user.name}\nRole: ${user.role}`;',
    testCases: [
      { label: 'Dynamic fields', input: 'name="Maya", role="JS Dev", xp=120', expected: '3-line formatted profile card string' },
      { label: 'Inline expression', input: 'level = ${xp >= 100 ? "Pro" : "Starter"}', expected: 'Evaluates expression inside ${...}' },
    ],
  },

  '2.1': {
    keywords: ['modulo %', 'strict equality ===', 'if / else if', 'ternary'],
    syntax: 'const parity = n % 2 === 0 ? "Even" : "Odd";\nconst sign = n > 0 ? "Positive" : n < 0 ? "Negative" : "Zero";',
    testCases: [
      { label: 'Negative even number', input: 'n = -8', expected: '"Even, Negative"' },
      { label: 'Zero boundary', input: 'n = 0', expected: '"Even, Zero"' },
    ],
  },
  '2.2': {
    keywords: ['switch', 'arithmetic', 'division-by-zero', 'guard clause'],
    syntax: 'function calc(a, op, b) {\n  if (op === "/" && b === 0) return "Error: Division by zero";\n  switch (op) { ... }\n}',
    testCases: [
      { label: 'Valid division', input: 'calc(20, "/", 4)', expected: '5' },
      { label: 'Zero divisor guard', input: 'calc(20, "/", 0)', expected: '"Error: Division by zero"' },
    ],
  },
  '2.3': {
    keywords: ['type coercion', '=== vs ==', 'NaN', 'Number()', 'unary +'],
    syntax: '"5" + 2 -> "52" | "5" - 2 -> 3 | true + 1 -> 2 | [] == ![] -> true',
    testCases: [
      { label: 'String + vs -', input: '"5" + 2 vs "5" - 2', expected: '"52" vs 3' },
      { label: 'null vs undefined addition', input: 'null + 1 vs undefined + 1', expected: '1 vs NaN' },
    ],
  },
  '2.4': {
    keywords: ['IEEE 754', 'Number.EPSILON', 'Math.abs', 'floating point'],
    syntax: 'const isClose = (a, b) => Math.abs(a - b) < Number.EPSILON;',
    testCases: [
      { label: 'Classic 0.1 + 0.2', input: 'isClose(0.1 + 0.2, 0.3)', expected: 'true (0.30000000000000004)' },
      { label: 'Strict equality pitfall', input: '0.1 + 0.2 === 0.3', expected: 'false' },
    ],
  },
  '2.5': {
    keywords: ['falsy values', 'Boolean()', 'double bang !!', 'truthy'],
    syntax: '[false, 0, -0, 0n, "", null, undefined, NaN].every((v) => !Boolean(v));',
    testCases: [
      { label: 'All 8 falsy values', input: '[false, 0, -0, 0n, "", null, undefined, NaN].map(Boolean)', expected: '8 x false' },
      { label: 'Tricky truthy values', input: 'Boolean("0"), Boolean([]), Boolean({})', expected: 'true, true, true' },
    ],
  },
  '2.6': {
    keywords: ['exponentiation **', 'toFixed', 'Number()', 'conditional range'],
    syntax: 'const bmi = +(weightKg / heightM ** 2).toFixed(1);',
    testCases: [
      { label: 'Normal range', input: 'weight = 68, height = 1.75', expected: 'BMI 22.2 -> "Normal"' },
      { label: 'Overweight range', input: 'weight = 85, height = 1.72', expected: 'BMI 28.7 -> "Overweight"' },
    ],
  },

  '3.1': {
    keywords: ['for loop', 'modulo %', 'FizzBuzz', 'branch order'],
    syntax: 'for (let i = 1; i <= 100; i++) {\n  const out = (i % 3 === 0 ? "Fizz" : "") + (i % 5 === 0 ? "Buzz" : "");\n}',
    testCases: [
      { label: 'Multiple of both 3 & 5', input: 'i = 15', expected: '"FizzBuzz"' },
      { label: 'Prime non-multiple', input: 'i = 7', expected: '7' },
    ],
  },
  '3.2': {
    keywords: ['for loop', 'multiplication table', 'padStart', 'template literal'],
    syntax: 'for (let i = 1; i <= 10; i++) console.log(`${n} x ${i} = ${n * i}`);',
    testCases: [
      { label: 'First & last row (n=7)', input: 'n = 7, i = 1..10', expected: '"7 x 1 = 7" ... "7 x 10 = 70"' },
      { label: 'Zero multiplier', input: 'n = 0, i = 5', expected: '"0 x 5 = 0"' },
    ],
  },
  '3.3': {
    keywords: ['accumulator', 'while loop', 'for loop', 'factorial', 'BigInt'],
    syntax: 'let sum = 0, fact = 1;\nfor (let i = 1; i <= n; i++) { sum += i; fact *= i; }',
    testCases: [
      { label: 'n = 5', input: 'n = 5', expected: 'sum = 15, factorial = 120' },
      { label: 'Edge case n = 0', input: 'n = 0', expected: 'sum = 0, factorial = 1' },
    ],
  },
  '3.4': {
    keywords: ['String.repeat', 'nested loop', 'pattern printing', 'spaces'],
    syntax: 'for (let r = 1; r <= rows; r++) {\n  console.log(" ".repeat(rows - r) + "*".repeat(2 * r - 1));\n}',
    testCases: [
      { label: 'rows = 3 pyramid', input: 'rows = 3', expected: 'Lines: "  *", " ***", "*****"' },
      { label: 'Single row', input: 'rows = 1', expected: '"*"' },
    ],
  },
  '3.5': {
    keywords: ['while loop', 'break', 'attempt limit', 'Math.random'],
    syntax: 'let tries = 0;\nwhile (tries < 5) { tries++; if (guess === target) break; }',
    testCases: [
      { label: 'Exact guess within limit', input: 'target=42, guesses=[20, 50, 42]', expected: 'Won on attempt 3' },
      { label: 'Max attempts reached', input: '5 wrong guesses', expected: 'Loop stops after try 5 -> Game Over' },
    ],
  },
  '3.6': {
    keywords: ['Math.floor', 'modulo 10', 'while loop', 'digit extraction'],
    syntax: 'while (num > 0) {\n  const d = num % 10;\n  rev = rev * 10 + d;\n  num = Math.floor(num / 10);\n}',
    testCases: [
      { label: 'Four-digit input', input: 'n = 1234', expected: 'digitSum = 10, reversed = 4321' },
      { label: 'Single digit input', input: 'n = 7', expected: 'digitSum = 7, reversed = 7' },
    ],
  },

  '4.1': {
    keywords: ['Math.sqrt', 'function', 'prime check', 'early return'],
    syntax: 'function isPrime(n) {\n  if (n < 2) return false;\n  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;\n  return true;\n}',
    testCases: [
      { label: 'Composite vs prime', input: 'isPrime(1), isPrime(2), isPrime(49)', expected: 'false, true, false' },
      { label: 'Range 1..50 count', input: 'primes up to 50', expected: '15 primes ending at 47' },
    ],
  },
  '4.2': {
    keywords: ['functions', 'return object', 'empty array guard', 'Math.min/max'],
    syntax: 'function arrayStats(nums) {\n  if (nums.length === 0) return null;\n  return { max, min, avg };\n}',
    testCases: [
      { label: 'Mixed integers', input: '[10, 2, 38, 22]', expected: '{ max: 38, min: 2, avg: 18 }' },
      { label: 'Empty input guard', input: '[]', expected: 'null (or guarded empty object)' },
    ],
  },
  '4.3': {
    keywords: ['recursion', 'base case', 'memoization', 'Map'],
    syntax: 'function fib(n, memo = new Map()) {\n  if (n <= 1) return n;\n  if (!memo.has(n)) memo.set(n, fib(n - 1, memo) + fib(n - 2, memo));\n  return memo.get(n);\n}',
    testCases: [
      { label: 'Base & recursive factorial', input: 'fact(0), fact(6)', expected: '1, 720' },
      { label: 'Memoized large Fibonacci', input: 'fib(40)', expected: '102334155 (instant with memo)' },
    ],
  },
  '4.4': {
    keywords: ['higher-order function', 'callback', 'myMap', 'immutability'],
    syntax: 'function myMap(arr, fn) {\n  const out = [];\n  for (let i = 0; i < arr.length; i++) out.push(fn(arr[i], i, arr));\n  return out;\n}',
    testCases: [
      { label: 'Transform & index access', input: 'myMap([10, 20, 30], (v, i) => v + i)', expected: '[10, 21, 32]' },
      { label: 'Input array unchanged', input: 'original [1, 2]', expected: 'Original stays [1, 2]' },
    ],
  },
  '4.5': {
    keywords: ['closure', 'lexical scope', 'encapsulation', 'factory'],
    syntax: 'function makeCounter(start = 0) {\n  let count = start;\n  return { inc: () => ++count, dec: () => --count, reset: () => (count = start) };\n}',
    testCases: [
      { label: 'Independent instances', input: 'c1 = makeCounter(10); c2 = makeCounter(); c1.inc()', expected: 'c1=11 while c2=0' },
      { label: 'Reset state', input: 'c1.inc(); c1.reset()', expected: 'Restores count to initial start value' },
    ],
  },
  '4.6': {
    keywords: ['compose', 'rest parameters', 'reduceRight', 'pure functions'],
    syntax: 'const compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);',
    testCases: [
      { label: 'Right-to-left pipeline', input: 'compose(double, addOne)(4)', expected: '10 (4 -> +1=5 -> *2=10)' },
      { label: '3-function string/number pipe', input: 'compose(square, double, inc)(2)', expected: '36' },
    ],
  },

  '5.1': {
    keywords: ['setTimeout', 'var vs let', 'block scope', 'IIFE', 'closure'],
    syntax: 'for (let i = 0; i < 3; i++) setTimeout(() => console.log(i), 10);',
    testCases: [
      { label: 'Loop with var (shared)', input: 'for (var i = 0; i < 3; i++)', expected: 'Logs 3, 3, 3' },
      { label: 'Loop with let (per-iteration)', input: 'for (let i = 0; i < 3; i++)', expected: 'Logs 0, 1, 2' },
    ],
  },
  '5.2': {
    keywords: ['closure', 'private state', 'validation', 'factory function'],
    syntax: 'function createAccount(initial = 0) {\n  let balance = initial;\n  return { deposit, withdraw, getBalance: () => balance };\n}',
    testCases: [
      { label: 'Overdraft rejection', input: 'balance=100; withdraw(250)', expected: 'Rejects withdrawal; balance stays 100' },
      { label: 'Private balance check', input: 'account.balance', expected: 'undefined (only accessible via methods)' },
    ],
  },
  '5.3': {
    keywords: ['once', 'higher-order function', 'closure', 'cached result'],
    syntax: 'function once(fn) {\n  let called = false, res;\n  return (...args) => (called ? res : ((called = true), (res = fn(...args))));\n}',
    testCases: [
      { label: 'Invoke 3 times', input: 'init = once(fn); init(); init(); init()', expected: 'Underlying fn executes strictly 1 time' },
      { label: 'Return cached value', input: 'first call returns 42', expected: 'Subsequent calls also return 42' },
    ],
  },
  '5.4': {
    keywords: ['memoize', 'Map', 'cache key', 'JSON.stringify'],
    syntax: 'function memoize(fn) {\n  const cache = new Map();\n  return (...args) => cache.get(key) ?? cache.set(key, fn(...args)).get(key);\n}',
    testCases: [
      { label: 'Cache hit', input: 'slowAdd(3, 4) called twice', expected: 'Computes once, returns 7 from cache second time' },
      { label: 'Different args', input: 'slowAdd(3, 4) vs slowAdd(3, 5)', expected: 'Distinct cache entries: 7 and 8' },
    ],
  },
  '5.5': {
    keywords: ['debounce', 'clearTimeout', 'setTimeout', 'closure'],
    syntax: 'function debounce(fn, ms) {\n  let id;\n  return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };\n}',
    testCases: [
      { label: 'Rapid burst calls', input: '3 calls within 50ms for 200ms debounce', expected: 'Only the last call executes after 200ms idle' },
      { label: 'Forwards latest args', input: 'search("j"), search("js")', expected: 'Calls fn with "js"' },
    ],
  },
  '5.6': {
    keywords: ['hoisting', 'execution context', 'TDZ', 'function expression'],
    syntax: 'sayHi(); // OK\nfunction sayHi() {}\n// greet(); // TypeError if var, ReferenceError if const',
    testCases: [
      { label: 'var function expression call early', input: 'fn(); var fn = () => 1;', expected: 'TypeError: fn is not a function' },
      { label: 'Function declaration inside scope', input: 'declare(); function declare() { return "ok"; }', expected: '"ok"' },
    ],
  },

  '6.1': {
    keywords: ['Set', 'Array.sort', 'numeric comparator', 'deduplicate'],
    syntax: 'const uniqueSorted = [...new Set(arr)].sort((a, b) => a - b);',
    testCases: [
      { label: 'Numeric sort order', input: '[10, 2, 10, 1, 20, 2]', expected: '[1, 2, 10, 20] (NOT lexicographical [1,10,2,20])' },
      { label: 'Negatives included', input: '[-5, 0, -5, 3]', expected: '[-5, 0, 3]' },
    ],
  },
  '6.2': {
    keywords: ['Array.reduce', 'toSorted', 'immutability', 'objects array'],
    syntax: 'const avg = students.reduce((s, x) => s + x.score, 0) / students.length;',
    testCases: [
      { label: 'Find topper & mean', input: '[{name:"A",score:80},{name:"B",score:95}]', expected: 'top: "B", average: 87.5' },
      { label: 'Non-mutating', input: 'original array check', expected: 'Input array order remains unchanged' },
    ],
  },
  '6.3': {
    keywords: ['Array.slice', 'chunking', 'loop step', 'arrays'],
    syntax: 'for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));',
    testCases: [
      { label: 'Even + remainder chunk', input: 'chunk([1,2,3,4,5,6,7], 3)', expected: '[[1,2,3], [4,5,6], [7]]' },
      { label: 'Empty input', input: 'chunk([], 3)', expected: '[]' },
    ],
  },
  '6.4': {
    keywords: ['Two Sum', 'Map', 'O(n) lookup', 'complement'],
    syntax: 'const seen = new Map();\nfor (let i = 0; i < nums.length; i++) {\n  const need = target - nums[i];\n  if (seen.has(need)) return [seen.get(need), i];\n  seen.set(nums[i], i);\n}',
    testCases: [
      { label: 'Standard pair', input: 'nums=[2, 7, 11, 15], target=9', expected: '[0, 1]' },
      { label: 'Duplicate number pair', input: 'nums=[3, 3], target=6', expected: '[0, 1]' },
    ],
  },
  '6.5': {
    keywords: ['modulo wrap', 'slice', 'in-place reversal', 'rotate array'],
    syntax: 'const kNorm = k % arr.length;\nconst rotated = [...arr.slice(-kNorm), ...arr.slice(0, -kNorm)];',
    testCases: [
      { label: 'k smaller than length', input: 'rotate([1,2,3,4,5], 2)', expected: '[4, 5, 1, 2, 3]' },
      { label: 'k larger than length', input: 'rotate([1,2,3], 7)', expected: '[3, 1, 2] (7 % 3 = 1)' },
    ],
  },
  '6.6': {
    keywords: ['Object.groupBy', 'Array.reduce', 'grouping', 'frequency'],
    syntax: 'const grouped = Object.groupBy(items, (item) => item.category);',
    testCases: [
      { label: 'Group by category', input: '[{name:"Pen",cat:"Office"},{name:"Mug",cat:"Home"},{name:"Pad",cat:"Office"}]', expected: '{ Office: [Pen, Pad], Home: [Mug] }' },
      { label: 'Empty list', input: '[]', expected: '{}' },
    ],
  },

  '7.1': {
    keywords: ['palindrome', 'RegExp', 'toLowerCase', 'two pointers'],
    syntax: 'const clean = s.toLowerCase().replace(/[^a-z0-9]/g, "");\nreturn clean === [...clean].reverse().join("");',
    testCases: [
      { label: 'Phrase with punctuation', input: '"A man, a plan, a canal: Panama"', expected: 'true' },
      { label: 'Non-palindrome', input: '"JavaScript"', expected: 'false' },
    ],
  },
  '7.2': {
    keywords: ['vowels', 'RegExp', 'character counting', 'strings'],
    syntax: 'const vowels = (s.match(/[aeiou]/gi) ?? []).length;',
    testCases: [
      { label: 'Mixed letters & spaces', input: '"Hello JS 2025!"', expected: 'vowels: 2, consonants: 5' },
      { label: 'Empty or digits only', input: '"1234!"', expected: 'vowels: 0, consonants: 0' },
    ],
  },
  '7.3': {
    keywords: ['Map', 'word frequency', 'split(/\\W+/)', 'sorting'],
    syntax: 'const words = text.toLowerCase().match(/\\b[a-z]+\\b/g) ?? [];',
    testCases: [
      { label: 'Top 3 frequent words', input: '"js is fun and js is fast fun"', expected: '[["js",2],["is",2],["fun",2]]' },
      { label: 'Punctuation insensitive', input: '"Code, code! CODE."', expected: '[["code",3]]' },
    ],
  },
  '7.4': {
    keywords: ['Title Case', 'slice', 'toUpperCase', 'map'],
    syntax: 's.trim().split(/\\s+/).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ")',
    testCases: [
      { label: 'Extra spaces & caps', input: '"  hello   wORLD of JS "', expected: '"Hello World Of Js"' },
      { label: 'Single lowercase word', input: '"node"', expected: '"Node"' },
    ],
  },
  '7.5': {
    keywords: ['RegExp.test', 'email regex', 'validation', 'anchors ^ $'],
    syntax: 'const isEmail = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email);\nconst isIndianPhone = /^[6-9]\\d{9}$/.test(phone);',
    testCases: [
      { label: 'Valid inputs', input: '"dev@site.in", "9876543210"', expected: 'email: true, phone: true' },
      { label: 'Malformed inputs', input: '"bad@site", "12345"', expected: 'email: false, phone: false' },
    ],
  },
  '7.6': {
    keywords: ['anagrams', 'Map', 'canonical key', 'Object.values'],
    syntax: 'const key = [...word].sort().join("");\nclusters.set(key, [...(clusters.get(key) ?? []), word]);',
    testCases: [
      { label: 'Standard anagram groups', input: '["eat","tea","tan","ate","nat","bat"]', expected: '[["eat","tea","ate"],["tan","nat"],["bat"]]' },
      { label: 'Single item', input: '[""]', expected: '[[""]]' },
    ],
  },

  '8.1': {
    keywords: ['structuredClone', 'deep copy', 'shallow copy pitfall', 'reference'],
    syntax: 'const copy = structuredClone(original);',
    testCases: [
      { label: 'Mutate nested copy', input: 'copy.meta.tags.push("new")', expected: 'original.meta.tags remains unchanged' },
      { label: 'Handles Date & nested objects', input: 'copy.createdAt instanceof Date', expected: 'true' },
    ],
  },
  '8.2': {
    keywords: ['Object.entries', 'Object.fromEntries', 'key-value inversion'],
    syntax: 'const swapped = Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));',
    testCases: [
      { label: 'Swap status codes', input: '{ ok: 200, missing: 404 }', expected: '{ "200": "ok", "404": "missing" }' },
      { label: 'Key order preserved', input: '{ a: "x", b: "y" }', expected: '{ x: "a", y: "b" }' },
    ],
  },
  '8.3': {
    keywords: ['this', 'object methods', 'Array.reduce', 'method chaining'],
    syntax: 'const cart = { items: [], add(item) { this.items.push(item); return this; }, total() { ... } };',
    testCases: [
      { label: 'Add & sum total', input: 'cart.add({price:200,qty:2}).add({price:50,qty:1}).total()', expected: '450' },
      { label: 'Remove item by name', input: 'cart.remove("Book")', expected: 'Decrements items and updates total' },
    ],
  },
  '8.4': {
    keywords: ['this binding', 'Function.bind', 'call', 'apply'],
    syntax: 'const boundFn = user.greet.bind(user);\nuser.greet.call(otherUser, "Hello");',
    testCases: [
      { label: 'Detached callback fixed with bind', input: 'const fn = user.greet.bind(user); fn()', expected: 'Reads user.name instead of undefined' },
      { label: 'call vs apply args', input: 'greet.call(u, "Hi") vs greet.apply(u, ["Hi"])', expected: 'Identical bound invocation' },
    ],
  },
  '8.5': {
    keywords: ['safe property access', 'reduce', 'optional chaining', 'nullish fallback'],
    syntax: 'function get(obj, path, fallback) {\n  return path.split(".").reduce((acc, k) => acc?.[k], obj) ?? fallback;\n}',
    testCases: [
      { label: 'Deep hit', input: 'get({ user: { addr: { city: "Pune" } } }, "user.addr.city")', expected: '"Pune"' },
      { label: 'Missing intermediate key', input: 'get({ user: {} }, "user.addr.city", "N/A")', expected: '"N/A" (no TypeError)' },
    ],
  },
  '8.6': {
    keywords: ['JSON.parse', 'JSON.stringify', 'try / catch', 'safe wrapper'],
    syntax: 'function readJSON(raw, fallback = null) {\n  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }\n}',
    testCases: [
      { label: 'Corrupt JSON recovery', input: 'readJSON("{bad json", [])', expected: '[] (no uncaught SyntaxError)' },
      { label: 'Round-trip object', input: 'readJSON(JSON.stringify({ theme: "dark" }))', expected: '{ theme: "dark" }' },
    ],
  },

  '9.1': {
    keywords: ['Set', 'union', 'intersection', 'difference'],
    syntax: 'const union = new Set([...a, ...b]);\nconst intersection = new Set([...a].filter((x) => b.has(x)));',
    testCases: [
      { label: 'Union & intersection', input: 'A={1,2,3}, B={2,3,4}', expected: 'union={1,2,3,4}, intersection={2,3}' },
      { label: 'Disjoint sets', input: 'A={1,2}, B={3,4}', expected: 'intersection={}' },
    ],
  },
  '9.2': {
    keywords: ['ES Modules', 'named export', 'default export', 'import'],
    syntax: 'export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));\nexport default { clamp };',
    testCases: [
      { label: 'Named utility clamp', input: 'clamp(150, 0, 100)', expected: '100' },
      { label: 'Named vs default contract', input: 'export { add, clamp } + default', expected: 'Matches ESM module import/export signatures' },
    ],
  },
  '9.3': {
    keywords: ['generator function*', 'yield', 'Symbol.iterator', 'lazy'],
    syntax: 'function* idGen(prefix = "ID", start = 1) {\n  let n = start;\n  while (true) yield `${prefix}-${n++}`;\n}',
    testCases: [
      { label: 'Sequential lazy values', input: 'g.next().value twice', expected: '"ID-1", "ID-2"' },
      { label: 'Infinite without crash', input: 'while (true) yields only on .next()', expected: 'O(1) memory, never hangs' },
    ],
  },
  '9.4': {
    keywords: ['destructuring', 'default parameters', 'nested rename', 'options object'],
    syntax: 'function connect({ host = "localhost", port = 5432, tls = false } = {}) { ... }',
    testCases: [
      { label: 'Called with no args', input: 'connect()', expected: 'Uses localhost:5432 without TypeError' },
      { label: 'Partial override', input: 'connect({ port: 8080 })', expected: 'localhost:8080, tls: false' },
    ],
  },
  '9.5': {
    keywords: ['Object.groupBy', 'Map.groupBy', 'ES2024', 'reduce'],
    syntax: 'const byRole = Object.groupBy(users, (u) => u.role);',
    testCases: [
      { label: 'Group users by role', input: '[{n:"A",role:"admin"},{n:"B",role:"user"}]', expected: '{ admin: [A], user: [B] }' },
      { label: 'Reduce polyfill fallback', input: 'Node < 21 fallback check', expected: 'Produce identical grouped plain object' },
    ],
  },
  '9.6': {
    keywords: ['optional chaining ?.', 'nullish coalescing ??', '0 vs undefined'],
    syntax: 'const retries = config?.network?.retries ?? 3;',
    testCases: [
      { label: 'Zero preserved by ??', input: 'config = { network: { retries: 0 } }', expected: '0 (unlike || which wrongly gives 3)' },
      { label: 'Missing nested key', input: 'config = {}', expected: '3' },
    ],
  },

  '10.1': {
    keywords: ['class', 'extends', 'super()', 'polymorphism'],
    syntax: 'class Circle extends Shape {\n  constructor(r) { super("Circle"); this.r = r; }\n  area() { return +(Math.PI * this.r ** 2).toFixed(2); }\n}',
    testCases: [
      { label: 'Circle & Rectangle areas', input: 'Circle(5), Rectangle(4, 6)', expected: '78.54 and 24' },
      { label: 'instanceof hierarchy', input: 'c instanceof Shape', expected: 'true' },
    ],
  },
  '10.2': {
    keywords: ['private fields #', 'encapsulation', 'getter', 'class'],
    syntax: 'class BankAccount {\n  #balance = 0;\n  get balance() { return this.#balance; }\n}',
    testCases: [
      { label: 'Valid deposit & withdraw', input: 'deposit(500); withdraw(200)', expected: 'acc.balance === 300' },
      { label: 'Direct private access rejected', input: 'acc.#balance', expected: 'SyntaxError: Private field must be declared in an enclosing class' },
    ],
  },
  '10.3': {
    keywords: ['Object.getPrototypeOf', 'prototype chain', '__proto__', 'null root'],
    syntax: 'while (cur) { chain.push(cur.constructor?.name); cur = Object.getPrototypeOf(cur); }',
    testCases: [
      { label: 'Array prototype chain', input: 'getChain([])', expected: 'Array.prototype -> Object.prototype -> null' },
      { label: 'Null-prototype object', input: 'Object.create(null)', expected: 'Chain stops immediately at null' },
    ],
  },
  '10.4': {
    keywords: ['Stack LIFO', 'Queue FIFO', 'class', 'data structures'],
    syntax: 'class Stack { #items = []; push(x) { this.#items.push(x); } pop() { return this.#items.pop(); } }',
    testCases: [
      { label: 'Stack LIFO order', input: 'push(1), push(2), pop()', expected: '2' },
      { label: 'Queue FIFO order', input: 'enqueue(1), enqueue(2), dequeue()', expected: '1' },
    ],
  },
  '10.5': {
    keywords: ['EventEmitter', 'Map', 'Set', 'on / off / emit'],
    syntax: 'on(evt, fn) { ... } off(evt, fn) { ... } emit(evt, data) { ... }',
    testCases: [
      { label: 'Emit delivers payload', input: 'on("save", fn); emit("save", { id: 1 })', expected: 'fn receives { id: 1 }' },
      { label: 'Unsubscribe stops delivery', input: 'off("save", fn); emit("save")', expected: 'fn is NOT called' },
    ],
  },
  '10.6': {
    keywords: ['factory function', 'class', 'composition', 'OOP tradeoffs'],
    syntax: 'const canLog = (state) => ({ log: () => state.name });',
    testCases: [
      { label: 'Closure privacy without #', input: 'factory state not on returned object', expected: 'Object.keys(inst) excludes private state' },
      { label: 'Shared prototype memory', input: 'new ClassA().greet === new ClassA().greet', expected: 'true (method shared on prototype)' },
    ],
  },

  '11.1': {
    keywords: ['querySelector', 'textContent', 'addEventListener', 'DOM'],
    syntax: 'btn.addEventListener("click", () => { heading.textContent = "Updated!"; });',
    testCases: [
      { label: 'Button click toggles heading', input: 'Click #toggleBtn', expected: 'Heading text & color update immediately' },
      { label: 'Repeated click resets', input: 'Click #toggleBtn twice', expected: 'Alternates cleanly between states' },
    ],
  },
  '11.2': {
    keywords: ['createElement', 'DocumentFragment', 'textContent', 'XSS-safe'],
    syntax: 'const li = document.createElement("li"); li.textContent = item; frag.append(li);',
    testCases: [
      { label: 'Render item array', input: '["DOM", "Events", "Fetch"]', expected: '3 safe <li> nodes inside <ul>' },
      { label: 'HTML payload escaped', input: 'item = "<img src=x onerror=alert(1)>"', expected: 'Rendered literally as text, script never runs' },
    ],
  },
  '11.3': {
    keywords: ['classList.toggle', 'localStorage', 'dark theme', 'CSS variables'],
    syntax: 'const isDark = document.body.classList.toggle("dark");\nlocalStorage.setItem("theme", isDark ? "dark" : "light");',
    testCases: [
      { label: 'Toggle theme state', input: 'Click theme switch', expected: 'Toggles .dark class & updates button label' },
      { label: 'Reload persistence', input: 'localStorage.getItem("theme") === "dark"', expected: 'Restores dark class automatically on load' },
    ],
  },
  '11.4': {
    keywords: ['tbody.append', 'Array.from', 'localeCompare', 'DOM sorting'],
    syntax: 'rows.sort((a, b) => Number(a.dataset.val) - Number(b.dataset.val));\ntbody.append(...rows);',
    testCases: [
      { label: 'Numeric column sort', input: 'Scores [42, 100, 9] ascending', expected: 'Rows reorder to 9, 42, 100' },
      { label: 'Toggle asc/desc direction', input: 'Click same header twice', expected: 'Reverses sorted row order' },
    ],
  },
  '11.5': {
    keywords: ['input event', 'textarea.value.length', 'remaining chars', 'warning class'],
    syntax: 'ta.addEventListener("input", () => { counter.textContent = `${140 - ta.value.length} left`; });',
    testCases: [
      { label: 'Near limit state', input: '125 characters typed (limit 140)', expected: '"15 left" with warning color class' },
      { label: 'Empty input', input: '""', expected: '"140 left", warning class removed' },
    ],
  },
  '11.6': {
    keywords: ['aria-expanded', 'accordion', 'classList', 'hidden'],
    syntax: 'btn.setAttribute("aria-expanded", String(open));\npanel.hidden = !open;',
    testCases: [
      { label: 'Single-open behavior', input: 'Click Q2 while Q1 is open', expected: 'Q1 closes and Q2 opens' },
      { label: 'Toggle self closed', input: 'Click open Q2 again', expected: 'Q2 closes (aria-expanded="false")' },
    ],
  },

  '12.1': {
    keywords: ['event delegation', 'e.target.closest', 'data-action', 'ul listener'],
    syntax: 'list.addEventListener("click", (e) => { const btn = e.target.closest("[data-del]"); });',
    testCases: [
      { label: 'Dynamically added row delete', input: 'Append new <li> after load and click Delete', expected: 'Single parent listener removes new item' },
      { label: 'Click on text label vs button', input: 'Click inside span text', expected: 'Closest checks guard and ignores non-button' },
    ],
  },
  '12.2': {
    keywords: ['keydown', 'e.ctrlKey', 'e.metaKey', 'preventDefault'],
    syntax: 'document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.focus(); } });',
    testCases: [
      { label: 'Shortcut pressed', input: 'Ctrl+K or Cmd+K', expected: 'Focus moves to #searchBox without browser search hijack' },
      { label: 'Escape blurs input', input: 'Escape while focused', expected: 'Clears or blurs search input cleanly' },
    ],
  },
  '12.3': {
    keywords: ['submit event', 'preventDefault', 'FormData', 'inline validation'],
    syntax: 'form.addEventListener("submit", (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); });',
    testCases: [
      { label: 'Empty/short password', input: 'email="a@b.com", pass="123"', expected: 'Shows inline field error; no page reload' },
      { label: 'Valid form submit', input: 'Valid email & 8+ char pass', expected: 'Displays structured payload summary' },
    ],
  },
  '12.4': {
    keywords: ['bubbling', 'capturing', '{ capture: true }', 'stopPropagation'],
    syntax: 'outer.addEventListener("click", log, true); // capture\ninner.addEventListener("click", log); // bubble',
    testCases: [
      { label: 'Click inner child', input: 'outer (capture) + inner (bubble) + outer (bubble)', expected: 'Logs: outer(capture) -> inner -> outer(bubble)' },
      { label: 'With e.stopPropagation()', input: 'Stop in middle box', expected: 'Outer bubble handler is skipped' },
    ],
  },
  '12.5': {
    keywords: ['mousemove', 'clientX', 'clientY', 'transform: translate'],
    syntax: 'stage.addEventListener("mousemove", (e) => { dot.style.transform = `translate(${e.offsetX}px, ${e.offsetY}px)`; });',
    testCases: [
      { label: 'Mouse move inside box', input: 'clientX=120, clientY=80', expected: 'Follower dot moves smoothly without layout thrash' },
      { label: 'Coordinate readout', input: 'Mouse leaves container', expected: 'Readout shows last position or resets' },
    ],
  },
  '12.6': {
    keywords: ['CustomEvent', 'dispatchEvent', 'detail payload', 'bubbles: true'],
    syntax: 'el.dispatchEvent(new CustomEvent("cart:add", { detail: { id: 7, qty: 1 }, bubbles: true }));',
    testCases: [
      { label: 'Cross-component event', input: 'Product card dispatches "cart:add"', expected: 'Parent navbar badge receives e.detail.qty' },
      { label: 'Bubbling flag omitted', input: 'bubbles: false', expected: 'Ancestor listener does not see event' },
    ],
  },

  '13.1': {
    keywords: ['Event Loop', 'Call Stack', 'Microtask Queue', 'Macrotask Queue'],
    syntax: 'console.log("1 sync");\nsetTimeout(() => console.log("4 macro"), 0);\nPromise.resolve().then(() => console.log("3 micro"));\nconsole.log("2 sync");',
    testCases: [
      { label: 'Sync -> Micro -> Macro', input: 'log + setTimeout(0) + Promise.then + log', expected: '1 sync -> 2 sync -> 3 micro -> 4 macro' },
      { label: 'Chained microtasks', input: 'Promise inside .then() before next timer', expected: 'All queued microtasks flush before any macrotask' },
    ],
  },
  '13.2': {
    keywords: ['Promise', 'async / await', 'Promise.all', 'concurrency'],
    syntax: 'const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\nawait Promise.all([sleep(100), sleep(100)]);',
    testCases: [
      { label: 'Sequential 3x50ms', input: 'await sleep(50); await sleep(50); await sleep(50)', expected: 'Total time >= 150ms' },
      { label: 'Parallel Promise.all', input: 'Promise.all([sleep(50), sleep(50), sleep(50)])', expected: 'Total time ~50ms (3x faster)' },
    ],
  },
  '13.3': {
    keywords: ['fetch', 'response.ok', 'try / catch', 'loading state'],
    syntax: 'const res = await fetch(url);\nif (!res.ok) throw new Error(`HTTP ${res.status}`);\nreturn res.json();',
    testCases: [
      { label: 'HTTP 404/500 guard', input: 'res = { ok: false, status: 404 }', expected: 'Explicitly throws Error("HTTP 404")' },
      { label: 'Success payload', input: 'res = { ok: true, json: () => [...] }', expected: 'Clears loading spinner & returns parsed list' },
    ],
  },
  '13.4': {
    keywords: ['retry', 'exponential backoff', 'async / await', 'resilience'],
    syntax: 'for (let i = 0; i < max; i++) { try { return await fn(); } catch (e) { if (i === max - 1) throw e; await sleep(base * 2 ** i); } }',
    testCases: [
      { label: 'Fails twice, succeeds 3rd', input: 'flakyFn (max = 3)', expected: 'Returns resolved value on attempt 3' },
      { label: 'All attempts fail', input: 'alwaysFailFn (max = 3)', expected: 'Rethrows last error after attempt 3' },
    ],
  },
  '13.5': {
    keywords: ['Promise.all polyfill', 'order preservation', 'fail-fast'],
    syntax: 'out[i] = val; if (++done === list.length) resolve(out);',
    testCases: [
      { label: 'Out-of-order resolve timings', input: '[sleep(40, "slow"), sleep(5, "fast")]', expected: 'Resolves ["slow", "fast"] in INPUT order' },
      { label: 'Empty input array', input: 'myPromiseAll([])', expected: 'Immediately resolves to []' },
    ],
  },
  '13.6': {
    keywords: ['AbortController', 'signal.aborted', 'debounce', 'race condition'],
    syntax: 'prevController?.abort();\nprevController = new AbortController();\nfetch(url, { signal: prevController.signal });',
    testCases: [
      { label: 'Rapid re-query cancels old', input: 'search("re") then immediately search("react")', expected: 'First signal becomes aborted === true; no stale overwrite' },
      { label: 'Ignore AbortError in catch', input: 'err.name === "AbortError"', expected: 'Swallows expected cancellation without UI error banner' },
    ],
  },

  '14.1': {
    keywords: ['try / catch', 'JSON.parse', 'SyntaxError', 'fallback'],
    syntax: 'function safeParse(str, fallback = null) {\n  try { return { ok: true, data: JSON.parse(str) }; } catch (e) { return { ok: false, error: e.message, data: fallback }; }\n}',
    testCases: [
      { label: 'Malformed string', input: 'safeParse("{name:}")', expected: '{ ok: false, data: null, error: ... }' },
      { label: 'Valid JSON', input: 'safeParse(\'{"a":1}\')', expected: '{ ok: true, data: { a: 1 } }' },
    ],
  },
  '14.2': {
    keywords: ['custom Error', 'extends Error', 'instanceof', 'error hierarchy'],
    syntax: 'class ValidationError extends Error {\n  constructor(msg, field) { super(msg); this.name = "ValidationError"; this.field = field; }\n}',
    testCases: [
      { label: 'Instance check', input: 'new ValidationError("Bad email", "email")', expected: 'err instanceof Error && err instanceof ValidationError' },
      { label: 'HTTP status on NetworkError', input: 'new NetworkError("Timeout", 504)', expected: 'err.status === 504, err.name === "NetworkError"' },
    ],
  },
  '14.3': {
    keywords: ['debugging', 'coercion bug', 'Number()', 'type mismatch'],
    syntax: '// Bug: "100" + 20 -> "10020"\n// Fix: Number(price) + Number(tax)',
    testCases: [
      { label: 'String + number bug fixed', input: 'calcTotal("199.50", 20)', expected: '219.5 (number, not "199.5020")' },
      { label: 'Off-by-one tax rate', input: 'price=100, taxPct=18', expected: '118' },
    ],
  },
  '14.4': {
    keywords: ['error logger', 'try / catch', 'cause', 'observability'],
    syntax: 'function logError(err, ctx = {}) {\n  return { ts: new Date().toISOString(), name: err.name, message: err.message, ctx };\n}',
    testCases: [
      { label: 'Structured error report', input: 'logError(new TypeError("Bad"), { route: "/pay" })', expected: 'Object with ts, name="TypeError", message="Bad", ctx' },
      { label: 'Non-Error thrown safety', input: 'logError("plain string error")', expected: 'Handles safely without crashing logger' },
    ],
  },
  '14.5': {
    keywords: ['validator', 'error collection', 'RegExp', 'schema rules'],
    syntax: 'const errors = [];\nif (!isEmail(d.email)) errors.push({ field: "email", msg: "Invalid" });',
    testCases: [
      { label: 'Multiple invalid fields', input: '{ email: "x", age: 12, password: "1" }', expected: 'Returns ALL 3 errors instead of stopping at #1' },
      { label: 'All valid', input: '{ email: "a@b.co", age: 22, password: "Strong1!" }', expected: '{ valid: true, errors: [] }' },
    ],
  },
  '14.6': {
    keywords: ['finally', 'cleanup', 'async / await', 'state reset'],
    syntax: 'loading = true;\ntry { return await task(); } finally { loading = false; }',
    testCases: [
      { label: 'Task succeeds', input: 'Promise.resolve("OK")', expected: 'Returns "OK" AND sets loading = false' },
      { label: 'Task throws error', input: 'Promise.reject(new Error("Boom"))', expected: 'Sets loading = false BEFORE propagating error' },
    ],
  },

  '15.1': {
    keywords: ['node:fs/promises', 'readFile', 'word count', 'async Node'],
    syntax: 'import { readFile } from "node:fs/promises";\nconst text = await readFile("notes.txt", "utf8");',
    testCases: [
      { label: 'Count lines & words', input: '"Hello Node\\nFast JS runtime"', expected: 'lines: 2, words: 5' },
      { label: 'Missing file handling', input: 'ENOENT error code', expected: 'Catches error cleanly and reports missing path' },
    ],
  },
  '15.2': {
    keywords: ['node:http', 'createServer', 'JSON response', '404'],
    syntax: 'if (req.url === "/api/health" && req.method === "GET") { res.writeHead(200, { "Content-Type": "application/json" }); }',
    testCases: [
      { label: 'GET /api/health', input: '{ method: "GET", url: "/api/health" }', expected: '200 OK { status: "ok" }' },
      { label: 'Unknown route', input: '{ method: "GET", url: "/unknown" }', expected: '404 Not Found JSON error' },
    ],
  },
  '15.3': {
    keywords: ['Express', 'GET / POST', 'express.json()', 'status 201 / 400'],
    syntax: 'app.post("/todos", (req, res) => {\n  if (!req.body?.title) return res.status(400).json({ error: "title required" });\n  res.status(201).json(todo);\n});',
    testCases: [
      { label: 'Valid POST /todos', input: '{ title: "Ship MVP" }', expected: '201 Created with generated id & done: false' },
      { label: 'Missing title', input: '{}', expected: '400 Bad Request { error: "title required" }' },
    ],
  },
  '15.4': {
    keywords: ['package.json', 'npm scripts', 'type: module', 'NODE_ENV'],
    syntax: '{ "type": "module", "scripts": { "dev": "node --watch src/index.js", "start": "node src/index.js" } }',
    testCases: [
      { label: 'Validate ESM config', input: '"type": "module"', expected: 'Allows import/export without .mjs extension' },
      { label: 'Built-in watch & env', input: 'node --watch --env-file=.env app.js', expected: 'Zero-dep hot reload & env loading in Node 22' },
    ],
  },
  '15.5': {
    keywords: ['Git workflow', 'branch', 'commit', 'merge conflict'],
    syntax: 'git switch -c feat/auth && git add -A && git commit -m "feat: add auth"',
    testCases: [
      { label: 'Feature branch flow', input: 'branch -> edit -> stage -> commit -> merge', expected: 'Clean non-destructive history on main' },
      { label: 'Undo uncommitted change safely', input: 'git restore <file>', expected: 'Reverts working copy without losing commits' },
    ],
  },
  '15.6': {
    keywords: ['Vite', 'ESM bundler', 'import.meta.env', 'npm run build'],
    syntax: 'npm create vite@latest my-app -- --template vanilla\nnpm run build',
    testCases: [
      { label: 'Client env exposure rule', input: 'VITE_API_URL vs SECRET_KEY', expected: 'Only VITE_* vars are exposed to browser bundle' },
      { label: 'Production bundle check', input: 'npm run build -> dist/', expected: 'Minified, hashed assets ready for static deploy' },
    ],
  },

  '16.1': {
    keywords: ['Stack', 'balanced brackets', 'Map', 'O(n) time'],
    syntax: 'const pairs = { ")": "(", "]": "[", "}": "{" };\n// Push openers; on closer assert stack.pop() === pairs[ch]',
    testCases: [
      { label: 'Nested valid brackets', input: '"({[]})"', expected: 'true' },
      { label: 'Mismatched / unclosed', input: '"([)]" or "(("', expected: 'false' },
    ],
  },
  '16.2': {
    keywords: ["Kadane's Algorithm", 'max subarray', 'O(n)', 'dynamic programming'],
    syntax: 'cur = Math.max(x, cur + x); best = Math.max(best, cur);',
    testCases: [
      { label: 'Mixed positive/negative', input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expected: '6 (subarray [4,-1,2,1])' },
      { label: 'All negative array', input: '[-8, -3, -6]', expected: '-3 (never wrongly resets to 0)' },
    ],
  },
  '16.3': {
    keywords: ['Sliding Window', 'Map', 'longest substring', 'O(n)'],
    syntax: 'if (lastIdx.get(ch) >= left) left = lastIdx.get(ch) + 1;\nlastIdx.set(ch, right);',
    testCases: [
      { label: 'Repeating chars', input: '"abcabcbb"', expected: '3 ("abc")' },
      { label: 'Inner overlap edge case', input: '"abba"', expected: '2 ("ab" or "ba")' },
    ],
  },
  '16.4': {
    keywords: ['Binary Tree', 'DFS inorder', 'tree height', 'recursion'],
    syntax: 'const height = (n) => (n ? 1 + Math.max(height(n.left), height(n.right)) : 0);',
    testCases: [
      { label: 'Inorder traversal (L-N-R)', input: 'Tree: 2 <- 4 -> 5', expected: '[2, 4, 5]' },
      { label: 'Empty tree height', input: 'null', expected: '0' },
    ],
  },
  '16.5': {
    keywords: ['Dynamic Programming', 'tabulation', 'Climbing Stairs', 'Coin Change'],
    syntax: 'dp[i] = Math.min(dp[i], dp[i - coin] + 1);',
    testCases: [
      { label: 'Climbing Stairs n=5', input: 'climbStairs(5)', expected: '8 distinct ways' },
      { label: 'Coin Change impossible', input: 'coins=[2], amount=3', expected: '-1' },
    ],
  },
  '16.6': {
    keywords: ['Graph BFS', 'Queue', 'shortest path', 'Set visited'],
    syntax: 'const q = [[start, 0]]; const seen = new Set([start]);',
    testCases: [
      { label: 'Shortest edge count', input: 'A-B-D vs A-C-E-D (start A, target D)', expected: '2 hops' },
      { label: 'Unreachable node', input: 'Disconnected target Z', expected: '-1' },
    ],
  },
};

