// BCE/scripts/tcs-sheet/group10_stack_queue.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 166,
    external_problem_id: 'tcs-166',
    title: '166. Implement stack using an array',
    slug: 'tcs-166-implement-stack-using-array',
    difficulty: 'EASY',
    tags: ['Stack', 'Arrays', 'Data Structures', 'TCS NQT'],
    input_format: 'First line contains integer Q (number of queries). Next Q lines each contain an operation: "push X", "pop", "top", or "isEmpty".',
    output_format: 'For each "pop" and "top", print the returned value (or -1 if stack is empty). For "isEmpty", print "true" or "false". Each result on a new line.',
    constraints: '1 <= Q <= 10^4, -10^5 <= X <= 10^5',
    description: formatDescription(
      'Implement Stack Using Array',
      'Design a Last-In-First-Out (LIFO) stack using an array. Support operations: push(X), pop(), top(), and isEmpty(). When pop or top is called on empty stack, return -1.',
      'Q on line 1, followed by Q queries.',
      'Output query results line by line.',
      '1 <= Q <= 10^4',
      [
        {
          input: '6\npush 10\npush 20\ntop\npop\nisEmpty\npop',
          output: '20\n20\nfalse\n10',
          explanation: 'top is 20, pop removes 20, stack has 10 (isEmpty false), pop removes 10.'
        },
        {
          input: '3\npop\ntop\nisEmpty',
          output: '-1\n-1\ntrue',
          explanation: 'Stack initially empty.'
        }
      ]
    ),
    starter_code: makeStarterCode('Maintain top pointer and array to implement LIFO stack'),
    testCases: [
      { input: '6\npush 10\npush 20\ntop\npop\nisEmpty\npop', expected_output: '20\n20\nfalse\n10', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\npop\ntop\nisEmpty', expected_output: '-1\n-1\ntrue', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\npush 5\nisEmpty\ntop\npop', expected_output: 'false\n5\n5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\npush 1\npush 2\npush 3\npop\npop', expected_output: '3\n2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\npush 42\npop\npop\ntop\nisEmpty\npush 99', expected_output: '42\n-1\n-1\ntrue', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 167,
    external_problem_id: 'tcs-167',
    title: '167. Implement queue using an array',
    slug: 'tcs-167-implement-queue-using-array',
    difficulty: 'EASY',
    tags: ['Queue', 'Arrays', 'Data Structures', 'TCS NQT'],
    input_format: 'First line contains integer Q. Next Q lines each contain an operation: "enqueue X", "dequeue", "front", or "isEmpty".',
    output_format: 'For each "dequeue" and "front", print returned value (or -1 if empty). For "isEmpty", print "true" or "false". Each result on a new line.',
    constraints: '1 <= Q <= 10^4, -10^5 <= X <= 10^5',
    description: formatDescription(
      'Implement Queue Using Array',
      'Design a First-In-First-Out (FIFO) queue using an array. Support operations: enqueue(X), dequeue(), front(), and isEmpty(). When empty, dequeue and front return -1.',
      'Q on line 1, followed by Q queries.',
      'Output query results on new lines.',
      '1 <= Q <= 10^4',
      [
        {
          input: '6\nenqueue 10\nenqueue 20\nfront\ndequeue\nisEmpty\ndequeue',
          output: '10\n10\nfalse\n20',
          explanation: 'front is 10, dequeue removes 10, queue has 20 (false), dequeue removes 20.'
        },
        {
          input: '3\ndequeue\nfront\nisEmpty',
          output: '-1\n-1\ntrue',
          explanation: 'Queue is empty initially.'
        }
      ]
    ),
    starter_code: makeStarterCode('Maintain head and tail pointers in array for FIFO queue'),
    testCases: [
      { input: '6\nenqueue 10\nenqueue 20\nfront\ndequeue\nisEmpty\ndequeue', expected_output: '10\n10\nfalse\n20', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\ndequeue\nfront\nisEmpty', expected_output: '-1\n-1\ntrue', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\nenqueue 5\nisEmpty\nfront\ndequeue', expected_output: 'false\n5\n5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\nenqueue 1\nenqueue 2\nenqueue 3\ndequeue\ndequeue', expected_output: '1\n2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\nenqueue 9\ndequeue\ndequeue\nfront\nisEmpty\nenqueue 88', expected_output: '9\n-1\n-1\ntrue', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 168,
    external_problem_id: 'tcs-168',
    title: '168. Implement circular queue',
    slug: 'tcs-168-implement-circular-queue',
    difficulty: 'MEDIUM',
    tags: ['Queue', 'Arrays', 'Design', 'TCS NQT'],
    input_format: 'First line contains capacity K and queries count Q. Next Q lines each contain an operation: "enqueue X", "dequeue", "front", "rear", "isEmpty", or "isFull".',
    output_format: 'Print operation outputs line by line: enqueue returns true/false, dequeue returns true/false, front/rear returns value or -1, isEmpty/isFull returns true/false.',
    constraints: '1 <= K <= 1000, 1 <= Q <= 10^4',
    description: formatDescription(
      'Design Circular Queue',
      'Implement a circular queue with fixed capacity K using ring buffer semantics where the last position connects back to the first.',
      'K Q\nQ queries',
      'Output boolean or integer for each query.',
      '1 <= K <= 1000',
      [
        {
          input: '3 6\nenqueue 1\nenqueue 2\nenqueue 3\nenqueue 4\nrear\nisFull',
          output: 'true\ntrue\ntrue\nfalse\n3\ntrue',
          explanation: 'Capacity 3: enqueue 4 fails (false), rear is 3, queue is full (true).'
        },
        {
          input: '2 4\nfront\nisEmpty\nenqueue 5\nfront',
          output: '-1\ntrue\ntrue\n5',
          explanation: 'front on empty queue returns -1.'
        }
      ]
    ),
    starter_code: makeStarterCode('Circular queue with head, tail, and size using modulo arithmetic (tail = (tail + 1) % K)'),
    testCases: [
      { input: '3 6\nenqueue 1\nenqueue 2\nenqueue 3\nenqueue 4\nrear\nisFull', expected_output: 'true\ntrue\ntrue\nfalse\n3\ntrue', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2 4\nfront\nisEmpty\nenqueue 5\nfront', expected_output: '-1\ntrue\ntrue\n5', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 5\nenqueue 10\nenqueue 20\ndequeue\nenqueue 30\nrear', expected_output: 'true\ntrue\ntrue\ntrue\n30', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 4\nenqueue 100\nisFull\ndequeue\nisEmpty', expected_output: 'true\ntrue\ntrue\ntrue', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 5\ndequeue\nfront\nrear\nisEmpty\nisFull', expected_output: 'false\n-1\n-1\ntrue\nfalse', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 169,
    external_problem_id: 'tcs-169',
    title: '169. Implement stack using queues',
    slug: 'tcs-169-implement-stack-using-queues',
    difficulty: 'EASY',
    tags: ['Stack', 'Queue', 'Design', 'TCS NQT'],
    input_format: 'First line contains integer Q. Next Q lines each contain an operation: "push X", "pop", "top", or "isEmpty".',
    output_format: 'For each pop/top print value (or -1 if empty). For isEmpty print true/false.',
    constraints: '1 <= Q <= 10^4',
    description: formatDescription(
      'Implement Stack Using Queues',
      'Implement a LIFO stack using only standard queue operations (enqueue, dequeue, front, size).',
      'Q queries',
      'Operation outputs line by line.',
      '1 <= Q <= 10^4',
      [
        { input: '5\npush 1\npush 2\ntop\npop\nisEmpty', output: '2\n2\nfalse', explanation: 'top is 2, pop removes 2, stack has 1.' },
        { input: '2\ntop\nisEmpty', output: '-1\ntrue' }
      ]
    ),
    starter_code: makeStarterCode('Implement LIFO using one or two standard FIFO queues'),
    testCases: [
      { input: '5\npush 1\npush 2\ntop\npop\nisEmpty', expected_output: '2\n2\nfalse', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\ntop\nisEmpty', expected_output: '-1\ntrue', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\npush 10\nisEmpty\ntop\npop', expected_output: 'false\n10\n10', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '6\npush 1\npush 2\npush 3\npop\npop\npop', expected_output: '3\n2\n1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\npop\ntop\nisEmpty', expected_output: '-1\n-1\ntrue', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 170,
    external_problem_id: 'tcs-170',
    title: '170. Implement queue using stacks',
    slug: 'tcs-170-implement-queue-using-stacks',
    difficulty: 'EASY',
    tags: ['Queue', 'Stack', 'Design', 'TCS NQT'],
    input_format: 'First line contains integer Q. Next Q lines each contain an operation: "enqueue X", "dequeue", "peek", or "isEmpty".',
    output_format: 'For dequeue/peek print value (or -1 if empty). For isEmpty print true/false.',
    constraints: '1 <= Q <= 10^4',
    description: formatDescription(
      'Implement Queue Using Stacks',
      'Implement a FIFO queue using two stacks. Supports enqueue(X), dequeue(), peek(), and isEmpty().',
      'Q queries',
      'Operation outputs line by line.',
      '1 <= Q <= 10^4',
      [
        { input: '5\nenqueue 1\nenqueue 2\npeek\ndequeue\nisEmpty', output: '1\n1\nfalse', explanation: 'peek is 1, dequeue removes 1, remaining element 2.' },
        { input: '2\npeek\nisEmpty', output: '-1\ntrue' }
      ]
    ),
    starter_code: makeStarterCode('Implement queue using inputStack and outputStack with amortized O(1) transfer'),
    testCases: [
      { input: '5\nenqueue 1\nenqueue 2\npeek\ndequeue\nisEmpty', expected_output: '1\n1\nfalse', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\npeek\nisEmpty', expected_output: '-1\ntrue', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\nenqueue 50\nisEmpty\npeek\ndequeue', expected_output: 'false\n50\n50', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '6\nenqueue 10\nenqueue 20\nenqueue 30\ndequeue\ndequeue\ndequeue', expected_output: '10\n20\n30', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\ndequeue\npeek\nisEmpty', expected_output: '-1\n-1\ntrue', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 171,
    external_problem_id: 'tcs-171',
    title: '171. Check balanced parentheses',
    slug: 'tcs-171-check-balanced-parentheses',
    difficulty: 'EASY',
    tags: ['Stack', 'Strings', 'TCS NQT'],
    input_format: 'A single string S consisting of brackets (, ), {, }, [, ].',
    output_format: 'Print "true" if the bracket string is valid and balanced, otherwise "false".',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Valid Balanced Parentheses',
      'Given a string S containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid using a stack.',
      'String S.',
      'true or false.',
      '1 <= |S| <= 10^5',
      [
        { input: '()[]{}', output: 'true', explanation: 'All brackets closed in correct order.' },
        { input: '(]', output: 'false', explanation: 'Mismatched closing bracket.' }
      ]
    ),
    starter_code: makeStarterCode('Use stack to match opening brackets with corresponding closing brackets'),
    testCases: [
      { input: '()[]{}', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '(]', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '([{}])', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '(((((', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '{[()]}()', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 172,
    external_problem_id: 'tcs-172',
    title: '172. Next greater element',
    slug: 'tcs-172-next-greater-element',
    difficulty: 'MEDIUM',
    tags: ['Stack', 'Monotonic Stack', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print N space-separated integers representing the Next Greater Element for each element. If none exists, print -1.',
    constraints: '1 <= N <= 10^5, -10^9 <= arr[i] <= 10^9',
    description: formatDescription(
      'Next Greater Element',
      'Given an array, print the Next Greater Element (NGE) for every element. The Next Greater Element for an element x is the first greater element on the right side of x in the array. If no greater element exists, output -1.',
      'N\nN space-separated integers',
      'N space-separated next greater elements',
      '1 <= N <= 10^5',
      [
        { input: '4\n1 3 2 4', output: '3 4 4 -1', explanation: 'Next greater for 1 is 3, for 3 is 4, for 2 is 4, for 4 none (-1).' },
        { input: '3\n6 8 0', output: '8 -1 -1', explanation: 'Next greater for 6 is 8, 8 and 0 have none.' }
      ]
    ),
    starter_code: makeStarterCode('Monotonic decreasing stack traversed from right to left in O(N) time'),
    testCases: [
      { input: '4\n1 3 2 4', expected_output: '3 4 4 -1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n6 8 0', expected_output: '8 -1 -1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '5\n5 4 3 2 1', expected_output: '-1 -1 -1 -1 -1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n1 2 3 4 5', expected_output: '2 3 4 5 -1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1\n10', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 173,
    external_problem_id: 'tcs-173',
    title: '173. Next smaller element',
    slug: 'tcs-173-next-smaller-element',
    difficulty: 'MEDIUM',
    tags: ['Stack', 'Monotonic Stack', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print N space-separated integers representing the Next Smaller Element to the right. If none exists, print -1.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Next Smaller Element',
      'Given an array of integers, find the next smaller element for each element in the array to its right. If an element does not have a smaller element to its right, output -1.',
      'N\nN integers',
      'N next smaller elements',
      '1 <= N <= 10^5',
      [
        { input: '5\n4 8 5 2 25', output: '2 5 2 -1 -1', explanation: 'For 4 it is 2, for 8 it is 5, for 5 it is 2, for 2 and 25 none.' },
        { input: '4\n13 7 6 12', output: '7 6 -1 -1' }
      ]
    ),
    starter_code: makeStarterCode('Monotonic increasing stack traversed from right to left in O(N) time'),
    testCases: [
      { input: '5\n4 8 5 2 25', expected_output: '2 5 2 -1 -1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n13 7 6 12', expected_output: '7 6 -1 -1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n1 2 3', expected_output: '-1 -1 -1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3\n3 2 1', expected_output: '2 1 -1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1\n5', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 174,
    external_problem_id: 'tcs-174',
    title: '174. Stock span problem',
    slug: 'tcs-174-stock-span-problem',
    difficulty: 'MEDIUM',
    tags: ['Stack', 'Monotonic Stack', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated stock prices.',
    output_format: 'Print N space-separated integers representing the span of stock prices for each day.',
    constraints: '1 <= N <= 10^5, 1 <= price[i] <= 10^6',
    description: formatDescription(
      'The Stock Span Problem',
      'The span Si of the stock price on day i is defined as the maximum number of consecutive days just before the given day, for which the price of the stock was less than or equal to its price on day i.',
      'N\nN prices',
      'N span values space-separated',
      '1 <= N <= 10^5',
      [
        { input: '7\n100 80 60 70 60 75 85', output: '1 1 1 2 1 4 6', explanation: 'Days spanning back with price <= current day price.' },
        { input: '4\n10 10 10 10', output: '1 2 3 4', explanation: 'Equal prices count towards the span.' }
      ]
    ),
    starter_code: makeStarterCode('Monotonic stack storing indices of strictly greater elements on the left'),
    testCases: [
      { input: '7\n100 80 60 70 60 75 85', expected_output: '1 1 1 2 1 4 6', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n10 10 10 10', expected_output: '1 2 3 4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n50', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n50 40 30 20 10', expected_output: '1 1 1 1 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n10 20 30 40 50', expected_output: '1 2 3 4 5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 175,
    external_problem_id: 'tcs-175',
    title: '175. Evaluate a postfix expression',
    slug: 'tcs-175-evaluate-postfix-expression',
    difficulty: 'EASY',
    tags: ['Stack', 'Strings', 'Math', 'TCS NQT'],
    input_format: 'A single line containing space-separated tokens of a valid Reverse Polish Notation (postfix) expression.',
    output_format: 'Print the evaluated integer result (truncate division towards zero).',
    constraints: 'Valid postfix expression containing integers and operators +, -, *, /.',
    description: formatDescription(
      'Evaluate Postfix (RPN) Expression',
      'Evaluate the value of an arithmetic expression in Reverse Polish Notation. Valid operators are +, -, *, and /. Each operand may be an integer or another expression. Division truncates toward zero.',
      'Space-separated tokens.',
      'Single integer result.',
      'Operands and results fit in 32-bit signed integer',
      [
        { input: '2 1 + 3 *', output: '9', explanation: '((2 + 1) * 3) = 9.' },
        { input: '4 13 5 / +', output: '6', explanation: '(4 + (13 / 5)) = 4 + 2 = 6.' }
      ]
    ),
    starter_code: makeStarterCode('Use stack to push operands and pop two operands when encountering an operator'),
    testCases: [
      { input: '2 1 + 3 *', expected_output: '9', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 13 5 / +', expected_output: '6', is_hidden: false, sample_name: 'Sample 2' },
      { input: '10 6 9 3 + -11 * / * 17 + 5 +', expected_output: '22', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 4 -', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '15 7 1 1 + - / 3 * 2 1 1 + + -', expected_output: '5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

