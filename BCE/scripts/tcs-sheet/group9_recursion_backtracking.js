// BCE/scripts/tcs-sheet/group9_recursion_backtracking.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 151,
    external_problem_id: 'tcs-151',
    title: '151. Find factorial using recursion',
    slug: 'tcs-151-find-factorial-using-recursion',
    difficulty: 'EASY',
    tags: ['Recursion', 'Math', 'TCS NQT'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print the factorial of N (N!).',
    constraints: '0 <= N <= 15',
    description: formatDescription(
      'Factorial Using Recursion',
      'Compute the factorial of a given non-negative integer N using a recursive function. By definition, 0! = 1 and N! = N * (N - 1)! for N > 0.',
      'A single non-negative integer N.',
      'Print N!.',
      '0 <= N <= 15',
      [
        { input: '5', output: '120', explanation: '5! = 5 * 4 * 3 * 2 * 1 = 120.' },
        { input: '0', output: '1', explanation: '0! is 1.' }
      ]
    ),
    starter_code: makeStarterCode('Recursive factorial calculation: factorial(n) = n <= 1 ? 1 : n * factorial(n - 1)'),
    testCases: [
      { input: '5', expected_output: '120', is_hidden: false, sample_name: 'Sample 1' },
      { input: '0', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '6', expected_output: '720', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10', expected_output: '3628800', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 152,
    external_problem_id: 'tcs-152',
    title: '152. Find Fibonacci using recursion and memoization',
    slug: 'tcs-152-find-fibonacci-recursion-memoization',
    difficulty: 'EASY',
    tags: ['Recursion', 'Dynamic Programming', 'Memoization', 'TCS NQT'],
    input_format: 'A single integer N.',
    output_format: 'Print the N-th Fibonacci number where F(0) = 0 and F(1) = 1.',
    constraints: '0 <= N <= 40',
    description: formatDescription(
      'Fibonacci with Recursion & Memoization',
      'Find the N-th Fibonacci number using recursion with memoization (or dynamic programming) to achieve O(N) time complexity.',
      'Single integer N.',
      'Print F(N).',
      '0 <= N <= 40',
      [
        { input: '5', output: '5', explanation: 'Sequence: 0, 1, 1, 2, 3, 5.' },
        { input: '8', output: '21', explanation: 'F(8) = 21.' }
      ]
    ),
    starter_code: makeStarterCode('Recursive fibonacci with memoization array/map'),
    testCases: [
      { input: '5', expected_output: '5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '8', expected_output: '21', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '20', expected_output: '6765', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 153,
    external_problem_id: 'tcs-153',
    title: '153. Calculate sum of array recursively',
    slug: 'tcs-153-sum-of-array-recursively',
    difficulty: 'EASY',
    tags: ['Recursion', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the sum of the array elements computed recursively.',
    constraints: '1 <= N <= 10^4, -10^5 <= arr[i] <= 10^5',
    description: formatDescription(
      'Sum of Array Recursively',
      'Given an array of N integers, compute the sum of all elements using a recursive function.',
      'N on line 1, N space-separated integers on line 2.',
      'Print the total sum.',
      '1 <= N <= 10^4',
      [
        { input: '5\n1 2 3 4 5', output: '15', explanation: '1 + 2 + 3 + 4 + 5 = 15.' },
        { input: '3\n10 -5 20', output: '25', explanation: '10 + (-5) + 20 = 25.' }
      ]
    ),
    starter_code: makeStarterCode('Recursive array sum: sum(arr, n) = n == 0 ? 0 : arr[n-1] + sum(arr, n-1)'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: '15', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n10 -5 20', expected_output: '25', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n99', expected_output: '99', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n0 0 0 0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n-1 -2 -3 -4 -5', expected_output: '-15', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 154,
    external_problem_id: 'tcs-154',
    title: '154. Reverse a string recursively',
    slug: 'tcs-154-reverse-string-recursively',
    difficulty: 'EASY',
    tags: ['Recursion', 'Strings', 'TCS NQT'],
    input_format: 'A single string S without spaces.',
    output_format: 'Print the reversed string obtained via recursion.',
    constraints: '1 <= |S| <= 10^4',
    description: formatDescription(
      'Reverse String Recursively',
      'Reverse a given string S using recursion without using built-in reverse functions.',
      'A single string S.',
      'Print the reversed string.',
      '1 <= |S| <= 10^4',
      [
        { input: 'hello', output: 'olleh', explanation: 'Reverse of hello is olleh.' },
        { input: 'tcs', output: 'sct', explanation: 'Reverse of tcs is sct.' }
      ]
    ),
    starter_code: makeStarterCode('Recursive string reversal: rev(s) = rev(s[1..]) + s[0]'),
    testCases: [
      { input: 'hello', expected_output: 'olleh', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'tcs', expected_output: 'sct', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'a', expected_output: 'a', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'racecar', expected_output: 'racecar', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'recursion', expected_output: 'noisrucer', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 155,
    external_problem_id: 'tcs-155',
    title: '155. Check palindrome recursively',
    slug: 'tcs-155-check-palindrome-recursively',
    difficulty: 'EASY',
    tags: ['Recursion', 'Strings', 'TCS NQT'],
    input_format: 'A single string S.',
    output_format: 'Print "true" if the string is a palindrome, otherwise "false".',
    constraints: '1 <= |S| <= 10^4',
    description: formatDescription(
      'Check Palindrome Recursively',
      'Check whether a string S reads the same backward as forward using recursion.',
      'A single string S.',
      'Print true or false.',
      '1 <= |S| <= 10^4',
      [
        { input: 'racecar', output: 'true', explanation: 'racecar reversed is racecar.' },
        { input: 'hello', output: 'false', explanation: 'hello reversed is olleh.' }
      ]
    ),
    starter_code: makeStarterCode('Recursive palindrome check: isPal(s, l, r)'),
    testCases: [
      { input: 'racecar', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'hello', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'madam', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'a', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'ab', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 156,
    external_problem_id: 'tcs-156',
    title: '156. Generate all subsequences of a string',
    slug: 'tcs-156-generate-all-subsequences-string',
    difficulty: 'MEDIUM',
    tags: ['Recursion', 'Backtracking', 'Strings', 'TCS NQT'],
    input_format: 'A single string S of lowercase letters.',
    output_format: 'Print all non-empty subsequences of S in lexicographical order, space-separated.',
    constraints: '1 <= |S| <= 12',
    description: formatDescription(
      'Generate All Subsequences',
      'Generate all non-empty subsequences of string S using recursion/backtracking and print them separated by space in lexicographical order.',
      'A single string S.',
      'Non-empty subsequences space-separated in lexicographical order.',
      '1 <= |S| <= 12',
      [
        { input: 'abc', output: 'a ab abc ac b bc c', explanation: 'All 7 non-empty subsequences sorted alphabetically.' },
        { input: 'ab', output: 'a ab b', explanation: 'All 3 non-empty subsequences sorted alphabetically.' }
      ]
    ),
    starter_code: makeStarterCode('Backtracking / recursion: include or exclude current character, then sort'),
    testCases: [
      { input: 'abc', expected_output: 'a ab abc ac b bc c', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'ab', expected_output: 'a ab b', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'a', expected_output: 'a', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'ba', expected_output: 'a b ba', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'xyz', expected_output: 'x xy xyz xz y yz z', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 157,
    external_problem_id: 'tcs-157',
    title: '157. Generate all subsets of an array',
    slug: 'tcs-157-generate-all-subsets-array',
    difficulty: 'MEDIUM',
    tags: ['Backtracking', 'Recursion', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N distinct space-separated integers.',
    output_format: 'Print the total number of subsets on the first line, followed by each subset formatted as [x, y] in sorted order on new lines.',
    constraints: '1 <= N <= 10',
    description: formatDescription(
      'Subsets of an Array',
      'Given an array of distinct integers, generate all possible subsets (the power set). Output total count on line 1, then each subset formatted as [e1, e2] in lexicographical order.',
      'N on line 1, N distinct integers on line 2.',
      'Count on line 1, each subset [elements] on subsequent lines.',
      '1 <= N <= 10',
      [
        { input: '3\n1 2 3', output: '8\n[]\n[1]\n[1, 2]\n[1, 2, 3]\n[1, 3]\n[2]\n[2, 3]\n[3]', explanation: 'Total 2^3 = 8 subsets.' },
        { input: '1\n5', output: '2\n[]\n[5]' }
      ]
    ),
    starter_code: makeStarterCode('Backtracking: generate power set, sort elements within subset and sort all subsets'),
    testCases: [
      { input: '3\n1 2 3', expected_output: '8\n[]\n[1]\n[1, 2]\n[1, 2, 3]\n[1, 3]\n[2]\n[2, 3]\n[3]', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n5', expected_output: '2\n[]\n[5]', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\n1 2', expected_output: '4\n[]\n[1]\n[1, 2]\n[2]', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n3 4', expected_output: '4\n[]\n[3]\n[3, 4]\n[4]', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n0 1 2', expected_output: '8\n[]\n[0]\n[0, 1]\n[0, 1, 2]\n[0, 2]\n[1]\n[1, 2]\n[2]', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 158,
    external_problem_id: 'tcs-158',
    title: '158. Generate all permutations of an array',
    slug: 'tcs-158-generate-all-permutations-array',
    difficulty: 'MEDIUM',
    tags: ['Backtracking', 'Recursion', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N distinct integers.',
    output_format: 'Print total number of permutations on line 1, then each permutation space-separated on subsequent lines in lexicographical order.',
    constraints: '1 <= N <= 7',
    description: formatDescription(
      'Permutations of an Array',
      'Given an array of distinct integers, return all possible permutations in lexicographical order.',
      'N on line 1, N distinct integers on line 2.',
      'Count on line 1, each permutation on a new line.',
      '1 <= N <= 7',
      [
        { input: '3\n1 2 3', output: '6\n1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1', explanation: '3! = 6 permutations.' },
        { input: '2\n1 2', output: '2\n1 2\n2 1' }
      ]
    ),
    starter_code: makeStarterCode('Backtracking swap or visited array to generate permutations in lexicographical order'),
    testCases: [
      { input: '3\n1 2 3', expected_output: '6\n1 2 3\n1 3 2\n2 1 3\n2 3 1\n3 1 2\n3 2 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n1 2', expected_output: '2\n1 2\n2 1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n9', expected_output: '1\n9', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n5 9', expected_output: '2\n5 9\n9 5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n1 2 4', expected_output: '6\n1 2 4\n1 4 2\n2 1 4\n2 4 1\n4 1 2\n4 2 1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 159,
    external_problem_id: 'tcs-159',
    title: '159. Generate balanced parentheses',
    slug: 'tcs-159-generate-balanced-parentheses',
    difficulty: 'MEDIUM',
    tags: ['Backtracking', 'Recursion', 'Strings', 'TCS NQT'],
    input_format: 'A single integer N.',
    output_format: 'Print all valid combinations of N pairs of parentheses, each on a new line in lexicographical order.',
    constraints: '1 <= N <= 8',
    description: formatDescription(
      'Generate Parentheses',
      'Given N pairs of parentheses, write a function to generate all combinations of well-formed parentheses in lexicographical order.',
      'Single integer N.',
      'Valid combinations on new lines.',
      '1 <= N <= 8',
      [
        { input: '3', output: '((()))\n(()())\n(())()\n()(())\n()()()', explanation: '5 well-formed parentheses for N = 3.' },
        { input: '1', output: '()' }
      ]
    ),
    starter_code: makeStarterCode('Backtracking: maintain open and close counts: open < n, close < open'),
    testCases: [
      { input: '3', expected_output: '((()))\n(()())\n(())()\n()(())\n()()()', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '()', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2', expected_output: '(())()\n()()', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4', expected_output: '(((())))\n((()()))\n((())())\n((()))()\n(()(()))\n(()()())\n(()())()\n(())(())\n(())()()\n()((()))\n()(()())\n()(())()\n()()(())\n()()()()', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '2', expected_output: '(())()\n()()', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 160,
    external_problem_id: 'tcs-160',
    title: '160. Combination Sum',
    slug: 'tcs-160-combination-sum',
    difficulty: 'MEDIUM',
    tags: ['Backtracking', 'Recursion', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N distinct positive integers.',
    output_format: 'Print total number of combinations on line 1, then each combination space-separated on subsequent lines. If none, print 0.',
    constraints: '1 <= N <= 30, 1 <= Target <= 40',
    description: formatDescription(
      'Combination Sum',
      'Find all unique combinations in candidates where the candidate numbers sum to target. The same number may be chosen unlimited times. Print count then combinations sorted lexicographically.',
      'N Target\nN distinct integers',
      'Count on line 1, each combination on a new line.',
      '1 <= Target <= 40',
      [
        { input: '4 7\n2 3 6 7', output: '2\n2 2 3\n7', explanation: '2+2+3=7 and 7=7.' },
        { input: '3 8\n2 3 5', output: '3\n2 2 2 2\n2 3 3\n3 5' }
      ]
    ),
    starter_code: makeStarterCode('Backtracking with target deduction and recursion with same index'),
    testCases: [
      { input: '4 7\n2 3 6 7', expected_output: '2\n2 2 3\n7', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 8\n2 3 5', expected_output: '3\n2 2 2 2\n2 3 3\n3 5', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 2\n2', expected_output: '1\n2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 3\n4 5', expected_output: '0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 5\n1 2 5', expected_output: '4\n1 1 1 1 1\n1 1 1 2\n1 2 2\n5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 161,
    external_problem_id: 'tcs-161',
    title: '161. Subsets with duplicate elements',
    slug: 'tcs-161-subsets-duplicate-elements',
    difficulty: 'MEDIUM',
    tags: ['Backtracking', 'Recursion', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N integers (may contain duplicates).',
    output_format: 'Print count of unique subsets on line 1, then each subset formatted as [x, y] in sorted order on subsequent lines.',
    constraints: '1 <= N <= 10',
    description: formatDescription(
      'Subsets II (With Duplicates)',
      'Given an integer array that may contain duplicates, return all possible unique subsets. The solution set must not contain duplicate subsets.',
      'N on line 1, N integers on line 2.',
      'Count on line 1, each subset on subsequent lines.',
      '1 <= N <= 10',
      [
        { input: '3\n1 2 2', output: '6\n[]\n[1]\n[1, 2]\n[1, 2, 2]\n[2]\n[2, 2]', explanation: 'Unique subsets for [1, 2, 2].' },
        { input: '1\n0', output: '2\n[]\n[0]' }
      ]
    ),
    starter_code: makeStarterCode('Sort array first, skip duplicate candidates: if (i > start && nums[i] == nums[i-1]) continue;'),
    testCases: [
      { input: '3\n1 2 2', expected_output: '6\n[]\n[1]\n[1, 2]\n[1, 2, 2]\n[2]\n[2, 2]', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n0', expected_output: '2\n[]\n[0]', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\n2 2', expected_output: '3\n[]\n[2]\n[2, 2]', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n1 2', expected_output: '4\n[]\n[1]\n[1, 2]\n[2]', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n4 4 4', expected_output: '4\n[]\n[4]\n[4, 4]\n[4, 4, 4]', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 162,
    external_problem_id: 'tcs-162',
    title: '162. Rat in a Maze',
    slug: 'tcs-162-rat-in-a-maze',
    difficulty: 'MEDIUM',
    tags: ['Backtracking', 'Recursion', 'Matrix', 'TCS NQT'],
    input_format: 'First line contains N. The next N lines each contain N space-separated integers (1 for open, 0 for blocked).',
    output_format: 'Print all possible paths from (0,0) to (N-1,N-1) using directions D, L, R, U in alphabetical order separated by space. If no path, print -1.',
    constraints: '2 <= N <= 5',
    description: formatDescription(
      'Rat in a Maze',
      'Consider a rat placed at (0, 0) in an N x N square matrix. Find all paths that the rat can take to reach destination (N-1, N-1). The rat can move D (down), L (left), R (right), U (up). Value 0 is blocked, 1 is open.',
      'N on line 1, matrix on next N lines.',
      'Alphabetically sorted paths space-separated, or -1.',
      '2 <= N <= 5',
      [
        { input: '4\n1 0 0 0\n1 1 0 1\n0 1 0 0\n1 1 1 1', output: 'DDRDRR DRDDRR', explanation: 'Two valid paths.' },
        { input: '2\n1 0\n1 0', output: '-1', explanation: 'Destination (1,1) is 0 so blocked.' }
      ]
    ),
    starter_code: makeStarterCode('Backtracking DFS with visited array and moves in order D, L, R, U'),
    testCases: [
      { input: '4\n1 0 0 0\n1 1 0 1\n0 1 0 0\n1 1 1 1', expected_output: 'DDRDRR DRDDRR', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n1 0\n1 0', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\n1 1\n1 1', expected_output: 'DR RD', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3\n1 0 0\n0 1 0\n0 0 1', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n1 1 1\n1 1 1\n1 1 1', expected_output: 'DDRR DDRURD DDRUURDD DRDR DRDURD DRDURRDLDR DRRD DRRURDD RDDR RDDURD RDRD RDRURD RRDDRUURDD RRDD RRDLDD RRDLDR', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 163,
    external_problem_id: 'tcs-163',
    title: '163. Word Search in a grid',
    slug: 'tcs-163-word-search-grid',
    difficulty: 'MEDIUM',
    tags: ['Backtracking', 'DFS', 'Matrix', 'TCS NQT'],
    input_format: 'First line contains R and C (rows and columns). Next R lines each contain C space-separated characters. Last line contains the target Word.',
    output_format: 'Print "true" if the word exists in the grid, otherwise "false".',
    constraints: '1 <= R, C <= 6, 1 <= |Word| <= 15',
    description: formatDescription(
      'Word Search in Grid',
      'Given an R x C grid of characters and a word, check if the word exists in the grid. The word can be constructed from sequentially adjacent cells (horizontally or vertically). Same letter cell may not be used more than once.',
      'R C\nR lines with C characters\nWord',
      'true or false',
      '1 <= R, C <= 6',
      [
        { input: '3 4\nA B C E\nS F C S\nA D E E\nABCCED', output: 'true', explanation: 'Path: A-B-C-C-E-D exists.' },
        { input: '3 4\nA B C E\nS F C S\nA D E E\nABCB', output: 'false', explanation: 'Cannot reuse B.' }
      ]
    ),
    starter_code: makeStarterCode('Backtracking DFS from each cell with character matching and backtracking restore'),
    testCases: [
      { input: '3 4\nA B C E\nS F C S\nA D E E\nABCCED', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 4\nA B C E\nS F C S\nA D E E\nABCB', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 1\nA\nA', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 1\nA\nB', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 4\nA B C E\nS F C S\nA D E E\nSEE', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 164,
    external_problem_id: 'tcs-164',
    title: '164. N-Queens',
    slug: 'tcs-164-n-queens-problem',
    difficulty: 'HARD',
    tags: ['Backtracking', 'Recursion', 'TCS NQT'],
    input_format: 'A single integer N.',
    output_format: 'Print the total number of distinct solutions for placing N non-attacking queens on an N x N chessboard.',
    constraints: '1 <= N <= 12',
    description: formatDescription(
      'N-Queens Problem',
      'The N-Queens puzzle is the problem of placing N chess queens on an N x N chessboard so that no two queens attack each other. Print the total count of distinct valid board placements.',
      'Single integer N.',
      'Total number of distinct solutions.',
      '1 <= N <= 12',
      [
        { input: '4', output: '2', explanation: 'There are 2 distinct solutions for 4-queens.' },
        { input: '1', output: '1', explanation: '1 queen on 1x1 board has 1 solution.' }
      ]
    ),
    starter_code: makeStarterCode('Backtracking N-Queens placing row by row, checking column and diagonal conflicts'),
    testCases: [
      { input: '4', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3', expected_output: '0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '8', expected_output: '92', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 165,
    external_problem_id: 'tcs-165',
    title: '165. Sudoku Solver',
    slug: 'tcs-165-sudoku-solver',
    difficulty: 'HARD',
    tags: ['Backtracking', 'Recursion', 'Matrix', 'TCS NQT'],
    input_format: '9 lines, each containing 9 space-separated integers (0 denotes an empty cell).',
    output_format: 'Print the solved 9x9 Sudoku board, 9 lines with 9 space-separated integers.',
    constraints: 'Valid solvable 9x9 Sudoku puzzle with unique solution.',
    description: formatDescription(
      'Sudoku Solver',
      'Write a program to solve a Sudoku puzzle by filling the empty cells (represented by 0). Each digit 1-9 must occur exactly once in each row, each column, and each 3x3 subgrid.',
      '9 lines with 9 numbers.',
      '9 lines with 9 solved numbers.',
      'Standard 9x9 Sudoku',
      [
        {
          input: '3 0 6 5 0 8 4 0 0\n5 2 0 0 0 0 0 0 0\n0 8 7 0 0 0 0 3 1\n0 0 3 0 1 0 0 8 0\n9 0 0 8 6 3 0 0 5\n0 5 0 0 9 0 6 0 0\n1 3 0 0 0 0 2 5 0\n0 0 0 0 0 0 0 7 4\n0 0 5 2 0 6 3 0 0',
          output: '3 1 6 5 7 8 4 9 2\n5 2 9 1 3 4 7 6 8\n4 8 7 6 2 9 5 3 1\n2 6 3 4 1 5 9 8 7\n9 7 4 8 6 3 1 2 5\n8 5 1 7 9 2 6 4 3\n1 3 8 9 4 7 2 5 6\n6 9 2 3 5 1 8 7 4\n7 4 5 2 8 6 3 1 9'
        },
        {
          input: '5 3 0 0 7 0 0 0 0\n6 0 0 1 9 5 0 0 0\n0 9 8 0 0 0 0 6 0\n8 0 0 0 6 0 0 0 3\n4 0 0 8 0 3 0 0 1\n7 0 0 0 2 0 0 0 6\n0 6 0 0 0 0 2 8 0\n0 0 0 4 1 9 0 0 5\n0 0 0 0 8 0 0 7 9',
          output: '5 3 4 6 7 8 9 1 2\n6 7 2 1 9 5 3 4 8\n1 9 8 3 4 2 5 6 7\n8 5 9 7 6 1 4 2 3\n4 2 6 8 5 3 7 9 1\n7 1 3 9 2 4 8 5 6\n9 6 1 5 3 7 2 8 4\n2 8 7 4 1 9 6 3 5\n3 4 5 2 8 6 1 7 9'
        }
      ]
    ),
    starter_code: makeStarterCode('Backtracking Sudoku solver trying digits 1 to 9 with row, column, and 3x3 block check'),
    testCases: [
      {
        input: '3 0 6 5 0 8 4 0 0\n5 2 0 0 0 0 0 0 0\n0 8 7 0 0 0 0 3 1\n0 0 3 0 1 0 0 8 0\n9 0 0 8 6 3 0 0 5\n0 5 0 0 9 0 6 0 0\n1 3 0 0 0 0 2 5 0\n0 0 0 0 0 0 0 7 4\n0 0 5 2 0 6 3 0 0',
        expected_output: '3 1 6 5 7 8 4 9 2\n5 2 9 1 3 4 7 6 8\n4 8 7 6 2 9 5 3 1\n2 6 3 4 1 5 9 8 7\n9 7 4 8 6 3 1 2 5\n8 5 1 7 9 2 6 4 3\n1 3 8 9 4 7 2 5 6\n6 9 2 3 5 1 8 7 4\n7 4 5 2 8 6 3 1 9',
        is_hidden: false,
        sample_name: 'Sample 1'
      },
      {
        input: '5 3 0 0 7 0 0 0 0\n6 0 0 1 9 5 0 0 0\n0 9 8 0 0 0 0 6 0\n8 0 0 0 6 0 0 0 3\n4 0 0 8 0 3 0 0 1\n7 0 0 0 2 0 0 0 6\n0 6 0 0 0 0 2 8 0\n0 0 0 4 1 9 0 0 5\n0 0 0 0 8 0 0 7 9',
        expected_output: '5 3 4 6 7 8 9 1 2\n6 7 2 1 9 5 3 4 8\n1 9 8 3 4 2 5 6 7\n8 5 9 7 6 1 4 2 3\n4 2 6 8 5 3 7 9 1\n7 1 3 9 2 4 8 5 6\n9 6 1 5 3 7 2 8 4\n2 8 7 4 1 9 6 3 5\n3 4 5 2 8 6 1 7 9',
        is_hidden: false,
        sample_name: 'Sample 2'
      },
      {
        input: '0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0\n0 0 0 0 0 0 0 0 0',
        expected_output: '1 2 3 4 5 6 7 8 9\n4 5 6 7 8 9 1 2 3\n7 8 9 1 2 3 4 5 6\n2 1 4 3 6 5 8 9 7\n3 6 5 8 9 7 2 1 4\n8 9 7 2 1 4 3 6 5\n5 3 1 6 4 2 9 7 8\n6 4 2 9 7 8 5 3 1\n9 7 8 5 3 1 6 4 2',
        is_hidden: true,
        sample_name: 'Testcase 3'
      },
      {
        input: '0 2 0 0 0 0 0 0 0\n0 0 0 6 0 0 0 0 3\n0 7 4 0 8 0 0 0 0\n0 0 0 0 0 3 0 0 2\n0 8 0 0 4 0 0 1 0\n6 0 0 5 0 0 0 0 0\n0 0 0 0 1 0 7 8 0\n5 0 0 0 0 9 0 0 0\n0 0 0 0 0 0 0 4 0',
        expected_output: '1 2 6 4 3 7 9 5 8\n8 9 5 6 2 1 4 7 3\n3 7 4 9 8 5 1 2 6\n4 5 7 1 9 3 8 6 2\n9 8 3 2 4 6 5 1 7\n6 1 2 5 7 8 3 9 4\n2 6 9 3 1 4 7 8 5\n5 4 8 7 6 9 2 3 1\n7 3 1 8 5 2 6 4 9',
        is_hidden: true,
        sample_name: 'Testcase 4'
      },
      {
        input: '8 0 0 0 0 0 0 0 0\n0 0 3 6 0 0 0 0 0\n0 7 0 0 9 0 2 0 0\n0 5 0 0 0 7 0 0 0\n0 0 0 0 4 5 7 0 0\n0 0 0 1 0 0 0 3 0\n0 0 1 0 0 0 0 6 8\n0 0 8 5 0 0 0 1 0\n0 9 0 0 0 0 4 0 0',
        expected_output: '8 1 2 7 5 3 6 4 9\n9 4 3 6 8 2 1 7 5\n6 7 5 4 9 1 2 8 3\n1 5 4 2 3 7 8 9 6\n3 6 9 8 4 5 7 2 1\n2 8 7 1 6 9 5 3 4\n5 2 1 9 7 4 3 6 8\n4 3 8 5 2 6 9 1 7\n7 9 6 3 1 8 4 5 2',
        is_hidden: true,
        sample_name: 'Testcase 5'
      }
    ]
  }
];

module.exports = problems;

