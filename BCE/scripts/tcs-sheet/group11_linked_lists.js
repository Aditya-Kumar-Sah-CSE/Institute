// BCE/scripts/tcs-sheet/group11_linked_lists.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 176,
    external_problem_id: 'tcs-176',
    title: '176. Create and traverse a singly linked list',
    slug: 'tcs-176-create-traverse-singly-linked-list',
    difficulty: 'EASY',
    tags: ['Linked List', 'Data Structures', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the elements of the linked list separated by space from head to tail.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Create and Traverse Singly Linked List',
      'Construct a singly linked list with N nodes containing the given values and print all node values by traversing from head to tail.',
      'N on line 1, N values on line 2.',
      'Values separated by a single space.',
      '1 <= N <= 10^5',
      [
        { input: '5\n1 2 3 4 5', output: '1 2 3 4 5', explanation: 'Construct list 1 -> 2 -> 3 -> 4 -> 5 and traverse.' },
        { input: '1\n42', output: '42' }
      ]
    ),
    starter_code: makeStarterCode('Node structure with val and next pointer, append to tail and traverse'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: '1 2 3 4 5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n42', expected_output: '42', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n10 20 30', expected_output: '10 20 30', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n-1 0 1 2', expected_output: '-1 0 1 2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n7 7 7 7 7 7', expected_output: '7 7 7 7 7 7', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 177,
    external_problem_id: 'tcs-177',
    title: '177. Insert a node at head, tail and a given position',
    slug: 'tcs-177-insert-node-head-tail-position',
    difficulty: 'EASY',
    tags: ['Linked List', 'Data Structures', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N integers. Third line contains Q. Next Q lines each contain: "HEAD X", "TAIL X", or "POS K X" (1-based index).',
    output_format: 'Print the final linked list elements space-separated.',
    constraints: '1 <= N, Q <= 1000, 1 <= K <= current_length + 1',
    description: formatDescription(
      'Insert Node at Head, Tail and Position',
      'Perform insertion operations on a singly linked list: HEAD X (insert at front), TAIL X (insert at end), POS K X (insert at 1-based position K).',
      'Initial list followed by Q queries.',
      'Space-separated list elements.',
      '1 <= N, Q <= 1000',
      [
        {
          input: '3\n2 3 4\n3\nHEAD 1\nTAIL 5\nPOS 3 99',
          output: '1 2 99 3 4 5',
          explanation: 'HEAD 1 -> 1 2 3 4. TAIL 5 -> 1 2 3 4 5. POS 3 99 -> 1 2 99 3 4 5.'
        },
        {
          input: '1\n10\n1\nTAIL 20',
          output: '10 20'
        }
      ]
    ),
    starter_code: makeStarterCode('Insert at head by updating new_node->next = head; traverse to tail or index for other inserts'),
    testCases: [
      { input: '3\n2 3 4\n3\nHEAD 1\nTAIL 5\nPOS 3 99', expected_output: '1 2 99 3 4 5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n10\n1\nTAIL 20', expected_output: '10 20', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\n1 2\n2\nHEAD 0\nHEAD -1', expected_output: '-1 0 1 2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n1 3\n1\nPOS 2 2', expected_output: '1 2 3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1\n5\n3\nHEAD 1\nTAIL 9\nPOS 2 3', expected_output: '1 3 5 9', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 178,
    external_problem_id: 'tcs-178',
    title: '178. Delete head, tail and a node by value',
    slug: 'tcs-178-delete-head-tail-value-linked-list',
    difficulty: 'EASY',
    tags: ['Linked List', 'Data Structures', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N integers. Third line contains Q queries: "DEL_HEAD", "DEL_TAIL", or "DEL_VAL X" (deletes first occurrence).',
    output_format: 'Print the resulting linked list space-separated. If the list is empty, print "EMPTY".',
    constraints: '1 <= N, Q <= 1000',
    description: formatDescription(
      'Delete from Singly Linked List',
      'Perform deletion operations on a singly linked list: DEL_HEAD (remove front node), DEL_TAIL (remove end node), DEL_VAL X (remove first node with value X). Print EMPTY if list becomes empty.',
      'Initial list followed by Q deletion queries.',
      'Remaining list space-separated or EMPTY.',
      '1 <= N, Q <= 1000',
      [
        {
          input: '5\n10 20 30 40 50\n3\nDEL_HEAD\nDEL_TAIL\nDEL_VAL 30',
          output: '20 40',
          explanation: 'Delete 10, delete 50, delete 30 leaves 20 40.'
        },
        {
          input: '1\n10\n1\nDEL_HEAD',
          output: 'EMPTY'
        }
      ]
    ),
    starter_code: makeStarterCode('Update pointers to delete head (head = head->next), tail, or first matching node value'),
    testCases: [
      { input: '5\n10 20 30 40 50\n3\nDEL_HEAD\nDEL_TAIL\nDEL_VAL 30', expected_output: '20 40', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n10\n1\nDEL_HEAD', expected_output: 'EMPTY', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n1 2 3\n1\nDEL_TAIL', expected_output: '1 2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n1 2 3 4\n2\nDEL_VAL 2\nDEL_VAL 4', expected_output: '1 3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '2\n5 10\n2\nDEL_HEAD\nDEL_HEAD', expected_output: 'EMPTY', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 179,
    external_problem_id: 'tcs-179',
    title: '179. Find the middle of a linked list',
    slug: 'tcs-179-middle-of-linked-list',
    difficulty: 'EASY',
    tags: ['Linked List', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the value of the middle node. If there are two middle nodes, print the second middle node.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Middle of the Linked List',
      'Given the head of a singly linked list, return the middle node value. If there are two middle nodes, return the second middle node (using slow and fast pointer approach).',
      'N\nN space-separated integers',
      'Middle node value',
      '1 <= N <= 10^5',
      [
        { input: '5\n1 2 3 4 5', output: '3', explanation: 'Middle node is 3.' },
        { input: '6\n1 2 3 4 5 6', output: '4', explanation: 'Even length: middle nodes are 3 and 4, return second (4).' }
      ]
    ),
    starter_code: makeStarterCode('Tortoise and Hare: slow moves 1 step, fast moves 2 steps'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '6\n1 2 3 4 5 6', expected_output: '4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n100', expected_output: '100', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n10 20', expected_output: '20', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '7\n2 4 6 8 10 12 14', expected_output: '8', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 180,
    external_problem_id: 'tcs-180',
    title: '180. Reverse a linked list iteratively',
    slug: 'tcs-180-reverse-linked-list-iteratively',
    difficulty: 'EASY',
    tags: ['Linked List', 'Data Structures', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the elements of the reversed linked list space-separated.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Reverse Linked List (Iterative)',
      'Given the head of a singly linked list, reverse the list iteratively in O(N) time and O(1) space, and print the reversed node values.',
      'N\nN space-separated integers',
      'Reversed list elements space-separated',
      '1 <= N <= 10^5',
      [
        { input: '5\n1 2 3 4 5', output: '5 4 3 2 1', explanation: 'Reversed order.' },
        { input: '2\n1 2', output: '2 1' }
      ]
    ),
    starter_code: makeStarterCode('Iterative reversal with prev, curr, next pointers: curr->next = prev'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: '5 4 3 2 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n1 2', expected_output: '2 1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n99', expected_output: '99', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n10 20 30 40', expected_output: '40 30 20 10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n3 1 4 1 5 9', expected_output: '9 5 1 4 1 3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 181,
    external_problem_id: 'tcs-181',
    title: '181. Reverse a linked list recursively',
    slug: 'tcs-181-reverse-linked-list-recursively',
    difficulty: 'EASY',
    tags: ['Linked List', 'Recursion', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the elements of the reversed linked list space-separated.',
    constraints: '1 <= N <= 5000',
    description: formatDescription(
      'Reverse Linked List (Recursive)',
      'Given the head of a singly linked list, reverse the list using recursion.',
      'N\nN space-separated integers',
      'Reversed elements space-separated',
      '1 <= N <= 5000',
      [
        { input: '5\n1 2 3 4 5', output: '5 4 3 2 1', explanation: 'Reversed recursively.' },
        { input: '1\n10', output: '10' }
      ]
    ),
    starter_code: makeStarterCode('Recursive reverse: newHead = reverse(head->next); head->next->next = head; head->next = null;'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: '5 4 3 2 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n10', expected_output: '10', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\n7 8', expected_output: '8 7', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n4 3 2 1', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n100 200 300', expected_output: '300 200 100', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 182,
    external_problem_id: 'tcs-182',
    title: '182. Detect a cycle using Floyd\'s algorithm',
    slug: 'tcs-182-detect-cycle-floyds-algorithm',
    difficulty: 'MEDIUM',
    tags: ['Linked List', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and pos (0-indexed position where tail points to, or -1 for no cycle). Second line contains N space-separated integers.',
    output_format: 'Print "true" if there is a cycle, otherwise "false".',
    constraints: '1 <= N <= 10^5, -1 <= pos < N',
    description: formatDescription(
      'Detect Cycle (Floyd\'s Tortoise and Hare)',
      'Given head of a linked list, determine if the linked list has a cycle in it using Floyd\'s cycle-finding algorithm.',
      'N pos\nN space-separated integers',
      'true or false',
      '1 <= N <= 10^5',
      [
        { input: '4 1\n3 2 0 -4', output: 'true', explanation: 'Tail connects to node at index 1.' },
        { input: '1 -1\n1', output: 'false', explanation: 'No cycle.' }
      ]
    ),
    starter_code: makeStarterCode('Floyd cycle detection: slow = slow->next, fast = fast->next->next; check if slow == fast'),
    testCases: [
      { input: '4 1\n3 2 0 -4', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 -1\n1', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 0\n1 2', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 -1\n1 2 3', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 2\n1 2 3 4 5', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 183,
    external_problem_id: 'tcs-183',
    title: '183. Find the starting node of a cycle',
    slug: 'tcs-183-find-cycle-starting-node',
    difficulty: 'MEDIUM',
    tags: ['Linked List', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and pos (0-indexed index where tail points to, or -1 if no cycle). Second line contains N integers.',
    output_format: 'Print the value of the node where the cycle begins, or -1 if there is no cycle.',
    constraints: '1 <= N <= 10^5, -1 <= pos < N',
    description: formatDescription(
      'Find Starting Node of Cycle',
      'Given the head of a linked list, return the value of the node where the cycle begins. If there is no cycle, return -1.',
      'N pos\nN integers',
      'Starting node value or -1',
      '1 <= N <= 10^5',
      [
        { input: '4 1\n3 2 0 -4', output: '2', explanation: 'Cycle starts at index 1 with value 2.' },
        { input: '1 -1\n1', output: '-1', explanation: 'No cycle.' }
      ]
    ),
    starter_code: makeStarterCode('After slow and fast meet, reset slow to head; move both 1 step until they meet at cycle start'),
    testCases: [
      { input: '4 1\n3 2 0 -4', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 -1\n1', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 0\n1 2', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 -1\n10 20 30', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 3\n1 2 3 4 5', expected_output: '4', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 184,
    external_problem_id: 'tcs-184',
    title: '184. Merge two sorted linked lists',
    slug: 'tcs-184-merge-two-sorted-linked-lists',
    difficulty: 'EASY',
    tags: ['Linked List', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and M. Second line contains N sorted integers. Third line contains M sorted integers.',
    output_format: 'Print the merged sorted linked list elements space-separated.',
    constraints: '0 <= N, M <= 10^5, N + M >= 1',
    description: formatDescription(
      'Merge Two Sorted Linked Lists',
      'Merge two sorted linked lists and return it as a single sorted list by splicing together the nodes of the first two lists.',
      'N M\nN sorted integers\nM sorted integers',
      'Merged sorted elements',
      '1 <= N + M <= 10^5',
      [
        { input: '3 3\n1 2 4\n1 3 4', output: '1 1 2 3 4 4', explanation: 'Merged sorted list.' },
        { input: '1 2\n2\n1 3', output: '1 2 3' }
      ]
    ),
    starter_code: makeStarterCode('Use dummy head and pointer to stitch smaller current node'),
    testCases: [
      { input: '3 3\n1 2 4\n1 3 4', expected_output: '1 1 2 3 4 4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 2\n2\n1 3', expected_output: '1 2 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 0\n1 2 3\n', expected_output: '1 2 3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 2\n5 10\n2 8', expected_output: '2 5 8 10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 1\n0\n0', expected_output: '0 0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 185,
    external_problem_id: 'tcs-185',
    title: '185. Remove the Nth node from the end',
    slug: 'tcs-185-remove-nth-node-from-end',
    difficulty: 'MEDIUM',
    tags: ['Linked List', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains L and K (L = total length, K = position from end). Second line contains L space-separated integers.',
    output_format: 'Print the resulting linked list space-separated. If empty, print "EMPTY".',
    constraints: '1 <= K <= L <= 10^5',
    description: formatDescription(
      'Remove Nth Node From End of List',
      'Given the head of a linked list, remove the K-th node from the end of the list and return its head in a single pass using two pointers.',
      'L K\nL space-separated integers',
      'Remaining list elements or EMPTY',
      '1 <= K <= L <= 10^5',
      [
        { input: '5 2\n1 2 3 4 5', output: '1 2 3 5', explanation: '2nd node from end is 4, after removal: 1 2 3 5.' },
        { input: '1 1\n1', output: 'EMPTY', explanation: 'Only node removed, list is empty.' }
      ]
    ),
    starter_code: makeStarterCode('Advance fast pointer by K steps, then advance fast and slow together until fast reaches end'),
    testCases: [
      { input: '5 2\n1 2 3 4 5', expected_output: '1 2 3 5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 1\n1', expected_output: 'EMPTY', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 1\n1 2', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 2\n1 2', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 3\n10 20 30 40', expected_output: '10 30 40', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

