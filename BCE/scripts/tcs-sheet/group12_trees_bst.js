// BCE/scripts/tcs-sheet/group12_trees_bst.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 186,
    external_problem_id: 'tcs-186',
    title: '186. Implement preorder, inorder and postorder traversals',
    slug: 'tcs-186-tree-preorder-inorder-postorder-traversals',
    difficulty: 'EASY',
    tags: ['Trees', 'Binary Tree', 'DFS', 'TCS NQT'],
    input_format: 'First line contains space-separated integers representing the binary tree in level-order traversal (-1 denotes NULL).',
    output_format: 'Print three lines:\nLine 1: Preorder traversal elements space-separated\nLine 2: Inorder traversal elements space-separated\nLine 3: Postorder traversal elements space-separated',
    constraints: '1 <= Number of nodes <= 10^4',
    description: formatDescription(
      'Binary Tree Traversals (Preorder, Inorder, Postorder)',
      'Given the root of a binary tree represented in level order (-1 for null), print its Preorder (Root-Left-Right), Inorder (Left-Root-Right), and Postorder (Left-Right-Root) traversals.',
      'Level-order integers with -1 for NULL',
      'Three lines with space-separated node values.',
      '1 <= Nodes <= 10^4',
      [
        {
          input: '1 2 3 4 5 -1 -1',
          output: '1 2 4 5 3\n4 2 5 1 3\n4 5 2 3 1',
          explanation: 'Root 1, left 2 (with children 4, 5), right 3.'
        },
        {
          input: '1 -1 2 3 -1',
          output: '1 2 3\n1 3 2\n3 2 1',
          explanation: 'Root 1, right child 2 with left child 3.'
        }
      ]
    ),
    starter_code: makeStarterCode('Build binary tree from level order array using queue, then perform recursive traversals'),
    testCases: [
      { input: '1 2 3 4 5 -1 -1', expected_output: '1 2 4 5 3\n4 2 5 1 3\n4 5 2 3 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 -1 2 3 -1', expected_output: '1 2 3\n1 3 2\n3 2 1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '10', expected_output: '10\n10\n10', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 2 3', expected_output: '1 2 3\n2 1 3\n2 3 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 2 6 1 3 5 7', expected_output: '4 2 1 3 6 5 7\n1 2 3 4 5 6 7\n1 3 2 5 7 6 4', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 187,
    external_problem_id: 'tcs-187',
    title: '187. Perform level-order traversal',
    slug: 'tcs-187-binary-tree-level-order-traversal',
    difficulty: 'EASY',
    tags: ['Trees', 'Binary Tree', 'BFS', 'Queue', 'TCS NQT'],
    input_format: 'First line contains space-separated integers representing the binary tree in level order (-1 for NULL).',
    output_format: 'Print each level of the tree on a new line, node values space-separated.',
    constraints: '1 <= Number of nodes <= 10^4',
    description: formatDescription(
      'Binary Tree Level Order Traversal',
      'Given the root of a binary tree, return the level order traversal of its nodes values (i.e., from left to right, level by level), printing each level on a separate line.',
      'Level-order integers (-1 for NULL)',
      'Each level on a new line',
      '1 <= Nodes <= 10^4',
      [
        { input: '3 9 20 -1 -1 15 7', output: '3\n9 20\n15 7', explanation: 'Level 0: 3, Level 1: 9 20, Level 2: 15 7.' },
        { input: '1', output: '1' }
      ]
    ),
    starter_code: makeStarterCode('Breadth-first search using a queue, tracking level size at each step'),
    testCases: [
      { input: '3 9 20 -1 -1 15 7', expected_output: '3\n9 20\n15 7', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 2 3 4 5 6 7', expected_output: '1\n2 3\n4 5 6 7', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 2 -1 3 -1 4 -1', expected_output: '1\n2\n3\n4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10 20 30', expected_output: '10\n20 30', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 188,
    external_problem_id: 'tcs-188',
    title: '188. Find height / maximum depth of a binary tree',
    slug: 'tcs-188-height-maximum-depth-binary-tree',
    difficulty: 'EASY',
    tags: ['Trees', 'Binary Tree', 'DFS', 'TCS NQT'],
    input_format: 'A single line containing space-separated integers representing the binary tree (-1 for NULL).',
    output_format: 'Print the maximum depth / height (number of nodes on longest root-to-leaf path).',
    constraints: '1 <= Number of nodes <= 10^4',
    description: formatDescription(
      'Maximum Depth of Binary Tree',
      'Given the root of a binary tree, return its maximum depth. A binary tree maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
      'Level-order integers (-1 for NULL)',
      'Single integer: maximum depth',
      '1 <= Nodes <= 10^4',
      [
        { input: '3 9 20 -1 -1 15 7', output: '3', explanation: 'Path 3 -> 20 -> 15 has length 3.' },
        { input: '1 -1 2', output: '2', explanation: 'Path 1 -> 2 has length 2.' }
      ]
    ),
    starter_code: makeStarterCode('Recursive height: height(node) = node == null ? 0 : 1 + max(height(left), height(right))'),
    testCases: [
      { input: '3 9 20 -1 -1 15 7', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 -1 2', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 2 3 4 5 -1 -1', expected_output: '3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 2 -1 3 -1 4 -1 5 -1', expected_output: '5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 189,
    external_problem_id: 'tcs-189',
    title: '189. Count leaf nodes',
    slug: 'tcs-189-count-leaf-nodes-binary-tree',
    difficulty: 'EASY',
    tags: ['Trees', 'Binary Tree', 'DFS', 'TCS NQT'],
    input_format: 'A single line of space-separated integers representing the binary tree (-1 for NULL).',
    output_format: 'Print the total number of leaf nodes in the binary tree.',
    constraints: '1 <= Number of nodes <= 10^4',
    description: formatDescription(
      'Count Leaf Nodes in Binary Tree',
      'A node is a leaf node if both its left and right child nodes are NULL. Given the binary tree in level-order, count and print the total number of leaf nodes.',
      'Level-order integers (-1 for NULL)',
      'Total leaf count',
      '1 <= Nodes <= 10^4',
      [
        { input: '1 2 3 4 5 -1 -1', output: '3', explanation: 'Leaf nodes are 4, 5, and 3.' },
        { input: '1', output: '1', explanation: 'Root is itself a leaf.' }
      ]
    ),
    starter_code: makeStarterCode('DFS: if node has no left and no right child, return 1; else sum leaves of left and right'),
    testCases: [
      { input: '1 2 3 4 5 -1 -1', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 2 3', expected_output: '2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 -1 2 -1 3 -1 4', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 2 3 4 5 6 7', expected_output: '4', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 190,
    external_problem_id: 'tcs-190',
    title: '190. Check whether two trees are identical',
    slug: 'tcs-190-check-identical-trees',
    difficulty: 'EASY',
    tags: ['Trees', 'Binary Tree', 'DFS', 'TCS NQT'],
    input_format: 'First line contains level-order integers of tree 1. Second line contains level-order integers of tree 2 (-1 for NULL).',
    output_format: 'Print "true" if the two trees are structurally identical and have the same node values, otherwise "false".',
    constraints: '1 <= Number of nodes <= 10^4',
    description: formatDescription(
      'Same Tree / Identical Trees',
      'Given the roots of two binary trees, check if they are the same or not. Two binary trees are considered the same if they are structurally identical, and the nodes have the same value.',
      'Tree 1 on line 1, Tree 2 on line 2',
      'true or false',
      '1 <= Nodes <= 10^4',
      [
        { input: '1 2 3\n1 2 3', output: 'true', explanation: 'Identical structures and values.' },
        { input: '1 2\n1 -1 2', output: 'false', explanation: 'Different structures.' }
      ]
    ),
    starter_code: makeStarterCode('Recursive comparison: isSame(p, q) = (p == null && q == null) || (p.val == q.val && isSame(p.left, q.left) && isSame(p.right, q.right))'),
    testCases: [
      { input: '1 2 3\n1 2 3', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 2\n1 -1 2', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 2 1\n1 1 2', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n5', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 2 7 1 3\n4 2 7 1 3', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 191,
    external_problem_id: 'tcs-191',
    title: '191. Check whether a binary tree is balanced',
    slug: 'tcs-191-balanced-binary-tree',
    difficulty: 'EASY',
    tags: ['Trees', 'Binary Tree', 'DFS', 'TCS NQT'],
    input_format: 'A single line containing space-separated integers representing the binary tree (-1 for NULL).',
    output_format: 'Print "true" if the tree is height-balanced, otherwise "false".',
    constraints: '1 <= Number of nodes <= 10^4',
    description: formatDescription(
      'Balanced Binary Tree',
      'Given a binary tree, determine if it is height-balanced. A height-balanced binary tree is defined as a binary tree in which the depth of the two subtrees of every node never differs by more than one.',
      'Level-order integers (-1 for NULL)',
      'true or false',
      '1 <= Nodes <= 10^4',
      [
        { input: '3 9 20 -1 -1 15 7', output: 'true', explanation: 'Left depth 1, right depth 2, difference <= 1.' },
        { input: '1 2 2 3 3 -1 -1 4 4', output: 'false', explanation: 'Left subtree depth 3, right subtree depth 1.' }
      ]
    ),
    starter_code: makeStarterCode('Bottom-up DFS returning height if balanced or -1 if unbalanced in O(N) time'),
    testCases: [
      { input: '3 9 20 -1 -1 15 7', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 2 2 3 3 -1 -1 4 4', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 2 -1 3 -1', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 2 3 4 5 6 7', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 192,
    external_problem_id: 'tcs-192',
    title: '192. Find diameter of a binary tree',
    slug: 'tcs-192-diameter-of-binary-tree',
    difficulty: 'MEDIUM',
    tags: ['Trees', 'Binary Tree', 'DFS', 'TCS NQT'],
    input_format: 'A single line containing space-separated integers representing the binary tree (-1 for NULL).',
    output_format: 'Print the length of the diameter of the tree (number of edges on the longest path between any two nodes).',
    constraints: '1 <= Number of nodes <= 10^4',
    description: formatDescription(
      'Diameter of Binary Tree',
      'Given the root of a binary tree, return the length of the diameter of the tree. The diameter of a binary tree is the length of the longest path between any two nodes in a tree. This path may or may not pass through the root. The length is the number of edges.',
      'Level-order integers (-1 for NULL)',
      'Diameter (edge count)',
      '1 <= Nodes <= 10^4',
      [
        { input: '1 2 3 4 5 -1 -1', output: '3', explanation: 'Path 4 -> 2 -> 1 -> 3 has length 3 edges.' },
        { input: '1 2', output: '1', explanation: 'Only edge is 1-2.' }
      ]
    ),
    starter_code: makeStarterCode('DFS calculating height of left and right, updating max diameter = leftHeight + rightHeight'),
    testCases: [
      { input: '1 2 3 4 5 -1 -1', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 2', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 2 3', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 2 3 4 -1 -1 5', expected_output: '4', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 193,
    external_problem_id: 'tcs-193',
    title: '193. Find lowest common ancestor in a BST',
    slug: 'tcs-193-lowest-common-ancestor-bst',
    difficulty: 'EASY',
    tags: ['Trees', 'BST', 'Binary Search Tree', 'TCS NQT'],
    input_format: 'First line contains space-separated integers representing the BST in level-order (-1 for NULL). Second line contains two node values P and Q.',
    output_format: 'Print the value of the Lowest Common Ancestor (LCA) node.',
    constraints: '2 <= Number of nodes <= 10^4, all node values are unique.',
    description: formatDescription(
      'Lowest Common Ancestor in a BST',
      'Given a Binary Search Tree (BST) and two nodes P and Q, find the lowest common ancestor (LCA) node of P and Q. According to definition, LCA is the lowest node in T that has both P and Q as descendants (a node can be a descendant of itself).',
      'BST level-order\nP Q',
      'Value of LCA',
      '2 <= Nodes <= 10^4',
      [
        { input: '6 2 8 0 4 7 9 -1 -1 3 5\n2 8', output: '6', explanation: 'LCA of 2 and 8 is root 6.' },
        { input: '6 2 8 0 4 7 9 -1 -1 3 5\n2 4', output: '2', explanation: 'LCA of 2 and 4 is 2.' }
      ]
    ),
    starter_code: makeStarterCode('Traverse BST: if both P and Q are smaller go left, if both greater go right, else current node is LCA'),
    testCases: [
      { input: '6 2 8 0 4 7 9 -1 -1 3 5\n2 8', expected_output: '6', is_hidden: false, sample_name: 'Sample 1' },
      { input: '6 2 8 0 4 7 9 -1 -1 3 5\n2 4', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 1\n2 1', expected_output: '2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5 3 6 2 4 -1 -1 1\n1 4', expected_output: '3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10 5 15 2 7 12 20\n12 20', expected_output: '15', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 194,
    external_problem_id: 'tcs-194',
    title: '194. Search, insert and delete in a BST',
    slug: 'tcs-194-bst-search-insert-delete',
    difficulty: 'MEDIUM',
    tags: ['Trees', 'BST', 'Binary Search Tree', 'TCS NQT'],
    input_format: 'First line contains integer N (number of initial elements). Second line contains N integers to construct BST. Third line contains Q (number of operations). Next Q lines contain: "SEARCH X", "INSERT X", or "DELETE X".',
    output_format: 'For each SEARCH X, print "FOUND" or "NOT_FOUND". At the end of all operations, print the inorder traversal of the final BST on the last line space-separated.',
    constraints: '1 <= N, Q <= 1000',
    description: formatDescription(
      'BST Operations: Search, Insert, and Delete',
      'Implement standard Binary Search Tree operations: SEARCH(X) (returns FOUND or NOT_FOUND), INSERT(X) (adds X into BST if not present), and DELETE(X) (removes X using inorder successor for 2-child delete). Finally, output the inorder traversal of the resulting tree.',
      'N elements\nQ operations',
      'Query outputs followed by final inorder traversal.',
      '1 <= N, Q <= 1000',
      [
        {
          input: '5\n50 30 70 20 40\n3\nSEARCH 30\nINSERT 60\nDELETE 30',
          output: 'FOUND\n20 40 50 60 70',
          explanation: '30 is found, 60 inserted, 30 deleted. Inorder is sorted.'
        },
        {
          input: '3\n10 5 15\n2\nSEARCH 100\nINSERT 100',
          output: 'NOT_FOUND\n5 10 15 100'
        }
      ]
    ),
    starter_code: makeStarterCode('Standard BST operations: insert, delete with in-order successor, search in O(h)'),
    testCases: [
      { input: '5\n50 30 70 20 40\n3\nSEARCH 30\nINSERT 60\nDELETE 30', expected_output: 'FOUND\n20 40 50 60 70', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n10 5 15\n2\nSEARCH 100\nINSERT 100', expected_output: 'NOT_FOUND\n5 10 15 100', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n10\n1\nSEARCH 10', expected_output: 'FOUND\n10', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3\n20 10 30\n2\nDELETE 20\nSEARCH 20', expected_output: 'NOT_FOUND\n10 30', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4\n4 2 6 1\n2\nINSERT 3\nINSERT 5', expected_output: '1 2 3 4 5 6', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 195,
    external_problem_id: 'tcs-195',
    title: '195. Validate whether a binary tree is a BST',
    slug: 'tcs-195-validate-binary-search-tree',
    difficulty: 'MEDIUM',
    tags: ['Trees', 'BST', 'DFS', 'TCS NQT'],
    input_format: 'A single line containing space-separated integers representing the binary tree in level order (-1 for NULL).',
    output_format: 'Print "true" if the tree is a valid Binary Search Tree, otherwise "false".',
    constraints: '1 <= Number of nodes <= 10^4',
    description: formatDescription(
      'Validate Binary Search Tree',
      'Given the root of a binary tree, determine if it is a valid binary search tree (BST). The left subtree contains only keys strictly less than the node key, and the right subtree contains only keys strictly greater than the node key.',
      'Level-order integers (-1 for NULL)',
      'true or false',
      '1 <= Nodes <= 10^4',
      [
        { input: '2 1 3', output: 'true', explanation: 'Root 2, left 1 < 2, right 3 > 2.' },
        { input: '5 1 4 -1 -1 3 6', output: 'false', explanation: 'Right child 4 has child 3 which is <= 5.' }
      ]
    ),
    starter_code: makeStarterCode('DFS with min/max range boundaries: isValid(node, minVal, maxVal)'),
    testCases: [
      { input: '2 1 3', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5 1 4 -1 -1 3 6', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 2 2', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10 5 15 -1 -1 6 20', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

