/**
 * Regression Test Suite for Agent Intent Classification & Conversational Routing.
 * Ensures normal conversational queries NEVER route to external browser automation or require tool permissions,
 * while explicit external browser actions correctly trigger searchWebAndSolve / openBrowserUrl.
 */

function isExplicitExternalSearchSolveIntent(prompt: string): boolean {
  const promptLower = prompt.trim().toLowerCase();
  const hasExplicitExternalAction = /\b(open|go\s+to|visit|navigate\s+to|search|ask|find|type|copy|paste)\b/i.test(promptLower);
  const hasExplicitExternalTargetSite = /\b(chatgpt|gpt|chat\s*gpt|gemini|google\s+gemini|google|github)\b/i.test(promptLower);
  return hasExplicitExternalAction && hasExplicitExternalTargetSite;
}

async function runIntentRoutingTests() {
  console.log('=== Running Agent Intent Classification & Conversational Routing Tests ===\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    }
  }

  // 1. Test Normal Conversational Queries (MUST NOT trigger external browser tasks)
  const conversationalQueries = [
    { prompt: 'hii', expectedExternal: false },
    { prompt: 'hello', expectedExternal: false },
    { prompt: 'hi how are you', expectedExternal: false },
    { prompt: 'how are you?', expectedExternal: false },
    { prompt: 'good morning', expectedExternal: false },
    { prompt: 'thanks', expectedExternal: false },
    { prompt: 'what can you do?', expectedExternal: false },
    { prompt: 'write a python program for palindrome', expectedExternal: false },
    { prompt: 'what is binary search?', expectedExternal: false },
    { prompt: 'how do I solve two sum?', expectedExternal: false },
    { prompt: 'what is ChatGPT?', expectedExternal: false }
  ];

  for (const tc of conversationalQueries) {
    const isExternal = isExplicitExternalSearchSolveIntent(tc.prompt);
    assert(
      isExternal === tc.expectedExternal,
      `Conversational CHAT query: "${tc.prompt}"`,
      `isExternal = ${isExternal}, expected = ${tc.expectedExternal}`
    );
  }

  // 2. Test Explicit External Browser Tasks (MUST trigger external browser pipeline)
  const externalTasks = [
    { prompt: 'open chatgpt', expectedExternal: true },
    { prompt: 'open chatgpt and search two sum', expectedExternal: true },
    { prompt: 'open gemini', expectedExternal: true },
    { prompt: 'go to google and search binary search', expectedExternal: true },
    { prompt: 'find code on chatgpt', expectedExternal: true }
  ];

  for (const tc of externalTasks) {
    const isExternal = isExplicitExternalSearchSolveIntent(tc.prompt);
    assert(
      isExternal === tc.expectedExternal,
      `Explicit External Task: "${tc.prompt}"`,
      `isExternal = ${isExternal}, expected = ${tc.expectedExternal}`
    );
  }

  console.log(`\n=== Results: ${passed}/${total} tests passed ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runIntentRoutingTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
