// BCE/scripts/tcs-sheet/group2_number_theory.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 21,
    external_problem_id: 'tcs-021',
    title: '021. Count digits in an integer',
    slug: 'tcs-021-count-digits-in-integer',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print the total number of digits in N.',
    constraints: '0 <= N <= 10^18',
    description: formatDescription(
      'Count Digits in Integer',
      'Given an integer N, count how many digits it contains. Note that 0 has 1 digit.',
      'A single integer N.',
      'Total count of digits in N.',
      '0 <= N <= 10^18',
      [{ input: '12345', output: '5' }, { input: '0', output: '1' }]
    ),
    starter_code: makeStarterCode('Count digits in integer N'),
    testCases: [
      { input: '12345', expected_output: '5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '0', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '7', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '987654321', expected_output: '9', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1000000000', expected_output: '10', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 22,
    external_problem_id: 'tcs-022',
    title: '022. Find sum of digits',
    slug: 'tcs-022-sum-of-digits',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print the sum of all digits of N.',
    constraints: '0 <= N <= 10^18',
    description: formatDescription(
      'Sum of Digits',
      'Calculate the sum of all digits of the integer N.',
      'A single integer N.',
      'Sum of digits of N.',
      '0 <= N <= 10^18',
      [{ input: '1234', output: '10', explanation: '1 + 2 + 3 + 4 = 10' }]
    ),
    starter_code: makeStarterCode('Calculate sum of digits of N'),
    testCases: [
      { input: '1234', expected_output: '10', is_hidden: false, sample_name: 'Sample 1' },
      { input: '999', expected_output: '27', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '10005', expected_output: '6', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '789123', expected_output: '30', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 23,
    external_problem_id: 'tcs-023',
    title: '023. Reverse a number',
    slug: 'tcs-023-reverse-a-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single integer N.',
    output_format: 'Print the reversed integer without unnecessary leading zeros.',
    constraints: '0 <= N <= 10^18',
    description: formatDescription(
      'Reverse a Number',
      'Given an integer N, reverse its digits and output the resulting number without leading zeros.',
      'A single non-negative integer N.',
      'Reversed integer.',
      '0 <= N <= 10^18',
      [{ input: '12345', output: '54321' }, { input: '1200', output: '21' }]
    ),
    starter_code: makeStarterCode('Reverse digits of integer N'),
    testCases: [
      { input: '12345', expected_output: '54321', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1200', expected_output: '21', is_hidden: false, sample_name: 'Sample 2' },
      { input: '7', expected_output: '7', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1000000', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '98701', expected_output: '10789', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 24,
    external_problem_id: 'tcs-024',
    title: '024. Check numeric palindrome',
    slug: 'tcs-024-check-numeric-palindrome',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print "true" if N is a palindrome, otherwise "false".',
    constraints: '0 <= N <= 10^18',
    description: formatDescription(
      'Numeric Palindrome',
      'Check whether the integer N reads the same forwards and backwards.',
      'A single integer N.',
      'true or false.',
      '0 <= N <= 10^18',
      [{ input: '121', output: 'true' }, { input: '123', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is a palindrome number'),
    testCases: [
      { input: '121', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '123', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1221', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 25,
    external_problem_id: 'tcs-025',
    title: '025. Check Armstrong number',
    slug: 'tcs-025-check-armstrong-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single integer N.',
    output_format: 'Print "true" if N is an Armstrong number (sum of digits raised to power of number of digits equals N), else "false".',
    constraints: '0 <= N <= 10^9',
    description: formatDescription(
      'Armstrong Number',
      'An Armstrong number of k digits is an integer such that the sum of its digits raised to the k-th power equals the number itself.',
      'A single integer N.',
      'true or false.',
      '0 <= N <= 10^9',
      [{ input: '153', output: 'true', explanation: '1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153' }, { input: '123', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is an Armstrong number'),
    testCases: [
      { input: '153', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '123', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '370', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '9474', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '500', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 26,
    external_problem_id: 'tcs-026',
    title: '026. Check prime number',
    slug: 'tcs-026-check-prime-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single integer N.',
    output_format: 'Print "true" if N is prime, otherwise "false".',
    constraints: '1 <= N <= 10^9',
    description: formatDescription(
      'Check Prime Number',
      'Determine whether an integer N is prime (greater than 1 with no positive divisors other than 1 and itself).',
      'A single integer N.',
      'true or false.',
      '1 <= N <= 10^9',
      [{ input: '7', output: 'true' }, { input: '4', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is a prime number'),
    testCases: [
      { input: '7', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '997', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 27,
    external_problem_id: 'tcs-027',
    title: '027. Print prime numbers in a range',
    slug: 'tcs-027-primes-in-a-range',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'Two space-separated integers L and R (L <= R).',
    output_format: 'Print all prime numbers in the closed interval [L, R] separated by spaces. If none exist, print -1.',
    constraints: '1 <= L <= R <= 10^5',
    description: formatDescription(
      'Primes in Range',
      'Find and print all prime numbers between L and R inclusive.',
      'Two space-separated integers L and R.',
      'Space-separated prime numbers, or -1.',
      '1 <= L <= R <= 10^5',
      [{ input: '10 20', output: '11 13 17 19' }]
    ),
    starter_code: makeStarterCode('Print all prime numbers in range [L, R]'),
    testCases: [
      { input: '10 20', expected_output: '11 13 17 19', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1 5', expected_output: '2 3 5', is_hidden: false, sample_name: 'Sample 2' },
      { input: '14 16', expected_output: '-1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 2', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '30 40', expected_output: '31 37', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 28,
    external_problem_id: 'tcs-028',
    title: "028. Find GCD / HCF using Euclid's algorithm",
    slug: 'tcs-028-gcd-euclids-algorithm',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'Two space-separated integers A and B.',
    output_format: 'Print the greatest common divisor (GCD) of A and B.',
    constraints: '1 <= A, B <= 10^12',
    description: formatDescription(
      "Euclid's GCD",
      "Compute the Greatest Common Divisor (GCD/HCF) of two numbers using Euclid's subtraction or modulo algorithm.",
      'Two integers A and B.',
      'GCD of A and B.',
      '1 <= A, B <= 10^12',
      [{ input: '24 36', output: '12' }]
    ),
    starter_code: makeStarterCode('Compute GCD using Euclid algorithm'),
    testCases: [
      { input: '24 36', expected_output: '12', is_hidden: false, sample_name: 'Sample 1' },
      { input: '17 19', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '100 25', expected_output: '25', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '123456 654321', expected_output: '3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '50 50', expected_output: '50', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 29,
    external_problem_id: 'tcs-029',
    title: '029. Find LCM of two numbers',
    slug: 'tcs-029-lcm-of-two-numbers',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'Two space-separated integers A and B.',
    output_format: 'Print the least common multiple (LCM) of A and B.',
    constraints: '1 <= A, B <= 10^8',
    description: formatDescription(
      'LCM of two numbers',
      'Compute LCM(A, B) using the formula (A * B) / GCD(A, B).',
      'Two integers A and B.',
      'LCM of A and B.',
      '1 <= A, B <= 10^8',
      [{ input: '12 18', output: '36' }]
    ),
    starter_code: makeStarterCode('Compute LCM of A and B'),
    testCases: [
      { input: '12 18', expected_output: '36', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5 7', expected_output: '35', is_hidden: false, sample_name: 'Sample 2' },
      { input: '10 10', expected_output: '10', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '15 20', expected_output: '60', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '24 60', expected_output: '120', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 30,
    external_problem_id: 'tcs-030',
    title: '030. Find all factors of a number',
    slug: 'tcs-030-all-factors-of-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single positive integer N.',
    output_format: 'Print all positive factors of N in ascending order separated by spaces.',
    constraints: '1 <= N <= 10^8',
    description: formatDescription(
      'Factors of a Number',
      'Find all positive integers that divide N without a remainder, printed in ascending order.',
      'Single integer N.',
      'Space-separated factors.',
      '1 <= N <= 10^8',
      [{ input: '12', output: '1 2 3 4 6 12' }]
    ),
    starter_code: makeStarterCode('Find all factors of N and print sorted'),
    testCases: [
      { input: '12', expected_output: '1 2 3 4 6 12', is_hidden: false, sample_name: 'Sample 1' },
      { input: '7', expected_output: '1 7', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '16', expected_output: '1 2 4 8 16', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '20', expected_output: '1 2 4 5 10 20', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 31,
    external_problem_id: 'tcs-031',
    title: '031. Check perfect number',
    slug: 'tcs-031-check-perfect-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single positive integer N.',
    output_format: 'Print "true" if N is a perfect number (sum of proper divisors equals N), else "false".',
    constraints: '1 <= N <= 10^8',
    description: formatDescription(
      'Perfect Number',
      'A perfect number is a positive integer that is equal to the sum of its positive proper divisors (excluding the number itself). E.g., 6 = 1 + 2 + 3.',
      'Single integer N.',
      'true or false.',
      '1 <= N <= 10^8',
      [{ input: '6', output: 'true' }, { input: '10', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is a perfect number'),
    testCases: [
      { input: '6', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '10', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '28', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '496', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '12', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 32,
    external_problem_id: 'tcs-032',
    title: '032. Check strong number',
    slug: 'tcs-032-check-strong-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single positive integer N.',
    output_format: 'Print "true" if N is a strong number (sum of factorials of digits equals N), else "false".',
    constraints: '1 <= N <= 10^7',
    description: formatDescription(
      'Strong Number',
      'A number is called strong if the sum of the factorials of its digits is equal to the number itself. E.g. 145 = 1! + 4! + 5! = 1 + 24 + 120 = 145.',
      'Single integer N.',
      'true or false.',
      '1 <= N <= 10^7',
      [{ input: '145', output: 'true' }, { input: '120', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is a strong number'),
    testCases: [
      { input: '145', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '120', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '40585', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 33,
    external_problem_id: 'tcs-033',
    title: '033. Check automorphic number',
    slug: 'tcs-033-check-automorphic-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single positive integer N.',
    output_format: 'Print "true" if N is automorphic (N^2 ends with N), else "false".',
    constraints: '1 <= N <= 10^6',
    description: formatDescription(
      'Automorphic Number',
      'An automorphic number is an integer whose square ends in the same digits as the number itself (e.g. 25^2 = 625, 76^2 = 5776).',
      'Single integer N.',
      'true or false.',
      '1 <= N <= 10^6',
      [{ input: '25', output: 'true' }, { input: '7', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is automorphic'),
    testCases: [
      { input: '25', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '7', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '5', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '76', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '625', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 34,
    external_problem_id: 'tcs-034',
    title: '034. Check Harshad / Niven number',
    slug: 'tcs-034-check-harshad-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single positive integer N.',
    output_format: 'Print "true" if N is divisible by the sum of its digits, else "false".',
    constraints: '1 <= N <= 10^9',
    description: formatDescription(
      'Harshad (Niven) Number',
      'An integer N is called a Harshad number if it is divisible by the sum of its digits. E.g. 18 is divisible by 1 + 8 = 9.',
      'Single integer N.',
      'true or false.',
      '1 <= N <= 10^9',
      [{ input: '18', output: 'true' }, { input: '19', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is a Harshad number'),
    testCases: [
      { input: '18', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '19', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '21', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '200', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '53', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 35,
    external_problem_id: 'tcs-035',
    title: '035. Check neon number',
    slug: 'tcs-035-check-neon-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print "true" if sum of digits of N^2 equals N, else "false".',
    constraints: '0 <= N <= 10^6',
    description: formatDescription(
      'Neon Number',
      'A neon number is a number where the sum of digits of its square is equal to the number itself (e.g. 9^2 = 81, 8+1 = 9).',
      'Single integer N.',
      'true or false.',
      '0 <= N <= 10^6',
      [{ input: '9', output: 'true' }, { input: '12', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is a Neon number'),
    testCases: [
      { input: '9', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '12', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '45', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 36,
    external_problem_id: 'tcs-036',
    title: '036. Check happy number',
    slug: 'tcs-036-check-happy-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single positive integer N.',
    output_format: 'Print "true" if N is a happy number (repeated sum of squares of digits reaches 1), else "false".',
    constraints: '1 <= N <= 10^9',
    description: formatDescription(
      'Happy Number',
      'Starting with N, replace the number by the sum of the squares of its digits. Repeat until the number equals 1 (happy), or it loops endlessly in a cycle not including 1.',
      'Single integer N.',
      'true or false.',
      '1 <= N <= 10^9',
      [{ input: '19', output: 'true', explanation: '1^2 + 9^2 = 82 -> 8^2+2^2 = 68 -> 6^2+8^2 = 100 -> 1^2+0+0 = 1' }, { input: '4', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is a Happy number'),
    testCases: [
      { input: '19', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '7', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '2', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 37,
    external_problem_id: 'tcs-037',
    title: '037. Find factorial trailing zeroes',
    slug: 'tcs-037-factorial-trailing-zeroes',
    difficulty: 'EASY',
    tags: ['Number Theory', 'Math', 'TCS NQT'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print the count of trailing zeroes in N!.',
    constraints: '0 <= N <= 10^9',
    description: formatDescription(
      'Factorial Trailing Zeroes',
      'Given an integer N, return the number of trailing zeroes in N!. Uses Legendre formula: floor(N/5) + floor(N/25) + ...',
      'Single integer N.',
      'Count of trailing zeroes.',
      '0 <= N <= 10^9',
      [{ input: '5', output: '1', explanation: '5! = 120 (1 trailing zero)' }, { input: '25', output: '6' }]
    ),
    starter_code: makeStarterCode('Count trailing zeroes in N! using floor(N/5^k)'),
    testCases: [
      { input: '5', expected_output: '1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '25', expected_output: '6', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '10', expected_output: '2', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '100', expected_output: '24', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 38,
    external_problem_id: 'tcs-038',
    title: '038. Find the nth Fibonacci number',
    slug: 'tcs-038-nth-fibonacci-number',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single non-negative integer N (0-indexed).',
    output_format: 'Print the N-th Fibonacci number (Fib(0)=0, Fib(1)=1, Fib(2)=1).',
    constraints: '0 <= N <= 50',
    description: formatDescription(
      'N-th Fibonacci Number',
      'Find the N-th Fibonacci number where Fib(0)=0, Fib(1)=1, and Fib(i) = Fib(i-1) + Fib(i-2).',
      'Single integer N.',
      'N-th Fibonacci number.',
      '0 <= N <= 50',
      [{ input: '6', output: '8' }]
    ),
    starter_code: makeStarterCode('Find N-th Fibonacci number'),
    testCases: [
      { input: '6', expected_output: '8', is_hidden: false, sample_name: 'Sample 1' },
      { input: '0', expected_output: '0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '10', expected_output: '55', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '20', expected_output: '6765', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 39,
    external_problem_id: 'tcs-039',
    title: '039. Print Fibonacci series up to N terms',
    slug: 'tcs-039-fibonacci-series-up-to-n-terms',
    difficulty: 'EASY',
    tags: ['Number Theory', 'TCS NQT'],
    input_format: 'A single positive integer N.',
    output_format: 'Print the first N terms of the Fibonacci series separated by spaces.',
    constraints: '1 <= N <= 40',
    description: formatDescription(
      'Fibonacci Series up to N terms',
      'Print the first N numbers of the Fibonacci sequence starting with 0, 1, 1, 2, ...',
      'Single integer N.',
      'First N Fibonacci numbers separated by space.',
      '1 <= N <= 40',
      [{ input: '5', output: '0 1 1 2 3' }]
    ),
    starter_code: makeStarterCode('Print first N Fibonacci terms'),
    testCases: [
      { input: '5', expected_output: '0 1 1 2 3', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2', expected_output: '0 1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '7', expected_output: '0 1 1 2 3 5 8', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10', expected_output: '0 1 1 2 3 5 8 13 21 34', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 40,
    external_problem_id: 'tcs-040',
    title: '040. Find power a^b efficiently',
    slug: 'tcs-040-power-a-b-efficiently',
    difficulty: 'EASY',
    tags: ['Number Theory', 'Binary Exponentiation', 'TCS NQT'],
    input_format: 'Two space-separated non-negative integers A and B.',
    output_format: 'Print A raised to power B (A^B).',
    constraints: '0 <= A <= 20, 0 <= B <= 30 (A and B not both 0)',
    description: formatDescription(
      'Power A^B',
      'Calculate A^B efficiently using binary exponentiation (in O(log B) time).',
      'Two integers A and B.',
      'A^B.',
      '0 <= A <= 20, 0 <= B <= 30',
      [{ input: '2 10', output: '1024' }]
    ),
    starter_code: makeStarterCode('Compute A^B using binary exponentiation'),
    testCases: [
      { input: '2 10', expected_output: '1024', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3 4', expected_output: '81', is_hidden: false, sample_name: 'Sample 2' },
      { input: '5 0', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 16', expected_output: '65536', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10 5', expected_output: '100000', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 41,
    external_problem_id: 'tcs-041',
    title: '041. Convert decimal to binary',
    slug: 'tcs-041-decimal-to-binary',
    difficulty: 'EASY',
    tags: ['Number Theory', 'Bit Manipulation', 'TCS NQT'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print the binary representation of N as a string.',
    constraints: '0 <= N <= 10^9',
    description: formatDescription(
      'Decimal to Binary',
      'Convert a decimal integer N into its binary string representation.',
      'Single integer N.',
      'Binary string.',
      '0 <= N <= 10^9',
      [{ input: '10', output: '1010' }, { input: '0', output: '0' }]
    ),
    starter_code: makeStarterCode('Convert decimal N to binary string'),
    testCases: [
      { input: '10', expected_output: '1010', is_hidden: false, sample_name: 'Sample 1' },
      { input: '0', expected_output: '0', is_hidden: false, sample_name: 'Sample 2' },
      { input: '7', expected_output: '111', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '16', expected_output: '10000', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '255', expected_output: '11111111', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 42,
    external_problem_id: 'tcs-042',
    title: '042. Convert binary to decimal',
    slug: 'tcs-042-binary-to-decimal',
    difficulty: 'EASY',
    tags: ['Number Theory', 'Bit Manipulation', 'TCS NQT'],
    input_format: 'A binary string B.',
    output_format: 'Print the decimal integer value of B.',
    constraints: 'Length of B <= 31, B contains only 0s and 1s',
    description: formatDescription(
      'Binary to Decimal',
      'Convert a given binary string into its decimal integer equivalent.',
      'Binary string B.',
      'Decimal integer.',
      'Length of B <= 31',
      [{ input: '1010', output: '10' }]
    ),
    starter_code: makeStarterCode('Convert binary string B to decimal integer'),
    testCases: [
      { input: '1010', expected_output: '10', is_hidden: false, sample_name: 'Sample 1' },
      { input: '111', expected_output: '7', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '10000', expected_output: '16', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '11111111', expected_output: '255', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 43,
    external_problem_id: 'tcs-043',
    title: '043. Convert decimal to octal and hexadecimal',
    slug: 'tcs-043-decimal-to-octal-hexadecimal',
    difficulty: 'EASY',
    tags: ['Number Theory', 'Radix Conversion', 'TCS NQT'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print the octal representation on line 1, and uppercase hexadecimal representation on line 2.',
    constraints: '0 <= N <= 10^9',
    description: formatDescription(
      'Decimal to Octal and Hexadecimal',
      'Convert decimal integer N into base-8 (octal) and base-16 (hexadecimal in UPPERCASE).',
      'Single integer N.',
      'Line 1: Octal. Line 2: Hexadecimal (UPPERCASE).',
      '0 <= N <= 10^9',
      [{ input: '100', output: '144\n64' }, { input: '255', output: '377\nFF' }]
    ),
    starter_code: makeStarterCode('Convert N to octal and uppercase hexadecimal'),
    testCases: [
      { input: '100', expected_output: '144\n64', is_hidden: false, sample_name: 'Sample 1' },
      { input: '255', expected_output: '377\nFF', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: '0\n0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '16', expected_output: '20\n10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1024', expected_output: '2000\n400', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 44,
    external_problem_id: 'tcs-044',
    title: '044. Count set bits in an integer',
    slug: 'tcs-044-count-set-bits-in-integer',
    difficulty: 'EASY',
    tags: ['Number Theory', 'Bit Manipulation', 'TCS NQT'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print the count of 1s in the binary representation of N (popcount).',
    constraints: '0 <= N <= 10^18',
    description: formatDescription(
      'Count Set Bits (Brian Kernighan)',
      'Count the number of set bits (1s) in the binary representation of the integer N.',
      'Single integer N.',
      'Number of set bits.',
      '0 <= N <= 10^18',
      [{ input: '9', output: '2', explanation: '9 in binary is 1001 (2 set bits)' }]
    ),
    starter_code: makeStarterCode('Count set bits in N using bitwise operations'),
    testCases: [
      { input: '9', expected_output: '2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '7', expected_output: '3', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '15', expected_output: '4', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1024', expected_output: '1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 45,
    external_problem_id: 'tcs-045',
    title: '045. Check whether a number is a power of two',
    slug: 'tcs-045-check-power-of-two',
    difficulty: 'EASY',
    tags: ['Number Theory', 'Bit Manipulation', 'TCS NQT'],
    input_format: 'A single positive integer N.',
    output_format: 'Print "true" if N is a power of two, otherwise "false".',
    constraints: '1 <= N <= 10^18',
    description: formatDescription(
      'Power of Two',
      'Check whether an integer N > 0 is a power of two. Can be verified via bitwise check (N & (N - 1)) == 0.',
      'Single integer N.',
      'true or false.',
      '1 <= N <= 10^18',
      [{ input: '16', output: 'true' }, { input: '18', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if N is a power of two using (N & (N-1)) == 0'),
    testCases: [
      { input: '16', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '18', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1024', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '100', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

