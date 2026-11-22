// BCE/scripts/tcs-sheet/group8_two_pointers_sliding.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 136,
    external_problem_id: 'tcs-136',
    title: '136. Pair sum in a sorted array using two pointers',
    slug: 'tcs-136-pair-sum-sorted-array-two-pointers',
    difficulty: 'EASY',
    tags: ['Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N sorted integers.',
    output_format: 'Print "true" if there exists a pair with sum Target, else "false".',
    constraints: '2 <= N <= 10^5',
    description: formatDescription('Pair Sum in Sorted Array', 'Use two pointers (one at start, one at end) to find if any pair sums to Target in O(N) time.', 'N Target\nN sorted integers', 'true or false', '2 <= N <= 10^5', [{ input: '5 9\n1 2 4 7 11', output: 'true', explanation: '2 + 7 = 9' }]),
    starter_code: makeStarterCode('Two pointer check for pair sum in sorted array'),
    testCases: [
      { input: '5 9\n1 2 4 7 11', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 10\n1 2 3 4', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 5\n2 3', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 0\n-5 0 5', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 100\n10 20 30 40 50', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 137,
    external_problem_id: 'tcs-137',
    title: '137. Remove duplicates from a sorted array in-place',
    slug: 'tcs-137-remove-duplicates-two-pointers',
    difficulty: 'EASY',
    tags: ['Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N sorted integers.',
    output_format: 'Print the length of array after removing duplicates, followed on the next line by the unique elements.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Remove Duplicates in-place (Two Pointers)', 'Remove duplicates in-place using slow and fast pointers. Output unique count followed by the unique array.', 'N\nN sorted integers', 'Length on line 1, unique elements on line 2', '1 <= N <= 10^5', [{ input: '5\n1 1 2 2 3', output: '3\n1 2 3' }]),
    starter_code: makeStarterCode('Two pointers slow/fast in-place deduplication'),
    testCases: [
      { input: '5\n1 1 2 2 3', expected_output: '3\n1 2 3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n1 2 3', expected_output: '3\n1 2 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n2 2 2 2', expected_output: '1\n2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\n5', expected_output: '1\n5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n-3 -3 0 1 1 5', expected_output: '4\n-3 0 1 5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 138,
    external_problem_id: 'tcs-138',
    title: '138. Container with most water',
    slug: 'tcs-138-container-with-most-water',
    difficulty: 'MEDIUM',
    tags: ['Two Pointers', 'Greedy', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N space-separated integers (heights).',
    output_format: 'Print the maximum amount of water a container can store.',
    constraints: '2 <= N <= 10^5, height[i] >= 0',
    description: formatDescription('Container With Most Water', 'Given N non-negative integers representing vertical lines, find two lines that together with the x-axis form a container containing the most water. Maximize area = min(height[l], height[r]) * (r - l).', 'N\nN heights', 'Max area', '2 <= N <= 10^5', [{ input: '9\n1 8 6 2 5 4 8 3 7', output: '49' }]),
    starter_code: makeStarterCode('Two pointers converging from ends moving smaller height'),
    testCases: [
      { input: '9\n1 8 6 2 5 4 8 3 7', expected_output: '49', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n1 1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n4 3 2 1', expected_output: '4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3\n1 2 1', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n2 3 4 5 18 17 6', expected_output: '17', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 139,
    external_problem_id: 'tcs-139',
    title: '139. Three-sum',
    slug: 'tcs-139-three-sum-zero',
    difficulty: 'MEDIUM',
    tags: ['Two Pointers', 'Sorting', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N space-separated integers.',
    output_format: 'Print all unique triplets [a, b, c] such that a + b + c == 0, one triplet per line space-separated in sorted order. If none, print -1.',
    constraints: '3 <= N <= 3000',
    description: formatDescription('3Sum (Unique Triplets Summing to 0)', 'Given an integer array nums, return all the unique triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0 in O(N^2) time.', 'N\nN integers', 'Triplets line by line or -1', '3 <= N <= 3000', [{ input: '6\n-1 0 1 2 -1 -4', output: '-1 -1 2\n-1 0 1' }]),
    starter_code: makeStarterCode('Sort array and use two pointers for each fixed element'),
    testCases: [
      { input: '6\n-1 0 1 2 -1 -4', expected_output: '-1 -1 2\n-1 0 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n0 1 1', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n0 0 0', expected_output: '0 0 0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n-2 0 1 1', expected_output: '-2 1 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n-5 2 3 -2 0', expected_output: '-5 2 3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 140,
    external_problem_id: 'tcs-140',
    title: '140. Four-sum',
    slug: 'tcs-140-four-sum',
    difficulty: 'MEDIUM',
    tags: ['Two Pointers', 'Sorting', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N integers.',
    output_format: 'Print "true" if any 4 numbers sum up to Target, else "false".',
    constraints: '4 <= N <= 1000',
    description: formatDescription('4Sum Check', 'Determine whether there exist 4 distinct elements whose sum equals Target in O(N^3) or O(N^2 log N) time.', 'N Target\nN integers', 'true or false', '4 <= N <= 1000', [{ input: '6 0\n1 0 -1 0 -2 2', output: 'true', explanation: '-2 + -1 + 1 + 2 = 0' }]),
    starter_code: makeStarterCode('Two pointer 4-sum check with sorting'),
    testCases: [
      { input: '6 0\n1 0 -1 0 -2 2', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5 8\n2 2 2 2 2', expected_output: 'true', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4 10\n1 2 3 4', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 100\n1 2 3 4', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 -1\n-5 1 2 1 1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 141,
    external_problem_id: 'tcs-141',
    title: '141. Sort an array containing negative, zero and positive values',
    slug: 'tcs-141-sort-negatives-zeroes-positives',
    difficulty: 'EASY',
    tags: ['Two Pointers', 'Sorting', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N space-separated integers.',
    output_format: 'Print array with all negative elements first, then zeroes, then positive elements, preserving ascending sorted order.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription('Sort Negatives, Zeroes, Positives', 'Sort an array of negative, zero, and positive numbers in non-decreasing order.', 'N\nN integers', 'Sorted array', '1 <= N <= 10^5', [{ input: '6\n0 -1 2 -3 1 0', output: '-3 -1 0 0 1 2' }]),
    starter_code: makeStarterCode('Sort array in non-decreasing order'),
    testCases: [
      { input: '6\n0 -1 2 -3 1 0', expected_output: '-3 -1 0 0 1 2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n-5 0 5', expected_output: '-5 0 5', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n0 0 0 0', expected_output: '0 0 0 0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n10 -10 20 -20 0', expected_output: '-20 -10 0 10 20', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '2\n1 -1', expected_output: '-1 1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 142,
    external_problem_id: 'tcs-142',
    title: '142. Maximum sum subarray of size K',
    slug: 'tcs-142-max-sum-subarray-size-k',
    difficulty: 'EASY',
    tags: ['Sliding Window', 'TCS NQT'],
    input_format: 'First line contains N and K. Second line contains N integers.',
    output_format: 'Print the maximum sum among all contiguous subarrays of size K.',
    constraints: '1 <= K <= N <= 10^5',
    description: formatDescription('Maximum Sum Subarray of Size K', 'Given an array of integers and a number K, find the maximum sum of any contiguous subarray of size K using sliding window in O(N) time.', 'N K\nN integers', 'Maximum window sum', '1 <= K <= N <= 10^5', [{ input: '4 2\n100 200 300 400', output: '700', explanation: '[300, 400] has sum 700.' }]),
    starter_code: makeStarterCode('Sliding window sum of fixed size K'),
    testCases: [
      { input: '4 2\n100 200 300 400', expected_output: '700', is_hidden: false, sample_name: 'Sample 1' },
      { input: '6 3\n1 4 2 10 23 3', expected_output: '39', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 1\n5 10 2', expected_output: '10', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5 5\n1 2 3 4 5', expected_output: '15', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 2\n-1 -2 -3 -4 -5', expected_output: '-3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 143,
    external_problem_id: 'tcs-143',
    title: '143. First negative number in every window of size K',
    slug: 'tcs-143-first-negative-in-window-k',
    difficulty: 'MEDIUM',
    tags: ['Sliding Window', 'Queue', 'TCS NQT'],
    input_format: 'First line contains N and K. Second line contains N integers.',
    output_format: 'Print the first negative integer for each window of size K. If a window does not contain a negative integer, print 0.',
    constraints: '1 <= K <= N <= 10^5',
    description: formatDescription('First Negative Integer in Every Window of Size K', 'Given an array and a positive integer K, find the first negative integer for each and every contiguous window of size K using a queue.', 'N K\nN integers', 'Space-separated first negative numbers', '1 <= K <= N <= 10^5', [{ input: '5 2\n-1 2 -3 4 5', output: '-1 -3 -3 0' }]),
    starter_code: makeStarterCode('Queue sliding window for first negative integer'),
    testCases: [
      { input: '5 2\n-1 2 -3 4 5', expected_output: '-1 -3 -3 0', is_hidden: false, sample_name: 'Sample 1' },
      { input: '8 3\n12 -1 -7 8 -15 30 16 28', expected_output: '-1 -1 -7 -15 -15 0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 1\n1 -1 2', expected_output: '0 -1 0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 2\n1 2 3 4', expected_output: '0 0 0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 4\n-1 -2 -3 -4', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 144,
    external_problem_id: 'tcs-144',
    title: '144. Longest substring with at most K distinct characters',
    slug: 'tcs-144-longest-substring-at-most-k-distinct',
    difficulty: 'MEDIUM',
    tags: ['Sliding Window', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains string S. Second line contains integer K.',
    output_format: 'Print the maximum length of substring containing at most K distinct characters.',
    constraints: '1 <= |S| <= 10^5, K >= 0',
    description: formatDescription('Longest Substring with At Most K Distinct Characters', 'Given a string S and an integer K, find the length of the longest substring that contains at most K distinct characters.', 'String S\nInteger K', 'Max length', '1 <= |S| <= 10^5', [{ input: 'eceba\n2', output: '3', explanation: '"ece" has length 3 and 2 distinct chars (e, c).' }]),
    starter_code: makeStarterCode('Sliding window with character frequency map for <= K distinct'),
    testCases: [
      { input: 'eceba\n2', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'aa\n1', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'abaccc\n2', expected_output: '4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'abcdef\n1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'aabacbebebe\n3', expected_output: '7', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 145,
    external_problem_id: 'tcs-145',
    title: '145. Minimum size subarray sum',
    slug: 'tcs-145-min-size-subarray-sum',
    difficulty: 'MEDIUM',
    tags: ['Sliding Window', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N positive integers.',
    output_format: 'Print the minimal length of a contiguous subarray of which the sum is >= Target. If none, print 0.',
    constraints: '1 <= N <= 10^5, Target >= 1, arr[i] >= 1',
    description: formatDescription('Minimum Size Subarray Sum', 'Given an array of positive integers nums and a positive integer Target, return the minimal length of a contiguous subarray whose sum is greater than or equal to Target. If none, return 0.', 'N Target\nN positive integers', 'Minimum length or 0', '1 <= N <= 10^5', [{ input: '6 7\n2 3 1 2 4 3', output: '2', explanation: '[4, 3] has min length 2 with sum >= 7.' }]),
    starter_code: makeStarterCode('Sliding window expand right and contract left for sum >= Target'),
    testCases: [
      { input: '6 7\n2 3 1 2 4 3', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 4\n1 4 4', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '5 11\n1 1 1 1 1', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 5\n5', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 15\n1 2 3 4 5', expected_output: '5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 146,
    external_problem_id: 'tcs-146',
    title: '146. Longest repeating character replacement',
    slug: 'tcs-146-longest-repeating-character-replacement',
    difficulty: 'MEDIUM',
    tags: ['Sliding Window', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains string S (uppercase English letters). Second line contains integer K.',
    output_format: 'Print the length of the longest substring containing the same letter you can get after at most K replacements.',
    constraints: '1 <= |S| <= 10^5, 0 <= K <= |S|',
    description: formatDescription('Longest Repeating Character Replacement', 'You can choose any character of S and change it to any other uppercase letter at most K times. Find length of longest substring with identical letters.', 'String S\nInteger K', 'Max length', '1 <= |S| <= 10^5', [{ input: 'ABAB\n2', output: '4', explanation: 'Replace the two "A"s with "B"s or vice versa.' }]),
    starter_code: makeStarterCode('Sliding window tracking max frequency in window: (len - maxCount <= k)'),
    testCases: [
      { input: 'ABAB\n2', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'AABABBA\n1', expected_output: '4', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'AAAA\n2', expected_output: '4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'ABBB\n0', expected_output: '3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'ABCDE\n1', expected_output: '2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 147,
    external_problem_id: 'tcs-147',
    title: '147. Permutation / anagram check in a sliding window',
    slug: 'tcs-147-permutation-in-string-sliding-window',
    difficulty: 'MEDIUM',
    tags: ['Sliding Window', 'Hashing', 'TCS NQT'],
    input_format: 'Two space-separated strings S1 and S2.',
    output_format: 'Print "true" if S2 contains a permutation of S1 as a substring, otherwise "false".',
    constraints: '1 <= |S1|, |S2| <= 10^5',
    description: formatDescription('Permutation in String', 'Given two strings S1 and S2, return true if S2 contains a permutation of S1, or false otherwise using a fixed window of size |S1|.', 'Two strings S1 and S2', 'true or false', '1 <= |S1|, |S2| <= 10^5', [{ input: 'ab eidbaooo', output: 'true', explanation: 'S2 contains "ba" which is a permutation of S1.' }]),
    starter_code: makeStarterCode('Fixed size sliding window comparing character counts'),
    testCases: [
      { input: 'ab eidbaooo', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'ab eidboaoo', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'adc dcda', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'hello ooolleoooleh', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'a a', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 148,
    external_problem_id: 'tcs-148',
    title: '148. Maximum of all subarrays of size K',
    slug: 'tcs-148-sliding-window-maximum',
    difficulty: 'HARD',
    tags: ['Sliding Window', 'Monotonic Queue', 'Deque', 'TCS NQT'],
    input_format: 'First line contains N and K. Second line contains N integers.',
    output_format: 'Print the maximum element of each sliding window of size K separated by spaces.',
    constraints: '1 <= K <= N <= 10^5',
    description: formatDescription('Sliding Window Maximum (Monotonic Deque)', 'Given an array of integers and a sliding window of size K, find the maximum in each window in O(N) using a double-ended queue (deque).', 'N K\nN integers', 'Space-separated maximums', '1 <= K <= N <= 10^5', [{ input: '8 3\n1 3 -1 -3 5 3 6 7', output: '3 3 5 5 6 7' }]),
    starter_code: makeStarterCode('Monotonic decreasing deque to maintain window max in O(N)'),
    testCases: [
      { input: '8 3\n1 3 -1 -3 5 3 6 7', expected_output: '3 3 5 5 6 7', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 1\n1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4 2\n4 3 2 1', expected_output: '4 3 2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 2\n1 2 3 4', expected_output: '2 3 4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 3\n9 10 9 -7 -4', expected_output: '10 10 9', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 149,
    external_problem_id: 'tcs-149',
    title: '149. Count subarrays with exactly K distinct integers',
    slug: 'tcs-149-subarrays-with-k-different-integers',
    difficulty: 'HARD',
    tags: ['Sliding Window', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and K. Second line contains N integers.',
    output_format: 'Print the count of good subarrays that have exactly K different integers.',
    constraints: '1 <= K <= N <= 5 * 10^4',
    description: formatDescription('Subarrays with K Different Integers', 'Given an array of integers, count the number of subarrays with exactly K different integers using: atMost(K) - atMost(K - 1).', 'N K\nN integers', 'Count of subarrays', '1 <= K <= N <= 5 * 10^4', [{ input: '5 2\n1 2 1 2 3', output: '7' }]),
    starter_code: makeStarterCode('Compute atMost(k) - atMost(k - 1) using sliding window'),
    testCases: [
      { input: '5 2\n1 2 1 2 3', expected_output: '7', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5 3\n1 2 1 3 4', expected_output: '3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 1\n1 1 1', expected_output: '6', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 2\n1 2 3 4', expected_output: '3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 4\n1 2 3 4', expected_output: '1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 150,
    external_problem_id: 'tcs-150',
    title: '150. Minimum window substring',
    slug: 'tcs-150-minimum-window-substring',
    difficulty: 'HARD',
    tags: ['Sliding Window', 'Hashing', 'Two Pointers', 'TCS NQT'],
    input_format: 'Two space-separated strings S and T.',
    output_format: 'Print the minimum window substring of S such that every character in T (including duplicates) is included. If no such substring, print "".',
    constraints: '1 <= |S|, |T| <= 10^5',
    description: formatDescription('Minimum Window Substring', 'Find the minimum window in S containing all characters of T using sliding window with matched count in O(|S| + |T|) time.', 'Two strings S and T', 'Shortest window substring or ""', '1 <= |S|, |T| <= 10^5', [{ input: 'ADOBECODEBANC ABC', output: 'BANC' }]),
    starter_code: makeStarterCode('Sliding window with character requirement tracking map'),
    testCases: [
      { input: 'ADOBECODEBANC ABC', expected_output: 'BANC', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'a a', expected_output: 'a', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'a aa', expected_output: '', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'ab a', expected_output: 'a', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'timetopractice toc', expected_output: 'toprac', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

