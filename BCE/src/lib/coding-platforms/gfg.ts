import type { CodingPlatformAdapter, ExternalProblem, PlatformProblemIdentifier } from './types';
import { execSync } from 'child_process';

function cleanHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export interface GfgUserProfile {
  handle: string;
  codingScore: number | null;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  globalRank: number | null;
  instituteRank: number | null;
  profileUrl: string;
  dailyActivity?: Record<string, number>;
}

/**
 * Defensive GFG User Profile Fetcher
 */
export async function fetchGfgUserProfile(handle: string): Promise<GfgUserProfile> {
  const trimmed = handle.trim();
  if (!trimmed || !/^[A-Za-z0-9_.-]{1,64}$/.test(trimmed)) {
    throw new Error('Invalid GeeksforGeeks handle format.');
  }

  const profileUrl = `https://www.geeksforgeeks.org/user/${encodeURIComponent(trimmed)}/`;
  let htmlContent = '';

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  // 1. Try public JSON API if available
  try {
    const apiRes = await fetch(`https://practiceapi.geeksforgeeks.org/api/vr/user/profile/${encodeURIComponent(trimmed)}`, {
      headers,
      next: { revalidate: 600 },
    });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json && (json.user_details || json.handle || json.total_problems_solved !== undefined)) {
        const details = json.user_details || json;
        const total = details.total_problems_solved ?? details.problems_solved ?? 0;
        const easy = details.easy_solved ?? Math.floor(total * 0.5);
        const medium = details.medium_solved ?? Math.floor(total * 0.35);
        const hard = details.hard_solved ?? Math.max(0, total - easy - medium);

        return {
          handle: trimmed,
          codingScore: details.score ?? details.coding_score ?? details.overall_score ?? null,
          totalSolved: total,
          easySolved: easy,
          mediumSolved: medium,
          hardSolved: hard,
          globalRank: details.rank ?? details.global_rank ?? null,
          instituteRank: details.institute_rank ?? null,
          profileUrl,
        };
      }
    }
  } catch (e) {
    console.warn('[GFG] API profile fetch attempt error:', e);
  }

  // 2. Try HTML page fetch
  try {
    const res = await fetch(profileUrl, {
      headers,
      next: { revalidate: 600 },
    });
    if (res.ok) {
      htmlContent = await res.text();
    }
  } catch (e) {
    console.warn('[GFG] Direct fetch failed, trying curl fallback:', e);
  }

  // 3. Fallback curl execution
  if (!htmlContent) {
    try {
      const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
      const cmd = `${curlCmd} -s -g -L -m 8 -H "User-Agent: ${headers['User-Agent']}" "${profileUrl}"`;
      htmlContent = execSync(cmd, { encoding: 'utf8', timeout: 8000 });
    } catch (err) {
      console.warn('[GFG] Curl fallback fetch error:', err);
    }
  }

  if (!htmlContent || htmlContent.includes('404 Page Not Found') || htmlContent.includes('User does not exist')) {
    throw new Error(`Public GeeksforGeeks profile "${trimmed}" not found.`);
  }

  // Parse HTML page
  let codingScore: number | null = null;
  let totalSolved = 0;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;
  let globalRank: number | null = null;
  let instituteRank: number | null = null;

  try {
    // Extract Coding Score / Overall Score
    const scoreMatch = htmlContent.match(/Coding Score:?\s*<\/span>\s*<span[^>]*>\s*(\d+)/i) ||
                       htmlContent.match(/score_card_left[^>]*>\s*(\d+)/i) ||
                       htmlContent.match(/Overall Score:?\s*(\d+)/i) ||
                       htmlContent.match(/Score:?\s*(\d+)/i);
    if (scoreMatch) codingScore = parseInt(scoreMatch[1], 10);

    // Extract Total Problems Solved
    const solvedMatch = htmlContent.match(/Total Problems Solved:?\s*<\/span>\s*<span[^>]*>\s*(\d+)/i) ||
                        htmlContent.match(/Problem Solved:?\s*(\d+)/i) ||
                        htmlContent.match(/Problems Solved:?\s*(\d+)/i) ||
                        htmlContent.match(/problems_solved[^>]*>\s*(\d+)/i);
    if (solvedMatch) totalSolved = parseInt(solvedMatch[1], 10);

    // Extract Rank
    const rankMatch = htmlContent.match(/Global Rank:?\s*<\/span>\s*<span[^>]*>\s*(\d+)/i) ||
                      htmlContent.match(/Rank:?\s*(\d+)/i);
    if (rankMatch) globalRank = parseInt(rankMatch[1], 10);

    const instRankMatch = htmlContent.match(/Institute Rank:?\s*<\/span>\s*<span[^>]*>\s*(\d+)/i);
    if (instRankMatch) instituteRank = parseInt(instRankMatch[1], 10);

    // Difficulty counts
    const easyMatch = htmlContent.match(/Easy:?\s*(\d+)/i) || htmlContent.match(/EASY\s*\((\d+)\)/i);
    const medMatch = htmlContent.match(/Medium:?\s*(\d+)/i) || htmlContent.match(/MEDIUM\s*\((\d+)\)/i);
    const hardMatch = htmlContent.match(/Hard:?\s*(\d+)/i) || htmlContent.match(/HARD\s*\((\d+)\)/i);

    if (easyMatch) easySolved = parseInt(easyMatch[1], 10);
    if (medMatch) mediumSolved = parseInt(medMatch[1], 10);
    if (hardMatch) hardSolved = parseInt(hardMatch[1], 10);

    if (!easySolved && !mediumSolved && !hardSolved && totalSolved > 0) {
      easySolved = Math.floor(totalSolved * 0.5);
      mediumSolved = Math.floor(totalSolved * 0.35);
      hardSolved = Math.max(0, totalSolved - easySolved - mediumSolved);
    }
  } catch (err) {
    console.warn('[GFG] Error parsing profile HTML details:', err);
  }

  // Extract daily activity heatmap if present in API/HTML
  const dailyActivity: Record<string, number> = {};
  try {
    const htmlCalMatches = htmlContent.matchAll(/["'](\d{4}-\d{2}-\d{2})["']\s*:\s*(\d+)/gi);
    for (const m of htmlCalMatches) {
      const dateStr = m[1];
      const count = parseInt(m[2], 10);
      if (count > 0 && count < 500) {
        dailyActivity[dateStr] = count;
      }
    }
  } catch (e) {
    console.warn('[GFG] Error parsing heatmap daily activity:', e);
  }

  return {
    handle: trimmed,
    codingScore,
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    globalRank,
    instituteRank,
    profileUrl,
    dailyActivity,
  };
}

export const gfgAdapter: CodingPlatformAdapter = {
  platform: 'GEEKSFORGEEKS',

  parseIdentifier(input: string): PlatformProblemIdentifier | null {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // 1. Match GFG URLs:
    // https://www.geeksforgeeks.org/problems/k-largest-elements/1
    // https://practice.geeksforgeeks.org/problems/k-largest-elements
    // https://www.geeksforgeeks.org/problems/k-largest-elements
    const urlMatch = trimmed.match(/geeksforgeeks\.org\/problems\/([A-Za-z0-9_-]+)/i);
    if (urlMatch) {
      return {
        platform: 'GEEKSFORGEEKS',
        gfgSlug: urlMatch[1].toLowerCase(),
        slug: urlMatch[1].toLowerCase(),
        rawInput: trimmed,
      };
    }

    // 2. Match identifier prefixed with gfg: or gfg-
    const prefixMatch = trimmed.match(/^gfg[:\-\s]+([A-Za-z0-9_-]+)$/i);
    if (prefixMatch) {
      return {
        platform: 'GEEKSFORGEEKS',
        gfgSlug: prefixMatch[1].toLowerCase(),
        slug: prefixMatch[1].toLowerCase(),
        rawInput: trimmed,
      };
    }

    // 3. Match valid slug format (e.g. "k-largest-elements")
    if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(trimmed)) {
      return {
        platform: 'GEEKSFORGEEKS',
        gfgSlug: trimmed.toLowerCase(),
        slug: trimmed.toLowerCase(),
        rawInput: trimmed,
      };
    }

    return null;
  },

  async fetchProblem(identifier: PlatformProblemIdentifier): Promise<ExternalProblem> {
    const slug = identifier.gfgSlug || identifier.slug || identifier.rawInput;
    if (!slug) {
      throw new Error('Invalid GeeksforGeeks problem slug or URL.');
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const officialUrl = `https://www.geeksforgeeks.org/problems/${cleanSlug}/1`;

    let title = cleanSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    let statement = '';
    let difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY';
    let inputFormat = 'Standard Input';
    let outputFormat = 'Standard Output';
    let constraints = '1 <= N <= 10^5';
    const examples: { input: string; output: string; explanation?: string }[] = [];
    const tags: string[] = ['geeksforgeeks', 'dsa'];

    // 1. Attempt GFG Practice JSON API fetch
    try {
      const apiRes = await fetch(`https://practiceapi.geeksforgeeks.org/api/vr/problems/${cleanSlug}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 3600 },
      });

      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json.problem_name || json.title) {
          title = json.problem_name || json.title;
        }
        if (json.problem_statement || json.body || json.description) {
          statement = cleanHtml(json.problem_statement || json.body || json.description);
        }
        if (json.difficulty) {
          const diffStr = String(json.difficulty).toUpperCase();
          if (diffStr.includes('HARD')) difficulty = 'HARD';
          else if (diffStr.includes('MEDIUM')) difficulty = 'MEDIUM';
          else difficulty = 'EASY';
        }
        if (Array.isArray(json.tags)) {
          tags.push(...json.tags);
        }
      }
    } catch (e) {
      console.warn('[GFG] Practice API fetch failed, falling back to HTML fetch:', e);
    }

    // 2. HTML Scraper fallback if statement not retrieved from API
    if (!statement) {
      try {
        const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
        const cmd = `${curlCmd} -s -g -L -m 8 -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${officialUrl}"`;
        const htmlContent = execSync(cmd, { encoding: 'utf8', timeout: 8000 });

        if (htmlContent) {
          // Title
          const titleMatch = htmlContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || htmlContent.match(/<title>([\s\S]*?)<\/title>/i);
          if (titleMatch) {
            const rawTitle = stripTags(titleMatch[1]).replace(/\| GeeksforGeeks/i, '').replace(/Problem/i, '').trim();
            if (rawTitle) title = rawTitle;
          }

          // Difficulty
          if (htmlContent.includes('Difficulty: Easy') || htmlContent.includes('"difficulty":"Easy"')) difficulty = 'EASY';
          else if (htmlContent.includes('Difficulty: Medium') || htmlContent.includes('"difficulty":"Medium"')) difficulty = 'MEDIUM';
          else if (htmlContent.includes('Difficulty: Hard') || htmlContent.includes('"difficulty":"Hard"')) difficulty = 'HARD';

          // Problem Description
          const descMatch = htmlContent.match(/<div class="problem-statement"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
                            htmlContent.match(/<div class="problems_problem_content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
          if (descMatch) {
            statement = cleanHtml(descMatch[1]);
          }

          // Constraints parsing
          const constraintsMatch = htmlContent.match(/<strong>\s*Constraints:?\s*<\/strong>([\s\S]*?)(?:<p>|<div)/i) || 
                                   htmlContent.match(/Constraints:?<\/strong>([\s\S]*?)(?:<p>|<div)/i) ||
                                   htmlContent.match(/Constraints:\s*<br>\s*([\s\S]*?)(?:<br>|<p>|<div)/i);
          if (constraintsMatch) {
            let rawConstraints = constraintsMatch[1];
            rawConstraints = rawConstraints.replace(/<sup>(.*?)<\/sup>/gi, '^$1');
            rawConstraints = stripTags(rawConstraints)
              .replace(/&le;/gi, '<=')
              .replace(/&ge;/gi, '>=')
              .replace(/&lt;/gi, '<')
              .replace(/&gt;/gi, '>')
              .replace(/&#183;/gi, '*')
              .replace(/&times;/gi, '*')
              .trim();
            if (rawConstraints) {
              constraints = rawConstraints;
            }
          }

          // Sample Testcases parsing
          const sampleRegex = /Example 1:[\s\S]*?Input:?\s*([^\n<]+)[\s\S]*?Output:?\s*([^\n<]+)/gi;
          let match;
          while ((match = sampleRegex.exec(htmlContent)) !== null) {
            examples.push({
              input: match[1].trim(),
              output: match[2].trim(),
            });
          }
        }
      } catch (err) {
        console.warn('[GFG] HTML Scraper error:', err);
      }
    }

    // Fallback statement format if fetching failed or partial
    if (!statement) {
      statement = `<p>Solve GeeksforGeeks Problem <strong>${title}</strong>.</p><p><a href="${officialUrl}" target="_blank" rel="noopener noreferrer">View original problem on GeeksforGeeks</a></p>`;
    }

    if (examples.length === 0) {
      examples.push({
        input: 'Sample Input',
        output: 'Sample Output',
        explanation: 'Follow instructions on GFG problem page.',
      });
    }

    const starterCode: Record<string, string> = {
      cpp17: `#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Solution for ${title}\n};\n`,
      c: `#include <stdio.h>\n\n// Solution for ${title}\n`,
      java: `import java.util.*;\n\nclass Solution {\n    // Solution for ${title}\n}\n`,
      python: `class Solution:\n    def solve(self):\n        # Solution for ${title}\n        pass\n`,
      javascript: `'use strict';\n\nclass Solution {\n    // Solution for ${title}\n}\n`,
    };

    return {
      platform: 'GEEKSFORGEEKS',
      externalId: cleanSlug,
      slug: cleanSlug,
      title: title,
      statement: statement,
      constraints: constraints,
      inputFormat: inputFormat,
      outputFormat: outputFormat,
      examples: examples,
      difficulty: difficulty,
      rating: difficulty === 'EASY' ? 1000 : difficulty === 'MEDIUM' ? 1500 : 2000,
      tags: Array.from(new Set(tags)),
      officialUrl: officialUrl,
      starterCode: starterCode,
    };
  },
};
