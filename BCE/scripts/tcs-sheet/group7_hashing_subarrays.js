// BCE/scripts/tcs-sheet/group7_hashing_subarrays.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 126,
    external_problem_id: 'tcs-126',
    title: '126. Build a frequency map for an array',
    slug: 'tcs-126-frequency-map-for-array',
    difficulty: 'EASY',
    tags: ['Hashing', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N space-separated integers.',
    output_format: 'Print distinct elements sorted in ascending numerical order with their frequencies formatted as "element -> count" on separate lines.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Frequency Map of Array', 'Build a hash map to count occurrences of each number in the array and print them in ascending numerical order.', 'N\nN integers', 'Lines of "element -> count" sorted', '1 <= N <= 10^5', [{ input: '6\n2 3 2 4 3 2', output: '2 -> 3\n3 -> 2\n4 -> 1' }]),
    starter_code: makeStarterCode('Count frequencies and print sorted'),
    testCases: [
      { input: '6\n2 3 2 4 3 2', expected_output: '2 -> 3\n3 -> 2\n4 -> 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n1 1 1 1', expected_output: '1 -> 4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n5 2 8', expected_output: '2 -> 1\n5 -> 1\n8 -> 1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\n42', expected_output: '42 -> 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n-1 -2 -1 0 0', expected_output: '-2 -> 1\n-1 -> 2\n0 -> 2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 127,
    external_problem_id: 'tcs-127',
    title: '127. Find two-sum using a hash map',
    slug: 'tcs-127-two-sum-hash-map',
    difficulty: 'EASY',
    tags: ['Hashing', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N integers.',
    output_format: 'Print the 0-based indices of the two numbers such that they add up to Target (first_index second_index). If none, print "-1 -1".',
    constraints: '2 <= N <= 10^5',
    description: formatDescription('Two Sum using Hash Map', 'Given an array and target, return indices of two numbers adding up to target in O(N) time using an unordered_map.', 'N Target\nN integers', 'idx1 idx2', '2 <= N <= 10^5', [{ input: '4 9\n2 7 11 15', output: '0 1' }]),
    starter_code: makeStarterCode('Find two sum indices using hash map'),
    testCases: [
      { input: '4 9\n2 7 11 15', expected_output: '0 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 6\n3 2 4', expected_output: '1 2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 6\n3 3', expected_output: '0 1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 10\n1 2 3', expected_output: '-1 -1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 0\n-5 1 2 5 8', expected_output: '0 3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 128,
    external_problem_id: 'tcs-128',
    title: '128. Find the majority element',
    slug: 'tcs-128-majority-element',
    difficulty: 'EASY',
    tags: ['Hashing', 'Boyer-Moore Voting', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N integers.',
    output_format: 'Print the element that appears more than floor(N/2) times. If none, print -1.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription("Majority Element (Boyer-Moore's Voting Algorithm)", 'Find the majority element which appears more than N/2 times in O(N) time and O(1) extra space.', 'N\nN integers', 'Majority element or -1', '1 <= N <= 10^5', [{ input: '7\n2 2 1 1 1 2 2', output: '2' }]),
    starter_code: makeStarterCode('Boyer-Moore voting algorithm to find element appearing > N/2 times'),
    testCases: [
      { input: '7\n2 2 1 1 1 2 2', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n3 2 3', expected_output: '3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n1 2 3 4', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\n10', expected_output: '10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n5 5 5 1 2', expected_output: '5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 129,
    external_problem_id: 'tcs-129',
    title: '129. Find elements occurring more than N/3 times',
    slug: 'tcs-129-elements-occurring-more-than-n-3-times',
    difficulty: 'MEDIUM',
    tags: ['Hashing', 'Boyer-Moore Voting', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N integers.',
    output_format: 'Print all elements occurring strictly more than floor(N/3) times in sorted order. If none, print -1.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Majority Element II (> N/3 times)', 'Find all elements that appear more than floor(N/3) times in the array (at most 2 elements can satisfy this).', 'N\nN integers', 'Sorted elements or -1', '1 <= N <= 10^5', [{ input: '8\n3 2 3 1 2 3 2 3', output: '3' }, { input: '4\n1 1 2 2', output: '1 2' }]),
    starter_code: makeStarterCode('Extended Boyer-Moore voting algorithm for > N/3 majority'),
    testCases: [
      { input: '8\n3 2 3 1 2 3 2 3', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n1 1 2 2', expected_output: '1 2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n1 2 3', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n1 2', expected_output: '1 2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n1 1 1 2 2 2', expected_output: '1 2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 130,
    external_problem_id: 'tcs-130',
    title: '130. Find the longest subarray with sum K (positive values)',
    slug: 'tcs-130-longest-subarray-sum-k-positives',
    difficulty: 'MEDIUM',
    tags: ['Subarrays', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and K. Second line contains N positive integers.',
    output_format: 'Print the maximum length of a subarray whose sum equals K. If none, print 0.',
    constraints: '1 <= N <= 10^5, arr[i] > 0, K > 0',
    description: formatDescription('Longest Subarray with Sum K (All Positives)', 'Given an array containing only positive integers and a target sum K, find the length of the longest subarray with sum equal to K using two pointers / sliding window in O(N).', 'N K\nN positive integers', 'Max length of subarray or 0', '1 <= N <= 10^5', [{ input: '5 5\n2 3 5 1 9', output: '2', explanation: '[2, 3] has length 2 and sum 5.' }]),
    starter_code: makeStarterCode('Two pointers sliding window for sum K on positive numbers'),
    testCases: [
      { input: '5 5\n2 3 5 1 9', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 5\n1 2 3', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4 10\n1 2 3 4', expected_output: '4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 100\n1 2 3', expected_output: '0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6 7\n1 2 1 2 1 3', expected_output: '4', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 131,
    external_problem_id: 'tcs-131',
    title: '131. Find the longest subarray with sum K (including negatives)',
    slug: 'tcs-131-longest-subarray-sum-k-with-negatives',
    difficulty: 'MEDIUM',
    tags: ['Subarrays', 'Prefix Sum', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains N and K. Second line contains N integers (can include negatives).',
    output_format: 'Print the maximum length of subarray with sum K. If none, print 0.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Longest Subarray with Sum K (With Negatives)', 'Find the length of the longest subarray having sum K using prefix sums and a hash map in O(N) time.', 'N K\nN integers', 'Max length or 0', '1 <= N <= 10^5', [{ input: '6 0\n-1 2 -3 1 2 -1', output: '4', explanation: '[2, -3, 1, 2, -1] -> [-3, 1, 2] has sum 0, length 4 [2, -3, 1, -1...]' }]),
    starter_code: makeStarterCode('Prefix sum hash map to store first occurrence of prefix sum'),
    testCases: [
      { input: '6 0\n-1 2 -3 1 2 -1', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 5\n1 4 5', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4 0\n1 2 -3 0', expected_output: '4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5 3\n1 -1 5 -2 3', expected_output: '4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 10\n1 2 3', expected_output: '0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 132,
    external_problem_id: 'tcs-132',
    title: '132. Count subarrays with sum K',
    slug: 'tcs-132-count-subarrays-with-sum-k',
    difficulty: 'MEDIUM',
    tags: ['Subarrays', 'Prefix Sum', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains N and K. Second line contains N integers.',
    output_format: 'Print the total number of continuous subarrays whose sum equals K.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Subarray Sum Equals K', 'Given an array of integers and an integer K, return the total number of subarrays whose sum equals to K using prefix sum frequency map.', 'N K\nN integers', 'Count of subarrays', '1 <= N <= 10^5', [{ input: '3 2\n1 1 1', output: '2', explanation: '[1,1] at index (0,1) and index (1,2).' }]),
    starter_code: makeStarterCode('Prefix sum count frequency map for sum K'),
    testCases: [
      { input: '3 2\n1 1 1', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 3\n1 2 3', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4 0\n0 0 0 0', expected_output: '10', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5 7\n3 4 7 2 -3', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 10\n1 2 3', expected_output: '0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 133,
    external_problem_id: 'tcs-133',
    title: '133. Find the maximum length subarray with equal 0s and 1s',
    slug: 'tcs-133-max-len-subarray-equal-0s-and-1s',
    difficulty: 'MEDIUM',
    tags: ['Subarrays', 'Prefix Sum', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N binary integers (0 and 1).',
    output_format: 'Print the maximum length of a contiguous subarray with an equal number of 0 and 1.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Contiguous Array (Equal 0s and 1s)', 'Given a binary array nums, find the maximum length of a contiguous subarray with equal 0s and 1s. Treat 0 as -1 and find longest subarray with sum 0.', 'N\nN binary integers', 'Max length', '1 <= N <= 10^5', [{ input: '4\n0 1 0 1', output: '4' }, { input: '2\n0 1', output: '2' }]),
    starter_code: makeStarterCode('Replace 0 with -1 and find longest subarray with sum 0'),
    testCases: [
      { input: '4\n0 1 0 1', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n0 1', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n0 0 0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '6\n0 0 1 0 1 1', expected_output: '6', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n0 1 1 0 1', expected_output: '4', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 134,
    external_problem_id: 'tcs-134',
    title: '134. Find the count of distinct elements in every window',
    slug: 'tcs-134-distinct-elements-in-every-window',
    difficulty: 'MEDIUM',
    tags: ['Sliding Window', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains N and K (window size). Second line contains N integers.',
    output_format: 'Print the count of distinct elements in each sliding window of size K separated by space.',
    constraints: '1 <= K <= N <= 10^5',
    description: formatDescription('Count Distinct Elements in Every Window', 'Given an array of size N and an integer K, count the number of distinct elements in every window of size K using a sliding window and hash map.', 'N K\nN integers', 'Space-separated counts for each window of size K', '1 <= K <= N <= 10^5', [{ input: '7 4\n1 2 1 3 4 2 3', output: '3 4 4 3', explanation: '[1,2,1,3]->3 distinct, [2,1,3,4]->4 distinct, [1,3,4,2]->4 distinct, [3,4,2,3]->3 distinct' }]),
    starter_code: makeStarterCode('Sliding window with frequency map to track distinct elements in window K'),
    testCases: [
      { input: '7 4\n1 2 1 3 4 2 3', expected_output: '3 4 4 3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5 3\n1 2 4 4 5', expected_output: '3 2 2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 1\n1 2 3', expected_output: '1 1 1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 4\n1 1 1 1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6 3\n2 1 2 3 2 1', expected_output: '2 3 2 3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 135,
    external_problem_id: 'tcs-135',
    title: '135. Find the longest consecutive sequence',
    slug: 'tcs-135-longest-consecutive-sequence',
    difficulty: 'MEDIUM',
    tags: ['Hashing', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the length of the longest consecutive elements sequence in O(N) time.',
    constraints: '0 <= N <= 10^5',
    description: formatDescription('Longest Consecutive Sequence', 'Given an unsorted array of integers, find the length of the longest consecutive elements sequence in O(N) time using an unordered_set.', 'N\nN integers', 'Length of longest consecutive sequence', '0 <= N <= 10^5', [{ input: '6\n100 4 200 1 3 2', output: '4', explanation: 'Consecutive sequence: [1, 2, 3, 4], length = 4.' }]),
    starter_code: makeStarterCode('Insert all into hash set, check if num-1 not present, then count sequence'),
    testCases: [
      { input: '6\n100 4 200 1 3 2', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '10\n0 3 7 2 5 8 4 6 0 1', expected_output: '9', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0\n', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\n5', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n10 20 30 40 50', expected_output: '1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

