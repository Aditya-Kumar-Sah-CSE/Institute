const fs = require('fs');

function testParseCF(html) {
  // Title
  const titleMatch = html.match(/<div class="title">\s*[A-Z0-9]+\.\s*([^<]+)<\/div>/i) || html.match(/<div class="title">\s*([^<]+)<\/div>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'UNKNOWN TITLE';

  // Time & Memory
  const timeMatch = html.match(/<div class="time-limit">[\s\S]*?<div class="property-title">time limit per test<\/div>([\s\S]*?)<\/div>/i);
  const timeLimit = timeMatch ? timeMatch[1].replace(/<[^>]*>/g, '').trim() : '2.0 seconds';

  const memMatch = html.match(/<div class="memory-limit">[\s\S]*?<div class="property-title">memory limit per test<\/div>([\s\S]*?)<\/div>/i);
  const memLimit = memMatch ? memMatch[1].replace(/<[^>]*>/g, '').trim() : '256 megabytes';

  const constraints = `Time Limit: ${timeLimit}\nMemory Limit: ${memLimit}`;

  // Problem statement section
  // In Codeforces HTML, problem-statement contains header, then statement divs, then input-specification, output-specification, sample-tests
  const stmtMatch = html.match(/<div class="header">[\s\S]*?<\/div>([\s\S]*?)<div class="input-specification">/i) ||
                    html.match(/<div class="problem-statement">([\s\S]*?)<div class="input-specification">/i);
  const statement = stmtMatch ? stmtMatch[1].trim() : '';

  // Input Specification
  const inputMatch = html.match(/<div class="input-specification">([\s\S]*?)<\/div>\s*<div class="output-specification">/i);
  const inputFormat = inputMatch ? inputMatch[1].replace(/<div class="section-title">[\s\S]*?<\/div>/i, '').trim() : '';

  // Output Specification
  const outputMatch = html.match(/<div class="output-specification">([\s\S]*?)<\/div>\s*<div class="sample-tests">/i) ||
                     html.match(/<div class="output-specification">([\s\S]*?)<\/div>\s*<div class="sample-test">/i);
  const outputFormat = outputMatch ? outputMatch[1].replace(/<div class="section-title">[\s\S]*?<\/div>/i, '').trim() : '';

  // Sample tests
  // Modern Codeforces has <div class="sample-test"><div class="input"><pre>...</pre></div><div class="output"><pre>...</pre></div></div>
  const examples = [];
  const sampleTestMatch = html.match(/<div class="sample-test">([\s\S]*?)<\/div>\s*(?:<div class="note">|<div class="author">|$)/i);
  const sampleTestHtml = sampleTestMatch ? sampleTestMatch[1] : html;

  const sampleRegex = /<div class="input">[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<div class="output">[\s\S]*?<pre>([\s\S]*?)<\/pre>/gi;
  let match;
  while ((match = sampleRegex.exec(sampleTestHtml)) !== null) {
    // Process input lines preserving newlines
    let rawIn = match[1]
      .replace(/<div class="test-example-line[^"]*">([\s\S]*?)<\/div>/gi, '$1\n')
      .replace(/<br\s*\/?>/gi, '\n');
    let rawOut = match[2]
      .replace(/<div class="test-example-line[^"]*">([\s\S]*?)<\/div>/gi, '$1\n')
      .replace(/<br\s*\/?>/gi, '\n');

    const cleanIn = rawIn.replace(/<[^>]*>/g, '').trim();
    const cleanOut = rawOut.replace(/<[^>]*>/g, '').trim();
    if (cleanIn || cleanOut) {
      examples.push({ input: cleanIn, output: cleanOut });
    }
  }

  return { title, timeLimit, memLimit, constraints, statementLength: statement.length, inputFormatLength: inputFormat.length, outputFormatLength: outputFormat.length, examples };
}

const html = fs.readFileSync('sample_cf_2250A.html', 'utf-8');
const res = testParseCF(html);
console.log('Parsed 2250A Result:\n', JSON.stringify(res, null, 2));
