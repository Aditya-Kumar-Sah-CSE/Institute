import type { CodingPlatformAdapter, ExternalProblem, PlatformProblemIdentifier } from './types';

function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

const COMMON_LEETCODE_ID_MAP: Record<string, string> = {
  '1': 'two-sum',
  '2': 'add-two-numbers',
  '3': 'longest-substring-without-repeating-characters',
  '4': 'median-of-two-sorted-arrays',
  '5': 'longest-palindromic-substring',
  '9': 'palindrome-number',
  '13': 'roman-to-integer',
  '14': 'longest-common-prefix',
  '15': '3sum',
  '20': 'valid-parentheses',
  '21': 'merge-two-sorted-lists',
  '53': 'maximum-subarray',
  '70': 'climbing-stairs',
  '121': 'best-time-to-buy-and-sell-stock',
  '206': 'reverse-linked-list',
};

export const leetcodeAdapter: CodingPlatformAdapter = {
  platform: 'LEETCODE',

  parseIdentifier(input: string): PlatformProblemIdentifier | null {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // Match URLs: https://leetcode.com/problems/two-sum/
    const urlMatch = trimmed.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
    if (urlMatch) {
      return {
        platform: 'LEETCODE',
        slug: urlMatch[1].toLowerCase(),
        rawInput: trimmed,
      };
    }

    // Match numeric IDs: "1" -> "two-sum"
    if (/^\d+$/.test(trimmed)) {
      const mappedSlug = COMMON_LEETCODE_ID_MAP[trimmed] || `problem-${trimmed}`;
      return {
        platform: 'LEETCODE',
        slug: mappedSlug,
        rawInput: trimmed,
      };
    }

    // Match slug directly: "two-sum"
    if (/^[a-z0-9-]+$/i.test(trimmed)) {
      return {
        platform: 'LEETCODE',
        slug: trimmed.toLowerCase(),
        rawInput: trimmed,
      };
    }

    return null;
  },

  async fetchProblem(identifier: PlatformProblemIdentifier): Promise<ExternalProblem> {
    const slug = identifier.slug;
    if (!slug) {
      throw new Error('Invalid LeetCode problem identifier or slug.');
    }

    const officialUrl = `https://leetcode.com/problems/${slug}/`;

    const graphqlQuery = {
      query: `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            title
            titleSlug
            content
            difficulty
            topicTags {
              name
              slug
            }
            codeSnippets {
              lang
              langSlug
              code
            }
            sampleTestCase
            exampleTestcases
          }
        }
      `,
      variables: { titleSlug: slug },
    };

    let data: any = null;
    try {
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: officialUrl,
        },
        body: JSON.stringify(graphqlQuery),
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const json = await res.json();
        data = json.data?.question;
      }
    } catch (e) {
      console.warn('LeetCode GraphQL fetch error:', e);
    }

    if (!data) {
      // Fallback: If GraphQL returns null or fails, construct graceful metadata
      const readableTitle = slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      return {
        platform: 'LEETCODE',
        externalId: slug,
        slug,
        title: readableTitle,
        statement: `<p>Solve LeetCode Problem <strong>${readableTitle}</strong>.</p><p><a href="${officialUrl}" target="_blank" rel="noopener noreferrer">View original problem on LeetCode</a></p>`,
        constraints: 'Standard LeetCode limits (1.0s, 256MB)',
        inputFormat: 'Standard stdin / Function arguments',
        outputFormat: 'Standard stdout / Return value',
        examples: [],
        difficulty: 'EASY',
        rating: null,
        tags: ['leetcode'],
        officialUrl,
        starterCode: {
          cpp17: `#include <iostream>\nusing namespace std;\n\n// Write solution for LeetCode ${slug}\nint main() {\n    return 0;\n}`,
          c: `#include <stdio.h>\n\nint main(void) {\n    return 0;\n}`,
          java: `public class Main {\n    public static void main(String[] args) {\n    }\n}`,
          python: `def solve():\n    pass\n\nif __name__ == '__main__':\n    solve()\n`,
          javascript: `function solve() {\n}\n\nsolve();\n`,
        },
      };
    }

    const title = data.title || slug;
    const rawContent = data.content || '';
    const statement = cleanHtml(rawContent);

    // Extract constraints from HTML content if available
    let constraints = 'Standard LeetCode limits (1.0s, 256MB)';
    const constraintsMatch = rawContent.match(/<strong[^>]*>Constraints:<\/strong>([\s\S]*?)(?:<\/ul>|<\/div>|$)/i);
    if (constraintsMatch) {
      const cleanConstraints = stripTags(constraintsMatch[1]).trim();
      if (cleanConstraints) constraints = cleanConstraints;
    }

    // Extract examples from content HTML
    const examples: { input: string; output: string; explanation?: string }[] = [];

    if (rawContent) {
      const exampleRegex = /<strong class="example">Example \d+:<\/strong>[\s\S]*?<pre>([\s\S]*?)<\/pre>/gi;
      let match;
      while ((match = exampleRegex.exec(rawContent)) !== null) {
        const block = match[1];
        const inputMatch = block.match(/<strong>Input:<\/strong>([\s\S]*?)(?:<strong>Output:<\/strong>|$)/i);
        const outputMatch = block.match(/<strong>Output:<\/strong>([\s\S]*?)(?:<strong>Explanation:<\/strong>|$)/i);
        const explMatch = block.match(/<strong>Explanation:<\/strong>([\s\S]*?)$/i);

        const input = inputMatch ? stripTags(inputMatch[1]).trim() : '';
        const output = outputMatch ? stripTags(outputMatch[1]).trim() : '';
        const explanation = explMatch ? stripTags(explMatch[1]).trim() : undefined;

        if (input || output) {
          examples.push({ input, output, explanation });
        }
      }
    }

    // Fallback example testcases if content parsing yielded no examples
    if (examples.length === 0) {
      if (data.exampleTestcases) {
        const lines = String(data.exampleTestcases).split('\n').filter(Boolean);
        if (lines.length > 0) {
          examples.push({ input: lines.join('\n'), output: 'See problem statement' });
        }
      } else if (data.sampleTestCase) {
        examples.push({ input: String(data.sampleTestCase).trim(), output: 'See problem statement' });
      }
    }

    // Parse starter code snippets provided by LeetCode
    const starterCode: Record<string, string> = {
      cpp17: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Solution for LeetCode: ${title}\n    return 0;\n}`,
      c: `#include <stdio.h>\n\nint main(void) {\n    return 0;\n}`,
      java: `public class Main {\n    public static void main(String[] args) {\n    }\n}`,
      python: `def solve():\n    pass\n\nif __name__ == '__main__':\n    solve()\n`,
      javascript: `function solve() {\n}\n\nsolve();\n`,
    };

    if (Array.isArray(data.codeSnippets)) {
      for (const snippet of data.codeSnippets) {
        if (snippet.langSlug === 'cpp' || snippet.langSlug === 'cpp17') starterCode.cpp17 = snippet.code;
        else if (snippet.langSlug === 'c') starterCode.c = snippet.code;
        else if (snippet.langSlug === 'java') starterCode.java = snippet.code;
        else if (snippet.langSlug === 'python3' || snippet.langSlug === 'python') starterCode.python = snippet.code;
        else if (snippet.langSlug === 'javascript') starterCode.javascript = snippet.code;
      }
    }

    let difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY';
    const rawDiff = String(data.difficulty || '').toUpperCase();
    if (rawDiff === 'HARD') difficulty = 'HARD';
    else if (rawDiff === 'MEDIUM') difficulty = 'MEDIUM';

    const tags = Array.isArray(data.topicTags) ? data.topicTags.map((t: any) => t.name) : ['leetcode'];

    return {
      platform: 'LEETCODE',
      externalId: slug,
      slug,
      title,
      statement,
      constraints,
      inputFormat: 'Standard stdin / Function arguments',
      outputFormat: 'Standard stdout / Return value',
      examples,
      difficulty,
      rating: null,
      tags,
      officialUrl,
      starterCode,
    };
  },
};
