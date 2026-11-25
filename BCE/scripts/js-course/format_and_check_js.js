const ts = require('typescript');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const DIR = path.join('d:', 'smart learn', 'BCE', 'src', 'features', 'courses', 'data', 'js-mastery-workbook');
const c2 = JSON.parse(fs.readFileSync(path.join(DIR, 'interview_C2_coding.json'), 'utf8'));
const c3 = JSON.parse(fs.readFileSync(path.join(DIR, 'interview_C3_output.json'), 'utf8'));

function isValidJS(code) {
  try {
    new vm.Script(code);
    return true;
  } catch {
    return false;
  }
}

function formatJS(code) {
  // Preserve multi-line if already well-indented, or parse + print via TypeScript Compiler API
  const sf = ts.createSourceFile('snippet.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  // Check parseDiagnostics
  if (sf.parseDiagnostics && sf.parseDiagnostics.length > 0) return null;
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false });
  return printer.printFile(sf).trim();
}

const c2Results = c2.map(item => {
  const formatted = formatJS(item.solution);
  return { id: item.id, ok: !!formatted, formatted: formatted || item.solution };
});

const failedC2 = c2Results.filter(r => !r.ok);
console.log('C2 total:', c2.length, 'JS-parsed & formatted:', c2Results.filter(r => r.ok).length, 'non-JS/concept:', failedC2.map(f => ({ id: f.id, text: f.formatted.slice(0, 90) })));
console.log('Sample Q431:\n' + c2Results.find(r => r.id === 'Q431').formatted);
console.log('Sample Q531:\n' + c2Results.find(r => r.id === 'Q531').formatted);

const c3Results = c3.map(item => {
  const cleanCode = item.code.replace(/\s+/g, ' ').trim();
  const formatted = formatJS(cleanCode) || formatJS(item.code);
  return { id: item.id, ok: !!formatted, formatted: formatted || item.code };
});
console.log('C3 total:', c3.length, 'JS-parsed & formatted:', c3Results.filter(r => r.ok).length, 'non-JS:', c3Results.filter(r => !r.ok).map(r => r.id));
console.log('Sample Q592:\n' + c3Results.find(r => r.id === 'Q592').formatted);

