import type { CodingPlatformAdapter, ExternalProblem, PlatformProblemIdentifier } from './types';
import { execSync } from 'child_process';

function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export interface CodeChefUserProfile {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  stars: number;
  starsLabel: string;
  globalRank: number | null;
  countryRank: number | null;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  profileUrl: string;
  dailyActivity?: Record<string, number>;
}

export function getStarsFromRating(rating: number | null): { stars: number; starsLabel: string } {
  if (!rating || rating < 1400) return { stars: 1, starsLabel: '1★ (Div 4)' };
  if (rating < 1600) return { stars: 2, starsLabel: '2★ (Div 3)' };
  if (rating < 1800) return { stars: 3, starsLabel: '3★ (Div 3)' };
  if (rating < 2000) return { stars: 4, starsLabel: '4★ (Div 2)' };
  if (rating < 2200) return { stars: 5, starsLabel: '5★ (Div 2)' };
  if (rating < 2500) return { stars: 6, starsLabel: '6★ (Div 1)' };
  return { stars: 7, starsLabel: '7★ (Div 1)' };
}

export async function fetchCodeChefUserProfile(handle: string): Promise<CodeChefUserProfile> {
  const trimmed = handle.trim();
  if (!trimmed || !/^[A-Za-z0-9_]{1,64}$/.test(trimmed)) {
    throw new Error('Invalid CodeChef handle format.');
  }

  const profileUrl = `https://www.codechef.com/users/${encodeURIComponent(trimmed)}`;
  let htmlContent = '';

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  try {
    const res = await fetch(profileUrl, {
      headers,
      next: { revalidate: 900 }, // Cache 15 minutes
    });
    if (res.ok) {
      htmlContent = await res.text();
    }
  } catch (e) {
    console.warn('[CODECHEF] fetch user profile failed, trying curl fallback:', e);
  }

  if (!htmlContent) {
    try {
      const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
      const cmd = `${curlCmd} -s -g -L -m 8 -H "User-Agent: ${headers['User-Agent']}" "${profileUrl}"`;
      htmlContent = execSync(cmd, { encoding: 'utf8', timeout: 8000 });
    } catch (err) {
      console.error('[CODECHEF] curl profile fetch failed:', err);
    }
  }

  if (!htmlContent || htmlContent.includes('User Not Found') || htmlContent.includes('404 Page Not Found')) {
    throw new Error(`Public CodeChef profile "${trimmed}" not found.`);
  }

  // Parse HTML fields (allowing whitespace/newlines)
  const ratingMatch = htmlContent.match(/rating-number[^>]*>\s*(\d+)/i) || htmlContent.match(/class="rating-number"[^>]*>\s*(\d+)/i);
  const highestMatch = htmlContent.match(/Highest Rating\s*(\d+)/i) || htmlContent.match(/\(Highest Rating\s*(\d+)\)/i);
  const globalRankMatch = htmlContent.match(/Global Rank:?[\s\S]*?<strong>\s*(\d+)\s*<\/strong>/i) || htmlContent.match(/global-rank[^>]*>\s*(\d+)/i);
  const countryRankMatch = htmlContent.match(/Country Rank:?[\s\S]*?<strong>\s*(\d+)\s*<\/strong>/i) || htmlContent.match(/country-rank[^>]*>\s*(\d+)/i);
  const solvedMatch = htmlContent.match(/Total Problems Solved:\s*(\d+)/i) || htmlContent.match(/Fully Solved\s*\(\s*(\d+)\s*\)/i);

  const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : null;
  const maxRating = highestMatch ? parseInt(highestMatch[1], 10) : rating;
  const globalRank = globalRankMatch ? parseInt(globalRankMatch[1], 10) : null;
  const countryRank = countryRankMatch ? parseInt(countryRankMatch[1], 10) : null;
  const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : 0;

  const { stars, starsLabel } = getStarsFromRating(rating);

  // Estimate difficulty breakdown based on total solved
  const easySolved = Math.floor(totalSolved * 0.55);
  const mediumSolved = Math.floor(totalSolved * 0.35);
  const hardSolved = Math.max(0, totalSolved - easySolved - mediumSolved);

  // Parse submission activity heatmap and rating dates from script/attributes
  const dailyActivity: Record<string, number> = {};
  try {
    const heatmapMatch = htmlContent.match(/var\s+(?:userDailySubmissionsStats|userSubmissionHeatmap|submissionHeatmap|user_daily_activity)\s*=\s*(\[[\s\S]*?\]);/i) ||
                         htmlContent.match(/id=["']heat-map["'][^>]*data-submissions=['"]([^'"]+)['"]/i);
    if (heatmapMatch && heatmapMatch[1]) {
      const rawData = JSON.parse(heatmapMatch[1]);
      if (Array.isArray(rawData)) {
        rawData.forEach((item: any) => {
          if (item) {
            const dateStr = item.date ? String(item.date).trim() : null;
            if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              const count = Number(item.value || item.count || item.submissions || 1);
              dailyActivity[dateStr] = (dailyActivity[dateStr] || 0) + count;
            }
          }
        });
      }
    }
  } catch (e) {
    console.warn('[CODECHEF] Daily activity parsing warning:', e);
  }

  // Fallback: parse getyear / getmonth / getday objects in HTML
  try {
    const getDayRegex = /"getyear"\s*:\s*"(\d{4})"\s*,\s*"getmonth"\s*:\s*"(\d{1,2})"\s*,\s*"getday"\s*:\s*"(\d{1,2})"/g;
    let match;
    while ((match = getDayRegex.exec(htmlContent)) !== null) {
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      if (!dailyActivity[dateStr]) {
        dailyActivity[dateStr] = 1;
      }
    }
  } catch (e) {
    console.warn('[CODECHEF] getDay parsing warning:', e);
  }

  // Fallback: parse end_date strings in HTML
  try {
    const endDateRegex = /"end_date"\s*:\s*"(\d{4})-(\d{2})-(\d{2})\s+\d{2}:\d{2}:\d{2}"/g;
    let match;
    while ((match = endDateRegex.exec(htmlContent)) !== null) {
      const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
      if (!dailyActivity[dateStr]) {
        dailyActivity[dateStr] = 1;
      }
    }
  } catch (e) {
    console.warn('[CODECHEF] end_date parsing warning:', e);
  }

  return {
    handle: trimmed,
    rating,
    maxRating,
    stars,
    starsLabel,
    globalRank,
    countryRank,
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    profileUrl,
    dailyActivity,
  };
}

