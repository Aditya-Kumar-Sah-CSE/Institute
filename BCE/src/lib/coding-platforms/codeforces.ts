import type { CodingPlatformAdapter, ExternalProblem, PlatformProblemIdentifier } from './types';

function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export const codeforcesAdapter: CodingPlatformAdapter = {
  platform: 'CODEFORCES',

  parseIdentifier(input: string): PlatformProblemIdentifier | null {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // Match URLs:
    // https://codeforces.com/problemset/problem/4/A
    // https://codeforces.com/contest/4/problem/A
    const urlMatch = trimmed.match(/codeforces\.com\/(?:problemset\/problem|contest)\/(\d+)\/(?:problem\/)?([A-Za-z][A-Za-z0-9]*)/i);
    if (urlMatch) {
      return {
        platform: 'CODEFORCES',
        contestId: urlMatch[1],
        problemIndex: urlMatch[2].toUpperCase(),
        rawInput: trimmed,
      };
    }

    // Match short forms: "4A", "4a", "123B"
    const shortMatch = trimmed.match(/^(\d+)\s*([A-Za-z][A-Za-z0-9]*)$/i);
    if (shortMatch) {
      return {
        platform: 'CODEFORCES',
        contestId: shortMatch[1],
        problemIndex: shortMatch[2].toUpperCase(),
        rawInput: trimmed,
      };
    }

    return null;
  },

  async fetchProblem(identifier: PlatformProblemIdentifier): Promise<ExternalProblem> {
    const { contestId, problemIndex } = identifier;
    if (!contestId || !problemIndex) {
      throw new Error('Invalid Codeforces identifier. Use format like 4A or problem URL.');
    }

    const externalId = `${contestId}${problemIndex}`;
    const officialUrl = `https://codeforces.com/problemset/problem/${contestId}/${problemIndex}`;
    const contestUrl = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;

    // 1. Fetch metadata from official API
    let meta: { name?: string; rating?: number; tags?: string[] } = {};
    try {
      const apiRes = await fetch('https://codeforces.com/api/problemset.problems', {
        headers: { 'User-Agent': 'BCE-Code-Arena/1.0' },
        next: { revalidate: 3600 },
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.status === 'OK' && json.result?.problems) {
          const found = json.result.problems.find(
            (p: any) => String(p.contestId) === String(contestId) && p.index.toUpperCase() === problemIndex.toUpperCase()
          );
          if (found) {
            meta = {
              name: found.name,
              rating: found.rating,
              tags: found.tags || [],
            };
          }
        }
      }
    } catch (e) {
      console.warn('Codeforces API metadata fetch failed, proceeding with HTML parser:', e);
    }

    // 2. Fetch public problem HTML page for statement & samples with realistic browser headers
    let htmlContent = '';
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://codeforces.com/problemset',
    };

    try {
      let pageRes = await fetch(officialUrl, { headers: browserHeaders, redirect: 'follow' });
      if (!pageRes.ok || pageRes.status === 403) {
        // Fallback to contest URL
        pageRes = await fetch(contestUrl, { headers: browserHeaders, redirect: 'follow' });
      }
      if (pageRes.ok) {
        htmlContent = await pageRes.text();
      }
    } catch (e) {
      console.warn('Codeforces HTML page fetch failed:', e);
    }

    let statement = '';
    let inputFormat = '';
    let outputFormat = '';
    let constraints = '';
    let explanation = '';
    const examples: { input: string; output: string }[] = [];

    if (htmlContent) {
      // Title if not found from API
      if (!meta.name) {
        const titleMatch = htmlContent.match(/<div class="title">\s*[A-Z0-9]+\.\s*([^<]+)<\/div>/i) ||
                           htmlContent.match(/<div class="title">\s*([^<]+)<\/div>/i);
        if (titleMatch) meta.name = titleMatch[1].trim();
      }

      // Time limit & memory limit constraints
      const timeMatch = htmlContent.match(/<div class="time-limit">[\s\S]*?<div class="property-title">time limit per test<\/div>([\s\S]*?)<\/div>/i) ||
                        htmlContent.match(/time limit per test<\/div>([^<]+)/i);
      const memMatch = htmlContent.match(/<div class="memory-limit">[\s\S]*?<div class="property-title">memory limit per test<\/div>([\s\S]*?)<\/div>/i) ||
                       htmlContent.match(/memory limit per test<\/div>([^<]+)/i);

      const timeLimitStr = timeMatch ? timeMatch[1].replace(/<[^>]*>/g, '').trim() : '2.0 seconds';
      const memLimitStr = memMatch ? memMatch[1].replace(/<[^>]*>/g, '').trim() : '256 megabytes';
      constraints = `Time Limit: ${timeLimitStr}\nMemory Limit: ${memLimitStr}`;

      // Problem Statement
      const statementMatch = htmlContent.match(/<div class="header">[\s\S]*?<\/div>([\s\S]*?)<div class="input-specification">/i) ||
                             htmlContent.match(/<div class="problem-statement">([\s\S]*?)<div class="input-specification">/i);
      if (statementMatch) {
        statement = cleanHtml(statementMatch[1]);
      }

      // Input & Output Format
      const inputMatch = htmlContent.match(/<div class="input-specification">([\s\S]*?)<\/div>\s*<div class="output-specification">/i);
      if (inputMatch) {
        inputFormat = cleanHtml(inputMatch[1].replace(/<div class="section-title">[\s\S]*?<\/div>/i, ''));
      }

      const outputMatch = htmlContent.match(/<div class="output-specification">([\s\S]*?)<\/div>\s*(?:<div class="sample-tests">|<div class="sample-test">)/i) ||
                          htmlContent.match(/<div class="output-specification">([\s\S]*?)<\/div>/i);
      if (outputMatch) {
        outputFormat = cleanHtml(outputMatch[1].replace(/<div class="section-title">[\s\S]*?<\/div>/i, ''));
      }

      // Sample Test Cases
      const sampleTestMatch = htmlContent.match(/<div class="sample-test">([\s\S]*?)<\/div>\s*(?:<div class="note">|<div class="author">|$)/i);
      const sampleTestHtml = sampleTestMatch ? sampleTestMatch[1] : htmlContent;

      const sampleRegex = /<div class="input">[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<div class="output">[\s\S]*?<pre>([\s\S]*?)<\/pre>/gi;
      let match;
      while ((match = sampleRegex.exec(sampleTestHtml)) !== null) {
        const rawIn = match[1]
          .replace(/<div class="test-example-line[^"]*">([\s\S]*?)<\/div>/gi, '$1\n')
          .replace(/<br\s*\/?>/gi, '\n');
        const rawOut = match[2]
          .replace(/<div class="test-example-line[^"]*">([\s\S]*?)<\/div>/gi, '$1\n')
          .replace(/<br\s*\/?>/gi, '\n');
        const sampleIn = stripTags(rawIn).trim();
        const sampleOut = stripTags(rawOut).trim();
        if (sampleIn || sampleOut) {
          examples.push({ input: sampleIn, output: sampleOut });
        }
      }

      // Note / Explanation
      const noteMatch = htmlContent.match(/<div class="note">([\s\S]*?)<\/div>\s*(?:<div class="author">|$)/i) ||
                        htmlContent.match(/<div class="note">([\s\S]*?)<\/div>\s*$/i);
      if (noteMatch) {
        explanation = cleanHtml(noteMatch[1].replace(/<div class="section-title">[\s\S]*?<\/div>/i, ''));
      }
    }

    const title = meta.name || `Codeforces Problem ${externalId}`;
    if (!statement) {
      statement = `<p>Solve Codeforces Problem <strong>${externalId} — ${title}</strong>.</p><p><a href="${officialUrl}" target="_blank" rel="noopener noreferrer">View original problem on Codeforces</a></p>`;
    }

    const rating = meta.rating || 800;
    let difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY';
    if (rating >= 1900) difficulty = 'HARD';
    else if (rating >= 1300) difficulty = 'MEDIUM';

    const starterCode: Record<string, string> = {
      cpp17: `#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write solution for Codeforces ${externalId}\n    return 0;\n}`,
      c: `#include <stdio.h>\n\nint main(void) {\n    // Write solution for Codeforces ${externalId}\n    return 0;\n}`,
      java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write solution for Codeforces ${externalId}\n    }\n}`,
      python: `import sys\n\ndef solve():\n    input = sys.stdin.read\n    # Write solution for Codeforces ${externalId}\n\nif __name__ == '__main__':\n    solve()\n`,
      javascript: `'use strict';\nconst fs = require('fs');\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8');\n    // Write solution for Codeforces ${externalId}\n}\n\nmain();\n`,
    };

    return {
      platform: 'CODEFORCES',
      externalId,
      slug: externalId.toLowerCase(),
      title: `${externalId} — ${title}`,
      statement,
      constraints: constraints || 'Standard Codeforces limits (2.0s, 256MB)',
      inputFormat: inputFormat || 'Standard stdin',
      outputFormat: outputFormat || 'Standard stdout',
      examples,
      explanation: explanation || null,
      difficulty,
      rating,
      tags: meta.tags || ['codeforces', 'competitive-programming'],
      officialUrl,
      starterCode,
    };
  },
};
