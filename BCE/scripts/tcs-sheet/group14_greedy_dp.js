// BCE/scripts/tcs-sheet/group14_greedy_dp.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 206,
    external_problem_id: 'tcs-206',
    title: '206. Climbing stairs',
    slug: 'tcs-206-climbing-stairs',
    difficulty: 'EASY',
    tags: ['Dynamic Programming', 'Math', 'TCS NQT'],
    input_format: 'A single integer N.',
    output_format: 'Print the number of distinct ways to climb to the top taking either 1 or 2 steps at a time.',
    constraints: '1 <= N <= 45',
    description: formatDescription(
      'Climbing Stairs',
      'You are climbing a staircase. It takes N steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
      'Single integer N.',
      'Total distinct ways.',
      '1 <= N <= 45',
      [
        { input: '2', output: '2', explanation: 'Ways: [1, 1], [2].' },
        { input: '3', output: '3', explanation: 'Ways: [1, 1, 1], [1, 2], [2, 1].' }
      ]
    ),
    starter_code: makeStarterCode('DP: dp[i] = dp[i-1] + dp[i-2] with base cases dp[1]=1, dp[2]=2'),
    testCases: [
      { input: '2', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3', expected_output: '3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4', expected_output: '5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10', expected_output: '89', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 207,
    external_problem_id: 'tcs-207',
    title: '207. Minimum cost climbing stairs',
    slug: 'tcs-207-min-cost-climbing-stairs',
    difficulty: 'EASY',
    tags: ['Dynamic Programming', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers representing the cost array.',
    output_format: 'Print the minimum cost to reach the top of the floor.',
    constraints: '2 <= N <= 1000, 0 <= cost[i] <= 999',
    description: formatDescription(
      'Min Cost Climbing Stairs',
      'You are given an integer array cost where cost[i] is the cost of i-th step on a staircase. Once you pay the cost, you can either climb one or two steps. You can start from index 0 or index 1. Return the minimum cost to reach the top.',
      'N\nN costs',
      'Minimum cost',
      '2 <= N <= 1000',
      [
        { input: '3\n10 15 20', output: '15', explanation: 'Start at index 1 (cost 15), climb two steps to reach the top.' },
        { input: '10\n1 100 1 1 1 100 1 1 100 1', output: '6', explanation: 'Cheapest path climbs through 1s.' }
      ]
    ),
    starter_code: makeStarterCode('DP: dp[i] = cost[i] + min(dp[i-1], dp[i-2]); return min(dp[n-1], dp[n-2])'),
    testCases: [
      { input: '3\n10 15 20', expected_output: '15', is_hidden: false, sample_name: 'Sample 1' },
      { input: '10\n1 100 1 1 1 100 1 1 100 1', expected_output: '6', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\n1 2', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4\n0 2 2 1', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n10 15 20 5 10', expected_output: '20', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 208,
    external_problem_id: 'tcs-208',
    title: '208. House Robber',
    slug: 'tcs-208-house-robber',
    difficulty: 'MEDIUM',
    tags: ['Dynamic Programming', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers representing the amount of money at each house.',
    output_format: 'Print the maximum amount of money you can rob tonight without alerting the police (cannot rob two adjacent houses).',
    constraints: '1 <= N <= 10^5, 0 <= nums[i] <= 10^4',
    description: formatDescription(
      'House Robber',
      'You are a professional robber planning to rob houses along a street. Adjacent houses have security systems connected, so two adjacent houses cannot be broken into on the same night. Return the maximum money you can rob.',
      'N\nN house values',
      'Maximum robbery total',
      '1 <= N <= 10^5',
      [
        { input: '4\n1 2 3 1', output: '4', explanation: 'Rob house 1 (money 1) and house 3 (money 3). Total = 4.' },
        { input: '5\n2 7 9 3 1', output: '12', explanation: 'Rob house 1 (2), 3 (9), and 5 (1). Total = 12.' }
      ]
    ),
    starter_code: makeStarterCode('DP: dp[i] = max(dp[i-1], dp[i-2] + nums[i]) with O(1) space'),
    testCases: [
      { input: '4\n1 2 3 1', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5\n2 7 9 3 1', expected_output: '12', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n10', expected_output: '10', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n5 1', expected_output: '5', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n2 1 1 2 5 1', expected_output: '9', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 209,
    external_problem_id: 'tcs-209',
    title: '209. Coin Change — minimum coins',
    slug: 'tcs-209-coin-change-minimum-coins',
    difficulty: 'MEDIUM',
    tags: ['Dynamic Programming', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains N and Amount. Second line contains N coin denominations.',
    output_format: 'Print the fewest number of coins needed to make up that amount. If that amount of money cannot be made up, print -1.',
    constraints: '1 <= N <= 12, 0 <= Amount <= 10^4',
    description: formatDescription(
      'Coin Change (Minimum Coins)',
      'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount cannot be made, return -1.',
      'N Amount\nN coins',
      'Minimum coins or -1',
      '0 <= Amount <= 10^4',
      [
        { input: '3 11\n1 2 5', output: '3', explanation: '11 = 5 + 5 + 1.' },
        { input: '1 3\n2', output: '-1', explanation: 'Cannot make 3 using only 2s.' }
      ]
    ),
    starter_code: makeStarterCode('DP: dp[i] = min(dp[i], dp[i - c] + 1) initialized to infinity, with dp[0] = 0'),
    testCases: [
      { input: '3 11\n1 2 5', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 3\n2', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 0\n1', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 7\n2 4 6', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 6249\n186 419 83 408', expected_output: '20', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 210,
    external_problem_id: 'tcs-210',
    title: '210. Coin Change — number of ways',
    slug: 'tcs-210-coin-change-number-of-ways',
    difficulty: 'MEDIUM',
    tags: ['Dynamic Programming', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains N and Amount. Second line contains N coin denominations.',
    output_format: 'Print the number of combinations that make up that amount.',
    constraints: '1 <= N <= 300, 0 <= Amount <= 5000',
    description: formatDescription(
      'Coin Change II (Number of Ways)',
      'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the number of combinations that make up that amount. You may assume an infinite number of each kind of coin.',
      'N Amount\nN coins',
      'Total combinations',
      '0 <= Amount <= 5000',
      [
        { input: '3 5\n1 2 5', output: '4', explanation: 'Ways: 5, 2+2+1, 2+1+1+1, 1+1+1+1+1.' },
        { input: '3 3\n2', output: '0', explanation: 'No combination possible.' }
      ]
    ),
    starter_code: makeStarterCode('Unbounded knapsack DP: for coin in coins: for i from coin to amount: dp[i] += dp[i - coin]'),
    testCases: [
      { input: '3 5\n1 2 5', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 3\n2', expected_output: '0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 10\n10', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1 0\n7', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4 10\n1 2 5 10', expected_output: '11', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 211,
    external_problem_id: 'tcs-211',
    title: '211. 0/1 Knapsack',
    slug: 'tcs-211-0-1-knapsack-problem',
    difficulty: 'MEDIUM',
    tags: ['Dynamic Programming', 'Knapsack', 'TCS NQT'],
    input_format: 'First line contains N and Capacity W. Second line contains N values. Third line contains N weights.',
    output_format: 'Print the maximum value that can be put in a knapsack of capacity W.',
    constraints: '1 <= N <= 1000, 1 <= W <= 1000',
    description: formatDescription(
      '0/1 Knapsack Problem',
      'Given weights and values of N items, put these items in a knapsack of capacity W to get the maximum total value in the knapsack. You cannot break an item (either pick it completely or do not pick it).',
      'N W\nN values\nN weights',
      'Maximum total value',
      '1 <= N, W <= 1000',
      [
        { input: '3 4\n1 2 3\n4 5 1', output: '3', explanation: 'Pick 3rd item with weight 1 and value 3.' },
        { input: '3 50\n60 100 120\n10 20 30', output: '220', explanation: 'Pick item 2 and 3: 100 + 120 = 220.' }
      ]
    ),
    starter_code: makeStarterCode('0/1 Knapsack 1D array DP backwards: dp[w] = max(dp[w], dp[w - wt[i]] + val[i])'),
    testCases: [
      { input: '3 4\n1 2 3\n4 5 1', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 50\n60 100 120\n10 20 30', expected_output: '220', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 10\n50\n15', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4 8\n10 40 30 50\n5 4 6 3', expected_output: '90', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 3\n1 2 3\n1 2 3', expected_output: '3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 212,
    external_problem_id: 'tcs-212',
    title: '212. Longest increasing subsequence',
    slug: 'tcs-212-longest-increasing-subsequence',
    difficulty: 'MEDIUM',
    tags: ['Dynamic Programming', 'Binary Search', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the length of the longest strictly increasing subsequence.',
    constraints: '1 <= N <= 2500',
    description: formatDescription(
      'Longest Increasing Subsequence (LIS)',
      'Given an integer array nums, return the length of the longest strictly increasing subsequence. A subsequence is derived by deleting some or no elements without changing the order of remaining elements.',
      'N\nN integers',
      'Length of LIS',
      '1 <= N <= 2500',
      [
        { input: '8\n10 9 2 5 3 7 101 18', output: '4', explanation: 'The longest increasing subsequence is [2, 3, 7, 101], length 4.' },
        { input: '6\n0 1 0 3 2 3', output: '4', explanation: 'LIS is [0, 1, 2, 3].' }
      ]
    ),
    starter_code: makeStarterCode('Patience sorting with binary search / lower_bound in O(N log N) or O(N^2) DP'),
    testCases: [
      { input: '8\n10 9 2 5 3 7 101 18', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '6\n0 1 0 3 2 3', expected_output: '4', is_hidden: false, sample_name: 'Sample 2' },
      { input: '7\n7 7 7 7 7 7 7', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\n10', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n1 3 6 7 9 4', expected_output: '5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 213,
    external_problem_id: 'tcs-213',
    title: '213. Longest common subsequence',
    slug: 'tcs-213-longest-common-subsequence',
    difficulty: 'MEDIUM',
    tags: ['Dynamic Programming', 'Strings', 'TCS NQT'],
    input_format: 'First line contains string S1. Second line contains string S2.',
    output_format: 'Print the length of the longest common subsequence of S1 and S2.',
    constraints: '1 <= |S1|, |S2| <= 1000',
    description: formatDescription(
      'Longest Common Subsequence (LCS)',
      'Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.',
      'S1 on line 1, S2 on line 2',
      'Length of LCS',
      '1 <= |S1|, |S2| <= 1000',
      [
        { input: 'abcde\nace', output: '3', explanation: 'LCS is "ace" with length 3.' },
        { input: 'abc\nabc', output: '3', explanation: 'LCS is "abc".' }
      ]
    ),
    starter_code: makeStarterCode('2D DP table: if s1[i]==s2[j] dp[i][j]=1+dp[i-1][j-1] else max(dp[i-1][j], dp[i][j-1])'),
    testCases: [
      { input: 'abcde\nace', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'abc\nabc', expected_output: '3', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'abc\ndef', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'oxcp\ncrpe', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'longest\nstone', expected_output: '3', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 214,
    external_problem_id: 'tcs-214',
    title: '214. Edit distance',
    slug: 'tcs-214-edit-distance',
    difficulty: 'MEDIUM',
    tags: ['Dynamic Programming', 'Strings', 'TCS NQT'],
    input_format: 'First line contains string word1. Second line contains string word2.',
    output_format: 'Print the minimum number of operations required to convert word1 to word2 (insert, delete, or replace character).',
    constraints: '0 <= |word1|, |word2| <= 500',
    description: formatDescription(
      'Edit Distance (Levenshtein Distance)',
      'Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You have three operations permitted on a word: Insert a character, Delete a character, Replace a character.',
      'word1\nword2',
      'Minimum edit distance',
      '0 <= |word1|, |word2| <= 500',
      [
        { input: 'horse\nros', output: '3', explanation: 'horse -> rorse (replace h with r) -> rose (remove r) -> ros (remove e).' },
        { input: 'intention\nexecution', output: '5' }
      ]
    ),
    starter_code: makeStarterCode('2D DP: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) if mismatch, else dp[i-1][j-1]'),
    testCases: [
      { input: 'horse\nros', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'intention\nexecution', expected_output: '5', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'a\nb', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'sea\neat', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'tcs\ntcs', expected_output: '0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 215,
    external_problem_id: 'tcs-215',
    title: '215. Maximum sum of non-adjacent elements',
    slug: 'tcs-215-max-sum-non-adjacent-elements',
    difficulty: 'MEDIUM',
    tags: ['Dynamic Programming', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated integers.',
    output_format: 'Print the maximum sum of a non-empty subsequence such that no two chosen elements are adjacent.',
    constraints: '1 <= N <= 10^5, 0 <= arr[i] <= 10^5',
    description: formatDescription(
      'Maximum Sum of Non-Adjacent Elements',
      'Given an array of positive integers, find the maximum sum of a subsequence with the constraint that no two numbers in the sequence should be adjacent in the array.',
      'N\nN positive integers',
      'Maximum sum',
      '1 <= N <= 10^5',
      [
        { input: '6\n5 5 10 100 10 5', output: '110', explanation: 'Pick 5, 100, 5 -> 110.' },
        { input: '4\n3 2 7 10', output: '13', explanation: 'Pick 3 and 10 -> 13.' }
      ]
    ),
    starter_code: makeStarterCode('Track incl (including current) and excl (excluding current) maximum sums'),
    testCases: [
      { input: '6\n5 5 10 100 10 5', expected_output: '110', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n3 2 7 10', expected_output: '13', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n100', expected_output: '100', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n4 8', expected_output: '8', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5\n1 2 3 5 4', expected_output: '8', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 216,
    external_problem_id: 'tcs-216',
    title: '216. Activity selection',
    slug: 'tcs-216-activity-selection-problem',
    difficulty: 'EASY',
    tags: ['Greedy', 'Sorting', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N start times. Third line contains N finish times.',
    output_format: 'Print the maximum number of activities that can be performed by a single person, assuming they can only work on a single activity at a time.',
    constraints: '1 <= N <= 10^5, 0 <= start[i] < finish[i] <= 10^9',
    description: formatDescription(
      'Activity Selection Problem',
      'Given N activities with their start and finish times, find the maximum number of activities that can be performed by a single person, assuming that a person can only work on a single activity at a time (greedy choice by earliest finish time).',
      'N\nN start times\nN finish times',
      'Max activities',
      '1 <= N <= 10^5',
      [
        { input: '6\n1 3 0 5 8 5\n2 4 6 7 9 9', output: '4', explanation: 'Can select 4 activities: (1,2), (3,4), (5,7), (8,9).' },
        { input: '3\n10 12 20\n20 25 30', output: '2', explanation: 'Can do (10, 20) and (20, 30).' }
      ]
    ),
    starter_code: makeStarterCode('Sort activities by end time in ascending order, greedily select next activity if start >= last end'),
    testCases: [
      { input: '6\n1 3 0 5 8 5\n2 4 6 7 9 9', expected_output: '4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n10 12 20\n20 25 30', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n1\n2', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3\n1 2 3\n10 10 10', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4\n1 2 3 4\n3 4 5 6', expected_output: '2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 217,
    external_problem_id: 'tcs-217',
    title: '217. Fractional knapsack',
    slug: 'tcs-217-fractional-knapsack',
    difficulty: 'MEDIUM',
    tags: ['Greedy', 'Sorting', 'TCS NQT'],
    input_format: 'First line contains N and Capacity W. Next N lines each contain value and weight of an item.',
    output_format: 'Print the maximum total value formatted to 2 decimal places.',
    constraints: '1 <= N <= 10^5, 1 <= W <= 10^5',
    description: formatDescription(
      'Fractional Knapsack Problem',
      'Given weights and values of N items, we need to put these items in a knapsack of capacity W to get the maximum total value in the knapsack. We can break items for maximizing the total value of knapsack.',
      'N W\nN lines of val wt',
      'Max value with 2 decimal places',
      '1 <= N, W <= 10^5',
      [
        { input: '3 50\n60 10\n100 20\n120 30', output: '240.00', explanation: 'Take item 1 (60), item 2 (100), and 2/3 of item 3 (80) -> 240.00.' },
        { input: '2 50\n60 10\n100 20', output: '160.00', explanation: 'Take both completely.' }
      ]
    ),
    starter_code: makeStarterCode('Sort items descending by value-to-weight ratio (val/wt) and greedily take as much as possible'),
    testCases: [
      { input: '3 50\n60 10\n100 20\n120 30', expected_output: '240.00', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2 50\n60 10\n100 20', expected_output: '160.00', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 10\n500 20', expected_output: '250.00', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 0\n10 5\n20 10', expected_output: '0.00', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3 20\n25 18\n24 15\n15 10', expected_output: '31.50', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 218,
    external_problem_id: 'tcs-218',
    title: '218. Minimum number of platforms',
    slug: 'tcs-218-minimum-number-of-platforms',
    difficulty: 'MEDIUM',
    tags: ['Greedy', 'Sorting', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N arrival times. Third line contains N departure times.',
    output_format: 'Print the minimum number of platforms required at the railway station so that no train has to wait.',
    constraints: '1 <= N <= 5*10^4, 0 <= arr[i] <= dep[i] <= 2359',
    description: formatDescription(
      'Minimum Number of Platforms',
      'Given arrival and departure times of all trains that reach a railway station, find the minimum number of platforms required for the railway station so that no train is kept waiting. At any given time, the same platform cannot be used for both departure and arrival.',
      'N\nN arrival times\nN departure times',
      'Minimum platform count',
      '1 <= N <= 5*10^4',
      [
        { input: '6\n900 940 950 1100 1500 1800\n910 1200 1120 1130 1900 2000', output: '3', explanation: 'At around 1100, trains 2, 3, 4 are present simultaneously requiring 3 platforms.' },
        { input: '3\n900 1100 1235\n1000 1200 1240', output: '1', explanation: 'No two trains overlap in time.' }
      ]
    ),
    starter_code: makeStarterCode('Sort both arrival and departure arrays independently, use two pointers to track simultaneous trains'),
    testCases: [
      { input: '6\n900 940 950 1100 1500 1800\n910 1200 1120 1130 1900 2000', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\n900 1100 1235\n1000 1200 1240', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n1000\n1100', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3\n900 900 900\n1000 1000 1000', expected_output: '3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '2\n900 1000\n1000 1100', expected_output: '2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 219,
    external_problem_id: 'tcs-219',
    title: '219. Job sequencing with deadlines',
    slug: 'tcs-219-job-sequencing-with-deadlines',
    difficulty: 'MEDIUM',
    tags: ['Greedy', 'Sorting', 'Disjoint Set', 'TCS NQT'],
    input_format: 'First line contains integer N. Next N lines each contain three integers: JobID Deadline Profit.',
    output_format: 'Print two space-separated integers: the number of jobs completed and the maximum profit earned.',
    constraints: '1 <= N <= 10^5, 1 <= Deadline <= 10^5, 1 <= Profit <= 10^5',
    description: formatDescription(
      'Job Sequencing with Deadlines',
      'Given a set of N jobs where each job i has a deadline and profit associated with it. Each job takes 1 unit of time to complete and only one job can be scheduled at a time. We earn the profit if and only if the job is completed by its deadline. Find the number of jobs done and maximum profit.',
      'N\nN lines of JobID Deadline Profit',
      'JobsCompleted MaxProfit',
      '1 <= N <= 10^5',
      [
        { input: '4\n1 4 20\n2 1 10\n3 1 40\n4 1 30', output: '2 60', explanation: 'Job 3 done at t=1 (profit 40), Job 1 done at t=2 (profit 20). Total = 60.' },
        { input: '5\n1 2 100\n2 1 19\n3 2 27\n4 1 25\n5 1 15', output: '2 127', explanation: 'Job 1 (100) and Job 3 (27) can be completed. Total = 127.' }
      ]
    ),
    starter_code: makeStarterCode('Sort jobs descending by profit; greedily schedule each job in latest available slot <= deadline'),
    testCases: [
      { input: '4\n1 4 20\n2 1 10\n3 1 40\n4 1 30', expected_output: '2 60', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5\n1 2 100\n2 1 19\n3 2 27\n4 1 25\n5 1 15', expected_output: '2 127', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n1 1 50', expected_output: '1 50', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3\n1 1 10\n2 1 20\n3 1 30', expected_output: '1 30', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4\n1 2 50\n2 2 60\n3 3 20\n4 3 30', expected_output: '3 140', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 220,
    external_problem_id: 'tcs-220',
    title: '220. Partition equal subset sum',
    slug: 'tcs-220-partition-equal-subset-sum',
    difficulty: 'MEDIUM',
    tags: ['Dynamic Programming', 'Knapsack', 'Arrays', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N positive integers.',
    output_format: 'Print "true" if the array can be partitioned into two subsets such that the sum of elements in both subsets is equal, otherwise "false".',
    constraints: '1 <= N <= 200, 1 <= nums[i] <= 100',
    description: formatDescription(
      'Partition Equal Subset Sum',
      'Given an integer array nums, return true if you can partition the array into two subsets such that the sum of the elements in both subsets is equal or false otherwise. (Subset sum DP target = totalSum / 2).',
      'N\nN positive integers',
      'true or false',
      '1 <= N <= 200',
      [
        { input: '4\n1 5 11 5', output: 'true', explanation: 'Can be partitioned into [1, 5, 5] and [11].' },
        { input: '4\n1 2 3 5', output: 'false', explanation: 'Total sum is 11, which is odd and cannot be partitioned into equal halves.' }
      ]
    ),
    starter_code: makeStarterCode('Check if total sum is even, then solve subset sum for target = sum / 2 using 1D boolean DP array'),
    testCases: [
      { input: '4\n1 5 11 5', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4\n1 2 3 5', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\n10', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2\n2 2', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '6\n1 2 3 4 5 5', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