export const codechefAdapter: CodingPlatformAdapter = {
  platform: 'CODECHEF',

  parseIdentifier(input: string): PlatformProblemIdentifier | null {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // Match URLs:
    // https://www.codechef.com/problems/FLOW001
    // https://www.codechef.com/START100A/problems/FLOW001
    const urlMatch = trimmed.match(/codechef\.com\/(?:[A-Za-z0-9_-]+\/)?problems\/([A-Za-z0-9_-]+)/i);
    if (urlMatch) {
      return {
        platform: 'CODECHEF',
        codechefCode: urlMatch[1].toUpperCase(),
        rawInput: trimmed,
      };
    }

    // Match short problem codes: "FLOW001", "PRB1", "TEST"
    if (/^[A-Za-z0-9_-]{2,16}$/.test(trimmed) && !trimmed.includes('.')) {
      return {
        platform: 'CODECHEF',
        codechefCode: trimmed.toUpperCase(),
        rawInput: trimmed,
      };
    }

    return null;
  },

  async fetchProblem(identifier: PlatformProblemIdentifier): Promise<ExternalProblem> {
    const code = identifier.codechefCode || identifier.rawInput;
    if (!code) throw new Error('Invalid CodeChef problem identifier.');

    const externalId = code.toUpperCase();
    const officialUrl = `https://www.codechef.com/problems/${externalId}`;

    let meta: { name?: string; rating?: number; tags?: string[] } = {};
    let statement = '';
    let inputFormat = '';
    let outputFormat = '';
    let constraints = '';
    const examples: { input: string; output: string }[] = [];

    // Try CodeChef practice API
    try {
      const apiRes = await fetch(`https://www.codechef.com/api/contests/PRACTICE/problems/${externalId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        next: { revalidate: 3600 },
      });

      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.problem_name) {
          meta.name = json.problem_name;
          if (json.problem_code) meta.name = `${json.problem_name} (${json.problem_code})`;
        }
        if (json.body) {
          statement = cleanHtml(json.body);
        }
      }
    } catch (e) {
      console.warn('[CODECHEF] API fetch failed, falling back to page scraper:', e);
    }

    // Fallback HTML page fetch
    if (!statement) {
      try {
        const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
        const cmd = `${curlCmd} -s -g -L -m 8 -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${officialUrl}"`;
        const htmlContent = execSync(cmd, { encoding: 'utf8', timeout: 8000 });

        if (htmlContent) {
          const titleMatch = htmlContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || htmlContent.match(/<title>([\s\S]*?)<\/title>/i);
          if (titleMatch && !meta.name) {
            meta.name = stripTags(titleMatch[1]).replace(/\| CodeChef/i, '').trim();
          }

          const statementMatch = htmlContent.match(/<div class="problem-statement"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
                                 htmlContent.match(/<div id="problem-statement"[^>]*>([\s\S]*?)<\/div>/i);
          if (statementMatch) {
            statement = cleanHtml(statementMatch[1]);
          }

          // Sample test cases regex
          const sampleRegex = /<h3>Sample 1:<\/h3>[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<pre>([\s\S]*?)<\/pre>/gi;
          let match;
          while ((match = sampleRegex.exec(htmlContent)) !== null) {
            examples.push({
              input: stripTags(match[1]),
              output: stripTags(match[2]),
            });
          }
        }
      } catch (err) {
        console.warn('[CODECHEF] Scraper failed:', err);
      }
    }

    const title = meta.name || `CodeChef Problem ${externalId}`;
    if (!statement) {
      statement = `<p>Solve CodeChef Problem <strong>${externalId} — ${title}</strong>.</p><p><a href="${officialUrl}" target="_blank" rel="noopener noreferrer">View original problem on CodeChef</a></p>`;
    }

    const starterCode: Record<string, string> = {
      cpp17: `#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // CodeChef ${externalId} solution\n    return 0;\n}`,
      c: `#include <stdio.h>\n\nint main(void) {\n    // CodeChef ${externalId} solution\n    return 0;\n}`,
      java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // CodeChef ${externalId} solution\n    }\n}`,
      python: `import sys\n\ndef solve():\n    # CodeChef ${externalId} solution\n    pass\n\nif __name__ == '__main__':\n    solve()\n`,
      javascript: `'use strict';\nconst fs = require('fs');\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8');\n    // CodeChef ${externalId} solution\n}\n\nmain();\n`,
    };

    return {
      platform: 'CODECHEF',
      externalId,
      slug: externalId.toLowerCase(),
      title: `${externalId} — ${title}`,
      statement,
      constraints: constraints || 'Standard CodeChef time limit (1.0s) and memory limit (256MB)',
      inputFormat: inputFormat || 'Standard stdin',
      outputFormat: outputFormat || 'Standard stdout',
      examples: examples.length > 0 ? examples : [{ input: 'Sample Input\n', output: 'Sample Output\n' }],
      difficulty: 'MEDIUM',
      rating: meta.rating || 1400,
      tags: meta.tags || ['codechef', 'competitive-programming'],
      officialUrl,
      starterCode,
    };
  },
};
