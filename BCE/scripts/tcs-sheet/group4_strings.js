// BCE/scripts/tcs-sheet/group4_strings.js
const { formatDescription, makeStarterCode } = require('./common');

const problems = [
  {
    num: 76,
    external_problem_id: 'tcs-076',
    title: '076. Find string length without using a library function',
    slug: 'tcs-076-string-length-without-library',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A single line containing string S.',
    output_format: 'Print the length of string S.',
    constraints: '0 <= Length of S <= 10^5',
    description: formatDescription(
      'String Length without Library',
      'Compute the total character length of a string without calling built-in length / strlen functions.',
      'A single line string S.',
      'Length of S as integer.',
      '0 <= |S| <= 10^5',
      [{ input: 'TCSCoding', output: '9' }]
    ),
    starter_code: makeStarterCode('Iterate through string characters until terminator and count length'),
    testCases: [
      { input: 'TCSCoding', expected_output: '9', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'Hello World', expected_output: '11', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'a', expected_output: '1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1234567890', expected_output: '10', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'SmartLearnPlatform', expected_output: '18', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 77,
    external_problem_id: 'tcs-077',
    title: '077. Reverse a string',
    slug: 'tcs-077-reverse-a-string',
    difficulty: 'EASY',
    tags: ['Strings', 'Two Pointers', 'TCS NQT'],
    input_format: 'A single line string S.',
    output_format: 'Print the reversed string.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Reverse String',
      'Reverse the characters of a given string in-place.',
      'Single string S.',
      'Reversed string.',
      '1 <= |S| <= 10^5',
      [{ input: 'hello', output: 'olleh' }]
    ),
    starter_code: makeStarterCode('Reverse string characters using two pointers'),
    testCases: [
      { input: 'hello', expected_output: 'olleh', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'TCS', expected_output: 'SCT', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'racecar', expected_output: 'racecar', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '12345', expected_output: '54321', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'a', expected_output: 'a', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 78,
    external_problem_id: 'tcs-078',
    title: '078. Check whether a string is palindrome',
    slug: 'tcs-078-check-string-palindrome',
    difficulty: 'EASY',
    tags: ['Strings', 'Two Pointers', 'TCS NQT'],
    input_format: 'A single string S.',
    output_format: 'Print "true" if S is a palindrome, otherwise "false".',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Check String Palindrome',
      'Check whether the string reads the same forwards and backwards (case-sensitive).',
      'Single string S.',
      'true or false.',
      '1 <= |S| <= 10^5',
      [{ input: 'madam', output: 'true' }, { input: 'hello', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if string is a palindrome'),
    testCases: [
      { input: 'madam', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'hello', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'racecar', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'ab', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'a', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 79,
    external_problem_id: 'tcs-079',
    title: '079. Count vowels, consonants, digits and spaces',
    slug: 'tcs-079-count-vowels-consonants-digits-spaces',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A line of text S.',
    output_format: 'Print four space-separated counts: vowels, consonants, digits, and spaces.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Count Vowels, Consonants, Digits, Spaces',
      'Count the number of vowels (a, e, i, o, u case-insensitive), consonants, digits (0-9), and white spaces in string S.',
      'Line of text S.',
      'Four space-separated integers: vowels consonants digits spaces.',
      '1 <= |S| <= 10^5',
      [{ input: 'Hello World 123', output: '3 7 3 2', explanation: 'Vowels: e, o, o (3). Consonants: H, l, l, W, r, l, d (7). Digits: 1, 2, 3 (3). Spaces: 2.' }]
    ),
    starter_code: makeStarterCode('Count vowels, consonants, digits, and spaces'),
    testCases: [
      { input: 'Hello World 123', expected_output: '3 7 3 2', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'aeiou', expected_output: '5 0 0 0', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'bcdf 99', expected_output: '0 4 2 1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '12345', expected_output: '0 0 5 0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'TCS NQT 2026', expected_output: '0 6 4 2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 80,
    external_problem_id: 'tcs-080',
    title: '080. Toggle the case of each character',
    slug: 'tcs-080-toggle-case-of-each-character',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A single string S.',
    output_format: 'Print string with lowercase converted to uppercase, and uppercase to lowercase.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Toggle Case',
      'Given a string S, convert all uppercase letters to lowercase and all lowercase letters to uppercase. Other characters remain unchanged.',
      'String S.',
      'Case-toggled string.',
      '1 <= |S| <= 10^5',
      [{ input: 'HelloWorld', output: 'hELLOwORLD' }]
    ),
    starter_code: makeStarterCode('Toggle character casing'),
    testCases: [
      { input: 'HelloWorld', expected_output: 'hELLOwORLD', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'TCS', expected_output: 'tcs', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'aBcDe123', expected_output: 'AbCdE123', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '12345', expected_output: '12345', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'allsmall', expected_output: 'ALLSMALL', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 81,
    external_problem_id: 'tcs-081',
    title: '081. Convert lowercase to uppercase and vice versa',
    slug: 'tcs-081-convert-case',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'Option (1 for to-upper, 2 for to-lower) followed by string S.',
    output_format: 'Print the converted string.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Case Conversion',
      'If option is 1, convert string S completely to uppercase. If option is 2, convert string S completely to lowercase.',
      'Integer 1 or 2 followed by string S.',
      'Converted string.',
      '1 <= |S| <= 10^5',
      [{ input: '1 hello', output: 'HELLO' }, { input: '2 TCSNQT', output: 'tcsnqt' }]
    ),
    starter_code: makeStarterCode('Convert string to all uppercase (1) or all lowercase (2)'),
    testCases: [
      { input: '1 hello', expected_output: 'HELLO', is_hidden: false, sample_name: 'Sample 1' },
      { input: '2 TCSNQT', expected_output: 'tcsnqt', is_hidden: false, sample_name: 'Sample 2' },
      { input: '1 MixedCase123', expected_output: 'MIXEDCASE123', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '2 MixedCase123', expected_output: 'mixedcase123', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '1 alreadyupper', expected_output: 'ALREADYUPPER', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 82,
    external_problem_id: 'tcs-082',
    title: '082. Count frequency of each character',
    slug: 'tcs-082-count-character-frequency',
    difficulty: 'EASY',
    tags: ['Strings', 'Hashing', 'TCS NQT'],
    input_format: 'A single string S without spaces.',
    output_format: 'For each distinct character in alphabetical order, print "char: count" on a separate line.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Character Frequency in Alphabetical Order',
      'Count frequencies of each character in string S and display them in ascending alphabetical order.',
      'String S.',
      'Lines of "char: count" sorted alphabetically.',
      '1 <= |S| <= 10^5',
      [{ input: 'banana', output: 'a: 3\nb: 1\nn: 2' }]
    ),
    starter_code: makeStarterCode('Count character frequency and print in alphabetical order'),
    testCases: [
      { input: 'banana', expected_output: 'a: 3\nb: 1\nn: 2', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'tcs', expected_output: 'c: 1\ns: 1\nt: 1', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'aaaa', expected_output: 'a: 4', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'hello', expected_output: 'e: 1\nh: 1\nl: 2\no: 1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'cbba', expected_output: 'a: 1\nb: 2\nc: 1', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 83,
    external_problem_id: 'tcs-083',
    title: '083. Find the first non-repeating character',
    slug: 'tcs-083-first-non-repeating-character',
    difficulty: 'EASY',
    tags: ['Strings', 'Hashing', 'TCS NQT'],
    input_format: 'A single string S.',
    output_format: 'Print the first non-repeating character in S. If none exists, print -1.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'First Non-Repeating Character',
      'Find the first character in string S that occurs only once. If all characters repeat, print -1.',
      'String S.',
      'First unique character or -1.',
      '1 <= |S| <= 10^5',
      [{ input: 'swiss', output: 'w' }]
    ),
    starter_code: makeStarterCode('Find first non-repeating character'),
    testCases: [
      { input: 'swiss', expected_output: 'w', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'aabbcc', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'leetcode', expected_output: 'l', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'loveleetcode', expected_output: 'v', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'z', expected_output: 'z', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 84,
    external_problem_id: 'tcs-084',
    title: '084. Find the first repeating character',
    slug: 'tcs-084-first-repeating-character',
    difficulty: 'EASY',
    tags: ['Strings', 'Hashing', 'TCS NQT'],
    input_format: 'A single string S.',
    output_format: 'Print the first character that repeats (appears at least twice) traversing from left to right. If none, print -1.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'First Repeating Character',
      'Find the character whose second occurrence appears earliest in the string. If none, print -1.',
      'String S.',
      'First repeating character, or -1.',
      '1 <= |S| <= 10^5',
      [{ input: 'geeksforgeeks', output: 'e' }]
    ),
    starter_code: makeStarterCode('Track visited characters to find earliest repeating character'),
    testCases: [
      { input: 'geeksforgeeks', expected_output: 'e', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'abcdef', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'abca', expected_output: 'a', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'tcs_nqt_tcs', expected_output: 't', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'aba', expected_output: 'a', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 85,
    external_problem_id: 'tcs-085',
    title: '085. Remove duplicate characters',
    slug: 'tcs-085-remove-duplicate-characters',
    difficulty: 'EASY',
    tags: ['Strings', 'Hashing', 'TCS NQT'],
    input_format: 'A single string S.',
    output_format: 'Print string S with duplicate occurrences removed, preserving first appearance of each character.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Remove Duplicate Characters',
      'Given a string, remove all duplicate occurrences of characters, keeping only the first appearance of each.',
      'String S.',
      'String with unique characters in order.',
      '1 <= |S| <= 10^5',
      [{ input: 'programming', output: 'progamin' }]
    ),
    starter_code: makeStarterCode('Filter duplicates keeping first occurrence'),
    testCases: [
      { input: 'programming', expected_output: 'progamin', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'aaaa', expected_output: 'a', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'banana', expected_output: 'ban', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'abcdef', expected_output: 'abcdef', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'hello world', expected_output: 'helo wrd', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 86,
    external_problem_id: 'tcs-086',
    title: '086. Remove spaces from a string',
    slug: 'tcs-086-remove-spaces-from-string',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A single line string S.',
    output_format: 'Print string S with all space characters removed.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Remove Spaces from String',
      'Remove all whitespace characters from the given string and output the concatenated result.',
      'Single line string S.',
      'String without spaces.',
      '1 <= |S| <= 10^5',
      [{ input: 'TCS NQT 2026 Preparation', output: 'TCSNQT2026Preparation' }]
    ),
    starter_code: makeStarterCode('Remove space characters from string'),
    testCases: [
      { input: 'TCS NQT 2026 Preparation', expected_output: 'TCSNQT2026Preparation', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'Hello World', expected_output: 'HelloWorld', is_hidden: false, sample_name: 'Sample 2' },
      { input: '   ', expected_output: '', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'a b c d e', expected_output: 'abcde', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'NoSpaceHere', expected_output: 'NoSpaceHere', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 87,
    external_problem_id: 'tcs-087',
    title: '087. Remove all occurrences of a given character',
    slug: 'tcs-087-remove-all-occurrences-of-character',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'First line contains a character C. Second line contains string S.',
    output_format: 'Print string S with all occurrences of character C removed.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Remove Character from String',
      'Given a character C and string S, remove every occurrence of C from S.',
      'Character C on line 1, string S on line 2.',
      'String after removing C.',
      '1 <= |S| <= 10^5',
      [{ input: 'a\nbanana', output: 'bnn' }]
    ),
    starter_code: makeStarterCode('Remove all occurrences of character C from string S'),
    testCases: [
      { input: 'a\nbanana', expected_output: 'bnn', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'l\nhello world', expected_output: 'heo word', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'z\nabc', expected_output: 'abc', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'x\nxxxx', expected_output: '', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'e\nengineering', expected_output: 'nginring', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 88,
    external_problem_id: 'tcs-088',
    title: '088. Check whether two strings are anagrams',
    slug: 'tcs-088-check-anagram-strings',
    difficulty: 'EASY',
    tags: ['Strings', 'Hashing', 'TCS NQT'],
    input_format: 'Two space-separated strings S1 and S2.',
    output_format: 'Print "true" if S1 and S2 are anagrams, otherwise "false".',
    constraints: '1 <= |S1|, |S2| <= 10^5',
    description: formatDescription(
      'Check Anagrams',
      'Two strings are anagrams if they contain the same characters with the same frequencies (e.g. "listen" and "silent").',
      'Two strings S1 and S2.',
      'true or false.',
      '1 <= |S1|, |S2| <= 10^5',
      [{ input: 'listen silent', output: 'true' }, { input: 'hello world', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if S1 and S2 are anagrams using frequency count'),
    testCases: [
      { input: 'listen silent', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'hello world', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'anagram nagaram', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'rat car', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'a a', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 89,
    external_problem_id: 'tcs-089',
    title: '089. Check whether one string is a rotation of another',
    slug: 'tcs-089-check-string-rotation',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'Two space-separated strings S1 and S2.',
    output_format: 'Print "true" if S2 is a rotation of S1, otherwise "false".',
    constraints: '1 <= |S1|, |S2| <= 10^5',
    description: formatDescription(
      'Check String Rotation',
      'Determine if S2 is a valid rotation of S1. Can be checked if |S1| == |S2| and (S1 + S1) contains S2.',
      'Two strings S1 and S2.',
      'true or false.',
      '1 <= |S1|, |S2| <= 10^5',
      [{ input: 'ABCD CDAB', output: 'true' }, { input: 'ABCD ACBD', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if S2 is substring of S1+S1'),
    testCases: [
      { input: 'ABCD CDAB', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'ABCD ACBD', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'waterbottle erbottlewat', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'hello ohell', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'abc d', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 90,
    external_problem_id: 'tcs-090',
    title: '090. Count words in a sentence',
    slug: 'tcs-090-count-words-in-sentence',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A line of text S.',
    output_format: 'Print the total number of words separated by whitespace.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Count Words in a Sentence',
      'Given a sentence S, count the number of words separated by single or multiple whitespace characters.',
      'Line of text S.',
      'Integer word count.',
      '1 <= |S| <= 10^5',
      [{ input: 'TCS coding preparation 220 problems', output: '5' }]
    ),
    starter_code: makeStarterCode('Count words in string separated by spaces'),
    testCases: [
      { input: 'TCS coding preparation 220 problems', expected_output: '5', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'Hello World', expected_output: '2', is_hidden: false, sample_name: 'Sample 2' },
      { input: '   multiple   spaces   here   ', expected_output: '3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'OneWord', expected_output: '1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'Practice makes a student perfect in coding', expected_output: '7', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 91,
    external_problem_id: 'tcs-091',
    title: '091. Reverse each word in a sentence',
    slug: 'tcs-091-reverse-each-word-in-sentence',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A line of text S.',
    output_format: 'Print the sentence with the characters of each individual word reversed, keeping word order intact.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Reverse Each Word',
      'Given a sentence S, reverse each word individually while preserving their relative positions and single spaces.',
      'Sentence S.',
      'Sentence with each word reversed.',
      '1 <= |S| <= 10^5',
      [{ input: 'hello world', output: 'olleh dlrow' }]
    ),
    starter_code: makeStarterCode('Reverse characters of each word in place'),
    testCases: [
      { input: 'hello world', expected_output: 'olleh dlrow', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'TCS NQT', expected_output: 'SCT TQN', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'smart learn', expected_output: 'trams nrael', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'code', expected_output: 'edoc', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'I love programming', expected_output: 'I evol gnimmargorp', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 92,
    external_problem_id: 'tcs-092',
    title: '092. Reverse the order of words in a sentence',
    slug: 'tcs-092-reverse-order-of-words',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A line of text S.',
    output_format: 'Print the sentence with the order of words reversed, single space separated.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Reverse Words in a Sentence',
      'Given an input string s, reverse the order of the words. A word is defined as a sequence of non-space characters.',
      'Sentence S.',
      'Sentence with words reversed in order.',
      '1 <= |S| <= 10^5',
      [{ input: 'the sky is blue', output: 'blue is sky the' }]
    ),
    starter_code: makeStarterCode('Reverse words in sentence'),
    testCases: [
      { input: 'the sky is blue', expected_output: 'blue is sky the', is_hidden: false, sample_name: 'Sample 1' },
      { input: '  hello world  ', expected_output: 'world hello', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'a good   example', expected_output: 'example good a', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'single', expected_output: 'single', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'prepare for TCS NQT', expected_output: 'NQT TCS for prepare', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 93,
    external_problem_id: 'tcs-093',
    title: '093. Find the longest word in a sentence',
    slug: 'tcs-093-longest-word-in-sentence',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A sentence S.',
    output_format: 'Print the longest word in the sentence. In case of ties, output the first.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Longest Word in Sentence',
      'Find and print the word having maximum length in the given sentence.',
      'Sentence S.',
      'Longest word.',
      '1 <= |S| <= 10^5',
      [{ input: 'I love programming in Python', output: 'programming' }]
    ),
    starter_code: makeStarterCode('Find longest word in sentence'),
    testCases: [
      { input: 'I love programming in Python', expected_output: 'programming', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'TCS NQT preparation', expected_output: 'preparation', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'cat dog bat', expected_output: 'cat', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'supercalifragilistic is very long', expected_output: 'supercalifragilistic', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'hello', expected_output: 'hello', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 94,
    external_problem_id: 'tcs-094',
    title: '094. Find the smallest and largest word',
    slug: 'tcs-094-smallest-and-largest-word',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A sentence S.',
    output_format: 'Print two lines: line 1 smallest word, line 2 largest word. (Ties broken by first occurrence).',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Smallest and Largest Word',
      'Given a sentence S, find the word with the shortest length and the word with the longest length.',
      'Sentence S.',
      'Line 1: smallest word. Line 2: largest word.',
      '1 <= |S| <= 10^5',
      [{ input: 'I am learning data structures', output: 'I\nstructures' }]
    ),
    starter_code: makeStarterCode('Find smallest and largest words by length'),
    testCases: [
      { input: 'I am learning data structures', expected_output: 'I\nstructures', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'hello world', expected_output: 'hello\nhello', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'go to TCS', expected_output: 'go\nTCS', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'a ab abc abcd', expected_output: 'a\nabcd', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'competition is tough', expected_output: 'is\ncompetition', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 95,
    external_problem_id: 'tcs-095',
    title: '095. Find the most frequent character',
    slug: 'tcs-095-most-frequent-character',
    difficulty: 'EASY',
    tags: ['Strings', 'Hashing', 'TCS NQT'],
    input_format: 'A single string S without spaces.',
    output_format: 'Print the character with maximum frequency. In case of ties, output the alphabetically smallest character.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Most Frequent Character',
      'Given a string S, return the character that appears the maximum number of times. Ties broken alphabetically.',
      'String S.',
      'Most frequent character.',
      '1 <= |S| <= 10^5',
      [{ input: 'testsample', output: 'e', explanation: 'e, s, t all appear 2 times. e is alphabetically smallest.' }]
    ),
    starter_code: makeStarterCode('Find most frequent character with alphabetical tie break'),
    testCases: [
      { input: 'testsample', expected_output: 'e', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'banana', expected_output: 'a', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'abbc', expected_output: 'b', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'abcd', expected_output: 'a', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'zzzyyyxxx', expected_output: 'x', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 96,
    external_problem_id: 'tcs-096',
    title: '096. Check whether a string contains only digits',
    slug: 'tcs-096-check-string-only-digits',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'A single string S.',
    output_format: 'Print "true" if S contains only numeric digits 0-9, otherwise "false".',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Check String Only Digits',
      'Verify if every character in string S is a numerical digit between 0 and 9.',
      'String S.',
      'true or false.',
      '1 <= |S| <= 10^5',
      [{ input: '123456', output: 'true' }, { input: '123a45', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check if all characters are digits'),
    testCases: [
      { input: '123456', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: '123a45', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: '0', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'abc', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '9876543210', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 97,
    external_problem_id: 'tcs-097',
    title: '097. Run-length encode a string (e.g. aaabb → a3b2)',
    slug: 'tcs-097-run-length-encoding',
    difficulty: 'EASY',
    tags: ['Strings', 'Encoding', 'TCS NQT'],
    input_format: 'A string S of contiguous characters.',
    output_format: 'Print the compressed run-length encoded string.',
    constraints: '1 <= |S| <= 10^5',
    description: formatDescription(
      'Run-Length Encoding (RLE)',
      'Compress string S by replacing consecutive repeated characters by the character followed by its count (e.g. "aaabb" becomes "a3b2").',
      'String S.',
      'Encoded string.',
      '1 <= |S| <= 10^5',
      [{ input: 'aaabbc', output: 'a3b2c1' }]
    ),
    starter_code: makeStarterCode('Compress string using run-length encoding'),
    testCases: [
      { input: 'aaabbc', expected_output: 'a3b2c1', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'wwwwaaadexxxxxx', expected_output: 'w4a3d1e1x6', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'a', expected_output: 'a1', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'abcdef', expected_output: 'a1b1c1d1e1f1', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'aaaaa', expected_output: 'a5', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 98,
    external_problem_id: 'tcs-098',
    title: '098. Find the longest common prefix',
    slug: 'tcs-098-longest-common-prefix',
    difficulty: 'EASY',
    tags: ['Strings', 'TCS NQT'],
    input_format: 'First line contains integer N. Second line contains N space-separated strings.',
    output_format: 'Print the longest common prefix string. If no common prefix, print -1.',
    constraints: '1 <= N <= 1000, Length of strings <= 1000',
    description: formatDescription(
      'Longest Common Prefix',
      'Find the longest common prefix string amongst an array of N strings. If there is no common prefix, return -1.',
      'N followed by N strings.',
      'Longest common prefix or -1.',
      '1 <= N <= 1000',
      [{ input: '3\nflower flow flight', output: 'fl' }]
    ),
    starter_code: makeStarterCode('Find longest common prefix among strings'),
    testCases: [
      { input: '3\nflower flow flight', expected_output: 'fl', is_hidden: false, sample_name: 'Sample 1' },
      { input: '3\ndog racecar car', expected_output: '-1', is_hidden: false, sample_name: 'Sample 2' },
      { input: '2\napple app', expected_output: 'app', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '1\nalone', expected_output: 'alone', is_hidden: true, sample_name: 'Testcase 4' },
      { input: '3\ntcs_nqt tcs_prime tcs_digital', expected_output: 'tcs_', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 99,
    external_problem_id: 'tcs-099',
    title: '099. Check whether two strings are isomorphic',
    slug: 'tcs-099-check-isomorphic-strings',
    difficulty: 'EASY',
    tags: ['Strings', 'Hashing', 'TCS NQT'],
    input_format: 'Two space-separated strings S1 and S2.',
    output_format: 'Print "true" if S1 and S2 are isomorphic, otherwise "false".',
    constraints: '1 <= |S1|, |S2| <= 10^5',
    description: formatDescription(
      'Isomorphic Strings',
      'Two strings S1 and S2 are isomorphic if the characters in S1 can be replaced to get S2, preserving the order and maintaining a 1-to-1 mapping.',
      'Two strings S1 and S2.',
      'true or false.',
      '1 <= |S1|, |S2| <= 10^5',
      [{ input: 'egg add', output: 'true' }, { input: 'foo bar', output: 'false' }]
    ),
    starter_code: makeStarterCode('Check bijection character mapping between S1 and S2'),
    testCases: [
      { input: 'egg add', expected_output: 'true', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'foo bar', expected_output: 'false', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'paper title', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 3' },
      { input: 'ab ca', expected_output: 'true', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'ab aa', expected_output: 'false', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  },
  {
    num: 100,
    external_problem_id: 'tcs-100',
    title: '100. Find the longest substring without repeating characters',
    slug: 'tcs-100-longest-substring-without-repeating',
    difficulty: 'MEDIUM',
    tags: ['Strings', 'Sliding Window', 'Two Pointers', 'TCS NQT'],
    input_format: 'A single string S.',
    output_format: 'Print the length of the longest substring without repeating characters.',
    constraints: '0 <= |S| <= 10^5',
    description: formatDescription(
      'Longest Substring Without Repeating Characters',
      'Given a string S, find the length of the longest substring without duplicate characters using a sliding window and hash set / last seen map.',
      'String S.',
      'Length of longest non-repeating substring.',
      '0 <= |S| <= 10^5',
      [{ input: 'abcabcbb', output: '3', explanation: 'The answer is "abc", with length 3.' }]
    ),
    starter_code: makeStarterCode('Sliding window with hash map to find max substring length'),
    testCases: [
      { input: 'abcabcbb', expected_output: '3', is_hidden: false, sample_name: 'Sample 1' },
      { input: 'bbbbb', expected_output: '1', is_hidden: false, sample_name: 'Sample 2' },
      { input: 'pwwkew', expected_output: '3', is_hidden: true, sample_name: 'Testcase 3' },
      { input: '', expected_output: '0', is_hidden: true, sample_name: 'Testcase 4' },
      { input: 'au', expected_output: '2', is_hidden: true, sample_name: 'Testcase 5' }
    ]
  }
];

module.exports = problems;

