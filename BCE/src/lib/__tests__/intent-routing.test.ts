/**
 * Regression Test Suite for Agent Intent Classification Architecture.
 * Strictly verifies 3-tier intent isolation:
 * 1. NORMAL_CHAT (hii, hello, write code, what is ChatGPT) -> LLM Chat (No tool, No View Sheet)
 * 2. SMART_LEARN_ACTION (open my DSA sheet, open courses) -> Smart Learn Tool
 * 3. EXTERNAL_BROWSER_TASK (open chatgpt, open gemini) -> External Browser Automation
 */

function classifyIntent(prompt: string): 'NORMAL_CHAT' | 'SMART_LEARN_ACTION' | 'EXTERNAL_BROWSER_TASK' {
  const promptLower = prompt.trim().toLowerCase();

  // 1. Explicit External Browser Action check
  const hasExplicitExternalAction = /\b(open|go\s+to|visit|navigate\s+to|search|ask|find|type|copy|paste)\b/i.test(promptLower);
  const hasExplicitExternalTargetSite = /\b(chatgpt|gpt|chat\s*gpt|gemini|google\s+gemini|google|github)\b/i.test(promptLower);

  if (hasExplicitExternalAction && hasExplicitExternalTargetSite) {
    return 'EXTERNAL_BROWSER_TASK';
  }

  // 2. Explicit Smart Learn Action check
  const isExplicitSmartLearnAction = /\b(open|kholo|show|dikhao|view|create|banao|run|execute)\b/i.test(promptLower) &&
    /\b(dsa|sheet|sheets|coding|routine|schedule|goals?|latex|student360|intelligence|profile|course|courses|module|lesson|mcq|quiz)\b/i.test(promptLower);

  if (isExplicitSmartLearnAction) {
    return 'SMART_LEARN_ACTION';
  }

  // 3. Normal Conversational Chat (DEFAULT)
  return 'NORMAL_CHAT';
}

async function runIntentRoutingTests() {
  console.log('=== Running 3-Tier Agent Intent Routing Tests ===\n');

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

  // 1. NORMAL_CHAT Tests
  const chatQueries = [
    'hii',
    'hi',
    'hello',
    'hey',
    'how are you',
    'how are you?',
    'good morning',
    'thanks',
    'what can you do?',
    'who are you?',
    'write python code for palindrome',
    'explain binary search',
    'what is two sum?',
    'what is ChatGPT?',
    'what is Gemini?'
  ];

  for (const prompt of chatQueries) {
    const intent = classifyIntent(prompt);
    assert(
      intent === 'NORMAL_CHAT',
      `NORMAL_CHAT: "${prompt}"`,
      `intent = ${intent}, expected = NORMAL_CHAT`
    );
  }

  // 2. SMART_LEARN_ACTION Tests
  const smartLearnActions = [
    'open my DSA sheet',
    'open courses',
    'open routine',
    'open goals',
    'open latex editor',
    'show Student360'
  ];

  for (const prompt of smartLearnActions) {
    const intent = classifyIntent(prompt);
    assert(
      intent === 'SMART_LEARN_ACTION',
      `SMART_LEARN_ACTION: "${prompt}"`,
      `intent = ${intent}, expected = SMART_LEARN_ACTION`
    );
  }

  // 3. EXTERNAL_BROWSER_TASK Tests
  const externalTasks = [
    'open chatgpt',
    'open chatgpt and search two sum',
    'open gemini',
    'go to google and search binary search',
    'find code on chatgpt'
  ];

  for (const prompt of externalTasks) {
    const intent = classifyIntent(prompt);
    assert(
      intent === 'EXTERNAL_BROWSER_TASK',
      `EXTERNAL_BROWSER_TASK: "${prompt}"`,
      `intent = ${intent}, expected = EXTERNAL_BROWSER_TASK`
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
