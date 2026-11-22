// BCE/scripts/tcs-sheet/group1_fundamentals.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 1,
    external_problem_id: 'tcs-001',
    title: '001. Print a message and read input in the required format',
    slug: 'tcs-001-print-message-read-input',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'TCS NQT', 'Basic IO'],
    input_format: 'First line contains an integer N, followed by a string S.',
    output_format: 'Print "Welcome to TCS Coding: " followed by the string S and the integer N separated by a comma.',
    constraints: '1 <= N <= 10^5, Length of string S <= 100',
    description: formatDescription(
      'Print a message and read input',
      'Read an integer N and a string S from standard input. Format and print them according to the given output specification.',
      'First line contains an integer N, followed by a string S.',
      'Print "Welcome to TCS Coding: " followed by the string S and the integer N separated by a comma.',
      '1 <= N <= 10^5, Length of string S <= 100',
      [
        { input: '10\nAditya', output: 'Welcome to TCS Coding: Aditya, 10', explanation: 'Read integer 10 and string Aditya, format as Welcome to TCS Coding: Aditya, 10' },
        { input: '42\nNinja', output: 'Welcome to TCS Coding: Ninja, 42' }
      ]
    ),
    starter_code: makeStarterCode('Read integer N and string S, print formatted message'),
    testCases: [
      { input: '10\nAditya', expected_output: 'Welcome to TCS Coding: Aditya, 10', is_hidden: false, sample_name: 'Sample 1' },
      { input: '42\nNinja', expected_output: 'Welcome to TCS Coding: Ninja, 42', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1\nDeveloper', expected_output: 'Welcome to TCS Coding: Developer, 1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '9999\nTCS_NQT', expected_output: 'Welcome to TCS Coding: TCS_NQT, 9999', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '50\nSmartLearn', expected_output: 'Welcome to TCS Coding: SmartLearn, 50', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 2,
    external_problem_id: 'tcs-002',
    title: '002. Add, subtract, multiply and divide two numbers',
    slug: 'tcs-002-add-subtract-multiply-divide',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Arithmetic Operations'],
    input_format: 'Two space-separated integers A and B (B != 0).',
    output_format: 'Print four lines containing: sum, difference (A - B), product (A * B), and integer quotient (A / B).',
    constraints: '-10^4 <= A, B <= 10^4, B != 0',
    description: formatDescription(
      'Arithmetic Operations',
      'Given two numbers A and B, compute their sum, difference, product, and integer quotient.',
      'Two space-separated integers A and B (B != 0).',
      'Four lines containing sum, difference, product, and integer quotient.',
      '-10^4 <= A, B <= 10^4, B != 0',
      [
        { input: '10 5', output: '15\n5\n50\n2', explanation: '10+5=15, 10-5=5, 10*5=50, 10/5=2' }
      ]
    ),
    starter_code: makeStarterCode('Read A and B, print sum, difference, product, quotient'),
    testCases: [
      { input: '10 5', expected_output: '15\n5\n50\n2', is_hidden: false, sample_name: 'Sample 1' },
      { input: '20 4', expected_output: '24\n16\n80\n5', is_hidden: false, sample_name: 'Sample 2' },
      { input: '7 2', expected_output: '9\n5\n14\n3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '100 10', expected_output: '110\n90\n1000\n10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '-10 2', expected_output: '-8\n-12\n-20\n-5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 3,
    external_problem_id: 'tcs-003',
    title: '003. Swap two numbers (with and without a temporary variable)',
    slug: 'tcs-003-swap-two-numbers',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Bitwise & Basic'],
    input_format: 'Two integers A and B separated by a space.',
    output_format: 'Print the swapped values of A and B separated by a space.',
    constraints: '-10^6 <= A, B <= 10^6',
    description: formatDescription(
      'Swap two numbers',
      'Given two integers A and B, swap their values and print the result. Try solving it without using an auxiliary variable.',
      'Two space-separated integers A and B.',
      'Print the swapped values A and B separated by space.',
      '-10^6 <= A, B <= 10^6',
      [
        { input: '5 10', output: '10 5', explanation: 'A becomes 10, B becomes 5.' }
      ]
    ),
    starter_code: makeStarterCode('Swap values of A and B and print'),
    testCases: [
      { input: '5 10', expected_output: '10 5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '99 1', expected_output: '1 99', is_hidden: false, sample_name: 'Sample 2' },
      { input: '-4 8', expected_output: '8 -4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '0 50', expected_output: '50 0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '12345 67890', expected_output: '67890 12345', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 4,
    external_problem_id: 'tcs-004',
    title: '004. Find the largest of three numbers',
    slug: 'tcs-004-largest-of-three-numbers',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Conditionals'],
    input_format: 'Three space-separated integers A, B, and C.',
    output_format: 'Print the largest integer among A, B, and C.',
    constraints: '-10^9 <= A, B, C <= 10^9',
    description: formatDescription(
      'Largest of three numbers',
      'Given three integers A, B, and C, determine and print the maximum value.',
      'Three space-separated integers A, B, and C.',
      'A single integer which is the largest.',
      '-10^9 <= A, B, C <= 10^9',
      [
        { input: '12 45 32', output: '45', explanation: '45 is greater than 12 and 32.' }
      ]
    ),
    starter_code: makeStarterCode('Find max of A, B, C'),
    testCases: [
      { input: '12 45 32', expected_output: '45', is_hidden: false, sample_name: 'Sample 1' },
      { input: '10 10 5', expected_output: '10', is_hidden: false, sample_name: 'Sample 2' },
      { input: '-5 -2 -10', expected_output: '-2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '100 200 150', expected_output: '200', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '0 0 0', expected_output: '0', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 5,
    external_problem_id: 'tcs-005',
    title: '005. Check whether a number is even or odd',
    slug: 'tcs-005-check-even-or-odd',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Conditionals'],
    input_format: 'A single integer N.',
    output_format: 'Print "Even" if N is even, otherwise print "Odd".',
    constraints: '-10^9 <= N <= 10^9',
    description: formatDescription(
      'Check Even or Odd',
      'Given an integer N, check if it is divisible by 2. Print "Even" if it is, else print "Odd".',
      'A single integer N.',
      'Print "Even" or "Odd".',
      '-10^9 <= N <= 10^9',
      [
        { input: '4', output: 'Even' },
        { input: '7', output: 'Odd' }
      ]
    ),
    starter_code: makeStarterCode('Check if N is even or odd'),
    testCases: [
      { input: '4', expected_output: 'Even', is_hidden: false, sample_name: 'Sample 1' },
      { input: '7', expected_output: 'Odd', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: 'Even', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '-11', expected_output: 'Odd', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1000000', expected_output: 'Even', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 6,
    external_problem_id: 'tcs-006',
    title: '006. Check positive, negative or zero',
    slug: 'tcs-006-check-positive-negative-zero',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Conditionals'],
    input_format: 'A single integer N.',
    output_format: 'Print "Positive", "Negative", or "Zero".',
    constraints: '-10^9 <= N <= 10^9',
    description: formatDescription(
      'Check Positive, Negative, or Zero',
      'Determine whether the given integer N is Positive, Negative, or Zero.',
      'A single integer N.',
      'Print "Positive", "Negative", or "Zero".',
      '-10^9 <= N <= 10^9',
      [
        { input: '15', output: 'Positive' },
        { input: '-8', output: 'Negative' },
        { input: '0', output: 'Zero' }
      ]
    ),
    starter_code: makeStarterCode('Check if N is Positive, Negative, or Zero'),
    testCases: [
      { input: '15', expected_output: 'Positive', is_hidden: false, sample_name: 'Sample 1' },
      { input: '-8', expected_output: 'Negative', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: 'Zero', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '999999', expected_output: 'Positive', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '-100', expected_output: 'Negative', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 7,
    external_problem_id: 'tcs-007',
    title: '007. Calculate simple and compound interest',
    slug: 'tcs-007-simple-and-compound-interest',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Math'],
    input_format: 'Three space-separated numbers: Principal P (float), Rate of interest R (float), and Time T in years (float).',
    output_format: 'Print Simple Interest and Compound Interest (compounded annually) rounded to 2 decimal places on two separate lines.',
    constraints: '1 <= P <= 10^6, 0.1 <= R <= 100, 1 <= T <= 50',
    description: formatDescription(
      'Simple and Compound Interest',
      'Calculate Simple Interest = (P * R * T) / 100 and Compound Interest = P * (1 + R/100)^T - P. Output both rounded to 2 decimal places.',
      'Three numbers: P R T.',
      'Two lines: first line SI, second line CI, formatted to 2 decimals.',
      '1 <= P <= 10^6, 0.1 <= R <= 100, 1 <= T <= 50',
      [
        { input: '1000 5 2', output: '100.00\n102.50', explanation: 'SI = 1000*5*2/100 = 100. CI = 1000*(1.05)^2 - 1000 = 102.50' }
      ]
    ),
    starter_code: makeStarterCode('Calculate and print SI and CI rounded to 2 decimal places'),
    testCases: [
      { input: '1000 5 2', expected_output: '100.00\n102.50', is_hidden: false, sample_name: 'Sample 1' },
      { input: '5000 10 3', expected_output: '1500.00\n1655.00', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2000 4 1', expected_output: '80.00\n80.00', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '10000 8 4', expected_output: '3200.00\n3604.89', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '2500 6.5 2', expected_output: '325.00\n335.56', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 8,
    external_problem_id: 'tcs-008',
    title: '008. Convert Celsius to Fahrenheit and vice versa',
    slug: 'tcs-008-celsius-to-fahrenheit-conversion',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Math'],
    input_format: 'Type of conversion (1 for C to F, 2 for F to C) followed by the temperature value.',
    output_format: 'Print the converted temperature rounded to 2 decimal places.',
    constraints: '-200 <= Temp <= 500',
    description: formatDescription(
      'Temperature Conversion',
      'Convert Celsius to Fahrenheit using (C * 9/5) + 32, or Fahrenheit to Celsius using (F - 32) * 5/9.',
      'Integer 1 or 2, followed by temperature.',
      'Converted temperature to 2 decimal places.',
      '-200 <= Temp <= 500',
      [
        { input: '1 100', output: '212.00', explanation: '100 C = 212.00 F' },
        { input: '2 98.6', output: '37.00', explanation: '98.6 F = 37.00 C' }
      ]
    ),
    starter_code: makeStarterCode('Convert temperature according to mode 1 or 2'),
    testCases: [
      { input: '1 100', expected_output: '212.00', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2 98.6', expected_output: '37.00', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 0', expected_output: '32.00', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 32', expected_output: '0.00', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 -40', expected_output: '-40.00', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 9,
    external_problem_id: 'tcs-009',
    title: '009. Find the ASCII value of a character',
    slug: 'tcs-009-ascii-value-of-character',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Characters'],
    input_format: 'A single character ch.',
    output_format: 'Print the ASCII integer value of ch.',
    constraints: 'Printable ASCII character',
    description: formatDescription(
      'ASCII Value of Character',
      'Given a single character, output its standard ASCII numerical code.',
      'A single character.',
      'Integer ASCII value.',
      'Printable ASCII characters (32 to 126)',
      [
        { input: 'A', output: '65' },
        { input: 'a', output: '97' }
      ]
    ),
    starter_code: makeStarterCode('Read character and print its ASCII integer value'),
    testCases: [
      { input: 'A', expected_output: '65', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'a', expected_output: '97', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: '48', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '$', expected_output: '36', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'Z', expected_output: '90', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 10,
    external_problem_id: 'tcs-010',
    title: '010. Check whether a character is an alphabet, digit or special character',
    slug: 'tcs-010-check-alphabet-digit-special',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Conditionals'],
    input_format: 'A single character ch.',
    output_format: 'Print "Alphabet", "Digit", or "Special Character".',
    constraints: 'Printable ASCII character',
    description: formatDescription(
      'Character Classification',
      'Check if the given character is an Alphabet (A-Z, a-z), a Digit (0-9), or a Special Character.',
      'Single character ch.',
      'Print "Alphabet", "Digit", or "Special Character".',
      'Valid printable character.',
      [
        { input: 'k', output: 'Alphabet' },
        { input: '7', output: 'Digit' },
        { input: '#', output: 'Special Character' }
      ]
    ),
    starter_code: makeStarterCode('Classify character as Alphabet, Digit, or Special Character'),
    testCases: [
      { input: 'k', expected_output: 'Alphabet', is_hidden: false, sample_name: 'Sample 1' },
      { input: '7', expected_output: 'Digit', is_hidden: false, sample_name: 'Sample 2' },
      { input: '#', expected_output: 'Special Character', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'Z', expected_output: 'Alphabet', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '@', expected_output: 'Special Character', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 11,
    external_problem_id: 'tcs-011',
    title: '011. Print numbers from 1 to N',
    slug: 'tcs-011-print-numbers-1-to-n',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Loops'],
    input_format: 'A single integer N.',
    output_format: 'Print space-separated numbers from 1 up to N.',
    constraints: '1 <= N <= 10^4',
    description: formatDescription(
      'Print 1 to N',
      'Given an integer N, print all integers from 1 up to N separated by spaces.',
      'Single integer N.',
      'Space-separated integers from 1 to N.',
      '1 <= N <= 10^4',
      [
        { input: '5', output: '1 2 3 4 5' }
      ]
    ),
    starter_code: makeStarterCode('Loop from 1 to N and print'),
    testCases: [
      { input: '5', expected_output: '1 2 3 4 5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '3', expected_output: '1 2 3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '7', expected_output: '1 2 3 4 5 6 7', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10', expected_output: '1 2 3 4 5 6 7 8 9 10', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 12,
    external_problem_id: 'tcs-012',
    title: '012. Print all even and odd numbers in a range',
    slug: 'tcs-012-even-odd-numbers-in-range',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Loops'],
    input_format: 'Two space-separated integers L and R (L <= R).',
    output_format: 'First line: space-separated even numbers in [L, R]. Second line: space-separated odd numbers in [L, R].',
    constraints: '1 <= L <= R <= 10^4',
    description: formatDescription(
      'Even and Odd in Range',
      'Given a range [L, R], print all even numbers on the first line and all odd numbers on the second line.',
      'Two integers L and R.',
      'Line 1: Evens. Line 2: Odds.',
      '1 <= L <= R <= 10^4',
      [
        { input: '1 6', output: '2 4 6\n1 3 5' }
      ]
    ),
    starter_code: makeStarterCode('Print evens then odds in range [L, R]'),
    testCases: [
      { input: '1 6', expected_output: '2 4 6\n1 3 5', is_hidden: false, sample_name: 'Sample 1' },
      { input: '4 8', expected_output: '4 6 8\n5 7', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2 2', expected_output: '2\n', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3 3', expected_output: '\n3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10 15', expected_output: '10 12 14\n11 13 15', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 13,
    external_problem_id: 'tcs-013',
    title: '013. Find the sum of first N natural numbers',
    slug: 'tcs-013-sum-of-first-n-natural-numbers',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Math'],
    input_format: 'A single integer N.',
    output_format: 'Print the sum of first N natural numbers: N*(N+1)/2.',
    constraints: '1 <= N <= 10^6',
    description: formatDescription(
      'Sum of first N natural numbers',
      'Calculate the sum 1 + 2 + ... + N using the formula N*(N+1)/2.',
      'Single integer N.',
      'Single integer sum.',
      '1 <= N <= 10^6',
      [
        { input: '5', output: '15', explanation: '1+2+3+4+5 = 15' },
        { input: '10', output: '55' }
      ]
    ),
    starter_code: makeStarterCode('Calculate sum 1..N using formula or loop'),
    testCases: [
      { input: '5', expected_output: '15', is_hidden: false, sample_name: 'Sample 1' },
      { input: '10', expected_output: '55', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '100', expected_output: '5050', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1000', expected_output: '500500', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 14,
    external_problem_id: 'tcs-014',
    title: '014. Generate multiplication table of a number',
    slug: 'tcs-014-multiplication-table',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Loops'],
    input_format: 'A single integer N.',
    output_format: 'Print 10 lines, each formatted as "N x i = Result" for i from 1 to 10.',
    constraints: '1 <= N <= 1000',
    description: formatDescription(
      'Multiplication Table',
      'Generate the standard multiplication table for N from 1 to 10.',
      'A single integer N.',
      '10 lines in format "N x i = result".',
      '1 <= N <= 1000',
      [
        { input: '5', output: '5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50' }
      ]
    ),
    starter_code: makeStarterCode('Print multiplication table for N from 1 to 10'),
    testCases: [
      { input: '5', expected_output: '5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n5 x 6 = 30\n5 x 7 = 35\n5 x 8 = 40\n5 x 9 = 45\n5 x 10 = 50', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2', expected_output: '2 x 1 = 2\n2 x 2 = 4\n2 x 3 = 6\n2 x 4 = 8\n2 x 5 = 10\n2 x 6 = 12\n2 x 7 = 14\n2 x 8 = 16\n2 x 9 = 18\n2 x 10 = 20', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: '1 x 1 = 1\n1 x 2 = 2\n1 x 3 = 3\n1 x 4 = 4\n1 x 5 = 5\n1 x 6 = 6\n1 x 7 = 7\n1 x 8 = 8\n1 x 9 = 9\n1 x 10 = 10', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '7', expected_output: '7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n7 x 4 = 28\n7 x 5 = 35\n7 x 6 = 42\n7 x 7 = 49\n7 x 8 = 56\n7 x 9 = 63\n7 x 10 = 70', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '12', expected_output: '12 x 1 = 12\n12 x 2 = 24\n12 x 3 = 36\n12 x 4 = 48\n12 x 5 = 60\n12 x 6 = 72\n12 x 7 = 84\n12 x 8 = 96\n12 x 9 = 108\n12 x 10 = 120', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 15,
    external_problem_id: 'tcs-015',
    title: '015. Print star and number triangle patterns',
    slug: 'tcs-015-star-and-number-triangle-patterns',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Pattern Printing'],
    input_format: 'An integer N representing the number of rows.',
    output_format: 'Print a right-angled triangle pattern of numbers where i-th row contains numbers from 1 to i separated by space.',
    constraints: '1 <= N <= 20',
    description: formatDescription(
      'Number Triangle Pattern',
      'Print a number triangle pattern of height N. The i-th row should contain numbers from 1 to i separated by spaces.',
      'Single integer N.',
      'N rows of numbers.',
      '1 <= N <= 20',
      [
        { input: '4', output: '1\n1 2\n1 2 3\n1 2 3 4' }
      ]
    ),
    starter_code: makeStarterCode('Print right triangle number pattern of N rows'),
    testCases: [
      { input: '4', expected_output: '1\n1 2\n1 2 3\n1 2 3 4', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2', expected_output: '1\n1 2', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3', expected_output: '1\n1 2\n1 2 3', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5', expected_output: '1\n1 2\n1 2 3\n1 2 3 4\n1 2 3 4 5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 16,
    external_problem_id: 'tcs-016',
    title: '016. Print pyramid, inverted pyramid and diamond patterns',
    slug: 'tcs-016-pyramid-and-diamond-patterns',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Pattern Printing'],
    input_format: 'An integer N representing pyramid height.',
    output_format: 'Print a star pyramid of height N with centered stars separated by spaces (row i has (N-i) spaces followed by i stars separated by space).',
    constraints: '1 <= N <= 20',
    description: formatDescription(
      'Pyramid Star Pattern',
      'Print a symmetric star pyramid of height N.',
      'Single integer N.',
      'Pyramid pattern with stars.',
      '1 <= N <= 20',
      [
        { input: '3', output: '  *\n * *\n* * *' }
      ]
    ),
    starter_code: makeStarterCode('Print centered star pyramid of height N'),
    testCases: [
      { input: '3', expected_output: '  *\n * *\n* * *', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '*', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2', expected_output: ' *\n* *', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '4', expected_output: '   *\n  * *\n * * *\n* * * *', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5', expected_output: '    *\n   * *\n  * * *\n * * * *\n* * * * *', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 17,
    external_problem_id: 'tcs-017',
    title: "017. Print Floyd's triangle",
    slug: 'tcs-017-floyds-triangle',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Pattern Printing'],
    input_format: 'An integer N (number of rows).',
    output_format: "Print Floyd's triangle of N rows where numbers start from 1 and increment continuously.",
    constraints: '1 <= N <= 20',
    description: formatDescription(
      "Floyd's Triangle",
      "Print Floyd's triangle for N rows. Each row i contains i numbers sequentially incrementing from 1.",
      'Single integer N.',
      "Floyd's triangle rows.",
      '1 <= N <= 20',
      [
        { input: '4', output: '1\n2 3\n4 5 6\n7 8 9 10' }
      ]
    ),
    starter_code: makeStarterCode("Print Floyd's triangle of N rows"),
    testCases: [
      { input: '4', expected_output: '1\n2 3\n4 5 6\n7 8 9 10', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2', expected_output: '1\n2 3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3', expected_output: '1\n2 3\n4 5 6', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '5', expected_output: '1\n2 3\n4 5 6\n7 8 9 10\n11 12 13 14 15', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 18,
    external_problem_id: 'tcs-018',
    title: "018. Print Pascal's triangle",
    slug: 'tcs-018-pascals-triangle',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Arrays', 'Math'],
    input_format: 'An integer N (number of rows).',
    output_format: "Print the first N rows of Pascal's triangle, where each row has space-separated numbers.",
    constraints: '1 <= N <= 25',
    description: formatDescription(
      "Pascal's Triangle",
      "Generate the first N rows of Pascal's triangle. Each value is the sum of the two values directly above it.",
      'Single integer N.',
      "First N rows of Pascal's triangle.",
      '1 <= N <= 25',
      [
        { input: '5', output: '1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1' }
      ]
    ),
    starter_code: makeStarterCode("Generate Pascal's Triangle up to N rows"),
    testCases: [
      { input: '5', expected_output: '1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1', is_hidden: false, sample_name: 'Sample 1' },
      { input: '1', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2', expected_output: '1\n1 1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '3', expected_output: '1\n1 1\n1 2 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '4', expected_output: '1\n1 1\n1 2 1\n1 3 3 1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 19,
    external_problem_id: 'tcs-019',
    title: '019. Find factorial using iteration',
    slug: 'tcs-019-factorial-using-iteration',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Loops', 'Math'],
    input_format: 'A single non-negative integer N.',
    output_format: 'Print N! (factorial of N).',
    constraints: '0 <= N <= 20',
    description: formatDescription(
      'Factorial using iteration',
      'Given an integer N, compute its factorial N! using an iterative loop.',
      'Single integer N.',
      'Factorial of N.',
      '0 <= N <= 20',
      [
        { input: '5', output: '120', explanation: '5 * 4 * 3 * 2 * 1 = 120' },
        { input: '0', output: '1', explanation: '0! is 1 by definition' }
      ]
    ),
    starter_code: makeStarterCode('Compute factorial of N iteratively'),
    testCases: [
      { input: '5', expected_output: '120', is_hidden: false, sample_name: 'Sample 1' },
      { input: '0', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '6', expected_output: '720', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '10', expected_output: '3628800', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 20,
    external_problem_id: 'tcs-020',
    title: '020. Build a menu-driven calculator using switch',
    slug: 'tcs-020-menu-driven-calculator',
    difficulty: 'EASY',
    tags: ['Programming Fundamentals', 'Switch Statement'],
    input_format: 'An operator (+, -, *, /) followed by two integers A and B.',
    output_format: 'Print the evaluated arithmetic result. For division, output integer quotient.',
    constraints: '-10^5 <= A, B <= 10^5, for /, B != 0',
    description: formatDescription(
      'Menu-driven Calculator',
      'Given an operator (+, -, *, /) and two integers A and B, perform the specified operation.',
      'Operator char followed by integers A and B.',
      'Result of operation.',
      'B != 0 when op is /',
      [
        { input: '+ 10 20', output: '30' },
        { input: '* 7 6', output: '42' }
      ]
    ),
    starter_code: makeStarterCode('Read operator and two numbers, perform arithmetic with switch'),
    testCases: [
      { input: '+ 10 20', expected_output: '30', is_hidden: false, sample_name: 'Sample 1' },
      { input: '* 7 6', expected_output: '42', is_hidden: false, sample_name: 'Sample 2' },
      { input: '- 50 15', expected_output: '35', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '/ 100 5', expected_output: '20', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '/ 17 3', expected_output: '5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

