// BCE/scripts/tcs-sheet/group3_arrays.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 46,
    external_problem_id: 'tcs-046',
    title: '046. Find minimum and maximum element',
    slug: 'tcs-046-find-min-and-max-element',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N (size of array). Second line contains N space-separated integers.',
    output_format: 'Print two space-separated integers: minimum followed by maximum.',
    constraints: '1 <= N <= 10^5, -10^9 <= arr[i] <= 10^9',
    description: formatDescription(
      'Min and Max in Array',
      'Given an array of N integers, find the minimum and maximum elements in the array.',
      'Integer N followed by N space-separated integers.',
      'Two integers: min and max separated by space.',
      '1 <= N <= 10^5',
      [{ input: '5\n3 2 1 56 1000', output: '1 1000' }]
    ),
    starter_code: makeStarterCode('Find min and max in array'),
    testCases: [
      { input: '5\n3 2 1 56 1000', expected_output: '1 1000', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n42', expected_output: '42 42', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n-10 -20 -5 -30', expected_output: '-30 -5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '6\n5 5 5 5 5 5', expected_output: '5 5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n100 20 300 40 500', expected_output: '20 500', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 47,
    external_problem_id: 'tcs-047',
    title: '047. Find second largest distinct element',
    slug: 'tcs-047-second-largest-distinct-element',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the second largest distinct element. If no second largest exists, print -1.',
    constraints: '1 <= N <= 10^5, -10^9 <= arr[i] <= 10^9',
    description: formatDescription(
      'Second Largest Distinct Element',
      'Given an array of integers, find the second largest distinct element. If it does not exist, return -1.',
      'N followed by N integers.',
      'Second largest distinct integer, or -1.',
      '1 <= N <= 10^5',
      [{ input: '6\n12 35 1 10 34 1', output: '34' }]
    ),
    starter_code: makeStarterCode('Find second largest distinct element'),
    testCases: [
      { input: '6\n12 35 1 10 34 1', expected_output: '34', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n10 10 10', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\n5 2', expected_output: '2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n-5 -2 -1 -1 -10', expected_output: '-2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4\n100 50 100 20', expected_output: '50', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 48,
    external_problem_id: 'tcs-048',
    title: '048. Find second smallest distinct element',
    slug: 'tcs-048-second-smallest-distinct-element',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the second smallest distinct element. If it does not exist, print -1.',
    constraints: '1 <= N <= 10^5, -10^9 <= arr[i] <= 10^9',
    description: formatDescription(
      'Second Smallest Distinct Element',
      'Given an array of integers, find the second smallest distinct element in the array.',
      'N followed by N integers.',
      'Second smallest distinct integer, or -1.',
      '1 <= N <= 10^5',
      [{ input: '5\n2 4 1 3 5', output: '2' }]
    ),
    starter_code: makeStarterCode('Find second smallest distinct element'),
    testCases: [
      { input: '5\n2 4 1 3 5', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n7 7 7', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n10 20 30 40', expected_output: '20', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n-10 -5 0 5 10', expected_output: '-5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '2\n9 3', expected_output: '9', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 49,
    external_problem_id: 'tcs-049',
    title: '049. Calculate sum and average of array elements',
    slug: 'tcs-049-sum-and-average-of-array',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print sum on line 1, and average rounded to 2 decimal places on line 2.',
    constraints: '1 <= N <= 10^5, -10^6 <= arr[i] <= 10^6',
    description: formatDescription(
      'Sum and Average of Array',
      'Compute the total sum and average (rounded to 2 decimal places) of all elements in the array.',
      'N followed by N integers.',
      'Line 1: integer sum. Line 2: average formatted to 2 decimal places.',
      '1 <= N <= 10^5',
      [{ input: '5\n1 2 3 4 5', output: '15\n3.00' }]
    ),
    starter_code: makeStarterCode('Compute sum and average (2 decimal places) of array'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: '15\n3.00', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n10 20 30 45', expected_output: '105\n26.25', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n10', expected_output: '10\n10.00', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3\n-5 0 5', expected_output: '0\n0.00', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4\n1 2 3 5', expected_output: '11\n2.75', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 50,
    external_problem_id: 'tcs-050',
    title: '050. Reverse an array in-place',
    slug: 'tcs-050-reverse-array-in-place',
    difficulty: 'EASY',
    tags: ['Arrays', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the reversed array elements separated by spaces.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Reverse Array In-Place',
      'Reverse the given array of N elements in-place using two pointers.',
      'N followed by N integers.',
      'Space-separated reversed array.',
      '1 <= N <= 10^5',
      [{ input: '5\n1 2 3 4 5', output: '5 4 3 2 1' }]
    ),
    starter_code: makeStarterCode('Reverse array elements using two pointers'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: '5 4 3 2 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n10 20 30 40', expected_output: '40 30 20 10', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n7', expected_output: '7', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n9 1', expected_output: '1 9', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n1 3 5 7 9 11', expected_output: '11 9 7 5 3 1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 51,
    external_problem_id: 'tcs-051',
    title: '051. Check whether an array is sorted',
    slug: 'tcs-051-check-whether-array-is-sorted',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print "true" if the array is sorted in non-decreasing order, otherwise "false".',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Check Array Sorted',
      'Check whether the array is sorted in non-decreasing order (arr[i] <= arr[i+1] for all valid i).',
      'N followed by N integers.',
      'true or false.',
      '1 <= N <= 10^5',
      [{ input: '5\n1 2 3 4 5', output: 'true' }, { input: '5\n1 3 2 4 5', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if array is sorted non-decreasingly'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5\n1 3 2 4 5', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n10', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n5 5 5 5', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n10 5 1', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 52,
    external_problem_id: 'tcs-052',
    title: '052. Count even and odd elements',
    slug: 'tcs-052-count-even-and-odd-elements',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print two space-separated integers: count of even elements followed by count of odd elements.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Count Even and Odd Elements',
      'Count the number of even and odd integers in an array of size N.',
      'N followed by N integers.',
      'Two integers: evens_count odds_count.',
      '1 <= N <= 10^5',
      [{ input: '5\n1 2 3 4 5', output: '2 3' }]
    ),
    starter_code: makeStarterCode('Count even and odd integers in array'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: '2 3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n2 4 6 8', expected_output: '4 0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n1 3 5', expected_output: '0 3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\n0', expected_output: '1 0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n10 15 20 25 30 35', expected_output: '3 3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 53,
    external_problem_id: 'tcs-053',
    title: '053. Count positive, negative and zero values',
    slug: 'tcs-053-count-positive-negative-zero-values',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print three space-separated integers: positive count, negative count, and zero count.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Count Positive, Negative, and Zero',
      'Given an array of N integers, count the total numbers that are positive, negative, and zero.',
      'N followed by N integers.',
      'Three integers: positive negative zero.',
      '1 <= N <= 10^5',
      [{ input: '5\n-1 0 1 2 -3', output: '2 2 1' }]
    ),
    starter_code: makeStarterCode('Count positive, negative, and zero elements'),
    testCases: [
      { input: '5\n-1 0 1 2 -3', expected_output: '2 2 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n1 2 3', expected_output: '3 0 0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n-1 -2 -3', expected_output: '0 3 0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n0 0 0 0', expected_output: '0 0 4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n-5 5 0 -2 2 0', expected_output: '2 2 2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 54,
    external_problem_id: 'tcs-054',
    title: '054. Copy one array into another',
    slug: 'tcs-054-copy-one-array-into-another',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the copied array elements separated by spaces.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Copy Array',
      'Copy all elements of an array into another newly allocated array and print the copied array.',
      'N followed by N integers.',
      'Copied array elements.',
      '1 <= N <= 10^5',
      [{ input: '4\n10 20 30 40', output: '10 20 30 40' }]
    ),
    starter_code: makeStarterCode('Copy array elements into destination array and print'),
    testCases: [
      { input: '4\n10 20 30 40', expected_output: '10 20 30 40', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n99', expected_output: '99', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n-1 -2 -3', expected_output: '-1 -2 -3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n1 1 1 1 1', expected_output: '1 1 1 1 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '2\n0 100', expected_output: '0 100', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 55,
    external_problem_id: 'tcs-055',
    title: '055. Remove duplicates from a sorted array',
    slug: 'tcs-055-remove-duplicates-from-sorted-array',
    difficulty: 'EASY',
    tags: ['Arrays', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N sorted integers.',
    output_format: 'Print the unique elements separated by spaces.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Remove Duplicates from Sorted Array',
      'Given a sorted array, remove duplicates in-place such that each unique element appears once, and print the resulting array.',
      'N followed by N sorted integers.',
      'Space-separated unique sorted integers.',
      '1 <= N <= 10^5',
      [{ input: '6\n1 1 2 2 3 4', output: '1 2 3 4' }]
    ),
    starter_code: makeStarterCode('Remove duplicates from sorted array in-place'),
    testCases: [
      { input: '6\n1 1 2 2 3 4', expected_output: '1 2 3 4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n1 1 1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n1 2 3 4', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n-2 -2 0 1 1', expected_output: '-2 0 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1\n10', expected_output: '10', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 56,
    external_problem_id: 'tcs-056',
    title: '056. Find frequency of every element',
    slug: 'tcs-056-frequency-of-every-element',
    difficulty: 'EASY',
    tags: ['Arrays', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'For each distinct element in order of appearance, print "element: count" on a separate line.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Frequency of Elements',
      'Count the frequency of each distinct element in the array and print in order of first appearance.',
      'N followed by N integers.',
      'Lines formatted as "element: count".',
      '1 <= N <= 10^5',
      [{ input: '6\n1 2 2 3 1 2', output: '1: 2\n2: 3\n3: 1' }]
    ),
    starter_code: makeStarterCode('Count and print frequencies in order of first appearance'),
    testCases: [
      { input: '6\n1 2 2 3 1 2', expected_output: '1: 2\n2: 3\n3: 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n5 5 5', expected_output: '5: 3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n10 20 30 40', expected_output: '10: 1\n20: 1\n30: 1\n40: 1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n-1 -1', expected_output: '-1: 2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n4 2 4 2 4', expected_output: '4: 3\n2: 2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 57,
    external_problem_id: 'tcs-057',
    title: '057. Find the element with maximum frequency',
    slug: 'tcs-057-element-with-max-frequency',
    difficulty: 'EASY',
    tags: ['Arrays', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the element with maximum frequency. If tie, print the one that appeared first.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Maximum Frequency Element',
      'Find the element that appears the most times in the array. In case of ties, choose the one appearing first.',
      'N followed by N integers.',
      'Element with maximum frequency.',
      '1 <= N <= 10^5',
      [{ input: '7\n1 3 2 1 4 1 3', output: '1' }]
    ),
    starter_code: makeStarterCode('Find most frequent element'),
    testCases: [
      { input: '7\n1 3 2 1 4 1 3', expected_output: '1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n2 2 3 3', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n5', expected_output: '5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n-1 -2 -1 -3 -1', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n10 20 10 30 20 20', expected_output: '20', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 58,
    external_problem_id: 'tcs-058',
    title: '058. Find the element with minimum frequency',
    slug: 'tcs-058-element-with-min-frequency',
    difficulty: 'EASY',
    tags: ['Arrays', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the element with minimum frequency. In case of ties, print the one appearing first.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Minimum Frequency Element',
      'Find the element that appears least number of times in the array. Tie break by order of first appearance.',
      'N followed by N integers.',
      'Least frequent element.',
      '1 <= N <= 10^5',
      [{ input: '7\n2 2 3 3 3 4 2', output: '4' }]
    ),
    starter_code: makeStarterCode('Find least frequent element in array'),
    testCases: [
      { input: '7\n2 2 3 3 3 4 2', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n1 1 2 2', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n100', expected_output: '100', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n5 5 2 2 9', expected_output: '9', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n-1 -1 -2 -3 -3 -3', expected_output: '-2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 59,
    external_problem_id: 'tcs-059',
    title: '059. Find the missing number from 1 to N',
    slug: 'tcs-059-missing-number-1-to-n',
    difficulty: 'EASY',
    tags: ['Arrays', 'Bitwise', 'Math', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N-1 distinct integers from [1, N].',
    output_format: 'Print the missing integer in the range 1 to N.',
    constraints: '2 <= N <= 10^5',
    description: formatDescription(
      'Missing Number 1 to N',
      'An array contains N - 1 distinct numbers in the range [1, N]. Find the missing number using XOR or sum formula N*(N+1)/2.',
      'Integer N followed by N-1 space-separated integers.',
      'Missing integer.',
      '2 <= N <= 10^5',
      [{ input: '5\n1 2 4 5', output: '3' }]
    ),
    starter_code: makeStarterCode('Find missing number in 1..N'),
    testCases: [
      { input: '5\n1 2 4 5', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2\n1', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n2 3', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '6\n1 2 3 4 6', expected_output: '5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4\n4 2 1', expected_output: '3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 60,
    external_problem_id: 'tcs-060',
    title: '060. Find the duplicate element',
    slug: 'tcs-060-find-the-duplicate-element',
    difficulty: 'EASY',
    tags: ['Arrays', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains N. Second line contains N integers where exactly one element is duplicated.',
    output_format: 'Print the duplicate integer.',
    constraints: '2 <= N <= 10^5',
    description: formatDescription(
      'Find Duplicate Element',
      'Given an array where elements appear once except one element which appears multiple times, find that duplicate element.',
      'N followed by N integers.',
      'Duplicate element.',
      '2 <= N <= 10^5',
      [{ input: '5\n1 3 4 2 2', output: '2' }]
    ),
    starter_code: makeStarterCode('Find the duplicated element'),
    testCases: [
      { input: '5\n1 3 4 2 2', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n3 1 3 4', expected_output: '3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\n1 1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '6\n5 4 3 2 1 5', expected_output: '5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n10 20 30 10 40', expected_output: '10', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 61,
    external_problem_id: 'tcs-061',
    title: '061. Find all duplicate elements',
    slug: 'tcs-061-find-all-duplicate-elements',
    difficulty: 'EASY',
    tags: ['Arrays', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N integers.',
    output_format: 'Print all duplicate elements in sorted ascending order separated by space. If no duplicates, print -1.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Find All Duplicates',
      'Find all elements in the array that appear more than once, printed in ascending sorted order.',
      'N followed by N integers.',
      'Space-separated duplicates, or -1.',
      '1 <= N <= 10^5',
      [{ input: '7\n4 3 2 7 8 2 3', output: '2 3' }]
    ),
    starter_code: makeStarterCode('Find all duplicates and print sorted'),
    testCases: [
      { input: '7\n4 3 2 7 8 2 3', expected_output: '2 3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n1 2 3 4', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '5\n1 1 1 2 2', expected_output: '1 2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n5 5', expected_output: '5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n10 20 10 30 20 40', expected_output: '10 20', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 62,
    external_problem_id: 'tcs-062',
    title: '062. Move all zeroes to the end',
    slug: 'tcs-062-move-zeroes-to-end',
    difficulty: 'EASY',
    tags: ['Arrays', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N integers.',
    output_format: 'Print the array elements with all zeroes moved to the end, preserving relative order of non-zero elements.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Move Zeroes to End',
      'Given an array, move all 0s to the end of it while maintaining the relative order of the non-zero elements in O(N) time and O(1) space.',
      'N followed by N integers.',
      'Array with zeroes at the end.',
      '1 <= N <= 10^5',
      [{ input: '5\n0 1 0 3 12', output: '1 3 12 0 0' }]
    ),
    starter_code: makeStarterCode('Move all zeroes to end maintaining relative order'),
    testCases: [
      { input: '5\n0 1 0 3 12', expected_output: '1 3 12 0 0', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n0 0 0', expected_output: '0 0 0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n1 2 3 4', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n0 0 1 2', expected_output: '1 2 0 0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n4 0 5 0 0 6', expected_output: '4 5 6 0 0 0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 63,
    external_problem_id: 'tcs-063',
    title: '063. Move negative numbers to one side',
    slug: 'tcs-063-move-negatives-to-one-side',
    difficulty: 'EASY',
    tags: ['Arrays', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print array with all negative numbers on the left and non-negatives on the right, maintaining relative order.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Move Negatives to Left',
      'Rearrange array so that all negative numbers appear before all non-negative numbers while maintaining their relative ordering.',
      'N followed by N integers.',
      'Array with negatives on the left.',
      '1 <= N <= 10^5',
      [{ input: '6\n1 -1 3 2 -7 -5', output: '-1 -7 -5 1 3 2' }]
    ),
    starter_code: makeStarterCode('Move negative numbers to left preserving order'),
    testCases: [
      { input: '6\n1 -1 3 2 -7 -5', expected_output: '-1 -7 -5 1 3 2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n-1 -2 -3 -4', expected_output: '-1 -2 -3 -4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n1 2 3 4', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n-5 0 -2 3 -1', expected_output: '-5 -2 -1 0 3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n0 -1 0', expected_output: '-1 0 0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 64,
    external_problem_id: 'tcs-064',
    title: '064. Left rotate an array by one position',
    slug: 'tcs-064-left-rotate-array-by-one',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N integers.',
    output_format: 'Print array left-rotated by one position.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Left Rotate Array by One',
      'Given an array of N integers, rotate it to the left by one position (the first element moves to the end).',
      'N followed by N integers.',
      'Rotated array.',
      '1 <= N <= 10^5',
      [{ input: '5\n1 2 3 4 5', output: '2 3 4 5 1' }]
    ),
    starter_code: makeStarterCode('Left rotate array by one position'),
    testCases: [
      { input: '5\n1 2 3 4 5', expected_output: '2 3 4 5 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n10', expected_output: '10', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\n1 2', expected_output: '2 1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n10 20 30 40', expected_output: '20 30 40 10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n-5 0 5', expected_output: '0 5 -5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 65,
    external_problem_id: 'tcs-065',
    title: '065. Rotate an array by K positions',
    slug: 'tcs-065-rotate-array-by-k-positions',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains N and K (space-separated). Second line contains N integers.',
    output_format: 'Print array right-rotated by K positions.',
    constraints: '1 <= N <= 10^5, 0 <= K <= 10^9',
    description: formatDescription(
      'Rotate Array by K positions (Right Rotate)',
      'Given an array, rotate the array to the right by K steps, where K is non-negative.',
      'N and K, followed by N integers.',
      'Rotated array.',
      '1 <= N <= 10^5, K >= 0',
      [{ input: '7 3\n1 2 3 4 5 6 7', output: '5 6 7 1 2 3 4' }]
    ),
    starter_code: makeStarterCode('Rotate array right by K positions'),
    testCases: [
      { input: '7 3\n1 2 3 4 5 6 7', expected_output: '5 6 7 1 2 3 4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 2\n-1 -100 3 99', expected_output: '3 99 -1 -100', is_hidden: false, sample_name: 'Sample 2' },
      { input: '5 0\n1 2 3 4 5', expected_output: '1 2 3 4 5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 5\n1 2 3', expected_output: '2 3 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 10\n42', expected_output: '42', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 66,
    external_problem_id: 'tcs-066',
    title: '066. Merge two sorted arrays',
    slug: 'tcs-066-merge-two-sorted-arrays',
    difficulty: 'EASY',
    tags: ['Arrays', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and M. Second line contains N sorted integers. Third line contains M sorted integers.',
    output_format: 'Print the combined sorted array of N + M elements.',
    constraints: '1 <= N, M <= 10^5',
    description: formatDescription(
      'Merge Two Sorted Arrays',
      'Given two sorted arrays A of size N and B of size M, merge them into a single sorted array in O(N + M) time.',
      'Sizes N and M, then array A, then array B.',
      'Merged sorted array.',
      '1 <= N, M <= 10^5',
      [{ input: '4 3\n1 3 5 7\n2 4 6', output: '1 2 3 4 5 6 7' }]
    ),
    starter_code: makeStarterCode('Merge two sorted arrays using two pointers'),
    testCases: [
      { input: '4 3\n1 3 5 7\n2 4 6', expected_output: '1 2 3 4 5 6 7', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2 2\n1 2\n3 4', expected_output: '1 2 3 4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 1\n5\n2', expected_output: '2 5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 2\n1 1 1\n1 1', expected_output: '1 1 1 1 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 3\n-5 0 5\n-10 -2 8', expected_output: '-10 -5 -2 0 5 8', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 67,
    external_problem_id: 'tcs-067',
    title: '067. Find the union of two sorted arrays',
    slug: 'tcs-067-union-of-two-sorted-arrays',
    difficulty: 'EASY',
    tags: ['Arrays', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and M. Second line contains N sorted integers. Third line contains M sorted integers.',
    output_format: 'Print distinct sorted elements present in either array.',
    constraints: '1 <= N, M <= 10^5',
    description: formatDescription(
      'Union of Two Sorted Arrays',
      'Find the union (all distinct elements) of two sorted arrays in sorted order.',
      'Sizes N, M, followed by arrays A and B.',
      'Distinct sorted union elements.',
      '1 <= N, M <= 10^5',
      [{ input: '5 3\n1 2 3 4 5\n1 2 3', output: '1 2 3 4 5' }]
    ),
    starter_code: makeStarterCode('Find sorted union of two sorted arrays'),
    testCases: [
      { input: '5 3\n1 2 3 4 5\n1 2 3', expected_output: '1 2 3 4 5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 2\n2 2 3\n1 5', expected_output: '1 2 3 5', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 2\n1 2\n3 4', expected_output: '1 2 3 4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 1\n1\n1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 4\n1 3 5 7\n2 4 6 8', expected_output: '1 2 3 4 5 6 7 8', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 68,
    external_problem_id: 'tcs-068',
    title: '068. Find the intersection of two arrays',
    slug: 'tcs-068-intersection-of-two-arrays',
    difficulty: 'EASY',
    tags: ['Arrays', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains N and M. Second line contains N integers. Third line contains M integers.',
    output_format: 'Print distinct elements present in both arrays sorted in ascending order. If none, print -1.',
    constraints: '1 <= N, M <= 10^5',
    description: formatDescription(
      'Intersection of Two Arrays',
      'Find distinct common elements that appear in both array A and array B, printed in ascending sorted order.',
      'N and M, then array A, then array B.',
      'Space-separated common elements, or -1.',
      '1 <= N, M <= 10^5',
      [{ input: '4 5\n1 2 2 1\n2 2 3 4 2', output: '2' }]
    ),
    starter_code: makeStarterCode('Find distinct intersection of two arrays'),
    testCases: [
      { input: '4 5\n1 2 2 1\n2 2 3 4 2', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 3\n1 2 3\n4 5 6', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 3\n4 9 5\n9 4 9', expected_output: '4 9', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 2\n1 2\n1 2', expected_output: '1 2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 2\n5 10 15 20\n10 20', expected_output: '10 20', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 69,
    external_problem_id: 'tcs-069',
    title: '069. Find pair with a given sum',
    slug: 'tcs-069-pair-with-given-sum',
    difficulty: 'EASY',
    tags: ['Arrays', 'Two Pointers', 'Hashing', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N integers.',
    output_format: 'Print "true" if any two numbers add up to Target, otherwise "false".',
    constraints: '2 <= N <= 10^5, -10^9 <= Target <= 10^9',
    description: formatDescription(
      'Two Sum / Pair with Given Sum',
      'Given an array of integers and a Target sum, determine if there exists a pair of elements whose sum equals Target.',
      'N and Target, followed by N integers.',
      'true or false.',
      '2 <= N <= 10^5',
      [{ input: '5 9\n2 7 11 15 3', output: 'true', explanation: '2 + 7 = 9' }]
    ),
    starter_code: makeStarterCode('Check if pair exists with sum equal to target'),
    testCases: [
      { input: '5 9\n2 7 11 15 3', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 10\n1 2 3 4', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 6\n3 3', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 0\n-5 2 5 -2', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 50\n10 20 30', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 70,
    external_problem_id: 'tcs-070',
    title: '070. Find triplets with a given sum',
    slug: 'tcs-070-triplets-with-given-sum',
    difficulty: 'MEDIUM',
    tags: ['Arrays', 'Two Pointers', 'TCS NQT'],
    input_format: 'First line contains N and Target. Second line contains N integers.',
    output_format: 'Print "true" if there exists a triplet with sum equal to Target, otherwise "false".',
    constraints: '3 <= N <= 2000, -10^9 <= Target <= 10^9',
    description: formatDescription(
      'Three Sum / Triplet Sum',
      'Determine if there exists a triplet (arr[i], arr[j], arr[k] where i < j < k) such that arr[i] + arr[j] + arr[k] == Target.',
      'N and Target, then N integers.',
      'true or false.',
      '3 <= N <= 2000',
      [{ input: '6 13\n1 4 45 6 10 8', output: 'true', explanation: '1 + 4 + 8 = 13' }]
    ),
    starter_code: makeStarterCode('Find if triplet exists with sum equal to target'),
    testCases: [
      { input: '6 13\n1 4 45 6 10 8', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 5\n1 2 3 4', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3 0\n-1 0 1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5 15\n1 2 3 4 5', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5 12\n1 2 3 4 5', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 71,
    external_problem_id: 'tcs-071',
    title: '071. Find leaders in an array',
    slug: 'tcs-071-leaders-in-an-array',
    difficulty: 'EASY',
    tags: ['Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N integers.',
    output_format: 'Print all leaders in order from left to right separated by spaces.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Leaders in an Array',
      'An element is a leader if it is greater than or equal to all elements to its right. The rightmost element is always a leader.',
      'N followed by N integers.',
      'Leaders from left to right.',
      '1 <= N <= 10^5',
      [{ input: '6\n16 17 4 3 5 2', output: '17 5 2', explanation: '17 is > 4,3,5,2. 5 is > 2. 2 is rightmost.' }]
    ),
    starter_code: makeStarterCode('Scan from right to left to find all leaders'),
    testCases: [
      { input: '6\n16 17 4 3 5 2', expected_output: '17 5 2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5\n1 2 3 4 0', expected_output: '4 0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3\n5 4 3', expected_output: '5 4 3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\n100', expected_output: '100', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n10 20 30 40 50', expected_output: '50', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 72,
    external_problem_id: 'tcs-072',
    title: '072. Find equilibrium index',
    slug: 'tcs-072-equilibrium-index',
    difficulty: 'EASY',
    tags: ['Arrays', 'Prefix Sum', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N integers.',
    output_format: 'Print the 0-based equilibrium index where sum of left elements equals sum of right elements. If multiple, return the first. If none, return -1.',
    constraints: '1 <= N <= 10^5',
    description: formatDescription(
      'Equilibrium Index',
      'An equilibrium index is an index such that the sum of elements at lower indices equals the sum of elements at higher indices.',
      'N followed by N integers.',
      '0-based equilibrium index or -1.',
      '1 <= N <= 10^5',
      [{ input: '7\n-7 1 5 2 -4 3 0', output: '3', explanation: 'At idx 3 (value 2): left sum = -7+1+5 = -1. Right sum = -4+3+0 = -1.' }]
    ),
    starter_code: makeStarterCode('Find equilibrium index using total sum and prefix sum'),
    testCases: [
      { input: '7\n-7 1 5 2 -4 3 0', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n1 2 3', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n42', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '5\n1 3 5 2 2', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4\n2 0 0 2', expected_output: '1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 73,
    external_problem_id: 'tcs-073',
    title: '073. Find maximum difference arr[j] - arr[i] where j > i',
    slug: 'tcs-073-max-difference-j-greater-than-i',
    difficulty: 'EASY',
    tags: ['Arrays', 'Greedy', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N integers.',
    output_format: 'Print the maximum value of arr[j] - arr[i] where j > i. If arr is strictly decreasing, print -1.',
    constraints: '2 <= N <= 10^5',
    description: formatDescription(
      'Maximum Difference (Best Time to Buy and Sell Stock)',
      'Given an array arr[], find the maximum difference between any two elements such that the larger element appears after the smaller element.',
      'N followed by N integers.',
      'Maximum difference or -1.',
      '2 <= N <= 10^5',
      [{ input: '7\n2 3 10 6 4 8 1', output: '8', explanation: '10 - 2 = 8' }]
    ),
    starter_code: makeStarterCode('Track running min and compute maximum difference arr[j] - arr[i]'),
    testCases: [
      { input: '7\n2 3 10 6 4 8 1', expected_output: '8', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5\n7 6 4 3 1', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '6\n7 1 5 3 6 4', expected_output: '5', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n1 10', expected_output: '9', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4\n10 10 10 10', expected_output: '0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 74,
    external_problem_id: 'tcs-074',
    title: '074. Find maximum subarray sum (Kadane)',
    slug: 'tcs-074-maximum-subarray-sum-kadane',
    difficulty: 'MEDIUM',
    tags: ['Arrays', 'Kadane Algorithm', 'Dynamic Programming', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N integers.',
    output_format: 'Print the maximum possible contiguous subarray sum.',
    constraints: '1 <= N <= 10^5, -10^9 <= arr[i] <= 10^9',
    description: formatDescription(
      "Maximum Subarray Sum (Kadane's Algorithm)",
      "Given an integer array arr, find the contiguous subarray (containing at least one number) which has the largest sum.",
      'N followed by N integers.',
      'Maximum contiguous sum.',
      '1 <= N <= 10^5',
      [{ input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', explanation: 'Subarray [4, -1, 2, 1] has largest sum = 6.' }]
    ),
    starter_code: makeStarterCode("Implement Kadane's algorithm for maximum subarray sum"),
    testCases: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expected_output: '6', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1\n1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '5\n5 4 -1 7 8', expected_output: '23', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n-5 -2 -8 -1', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4\n-1 -2 -3 -4', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 75,
    external_problem_id: 'tcs-075',
    title: '075. Find maximum product subarray',
    slug: 'tcs-075-maximum-product-subarray',
    difficulty: 'MEDIUM',
    tags: ['Arrays', 'Dynamic Programming', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N integers.',
    output_format: 'Print the maximum product of a contiguous subarray.',
    constraints: '1 <= N <= 2 * 10^4',
    description: formatDescription(
      'Maximum Product Subarray',
      'Given an integer array, find a contiguous non-empty subarray within the array that has the largest product.',
      'N followed by N integers.',
      'Maximum product.',
      '1 <= N <= 2 * 10^4',
      [{ input: '4\n2 3 -2 4', output: '6', explanation: '[2, 3] has largest product = 6.' }]
    ),
    starter_code: makeStarterCode('Find maximum product subarray tracking min and max products'),
    testCases: [
      { input: '4\n2 3 -2 4', expected_output: '6', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n-2 0 -1', expected_output: '0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '4\n-2 3 -4 -5', expected_output: '60', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n-2 4', expected_output: '4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\n-1 -2 -3', expected_output: '6', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

