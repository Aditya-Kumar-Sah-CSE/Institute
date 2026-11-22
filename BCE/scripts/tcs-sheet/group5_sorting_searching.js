// BCE/scripts/tcs-sheet/group5_sorting_searching.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 101,
    external_problem_id: 'tcs-101',
    title: '101. Implement linear search',
    slug: 'tcs-101-linear-search',
    difficulty: 'EASY',
    tags: ['Searching', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N integers.',
    output_format: 'Print the 0-based index of the first occurrence of Target. If not found, print -1.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Linear Search', 'Search for Target sequentially from index 0 to N-1.', 'N Target\narr[0] ... arr[N-1]', 'Index of Target or -1', '1 <= N <= 10^5', [{ input: '5 30\n10 20 30 40 50', output: '2' }]),
    starter_code: makeStarterCode('Linear search for target element'),
    testCases: [
      { input: '5 30\n10 20 30 40 50', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 99\n1 2 3 4', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 5\n5', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5 10\n10 20 10 30 10', expected_output: '0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 -5\n-1 -5 -10', expected_output: '1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 102,
    external_problem_id: 'tcs-102',
    title: '102. Implement binary search iteratively',
    slug: 'tcs-102-binary-search-iterative',
    difficulty: 'EASY',
    tags: ['Binary Search', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N sorted integers in ascending order.',
    output_format: 'Print the 0-based index of Target using iterative binary search. If not found, print -1.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Iterative Binary Search', 'Find Target in a sorted array in O(log N) time using low and high pointers.', 'N Target\narr[0] ... arr[N-1]', 'Index or -1', '1 <= N <= 10^5', [{ input: '6 9\n-1 0 3 5 9 12', output: '4' }]),
    starter_code: makeStarterCode('Iterative binary search'),
    testCases: [
      { input: '6 9\n-1 0 3 5 9 12', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '6 2\n-1 0 3 5 9 12', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 4\n4', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 1\n1 3', expected_output: '0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 100\n10 20 30 40 100', expected_output: '4', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 103,
    external_problem_id: 'tcs-103',
    title: '103. Implement binary search recursively',
    slug: 'tcs-103-binary-search-recursive',
    difficulty: 'EASY',
    tags: ['Binary Search', 'Recursion', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N sorted integers.',
    output_format: 'Print 0-based index of Target, or -1 if not found.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Recursive Binary Search', 'Search for Target using recursive binary search divide and conquer.', 'N Target\nN sorted integers', '0-based index or -1', '1 <= N <= 10^5', [{ input: '5 20\n10 20 30 40 50', output: '1' }]),
    starter_code: makeStarterCode('Recursive binary search implementation'),
    testCases: [
      { input: '5 20\n10 20 30 40 50', expected_output: '1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 5\n1 2 3', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4 10\n10 20 30 40', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 40\n10 20 30 40', expected_output: '3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 7\n7', expected_output: '0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 104,
    external_problem_id: 'tcs-104',
    title: '104. Find first and last occurrence of a target',
    slug: 'tcs-104-first-and-last-occurrence',
    difficulty: 'MEDIUM',
    tags: ['Binary Search', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N sorted integers.',
    output_format: 'Print two space-separated integers: first index and last index. If not found, print "-1 -1".',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('First and Last Occurrence of Target', 'Given a sorted array, find the starting and ending position of a given Target value in O(log N) time.', 'N Target\nN sorted integers', 'first_idx last_idx', '1 <= N <= 10^5', [{ input: '6 8\n5 7 7 8 8 10', output: '3 4' }]),
    starter_code: makeStarterCode('Find first and last occurrence using modified binary search'),
    testCases: [
      { input: '6 8\n5 7 7 8 8 10', expected_output: '3 4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '6 6\n5 7 7 8 8 10', expected_output: '-1 -1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 1\n1', expected_output: '0 0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5 2\n2 2 2 2 2', expected_output: '0 4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 3\n1 2 3 4', expected_output: '2 2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 105,
    external_problem_id: 'tcs-105',
    title: '105. Count occurrences of a target in a sorted array',
    slug: 'tcs-105-count-occurrences-in-sorted-array',
    difficulty: 'EASY',
    tags: ['Binary Search', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N sorted integers.',
    output_format: 'Print the total frequency of Target in the sorted array in O(log N) time.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Count Occurrences in Sorted Array', 'Calculate the frequency of Target in a sorted array using (last_idx - first_idx + 1). If not found, print 0.', 'N Target\nN sorted integers', 'Count of occurrences', '1 <= N <= 10^5', [{ input: '7 2\n1 1 2 2 2 2 3', output: '4' }]),
    starter_code: makeStarterCode('Count occurrences of Target in sorted array in O(log N)'),
    testCases: [
      { input: '7 2\n1 1 2 2 2 2 3', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5 4\n1 2 3 5 6', expected_output: '0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4 7\n7 7 7 7', expected_output: '4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 3\n3', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6 1\n1 2 3 4 5 6', expected_output: '1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 106,
    external_problem_id: 'tcs-106',
    title: '106. Find lower_bound and upper_bound positions',
    slug: 'tcs-106-lower-bound-and-upper-bound',
    difficulty: 'MEDIUM',
    tags: ['Binary Search', 'STL', 'TCS NQT'],
    input_format: 'First line contains N and X. Second line contains N sorted integers.',
    output_format: 'Print lower_bound index (first element >= X) and upper_bound index (first element > X) separated by space. If none, index is N.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Lower Bound and Upper Bound', 'Implement C++ STL lower_bound (first index with val >= X) and upper_bound (first index with val > X).', 'N X\nN sorted integers', 'lower_idx upper_idx', '1 <= N <= 10^5', [{ input: '5 3\n1 2 3 3 5', output: '2 4' }]),
    starter_code: makeStarterCode('Compute lower_bound and upper_bound indices'),
    testCases: [
      { input: '5 3\n1 2 3 3 5', expected_output: '2 4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 6\n1 2 3 4', expected_output: '4 4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 0\n1 2 3', expected_output: '0 0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 2\n2 2 2 2', expected_output: '0 4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 4\n1 2 3 5 6', expected_output: '3 3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 107,
    external_problem_id: 'tcs-107',
    title: '107. Implement bubble sort',
    slug: 'tcs-107-bubble-sort',
    difficulty: 'EASY',
    tags: ['Sorting', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N space-separated integers.',
    output_format: 'Print the array sorted in ascending order.',
    constraints: '1 <= N <= 1000',
    description: formatDescription('Bubble Sort', 'Sort an array in ascending order by repeatedly swapping adjacent elements that are out of order.', 'N\nN integers', 'Sorted array', '1 <= N <= 1000', [{ input: '5\n5 1 4 2 8', output: '1 2 4 5 8' }]),
    starter_code: makeStarterCode('Implement bubble sort with early stop optimization'),
    testCases: [
      { input: '5\n5 1 4 2 8', expected_output: '1 2 4 5 8', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n3 2 1', expected_output: '1 2 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n1 2 3 4', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\n10', expected_output: '10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n-2 4 1 -8 0 7', expected_output: '-8 -2 0 1 4 7', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 108,
    external_problem_id: 'tcs-108',
    title: '108. Implement selection sort',
    slug: 'tcs-108-selection-sort',
    difficulty: 'EASY',
    tags: ['Sorting', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N space-separated integers.',
    output_format: 'Print the array sorted in ascending order.',
    constraints: '1 <= N <= 1000',
    description: formatDescription('Selection Sort', 'Repeatedly find the minimum element from the unsorted part and put it at the beginning.', 'N\nN integers', 'Sorted array', '1 <= N <= 1000', [{ input: '5\n64 25 12 22 11', output: '11 12 22 25 64' }]),
    starter_code: makeStarterCode('Implement selection sort'),
    testCases: [
      { input: '5\n64 25 12 22 11', expected_output: '11 12 22 25 64', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n3 1 2', expected_output: '1 2 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n4 3 2 1', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n10 -5', expected_output: '-5 10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n5 5 2 2 0', expected_output: '0 2 2 5 5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 109,
    external_problem_id: 'tcs-109',
    title: '109. Implement insertion sort',
    slug: 'tcs-109-insertion-sort',
    difficulty: 'EASY',
    tags: ['Sorting', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N space-separated integers.',
    output_format: 'Print the array sorted in ascending order.',
    constraints: '1 <= N <= 1000',
    description: formatDescription('Insertion Sort', 'Build the sorted array one item at a time by inserting each element into its proper position.', 'N\nN integers', 'Sorted array', '1 <= N <= 1000', [{ input: '5\n12 11 13 5 6', output: '5 6 11 12 13' }]),
    starter_code: makeStarterCode('Implement insertion sort'),
    testCases: [
      { input: '5\n12 11 13 5 6', expected_output: '5 6 11 12 13', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n3 2 1', expected_output: '1 2 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n42', expected_output: '42', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n1 2 3 4', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n10 -2 0 5 3 -8', expected_output: '-8 -2 0 3 5 10', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 110,
    external_problem_id: 'tcs-110',
    title: '110. Implement merge sort',
    slug: 'tcs-110-merge-sort',
    difficulty: 'MEDIUM',
    tags: ['Sorting', 'Divide and Conquer', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N space-separated integers.',
    output_format: 'Print the array sorted in ascending order in O(N log N) time.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Merge Sort', 'Divide the unsorted list into n sublists and repeatedly merge sublists to produce a new sorted list.', 'N\nN integers', 'Sorted array', '1 <= N <= 10^5', [{ input: '6\n12 11 13 5 6 7', output: '5 6 7 11 12 13' }]),
    starter_code: makeStarterCode('Implement divide and conquer merge sort'),
    testCases: [
      { input: '6\n12 11 13 5 6 7', expected_output: '5 6 7 11 12 13', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n2 1', expected_output: '1 2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '5\n5 4 3 2 1', expected_output: '1 2 3 4 5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n1 3 2 4', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n10 -5 20 -15 0 30', expected_output: '-15 -5 0 10 20 30', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 111,
    external_problem_id: 'tcs-111',
    title: '111. Implement quicksort',
    slug: 'tcs-111-quicksort',
    difficulty: 'MEDIUM',
    tags: ['Sorting', 'Divide and Conquer', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N space-separated integers.',
    output_format: 'Print the sorted array in ascending order.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Quicksort', 'Partition array around a pivot element and recursively sort the left and right sub-arrays in O(N log N) average time.', 'N\nN integers', 'Sorted array', '1 <= N <= 10^5', [{ input: '5\n10 80 30 90 40', output: '10 30 40 80 90' }]),
    starter_code: makeStarterCode('Implement quicksort with Hoare or Lomuto partition'),
    testCases: [
      { input: '5\n10 80 30 90 40', expected_output: '10 30 40 80 90', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n3 2 1', expected_output: '1 2 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n1 2 3 4', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\n100', expected_output: '100', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n5 1 1 2 0 0', expected_output: '0 0 1 1 2 5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 112,
    external_problem_id: 'tcs-112',
    title: '112. Sort an array of 0s, 1s and 2s',
    slug: 'tcs-112-sort-0s-1s-2s-dutch-flag',
    difficulty: 'EASY',
    tags: ['Sorting', 'Two Pointers', 'Dutch National Flag', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N integers (only 0, 1, or 2).',
    output_format: 'Print the sorted array in one pass O(N) time and O(1) space.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Dutch National Flag (Sort 0s, 1s, 2s)', 'Sort an array of 0s, 1s, and 2s in-place in a single pass using three pointers (low, mid, high).', 'N\nN integers in {0, 1, 2}', 'Sorted array', '1 <= N <= 10^5', [{ input: '6\n2 0 2 1 1 0', output: '0 0 1 1 2 2' }]),
    starter_code: makeStarterCode('Sort 0s, 1s, 2s using Dutch National Flag 3-pointer algorithm'),
    testCases: [
      { input: '6\n2 0 2 1 1 0', expected_output: '0 0 1 1 2 2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n2 0 1', expected_output: '0 1 2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n1 1 1 1', expected_output: '1 1 1 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n0 1 2 0 1', expected_output: '0 0 1 1 2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 113,
    external_problem_id: 'tcs-113',
    title: '113. Find kth smallest element',
    slug: 'tcs-113-kth-smallest-element',
    difficulty: 'MEDIUM',
    tags: ['Sorting', 'Heap', 'Quickselect', 'TCS NQT'],
    input_format: 'First line contains N and K. Second line contains N integers.',
    output_format: 'Print the K-th smallest element (1-based index).',
    constraints: '1 <= K <= N <= 10^5',
    description: formatDescription('K-th Smallest Element', 'Find the K-th smallest element in an unsorted array using Quickselect or Max-Heap.', 'N K\nN integers', 'K-th smallest integer', '1 <= K <= N <= 10^5', [{ input: '6 3\n7 10 4 3 20 15', output: '7', explanation: 'Sorted: [3, 4, 7, 10, 15, 20]. 3rd smallest is 7.' }]),
    starter_code: makeStarterCode('Find K-th smallest element using heap or quickselect'),
    testCases: [
      { input: '6 3\n7 10 4 3 20 15', expected_output: '7', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5 1\n7 10 4 20 15', expected_output: '4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '5 5\n1 2 3 4 5', expected_output: '5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 1\n100', expected_output: '100', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6 4\n12 3 5 7 19 2', expected_output: '7', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 114,
    external_problem_id: 'tcs-114',
    title: '114. Find kth largest element',
    slug: 'tcs-114-kth-largest-element',
    difficulty: 'MEDIUM',
    tags: ['Sorting', 'Heap', 'Quickselect', 'TCS NQT'],
    input_format: 'First line contains N and K. Second line contains N integers.',
    output_format: 'Print the K-th largest element.',
    constraints: '1 <= K <= N <= 10^5',
    description: formatDescription('K-th Largest Element', 'Find the K-th largest element in an array using a Min-Heap of size K or Quickselect.', 'N K\nN integers', 'K-th largest integer', '1 <= K <= N <= 10^5', [{ input: '6 2\n3 2 1 5 6 4', output: '5' }]),
    starter_code: makeStarterCode('Find K-th largest element using min-heap of size K'),
    testCases: [
      { input: '6 2\n3 2 1 5 6 4', expected_output: '5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '9 4\n3 2 3 1 2 4 5 5 6', expected_output: '4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 1\n99', expected_output: '99', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5 1\n1 2 3 4 5', expected_output: '5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 5\n10 20 30 40 50', expected_output: '10', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 115,
    external_problem_id: 'tcs-115',
    title: '115. Search in a rotated sorted array',
    slug: 'tcs-115-search-in-rotated-sorted-array',
    difficulty: 'MEDIUM',
    tags: ['Binary Search', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N integers (rotated sorted array with distinct values).',
    output_format: 'Print 0-based index of Target, or -1 if not found.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Search in Rotated Sorted Array', 'An array sorted in ascending order is rotated at an unknown pivot. Find Target in O(log N) time using modified binary search.', 'N Target\nN rotated integers', 'Index of Target or -1', '1 <= N <= 10^5', [{ input: '7 0\n4 5 6 7 0 1 2', output: '4' }, { input: '7 3\n4 5 6 7 0 1 2', output: '-1' }]),
    starter_code: makeStarterCode('Modified binary search for rotated sorted array'),
    testCases: [
      { input: '7 0\n4 5 6 7 0 1 2', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '7 3\n4 5 6 7 0 1 2', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 0\n0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 1\n3 1 2', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 5\n3 4 5 1 2', expected_output: '2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

