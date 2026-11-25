/**
 * Progressive, multi-step guided scaffolds for Projects 1 through 12.
 * Each project gives students a clean UI shell + partial starter code + explicit
 * `// TODO (Step X)` instructions so students build each milestone themselves.
 * Every milestone includes testCases, 3 progressive hints, and a hidden
 * Reference Checkpoint solutionCode inside the collapsible drawer.
 */

module.exports = {
  1: {
    overview: {
      keywords: ['DOM', 'Number()', 'Intl.NumberFormat', 'events', 'validation'],
      definition: 'Build an interactive Tip & Bill Splitter that validates bill/headcount inputs, computes tip + split per person via pure functions, and formats currency cleanly.',
      syntax: 'function calcSplit(bill, tipPct, people) {\n  return { tip, total, perPerson };\n}',
      architecture: [
        'UI Shell -> Inputs for Bill (#bill), Tip % (#pct), People (#people), and output badges',
        'Milestone 1 -> Wire DOM elements and implement pure calcSplit(bill, pct, people)',
        'Milestone 2 -> Add preset tip chips, Enter-key shortcut, and positive-number validation',
        'Milestone 3 -> Format currency with Intl.NumberFormat("en-IN") + live reset button',
      ],
      testCases: [
        { label: 'Standard 3-way split', input: 'bill=1200, pct=10, people=3', expected: 'tip=120, total=1320, perPerson=440' },
        { label: 'Zero people guard', input: 'bill=500, pct=15, people=0', expected: 'Inline error shown; never shows Infinity or NaN' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>P1: Tip & Bill Splitter</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 440px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
    input { flex: 1; min-width: 100px; padding: 8px 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    button.sec { background: #334155; color: #e2e8f0; }
    .err { color: #f87171; font-size: 13px; min-height: 18px; margin-top: 6px; }
    .out { margin-top: 12px; padding: 12px; border-radius: 8px; background: #0f172a; border: 1px solid #334155; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Tip & Bill Splitter</h2>
    <div class="row">
      <input id="bill" type="number" placeholder="Bill (Rs)" value="1200" />
      <input id="pct" type="number" placeholder="Tip %" value="10" />
      <input id="people" type="number" placeholder="People" value="3" />
    </div>
    <div class="row">
      <button type="button" class="sec" data-pct="10">10%</button>
      <button type="button" class="sec" data-pct="15">15%</button>
      <button type="button" class="sec" data-pct="20">20%</button>
      <button id="calcBtn" type="button">Calculate</button>
    </div>
    <div id="errMsg" class="err"></div>
    <div id="output" class="out">Tip: -- | Total: -- | Per Person: --</div>
  </div>
  <script>
    // Blueprint ready! Advance to Milestone 1 to implement JS logic step-by-step.
    console.log('P1 UI skeleton loaded');
  </script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — Pure Calculator & DOM Wiring',
        keywords: ['querySelector', 'Number()', 'addEventListener', 'toFixed'],
        definition: 'Write the pure calcSplit(bill, pct, people) helper and bind the Calculate button to update #output.',
        syntax: 'function calcSplit(bill, pct, people) {\n  const tip = (bill * pct) / 100;\n  return { tip, total: bill + tip, perPerson: (bill + tip) / people };\n}',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Select #bill, #pct, #people, #calcBtn, and #output using document.querySelector',
            'Step 2 -> Implement calcSplit(bill, pct, people) returning { tip, total, perPerson }',
            'Step 3 -> Attach a click handler on #calcBtn to read numeric values and render output text',
          ],
        }],
        testCases: [
          { label: 'Default inputs', input: 'bill=1200, pct=10, people=3', expected: 'Tip: 120.00 | Total: 1320.00 | Per Person: 440.00' },
          { label: 'Custom 15% split', input: 'bill=2000, pct=15, people=4', expected: 'Tip: 300.00 | Total: 2300.00 | Per Person: 575.00' },
        ],
        hints: [
          { step: 1, text: 'Always wrap DOM input values in Number(inputEl.value) — HTML inputs return strings.' },
          { step: 2, text: 'Inside calcSplit, compute tip = (bill * pct) / 100, total = bill + tip, perPerson = total / people.' },
          { step: 3, text: 'Use .toFixed(2) inside outputEl.textContent inside the click listener.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>P1 Milestone 1 — Tip & Bill Splitter</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 440px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
    input { flex: 1; min-width: 100px; padding: 8px 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    .out { margin-top: 12px; padding: 12px; border-radius: 8px; background: #0f172a; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Tip & Bill Splitter (Milestone 1)</h2>
    <div class="row">
      <input id="bill" type="number" placeholder="Bill" value="1200" />
      <input id="pct" type="number" placeholder="Tip %" value="10" />
      <input id="people" type="number" placeholder="People" value="3" />
    </div>
    <button id="calcBtn" type="button">Calculate</button>
    <div id="output" class="out">Click Calculate to run your function...</div>
  </div>
  <script>
    // TODO (Step 1): Select #bill, #pct, #people, #calcBtn, and #output
    const billEl = document.querySelector('#bill');
    const pctEl = document.querySelector('#pct');
    const peopleEl = document.querySelector('#people');
    const calcBtn = document.querySelector('#calcBtn');
    const outputEl = document.querySelector('#output');

    // TODO (Step 2): Return { tip, total, perPerson }
    function calcSplit(bill, pct, people) {
      // Write your math formula here
      return { tip: 0, total: 0, perPerson: 0 };
    }

    // TODO (Step 3): Attach click listener on calcBtn to run calcSplit() and update outputEl.textContent
    calcBtn.addEventListener('click', () => {
      // Read Number(billEl.value), etc., call calcSplit, and update outputEl.textContent
    });
  </script>
</body>
</html>`,
        solutionCode: `<script>
  const billEl = document.querySelector('#bill');
  const pctEl = document.querySelector('#pct');
  const peopleEl = document.querySelector('#people');
  const calcBtn = document.querySelector('#calcBtn');
  const outputEl = document.querySelector('#output');

  function calcSplit(bill, pct, people) {
    const tip = (bill * pct) / 100;
    const total = bill + tip;
    return { tip, total, perPerson: total / people };
  }

  function render() {
    const res = calcSplit(Number(billEl.value), Number(pctEl.value), Number(peopleEl.value) || 1);
    outputEl.textContent = \`Tip: \${res.tip.toFixed(2)} | Total: \${res.total.toFixed(2)} | Per Person: \${res.perPerson.toFixed(2)}\`;
  }

  calcBtn.addEventListener('click', render);
</script>`,
      },
      {
        title: 'Milestone 2 — Preset Tip Chips & Validation Guards',
        keywords: ['dataset', 'keydown', 'guard clause', 'Number.isFinite'],
        definition: 'Prevent invalid negative/zero inputs and wire preset tip percentage buttons plus the Enter keyboard shortcut.',
        syntax: 'if (!Number.isFinite(bill) || bill <= 0) return showError("Bill must be > 0");',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Guard against NaN, negative bill/tip, and people <= 0 inside validateAndRender()',
            'Step 2 -> Listen on quick tip buttons [data-pct] to copy data-pct into #pct and recalculate',
            'Step 3 -> Handle Enter keydown on any input to trigger calculation cleanly',
          ],
        }],
        testCases: [
          { label: 'Zero people blocked', input: 'bill=1000, pct=10, people=0', expected: '#errMsg displays "People must be at least 1"' },
          { label: 'Click 15% preset chip', input: 'Click [data-pct="15"]', expected: '#pct updates to 15 and #output recalculates immediately' },
        ],
        hints: [
          { step: 1, text: 'Clear #errMsg before checking rules; if invalid, set errEl.textContent and return early.' },
          { step: 2, text: 'Use document.querySelectorAll("[data-pct]").forEach(...) to attach preset handlers.' },
          { step: 3, text: 'On input keydown: if (e.key === "Enter") validateAndRender().' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>P1 Milestone 2 — Validation & Presets</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 440px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
    input { flex: 1; min-width: 100px; padding: 8px 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    button.sec { background: #334155; color: #e2e8f0; }
    .err { color: #f87171; font-size: 13px; min-height: 18px; margin-top: 6px; }
    .out { margin-top: 12px; padding: 12px; border-radius: 8px; background: #0f172a; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Tip & Bill Splitter (Milestone 2)</h2>
    <div class="row">
      <input id="bill" type="number" value="1200" />
      <input id="pct" type="number" value="10" />
      <input id="people" type="number" value="3" />
    </div>
    <div class="row">
      <button type="button" class="sec" data-pct="10">10%</button>
      <button type="button" class="sec" data-pct="15">15%</button>
      <button type="button" class="sec" data-pct="20">20%</button>
      <button id="calcBtn" type="button">Calculate</button>
    </div>
    <div id="errMsg" class="err"></div>
    <div id="output" class="out">--</div>
  </div>
  <script>
    const billEl = document.querySelector('#bill');
    const pctEl = document.querySelector('#pct');
    const peopleEl = document.querySelector('#people');
    const errEl = document.querySelector('#errMsg');
    const outputEl = document.querySelector('#output');

    function calcSplit(bill, pct, people) {
      const tip = (bill * pct) / 100;
      return { tip, total: bill + tip, perPerson: (bill + tip) / people };
    }

    function validateAndRender() {
      const bill = Number(billEl.value);
      const pct = Number(pctEl.value);
      const people = Number(peopleEl.value);
      errEl.textContent = '';

      // TODO (Step 1): Validate bill > 0, pct >= 0, and people >= 1 (show error in errEl & return)

      const res = calcSplit(bill, pct, people);
      outputEl.textContent = \`Tip: \${res.tip.toFixed(2)} | Total: \${res.total.toFixed(2)} | Per Person: \${res.perPerson.toFixed(2)}\`;
    }

    document.querySelector('#calcBtn').addEventListener('click', validateAndRender);

    // TODO (Step 2): Wire all [data-pct] buttons to update pctEl.value and call validateAndRender()

    // TODO (Step 3): Trigger validateAndRender() when user presses Enter inside any input
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function validateAndRender() {
    const bill = Number(billEl.value);
    const pct = Number(pctEl.value);
    const people = Number(peopleEl.value);
    errEl.textContent = '';
    if (!Number.isFinite(bill) || bill <= 0) return (errEl.textContent = 'Bill must be greater than 0');
    if (!Number.isFinite(pct) || pct < 0) return (errEl.textContent = 'Tip % cannot be negative');
    if (!Number.isInteger(people) || people < 1) return (errEl.textContent = 'People must be a whole number >= 1');
    const res = calcSplit(bill, pct, people);
    outputEl.textContent = \`Tip: \${res.tip.toFixed(2)} | Total: \${res.total.toFixed(2)} | Per Person: \${res.perPerson.toFixed(2)}\`;
  }
  document.querySelectorAll('[data-pct]').forEach((btn) => {
    btn.addEventListener('click', () => { pctEl.value = btn.dataset.pct; validateAndRender(); });
  });
  [billEl, pctEl, peopleEl].forEach((el) => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') validateAndRender(); });
  });
</script>`,
      },
      {
        title: 'Milestone 3 — Currency Formatter, Live Sync & Reset',
        keywords: ['Intl.NumberFormat', 'input event', 'reset', 'formatting'],
        definition: 'Upgrade output to INR currency formatting via Intl.NumberFormat, enable instant input-event updates, and add a working Reset button.',
        syntax: 'const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Create reusable fmtINR(amount) formatter using Intl.NumberFormat("en-IN")',
            'Step 2 -> Attach "input" listeners so totals update smoothly as the user types',
            'Step 3 -> Implement #resetBtn to restore defaults (bill=1200, pct=10, people=3) cleanly',
          ],
        }],
        testCases: [
          { label: 'Indian currency formatting', input: '125000', expected: 'Formatted as Rs/INR grouping (1,25,000.00)' },
          { label: 'Reset button', input: 'Modify values, click Reset', expected: 'Inputs and errors reset to clean default split' },
        ],
        hints: [
          { step: 1, text: 'Define const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }); and call fmt.format(n).' },
          { step: 2, text: 'Listen to the "input" event on [billEl, pctEl, peopleEl] so live typing recalculates immediately.' },
          { step: 3, text: 'Reset button handler sets values back to 1200 / 10 / 3 and calls validateAndRender().' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>P1 Milestone 3 — Currency & Live Polish</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 440px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
    input { flex: 1; min-width: 100px; padding: 8px 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    button.sec { background: #334155; color: #e2e8f0; }
    .err { color: #f87171; font-size: 13px; min-height: 18px; margin-top: 6px; }
    .out { margin-top: 12px; padding: 12px; border-radius: 8px; background: #0f172a; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Tip & Bill Splitter (Milestone 3)</h2>
    <div class="row">
      <input id="bill" type="number" value="1200" />
      <input id="pct" type="number" value="10" />
      <input id="people" type="number" value="3" />
    </div>
    <div class="row">
      <button type="button" class="sec" data-pct="10">10%</button>
      <button type="button" class="sec" data-pct="15">15%</button>
      <button id="resetBtn" type="button" class="sec">Reset</button>
    </div>
    <div id="errMsg" class="err"></div>
    <div id="output" class="out">--</div>
  </div>
  <script>
    const billEl = document.querySelector('#bill');
    const pctEl = document.querySelector('#pct');
    const peopleEl = document.querySelector('#people');
    const errEl = document.querySelector('#errMsg');
    const outputEl = document.querySelector('#output');

    // TODO (Step 1): Create Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
    const fmtINR = (val) => val.toFixed(2); // Replace with Intl.NumberFormat

    function validateAndRender() {
      const bill = Number(billEl.value);
      const pct = Number(pctEl.value);
      const people = Number(peopleEl.value);
      errEl.textContent = '';
      if (!Number.isFinite(bill) || bill <= 0) return (errEl.textContent = 'Bill must be > 0');
      if (!Number.isInteger(people) || people < 1) return (errEl.textContent = 'People must be >= 1');
      const tip = (bill * Math.max(0, pct)) / 100;
      const total = bill + tip;
      outputEl.textContent = \`Tip: \${fmtINR(tip)} | Total: \${fmtINR(total)} | Each: \${fmtINR(total / people)}\`;
    }

    document.querySelectorAll('[data-pct]').forEach((btn) => {
      btn.addEventListener('click', () => { pctEl.value = btn.dataset.pct; validateAndRender(); });
    });

    // TODO (Step 2): Add live 'input' listener to [billEl, pctEl, peopleEl]

    // TODO (Step 3): Add click listener to #resetBtn restoring defaults and clearing errors

    validateAndRender();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
  const fmtINR = (val) => inr.format(val);
  [billEl, pctEl, peopleEl].forEach((el) => el.addEventListener('input', validateAndRender));
  document.querySelector('#resetBtn').addEventListener('click', () => {
    billEl.value = '1200';
    pctEl.value = '10';
    peopleEl.value = '3';
    validateAndRender();
  });
</script>`,
      },
    ],
  },

  2: {
    overview: {
      keywords: ['DOM', 'event delegation', 'localStorage', 'XSS safety', 'CRUD'],
      definition: 'Build a persistent Todo App with XSS-safe DOM creation, filter tabs (All/Active/Done), delegated row actions, and double-click inline editing.',
      syntax: 'li.append(checkbox, labelSpan, deleteBtn); // textContent prevents HTML injection',
      architecture: [
        'UI Shell -> Form input, All/Active/Done filter tabs, #todoList, and #stats bar',
        'Milestone 1 -> Render filtered todos safely using createElement & textContent',
        'Milestone 2 -> Handle form submission + delegated toggle & delete on #todoList',
        'Milestone 3 -> Persist to localStorage safely and support dblclick inline text editing',
      ],
      testCases: [
        { label: 'XSS payload safely escaped', input: 'Add task: <img src=x onerror=alert(1)>', expected: 'Appears literally as text; script never runs' },
        { label: 'Reload preserves tasks', input: 'Add task -> reload page', expected: 'Tasks restored from localStorage' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>P2: Todo App + localStorage</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 480px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    .row { display: flex; gap: 8px; margin: 10px 0; }
    input { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    button.sec { background: #334155; color: #e2e8f0; }
    button.active { outline: 2px solid #22d3ee; }
    ul { list-style: none; padding: 0; margin: 12px 0; }
    li { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; margin-bottom: 6px; }
    li span { flex: 1; cursor: pointer; }
    li.done span { text-decoration: line-through; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Todo App + localStorage</h2>
    <form id="todoForm" class="row">
      <input id="todoInput" placeholder="Add a new task..." />
      <button type="submit">Add</button>
    </form>
    <div class="row">
      <button type="button" class="sec active" data-filter="all">All</button>
      <button type="button" class="sec" data-filter="active">Active</button>
      <button type="button" class="sec" data-filter="done">Done</button>
    </div>
    <ul id="todoList"></ul>
    <div id="stats" style="font-size:13px; color:#94a3b8;">0 tasks</div>
  </div>
  <script>
    console.log('P2 UI skeleton ready — move to Milestone 1 to build render()');
  </script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — State Array, Filter & XSS-Safe Render',
        keywords: ['createElement', 'textContent', 'DocumentFragment', 'filter'],
        definition: 'Initialize the todos state array and write an XSS-safe render() function using createElement and textContent.',
        syntax: 'const li = document.createElement("li");\nconst span = document.createElement("span");\nspan.textContent = todo.text;',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Store initial sample todos [{ id, text, done }] and currentFilter = "all"',
            'Step 2 -> Implement render() filtering todos by all / active / done',
            'Step 3 -> Build <li> nodes using createElement + textContent (no raw innerHTML) and update #stats',
          ],
        }],
        testCases: [
          { label: 'Render initial list', input: '2 seeded items (1 active, 1 done)', expected: 'Both render; Done item has line-through class .done' },
          { label: 'Click Done filter', input: 'Click [data-filter="done"]', expected: 'List shows only completed items' },
        ],
        hints: [
          { step: 1, text: 'Clear #todoList via listEl.replaceChildren() or listEl.innerHTML = "" before appending the fragment.' },
          { step: 2, text: 'Assign li.dataset.id = String(todo.id) so Milestone 2 delegation knows which item was clicked.' },
          { step: 3, text: 'Use [data-action="toggle"] and [data-action="del"] on checkbox/button elements.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>P2 Milestone 1 — Safe Render & Filters</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 480px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    .row { display: flex; gap: 8px; margin: 10px 0; }
    button.sec { background: #334155; color: #e2e8f0; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
    button.active { outline: 2px solid #22d3ee; }
    ul { list-style: none; padding: 0; margin: 12px 0; }
    li { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; margin-bottom: 6px; }
    li span { flex: 1; }
    li.done span { text-decoration: line-through; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Todo App (Milestone 1)</h2>
    <div class="row">
      <button type="button" class="sec active" data-filter="all">All</button>
      <button type="button" class="sec" data-filter="active">Active</button>
      <button type="button" class="sec" data-filter="done">Done</button>
    </div>
    <ul id="todoList"></ul>
    <div id="stats" style="font-size:13px; color:#94a3b8;"></div>
  </div>
  <script>
    // TODO (Step 1): Maintain todos state and currentFilter
    let todos = [
      { id: 1, text: 'Learn DOM createElement', done: true },
      { id: 2, text: 'Implement Event Delegation', done: false },
    ];
    let currentFilter = 'all';

    const listEl = document.querySelector('#todoList');
    const statsEl = document.querySelector('#stats');

    // TODO (Step 2 & 3): Filter todos safely and build <li> nodes with textContent
    function render() {
      listEl.replaceChildren();
      // Filter todos based on currentFilter ('all' | 'active' | 'done')
      // For each item: create li, span (set span.textContent = item.text), delete button
      // Append to listEl and update statsEl.textContent
    }

    document.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('active', b === btn));
        render();
      });
    });

    render();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function render() {
    listEl.replaceChildren();
    const visible = todos.filter((t) =>
      currentFilter === 'active' ? !t.done : currentFilter === 'done' ? t.done : true
    );
    const frag = document.createDocumentFragment();
    for (const item of visible) {
      const li = document.createElement('li');
      li.dataset.id = String(item.id);
      if (item.done) li.classList.add('done');
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = item.done;
      chk.dataset.action = 'toggle';
      const span = document.createElement('span');
      span.textContent = item.text;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'sec';
      del.textContent = 'Delete';
      del.dataset.action = 'del';
      li.append(chk, span, del);
      frag.append(li);
    }
    listEl.append(frag);
    const left = todos.filter((t) => !t.done).length;
    statsEl.textContent = \`\${left} active / \${todos.length} total\`;
  }
</script>`,
      },
      {
        title: 'Milestone 2 — Add, Toggle & Delegated Delete',
        keywords: ['submit', 'preventDefault', 'closest', 'data-action'],
        definition: 'Wire #todoForm submission to add trimmed tasks and use a single delegated click listener on #todoList to toggle or remove items.',
        syntax: 'const li = e.target.closest("li[data-id]");\nconst actionEl = e.target.closest("[data-action]");',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Listen to #todoForm submit, call e.preventDefault(), trim input, reject blank submissions',
            'Step 2 -> Attach ONE click listener on #todoList checking e.target.closest("[data-action]")',
            'Step 3 -> Implement immutable state updates for toggle (.map) and delete (.filter), then re-render',
          ],
        }],
        testCases: [
          { label: 'Whitespace task rejected', input: 'Submit "   "', expected: 'No blank task added' },
          { label: 'Delete newly added row', input: 'Add "Test" -> click Delete button', expected: 'Row removed cleanly via parent #todoList handler' },
        ],
        hints: [
          { step: 1, text: 'Use crypto.randomUUID?.() ?? Date.now() to create unique IDs without collisions.' },
          { step: 2, text: 'Convert li.dataset.id with String comparison or Number matching carefully.' },
          { step: 3, text: 'Reset inputEl.value = "" and focus() after adding a valid task.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>P2 Milestone 2 — Add & Delegation</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 480px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    .row { display: flex; gap: 8px; margin: 10px 0; }
    input[type="text"], #todoInput { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    button.sec { background: #334155; color: #e2e8f0; }
    ul { list-style: none; padding: 0; margin: 12px 0; }
    li { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; margin-bottom: 6px; }
    li span { flex: 1; }
    li.done span { text-decoration: line-through; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Todo App (Milestone 2)</h2>
    <form id="todoForm" class="row">
      <input id="todoInput" placeholder="Add task..." />
      <button type="submit">Add</button>
    </form>
    <ul id="todoList"></ul>
    <div id="stats" style="font-size:13px; color:#94a3b8;"></div>
  </div>
  <script>
    let todos = [{ id: '1', text: 'Practice event delegation', done: false }];
    const form = document.querySelector('#todoForm');
    const inputEl = document.querySelector('#todoInput');
    const listEl = document.querySelector('#todoList');
    const statsEl = document.querySelector('#stats');

    function render() {
      listEl.replaceChildren();
      for (const item of todos) {
        const li = document.createElement('li');
        li.dataset.id = item.id;
        if (item.done) li.classList.add('done');
        const chk = document.createElement('input');
        chk.type = 'checkbox'; chk.checked = item.done; chk.dataset.action = 'toggle';
        const span = document.createElement('span'); span.textContent = item.text;
        const del = document.createElement('button');
        del.type = 'button'; del.className = 'sec'; del.textContent = 'Delete'; del.dataset.action = 'del';
        li.append(chk, span, del);
        listEl.append(li);
      }
      statsEl.textContent = \`\${todos.filter((t) => !t.done).length} active / \${todos.length} total\`;
    }

    // TODO (Step 1): Handle form 'submit' -> trim value -> push new item -> clear input -> render()

    // TODO (Step 2 & 3): Delegate click on listEl using closest('[data-action]') and closest('li')
    // If action === 'toggle', flip item.done; if action === 'del', remove item from todos; call render()

    render();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    todos.push({ id: String(Date.now()), text, done: false });
    inputEl.value = '';
    render();
  });

  listEl.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    const li = e.target.closest('li[data-id]');
    if (!actionBtn || !li) return;
    const id = li.dataset.id;
    if (actionBtn.dataset.action === 'toggle') {
      todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    } else if (actionBtn.dataset.action === 'del') {
      todos = todos.filter((t) => t.id !== id);
    }
    render();
  });
</script>`,
      },
      {
        title: 'Milestone 3 — localStorage Persistence & Inline Edit',
        keywords: ['localStorage', 'JSON.parse', 'try / catch', 'dblclick'],
        definition: 'Persist todos safely across page reloads using try/catch JSON wrappers and let users double-click any task label to rename it.',
        syntax: 'localStorage.setItem(KEY, JSON.stringify(todos));',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Implement safeLoad() / safeSave() with try/catch around JSON.parse(localStorage.getItem(KEY))',
            'Step 2 -> Call safeSave() every time todos are added, toggled, edited, or deleted',
            'Step 3 -> Add a delegated "dblclick" handler on #todoList span to edit task text inline (Enter saves)',
          ],
        }],
        testCases: [
          { label: 'Corrupt localStorage safety', input: 'localStorage has invalid JSON', expected: 'safeLoad() falls back cleanly to [] without crash' },
          { label: 'Double-click rename', input: 'dblclick task span -> edit -> press Enter', expected: 'Updated text renders & saves to localStorage' },
        ],
        hints: [
          { step: 1, text: 'Always wrap JSON.parse in try { ... } catch { return []; } and verify Array.isArray(parsed).' },
          { step: 2, text: 'In dblclick, check e.target.matches("li span"), create a temporary <input>, focus it, and commit on Enter or blur.' },
          { step: 3, text: 'Call safeSave() immediately before render() in every mutation helper.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>P2 Milestone 3 — Persistence & Inline Edit</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 480px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    .row { display: flex; gap: 8px; margin: 10px 0; }
    input { padding: 8px 10px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
    #todoInput { flex: 1; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    button.sec { background: #334155; color: #e2e8f0; }
    ul { list-style: none; padding: 0; margin: 12px 0; }
    li { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; margin-bottom: 6px; }
    li span { flex: 1; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Todo App (Milestone 3 — Tip: Double-click text to edit)</h2>
    <form id="todoForm" class="row">
      <input id="todoInput" placeholder="Add task..." />
      <button type="submit">Add</button>
    </form>
    <ul id="todoList"></ul>
  </div>
  <script>
    const STORAGE_KEY = 'bce_p2_todos';
    const form = document.querySelector('#todoForm');
    const inputEl = document.querySelector('#todoInput');
    const listEl = document.querySelector('#todoList');

    // TODO (Step 1): Safely read & parse todos array from localStorage
    function safeLoad() {
      return [{ id: '1', text: 'Double-click me to rename!', done: false }];
    }

    // TODO (Step 2): Persist todos to localStorage
    function safeSave(items) {
      // localStorage.setItem(...)
    }

    let todos = safeLoad();

    function render() {
      listEl.replaceChildren();
      for (const item of todos) {
        const li = document.createElement('li');
        li.dataset.id = item.id;
        const span = document.createElement('span');
        span.textContent = item.text;
        const del = document.createElement('button');
        del.type = 'button'; del.className = 'sec'; del.textContent = 'Delete'; del.dataset.action = 'del';
        li.append(span, del);
        listEl.append(li);
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = inputEl.value.trim();
      if (!text) return;
      todos.push({ id: String(Date.now()), text, done: false });
      inputEl.value = '';
      safeSave(todos);
      render();
    });

    // TODO (Step 3): Add 'dblclick' listener on listEl to edit a <span> inline and call safeSave(todos)

    render();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function safeLoad() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }
  function safeSave(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }
  listEl.addEventListener('dblclick', (e) => {
    if (!e.target.matches('li span')) return;
    const li = e.target.closest('li[data-id]');
    const id = li.dataset.id;
    const edit = document.createElement('input');
    edit.value = e.target.textContent;
    e.target.replaceWith(edit);
    edit.focus();
    const saveEdit = () => {
      const next = edit.value.trim();
      if (next) todos = todos.map((t) => (t.id === id ? { ...t, text: next } : t));
      safeSave(todos);
      render();
    };
    edit.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') saveEdit(); });
    edit.addEventListener('blur', saveEdit, { once: true });
  });
</script>`,
      },
    ],
  },

  3: {
    overview: {
      keywords: ['setInterval', 'clearInterval', 'Date.now()', 'padStart', 'timers'],
      definition: 'Build a multi-mode Clock, drift-free Stopwatch, and Countdown Timer suite with clean interval lifecycle management.',
      syntax: 'const ss = String(Math.floor(sec % 60)).padStart(2, "0");',
      architecture: [
        'Milestone 1 -> Format milliseconds via fmtMs(ms) and run a live 1s digital wall clock',
        'Milestone 2 -> Build drift-free Stopwatch using Date.now() delta + Lap tracker',
        'Milestone 3 -> Add Countdown timer with zero-clamp auto-stop and clean interval teardown',
      ],
      testCases: [
        { label: 'Format 65430ms', input: 'fmtMs(65430)', expected: '"01:05.43"' },
        { label: 'Countdown reaches zero', input: '1s -> 0s', expected: 'Stops interval at 00:00 and displays "Time\'s Up!"' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>P3: Clock, Stopwatch & Timer</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 460px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 18px; }
    .disp { font-family: ui-monospace, monospace; font-size: 32px; font-weight: 800; color: #22d3ee; margin: 10px 0; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 7px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; }
    button.sec { background: #334155; color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Clock + Stopwatch + Timer</h2>
    <div id="clockOut" class="disp">--:--:--</div>
    <div id="swOut" class="disp">00:00.00</div>
    <div class="row">
      <button id="swStart">Start SW</button>
      <button id="swPause" class="sec">Pause</button>
      <button id="swReset" class="sec">Reset</button>
    </div>
  </div>
  <script>console.log('P3 layout loaded — proceed to Milestone 1');</script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — Time Formatter & Live Digital Clock',
        keywords: ['Date', 'padStart', 'setInterval', 'fmtMs'],
        definition: 'Build two-digit zero padding helpers, fmtMs(ms) for MM:SS.cc formatting, and start the live clock.',
        syntax: 'const pad = (n) => String(n).padStart(2, "0");',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Write pad(n) using String(n).padStart(2, "0")',
            'Step 2 -> Write fmtMs(ms) converting milliseconds into "MM:SS.cc" format',
            'Step 3 -> Update #clockOut with new Date().toLocaleTimeString() on load and every 1000ms',
          ],
        }],
        testCases: [
          { label: 'Padding single digits', input: 'pad(7)', expected: '"07"' },
          { label: 'Format 1250ms', input: 'fmtMs(1250)', expected: '"00:01.25"' },
        ],
        hints: [
          { step: 1, text: 'Math.floor(ms / 60000) gives minutes; Math.floor((ms % 60000) / 1000) gives seconds.' },
          { step: 2, text: 'Centiseconds = Math.floor((ms % 1000) / 10).' },
          { step: 3, text: 'Call updateClock() immediately before setInterval(updateClock, 1000) to avoid 1s blank startup delay.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P3 Milestone 1</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:440px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.disp{font-family:monospace;font-size:28px;color:#22d3ee;margin:8px 0}</style>
</head>
<body>
  <div class="card">
    <h2>Clock & Time Formatter</h2>
    <div id="clockOut" class="disp">--:--:--</div>
    <div id="fmtTest" style="color:#94a3b8">Test fmtMs(65430): pending</div>
  </div>
  <script>
    const clockEl = document.querySelector('#clockOut');
    const testEl = document.querySelector('#fmtTest');

    // TODO (Step 1): Return zero-padded 2-digit string
    const pad = (n) => String(n);

    // TODO (Step 2): Return "MM:SS.cc" from milliseconds
    function fmtMs(ms) {
      return '00:00.00';
    }

    // TODO (Step 3): Render current clock time and schedule 1000ms interval
    function tickClock() {
      // clockEl.textContent = ...
    }
    tickClock();
    testEl.textContent = 'Test fmtMs(65430): ' + fmtMs(65430);
  </script>
</body>
</html>`,
        solutionCode: `<script>
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  function fmtMs(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return \`\${pad(m)}:\${pad(s)}.\${pad(cs)}\`;
  }
  function tickClock() { clockEl.textContent = new Date().toLocaleTimeString(); }
  tickClock();
  setInterval(tickClock, 1000);
</script>`,
      },
      {
        title: 'Milestone 2 — Drift-Free Stopwatch & Laps',
        keywords: ['Date.now()', 'clearInterval', 'elapsedMs', 'laps'],
        definition: 'Implement Start, Pause, Reset, and Lap using Date.now() deltas so background tab throttling never loses accuracy.',
        syntax: 'elapsed = Date.now() - startTime;',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Guard startSW() so clicking Start twice never creates overlapping intervals',
            'Step 2 -> Track elapsedMs across Pause & Resume using startTime = Date.now() - elapsedMs',
            'Step 3 -> Record formatted lap strings into #laps and clear everything cleanly on Reset',
          ],
        }],
        testCases: [
          { label: 'Double start click ignored', input: 'Click Start twice rapidly', expected: 'Only 1 interval runs (swTimer guard prevents speedup)' },
          { label: 'Resume preserves elapsed time', input: 'Run -> Pause -> Start', expected: 'Continues from paused timestamp instead of 00:00' },
        ],
        hints: [
          { step: 1, text: 'If (swTimer !== null) return; at the very top of startSW().' },
          { step: 2, text: 'On Pause: clearInterval(swTimer); swTimer = null; elapsedMs stays preserved.' },
          { step: 3, text: 'On Lap: append an <li> with `#${idx}: ${fmtMs(elapsedMs)}` only when elapsedMs > 0.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P3 Milestone 2</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:440px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.disp{font-family:monospace;font-size:30px;color:#22d3ee;margin:8px 0}.row{display:flex;gap:8px;flex-wrap:wrap}button{background:#06b6d4;color:#082f49;border:none;padding:7px 12px;border-radius:8px;font-weight:700;cursor:pointer}button.sec{background:#334155;color:#e2e8f0}</style>
</head>
<body>
  <div class="card">
    <h2>Stopwatch (Milestone 2)</h2>
    <div id="swOut" class="disp">00:00.00</div>
    <div class="row">
      <button id="startBtn">Start</button>
      <button id="pauseBtn" class="sec">Pause</button>
      <button id="lapBtn" class="sec">Lap</button>
      <button id="resetBtn" class="sec">Reset</button>
    </div>
    <ul id="laps" style="color:#cbd5e1;font-size:13px;"></ul>
  </div>
  <script>
    const pad = (n) => String(Math.floor(n)).padStart(2, '0');
    const fmtMs = (ms) => \`\${pad(ms / 60000)}:\${pad((ms % 60000) / 1000)}.\${pad((ms % 1000) / 10)}\`;
    const swOut = document.querySelector('#swOut');
    const lapsEl = document.querySelector('#laps');
    let elapsedMs = 0, swTimer = null, lapCount = 0;

    // TODO (Step 1 & 2): Implement drift-free start, pause, reset
    document.querySelector('#startBtn').addEventListener('click', () => {
      // Guard swTimer; set startTime = Date.now() - elapsedMs; setInterval every 25ms
    });
    document.querySelector('#pauseBtn').addEventListener('click', () => {
      // clearInterval(swTimer); swTimer = null;
    });
    document.querySelector('#resetBtn').addEventListener('click', () => {
      // Stop timer, reset elapsedMs = 0, swOut & lapsEl
    });

    // TODO (Step 3): Append formatted lap entry inside #laps
    document.querySelector('#lapBtn').addEventListener('click', () => {});
  </script>
</body>
</html>`,
        solutionCode: `<script>
  document.querySelector('#startBtn').addEventListener('click', () => {
    if (swTimer !== null) return;
    const startTime = Date.now() - elapsedMs;
    swTimer = setInterval(() => {
      elapsedMs = Date.now() - startTime;
      swOut.textContent = fmtMs(elapsedMs);
    }, 25);
  });
  document.querySelector('#pauseBtn').addEventListener('click', () => {
    clearInterval(swTimer); swTimer = null;
  });
  document.querySelector('#lapBtn').addEventListener('click', () => {
    if (elapsedMs === 0) return;
    const li = document.createElement('li');
    li.textContent = \`Lap \${++lapCount}: \${fmtMs(elapsedMs)}\`;
    lapsEl.prepend(li);
  });
  document.querySelector('#resetBtn').addEventListener('click', () => {
    clearInterval(swTimer); swTimer = null; elapsedMs = 0; lapCount = 0;
    swOut.textContent = '00:00.00'; lapsEl.replaceChildren();
  });
</script>`,
      },
      {
        title: 'Milestone 3 — Countdown Timer & Auto-Stop Guard',
        keywords: ['countdown', 'clearInterval', 'Math.max(0, ...)', 'status banner'],
        definition: 'Add a configurable seconds countdown timer that stops automatically at 00:00 and displays a completion alert.',
        syntax: 'remainingSec = Math.max(0, remainingSec - 1);',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Parse #secInput safely (>= 1 second) before starting countdown',
            'Step 2 -> Decrement every 1000ms and update MM:SS readout cleanly',
            'Step 3 -> Stop interval at 0, clamp non-negative, and show "Time\'s Up!" status',
          ],
        }],
        testCases: [
          { label: '5-second countdown', input: 'Input 5 -> Start', expected: 'Counts 00:05..00:00 then halts interval' },
          { label: 'Negative input clamped', input: 'Input -10', expected: 'Shows validation notice instead of negative timer' },
        ],
        hints: [
          { step: 1, text: 'Always clear any existing timerId before starting a new countdown.' },
          { step: 2, text: 'Inside interval: remaining--; renderTimer(); if (remaining <= 0) stopTimer("Time\'s Up!").' },
          { step: 3, text: 'Disable or ignore redundant Start clicks cleanly by resetting timerId.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P3 Milestone 3 — Countdown</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:440px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.disp{font-family:monospace;font-size:32px;color:#38bdf8;margin:10px 0}.row{display:flex;gap:8px}input{width:100px;padding:7px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc}button{background:#06b6d4;color:#082f49;border:none;padding:7px 14px;border-radius:8px;font-weight:700;cursor:pointer}</style>
</head>
<body>
  <div class="card">
    <h2>Countdown Timer (Milestone 3)</h2>
    <div class="row">
      <input id="secInput" type="number" value="5" min="1" />
      <button id="startTimer">Start Countdown</button>
    </div>
    <div id="timerOut" class="disp">00:05</div>
    <div id="banner" style="color:#facc15;font-weight:700;"></div>
  </div>
  <script>
    const secInput = document.querySelector('#secInput');
    const timerOut = document.querySelector('#timerOut');
    const banner = document.querySelector('#banner');
    let remaining = 5, timerId = null;

    const pad = (n) => String(n).padStart(2, '0');
    function render() { timerOut.textContent = \`\${pad(Math.floor(remaining / 60))}:\${pad(remaining % 60)}\`; }

    // TODO (Step 1, 2 & 3): Implement #startTimer click validation, 1s decrement loop, and zero stop guard
    document.querySelector('#startTimer').addEventListener('click', () => {
      // clearInterval(timerId); validate Number(secInput.value) >= 1; start setInterval
    });

    render();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  document.querySelector('#startTimer').addEventListener('click', () => {
    clearInterval(timerId);
    const secs = Math.floor(Number(secInput.value));
    if (!Number.isFinite(secs) || secs < 1) {
      banner.textContent = 'Enter at least 1 second.';
      return;
    }
    remaining = secs;
    banner.textContent = 'Running...';
    render();
    timerId = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      render();
      if (remaining === 0) {
        clearInterval(timerId);
        timerId = null;
        banner.textContent = "Time's Up!";
      }
    }, 1000);
  });
</script>`,
      },
    ],
  },

  4: {
    overview: {
      keywords: ['state index', 'arrays', 'timer', 'DOM locking', 'scoring'],
      definition: 'Build an interactive Quiz Engine with question rendering, one-click option locking, per-question timer, and restartable score summary.',
      syntax: 'const q = QUESTIONS[idx]; // Advance idx cleanly and track score',
      architecture: [
        'Milestone 1 -> Render current question & clickable answer buttons safely',
        'Milestone 2 -> Handle pick(choiceIdx), lock buttons, and increment score',
        'Milestone 3 -> Add 15s countdown auto-advance + final score summary & Restart',
      ],
      testCases: [
        { label: 'Double-click prevention', input: 'Click an answer twice fast', expected: 'locked=true stops extra points' },
        { label: 'Restart resets all state', input: 'Finish quiz -> Restart', expected: 'idx=0, score=0, timer resets cleanly' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P4: Quiz App</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:480px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.opt{display:block;width:100%;text-align:left;margin:6px 0;padding:9px 12px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc;cursor:pointer}.opt.ok{border-color:#22c55e;background:#052e16}.opt.bad{border-color:#ef4444;background:#450a0a}button.pri{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;margin-top:10px;cursor:pointer}</style>
</head>
<body>
  <div class="card">
    <div id="meta" style="color:#94a3b8;font-size:13px;">Quiz Blueprint</div>
    <h3 id="qText">Ready to build your Quiz Engine!</h3>
    <div id="opts"></div>
    <button id="nextBtn" class="pri">Next</button>
  </div>
  <script>console.log('P4 blueprint ready — advance to Milestone 1');</script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — Question Bank & Safe Option Rendering',
        keywords: ['createElement', 'dataset', 'state index', 'rendering'],
        definition: 'Render the active question headline, progress counter, and 4 option buttons from the QUESTIONS dataset.',
        syntax: 'q.options.forEach((label, i) => { btn.dataset.idx = String(i); });',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Keep state { index: 0, score: 0 } above renderQuestion()',
            'Step 2 -> Update #meta ("Question 1 / 4 | Score: 0") and #qText',
            'Step 3 -> Generate 4 .opt buttons cleanly inside #opts with data-idx',
          ],
        }],
        testCases: [
          { label: 'Initial question', input: 'index = 0', expected: 'Question 1 text + 4 options appear' },
          { label: 'Options clear between questions', input: 'Call renderQuestion() twice', expected: 'No duplicate leftover buttons' },
        ],
        hints: [
          { step: 1, text: 'Call optsEl.replaceChildren() at the start of renderQuestion().' },
          { step: 2, text: 'Store option index in btn.dataset.idx for Milestone 2.' },
          { step: 3, text: 'Show current score inside #meta using template literals.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P4 Milestone 1</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:480px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.opt{display:block;width:100%;text-align:left;margin:6px 0;padding:9px 12px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc;cursor:pointer}</style>
</head>
<body>
  <div class="card">
    <div id="meta" style="color:#94a3b8;font-size:13px;"></div>
    <h3 id="qText"></h3>
    <div id="opts"></div>
  </div>
  <script>
    const QUESTIONS = [
      { q: 'Which returns "object" for null?', opts: ['typeof', 'Array.isArray', 'Number.isNaN', 'Object.is'], ans: 0 },
      { q: 'Which method avoids mutating the array?', opts: ['sort()', 'reverse()', 'toSorted()', 'splice()'], ans: 2 },
    ];
    let index = 0, score = 0;
    const metaEl = document.querySelector('#meta');
    const qTextEl = document.querySelector('#qText');
    const optsEl = document.querySelector('#opts');

    // TODO (Step 1, 2 & 3): Implement renderQuestion()
    function renderQuestion() {
      // Clear optsEl, update metaEl and qTextEl, append .opt buttons
    }

    renderQuestion();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function renderQuestion() {
    optsEl.replaceChildren();
    const cur = QUESTIONS[index];
    metaEl.textContent = \`Question \${index + 1} / \${QUESTIONS.length} | Score: \${score}\`;
    qTextEl.textContent = cur.q;
    cur.opts.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opt';
      btn.textContent = text;
      btn.dataset.idx = String(i);
      optsEl.append(btn);
    });
  }
</script>`,
      },
      {
        title: 'Milestone 2 — Answer Locking & Instant Visual Feedback',
        keywords: ['locked flag', 'classList', 'delegation', 'scoring'],
        definition: 'Wire pick(choiceIdx) to score correct answers once, highlight right/wrong choices in green/red, and enable Next.',
        syntax: 'if (locked) return;\nlocked = true;',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Prevent multiple answers on the same question using a locked boolean',
            'Step 2 -> Mark picked choice .ok or .bad AND highlight true answer .ok',
            'Step 3 -> Enable #nextBtn to increment index cleanly until quiz completes',
          ],
        }],
        testCases: [
          { label: 'Correct pick', input: 'Pick matching ans index', expected: 'Score +1, button gets .ok class' },
          { label: 'Second click ignored', input: 'Click another option right after', expected: 'locked=true prevents score manipulation' },
        ],
        hints: [
          { step: 1, text: 'Set nextBtn.disabled = false only inside pick(i), and nextBtn.disabled = true in renderQuestion().' },
          { step: 2, text: 'Grab all buttons via optsEl.querySelectorAll("button") and compare idx === cur.ans.' },
          { step: 3, text: 'Reset locked = false inside renderQuestion().' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P4 Milestone 2</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:480px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.opt{display:block;width:100%;text-align:left;margin:6px 0;padding:9px 12px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc;cursor:pointer}.opt.ok{border-color:#22c55e;background:#052e16}.opt.bad{border-color:#ef4444;background:#450a0a}button.pri{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;margin-top:10px;cursor:pointer}</style>
</head>
<body>
  <div class="card">
    <div id="meta" style="color:#94a3b8;font-size:13px;"></div>
    <h3 id="qText"></h3>
    <div id="opts"></div>
    <button id="nextBtn" class="pri" disabled>Next Question</button>
  </div>
  <script>
    const QUESTIONS = [
      { q: 'Which returns "object" for null?', opts: ['typeof', 'Array.isArray', 'Number.isNaN', 'Object.is'], ans: 0 },
      { q: 'Which method avoids mutating the array?', opts: ['sort()', 'reverse()', 'toSorted()', 'splice()'], ans: 2 },
    ];
    let index = 0, score = 0, locked = false;
    const metaEl = document.querySelector('#meta');
    const qTextEl = document.querySelector('#qText');
    const optsEl = document.querySelector('#opts');
    const nextBtn = document.querySelector('#nextBtn');

    function renderQuestion() {
      locked = false;
      nextBtn.disabled = true;
      optsEl.replaceChildren();
      const cur = QUESTIONS[index];
      metaEl.textContent = \`Question \${index + 1} / \${QUESTIONS.length} | Score: \${score}\`;
      qTextEl.textContent = cur.q;
      cur.opts.forEach((text, i) => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'opt'; btn.textContent = text; btn.dataset.idx = String(i);
        optsEl.append(btn);
      });
    }

    // TODO (Step 1 & 2): Handle delegated click on optsEl -> check locked -> score & color buttons

    // TODO (Step 3): Advance index on nextBtn click and show "Quiz Complete!" at end

    renderQuestion();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  optsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button.opt');
    if (!btn || locked) return;
    locked = true;
    const choice = Number(btn.dataset.idx);
    const ans = QUESTIONS[index].ans;
    if (choice === ans) score++;
    optsEl.querySelectorAll('button.opt').forEach((b, i) => {
      if (i === ans) b.classList.add('ok');
      else if (i === choice) b.classList.add('bad');
      b.disabled = true;
    });
    metaEl.textContent = \`Question \${index + 1} / \${QUESTIONS.length} | Score: \${score}\`;
    nextBtn.disabled = false;
  });
  nextBtn.addEventListener('click', () => {
    index++;
    if (index < QUESTIONS.length) renderQuestion();
    else {
      qTextEl.textContent = \`Done! Final Score: \${score} / \${QUESTIONS.length}\`;
      optsEl.replaceChildren();
      nextBtn.disabled = true;
    }
  });
</script>`,
      },
      {
        title: 'Milestone 3 — Question Timer & Full Quiz Restart',
        keywords: ['setInterval', 'auto-advance', 'restart', 'clearInterval'],
        definition: 'Add a 15-second per-question timer that reveals the answer on timeout and implement a clean Restart flow.',
        syntax: 'clearInterval(qTimer); // Reset timer cleanly on question change or timeout',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Start a 15s countdown in renderQuestion() and display remaining seconds',
            'Step 2 -> Stop timer immediately when the user selects an option OR when t === 0',
            'Step 3 -> Show final summary card + Restart Quiz button resetting score, index, and timer',
          ],
        }],
        testCases: [
          { label: 'Answer stops timer', input: 'Pick option at t=11s', expected: 'Timer pauses cleanly; does not decrement anymore' },
          { label: 'Restart after end', input: 'Click Restart Quiz', expected: 'Starts back at Question 1 with Score 0 and 15s timer' },
        ],
        hints: [
          { step: 1, text: 'Always call clearInterval(qTimer) at the top of startQuestionTimer().' },
          { step: 2, text: 'When secs hits 0: clearInterval(qTimer), set locked = true, highlight ans .ok, and enable nextBtn.' },
          { step: 3, text: 'Toggle restartBtn.hidden between active quiz and final summary screen.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P4 Milestone 3</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:480px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.opt{display:block;width:100%;text-align:left;margin:6px 0;padding:9px 12px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc;cursor:pointer}.opt.ok{border-color:#22c55e;background:#052e16}button.pri{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;margin-top:10px;cursor:pointer}</style>
</head>
<body>
  <div class="card">
    <div id="meta" style="color:#94a3b8;font-size:13px;"></div>
    <h3 id="qText"></h3>
    <div id="opts"></div>
    <button id="nextBtn" class="pri" disabled>Next</button>
    <button id="restartBtn" class="pri" hidden>Restart Quiz</button>
  </div>
  <script>
    const QUESTIONS = [
      { q: 'Is Map ordered by insertion?', opts: ['Yes', 'No', 'Only numbers', 'Random'], ans: 0 },
      { q: 'AbortController cancels what?', opts: ['CSS grid', 'In-flight fetch()', 'Math.random', 'JSON.stringify'], ans: 1 },
    ];
    let index = 0, score = 0, secs = 15, locked = false, qTimer = null;
    const metaEl = document.querySelector('#meta');
    const qTextEl = document.querySelector('#qText');
    const optsEl = document.querySelector('#opts');
    const nextBtn = document.querySelector('#nextBtn');
    const restartBtn = document.querySelector('#restartBtn');

    function updateMeta() { metaEl.textContent = \`Q\${index + 1}/\${QUESTIONS.length} | Score: \${score} | Time: \${secs}s\`; }

    // TODO (Step 1 & 2): Start 15s countdown in renderQuestion() and handle secs === 0 timeout
    function startTimer() {
      clearInterval(qTimer);
      secs = 15;
      updateMeta();
      // setInterval -> decrement secs -> on 0 lock question and enable nextBtn
    }

    function renderQuestion() {
      locked = false; nextBtn.disabled = true; nextBtn.hidden = false; restartBtn.hidden = true;
      optsEl.replaceChildren();
      const cur = QUESTIONS[index];
      qTextEl.textContent = cur.q;
      cur.opts.forEach((t, i) => {
        const b = document.createElement('button');
        b.className = 'opt'; b.textContent = t; b.dataset.idx = String(i);
        optsEl.append(b);
      });
      startTimer();
    }

    optsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button.opt');
      if (!btn || locked) return;
      locked = true;
      clearInterval(qTimer);
      if (Number(btn.dataset.idx) === QUESTIONS[index].ans) score++;
      optsEl.querySelectorAll('button.opt')[QUESTIONS[index].ans].classList.add('ok');
      updateMeta();
      nextBtn.disabled = false;
    });

    nextBtn.addEventListener('click', () => {
      index++;
      if (index < QUESTIONS.length) renderQuestion();
      else { clearInterval(qTimer); qTextEl.textContent = \`Score: \${score}/\${QUESTIONS.length}\`; optsEl.replaceChildren(); nextBtn.hidden = true; restartBtn.hidden = false; }
    });

    // TODO (Step 3): Add click handler on restartBtn resetting index=0, score=0 and calling renderQuestion()

    renderQuestion();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function startTimer() {
    clearInterval(qTimer);
    secs = 15;
    updateMeta();
    qTimer = setInterval(() => {
      secs--;
      updateMeta();
      if (secs <= 0) {
        clearInterval(qTimer);
        locked = true;
        optsEl.querySelectorAll('button.opt')[QUESTIONS[index].ans]?.classList.add('ok');
        nextBtn.disabled = false;
      }
    }, 1000);
  }
  restartBtn.addEventListener('click', () => {
    index = 0; score = 0; renderQuestion();
  });
</script>`,
      },
    ],
  },

  5: {
    overview: {
      keywords: ['state machine', 'no eval', 'grid keypad', 'keydown', 'precision'],
      definition: 'Build a safe Calculator state machine with chained operations, zero-division protection, keyboard shortcuts, and floating-point rounding cleanup.',
      syntax: 'state = { cur: "0", prev: null, op: null, overwrite: false };',
      architecture: [
        'Milestone 1 -> Build display state & digit/decimal input preventing duplicate dots',
        'Milestone 2 -> Implement safe compute(a, op, b) & operator chaining without eval()',
        'Milestone 3 -> Add Backspace, Clear, Keyboard listener, and precision rounding',
      ],
      testCases: [
        { label: 'Decimal guard', input: 'Type 3, ., 1, ., 4', expected: 'Display shows "3.14" (second dot ignored)' },
        { label: 'Chained operations', input: '5 + 3 * 2 =', expected: '8 * 2 -> 16' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P5: Safe Calculator</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.calc{max-width:300px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:14px}.scr{background:#0f172a;padding:12px;border-radius:8px;text-align:right;font-family:monospace;font-size:24px;margin-bottom:10px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}button{padding:12px;border-radius:8px;border:none;background:#334155;color:#f8fafc;font-weight:700;cursor:pointer}button.op{background:#0284c7}button.eq{background:#06b6d4;color:#082f49;grid-column:span 2}</style>
</head>
<body>
  <div class="calc">
    <div id="screen" class="scr">0</div>
    <div id="keys" class="grid">
      <button data-act="clear">C</button><button data-act="back">DEL</button><button class="op" data-op="/">/</button><button class="op" data-op="*">*</button>
      <button data-num="7">7</button><button data-num="8">8</button><button data-num="9">9</button><button class="op" data-op="-">-</button>
      <button data-num="4">4</button><button data-num="5">5</button><button data-num="6">6</button><button class="op" data-op="+">+</button>
      <button data-num="1">1</button><button data-num="2">2</button><button data-num="3">3</button><button data-num=".">.</button>
      <button data-num="0">0</button><button class="eq" data-act="eq">=</button>
    </div>
  </div>
  <script>console.log('P5 keypad skeleton loaded');</script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — State Machine & Digit/Dot Entry',
        keywords: ['state', 'delegation', 'leading zero', 'decimal guard'],
        definition: 'Wire numeric keypad buttons via event delegation and implement inputChar() handling leading zeros and single decimal dots.',
        syntax: 'if (ch === "." && cur.includes(".")) return;',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Store cur = "0", prev = null, op = null, overwrite = false',
            'Step 2 -> Write inputChar(ch) preventing "007" leading zeros and double ".." dots',
            'Step 3 -> Delegate clicks on #keys [data-num] and render #screen cleanly',
          ],
        }],
        testCases: [
          { label: 'Replace initial zero', input: 'Click "7" from "0"', expected: 'Screen becomes "7", not "07"' },
          { label: 'Decimal dot guard', input: 'Click "0", ".", "5", "."', expected: 'Screen shows "0.5"' },
        ],
        hints: [
          { step: 1, text: 'If overwrite is true, replace cur completely (or "0." if ch === ".") and set overwrite = false.' },
          { step: 2, text: 'If cur === "0" && ch !== ".", replace cur with ch instead of appending.' },
          { step: 3, text: 'Check e.target.closest("[data-num]") inside #keys click listener.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P5 Milestone 1</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.calc{max-width:280px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:14px}.scr{background:#0f172a;padding:12px;border-radius:8px;text-align:right;font-family:monospace;font-size:24px;margin-bottom:10px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}button{padding:12px;border-radius:8px;border:none;background:#334155;color:#f8fafc;font-weight:700;cursor:pointer}</style>
</head>
<body>
  <div class="calc">
    <div id="screen" class="scr">0</div>
    <div id="keys" class="grid">
      <button data-num="7">7</button><button data-num="8">8</button><button data-num="9">9</button>
      <button data-num="4">4</button><button data-num="5">5</button><button data-num="6">6</button>
      <button data-num="1">1</button><button data-num="2">2</button><button data-num="3">3</button>
      <button data-num="0">0</button><button data-num=".">.</button>
    </div>
  </div>
  <script>
    const screenEl = document.querySelector('#screen');
    const keysEl = document.querySelector('#keys');
    let cur = '0', overwrite = false;

    // TODO (Step 2): Implement inputChar(ch) preventing duplicate '.' and leading zeros
    function inputChar(ch) {
      screenEl.textContent = cur;
    }

    // TODO (Step 3): Delegate [data-num] click on keysEl -> call inputChar(btn.dataset.num)
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function inputChar(ch) {
    if (overwrite) {
      cur = ch === '.' ? '0.' : ch;
      overwrite = false;
    } else if (ch === '.') {
      if (!cur.includes('.')) cur += '.';
    } else {
      cur = cur === '0' ? ch : cur + ch;
    }
    screenEl.textContent = cur;
  }
  keysEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-num]');
    if (btn) inputChar(btn.dataset.num);
  });
</script>`,
      },
      {
        title: 'Milestone 2 — Safe compute() & Operator Chaining',
        keywords: ['switch', 'no eval', 'div by zero', 'chaining'],
        definition: 'Implement compute(a, op, b) cleanly without eval(), guard against dividing by zero, and support chained operators.',
        syntax: 'if (op === "/" && b === 0) return "Error";',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Write pure compute(a, op, b) handling +, -, *, / (and returning "Error" on / 0)',
            'Step 2 -> Implement chooseOp(nextOp): if prev & op exist and !overwrite, compute intermediate result first',
            'Step 3 -> Handle "=" button: compute prev op cur, set overwrite = true, clear prev/op',
          ],
        }],
        testCases: [
          { label: 'Division by zero guard', input: '9 / 0 =', expected: 'Displays "Error" and safely resets state on next digit' },
          { label: 'Floating point clean result', input: '0.1 + 0.2 =', expected: 'Displays 0.3 instead of 0.30000000000000004' },
        ],
        hints: [
          { step: 1, text: 'Clean IEEE 754 noise with Number(result.toPrecision(12)).' },
          { step: 2, text: 'In chooseOp: store prev = cur, op = nextOp, overwrite = true.' },
          { step: 3, text: 'Never use eval() or new Function() for calculator arithmetic.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P5 Milestone 2</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.calc{max-width:280px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:14px}.scr{background:#0f172a;padding:12px;border-radius:8px;text-align:right;font-family:monospace;font-size:24px;margin-bottom:10px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}button{padding:11px;border-radius:8px;border:none;background:#334155;color:#f8fafc;font-weight:700;cursor:pointer}button.op{background:#0284c7}button.eq{background:#06b6d4;color:#082f49}</style>
</head>
<body>
  <div class="calc">
    <div id="screen" class="scr">0</div>
    <div id="keys" class="grid">
      <button data-num="7">7</button><button data-num="8">8</button><button data-num="9">9</button><button class="op" data-op="/">/</button>
      <button data-num="4">4</button><button data-num="5">5</button><button data-num="6">6</button><button class="op" data-op="*">*</button>
      <button data-num="1">1</button><button data-num="2">2</button><button data-num="3">3</button><button class="op" data-op="-">-</button>
      <button data-num="0">0</button><button data-num=".">.</button><button class="eq" data-act="eq">=</button><button class="op" data-op="+">+</button>
    </div>
  </div>
  <script>
    const screenEl = document.querySelector('#screen');
    let cur = '0', prev = null, op = null, overwrite = false;
    const render = () => (screenEl.textContent = cur);

    // TODO (Step 1): Safe pure math compute(a, op, b) returning string (clean precision, guard b === 0)
    function compute(a, operator, b) {
      return '0';
    }

    // TODO (Step 2): Chain or set pending operator
    function chooseOp(nextOp) {}

    // TODO (Step 3): Evaluate prev (op) cur on '='
    function evaluate() {}

    document.querySelector('#keys').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.num) {
        cur = overwrite ? btn.dataset.num : cur === '0' ? btn.dataset.num : cur + btn.dataset.num;
        overwrite = false;
        render();
      } else if (btn.dataset.op) chooseOp(btn.dataset.op);
      else if (btn.dataset.act === 'eq') evaluate();
    });
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function compute(a, operator, b) {
    const x = Number(a), y = Number(b);
    if (operator === '/' && y === 0) return 'Error';
    let r = 0;
    if (operator === '+') r = x + y;
    else if (operator === '-') r = x - y;
    else if (operator === '*') r = x * y;
    else if (operator === '/') r = x / y;
    return String(Number(r.toPrecision(12)));
  }
  function chooseOp(nextOp) {
    if (prev !== null && op && !overwrite) {
      cur = compute(prev, op, cur);
      render();
    }
    prev = cur === 'Error' ? null : cur;
    op = cur === 'Error' ? null : nextOp;
    overwrite = true;
  }
  function evaluate() {
    if (prev === null || !op) return;
    cur = compute(prev, op, cur);
    prev = null; op = null; overwrite = true;
    render();
  }
</script>`,
      },
      {
        title: 'Milestone 3 — Clear, Backspace & Full Keyboard Control',
        keywords: ['keydown', 'Backspace', 'Escape', 'clear'],
        definition: 'Complete the calculator with Backspace slicing, All Clear reset, and full keyboard input mapping.',
        syntax: 'cur = cur.length > 1 ? cur.slice(0, -1) : "0";',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Implement clearAll() resetting cur, prev, op, and overwrite',
            'Step 2 -> Implement backspace() removing last char or resetting to "0"',
            'Step 3 -> Add document keydown listener supporting 0-9, ., +-*/, Enter, Backspace, Escape',
          ],
        }],
        testCases: [
          { label: 'Backspace single digit', input: 'Display "7" -> press Backspace', expected: 'Resets cleanly to "0" (not empty string)' },
          { label: 'Keyboard calculation', input: 'Type 8 * 7 Enter', expected: 'Screen shows 56' },
        ],
        hints: [
          { step: 1, text: 'In backspace(): if (overwrite || cur === "Error") return clearAll();' },
          { step: 2, text: 'If e.key === "Enter", call e.preventDefault() so a focused button does not fire twice.' },
          { step: 3, text: 'Map Escape or lowercase "c" to clearAll().' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P5 Milestone 3 — Keyboard & Controls</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.calc{max-width:280px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:14px}.scr{background:#0f172a;padding:12px;border-radius:8px;text-align:right;font-family:monospace;font-size:24px;margin-bottom:10px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}button{padding:11px;border-radius:8px;border:none;background:#334155;color:#f8fafc;font-weight:700;cursor:pointer}button.op{background:#0284c7}button.eq{background:#06b6d4;color:#082f49}</style>
</head>
<body>
  <div class="calc">
    <div id="screen" class="scr">0</div>
    <div id="keys" class="grid">
      <button data-act="clear">C</button><button data-act="back">DEL</button><button class="op" data-op="/">/</button><button class="op" data-op="*">*</button>
      <button data-num="7">7</button><button data-num="8">8</button><button data-num="9">9</button><button class="op" data-op="-">-</button>
      <button data-num="4">4</button><button data-num="5">5</button><button data-num="6">6</button><button class="op" data-op="+">+</button>
      <button data-num="1">1</button><button data-num="2">2</button><button data-num="3">3</button><button class="eq" data-act="eq">=</button>
    </div>
  </div>
  <script>
    const screenEl = document.querySelector('#screen');
    let cur = '0', prev = null, op = null, overwrite = false;
    const render = () => (screenEl.textContent = cur);

    // TODO (Step 1): Implement clearAll()
    function clearAll() {}

    // TODO (Step 2): Implement backspace()
    function backspace() {}

    function inputChar(ch) {
      cur = overwrite ? ch : cur === '0' ? ch : cur + ch;
      overwrite = false;
      render();
    }

    // TODO (Step 3): Bind document keydown for digits, operators, Enter, Backspace, Escape
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function clearAll() { cur = '0'; prev = null; op = null; overwrite = false; render(); }
  function backspace() {
    if (overwrite || cur === 'Error') return clearAll();
    cur = cur.length > 1 ? cur.slice(0, -1) : '0';
    render();
  }
  document.addEventListener('keydown', (e) => {
    if (/^[0-9.]$/.test(e.key)) inputChar(e.key);
    else if (e.key === 'Backspace') backspace();
    else if (e.key === 'Escape') clearAll();
  });
</script>`,
      },
    ],
  },

  6: {
    overview: {
      keywords: ['fetch', 'AbortController', 'response.ok', 'cache Map', 'loading state'],
      definition: 'Build an Async User & Weather Dashboard handling network guards (res.ok), in-memory TTL caching, request cancellation, and retry UI.',
      syntax: 'if (!res.ok) throw new Error(`HTTP ${res.status}`);',
      architecture: [
        'Milestone 1 -> Write guarded async loader checking res.ok + deterministic sandbox mock/live mode',
        'Milestone 2 -> Add Map cache + AbortController to prevent stale race conditions',
        'Milestone 3 -> Render Loading skeleton, Error retry button, and try/finally cleanup',
      ],
      testCases: [
        { label: 'HTTP 404 error', input: 'Unknown city/user id', expected: 'Rejects via !res.ok guard and shows Retry button' },
        { label: 'Cache hit', input: 'Fetch "Delhi" twice', expected: 'Second request resolves instantly from cache badge' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P6: Async Fetch Dashboard</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:460px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.row{display:flex;gap:8px;margin:10px 0}input{flex:1;padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}.box{margin-top:12px;padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px}</style>
</head>
<body>
  <div class="card">
    <h2>Async Dashboard</h2>
    <div class="row"><input id="query" value="Delhi" /><button id="loadBtn">Load</button></div>
    <div id="status" style="color:#94a3b8;font-size:13px;">Idle</div>
    <div id="result" class="box">Enter city ("Delhi", "Mumbai", "Pune") and press Load in Milestone 1</div>
  </div>
  <script>console.log('P6 blueprint loaded');</script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — Guarded Async Fetch Wrapper',
        keywords: ['async / await', 'res.ok', 'Promise', 'error handling'],
        definition: 'Write fetchProfile(city) checking response status and handling simulated slow network latency safely.',
        syntax: 'if (!res.ok) throw new Error(`HTTP ${res.status}`);',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Use async helper simulating real HTTP { ok, status, json() } latency (works offline too)',
            'Step 2 -> Inside loadCity(q), explicitly throw Error when !res.ok',
            'Step 3 -> Render city temperature & condition safely via textContent inside #result',
          ],
        }],
        testCases: [
          { label: 'Known city hit', input: '"Delhi"', expected: 'Displays temp & condition cleanly' },
          { label: 'HTTP 404 city', input: '"Atlantis"', expected: 'Shows clean HTTP 404 error notice' },
        ],
        hints: [
          { step: 1, text: 'Normalize lookup keys with city.trim().toLowerCase().' },
          { step: 2, text: 'Always set statusEl.textContent = "Loading..." right before await.' },
          { step: 3, text: 'Wrap await inside try/catch so errors render cleanly instead of uncaught promise rejections.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P6 Milestone 1</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:460px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.row{display:flex;gap:8px;margin:10px 0}input{flex:1;padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}.box{margin-top:12px;padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px}</style>
</head>
<body>
  <div class="card">
    <h2>Guarded Async Loader (Milestone 1)</h2>
    <div class="row"><input id="query" value="Delhi" /><button id="loadBtn">Load</button></div>
    <div id="status" style="color:#94a3b8;font-size:13px;">Ready</div>
    <div id="result" class="box">--</div>
  </div>
  <script>
    const DB = { delhi: { city: 'Delhi', tempC: 31, cond: 'Clear' }, mumbai: { city: 'Mumbai', tempC: 29, cond: 'Humid' }, pune: { city: 'Pune', tempC: 25, cond: 'Breezy' } };
    function mockFetchCity(name) {
      return new Promise((resolve) => setTimeout(() => {
        const hit = DB[name.trim().toLowerCase()];
        resolve(hit ? { ok: true, status: 200, json: async () => hit } : { ok: false, status: 404, json: async () => ({ error: 'Not found' }) });
      }, 220));
    }

    const statusEl = document.querySelector('#status');
    const resultEl = document.querySelector('#result');

    // TODO (Step 1, 2 & 3): Implement loadCity(name) checking res.ok and catching errors
    async function loadCity(name) {
      // Set status 'Loading...', await mockFetchCity(name), throw if !res.ok, parse json, render cleanly
    }

    document.querySelector('#loadBtn').addEventListener('click', () => loadCity(document.querySelector('#query').value));
  </script>
</body>
</html>`,
        solutionCode: `<script>
  async function loadCity(name) {
    statusEl.textContent = 'Loading...';
    try {
      const res = await mockFetchCity(name);
      if (!res.ok) throw new Error(\`HTTP \${res.status}: City not found\`);
      const data = await res.json();
      resultEl.textContent = \`\${data.city}: \${data.tempC} C (\${data.cond})\`;
      statusEl.textContent = 'Loaded (Network)';
    } catch (err) {
      resultEl.textContent = err.message;
      statusEl.textContent = 'Error';
    }
  }
</script>`,
      },
      {
        title: 'Milestone 2 — Cache Map & AbortController Guard',
        keywords: ['Map', 'AbortController', 'signal', 'race condition'],
        definition: 'Prevent stale out-of-order responses using AbortController and cache repeated lookups in a Map.',
        syntax: 'controller?.abort(); controller = new AbortController();',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Store resolved city objects in const cache = new Map() keyed by lowercase name',
            'Step 2 -> Return cached result immediately when cache.has(key) with status "Loaded (Cache)"',
            'Step 3 -> Abort prior active AbortController before starting a new async fetch',
          ],
        }],
        testCases: [
          { label: 'Repeated query', input: 'Load "Mumbai" twice', expected: 'Second click hits cache instantly without delay' },
          { label: 'Superseded fetch aborted', input: 'Click Load twice quickly', expected: 'First request rejects with AbortError; UI shows no error banner' },
        ],
        hints: [
          { step: 1, text: 'In mockFetchCity(name, signal), listen to signal?.addEventListener("abort", ...).' },
          { step: 2, text: 'If err.name === "AbortError", return silently inside catch so status does not flash Error.' },
          { step: 3, text: 'Call cache.set(key, data) right after successful res.json().' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P6 Milestone 2</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:460px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.row{display:flex;gap:8px;margin:10px 0}input{flex:1;padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}.box{margin-top:12px;padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px}</style>
</head>
<body>
  <div class="card">
    <h2>Cache & Abort Guard (Milestone 2)</h2>
    <div class="row"><input id="query" value="Pune" /><button id="loadBtn">Load</button></div>
    <div id="status" style="color:#94a3b8;font-size:13px;">Ready</div>
    <div id="result" class="box">--</div>
  </div>
  <script>
    const DB = { delhi: { city: 'Delhi', tempC: 31, cond: 'Clear' }, mumbai: { city: 'Mumbai', tempC: 29, cond: 'Humid' }, pune: { city: 'Pune', tempC: 25, cond: 'Breezy' } };
    function mockFetchCity(name, signal) {
      return new Promise((resolve, reject) => {
        const id = setTimeout(() => {
          const hit = DB[name];
          resolve(hit ? { ok: true, status: 200, json: async () => hit } : { ok: false, status: 404 });
        }, 350);
        signal?.addEventListener('abort', () => { clearTimeout(id); reject(new DOMException('Aborted', 'AbortError')); });
      });
    }

    const cache = new Map();
    let activeCtrl = null;
    const statusEl = document.querySelector('#status');
    const resultEl = document.querySelector('#result');

    // TODO (Step 1, 2 & 3): Check cache first, else abort prior activeCtrl, create new AbortController, store in cache
    async function loadCity(raw) {
      const key = raw.trim().toLowerCase();
      // Implement here
    }

    document.querySelector('#loadBtn').addEventListener('click', () => loadCity(document.querySelector('#query').value));
  </script>
</body>
</html>`,
        solutionCode: `<script>
  async function loadCity(raw) {
    const key = raw.trim().toLowerCase();
    if (cache.has(key)) {
      const cached = cache.get(key);
      resultEl.textContent = \`\${cached.city}: \${cached.tempC} C (\${cached.cond})\`;
      statusEl.textContent = 'Loaded (Cache Hit)';
      return;
    }
    activeCtrl?.abort();
    activeCtrl = new AbortController();
    statusEl.textContent = 'Fetching...';
    try {
      const res = await mockFetchCity(key, activeCtrl.signal);
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const data = await res.json();
      cache.set(key, data);
      resultEl.textContent = \`\${data.city}: \${data.tempC} C (\${data.cond})\`;
      statusEl.textContent = 'Loaded (Network)';
    } catch (err) {
      if (err.name === 'AbortError') return;
      resultEl.textContent = err.message;
      statusEl.textContent = 'Failed';
    }
  }
</script>`,
      },
      {
        title: 'Milestone 3 — Finally Button Lock & Retry Flow',
        keywords: ['finally', 'disabled', 'retry', 'resilience'],
        definition: 'Guarantee button loading states recover reliably using finally and provide a one-click Retry action on failure.',
        syntax: 'btn.disabled = true;\ntry { ... } finally { btn.disabled = false; }',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Disable #loadBtn while loading and guarantee re-enable inside finally',
            'Step 2 -> Show #retryBtn ONLY when a request fails',
            'Step 3 -> Wire #retryBtn click to re-attempt the last failed query',
          ],
        }],
        testCases: [
          { label: 'Load button unlocks on error', input: 'Fail request', expected: 'finally re-enables #loadBtn and reveals #retryBtn' },
          { label: 'Retry hides error banner on success', input: 'Fix query or retry transient failure', expected: '#retryBtn hides once data loads' },
        ],
        hints: [
          { step: 1, text: 'Save lastQuery = key so Retry knows what to re-request.' },
          { step: 2, text: 'Always re-enable loadBtn inside finally { loadBtn.disabled = false; }.' },
          { step: 3, text: 'Set retryBtn.hidden = true at the start of every load attempt.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P6 Milestone 3</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:460px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.row{display:flex;gap:8px;margin:10px 0}input{flex:1;padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}button:disabled{opacity:.5}button.warn{background:#f59e0b;color:#451a03;margin-top:8px}.box{margin-top:12px;padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px}</style>
</head>
<body>
  <div class="card">
    <h2>Loading & Retry States (Milestone 3)</h2>
    <div class="row"><input id="query" value="Delhi" /><button id="loadBtn">Load</button></div>
    <div id="result" class="box">Idle</div>
    <button id="retryBtn" class="warn" hidden>Retry Last Request</button>
  </div>
  <script>
    let failOnce = true, lastQuery = 'Delhi';
    function flakyFetch(city) {
      return new Promise((res, rej) => setTimeout(() => {
        if (failOnce) { failOnce = false; return rej(new Error('503 Temporary Timeout')); }
        res({ city, tempC: 30 });
      }, 250));
    }

    const loadBtn = document.querySelector('#loadBtn');
    const retryBtn = document.querySelector('#retryBtn');
    const resultEl = document.querySelector('#result');

    // TODO (Step 1, 2 & 3): Implement runLoad(q) using try/catch/finally + retryBtn toggle
    async function runLoad(q) {
      lastQuery = q;
      // Disable loadBtn, hide retryBtn, try await flakyFetch, reveal retryBtn in catch, always re-enable loadBtn in finally
    }

    loadBtn.addEventListener('click', () => runLoad(document.querySelector('#query').value));
    retryBtn.addEventListener('click', () => runLoad(lastQuery));
  </script>
</body>
</html>`,
        solutionCode: `<script>
  async function runLoad(q) {
    lastQuery = q;
    loadBtn.disabled = true;
    retryBtn.hidden = true;
    resultEl.textContent = 'Loading...';
    try {
      const data = await flakyFetch(q);
      resultEl.textContent = \`\${data.city}: \${data.tempC} C\`;
    } catch (err) {
      resultEl.textContent = 'Error: ' + err.message;
      retryBtn.hidden = false;
    } finally {
      loadBtn.disabled = false;
    }
  }
</script>`,
      },
    ],
  },

  7: {
    overview: {
      keywords: ['Array.reduce', 'CSV export', 'Blob', 'Intl.NumberFormat', 'filter'],
      definition: 'Build an Expense Tracker with validated entry creation, reduce-powered category analytics, month filtering, and RFC-4180 CSV export.',
      syntax: 'items.reduce((acc, x) => ({ ...acc, [x.cat]: (acc[x.cat] ?? 0) + x.amt }), {});',
      architecture: [
        'Milestone 1 -> Add validated expense items and render removable rows safely',
        'Milestone 2 -> Filter by month and compute grand + category totals via reduce',
        'Milestone 3 -> Escape CSV fields properly and persist to localStorage',
      ],
      testCases: [
        { label: 'Zero or negative amount blocked', input: 'amt = -50', expected: 'Form rejects invalid amount' },
        { label: 'CSV escapes quotes/commas', input: 'desc = \'Lunch, "Cafe"\'', expected: 'Quoted CSV cell "Lunch, ""Cafe"""' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P7: Expense Tracker</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:500px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}input,select{padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}</style>
</head>
<body>
  <div class="card">
    <h2>Expense Tracker</h2>
    <div id="summary" style="color:#22d3ee;font-weight:700;">Total: Rs 0</div>
    <p style="color:#94a3b8;font-size:13px;">Advance to Milestone 1 to wire expense form & state.</p>
  </div>
  <script>console.log('P7 layout ready');</script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — Form Validation & Safe Row List',
        keywords: ['submit', 'validation', 'createElement', 'delete'],
        definition: 'Validate description & positive amount before adding transactions and render removable expense rows.',
        syntax: 'if (!desc || !Number.isFinite(amt) || amt <= 0) return;',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Select #expForm, #desc, #amt, #cat, and #list',
            'Step 2 -> Validate non-empty description and positive amount (> 0) on submit',
            'Step 3 -> Render each item cleanly using createElement + delegated Delete button',
          ],
        }],
        testCases: [
          { label: 'Valid expense added', input: 'desc="Metro", amt=60, cat="Travel"', expected: 'Row added cleanly to #list' },
          { label: 'Invalid amount blocked', input: 'amt=0 or -10', expected: 'Rejected before mutating state' },
        ],
        hints: [
          { step: 1, text: 'Trim #desc with desc.trim() and convert #amt via Number(amtEl.value).' },
          { step: 2, text: 'Assign data-id on each <li> and listen once on #list for deletes.' },
          { step: 3, text: 'Clear #desc and #amt inputs on valid submit.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P7 Milestone 1</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:500px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}input,select{flex:1;padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}li{display:flex;justify-content:space-between;padding:7px 10px;background:#0f172a;border:1px solid #334155;border-radius:8px;margin:6px 0}</style>
</head>
<body>
  <div class="card">
    <h2>Expense Tracker (Milestone 1)</h2>
    <form id="expForm" class="row">
      <input id="desc" placeholder="Item" />
      <input id="amt" type="number" placeholder="Amount" />
      <select id="cat"><option>Food</option><option>Travel</option><option>Books</option></select>
      <button type="submit">Add</button>
    </form>
    <ul id="list" style="list-style:none;padding:0;"></ul>
  </div>
  <script>
    let expenses = [{ id: 1, desc: 'Lunch', amt: 180, cat: 'Food' }];
    const form = document.querySelector('#expForm');
    const listEl = document.querySelector('#list');

    // TODO (Step 1, 2 & 3): Render items safely + validate submit + delegate delete button
    function render() {}

    render();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function render() {
    listEl.replaceChildren();
    for (const x of expenses) {
      const li = document.createElement('li');
      li.dataset.id = String(x.id);
      const txt = document.createElement('span');
      txt.textContent = \`[\${x.cat}] \${x.desc} - Rs \${x.amt}\`;
      const del = document.createElement('button');
      del.type = 'button'; del.textContent = 'X'; del.dataset.del = '1';
      li.append(txt, del);
      listEl.append(li);
    }
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.querySelector('#desc').value.trim();
    const amt = Number(document.querySelector('#amt').value);
    const cat = document.querySelector('#cat').value;
    if (!desc || !Number.isFinite(amt) || amt <= 0) return;
    expenses.push({ id: Date.now(), desc, amt, cat });
    form.reset();
    render();
  });
  listEl.addEventListener('click', (e) => {
    if (!e.target.matches('[data-del]')) return;
    const id = Number(e.target.closest('li').dataset.id);
    expenses = expenses.filter((x) => x.id !== id);
    render();
  });
</script>`,
      },
      {
        title: 'Milestone 2 — Reduce Analytics & Month Filter',
        keywords: ['Array.reduce', 'Object.entries', 'Intl.NumberFormat', 'filter'],
        definition: 'Filter expenses by month and compute grand totals plus per-category breakdowns with Array.reduce.',
        syntax: 'const byCat = visible.reduce((m, x) => ({ ...m, [x.cat]: (m[x.cat] ?? 0) + x.amt }), {});',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Filter array when #monthFilter !== "all"',
            'Step 2 -> Use .reduce() twice (or single pass) to compute total and category subtotals',
            'Step 3 -> Format money via Intl.NumberFormat("en-IN") inside #breakdown',
          ],
        }],
        testCases: [
          { label: 'Month filter slice', input: 'Select "2026-11"', expected: 'Totals reflect only matching month items' },
          { label: 'Empty filter', input: 'Select month with 0 items', expected: 'Total shows INR 0.00 cleanly' },
        ],
        hints: [
          { step: 1, text: 'Accumulate into { total: 0, byCat: {} } in one clean .reduce() pass.' },
          { step: 2, text: 'Render category totals sorted highest-first with Object.entries(byCat).sort((a, b) => b[1] - a[1]).' },
          { step: 3, text: 'Re-run updateSummary() whenever #monthFilter emits "change".' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P7 Milestone 2</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:500px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}select{padding:7px;border-radius:8px;background:#0f172a;color:#f8fafc;border:1px solid #475569}.box{margin-top:10px;padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px}</style>
</head>
<body>
  <div class="card">
    <h2>Analytics with Reduce (Milestone 2)</h2>
    <select id="monthFilter"><option value="all">All Months</option><option value="2026-10">2026-10</option><option value="2026-11">2026-11</option></select>
    <div id="totalOut" class="box">Total: --</div>
    <div id="catOut" class="box">Categories: --</div>
  </div>
  <script>
    const EXPENSES = [
      { desc: 'Course Book', amt: 450, cat: 'Books', month: '2026-10' },
      { desc: 'Metro Card', amt: 300, cat: 'Travel', month: '2026-11' },
      { desc: 'Coffee', amt: 150, cat: 'Food', month: '2026-11' },
      { desc: 'Tiffin', amt: 200, cat: 'Food', month: '2026-11' },
    ];
    const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    const monthEl = document.querySelector('#monthFilter');

    // TODO (Step 1, 2 & 3): Filter by monthEl.value, reduce totals + byCat, format with inr.format()
    function updateSummary() {}

    monthEl.addEventListener('change', updateSummary);
    updateSummary();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function updateSummary() {
    const m = monthEl.value;
    const rows = m === 'all' ? EXPENSES : EXPENSES.filter((x) => x.month === m);
    const { total, byCat } = rows.reduce((acc, x) => {
      acc.total += x.amt;
      acc.byCat[x.cat] = (acc.byCat[x.cat] ?? 0) + x.amt;
      return acc;
    }, { total: 0, byCat: {} });
    document.querySelector('#totalOut').textContent = \`Total (\${rows.length} items): \${inr.format(total)}\`;
    document.querySelector('#catOut').textContent = Object.entries(byCat)
      .map(([k, v]) => \`\${k}: \${inr.format(v)}\`)
      .join(' | ') || 'No expenses';
  }
</script>`,
      },
      {
        title: 'Milestone 3 — Safe CSV Export & Persistence',
        keywords: ['CSV escaping', 'Blob', 'URL.createObjectURL', 'localStorage'],
        definition: 'Generate downloadable RFC-4180 compliant CSV output escaping commas and quotes properly.',
        syntax: 'const csvCell = (v) => `"${String(v).replaceAll(\'"\', \'""\')}"`;',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Write escapeCsvCell(val) doubling internal quotes and wrapping in "..."',
            'Step 2 -> Map expenses array to CSV header + newline-joined rows',
            'Step 3 -> Preview generated CSV cleanly and trigger a Blob file download',
          ],
        }],
        testCases: [
          { label: 'Quotes & commas escaped', input: 'desc = \'Lunch, "Deluxe"\'', expected: '"Lunch, ""Deluxe"""' },
          { label: 'Header row present', input: 'Click Export CSV', expected: 'Starts with "Description,Category,Amount"' },
        ],
        hints: [
          { step: 1, text: 'Always wrap fields containing commas or quotes using `"${String(v).replaceAll(\'"\', \'""\')}"`.' },
          { step: 2, text: 'Build rows = ["Description,Category,Amount", ...items.map(...)].join("\\n").' },
          { step: 3, text: 'Create new Blob([csv], { type: "text/csv;charset=utf-8" }) for download link.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P7 Milestone 3 — CSV Export</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:500px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}pre{background:#0f172a;border:1px solid #334155;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:12px}</style>
</head>
<body>
  <div class="card">
    <h2>RFC-4180 CSV Export (Milestone 3)</h2>
    <button id="csvBtn">Generate & Download CSV</button>
    <pre id="csvOut">Click button to inspect CSV output...</pre>
  </div>
  <script>
    const EXPENSES = [
      { desc: 'Lunch, "Cafe"', cat: 'Food', amt: 250 },
      { desc: 'JS Handbook', cat: 'Books', amt: 499 },
    ];

    // TODO (Step 1): Escape quotes as "" and wrap in double quotes
    function escapeCsv(val) {
      return String(val);
    }

    // TODO (Step 2 & 3): Join header + rows and render in #csvOut + Blob download
    document.querySelector('#csvBtn').addEventListener('click', () => {
      // Build csv string, display in #csvOut, create Blob URL
    });
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function escapeCsv(val) {
    return \`"\${String(val).replaceAll('"', '""')}"\`;
  }
  document.querySelector('#csvBtn').addEventListener('click', () => {
    const lines = ['Description,Category,Amount', ...EXPENSES.map((e) => [e.desc, e.cat, e.amt].map(escapeCsv).join(','))];
    const csv = lines.join('\\n');
    document.querySelector('#csvOut').textContent = csv;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  });
</script>`,
      },
    ],
  },

  8: {
    overview: {
      keywords: ['Array(9)', 'win matrix', 'turn state', 'delegation', 'reset'],
      definition: 'Build a Tic-Tac-Toe game backed by a 9-cell state array, an 8-line win matrix, move guards, and round scoreboard.',
      syntax: 'const WIN = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];',
      architecture: [
        'Milestone 1 -> Wire 3x3 cell delegation, overwrite protection, and X/O turn switching',
        'Milestone 2 -> Implement checkWinner() over WIN triples + draw detection + cell highlight',
        'Milestone 3 -> Add persistent round scoreboard (X / O / Draws) and clean New Round reset',
      ],
      testCases: [
        { label: 'Diagonal X win', input: 'Cells 0, 4, 8 marked X', expected: 'Declares Winner: X and locks remaining board cells' },
        { label: 'Occupied cell guard', input: 'Click cell already marked X', expected: 'Turn stays intact; cell value unchanged' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P8: Tic-Tac-Toe</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.wrap{max-width:320px;margin:0 auto;text-align:center}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.cell{height:82px;font-size:32px;font-weight:800;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#22d3ee;cursor:pointer}.cell.win{background:#064e3b;border-color:#22c55e}button.pri{background:#06b6d4;color:#082f49;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer}</style>
</head>
<body>
  <div class="wrap">
    <h3 id="status">Tic-Tac-Toe Blueprint</h3>
    <div id="board" class="grid"></div>
    <p style="color:#94a3b8;font-size:13px;">Move to Milestone 1 to render the 9 interactive cells!</p>
  </div>
  <script>console.log('P8 layout loaded');</script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — 9-Cell Board & Alternating Turns',
        keywords: ['Array(9)', 'delegation', 'dataset.idx', 'guard'],
        definition: 'Render 9 clickable cells from board = Array(9).fill(null), block occupied squares, and alternate X/O turns.',
        syntax: 'if (board[i] !== null || gameOver) return;\nboard[i] = turn;',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Render 9 <button class="cell"> items from board = Array(9).fill(null)',
            'Step 2 -> Guard against clicking an already occupied cell (board[idx] !== null)',
            'Step 3 -> Set board[idx] = turn, flip turn between "X" and "O", and re-render',
          ],
        }],
        testCases: [
          { label: 'First move', input: 'Click cell 4', expected: 'Center shows X; status reads "Turn: O"' },
          { label: 'Replay protection', input: 'Click center cell again', expected: 'Ignored; turn stays O' },
        ],
        hints: [
          { step: 1, text: 'Loop i from 0 to 8 inside renderBoard() creating button elements.' },
          { step: 2, text: 'Set btn.dataset.idx = String(i) and btn.textContent = board[i] ?? "".' },
          { step: 3, text: 'Flip turn using turn = turn === "X" ? "O" : "X".' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P8 Milestone 1</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.wrap{max-width:300px;margin:0 auto;text-align:center}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.cell{height:76px;font-size:28px;font-weight:800;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#22d3ee;cursor:pointer}</style>
</head>
<body>
  <div class="wrap">
    <h3 id="status">Turn: X</h3>
    <div id="board" class="grid"></div>
  </div>
  <script>
    const board = Array(9).fill(null);
    let turn = 'X';
    const boardEl = document.querySelector('#board');
    const statusEl = document.querySelector('#status');

    // TODO (Step 1): Render 9 cells from board[]
    function render() {
      boardEl.replaceChildren();
    }

    // TODO (Step 2 & 3): Delegated click -> guard occupied -> place turn -> flip X/O -> render()
    boardEl.addEventListener('click', (e) => {});

    render();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function render() {
    boardEl.replaceChildren();
    board.forEach((val, i) => {
      const btn = document.createElement('button');
      btn.className = 'cell'; btn.dataset.idx = String(i); btn.textContent = val ?? '';
      boardEl.append(btn);
    });
    statusEl.textContent = \`Turn: \${turn}\`;
  }
  boardEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const i = Number(cell.dataset.idx);
    if (board[i] !== null) return;
    board[i] = turn;
    turn = turn === 'X' ? 'O' : 'X';
    render();
  });
</script>`,
      },
      {
        title: 'Milestone 2 — Win Condition Matrix & Draw Lock',
        keywords: ['WIN matrix', 'array destructuring', 'every()', 'highlight'],
        definition: 'Detect wins across all 8 winning lines, highlight the winning triple in green, and lock the board on win or draw.',
        syntax: 'for (const [a, b, c] of WIN) if (board[a] && board[a] === board[b] && board[a] === board[c]) ...',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Implement checkOutcome(board) scanning WIN matrix for a winner triple',
            'Step 2 -> Return { winner: "Draw" } when board.every(Boolean) is true without a winner',
            'Step 3 -> Lock board moves once outcome !== null and apply .win class to winning cells',
          ],
        }],
        testCases: [
          { label: 'Row win stops game', input: 'X marks 0, 1, 2', expected: 'Cells 0, 1, 2 turn green; further clicks ignored' },
          { label: 'Full board no winner', input: '9 moves with no 3-in-row', expected: 'Status shows "Draw!"' },
        ],
        hints: [
          { step: 1, text: 'Return { winner: board[a], line: [a, b, c] } so render() knows which indices get .win.' },
          { step: 2, text: 'Guard click handler with if (board[i] || outcome) return;.' },
          { step: 3, text: 'Check WIN before checking Draw — a win on move 9 must count as a Win, not a Draw!' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P8 Milestone 2</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.wrap{max-width:300px;margin:0 auto;text-align:center}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.cell{height:76px;font-size:28px;font-weight:800;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#22d3ee;cursor:pointer}.cell.win{background:#064e3b;border-color:#22c55e;color:#86efac}</style>
</head>
<body>
  <div class="wrap">
    <h3 id="status">Turn: X</h3>
    <div id="board" class="grid"></div>
  </div>
  <script>
    const WIN = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const board = Array(9).fill(null);
    let turn = 'X', outcome = null;

    // TODO (Step 1 & 2): Return { winner, line } or { winner: 'Draw', line: [] } or null
    function checkOutcome(b) {
      return null;
    }

    function render() {
      const boardEl = document.querySelector('#board');
      boardEl.replaceChildren();
      board.forEach((v, i) => {
        const b = document.createElement('button');
        b.className = 'cell';
        if (outcome?.line?.includes(i)) b.classList.add('win');
        b.dataset.idx = String(i); b.textContent = v ?? '';
        boardEl.append(b);
      });
      document.querySelector('#status').textContent = outcome
        ? (outcome.winner === 'Draw' ? 'Result: Draw!' : \`Winner: \${outcome.winner}!\`)
        : \`Turn: \${turn}\`;
    }

    // TODO (Step 3): Lock board when outcome exists; update outcome = checkOutcome(board) after placing mark
    document.querySelector('#board').addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell) return;
      const i = Number(cell.dataset.idx);
      if (board[i] || outcome) return;
      board[i] = turn;
      outcome = checkOutcome(board);
      if (!outcome) turn = turn === 'X' ? 'O' : 'X';
      render();
    });
    render();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function checkOutcome(b) {
    for (const [x, y, z] of WIN) {
      if (b[x] && b[x] === b[y] && b[x] === b[z]) return { winner: b[x], line: [x, y, z] };
    }
    return b.every(Boolean) ? { winner: 'Draw', line: [] } : null;
  }
</script>`,
      },
      {
        title: 'Milestone 3 — Scoreboard & Clean Round Reset',
        keywords: ['scoreboard', 'Array.fill(null)', 'reset', 'state'],
        definition: 'Track cumulative X/O/Draw scores across rounds and wire the New Round button cleanly.',
        syntax: 'board.fill(null); outcome = null; turn = "X";',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Track { X: 0, O: 0, Draw: 0 } scoreboard counts',
            'Step 2 -> Increment the matching scoreboard key immediately when outcome becomes non-null',
            'Step 3 -> Wire #resetBtn to clear board.fill(null), outcome, turn, and re-render while keeping scores',
          ],
        }],
        testCases: [
          { label: 'New round keeps score', input: 'X wins -> click New Round', expected: 'Board empties, scores show X: 1 | O: 0' },
          { label: 'Draw counter works', input: 'Round ends in Draw', expected: 'Draws increments by 1 without crediting X or O' },
        ],
        hints: [
          { step: 1, text: 'Only increment scores[outcome.winner]++ once at the moment checkOutcome() transitions from null to result.' },
          { step: 2, text: 'Use board.fill(null) to reset in-place cleanly.' },
          { step: 3, text: 'Render scores in #scores element inside render().' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P8 Milestone 3</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.wrap{max-width:300px;margin:0 auto;text-align:center}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.cell{height:70px;font-size:26px;font-weight:800;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#22d3ee;cursor:pointer}.cell.win{background:#064e3b;border-color:#22c55e}button.pri{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}</style>
</head>
<body>
  <div class="wrap">
    <div id="scores" style="color:#94a3b8;font-size:13px;">X: 0 | O: 0 | Draws: 0</div>
    <h3 id="status">Turn: X</h3>
    <div id="board" class="grid"></div>
    <button id="resetBtn" class="pri">New Round</button>
  </div>
  <script>
    const WIN = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const board = Array(9).fill(null);
    const scores = { X: 0, O: 0, Draw: 0 };
    let turn = 'X', outcome = null;

    function checkOutcome(b) {
      for (const [x, y, z] of WIN) if (b[x] && b[x] === b[y] && b[x] === b[z]) return { winner: b[x], line: [x, y, z] };
      return b.every(Boolean) ? { winner: 'Draw', line: [] } : null;
    }
    function render() {
      const boardEl = document.querySelector('#board');
      boardEl.replaceChildren();
      board.forEach((v, i) => {
        const b = document.createElement('button');
        b.className = 'cell' + (outcome?.line?.includes(i) ? ' win' : '');
        b.dataset.idx = String(i); b.textContent = v ?? '';
        boardEl.append(b);
      });
      document.querySelector('#scores').textContent = \`X: \${scores.X} | O: \${scores.O} | Draws: \${scores.Draw}\`;
      document.querySelector('#status').textContent = outcome ? (outcome.winner === 'Draw' ? 'Draw!' : \`Winner: \${outcome.winner}!\`) : \`Turn: \${turn}\`;
    }
    document.querySelector('#board').addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (!cell || outcome) return;
      const i = Number(cell.dataset.idx);
      if (board[i]) return;
      board[i] = turn;
      outcome = checkOutcome(board);
      // TODO (Step 1 & 2): Increment scores[outcome.winner] when outcome exists
      if (!outcome) turn = turn === 'X' ? 'O' : 'X';
      render();
    });

    // TODO (Step 3): Wire #resetBtn click to reset board, outcome, turn and call render()

    render();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  // Inside click handler after outcome = checkOutcome(board):
  if (outcome) scores[outcome.winner]++;
  document.querySelector('#resetBtn').addEventListener('click', () => {
    board.fill(null); outcome = null; turn = 'X'; render();
  });
</script>`,
      },
    ],
  },

  9: {
    overview: {
      keywords: ['CSS translateX', 'modulo wrap', 'aria-current', 'autoplay', 'touchstart'],
      definition: 'Build a responsive Image/Card Carousel with modulo wrap-around navigation, active indicator dots, hover-pausing autoplay, and touch swipe.',
      syntax: 'index = ((n % total) + total) % total;\ntrack.style.transform = `translateX(-${index * 100}%)`;',
      architecture: [
        'Milestone 1 -> Write modulo-safe goTo(idx) translating the flex track cleanly',
        'Milestone 2 -> Build dynamic indicator dots + Left/Right keyboard arrow support',
        'Milestone 3 -> Add hover-pausing autoplay interval + touch swipe delta detection',
      ],
      testCases: [
        { label: 'Backward wrap at slide 0', input: 'Prev click when idx=0 of 4', expected: 'Wraps cleanly to slide 3 (((0-1)%4+4)%4)' },
        { label: 'Hover pauses autoplay', input: 'mouseenter carousel', expected: 'Autoplay pauses until mouseleave' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P9: Carousel</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.car{max-width:440px;margin:0 auto}.view{overflow:hidden;border-radius:12px;border:1px solid #334155}.track{display:flex;transition:transform .35s ease}.slide{min-width:100%;height:160px;display:grid;place-items:center;font-size:22px;font-weight:800}</style>
</head>
<body>
  <div class="car">
    <div class="view"><div class="track"><div class="slide" style="background:#0e7490">Slide 1</div><div class="slide" style="background:#4338ca">Slide 2</div><div class="slide" style="background:#047857">Slide 3</div></div></div>
    <p style="color:#94a3b8;font-size:13px;">Move to Milestone 1 to wire goTo(idx) navigation!</p>
  </div>
  <script>console.log('P9 carousel layout ready');</script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — Modulo Wrap & Smooth Track Translation',
        keywords: ['modulo arithmetic', 'translateX', 'prev / next', 'bounds'],
        definition: 'Implement wrap-around modulo math inside goTo(nextIdx) so Prev on slide 0 wraps cleanly to the last slide.',
        syntax: 'idx = ((next % count) + count) % count;',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Implement wrap-around goTo(nextIdx) using ((next % total) + total) % total',
            'Step 2 -> Apply translateX(-${idx * 100}%) on .track element',
            'Step 3 -> Wire #prevBtn and #nextBtn click handlers',
          ],
        }],
        testCases: [
          { label: 'Negative index wrap', input: 'goTo(-1) with 3 slides', expected: 'Jumps cleanly to Slide 3 (idx=2)' },
          { label: 'Forward wrap', input: 'Next click at last slide', expected: 'Wraps cleanly to Slide 1 (idx=0)' },
        ],
        hints: [
          { step: 1, text: 'In JS, -1 % 3 is -1, NOT 2 — always add + total before taking % total again!' },
          { step: 2, text: 'Count slides via track.children.length.' },
          { step: 3, text: 'Update #counter text so student sees "Slide 1 / 3".' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P9 Milestone 1</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.car{max-width:440px;margin:0 auto}.view{overflow:hidden;border-radius:12px;border:1px solid #334155}.track{display:flex;transition:transform .35s ease}.slide{min-width:100%;height:150px;display:grid;place-items:center;font-size:22px;font-weight:800}.row{display:flex;justify-content:space-between;align-items:center;margin-top:10px}button{background:#06b6d4;color:#082f49;border:none;padding:7px 14px;border-radius:8px;font-weight:700;cursor:pointer}</style>
</head>
<body>
  <div class="car">
    <div class="view"><div id="track" class="track"><div class="slide" style="background:#0e7490">1: Closures</div><div class="slide" style="background:#4338ca">2: Promises</div><div class="slide" style="background:#047857">3: Event Loop</div></div></div>
    <div class="row"><button id="prevBtn">Prev</button><span id="counter">1 / 3</span><button id="nextBtn">Next</button></div>
  </div>
  <script>
    const track = document.querySelector('#track');
    const counter = document.querySelector('#counter');
    const total = track.children.length;
    let idx = 0;

    // TODO (Step 1 & 2): Compute modulo-safe idx, move track via translateX, update counter
    function goTo(nextIdx) {
      // Write logic here
    }

    // TODO (Step 3): Wire #prevBtn and #nextBtn clicks
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function goTo(nextIdx) {
    idx = ((nextIdx % total) + total) % total;
    track.style.transform = \`translateX(-\${idx * 100}%)\`;
    counter.textContent = \`\${idx + 1} / \${total}\`;
  }
  document.querySelector('#prevBtn').addEventListener('click', () => goTo(idx - 1));
  document.querySelector('#nextBtn').addEventListener('click', () => goTo(idx + 1));
</script>`,
      },
      {
        title: 'Milestone 2 — Indicator Dots & Keyboard Arrows',
        keywords: ['dots UI', 'aria-current', 'keydown', 'ArrowLeft / ArrowRight'],
        definition: 'Generate clickable indicator dots synced to the current slide and add Left/Right arrow key support.',
        syntax: 'dot.setAttribute("aria-current", i === idx ? "true" : "false");',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Generate 1 dot button per slide inside #dots container',
            'Step 2 -> Sync .active class and aria-current inside goTo()',
            'Step 3 -> Handle ArrowLeft / ArrowRight on keydown to jump slides',
          ],
        }],
        testCases: [
          { label: 'Click dot 3', input: 'Click third dot button', expected: 'Moves directly to slide 3 and highlights third dot' },
          { label: 'ArrowRight key', input: 'Press ArrowRight', expected: 'Advances to next slide' },
        ],
        hints: [
          { step: 1, text: 'Store created dot elements in an array or querySelectorAll inside goTo().' },
          { step: 2, text: 'Delegate clicks on #dots using btn.dataset.slide.' },
          { step: 3, text: 'Check e.key === "ArrowLeft" / "ArrowRight" on document keydown.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P9 Milestone 2</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.car{max-width:440px;margin:0 auto}.view{overflow:hidden;border-radius:12px;border:1px solid #334155}.track{display:flex;transition:transform .35s ease}.slide{min-width:100%;height:140px;display:grid;place-items:center;font-size:20px;font-weight:800}.dots{display:flex;justify-content:center;gap:8px;margin-top:10px}.dot{width:12px;height:12px;border-radius:999px;border:none;background:#475569;cursor:pointer}.dot.active{background:#22d3ee;transform:scale(1.2)}</style>
</head>
<body>
  <div class="car">
    <div class="view"><div id="track" class="track"><div class="slide" style="background:#0e7490">Slide A</div><div class="slide" style="background:#4338ca">Slide B</div><div class="slide" style="background:#047857">Slide C</div></div></div>
    <div id="dots" class="dots"></div>
  </div>
  <script>
    const track = document.querySelector('#track');
    const dotsEl = document.querySelector('#dots');
    const total = track.children.length;
    let idx = 0;

    // TODO (Step 1): Create dot buttons dynamically in #dots

    function goTo(n) {
      idx = ((n % total) + total) % total;
      track.style.transform = \`translateX(-\${idx * 100}%)\`;
      // TODO (Step 2): Toggle .active & aria-current on matching dot
    }

    // TODO (Step 3): Add document keydown listener for ArrowLeft and ArrowRight

    goTo(0);
  </script>
</body>
</html>`,
        solutionCode: `<script>
  for (let i = 0; i < total; i++) {
    const d = document.createElement('button');
    d.className = 'dot'; d.dataset.slide = String(i);
    dotsEl.append(d);
  }
  dotsEl.addEventListener('click', (e) => {
    const d = e.target.closest('.dot');
    if (d) goTo(Number(d.dataset.slide));
  });
  function goTo(n) {
    idx = ((n % total) + total) % total;
    track.style.transform = \`translateX(-\${idx * 100}%)\`;
    dotsEl.querySelectorAll('.dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
      d.setAttribute('aria-current', i === idx ? 'true' : 'false');
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goTo(idx + 1);
    else if (e.key === 'ArrowLeft') goTo(idx - 1);
  });
</script>`,
      },
      {
        title: 'Milestone 3 — Autoplay with Hover Pause & Touch Swipe',
        keywords: ['setInterval', 'mouseenter / mouseleave', 'touchstart / touchend'],
        definition: 'Run a 2.5s autoplay loop that pauses on hover/focus and detects left/right touch swipe gestures.',
        syntax: 'const dx = e.changedTouches[0].clientX - startX;\nif (Math.abs(dx) > 40) goTo(idx + (dx < 0 ? 1 : -1));',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Implement startAuto() and stopAuto() clearing interval cleanly',
            'Step 2 -> Pause autoplay on carousel mouseenter and resume on mouseleave',
            'Step 3 -> Record touchstart clientX and trigger slide change on touchend if |dx| > 40px',
          ],
        }],
        testCases: [
          { label: 'Hover pauses badge', input: 'Hover carousel element', expected: 'Badge changes to "Autoplay: Paused"' },
          { label: 'Left swipe gesture', input: 'dx = -70px', expected: 'Advances to next slide' },
        ],
        hints: [
          { step: 1, text: 'Always call stopAuto() before creating a new interval inside startAuto().' },
          { step: 2, text: 'Negative dx (dragged left) moves forward idx + 1; positive dx moves back idx - 1.' },
          { step: 3, text: 'Update #autoBadge text cleanly inside startAuto/stopAuto for easy verification.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P9 Milestone 3</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.car{max-width:440px;margin:0 auto}.view{overflow:hidden;border-radius:12px;border:1px solid #334155}.track{display:flex;transition:transform .35s ease}.slide{min-width:100%;height:140px;display:grid;place-items:center;font-size:20px;font-weight:800}</style>
</head>
<body>
  <div id="carousel" class="car">
    <div id="autoBadge" style="color:#94a3b8;font-size:13px;margin-bottom:6px;">Autoplay: Active</div>
    <div class="view"><div id="track" class="track"><div class="slide" style="background:#0e7490">1</div><div class="slide" style="background:#4338ca">2</div><div class="slide" style="background:#047857">3</div></div></div>
  </div>
  <script>
    const car = document.querySelector('#carousel');
    const track = document.querySelector('#track');
    const badge = document.querySelector('#autoBadge');
    const total = track.children.length;
    let idx = 0, timer = null, touchStartX = 0;

    function goTo(n) {
      idx = ((n % total) + total) % total;
      track.style.transform = \`translateX(-\${idx * 100}%)\`;
    }

    // TODO (Step 1): startAuto() & stopAuto()
    function startAuto() {}
    function stopAuto() {}

    // TODO (Step 2): Pause on mouseenter, resume on mouseleave

    // TODO (Step 3): Listen to touchstart & touchend to swipe when |dx| > 40

    startAuto();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function stopAuto() { clearInterval(timer); timer = null; badge.textContent = 'Autoplay: Paused'; }
  function startAuto() {
    stopAuto();
    badge.textContent = 'Autoplay: Active';
    timer = setInterval(() => goTo(idx + 1), 2500);
  }
  car.addEventListener('mouseenter', stopAuto);
  car.addEventListener('mouseleave', startAuto);
  car.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  car.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) goTo(idx + (dx < 0 ? 1 : -1));
  });
</script>`,
      },
    ],
  },

  10: {
    overview: {
      keywords: ['crypto.getRandomValues', 'Fisher-Yates', 'strength meter', 'clipboard'],
      definition: 'Build a cryptographically secure Password Generator using Web Crypto CSPRNG, unbiased modulo/class guarantees, strength scoring, and clipboard copy.',
      syntax: 'const buf = new Uint32Array(1);\ncrypto.getRandomValues(buf);',
      architecture: [
        'Milestone 1 -> Build CSPRNG randInt(max) and checkbox character pool builder',
        'Milestone 2 -> Guarantee >= 1 char per selected set and shuffle via Fisher-Yates',
        'Milestone 3 -> Compute strength score meter + copy via navigator.clipboard.writeText',
      ],
      testCases: [
        { label: 'All character classes off', input: 'Uncheck all 4 checkboxes', expected: 'Shows clean error; refuses generating blank password' },
        { label: 'Class guarantee', input: 'Length 12 with Numbers + Symbols', expected: 'Result always contains at least 1 digit & 1 symbol' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P10: Password Generator</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:440px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.out{font-family:monospace;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:8px;word-break:break-all;margin:10px 0}</style>
</head>
<body>
  <div class="card">
    <h2>Secure Password Generator</h2>
    <div class="out">Click Milestone 1 to wire crypto.getRandomValues</div>
  </div>
  <script>console.log('P10 layout ready');</script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — CSPRNG Randomizer & Character Pool',
        keywords: ['crypto.getRandomValues', 'Uint32Array', 'checkboxes', 'pool'],
        definition: 'Replace Math.random() with crypto.getRandomValues() for unpredictable indexing and build the active charset from checkboxes.',
        syntax: 'const randInt = (max) => crypto.getRandomValues(new Uint32Array(1))[0] % max;',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Write randInt(max) using crypto.getRandomValues(new Uint32Array(1))',
            'Step 2 -> Collect enabled charsets (#upper, #lower, #num, #sym); guard empty selection',
            'Step 3 -> Generate random string matching slider length #lenRange',
          ],
        }],
        testCases: [
          { label: 'Respect selected length', input: 'Length = 16', expected: 'Generated output length === 16' },
          { label: 'Empty pool blocked', input: 'All checkboxes unchecked', expected: 'Displays "Select at least one character type"' },
        ],
        hints: [
          { step: 1, text: 'Keep character constants UPPER, LOWER, NUM, SYM at the top.' },
          { step: 2, text: 'Read Number(lenRange.value) for target length.' },
          { step: 3, text: 'Guard if (!pool.length) before sampling characters.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P10 Milestone 1</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:440px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.out{font-family:monospace;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:8px;margin:10px 0}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}</style>
</head>
<body>
  <div class="card">
    <h2>CSPRNG Generator (Milestone 1)</h2>
    <label>Length: <span id="lenVal">14</span> <input id="lenRange" type="range" min="6" max="32" value="14" /></label><br/>
    <label><input id="upper" type="checkbox" checked /> A-Z</label>
    <label><input id="lower" type="checkbox" checked /> a-z</label>
    <label><input id="num" type="checkbox" checked /> 0-9</label>
    <label><input id="sym" type="checkbox" /> !@#$</label>
    <div id="passOut" class="out">--</div>
    <button id="genBtn">Generate</button>
  </div>
  <script>
    const SETS = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', num: '0123456789', sym: '!@#$%^&*-_' };

    // TODO (Step 1): Return secure random integer in [0, max)
    const randInt = (max) => 0;

    // TODO (Step 2 & 3): Collect enabled SETS, guard empty, sample N chars, update #passOut
    function generate() {}

    document.querySelector('#lenRange').addEventListener('input', (e) => {
      document.querySelector('#lenVal').textContent = e.target.value;
    });
    document.querySelector('#genBtn').addEventListener('click', generate);
  </script>
</body>
</html>`,
        solutionCode: `<script>
  const randInt = (max) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
  function generate() {
    let pool = '';
    for (const [id, chars] of Object.entries(SETS)) {
      if (document.querySelector('#' + id).checked) pool += chars;
    }
    if (!pool) return (document.querySelector('#passOut').textContent = 'Select >= 1 option');
    const len = Number(document.querySelector('#lenRange').value);
    let out = '';
    for (let i = 0; i < len; i++) out += pool[randInt(pool.length)];
    document.querySelector('#passOut').textContent = out;
  }
</script>`,
      },
      {
        title: 'Milestone 2 — Guaranteed Class Mix & Fisher-Yates Shuffle',
        keywords: ['Fisher-Yates', 'shuffle', 'class guarantee', 'arrays'],
        definition: 'Guarantee at least one character from every checked set and shuffle with CSPRNG Fisher-Yates so patterns never leak at index 0.',
        syntax: 'for (let i = arr.length - 1; i > 0; i--) { const j = randInt(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Push 1 random char from each checked set first',
            'Step 2 -> Fill remaining length up to target from combined pool',
            'Step 3 -> Run in-place Fisher-Yates shuffle before .join("")',
          ],
        }],
        testCases: [
          { label: 'Zero missing classes', input: '100 runs with Upper+Lower+Num+Sym', expected: 'Every generated password matches all 4 regex classes' },
          { label: 'Randomized positions', input: 'Symbol position across runs', expected: 'Symbols appear uniformly, not clustered at start' },
        ],
        hints: [
          { step: 1, text: 'Keep enabledSets as an array of strings (e.g., [SETS.upper, SETS.num]).' },
          { step: 2, text: 'Pick one char per set: chars.push(set[randInt(set.length)]).' },
          { step: 3, text: 'Slice/limit or loop while (chars.length < len) then shuffle chars.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P10 Milestone 2</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:440px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.out{font-family:monospace;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:8px;margin:10px 0}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer}</style>
</head>
<body>
  <div class="card">
    <h2>Guaranteed Diversity + Shuffle (Milestone 2)</h2>
    <button id="genBtn">Generate Verified Password</button>
    <div id="passOut" class="out">--</div>
    <div id="checkOut" style="font-size:13px;color:#94a3b8;">--</div>
  </div>
  <script>
    const GROUPS = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789', '!@#$%^&*'];
    const randInt = (max) => crypto.getRandomValues(new Uint32Array(1))[0] % max;

    // TODO (Step 3): Implement unbiased Fisher-Yates shuffle
    function shuffle(arr) {
      return arr;
    }

    // TODO (Step 1 & 2): Guarantee 1 char per group, fill to length 12, then shuffle(chars)
    function generateStrong(len = 12) {
      return 'todo';
    }

    document.querySelector('#genBtn').addEventListener('click', () => {
      const pw = generateStrong(12);
      document.querySelector('#passOut').textContent = pw;
      const ok = /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
      document.querySelector('#checkOut').textContent = 'All 4 classes guaranteed: ' + ok;
    });
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function generateStrong(len = 12) {
    const chars = GROUPS.map((g) => g[randInt(g.length)]);
    const all = GROUPS.join('');
    while (chars.length < len) chars.push(all[randInt(all.length)]);
    return shuffle(chars.slice(0, len)).join('');
  }
</script>`,
      },
      {
        title: 'Milestone 3 — Strength Meter & Clipboard Copy',
        keywords: ['RegExp strength', 'progress bar', 'navigator.clipboard', 'async'],
        definition: 'Compute visual password strength (length + diversity rules) and implement async Clipboard copy with fallback feedback.',
        syntax: 'await navigator.clipboard.writeText(pw);',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Write evaluateStrength(pw) scoring length >= 8/12/16 + character diversity (0..4)',
            'Step 2 -> Update strength bar width % & color (Weak / Fair / Strong / Very Strong)',
            'Step 3 -> Copy password cleanly with navigator.clipboard.writeText() + "Copied!" feedback',
          ],
        }],
        testCases: [
          { label: 'Weak password', input: '"abc123"', expected: 'Score <= 1 -> Red "Weak" meter bar' },
          { label: 'Strong password', input: '"K9!pX#4mQ2zW"', expected: 'Score 4 -> Emerald "Very Strong"' },
        ],
        hints: [
          { step: 1, text: 'Test pw.length >= 12 plus /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/ to tally a 0..4 score.' },
          { step: 2, text: 'Wrap navigator.clipboard.writeText in try/catch in case iframe clipboard permission is restricted.' },
          { step: 3, text: 'Revert "Copied!" label after setTimeout(..., 1200).' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P10 Milestone 3</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:440px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}.bar{height:8px;background:#334155;border-radius:99px;overflow:hidden;margin:10px 0}.fill{height:100%;width:0;transition:width .25s}input{width:100%;padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc;box-sizing:border-box}button{background:#06b6d4;color:#082f49;border:none;padding:8px 14px;border-radius:8px;font-weight:700;cursor:pointer;margin-top:8px}</style>
</head>
<body>
  <div class="card">
    <h2>Strength Meter & Copy (Milestone 3)</h2>
    <input id="pwInput" value="K9!pX#4mQ2zW" />
    <div class="bar"><div id="fill" class="fill"></div></div>
    <div id="label" style="font-size:13px;color:#94a3b8;">Strength: --</div>
    <button id="copyBtn">Copy Password</button>
  </div>
  <script>
    const pwInput = document.querySelector('#pwInput');
    const fill = document.querySelector('#fill');
    const label = document.querySelector('#label');
    const copyBtn = document.querySelector('#copyBtn');

    // TODO (Step 1 & 2): Score pw 0..4 and style fill width/color + label text
    function updateStrength(pw) {}

    // TODO (Step 3): Async copy handler using navigator.clipboard.writeText + timeout reset
    copyBtn.addEventListener('click', async () => {});

    pwInput.addEventListener('input', () => updateStrength(pwInput.value));
    updateStrength(pwInput.value);
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function updateStrength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    const meta = [
      ['20%', '#ef4444', 'Very Weak'], ['40%', '#f97316', 'Weak'],
      ['65%', '#eab308', 'Fair'], ['85%', '#22c55e', 'Strong'], ['100%', '#10b981', 'Very Strong'],
    ][score];
    fill.style.width = meta[0]; fill.style.background = meta[1];
    label.textContent = \`Strength: \${meta[2]} (\${score}/4)\`;
  }
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pwInput.value); copyBtn.textContent = 'Copied!'; }
    catch { copyBtn.textContent = 'Copy blocked in frame'; }
    setTimeout(() => { copyBtn.textContent = 'Copy Password'; }, 1200);
  });
</script>`,
      },
    ],
  },

  11: {
    overview: {
      keywords: ['debounce', 'AbortController', 'URLSearchParams', 'pagination', 'Set favorites'],
      definition: 'Build a debounced Movie/Book Search App cancelling stale searches via AbortController, managing page query strings, and persisting favorites.',
      syntax: 'const qs = new URLSearchParams({ q: term, page: String(page) }).toString();',
      architecture: [
        'Milestone 1 -> Implement debounce(fn, 300) closure & safe search results renderer',
        'Milestone 2 -> Wire AbortController request cancellation & URLSearchParams builder',
        'Milestone 3 -> Add client pagination controls + Set-backed Favorites toggle',
      ],
      testCases: [
        { label: 'Debounce coalesces bursts', input: 'Type "js" rapidly', expected: 'Executes search once after 300ms pause' },
        { label: 'Favorites persist toggle', input: 'Star item #2', expected: 'Count increments; second click unstars cleanly' },
      ],
      starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P11: Search & Pagination</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:500px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}input{width:100%;padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc;box-sizing:border-box}</style>
</head>
<body>
  <div class="card">
    <h2>Movie / Book Search</h2>
    <input placeholder="Advance to Milestone 1 to implement debounced search..." disabled />
  </div>
  <script>console.log('P11 layout loaded');</script>
</body>
</html>`,
    },
    milestones: [
      {
        title: 'Milestone 1 — Debounce Closure & Catalog Filtering',
        keywords: ['debounce', 'clearTimeout', 'filter', 'createElement'],
        definition: 'Write the reusable debounce(fn, 300) higher-order function and render filtered search cards safely.',
        syntax: 'clearTimeout(id); id = setTimeout(() => fn(...args), ms);',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Implement debounce(fn, delayMs) clearing any prior pending timeout',
            'Step 2 -> Filter catalog case-insensitively on title or author',
            'Step 3 -> Count total actual searches triggered vs raw keystrokes to prove debounce works',
          ],
        }],
        testCases: [
          { label: 'Typing burst', input: 'Type 5 chars within 100ms', expected: 'Search execution counter increments by 1 (not 5)' },
          { label: 'No match feedback', input: 'Search "zzzzz"', expected: 'Displays clean "No matching books found" notice' },
        ],
        hints: [
          { step: 1, text: 'Close over let timerId; inside debounce(fn, ms).' },
          { step: 2, text: 'Normalize both query and item.title with .toLowerCase().includes(q).' },
          { step: 3, text: 'Always render with createElement + textContent.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P11 Milestone 1</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:500px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}input{width:100%;padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc;box-sizing:border-box}li{padding:7px 10px;background:#0f172a;border:1px solid #334155;border-radius:8px;margin:6px 0}</style>
</head>
<body>
  <div class="card">
    <h2>Debounced Search (Milestone 1)</h2>
    <input id="q" placeholder="Search title or author (e.g. 'eloquent', 'you', 'clean')..." />
    <div id="metrics" style="font-size:12px;color:#94a3b8;margin:8px 0;">Executions: 0</div>
    <ul id="results" style="list-style:none;padding:0;"></ul>
  </div>
  <script>
    const BOOKS = [
      { id: 1, title: 'Eloquent JavaScript', author: 'Marijn Haverbeke' },
      { id: 2, title: "You Don't Know JS Yet", author: 'Kyle Simpson' },
      { id: 3, title: 'Clean Code', author: 'Robert Martin' },
      { id: 4, title: 'Designing Data-Intensive Apps', author: 'Martin Kleppmann' },
    ];
    let runs = 0;

    // TODO (Step 1): Implement debounce(fn, ms)
    function debounce(fn, ms) {
      return fn;
    }

    // TODO (Step 2 & 3): Filter BOOKS safely, increment runs counter, render #results
    function runSearch(term) {}

    const debounced = debounce(runSearch, 300);
    document.querySelector('#q').addEventListener('input', (e) => debounced(e.target.value));
    runSearch('');
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }
  function runSearch(term) {
    runs++;
    document.querySelector('#metrics').textContent = \`Executions: \${runs}\`;
    const q = term.trim().toLowerCase();
    const hits = BOOKS.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
    const list = document.querySelector('#results');
    list.replaceChildren();
    if (!hits.length) {
      const li = document.createElement('li'); li.textContent = 'No matching books found.';
      list.append(li); return;
    }
    hits.forEach((b) => {
      const li = document.createElement('li'); li.textContent = \`\${b.title} — \${b.author}\`;
      list.append(li);
    });
  }
</script>`,
      },
      {
        title: 'Milestone 2 — AbortController & URLSearchParams',
        keywords: ['URLSearchParams', 'AbortController', 'stale response', 'async'],
        definition: 'Build query strings with URLSearchParams and cancel superseded async searches cleanly using AbortController.',
        syntax: 'const qs = new URLSearchParams({ q, page }).toString();',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Construct safe query string with new URLSearchParams({ q, sort })',
            'Step 2 -> Abort any in-flight search controller before launching a new search',
            'Step 3 -> Ignore AbortError in catch while logging actual query URL preview',
          ],
        }],
        testCases: [
          { label: 'Special characters encoded', input: 'q = "C++ & JS"', expected: 'Query encodes as q=C%2B%2B+%26+JS' },
          { label: 'Stale search cancelled', input: 'Search A then immediately Search B', expected: 'Only B renders; A aborts quietly' },
        ],
        hints: [
          { step: 1, text: 'Never manually concatenate ?q=${term}; always let URLSearchParams encode safely.' },
          { step: 2, text: 'Keep let controller = null; outside searchAsync().' },
          { step: 3, text: 'Display generated query string in #urlPreview for visual debugging.' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P11 Milestone 2</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:500px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}input{width:100%;padding:8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#f8fafc;box-sizing:border-box}.url{font-family:monospace;font-size:12px;color:#38bdf8;margin:8px 0}</style>
</head>
<body>
  <div class="card">
    <h2>URLSearchParams & Abort (Milestone 2)</h2>
    <input id="q" placeholder="Type query (try special chars like C++ & JS)..." value="JS & DOM" />
    <div id="urlPreview" class="url">/api/books?...</div>
    <div id="out">Waiting...</div>
  </div>
  <script>
    function mockApiSearch(qs, signal) {
      return new Promise((res, rej) => {
        const id = setTimeout(() => res({ ok: true, count: Math.max(1, 10 - qs.length % 7), qs }), 250);
        signal.addEventListener('abort', () => { clearTimeout(id); rej(new DOMException('Aborted', 'AbortError')); });
      });
    }
    let activeCtrl = null;

    // TODO (Step 1, 2 & 3): Encode q via URLSearchParams, abort prior activeCtrl, await mockApiSearch
    async function search(q) {}

    document.querySelector('#q').addEventListener('input', (e) => search(e.target.value));
    search(document.querySelector('#q').value);
  </script>
</body>
</html>`,
        solutionCode: `<script>
  async function search(q) {
    activeCtrl?.abort();
    activeCtrl = new AbortController();
    const qs = new URLSearchParams({ q: q.trim(), page: '1' }).toString();
    document.querySelector('#urlPreview').textContent = \`/api/books?\${qs}\`;
    try {
      const data = await mockApiSearch(qs, activeCtrl.signal);
      document.querySelector('#out').textContent = \`Found \${data.count} results for \${data.qs}\`;
    } catch (err) {
      if (err.name !== 'AbortError') document.querySelector('#out').textContent = err.message;
    }
  }
</script>`,
      },
      {
        title: 'Milestone 3 — Client Pagination & Set Favorites',
        keywords: ['Array.slice', 'pagination', 'Set', 'favorites'],
        definition: 'Paginate matching results (2 items per page) and toggle persistent favorites backed by a Set.',
        syntax: 'const slice = items.slice((page - 1) * SIZE, page * SIZE);',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Compute totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE)) and slice active page',
            'Step 2 -> Disable Prev on page 1 and Next on totalPages cleanly',
            'Step 3 -> Toggle ID inside favs = new Set() on favorite button click and update #favCount',
          ],
        }],
        testCases: [
          { label: 'Pagination slice bounds', input: '5 items, PAGE_SIZE=2, page=2', expected: 'Shows items #3 and #4; Prev & Next enabled' },
          { label: 'Toggle favorite', input: 'Click Star twice on id=1', expected: 'Adds then removes from favs Set' },
        ],
        hints: [
          { step: 1, text: 'Clamp page with Math.min(page, totalPages) whenever filters change.' },
          { step: 2, text: 'Use favs.has(item.id) ? "Starred" : "Star" on button label.' },
          { step: 3, text: 'Delegate star clicks on #list using closest("[data-fav]").' },
        ],
        starterCode: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>P11 Milestone 3</title>
<style>body{font-family:system-ui;background:#0f172a;color:#f8fafc;padding:20px}.card{max-width:500px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px}li{display:flex;justify-content:space-between;align-items:center;padding:8px;background:#0f172a;border:1px solid #334155;border-radius:8px;margin:6px 0}.row{display:flex;justify-content:space-between;align-items:center;margin-top:10px}button{background:#06b6d4;color:#082f49;border:none;padding:6px 12px;border-radius:8px;font-weight:700;cursor:pointer}button:disabled{opacity:.4}</style>
</head>
<body>
  <div class="card">
    <h2>Pagination & Favorites <span id="favCount" style="color:#facc15">(0 favs)</span></h2>
    <ul id="list" style="list-style:none;padding:0;"></ul>
    <div class="row"><button id="prev">Prev</button><span id="pageInfo">Page 1</span><button id="next">Next</button></div>
  </div>
  <script>
    const ITEMS = [{ id: 1, t: 'JS Core' }, { id: 2, t: 'DOM Mastery' }, { id: 3, t: 'Async Patterns' }, { id: 4, t: 'Node.js APIs' }, { id: 5, t: 'Algorithms' }];
    const PAGE_SIZE = 2;
    let page = 1;
    const favs = new Set();

    // TODO (Step 1, 2 & 3): Implement paginated render(), Prev/Next disabled bounds, and favs Set toggling
    function render() {}

    document.querySelector('#prev').addEventListener('click', () => { if (page > 1) { page--; render(); } });
    document.querySelector('#next').addEventListener('click', () => { page++; render(); });
    render();
  </script>
</body>
</html>`,
        solutionCode: `<script>
  function render() {
    const totalPages = Math.max(1, Math.ceil(ITEMS.length / PAGE_SIZE));
    page = Math.min(page, totalPages);
    const slice = ITEMS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const list = document.querySelector('#list');
    list.replaceChildren();
    slice.forEach((it) => {
      const li = document.createElement('li');
      const s = document.createElement('span'); s.textContent = it.t;
      const b = document.createElement('button');
      b.dataset.fav = String(it.id); b.textContent = favs.has(it.id) ? 'Starred' : 'Star';
      li.append(s, b); list.append(li);
    });
    document.querySelector('#pageInfo').textContent = \`Page \${page} / \${totalPages}\`;
    document.querySelector('#favCount').textContent = \`(\${favs.size} favs)\`;
    document.querySelector('#prev').disabled = page <= 1;
    document.querySelector('#next').disabled = page >= totalPages;
  }
  document.querySelector('#list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    const id = Number(btn.dataset.fav);
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    render();
  });
</script>`,
      },
    ],
  },

  12: {
    overview: {
      keywords: ['REST API', 'Express', 'middleware', 'HTTP 201/400/404', 'CRUD'],
      definition: 'Build a complete Node + Express-style Todos REST API inside an executable JS micro-router sandbox with validation, route params, and centralized error middleware.',
      syntax: 'app.post("/todos", (req, res) => res.status(201).json(todo));',
      architecture: [
        'Milestone 1 -> Logger middleware + GET /todos + validated POST /todos (201 / 400)',
        'Milestone 2 -> Param route PUT /todos/:id and DELETE /todos/:id with 404 guards',
        'Milestone 3 -> Query filter ?done=true, centralized Error middleware, and test assertions',
      ],
      testCases: [
        { label: 'POST missing title', input: 'POST /todos {}', expected: 'HTTP 400 { error: "title is required" }' },
        { label: 'PUT unknown id', input: 'PUT /todos/999', expected: 'HTTP 404 { error: "Todo not found" }' },
      ],
      starterCode: `// P12 REST API Blueprint (Executable Node / JS Mini-Express Harness)
function createMiniExpress() {
  const routes = [];
  const middlewares = [];
  return {
    use(fn) { middlewares.push(fn); },
    add(method, path, fn) { routes.push({ method, path, fn }); },
    get(p, fn) { this.add('GET', p, fn); },
    post(p, fn) { this.add('POST', p, fn); },
    async handle(method, url, body = {}) {
      const [pathname, qs] = url.split('?');
      const query = Object.fromEntries(new URLSearchParams(qs || ''));
      let out = { status: 404, body: { error: 'Not Found' } };
      const req = { method, url, pathname, query, body, params: {} };
      const res = {
        code: 200,
        status(c) { this.code = c; return this; },
        json(data) { out = { status: this.code, body: data }; return out; },
      };
      for (const mw of middlewares) mw(req, res);
      for (const r of routes) {
        if (r.method !== method) continue;
        const m = matchPath(r.path, pathname);
        if (m) { req.params = m; r.fn(req, res); break; }
      }
      return out;
    },
  };
}
function matchPath(pat, actual) {
  const pa = pat.split('/'), aa = actual.split('/');
  if (pa.length !== aa.length) return null;
  const params = {};
  for (let i = 0; i < pa.length; i++) {
    if (pa[i].startsWith(':')) params[pa[i].slice(1)] = aa[i];
    else if (pa[i] !== aa[i]) return null;
  }
  return params;
}

const app = createMiniExpress();
console.log('Mini-Express router ready! Proceed to Milestone 1 to define routes.');`,
    },
    milestones: [
      {
        title: 'Milestone 1 — Logger Middleware, GET & Validated POST',
        keywords: ['middleware', 'GET', 'POST', 'status 201', 'validation 400'],
        definition: 'Register a request logger middleware, return todos on GET /todos, and validate titles on POST /todos returning 201 or 400.',
        syntax: 'if (!title) return res.status(400).json({ error: "title required" });',
        sections: [{
          heading: 'MILESTONE 1 TASKS',
          points: [
            'Step 1 -> Add app.use((req, res) => ...) logging method + url',
            'Step 2 -> Implement app.get("/todos", ...) returning status 200 JSON array',
            'Step 3 -> Implement app.post("/todos", ...): reject blank title with 400, else 201 + new todo',
          ],
        }],
        testCases: [
          { label: 'POST valid todo', input: 'POST /todos { title: "Ship API" }', expected: 'status: 201 with auto-incremented id & done: false' },
          { label: 'POST empty title', input: 'POST /todos { title: "  " }', expected: 'status: 400 { error: ... }' },
        ],
        hints: [
          { step: 1, text: 'Trim req.body?.title cleanly using String(req.body?.title ?? "").trim().' },
          { step: 2, text: 'Keep let nextId = 2 and push { id: nextId++, title, done: false } into todos.' },
          { step: 3, text: 'Chain res.status(201).json(todo) on success.' },
        ],
        starterCode: `function createMiniExpress() {
  const routes = [], mws = [];
  return {
    use: (fn) => mws.push(fn),
    get: (p, fn) => routes.push({ method: 'GET', path: p, fn }),
    post: (p, fn) => routes.push({ method: 'POST', path: p, fn }),
    async handle(method, url, body = {}) {
      let out = { status: 404, body: { error: 'Not Found' } };
      const req = { method, url, body, params: {} };
      const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { out = { status: this.code, body: d }; return out; } };
      mws.forEach((mw) => mw(req, res));
      const hit = routes.find((r) => r.method === method && r.path === url);
      if (hit) hit.fn(req, res);
      return out;
    },
  };
}

const app = createMiniExpress();
const todos = [{ id: 1, title: 'Learn Express', done: false }];
let nextId = 2;

// TODO (Step 1): Add logger middleware via app.use(...)

// TODO (Step 2): Add GET /todos returning todos array

// TODO (Step 3): Add POST /todos -> 400 if empty title, else 201 with created item

(async () => {
  console.log('GET /todos ->', await app.handle('GET', '/todos'));
  console.log('POST invalid ->', await app.handle('POST', '/todos', { title: '  ' }));
  console.log('POST valid ->', await app.handle('POST', '/todos', { title: 'Ship MVP' }));
})();`,
        solutionCode: `app.use((req) => console.log('[LOG]', req.method, req.url));
app.get('/todos', (req, res) => res.status(200).json(todos));
app.post('/todos', (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) return res.status(400).json({ error: 'title is required' });
  const todo = { id: nextId++, title, done: false };
  todos.push(todo);
  return res.status(201).json(todo);
});`,
      },
      {
        title: 'Milestone 2 — Param Lookup, PUT Update & DELETE Routes',
        keywords: ['req.params.id', 'HTTP 404', 'PUT', 'DELETE'],
        definition: 'Parse route parameter :id safely, return HTTP 404 for unknown IDs, update fields on PUT, and remove items on DELETE.',
        syntax: 'const idx = todos.findIndex((t) => t.id === Number(req.params.id));',
        sections: [{
          heading: 'MILESTONE 2 TASKS',
          points: [
            'Step 1 -> Parse id = Number(req.params.id) and guard invalid/missing IDs with HTTP 404',
            'Step 2 -> Implement PUT /todos/:id merging valid title/done updates',
            'Step 3 -> Implement DELETE /todos/:id removing record via splice() and returning deleted summary',
          ],
        }],
        testCases: [
          { label: 'PUT toggle done', input: 'PUT /todos/1 { done: true }', expected: 'status: 200, updated todo with done: true' },
          { label: 'DELETE missing id', input: 'DELETE /todos/999', expected: 'status: 404 { error: "Todo not found" }' },
        ],
        hints: [
          { step: 1, text: 'Use todos.find((t) => t.id === id) for PUT and findIndex for DELETE.' },
          { step: 2, text: 'If (!todo) return res.status(404).json({ error: "Todo not found" });.' },
          { step: 3, text: 'For boolean update: if (typeof req.body.done === "boolean") todo.done = req.body.done;.' },
        ],
        starterCode: `function createMiniExpress() {
  const routes = [];
  return {
    add: (m, p, fn) => routes.push({ m, p, fn }),
    put(p, fn) { this.add('PUT', p, fn); },
    del(p, fn) { this.add('DELETE', p, fn); },
    async handle(method, url, body = {}) {
      let out = { status: 404, body: { error: 'Not Found' } };
      const req = { method, url, body, params: {} };
      const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { out = { status: this.code, body: d }; return out; } };
      for (const r of routes) {
        if (r.m !== method) continue;
        const pa = r.p.split('/'), aa = url.split('/');
        if (pa.length === aa.length && pa[1] === aa[1]) {
          req.params = { id: aa[2] };
          r.fn(req, res); break;
        }
      }
      return out;
    },
  };
}

const app = createMiniExpress();
const todos = [{ id: 1, title: 'Learn HTTP', done: false }, { id: 2, title: 'Write Tests', done: false }];

// TODO (Step 1 & 2): Implement PUT /todos/:id returning 404 if not found, else 200 updated item
app.put('/todos/:id', (req, res) => {});

// TODO (Step 3): Implement DELETE /todos/:id returning 404 if not found, else 200 { deletedId }
app.del('/todos/:id', (req, res) => {});

(async () => {
  console.log('PUT /todos/1 ->', await app.handle('PUT', '/todos/1', { done: true }));
  console.log('PUT /todos/99 ->', await app.handle('PUT', '/todos/99', { done: true }));
  console.log('DELETE /todos/2 ->', await app.handle('DELETE', '/todos/2'));
  console.log('Remaining ->', todos);
})();`,
        solutionCode: `app.put('/todos/:id', (req, res) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) return res.status(404).json({ error: 'Todo not found' });
  if (typeof req.body?.title === 'string' && req.body.title.trim()) todo.title = req.body.title.trim();
  if (typeof req.body?.done === 'boolean') todo.done = req.body.done;
  return res.status(200).json(todo);
});
app.del('/todos/:id', (req, res) => {
  const idx = todos.findIndex((t) => t.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Todo not found' });
  const [removed] = todos.splice(idx, 1);
  return res.status(200).json({ deletedId: removed.id });
});`,
      },
      {
        title: 'Milestone 3 — Query Filter, Error Boundary & API Tests',
        keywords: ['req.query', 'error middleware', 'HttpError', 'console.assert'],
        definition: 'Add ?done=true/false filtering, a centralized HttpError boundary returning clean JSON errors, and automated request assertions.',
        syntax: 'class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }',
        sections: [{
          heading: 'MILESTONE 3 TASKS',
          points: [
            'Step 1 -> Support GET /todos?done=true|false filtering using req.query.done',
            'Step 2 -> Create HttpError class and wrap route execution in try/catch error middleware',
            'Step 3 -> Run automated console.assert checks covering 200, 400, and 404 responses',
          ],
        }],
        testCases: [
          { label: 'Filter completed', input: 'GET /todos?done=true', expected: 'Returns only items where done === true' },
          { label: 'Centralized error catch', input: 'Handler throws new HttpError(422, "Bad filter")', expected: 'Returns status 422 JSON without crashing process' },
        ],
        hints: [
          { step: 1, text: 'Check if (req.query.done === "true" || req.query.done === "false") to compare t.done === (req.query.done === "true").' },
          { step: 2, text: 'If err instanceof HttpError, return res.status(err.status).json({ error: err.message }).' },
          { step: 3, text: 'Use console.assert(r.status === 200) inside your verification runner.' },
        ],
        starterCode: `// TODO (Step 2): Define HttpError(status, message) extending Error
class HttpError extends Error {}

function runRouteWithErrorBoundary(fn, req) {
  let out = null;
  const res = {
    code: 200,
    status(c) { this.code = c; return this; },
    json(body) { out = { status: this.code, body }; return out; },
  };
  try {
    fn(req, res);
  } catch (err) {
    // TODO (Step 2): Catch HttpError and return { status: err.status || 500, body: { error: err.message } }
  }
  return out;
}

const todos = [{ id: 1, title: 'Task A', done: true }, { id: 2, title: 'Task B', done: false }];

// TODO (Step 1): Filter todos on req.query.done === 'true' | 'false', throw HttpError(400) on invalid value
function getTodosHandler(req, res) {
  return res.status(200).json(todos);
}

// TODO (Step 3): Verify automated tests with console.assert
const r1 = runRouteWithErrorBoundary(getTodosHandler, { query: { done: 'true' } });
console.log('Filtered done=true ->', r1);
const r2 = runRouteWithErrorBoundary(getTodosHandler, { query: { done: 'maybe' } });
console.log('Invalid query ->', r2);`,
        solutionCode: `class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; this.name = 'HttpError'; }
}
// inside catch:
// out = { status: err instanceof HttpError ? err.status : 500, body: { error: err.message } };
function getTodosHandler(req, res) {
  const { done } = req.query;
  if (done === undefined) return res.status(200).json(todos);
  if (done !== 'true' && done !== 'false') throw new HttpError(400, 'done must be true or false');
  return res.status(200).json(todos.filter((t) => t.done === (done === 'true')));
}`,
      },
    ],
  },
};

