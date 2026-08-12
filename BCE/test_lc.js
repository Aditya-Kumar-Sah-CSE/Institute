const fs = require('fs');

async function testLeetCode(slug) {
  console.log('Testing LeetCode slug:', slug);
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

  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: `https://leetcode.com/problems/${slug}/`,
    },
    body: JSON.stringify(graphqlQuery),
  });

  console.log('Status:', res.status);
  const json = await res.json();
  const q = json.data?.question;
  if (!q) {
    console.error('Question null!');
    return;
  }

  console.log('Title:', q.title);
  console.log('Difficulty:', q.difficulty);
  console.log('Content length:', q.content?.length);
  console.log('Example testcases raw:', q.exampleTestcases);

  // Extract examples from content HTML
  const examples = [];
  if (q.content) {
    const exampleRegex = /<strong class="example">Example \d+:<\/strong>[\s\S]*?<pre>([\s\S]*?)<\/pre>/gi;
    let match;
    while ((match = exampleRegex.exec(q.content)) !== null) {
      const block = match[1];
      const inputMatch = block.match(/<strong>Input:<\/strong>([\s\S]*?)(?:<strong>Output:<\/strong>|$)/i);
      const outputMatch = block.match(/<strong>Output:<\/strong>([\s\S]*?)(?:<strong>Explanation:<\/strong>|$)/i);
      const explMatch = block.match(/<strong>Explanation:<\/strong>([\s\S]*?)$/i);

      const input = inputMatch ? inputMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      const output = outputMatch ? outputMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      const explanation = explMatch ? explMatch[1].replace(/<[^>]*>/g, '').trim() : undefined;

      if (input || output) {
        examples.push({ input, output, explanation });
      }
    }
  }

  console.log('Parsed Examples from HTML:', JSON.stringify(examples, null, 2));
}

testLeetCode('two-sum');
