// BCE/scripts/tcs-sheet/group6_matrix.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 116,
    external_problem_id: 'tcs-116',
    title: '116. Find sum of all matrix elements',
    slug: 'tcs-116-sum-of-all-matrix-elements',
    difficulty: 'EASY',
    tags: ['Matrix', 'TCS NQT'],
    input_format: 'First line contains R and C (rows and columns). Next R lines contain C space-separated integers each.',
    output_format: 'Print the sum of all elements in the matrix.',
    constraints: '1 <= R, C <= 500',
    description: formatDescription('Sum of Matrix Elements', 'Given an R x C 2D matrix, calculate the sum of all its elements.', 'R C\nR lines with C integers each', 'Total sum', '1 <= R, C <= 500', [{ input: '2 3\n1 2 3\n4 5 6', output: '21' }]),
    starter_code: makeStarterCode('Calculate sum of all elements in R x C matrix'),
    testCases: [
      { input: '2 3\n1 2 3\n4 5 6', expected_output: '21', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 1\n42', expected_output: '42', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 2\n-5 5\n10 -10', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 2\n1 1\n2 2\n3 3', expected_output: '12', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 3\n1 2 3\n4 5 6\n7 8 9', expected_output: '45', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 117,
    external_problem_id: 'tcs-117',
    title: '117. Find row-wise and column-wise sums',
    slug: 'tcs-117-row-wise-column-wise-sums',
    difficulty: 'EASY',
    tags: ['Matrix', 'TCS NQT'],
    input_format: 'First line contains R and C. Next R lines contain C integers each.',
    output_format: 'Line 1: space-separated sum of each row. Line 2: space-separated sum of each column.',
    constraints: '1 <= R, C <= 500',
    description: formatDescription('Row-wise and Column-wise Sums', 'Compute the sum of each row and each column of an R x C matrix.', 'R C\nR lines with C integers', 'Line 1: row sums. Line 2: column sums.', '1 <= R, C <= 500', [{ input: '2 3\n1 2 3\n4 5 6', output: '6 15\n5 7 9' }]),
    starter_code: makeStarterCode('Compute row sums and column sums of matrix'),
    testCases: [
      { input: '2 3\n1 2 3\n4 5 6', expected_output: '6 15\n5 7 9', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 2\n10 20', expected_output: '30\n10 20', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 1\n5\n15', expected_output: '5 15\n20', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 2\n1 1\n1 1', expected_output: '2 2\n2 2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 3\n1 2 3\n4 5 6\n7 8 9', expected_output: '6 15 24\n12 15 18', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 118,
    external_problem_id: 'tcs-118',
    title: '118. Find largest element in each row',
    slug: 'tcs-118-largest-element-in-each-row',
    difficulty: 'EASY',
    tags: ['Matrix', 'TCS NQT'],
    input_format: 'First line contains R and C. Next R lines contain C integers each.',
    output_format: 'Print R space-separated integers, each representing the maximum element of that row.',
    constraints: '1 <= R, C <= 500',
    description: formatDescription('Largest Element in Each Row', 'Given an R x C matrix, find the maximum value in each of the R rows.', 'R C\nR rows with C integers', 'R space-separated row max values', '1 <= R, C <= 500', [{ input: '3 3\n1 2 3\n14 9 7\n18 21 5', output: '3 14 21' }]),
    starter_code: makeStarterCode('Find max element of each row'),
    testCases: [
      { input: '3 3\n1 2 3\n14 9 7\n18 21 5', expected_output: '3 14 21', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2 2\n10 5\n2 8', expected_output: '10 8', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 4\n-1 -5 -2 -10', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 3\n100 200 150\n5 10 2', expected_output: '200 10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 1\n7\n3\n9', expected_output: '7 3 9', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 119,
    external_problem_id: 'tcs-119',
    title: '119. Print primary and secondary diagonals',
    slug: 'tcs-119-print-primary-secondary-diagonals',
    difficulty: 'EASY',
    tags: ['Matrix', 'TCS NQT'],
    input_format: 'First line contains N (square matrix size N x N). Next N lines contain N integers each.',
    output_format: 'Line 1: space-separated primary diagonal (top-left to bottom-right). Line 2: space-separated secondary diagonal (top-right to bottom-left).',
    constraints: '1 <= N <= 500',
    description: formatDescription('Primary and Secondary Diagonals', 'Given an N x N matrix, print its main/primary diagonal (matrix[i][i]) and secondary diagonal (matrix[i][N-1-i]).', 'N\nN x N matrix', 'Line 1: primary diagonal. Line 2: secondary diagonal.', '1 <= N <= 500', [{ input: '3\n1 2 3\n4 5 6\n7 8 9', output: '1 5 9\n3 5 7' }]),
    starter_code: makeStarterCode('Extract and print primary and secondary diagonals'),
    testCases: [
      { input: '3\n1 2 3\n4 5 6\n7 8 9', expected_output: '1 5 9\n3 5 7', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n1 2\n3 4', expected_output: '1 4\n2 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n10', expected_output: '10\n10', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n1 0 0 2\n0 3 4 0\n0 5 6 0\n7 0 0 8', expected_output: '1 3 6 8\n2 4 5 7', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n5 1 2\n3 5 4\n6 7 5', expected_output: '5 5 5\n2 5 6', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 120,
    external_problem_id: 'tcs-120',
    title: '120. Find sum of both diagonals',
    slug: 'tcs-120-sum-of-both-diagonals',
    difficulty: 'EASY',
    tags: ['Matrix', 'TCS NQT'],
    input_format: 'First line contains N. Next N lines contain N integers each.',
    output_format: 'Print the sum of elements on both diagonals. (If N is odd, the center element shared by both is counted only once).',
    constraints: '1 <= N <= 500',
    description: formatDescription('Diagonal Sum (Center Counted Once)', 'Given a square matrix, return the sum of the matrix diagonals. Only include the sum of all the elements on the primary diagonal and all the elements on the secondary diagonal that are not part of the primary diagonal.', 'N\nN x N matrix', 'Total diagonal sum', '1 <= N <= 500', [{ input: '3\n1 2 3\n4 5 6\n7 8 9', output: '25', explanation: 'Diagonals sum: 1 + 5 + 9 + 3 + 7 = 25 (center 5 included once).' }]),
    starter_code: makeStarterCode('Compute diagonal sum counting center once if odd'),
    testCases: [
      { input: '3\n1 2 3\n4 5 6\n7 8 9', expected_output: '25', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n1 1 1 1\n1 1 1 1\n1 1 1 1\n1 1 1 1', expected_output: '8', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n5', expected_output: '5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n1 2\n3 4', expected_output: '10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n2 0 2\n0 2 0\n2 0 2', expected_output: '10', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 121,
    external_problem_id: 'tcs-121',
    title: '121. Transpose a matrix',
    slug: 'tcs-121-transpose-matrix',
    difficulty: 'EASY',
    tags: ['Matrix', 'TCS NQT'],
    input_format: 'First line contains R and C. Next R lines contain C integers each.',
    output_format: 'Print the C x R transposed matrix, with rows space-separated.',
    constraints: '1 <= R, C <= 500',
    description: formatDescription('Transpose of a Matrix', 'Given a 2D matrix of size R x C, compute its transpose where transposed[i][j] = matrix[j][i].', 'R C\nR rows with C integers', 'C rows with R integers', '1 <= R, C <= 500', [{ input: '2 3\n1 2 3\n4 5 6', output: '1 4\n2 5\n3 6' }]),
    starter_code: makeStarterCode('Transpose R x C matrix into C x R'),
    testCases: [
      { input: '2 3\n1 2 3\n4 5 6', expected_output: '1 4\n2 5\n3 6', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2 2\n1 2\n3 4', expected_output: '1 3\n2 4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 3\n1 2 3', expected_output: '1\n2\n3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 1\n1\n2\n3', expected_output: '1 2 3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 3\n1 0 0\n0 1 0\n0 0 1', expected_output: '1 0 0\n0 1 0\n0 0 1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 122,
    external_problem_id: 'tcs-122',
    title: '122. Rotate a square matrix by 90 degrees',
    slug: 'tcs-122-rotate-matrix-90-degrees',
    difficulty: 'MEDIUM',
    tags: ['Matrix', 'TCS NQT'],
    input_format: 'First line contains N. Next N lines contain N integers each.',
    output_format: 'Print the matrix rotated 90 degrees clockwise.',
    constraints: '1 <= N <= 500',
    description: formatDescription('Rotate Image / Matrix by 90 Degrees Clockwise', 'Rotate an N x N 2D matrix by 90 degrees clockwise in-place by first transposing the matrix and then reversing each row.', 'N\nN x N matrix', 'Rotated N x N matrix', '1 <= N <= 500', [{ input: '3\n1 2 3\n4 5 6\n7 8 9', output: '7 4 1\n8 5 2\n9 6 3' }]),
    starter_code: makeStarterCode('Rotate matrix 90 degrees clockwise (transpose + reverse rows)'),
    testCases: [
      { input: '3\n1 2 3\n4 5 6\n7 8 9', expected_output: '7 4 1\n8 5 2\n9 6 3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n1 2\n3 4', expected_output: '3 1\n4 2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n5', expected_output: '5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n5 1 9 11\n2 4 8 10\n13 3 6 7\n15 14 12 16', expected_output: '15 13 2 5\n14 3 4 1\n12 6 8 9\n16 7 10 11', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n0 0 1\n0 1 0\n1 0 0', expected_output: '1 0 0\n0 1 0\n0 0 1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 123,
    external_problem_id: 'tcs-123',
    title: '123. Check whether a matrix is symmetric',
    slug: 'tcs-123-check-matrix-symmetric',
    difficulty: 'EASY',
    tags: ['Matrix', 'TCS NQT'],
    input_format: 'First line contains N. Next N lines contain N integers each.',
    output_format: 'Print "true" if matrix equals its transpose (matrix[i][j] == matrix[j][i]), else "false".',
    constraints: '1 <= N <= 500',
    description: formatDescription('Symmetric Matrix', 'A square matrix is symmetric if it is equal to its transpose.', 'N\nN x N matrix', 'true or false', '1 <= N <= 500', [{ input: '3\n1 2 3\n2 4 5\n3 5 6', output: 'true' }, { input: '2\n1 2\n3 4', output: 'false' }]),
    starter_code: makeStarterCode('Check if matrix[i][j] == matrix[j][i] for all i, j'),
    testCases: [
      { input: '3\n1 2 3\n2 4 5\n3 5 6', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n1 2\n3 4', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n10', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3\n1 0 0\n0 1 0\n0 0 1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n1 2 3\n4 5 6\n7 8 9', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 124,
    external_problem_id: 'tcs-124',
    title: '124. Search in a row-wise and column-wise sorted matrix',
    slug: 'tcs-124-search-row-col-sorted-matrix',
    difficulty: 'MEDIUM',
    tags: ['Matrix', 'Binary Search', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains R, C, and Target. Next R lines contain C integers each (sorted in each row and column).',
    output_format: 'Print "true" if Target is found, otherwise "false" in O(R + C) time.',
    constraints: '1 <= R, C <= 500',
    description: formatDescription('Search a 2D Matrix II', 'Write an efficient algorithm that searches for a value Target in an R x C matrix where each row and column is sorted in ascending order. Start from top-right corner.', 'R C Target\nR rows with C integers', 'true or false', '1 <= R, C <= 500', [{ input: '3 3 5\n1 4 7\n2 5 8\n3 6 9', output: 'true' }, { input: '3 3 20\n1 4 7\n2 5 8\n3 6 9', output: 'false' }]),
    starter_code: makeStarterCode('Search starting from top-right corner in O(R+C) time'),
    testCases: [
      { input: '3 3 5\n1 4 7\n2 5 8\n3 6 9', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 3 20\n1 4 7\n2 5 8\n3 6 9', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 1 1\n1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 2 4\n1 2\n3 4', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 4 11\n1 3 5 7\n10 11 16 20\n23 30 34 50', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 125,
    external_problem_id: 'tcs-125',
    title: '125. Print matrix in spiral order',
    slug: 'tcs-125-spiral-matrix-traversal',
    difficulty: 'MEDIUM',
    tags: ['Matrix', 'TCS NQT'],
    input_format: 'First line contains R and C. Next R lines contain C integers each.',
    output_format: 'Print all matrix elements in spiral order separated by space.',
    constraints: '1 <= R, C <= 500',
    description: formatDescription('Spiral Matrix Traversal', 'Given an R x C matrix, return all elements of the matrix in spiral order (right, down, left, up).', 'R C\nR rows with C integers', 'Space-separated elements in spiral order', '1 <= R, C <= 500', [{ input: '3 3\n1 2 3\n4 5 6\n7 8 9', output: '1 2 3 6 9 8 7 4 5' }]),
    starter_code: makeStarterCode('Traverse matrix with top, bottom, left, right bounds'),
    testCases: [
      { input: '3 3\n1 2 3\n4 5 6\n7 8 9', expected_output: '1 2 3 6 9 8 7 4 5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12', expected_output: '1 2 3 4 8 12 11 10 9 5 6 7', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 3\n1 2 3', expected_output: '1 2 3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 1\n1\n2\n3', expected_output: '1 2 3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '2 2\n1 2\n3 4', expected_output: '1 2 4 3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

