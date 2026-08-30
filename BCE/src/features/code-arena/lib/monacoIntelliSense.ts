/**
 * Monaco IntelliSense Provider Module
 * 
 * Registers completion, signature help, and hover providers for:
 * C++, C, Python, Java, JavaScript
 * 
 * Features:
 * - Language keywords and built-in functions
 * - Standard library completions
 * - Context-aware member suggestions (., ->, ::)
 * - #include suggestions for C/C++
 * - Import/module suggestions
 * - User-defined symbol extraction
 * - Competitive programming snippet templates
 * - Function signature help
 * - Hover documentation
 * - Ctrl+Space manual trigger
 * - Tab/Enter acceptance
 */

import type { Monaco } from '@monaco-editor/react';

// ─── Guard: only register once ────────────────────────────────────────────────
let registered = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type M = typeof import('monaco-editor');

function kw(monaco: M, label: string, detail?: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: label,
    detail: detail || 'keyword',
  };
}

function fn(monaco: M, label: string, insertText: string, detail: string, doc?: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Function,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail,
    documentation: doc ? { value: doc } : undefined,
  };
}

function snippet(monaco: M, label: string, insertText: string, detail: string, doc?: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail,
    documentation: doc ? { value: doc } : undefined,
    sortText: `zzz_${label}`, // sort snippets after keywords/functions
  };
}

function cls(monaco: M, label: string, detail: string, doc?: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Class,
    insertText: label,
    detail,
    documentation: doc ? { value: doc } : undefined,
  };
}

function mod(monaco: M, label: string, detail: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Module,
    insertText: label,
    detail,
  };
}

function prop(monaco: M, label: string, insertText: string, detail: string, doc?: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Property,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail,
    documentation: doc ? { value: doc } : undefined,
  };
}

function method(monaco: M, label: string, insertText: string, detail: string, doc?: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Method,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail,
    documentation: doc ? { value: doc } : undefined,
  };
}

function variable(monaco: M, label: string, detail?: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Variable,
    insertText: label,
    detail: detail || 'variable',
    sortText: `aaa_${label}`, // user-defined get top priority
  };
}

function userFunction(monaco: M, label: string, detail?: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: label,
    detail: detail || 'function (user-defined)',
    sortText: `aaa_${label}`,
  };
}

function userClass(monaco: M, label: string, detail?: string): any {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Class,
    insertText: label,
    detail: detail || 'class (user-defined)',
    sortText: `aaa_${label}`,
  };
}

// ─── User-Defined Symbol Extraction ───────────────────────────────────────────

function extractUserSymbols(monaco: M, text: string, languageId: string): any[] {
  const symbols: any[] = [];
  const seen = new Set<string>();

  const add = (name: string, maker: (m: M, l: string, d?: string) => any, detail?: string) => {
    if (name && name.length > 1 && !seen.has(name)) {
      seen.add(name);
      symbols.push(maker(monaco, name, detail));
    }
  };

  if (languageId === 'cpp' || languageId === 'c') {
    // Functions: type name(
    const fnRe = /\b(?:void|int|long|double|float|char|bool|string|auto|vector|map|set|pair|ll|ull|vi|vvi|pii)\s+(\w+)\s*\(/g;
    let m;
    while ((m = fnRe.exec(text)) !== null) {
      if (!['main', 'if', 'for', 'while', 'switch', 'return'].includes(m[1])) {
        add(m[1], userFunction, `function`);
      }
    }
    // Structs / classes
    const structRe = /\b(?:struct|class)\s+(\w+)/g;
    while ((m = structRe.exec(text)) !== null) add(m[1], userClass, `struct/class`);
    // typedefs / using
    const typedefRe = /\b(?:typedef\s+\w[\w\s<>,]*\s+(\w+)|using\s+(\w+)\s*=)/g;
    while ((m = typedefRe.exec(text)) !== null) add(m[1] || m[2], userClass, `type alias`);
    // #define
    const defineRe = /#define\s+(\w+)/g;
    while ((m = defineRe.exec(text)) !== null) add(m[1], variable, `macro`);
    // Variables: common typed declarations
    const varRe = /\b(?:int|long|double|float|char|bool|string|auto|ll)\s+([\w,\s]+);/g;
    while ((m = varRe.exec(text)) !== null) {
      const vars = m[1].split(',');
      for (const v of vars) {
        const vName = v.trim().split(/[\s=[\(]/)[0];
        if (vName && vName.length > 1) add(vName, variable, `variable`);
      }
    }
  } else if (languageId === 'python') {
    // Functions
    const fnRe = /\bdef\s+(\w+)\s*\(/g;
    let m;
    while ((m = fnRe.exec(text)) !== null) add(m[1], userFunction, `function`);
    // Classes
    const clsRe = /\bclass\s+(\w+)/g;
    while ((m = clsRe.exec(text)) !== null) add(m[1], userClass, `class`);
    // Variables (top-level assignments)
    const varRe = /^(\w+)\s*=/gm;
    while ((m = varRe.exec(text)) !== null) {
      if (!['if', 'for', 'while', 'def', 'class', 'import', 'from', 'return', 'True', 'False', 'None'].includes(m[1])) {
        add(m[1], variable, `variable`);
      }
    }
  } else if (languageId === 'java') {
    // Methods
    const fnRe = /\b(?:public|private|protected|static|\s)+\s+\w+\s+(\w+)\s*\(/g;
    let m;
    while ((m = fnRe.exec(text)) !== null) {
      if (!['main', 'if', 'for', 'while'].includes(m[1])) add(m[1], userFunction, `method`);
    }
    // Classes
    const clsRe = /\bclass\s+(\w+)/g;
    while ((m = clsRe.exec(text)) !== null) add(m[1], userClass, `class`);
    // Variables
    const varRe = /\b(?:int|long|double|float|char|boolean|String|Scanner|List|Map|Set|Queue|Stack|ArrayList|HashMap|TreeMap|PriorityQueue)\s+(\w+)/g;
    while ((m = varRe.exec(text)) !== null) add(m[1], variable, `variable`);
  } else if (languageId === 'javascript') {
    // Functions
    const fnRe = /\bfunction\s+(\w+)\s*\(/g;
    let m;
    while ((m = fnRe.exec(text)) !== null) add(m[1], userFunction, `function`);
    // Arrow / const functions
    const arrowRe = /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:\(|function|\w+\s*=>)/g;
    while ((m = arrowRe.exec(text)) !== null) add(m[1], userFunction, `function`);
    // Classes
    const clsRe = /\bclass\s+(\w+)/g;
    while ((m = clsRe.exec(text)) !== null) add(m[1], userClass, `class`);
    // Variables
    const varRe = /\b(?:const|let|var)\s+(\w+)\s*=/g;
    while ((m = varRe.exec(text)) !== null) {
      if (!seen.has(m[1])) add(m[1], variable, `variable`);
    }
  }

  return symbols;
}

// ═══════════════════════════════════════════════════════════════════════════════
// C++ DATA
// ═══════════════════════════════════════════════════════════════════════════════

const CPP_KEYWORDS = [
  'alignas','alignof','and','and_eq','asm','auto','bitand','bitor','bool','break',
  'case','catch','char','char8_t','char16_t','char32_t','class','compl','concept',
  'const','consteval','constexpr','constinit','const_cast','continue','co_await',
  'co_return','co_yield','decltype','default','delete','do','double','dynamic_cast',
  'else','enum','explicit','export','extern','false','float','for','friend','goto',
  'if','inline','int','long','mutable','namespace','new','noexcept','not','not_eq',
  'nullptr','operator','or','or_eq','private','protected','public','register',
  'reinterpret_cast','requires','return','short','signed','sizeof','static',
  'static_assert','static_cast','struct','switch','template','this','thread_local',
  'throw','true','try','typedef','typeid','typename','union','unsigned','using',
  'virtual','void','volatile','wchar_t','while','xor','xor_eq',
];

const CPP_INCLUDE_HEADERS = [
  'bits/stdc++.h','iostream','vector','string','algorithm','map','set','unordered_map',
  'unordered_set','queue','stack','deque','list','array','bitset','cmath','cstdio',
  'cstdlib','cstring','climits','cfloat','numeric','functional','iomanip','sstream',
  'fstream','cassert','ctime','cctype','utility','tuple','iterator','memory',
  'chrono','thread','mutex','condition_variable','regex','complex','valarray',
  'random','type_traits',
];

const C_INCLUDE_HEADERS = [
  'stdio.h','stdlib.h','string.h','math.h','ctype.h','assert.h','errno.h',
  'float.h','limits.h','locale.h','setjmp.h','signal.h','stdarg.h','stddef.h',
  'time.h','stdbool.h','stdint.h','inttypes.h',
];

function getCppStdMembers(monaco: M): any[] {
  return [
    method(monaco, 'cout', 'cout', 'std::ostream', 'Standard output stream'),
    method(monaco, 'cin', 'cin', 'std::istream', 'Standard input stream'),
    method(monaco, 'cerr', 'cerr', 'std::ostream', 'Standard error stream'),
    method(monaco, 'endl', 'endl', 'std::endl', 'End line and flush'),
    cls(monaco, 'vector', 'std::vector<T>', 'Dynamic array'),
    cls(monaco, 'map', 'std::map<K,V>', 'Sorted key-value container'),
    cls(monaco, 'unordered_map', 'std::unordered_map<K,V>', 'Hash map'),
    cls(monaco, 'set', 'std::set<T>', 'Sorted unique elements'),
    cls(monaco, 'unordered_set', 'std::unordered_set<T>', 'Hash set'),
    cls(monaco, 'pair', 'std::pair<T1,T2>', 'Pair of two values'),
    cls(monaco, 'string', 'std::string', 'String class'),
    cls(monaco, 'queue', 'std::queue<T>', 'FIFO queue'),
    cls(monaco, 'priority_queue', 'std::priority_queue<T>', 'Max heap by default'),
    cls(monaco, 'stack', 'std::stack<T>', 'LIFO stack'),
    cls(monaco, 'deque', 'std::deque<T>', 'Double-ended queue'),
    cls(monaco, 'list', 'std::list<T>', 'Doubly linked list'),
    cls(monaco, 'array', 'std::array<T,N>', 'Fixed-size array'),
    cls(monaco, 'bitset', 'std::bitset<N>', 'Fixed-size bit sequence'),
    cls(monaco, 'tuple', 'std::tuple<Types...>', 'Fixed-size heterogeneous container'),
    fn(monaco, 'sort', 'sort(${1:begin}, ${2:end})', 'std::sort', 'Sort elements in [first, last)'),
    fn(monaco, 'reverse', 'reverse(${1:begin}, ${2:end})', 'std::reverse', 'Reverse range'),
    fn(monaco, 'min', 'min(${1:a}, ${2:b})', 'std::min', 'Return minimum'),
    fn(monaco, 'max', 'max(${1:a}, ${2:b})', 'std::max', 'Return maximum'),
    fn(monaco, 'swap', 'swap(${1:a}, ${2:b})', 'std::swap', 'Swap two values'),
    fn(monaco, 'abs', 'abs(${1:x})', 'std::abs', 'Absolute value'),
    fn(monaco, 'gcd', 'gcd(${1:a}, ${2:b})', 'std::gcd (C++17)', 'Greatest common divisor'),
    fn(monaco, 'lcm', 'lcm(${1:a}, ${2:b})', 'std::lcm (C++17)', 'Least common multiple'),
    fn(monaco, 'lower_bound', 'lower_bound(${1:begin}, ${2:end}, ${3:val})', 'std::lower_bound', 'Iterator to first element >= val'),
    fn(monaco, 'upper_bound', 'upper_bound(${1:begin}, ${2:end}, ${3:val})', 'std::upper_bound', 'Iterator to first element > val'),
    fn(monaco, 'binary_search', 'binary_search(${1:begin}, ${2:end}, ${3:val})', 'std::binary_search', 'Check if value exists in sorted range'),
    fn(monaco, 'next_permutation', 'next_permutation(${1:begin}, ${2:end})', 'std::next_permutation', 'Generate next permutation'),
    fn(monaco, 'prev_permutation', 'prev_permutation(${1:begin}, ${2:end})', 'std::prev_permutation', 'Generate previous permutation'),
    fn(monaco, 'accumulate', 'accumulate(${1:begin}, ${2:end}, ${3:init})', 'std::accumulate', 'Sum elements'),
    fn(monaco, 'unique', 'unique(${1:begin}, ${2:end})', 'std::unique', 'Remove consecutive duplicates'),
    fn(monaco, 'fill', 'fill(${1:begin}, ${2:end}, ${3:val})', 'std::fill', 'Fill range with value'),
    fn(monaco, 'count', 'count(${1:begin}, ${2:end}, ${3:val})', 'std::count', 'Count occurrences'),
    fn(monaco, 'find', 'find(${1:begin}, ${2:end}, ${3:val})', 'std::find', 'Find first occurrence'),
    fn(monaco, 'max_element', 'max_element(${1:begin}, ${2:end})', 'std::max_element', 'Iterator to max element'),
    fn(monaco, 'min_element', 'min_element(${1:begin}, ${2:end})', 'std::min_element', 'Iterator to min element'),
    fn(monaco, 'distance', 'distance(${1:first}, ${2:last})', 'std::distance', 'Distance between iterators'),
    fn(monaco, 'to_string', 'to_string(${1:val})', 'std::to_string', 'Convert number to string'),
    fn(monaco, 'stoi', 'stoi(${1:str})', 'std::stoi', 'String to int'),
    fn(monaco, 'stol', 'stol(${1:str})', 'std::stol', 'String to long'),
    fn(monaco, 'stoll', 'stoll(${1:str})', 'std::stoll', 'String to long long'),
    fn(monaco, 'getline', 'getline(${1:cin}, ${2:str})', 'std::getline', 'Read line from stream'),
    fn(monaco, 'make_pair', 'make_pair(${1:first}, ${2:second})', 'std::make_pair', 'Create a pair'),
    fn(monaco, 'make_tuple', 'make_tuple(${1:args})', 'std::make_tuple', 'Create a tuple'),
    fn(monaco, 'move', 'move(${1:arg})', 'std::move', 'Cast to rvalue reference'),
    fn(monaco, 'iota', 'iota(${1:begin}, ${2:end}, ${3:startVal})', 'std::iota', 'Fill with incrementing values'),
  ];
}

function getCppContainerMethods(monaco: M): any[] {
  return [
    method(monaco, 'push_back', 'push_back(${1:val})', 'void', 'Add element to end'),
    method(monaco, 'pop_back', 'pop_back()', 'void', 'Remove last element'),
    method(monaco, 'push_front', 'push_front(${1:val})', 'void', 'Add element to front (deque/list)'),
    method(monaco, 'pop_front', 'pop_front()', 'void', 'Remove first element (deque/list)'),
    method(monaco, 'emplace_back', 'emplace_back(${1:args})', 'void', 'Construct element at end'),
    method(monaco, 'size', 'size()', 'size_t', 'Number of elements'),
    method(monaco, 'empty', 'empty()', 'bool', 'Check if container is empty'),
    method(monaco, 'clear', 'clear()', 'void', 'Remove all elements'),
    method(monaco, 'begin', 'begin()', 'iterator', 'Iterator to first element'),
    method(monaco, 'end', 'end()', 'iterator', 'Iterator past last element'),
    method(monaco, 'rbegin', 'rbegin()', 'reverse_iterator', 'Reverse iterator to last element'),
    method(monaco, 'rend', 'rend()', 'reverse_iterator', 'Reverse iterator before first element'),
    method(monaco, 'front', 'front()', 'T&', 'Access first element'),
    method(monaco, 'back', 'back()', 'T&', 'Access last element'),
    method(monaco, 'insert', 'insert(${1:pos}, ${2:val})', 'iterator', 'Insert element'),
    method(monaco, 'erase', 'erase(${1:pos})', 'iterator', 'Erase element'),
    method(monaco, 'find', 'find(${1:key})', 'iterator', 'Find element (map/set)'),
    method(monaco, 'count', 'count(${1:key})', 'size_t', 'Count matching elements'),
    method(monaco, 'resize', 'resize(${1:n})', 'void', 'Resize container'),
    method(monaco, 'reserve', 'reserve(${1:n})', 'void', 'Reserve capacity'),
    method(monaco, 'at', 'at(${1:idx})', 'T&', 'Access element with bounds check'),
    method(monaco, 'substr', 'substr(${1:pos}, ${2:len})', 'string', 'Get substring'),
    method(monaco, 'length', 'length()', 'size_t', 'String length'),
    method(monaco, 'append', 'append(${1:str})', 'string&', 'Append string'),
    method(monaco, 'c_str', 'c_str()', 'const char*', 'Get C-string'),
    method(monaco, 'top', 'top()', 'T&', 'Access top element (stack/priority_queue)'),
    method(monaco, 'push', 'push(${1:val})', 'void', 'Push element (stack/queue)'),
    method(monaco, 'pop', 'pop()', 'void', 'Pop element (stack/queue)'),
    method(monaco, 'first', 'first', 'T1', 'First element of pair'),
    method(monaco, 'second', 'second', 'T2', 'Second element of pair'),
    method(monaco, 'swap', 'swap(${1:other})', 'void', 'Swap contents'),
    method(monaco, 'lower_bound', 'lower_bound(${1:key})', 'iterator', 'Iterator to first >= key (set/map)'),
    method(monaco, 'upper_bound', 'upper_bound(${1:key})', 'iterator', 'Iterator to first > key (set/map)'),
    method(monaco, 'data', 'data()', 'T*', 'Pointer to underlying array'),
    method(monaco, 'assign', 'assign(${1:count}, ${2:val})', 'void', 'Assign values'),
  ];
}

// ─── C Functions ──────────────────────────────────────────────────────────────

function getCFunctions(monaco: M): any[] {
  return [
    fn(monaco, 'printf', 'printf("${1:%s}\\n", ${2:args})', 'stdio.h', 'Formatted output to stdout'),
    fn(monaco, 'scanf', 'scanf("${1:%d}", &${2:var})', 'stdio.h', 'Formatted input from stdin'),
    fn(monaco, 'fprintf', 'fprintf(${1:stream}, "${2:%s}", ${3:args})', 'stdio.h', 'Formatted output to stream'),
    fn(monaco, 'fscanf', 'fscanf(${1:stream}, "${2:%d}", &${3:var})', 'stdio.h', 'Formatted input from stream'),
    fn(monaco, 'fopen', 'fopen("${1:filename}", "${2:mode}")', 'stdio.h', 'Open file'),
    fn(monaco, 'fclose', 'fclose(${1:fp})', 'stdio.h', 'Close file'),
    fn(monaco, 'fgets', 'fgets(${1:buf}, ${2:n}, ${3:stream})', 'stdio.h', 'Read line from stream'),
    fn(monaco, 'fputs', 'fputs(${1:str}, ${2:stream})', 'stdio.h', 'Write string to stream'),
    fn(monaco, 'puts', 'puts(${1:str})', 'stdio.h', 'Write string to stdout'),
    fn(monaco, 'getchar', 'getchar()', 'stdio.h', 'Read char from stdin'),
    fn(monaco, 'putchar', 'putchar(${1:c})', 'stdio.h', 'Write char to stdout'),
    fn(monaco, 'malloc', 'malloc(${1:size})', 'stdlib.h', 'Allocate memory'),
    fn(monaco, 'calloc', 'calloc(${1:nmemb}, ${2:size})', 'stdlib.h', 'Allocate and zero memory'),
    fn(monaco, 'realloc', 'realloc(${1:ptr}, ${2:size})', 'stdlib.h', 'Reallocate memory'),
    fn(monaco, 'free', 'free(${1:ptr})', 'stdlib.h', 'Free memory'),
    fn(monaco, 'atoi', 'atoi(${1:str})', 'stdlib.h', 'String to int'),
    fn(monaco, 'atol', 'atol(${1:str})', 'stdlib.h', 'String to long'),
    fn(monaco, 'atof', 'atof(${1:str})', 'stdlib.h', 'String to double'),
    fn(monaco, 'exit', 'exit(${1:status})', 'stdlib.h', 'Terminate program'),
    fn(monaco, 'abs', 'abs(${1:x})', 'stdlib.h', 'Absolute value (int)'),
    fn(monaco, 'qsort', 'qsort(${1:base}, ${2:nmemb}, ${3:size}, ${4:compar})', 'stdlib.h', 'Quick sort'),
    fn(monaco, 'bsearch', 'bsearch(&${1:key}, ${2:base}, ${3:nmemb}, ${4:size}, ${5:compar})', 'stdlib.h', 'Binary search'),
    fn(monaco, 'strlen', 'strlen(${1:str})', 'string.h', 'String length'),
    fn(monaco, 'strcpy', 'strcpy(${1:dest}, ${2:src})', 'string.h', 'Copy string'),
    fn(monaco, 'strncpy', 'strncpy(${1:dest}, ${2:src}, ${3:n})', 'string.h', 'Copy n chars'),
    fn(monaco, 'strcat', 'strcat(${1:dest}, ${2:src})', 'string.h', 'Concatenate strings'),
    fn(monaco, 'strcmp', 'strcmp(${1:s1}, ${2:s2})', 'string.h', 'Compare strings'),
    fn(monaco, 'strstr', 'strstr(${1:haystack}, ${2:needle})', 'string.h', 'Find substring'),
    fn(monaco, 'memset', 'memset(${1:ptr}, ${2:value}, ${3:num})', 'string.h', 'Fill memory block'),
    fn(monaco, 'memcpy', 'memcpy(${1:dest}, ${2:src}, ${3:n})', 'string.h', 'Copy memory block'),
    fn(monaco, 'memmove', 'memmove(${1:dest}, ${2:src}, ${3:n})', 'string.h', 'Move memory block'),
    fn(monaco, 'sqrt', 'sqrt(${1:x})', 'math.h', 'Square root'),
    fn(monaco, 'pow', 'pow(${1:base}, ${2:exp})', 'math.h', 'Power'),
    fn(monaco, 'log', 'log(${1:x})', 'math.h', 'Natural logarithm'),
    fn(monaco, 'log2', 'log2(${1:x})', 'math.h', 'Base-2 logarithm'),
    fn(monaco, 'ceil', 'ceil(${1:x})', 'math.h', 'Ceiling'),
    fn(monaco, 'floor', 'floor(${1:x})', 'math.h', 'Floor'),
    fn(monaco, 'fabs', 'fabs(${1:x})', 'math.h', 'Absolute value (double)'),
    fn(monaco, 'isalpha', 'isalpha(${1:c})', 'ctype.h', 'Check if alphabetic'),
    fn(monaco, 'isdigit', 'isdigit(${1:c})', 'ctype.h', 'Check if digit'),
    fn(monaco, 'tolower', 'tolower(${1:c})', 'ctype.h', 'Convert to lowercase'),
    fn(monaco, 'toupper', 'toupper(${1:c})', 'ctype.h', 'Convert to uppercase'),
  ];
}

// ─── C++ Competitive Programming Snippets ─────────────────────────────────────

function getCppCPSnippets(monaco: M): any[] {
  return [
    snippet(monaco, 'cp-fastio', [
      'ios_base::sync_with_stdio(false);',
      'cin.tie(NULL);',
    ].join('\n'), '[CP] Fast I/O', 'Disable sync for faster I/O'),

    snippet(monaco, 'cp-template', [
      '#include <bits/stdc++.h>',
      'using namespace std;',
      '',
      'typedef long long ll;',
      'typedef pair<int, int> pii;',
      'typedef vector<int> vi;',
      '#define pb push_back',
      '#define all(x) (x).begin(), (x).end()',
      '#define sz(x) (int)(x).size()',
      '',
      'void solve() {',
      '    ${1:// solution here}',
      '}',
      '',
      'int main() {',
      '    ios_base::sync_with_stdio(false);',
      '    cin.tie(NULL);',
      '    int t;',
      '    cin >> t;',
      '    while (t--) solve();',
      '    return 0;',
      '}',
    ].join('\n'), '[CP Template] Full CP Starter', 'Complete competitive programming template with fast I/O and typedefs'),

    snippet(monaco, 'cp-bfs', [
      'auto bfs = [&](int src) {',
      '    vector<int> dist(${1:n}, -1);',
      '    queue<int> q;',
      '    dist[src] = 0;',
      '    q.push(src);',
      '    while (!q.empty()) {',
      '        int u = q.front(); q.pop();',
      '        for (int v : adj[u]) {',
      '            if (dist[v] == -1) {',
      '                dist[v] = dist[u] + 1;',
      '                q.push(v);',
      '            }',
      '        }',
      '    }',
      '    return dist;',
      '};',
    ].join('\n'), '[CP Template] BFS', 'Breadth-first search with distance array'),

    snippet(monaco, 'cp-dfs', [
      'vector<bool> visited(${1:n}, false);',
      'function<void(int)> dfs = [&](int u) {',
      '    visited[u] = true;',
      '    for (int v : adj[u]) {',
      '        if (!visited[v]) {',
      '            dfs(v);',
      '        }',
      '    }',
      '};',
    ].join('\n'), '[CP Template] DFS', 'Depth-first search'),

    snippet(monaco, 'cp-dijkstra', [
      'auto dijkstra = [&](int src) {',
      '    vector<ll> dist(${1:n}, LLONG_MAX);',
      '    priority_queue<pair<ll,int>, vector<pair<ll,int>>, greater<>> pq;',
      '    dist[src] = 0;',
      '    pq.push({0, src});',
      '    while (!pq.empty()) {',
      '        auto [d, u] = pq.top(); pq.pop();',
      '        if (d > dist[u]) continue;',
      '        for (auto [v, w] : adj[u]) {',
      '            if (dist[u] + w < dist[v]) {',
      '                dist[v] = dist[u] + w;',
      '                pq.push({dist[v], v});',
      '            }',
      '        }',
      '    }',
      '    return dist;',
      '};',
    ].join('\n'), '[CP Template] Dijkstra', "Dijkstra's shortest path algorithm"),

    snippet(monaco, 'cp-dsu', [
      'struct DSU {',
      '    vector<int> parent, rank_;',
      '    DSU(int n) : parent(n), rank_(n, 0) {',
      '        iota(parent.begin(), parent.end(), 0);',
      '    }',
      '    int find(int x) {',
      '        if (parent[x] != x) parent[x] = find(parent[x]);',
      '        return parent[x];',
      '    }',
      '    bool unite(int x, int y) {',
      '        x = find(x); y = find(y);',
      '        if (x == y) return false;',
      '        if (rank_[x] < rank_[y]) swap(x, y);',
      '        parent[y] = x;',
      '        if (rank_[x] == rank_[y]) rank_[x]++;',
      '        return true;',
      '    }',
      '};',
    ].join('\n'), '[CP Template] DSU / Union-Find', 'Disjoint Set Union with path compression and union by rank'),

    snippet(monaco, 'cp-segtree', [
      'struct SegTree {',
      '    int n;',
      '    vector<ll> tree;',
      '    SegTree(int n) : n(n), tree(4 * n, 0) {}',
      '    void build(vector<ll>& a, int node, int start, int end) {',
      '        if (start == end) { tree[node] = a[start]; return; }',
      '        int mid = (start + end) / 2;',
      '        build(a, 2*node, start, mid);',
      '        build(a, 2*node+1, mid+1, end);',
      '        tree[node] = tree[2*node] + tree[2*node+1];',
      '    }',
      '    void update(int node, int start, int end, int idx, ll val) {',
      '        if (start == end) { tree[node] = val; return; }',
      '        int mid = (start + end) / 2;',
      '        if (idx <= mid) update(2*node, start, mid, idx, val);',
      '        else update(2*node+1, mid+1, end, idx, val);',
      '        tree[node] = tree[2*node] + tree[2*node+1];',
      '    }',
      '    ll query(int node, int start, int end, int l, int r) {',
      '        if (r < start || end < l) return 0;',
      '        if (l <= start && end <= r) return tree[node];',
      '        int mid = (start + end) / 2;',
      '        return query(2*node, start, mid, l, r) + query(2*node+1, mid+1, end, l, r);',
      '    }',
      '};',
    ].join('\n'), '[CP Template] Segment Tree', 'Segment tree for range sum queries with point updates'),

    snippet(monaco, 'cp-fenwick', [
      'struct BIT {',
      '    int n;',
      '    vector<ll> tree;',
      '    BIT(int n) : n(n), tree(n + 1, 0) {}',
      '    void update(int i, ll delta) {',
      '        for (++i; i <= n; i += i & (-i))',
      '            tree[i] += delta;',
      '    }',
      '    ll query(int i) {',
      '        ll sum = 0;',
      '        for (++i; i > 0; i -= i & (-i))',
      '            sum += tree[i];',
      '        return sum;',
      '    }',
      '    ll query(int l, int r) { return query(r) - (l ? query(l - 1) : 0); }',
      '};',
    ].join('\n'), '[CP Template] Fenwick Tree / BIT', 'Binary Indexed Tree for prefix sum queries'),

    snippet(monaco, 'cp-modpow', [
      'll modpow(ll base, ll exp, ll mod) {',
      '    ll result = 1;',
      '    base %= mod;',
      '    while (exp > 0) {',
      '        if (exp & 1) result = result * base % mod;',
      '        base = base * base % mod;',
      '        exp >>= 1;',
      '    }',
      '    return result;',
      '}',
    ].join('\n'), '[CP Template] Modular Exponentiation', 'Fast power with modulus'),

    snippet(monaco, 'cp-modinv', [
      'll modinv(ll a, ll mod) {',
      '    return modpow(a, mod - 2, mod);',
      '}',
    ].join('\n'), '[CP Template] Modular Inverse', 'Modular multiplicative inverse (mod must be prime)'),

    snippet(monaco, 'cp-sieve', [
      'vector<bool> is_prime(${1:N} + 1, true);',
      'vector<int> primes;',
      'is_prime[0] = is_prime[1] = false;',
      'for (int i = 2; i <= ${1:N}; i++) {',
      '    if (is_prime[i]) {',
      '        primes.push_back(i);',
      '        for (ll j = (ll)i * i; j <= ${1:N}; j += i)',
      '            is_prime[j] = false;',
      '    }',
      '}',
    ].join('\n'), '[CP Template] Sieve of Eratosthenes', 'Generate all primes up to N'),

    snippet(monaco, 'cp-ncr', [
      'const int MAXN = ${1:200005};',
      'const ll MOD = ${2:1000000007};',
      'll fact[MAXN], inv_fact[MAXN];',
      'void precompute() {',
      '    fact[0] = 1;',
      '    for (int i = 1; i < MAXN; i++)',
      '        fact[i] = fact[i-1] * i % MOD;',
      '    inv_fact[MAXN-1] = modpow(fact[MAXN-1], MOD-2, MOD);',
      '    for (int i = MAXN-2; i >= 0; i--)',
      '        inv_fact[i] = inv_fact[i+1] * (i+1) % MOD;',
      '}',
      'll nCr(int n, int r) {',
      '    if (r < 0 || r > n) return 0;',
      '    return fact[n] % MOD * inv_fact[r] % MOD * inv_fact[n-r] % MOD;',
      '}',
    ].join('\n'), '[CP Template] nCr with Mod Inverse', 'Binomial coefficient with modular arithmetic'),

    snippet(monaco, 'cp-topo', [
      'vector<int> topo_sort(int n, vector<vector<int>>& adj) {',
      '    vector<int> in_deg(n, 0), order;',
      '    for (int u = 0; u < n; u++)',
      '        for (int v : adj[u]) in_deg[v]++;',
      '    queue<int> q;',
      '    for (int i = 0; i < n; i++)',
      '        if (in_deg[i] == 0) q.push(i);',
      '    while (!q.empty()) {',
      '        int u = q.front(); q.pop();',
      '        order.push_back(u);',
      '        for (int v : adj[u])',
      '            if (--in_deg[v] == 0) q.push(v);',
      '    }',
      '    return order;',
      '}',
    ].join('\n'), '[CP Template] Topological Sort', "Kahn's BFS-based topological sorting"),

    snippet(monaco, 'cp-lca', [
      'const int LOG = 20;',
      'int up[${1:200005}][LOG], depth_[${1:200005}];',
      'void dfs_lca(int u, int p, int d, vector<vector<int>>& adj) {',
      '    up[u][0] = p;',
      '    depth_[u] = d;',
      '    for (int k = 1; k < LOG; k++)',
      '        up[u][k] = up[up[u][k-1]][k-1];',
      '    for (int v : adj[u])',
      '        if (v != p) dfs_lca(v, u, d + 1, adj);',
      '}',
      'int lca(int u, int v) {',
      '    if (depth_[u] < depth_[v]) swap(u, v);',
      '    int diff = depth_[u] - depth_[v];',
      '    for (int k = 0; k < LOG; k++)',
      '        if ((diff >> k) & 1) u = up[u][k];',
      '    if (u == v) return u;',
      '    for (int k = LOG - 1; k >= 0; k--)',
      '        if (up[u][k] != up[v][k]) { u = up[u][k]; v = up[v][k]; }',
      '    return up[u][0];',
      '}',
    ].join('\n'), '[CP Template] Lowest Common Ancestor', 'LCA with binary lifting'),

    snippet(monaco, 'cp-binary-search', [
      'int lo = ${1:0}, hi = ${2:n};',
      'while (lo < hi) {',
      '    int mid = lo + (hi - lo) / 2;',
      '    if (${3:check(mid)}) {',
      '        hi = mid;',
      '    } else {',
      '        lo = mid + 1;',
      '    }',
      '}',
      '// Answer is lo',
    ].join('\n'), '[CP Template] Binary Search', 'Generic binary search template'),

    snippet(monaco, 'cp-matrix-exp', [
      'typedef vector<vector<ll>> Matrix;',
      'const ll MOD = ${1:1000000007};',
      'Matrix multiply(const Matrix& A, const Matrix& B) {',
      '    int n = A.size();',
      '    Matrix C(n, vector<ll>(n, 0));',
      '    for (int i = 0; i < n; i++)',
      '        for (int k = 0; k < n; k++)',
      '            for (int j = 0; j < n; j++)',
      '                C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD;',
      '    return C;',
      '}',
      'Matrix matpow(Matrix M, ll p) {',
      '    int n = M.size();',
      '    Matrix result(n, vector<ll>(n, 0));',
      '    for (int i = 0; i < n; i++) result[i][i] = 1;',
      '    while (p > 0) {',
      '        if (p & 1) result = multiply(result, M);',
      '        M = multiply(M, M);',
      '        p >>= 1;',
      '    }',
      '    return result;',
      '}',
    ].join('\n'), '[CP Template] Matrix Exponentiation', 'Fast matrix power for linear recurrences'),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PYTHON DATA
// ═══════════════════════════════════════════════════════════════════════════════

const PYTHON_KEYWORDS = [
  'False','None','True','and','as','assert','async','await','break','class',
  'continue','def','del','elif','else','except','finally','for','from','global',
  'if','import','in','is','lambda','nonlocal','not','or','pass','raise','return',
  'try','while','with','yield',
];

function getPythonBuiltins(monaco: M): any[] {
  return [
    fn(monaco, 'print', 'print(${1:args})', 'built-in', 'Print to stdout'),
    fn(monaco, 'input', 'input(${1:prompt})', 'built-in', 'Read line from stdin'),
    fn(monaco, 'len', 'len(${1:obj})', 'built-in', 'Return length'),
    fn(monaco, 'range', 'range(${1:stop})', 'built-in', 'Generate range of numbers'),
    fn(monaco, 'int', 'int(${1:x})', 'built-in', 'Convert to integer'),
    fn(monaco, 'float', 'float(${1:x})', 'built-in', 'Convert to float'),
    fn(monaco, 'str', 'str(${1:x})', 'built-in', 'Convert to string'),
    fn(monaco, 'list', 'list(${1:iterable})', 'built-in', 'Create list'),
    fn(monaco, 'dict', 'dict(${1:})', 'built-in', 'Create dictionary'),
    fn(monaco, 'set', 'set(${1:iterable})', 'built-in', 'Create set'),
    fn(monaco, 'tuple', 'tuple(${1:iterable})', 'built-in', 'Create tuple'),
    fn(monaco, 'sorted', 'sorted(${1:iterable})', 'built-in', 'Return sorted list'),
    fn(monaco, 'reversed', 'reversed(${1:seq})', 'built-in', 'Reverse iterator'),
    fn(monaco, 'enumerate', 'enumerate(${1:iterable})', 'built-in', 'Index-value pairs'),
    fn(monaco, 'zip', 'zip(${1:iter1}, ${2:iter2})', 'built-in', 'Zip iterables'),
    fn(monaco, 'map', 'map(${1:func}, ${2:iterable})', 'built-in', 'Apply function to each item'),
    fn(monaco, 'filter', 'filter(${1:func}, ${2:iterable})', 'built-in', 'Filter items'),
    fn(monaco, 'sum', 'sum(${1:iterable})', 'built-in', 'Sum of elements'),
    fn(monaco, 'min', 'min(${1:args})', 'built-in', 'Minimum value'),
    fn(monaco, 'max', 'max(${1:args})', 'built-in', 'Maximum value'),
    fn(monaco, 'abs', 'abs(${1:x})', 'built-in', 'Absolute value'),
    fn(monaco, 'round', 'round(${1:x})', 'built-in', 'Round number'),
    fn(monaco, 'pow', 'pow(${1:base}, ${2:exp})', 'built-in', 'Power'),
    fn(monaco, 'divmod', 'divmod(${1:a}, ${2:b})', 'built-in', 'Quotient and remainder'),
    fn(monaco, 'isinstance', 'isinstance(${1:obj}, ${2:type})', 'built-in', 'Check instance type'),
    fn(monaco, 'type', 'type(${1:obj})', 'built-in', 'Get type'),
    fn(monaco, 'hasattr', 'hasattr(${1:obj}, "${2:name}")', 'built-in', 'Check attribute'),
    fn(monaco, 'getattr', 'getattr(${1:obj}, "${2:name}")', 'built-in', 'Get attribute'),
    fn(monaco, 'setattr', 'setattr(${1:obj}, "${2:name}", ${3:value})', 'built-in', 'Set attribute'),
    fn(monaco, 'chr', 'chr(${1:i})', 'built-in', 'Int to character'),
    fn(monaco, 'ord', 'ord(${1:c})', 'built-in', 'Character to int'),
    fn(monaco, 'bin', 'bin(${1:x})', 'built-in', 'Int to binary string'),
    fn(monaco, 'hex', 'hex(${1:x})', 'built-in', 'Int to hex string'),
    fn(monaco, 'oct', 'oct(${1:x})', 'built-in', 'Int to octal string'),
    fn(monaco, 'any', 'any(${1:iterable})', 'built-in', 'True if any element is true'),
    fn(monaco, 'all', 'all(${1:iterable})', 'built-in', 'True if all elements are true'),
    fn(monaco, 'open', 'open("${1:filename}", "${2:r}")', 'built-in', 'Open file'),
    fn(monaco, 'iter', 'iter(${1:obj})', 'built-in', 'Get iterator'),
    fn(monaco, 'next', 'next(${1:iterator})', 'built-in', 'Get next item'),
    fn(monaco, 'format', 'format(${1:value}, ${2:spec})', 'built-in', 'Format value'),
    fn(monaco, 'id', 'id(${1:obj})', 'built-in', 'Object identity'),
    fn(monaco, 'hash', 'hash(${1:obj})', 'built-in', 'Hash value'),
    fn(monaco, 'bool', 'bool(${1:x})', 'built-in', 'Convert to boolean'),
    fn(monaco, 'bytes', 'bytes(${1:source})', 'built-in', 'Create bytes'),
    fn(monaco, 'bytearray', 'bytearray(${1:source})', 'built-in', 'Create mutable byte array'),
    fn(monaco, 'frozenset', 'frozenset(${1:iterable})', 'built-in', 'Create immutable set'),
    fn(monaco, 'complex', 'complex(${1:real}, ${2:imag})', 'built-in', 'Create complex number'),
    fn(monaco, 'super', 'super()', 'built-in', 'Call parent class method'),
    fn(monaco, 'staticmethod', '@staticmethod', 'built-in', 'Static method decorator'),
    fn(monaco, 'classmethod', '@classmethod', 'built-in', 'Class method decorator'),
    fn(monaco, 'property', '@property', 'built-in', 'Property decorator'),
  ];
}

function getPythonImports(monaco: M): any[] {
  return [
    snippet(monaco, 'import sys', 'import sys', 'import', 'System-specific parameters'),
    snippet(monaco, 'import math', 'import math', 'import', 'Mathematical functions'),
    snippet(monaco, 'import os', 'import os', 'import', 'OS interface'),
    snippet(monaco, 'import re', 'import re', 'import', 'Regular expressions'),
    snippet(monaco, 'import json', 'import json', 'import', 'JSON encoder/decoder'),
    snippet(monaco, 'from collections import ...', 'from collections import ${1:defaultdict, Counter, deque}', 'import', 'Specialized container datatypes'),
    snippet(monaco, 'from itertools import ...', 'from itertools import ${1:permutations, combinations, product}', 'import', 'Iterator building blocks'),
    snippet(monaco, 'from functools import ...', 'from functools import ${1:lru_cache, reduce}', 'import', 'Higher-order functions'),
    snippet(monaco, 'from heapq import ...', 'from heapq import ${1:heappush, heappop, heapify}', 'import', 'Heap queue algorithm'),
    snippet(monaco, 'from bisect import ...', 'from bisect import ${1:bisect_left, bisect_right, insort}', 'import', 'Array bisection algorithm'),
    snippet(monaco, 'from typing import ...', 'from typing import ${1:List, Dict, Set, Tuple, Optional}', 'import', 'Type hints'),
    snippet(monaco, 'import string', 'import string', 'import', 'String constants'),
    snippet(monaco, 'from copy import deepcopy', 'from copy import deepcopy', 'import', 'Deep copy'),
    snippet(monaco, 'from math import ...', 'from math import ${1:gcd, sqrt, inf, ceil, floor, log2}', 'import', 'Math functions'),
  ];
}

function getPythonMethods(monaco: M): any[] {
  return [
    // List methods
    method(monaco, 'append', 'append(${1:item})', 'list', 'Add item to end'),
    method(monaco, 'extend', 'extend(${1:iterable})', 'list', 'Extend list'),
    method(monaco, 'insert', 'insert(${1:index}, ${2:item})', 'list', 'Insert at index'),
    method(monaco, 'remove', 'remove(${1:item})', 'list', 'Remove first occurrence'),
    method(monaco, 'pop', 'pop(${1:index})', 'list', 'Remove and return item'),
    method(monaco, 'clear', 'clear()', 'list', 'Remove all items'),
    method(monaco, 'index', 'index(${1:item})', 'list/str', 'Find index of item'),
    method(monaco, 'count', 'count(${1:item})', 'list/str', 'Count occurrences'),
    method(monaco, 'sort', 'sort(${1:key=None, reverse=False})', 'list', 'Sort in place'),
    method(monaco, 'reverse', 'reverse()', 'list', 'Reverse in place'),
    method(monaco, 'copy', 'copy()', 'list/dict/set', 'Shallow copy'),
    // String methods
    method(monaco, 'split', 'split(${1:sep})', 'str', 'Split string'),
    method(monaco, 'strip', 'strip()', 'str', 'Remove leading/trailing whitespace'),
    method(monaco, 'lstrip', 'lstrip()', 'str', 'Remove leading whitespace'),
    method(monaco, 'rstrip', 'rstrip()', 'str', 'Remove trailing whitespace'),
    method(monaco, 'join', 'join(${1:iterable})', 'str', 'Join iterable with string'),
    method(monaco, 'replace', 'replace(${1:old}, ${2:new})', 'str', 'Replace substring'),
    method(monaco, 'find', 'find(${1:sub})', 'str', 'Find substring index'),
    method(monaco, 'rfind', 'rfind(${1:sub})', 'str', 'Find last substring index'),
    method(monaco, 'startswith', 'startswith(${1:prefix})', 'str', 'Check prefix'),
    method(monaco, 'endswith', 'endswith(${1:suffix})', 'str', 'Check suffix'),
    method(monaco, 'upper', 'upper()', 'str', 'To uppercase'),
    method(monaco, 'lower', 'lower()', 'str', 'To lowercase'),
    method(monaco, 'title', 'title()', 'str', 'Title case'),
    method(monaco, 'capitalize', 'capitalize()', 'str', 'Capitalize first char'),
    method(monaco, 'isdigit', 'isdigit()', 'str', 'Check all digits'),
    method(monaco, 'isalpha', 'isalpha()', 'str', 'Check all alphabetic'),
    method(monaco, 'isalnum', 'isalnum()', 'str', 'Check all alphanumeric'),
    method(monaco, 'format', 'format(${1:args})', 'str', 'Format string'),
    method(monaco, 'encode', 'encode(${1:encoding})', 'str', 'Encode string'),
    method(monaco, 'zfill', 'zfill(${1:width})', 'str', 'Zero-fill string'),
    // Dict methods
    method(monaco, 'keys', 'keys()', 'dict', 'Get all keys'),
    method(monaco, 'values', 'values()', 'dict', 'Get all values'),
    method(monaco, 'items', 'items()', 'dict', 'Get key-value pairs'),
    method(monaco, 'get', 'get(${1:key}, ${2:default})', 'dict', 'Get value with default'),
    method(monaco, 'setdefault', 'setdefault(${1:key}, ${2:default})', 'dict', 'Get or set default'),
    method(monaco, 'update', 'update(${1:other})', 'dict', 'Update dictionary'),
    method(monaco, 'pop', 'pop(${1:key})', 'dict', 'Remove and return value'),
    // Set methods
    method(monaco, 'add', 'add(${1:item})', 'set', 'Add element'),
    method(monaco, 'discard', 'discard(${1:item})', 'set', 'Remove element if present'),
    method(monaco, 'union', 'union(${1:other})', 'set', 'Set union'),
    method(monaco, 'intersection', 'intersection(${1:other})', 'set', 'Set intersection'),
    method(monaco, 'difference', 'difference(${1:other})', 'set', 'Set difference'),
    method(monaco, 'issubset', 'issubset(${1:other})', 'set', 'Check subset'),
    method(monaco, 'issuperset', 'issuperset(${1:other})', 'set', 'Check superset'),
  ];
}

function getPythonCPSnippets(monaco: M): any[] {
  return [
    snippet(monaco, 'cp-input-fast', [
      'import sys',
      'input = sys.stdin.readline',
    ].join('\n'), '[CP] Fast Input', 'Redirect input for faster I/O'),

    snippet(monaco, 'cp-template-py', [
      'import sys',
      'from collections import defaultdict, Counter, deque',
      'from heapq import heappush, heappop, heapify',
      'from bisect import bisect_left, bisect_right',
      'from math import gcd, sqrt, inf, ceil, floor, log2',
      'from functools import lru_cache',
      'from itertools import permutations, combinations, accumulate',
      '',
      'input = sys.stdin.readline',
      '',
      'def solve():',
      '    ${1:pass}',
      '',
      'T = int(input())',
      'for _ in range(T):',
      '    solve()',
    ].join('\n'), '[CP Template] Full Python Starter', 'Complete competitive programming Python template'),

    snippet(monaco, 'cp-bfs-py', [
      'def bfs(src, adj, n):',
      '    dist = [-1] * n',
      '    dist[src] = 0',
      '    q = deque([src])',
      '    while q:',
      '        u = q.popleft()',
      '        for v in adj[u]:',
      '            if dist[v] == -1:',
      '                dist[v] = dist[u] + 1',
      '                q.append(v)',
      '    return dist',
    ].join('\n'), '[CP Template] BFS', 'Breadth-first search in Python'),

    snippet(monaco, 'cp-dfs-py', [
      'import sys',
      'sys.setrecursionlimit(300000)',
      '',
      'def dfs(u, adj, visited):',
      '    visited[u] = True',
      '    for v in adj[u]:',
      '        if not visited[v]:',
      '            dfs(v, adj, visited)',
    ].join('\n'), '[CP Template] DFS', 'Depth-first search in Python'),

    snippet(monaco, 'cp-dijkstra-py', [
      'import heapq',
      '',
      'def dijkstra(src, adj, n):',
      '    dist = [float("inf")] * n',
      '    dist[src] = 0',
      '    pq = [(0, src)]',
      '    while pq:',
      '        d, u = heapq.heappop(pq)',
      '        if d > dist[u]:',
      '            continue',
      '        for v, w in adj[u]:',
      '            if dist[u] + w < dist[v]:',
      '                dist[v] = dist[u] + w',
      '                heapq.heappush(pq, (dist[v], v))',
      '    return dist',
    ].join('\n'), '[CP Template] Dijkstra', "Dijkstra's shortest path in Python"),

    snippet(monaco, 'cp-dsu-py', [
      'class DSU:',
      '    def __init__(self, n):',
      '        self.parent = list(range(n))',
      '        self.rank = [0] * n',
      '    def find(self, x):',
      '        if self.parent[x] != x:',
      '            self.parent[x] = self.find(self.parent[x])',
      '        return self.parent[x]',
      '    def unite(self, x, y):',
      '        px, py = self.find(x), self.find(y)',
      '        if px == py: return False',
      '        if self.rank[px] < self.rank[py]: px, py = py, px',
      '        self.parent[py] = px',
      '        if self.rank[px] == self.rank[py]: self.rank[px] += 1',
      '        return True',
    ].join('\n'), '[CP Template] DSU / Union-Find', 'Disjoint Set Union in Python'),

    snippet(monaco, 'cp-modpow-py', [
      'def modpow(base, exp, mod):',
      '    result = 1',
      '    base %= mod',
      '    while exp > 0:',
      '        if exp & 1:',
      '            result = result * base % mod',
      '        base = base * base % mod',
      '        exp >>= 1',
      '    return result',
    ].join('\n'), '[CP Template] Modular Exponentiation', 'Fast power with modulus (or use built-in pow(b,e,m))'),

    snippet(monaco, 'cp-sieve-py', [
      'def sieve(n):',
      '    is_prime = [True] * (n + 1)',
      '    is_prime[0] = is_prime[1] = False',
      '    for i in range(2, int(n**0.5) + 1):',
      '        if is_prime[i]:',
      '            for j in range(i*i, n + 1, i):',
      '                is_prime[j] = False',
      '    return [i for i in range(2, n + 1) if is_prime[i]]',
    ].join('\n'), '[CP Template] Sieve of Eratosthenes', 'Generate all primes up to N'),

    snippet(monaco, 'cp-binary-search-py', [
      'lo, hi = ${1:0}, ${2:n}',
      'while lo < hi:',
      '    mid = (lo + hi) // 2',
      '    if ${3:check(mid)}:',
      '        hi = mid',
      '    else:',
      '        lo = mid + 1',
      '# Answer is lo',
    ].join('\n'), '[CP Template] Binary Search', 'Generic binary search template'),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// JAVA DATA
// ═══════════════════════════════════════════════════════════════════════════════

const JAVA_KEYWORDS = [
  'abstract','assert','boolean','break','byte','case','catch','char','class',
  'const','continue','default','do','double','else','enum','extends','final',
  'finally','float','for','goto','if','implements','import','instanceof','int',
  'interface','long','native','new','package','private','protected','public',
  'return','short','static','strictfp','super','switch','synchronized','this',
  'throw','throws','transient','try','void','volatile','while','var','record',
  'sealed','permits','yield',
];

function getJavaStdLib(monaco: M): any[] {
  return [
    // I/O
    cls(monaco, 'Scanner', 'java.util.Scanner', 'Read formatted input'),
    cls(monaco, 'BufferedReader', 'java.io.BufferedReader', 'Buffered character input'),
    cls(monaco, 'InputStreamReader', 'java.io.InputStreamReader', 'Byte to character stream'),
    cls(monaco, 'PrintWriter', 'java.io.PrintWriter', 'Formatted output'),
    cls(monaco, 'StringTokenizer', 'java.util.StringTokenizer', 'Tokenize string'),
    // Collections
    cls(monaco, 'ArrayList', 'java.util.ArrayList<E>', 'Resizable array'),
    cls(monaco, 'LinkedList', 'java.util.LinkedList<E>', 'Doubly linked list'),
    cls(monaco, 'HashMap', 'java.util.HashMap<K,V>', 'Hash map'),
    cls(monaco, 'TreeMap', 'java.util.TreeMap<K,V>', 'Sorted map'),
    cls(monaco, 'LinkedHashMap', 'java.util.LinkedHashMap<K,V>', 'Insertion-ordered map'),
    cls(monaco, 'HashSet', 'java.util.HashSet<E>', 'Hash set'),
    cls(monaco, 'TreeSet', 'java.util.TreeSet<E>', 'Sorted set'),
    cls(monaco, 'PriorityQueue', 'java.util.PriorityQueue<E>', 'Min heap'),
    cls(monaco, 'ArrayDeque', 'java.util.ArrayDeque<E>', 'Double-ended queue'),
    cls(monaco, 'Stack', 'java.util.Stack<E>', 'LIFO stack'),
    cls(monaco, 'Collections', 'java.util.Collections', 'Collection utilities'),
    cls(monaco, 'Arrays', 'java.util.Arrays', 'Array utilities'),
    // System
    fn(monaco, 'System.out.println', 'System.out.println(${1:args})', 'System', 'Print line to stdout'),
    fn(monaco, 'System.out.print', 'System.out.print(${1:args})', 'System', 'Print to stdout'),
    fn(monaco, 'System.err.println', 'System.err.println(${1:args})', 'System', 'Print to stderr'),
    fn(monaco, 'System.exit', 'System.exit(${1:0})', 'System', 'Terminate JVM'),
    // Math
    fn(monaco, 'Math.max', 'Math.max(${1:a}, ${2:b})', 'java.lang.Math', 'Maximum of two values'),
    fn(monaco, 'Math.min', 'Math.min(${1:a}, ${2:b})', 'java.lang.Math', 'Minimum of two values'),
    fn(monaco, 'Math.abs', 'Math.abs(${1:x})', 'java.lang.Math', 'Absolute value'),
    fn(monaco, 'Math.pow', 'Math.pow(${1:base}, ${2:exp})', 'java.lang.Math', 'Power'),
    fn(monaco, 'Math.sqrt', 'Math.sqrt(${1:x})', 'java.lang.Math', 'Square root'),
    fn(monaco, 'Math.ceil', 'Math.ceil(${1:x})', 'java.lang.Math', 'Ceiling'),
    fn(monaco, 'Math.floor', 'Math.floor(${1:x})', 'java.lang.Math', 'Floor'),
    fn(monaco, 'Math.log', 'Math.log(${1:x})', 'java.lang.Math', 'Natural logarithm'),
    fn(monaco, 'Math.round', 'Math.round(${1:x})', 'java.lang.Math', 'Round'),
    fn(monaco, 'Math.random', 'Math.random()', 'java.lang.Math', 'Random [0.0, 1.0)'),
    // String
    fn(monaco, 'Integer.parseInt', 'Integer.parseInt(${1:str})', 'java.lang.Integer', 'Parse string to int'),
    fn(monaco, 'Long.parseLong', 'Long.parseLong(${1:str})', 'java.lang.Long', 'Parse string to long'),
    fn(monaco, 'String.valueOf', 'String.valueOf(${1:val})', 'java.lang.String', 'Convert to string'),
    fn(monaco, 'Integer.toBinaryString', 'Integer.toBinaryString(${1:val})', 'java.lang.Integer', 'Int to binary string'),
  ];
}

function getJavaImports(monaco: M): any[] {
  return [
    snippet(monaco, 'import java.util.*', 'import java.util.*;', 'import', 'Java collections framework'),
    snippet(monaco, 'import java.io.*', 'import java.io.*;', 'import', 'Java I/O classes'),
    snippet(monaco, 'import java.math.*', 'import java.math.*;', 'import', 'BigInteger, BigDecimal'),
    snippet(monaco, 'import java.util.stream.*', 'import java.util.stream.*;', 'import', 'Stream API'),
    snippet(monaco, 'import java.util.function.*', 'import java.util.function.*;', 'import', 'Functional interfaces'),
  ];
}

function getJavaMethods(monaco: M): any[] {
  return [
    // Scanner methods
    method(monaco, 'nextInt', 'nextInt()', 'Scanner', 'Read next int'),
    method(monaco, 'nextLong', 'nextLong()', 'Scanner', 'Read next long'),
    method(monaco, 'nextDouble', 'nextDouble()', 'Scanner', 'Read next double'),
    method(monaco, 'nextLine', 'nextLine()', 'Scanner', 'Read next line'),
    method(monaco, 'next', 'next()', 'Scanner', 'Read next token'),
    method(monaco, 'hasNext', 'hasNext()', 'Scanner', 'Check more input'),
    method(monaco, 'hasNextInt', 'hasNextInt()', 'Scanner', 'Check int available'),
    // Collection methods
    method(monaco, 'add', 'add(${1:e})', 'Collection', 'Add element'),
    method(monaco, 'remove', 'remove(${1:obj})', 'Collection', 'Remove element'),
    method(monaco, 'contains', 'contains(${1:obj})', 'Collection', 'Check membership'),
    method(monaco, 'size', 'size()', 'Collection', 'Number of elements'),
    method(monaco, 'isEmpty', 'isEmpty()', 'Collection', 'Check empty'),
    method(monaco, 'clear', 'clear()', 'Collection', 'Remove all'),
    method(monaco, 'get', 'get(${1:index})', 'List', 'Get element at index'),
    method(monaco, 'set', 'set(${1:index}, ${2:element})', 'List', 'Set element at index'),
    method(monaco, 'indexOf', 'indexOf(${1:obj})', 'List', 'Find element index'),
    method(monaco, 'toArray', 'toArray()', 'Collection', 'Convert to array'),
    method(monaco, 'iterator', 'iterator()', 'Collection', 'Get iterator'),
    method(monaco, 'stream', 'stream()', 'Collection', 'Get stream'),
    // Map methods
    method(monaco, 'put', 'put(${1:key}, ${2:value})', 'Map', 'Put key-value pair'),
    method(monaco, 'get', 'get(${1:key})', 'Map', 'Get value by key'),
    method(monaco, 'getOrDefault', 'getOrDefault(${1:key}, ${2:defaultValue})', 'Map', 'Get value or default'),
    method(monaco, 'containsKey', 'containsKey(${1:key})', 'Map', 'Check key exists'),
    method(monaco, 'containsValue', 'containsValue(${1:value})', 'Map', 'Check value exists'),
    method(monaco, 'keySet', 'keySet()', 'Map', 'Get all keys'),
    method(monaco, 'values', 'values()', 'Map', 'Get all values'),
    method(monaco, 'entrySet', 'entrySet()', 'Map', 'Get entries'),
    // String methods
    method(monaco, 'length', 'length()', 'String', 'String length'),
    method(monaco, 'charAt', 'charAt(${1:index})', 'String', 'Char at index'),
    method(monaco, 'substring', 'substring(${1:begin}, ${2:end})', 'String', 'Get substring'),
    method(monaco, 'equals', 'equals(${1:obj})', 'Object', 'Check equality'),
    method(monaco, 'compareTo', 'compareTo(${1:other})', 'Comparable', 'Compare'),
    method(monaco, 'split', 'split("${1:regex}")', 'String', 'Split string'),
    method(monaco, 'trim', 'trim()', 'String', 'Trim whitespace'),
    method(monaco, 'toLowerCase', 'toLowerCase()', 'String', 'To lowercase'),
    method(monaco, 'toUpperCase', 'toUpperCase()', 'String', 'To uppercase'),
    method(monaco, 'toCharArray', 'toCharArray()', 'String', 'Convert to char array'),
    method(monaco, 'StringBuilder', 'StringBuilder()', 'java.lang', 'Mutable string builder'),
    // Arrays utilities
    method(monaco, 'Arrays.sort', 'Arrays.sort(${1:arr})', 'Arrays', 'Sort array'),
    method(monaco, 'Arrays.fill', 'Arrays.fill(${1:arr}, ${2:val})', 'Arrays', 'Fill array'),
    method(monaco, 'Arrays.binarySearch', 'Arrays.binarySearch(${1:arr}, ${2:key})', 'Arrays', 'Binary search'),
    method(monaco, 'Arrays.copyOf', 'Arrays.copyOf(${1:arr}, ${2:newLength})', 'Arrays', 'Copy array'),
    method(monaco, 'Arrays.toString', 'Arrays.toString(${1:arr})', 'Arrays', 'Array to string'),
    // Collections utilities
    method(monaco, 'Collections.sort', 'Collections.sort(${1:list})', 'Collections', 'Sort list'),
    method(monaco, 'Collections.reverse', 'Collections.reverse(${1:list})', 'Collections', 'Reverse list'),
    method(monaco, 'Collections.max', 'Collections.max(${1:collection})', 'Collections', 'Max element'),
    method(monaco, 'Collections.min', 'Collections.min(${1:collection})', 'Collections', 'Min element'),
    method(monaco, 'Collections.frequency', 'Collections.frequency(${1:collection}, ${2:obj})', 'Collections', 'Count occurrences'),
    // Queue / Deque
    method(monaco, 'offer', 'offer(${1:e})', 'Queue', 'Add to queue'),
    method(monaco, 'poll', 'poll()', 'Queue', 'Remove from queue'),
    method(monaco, 'peek', 'peek()', 'Queue', 'View front element'),
    method(monaco, 'push', 'push(${1:e})', 'Deque/Stack', 'Push to stack'),
    method(monaco, 'pop', 'pop()', 'Deque/Stack', 'Pop from stack'),
  ];
}

function getJavaCPSnippets(monaco: M): any[] {
  return [
    snippet(monaco, 'cp-template-java', [
      'import java.util.*;',
      'import java.io.*;',
      '',
      'public class Main {',
      '    static BufferedReader br = new BufferedReader(new InputStreamReader(System.in));',
      '    static PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));',
      '',
      '    public static void main(String[] args) throws IOException {',
      '        int t = Integer.parseInt(br.readLine().trim());',
      '        while (t-- > 0) {',
      '            solve();',
      '        }',
      '        out.flush();',
      '        out.close();',
      '    }',
      '',
      '    static void solve() throws IOException {',
      '        StringTokenizer st = new StringTokenizer(br.readLine());',
      '        ${1:// solution}',
      '    }',
      '}',
    ].join('\n'), '[CP Template] Full Java Starter', 'Fast I/O competitive programming Java template'),

    snippet(monaco, 'cp-fastio-java', [
      'static BufferedReader br = new BufferedReader(new InputStreamReader(System.in));',
      'static PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));',
    ].join('\n'), '[CP] Fast I/O', 'BufferedReader + PrintWriter for fast I/O'),
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// JAVASCRIPT DATA
// ═══════════════════════════════════════════════════════════════════════════════

const JS_KEYWORDS = [
  'async','await','break','case','catch','class','const','continue','debugger',
  'default','delete','do','else','export','extends','false','finally','for',
  'from','function','if','import','in','instanceof','let','new','null','of',
  'return','static','super','switch','this','throw','true','try','typeof',
  'undefined','var','void','while','with','yield',
];

function getJSGlobals(monaco: M): any[] {
  return [
    // Console
    fn(monaco, 'console.log', 'console.log(${1:args})', 'Console', 'Log to console'),
    fn(monaco, 'console.error', 'console.error(${1:args})', 'Console', 'Log error'),
    fn(monaco, 'console.warn', 'console.warn(${1:args})', 'Console', 'Log warning'),
    fn(monaco, 'console.table', 'console.table(${1:data})', 'Console', 'Display tabular data'),
    fn(monaco, 'console.time', 'console.time("${1:label}")', 'Console', 'Start timer'),
    fn(monaco, 'console.timeEnd', 'console.timeEnd("${1:label}")', 'Console', 'End timer'),
    // JSON
    fn(monaco, 'JSON.parse', 'JSON.parse(${1:text})', 'JSON', 'Parse JSON string'),
    fn(monaco, 'JSON.stringify', 'JSON.stringify(${1:value})', 'JSON', 'Convert to JSON string'),
    // Math
    fn(monaco, 'Math.max', 'Math.max(${1:args})', 'Math', 'Maximum value'),
    fn(monaco, 'Math.min', 'Math.min(${1:args})', 'Math', 'Minimum value'),
    fn(monaco, 'Math.abs', 'Math.abs(${1:x})', 'Math', 'Absolute value'),
    fn(monaco, 'Math.floor', 'Math.floor(${1:x})', 'Math', 'Floor'),
    fn(monaco, 'Math.ceil', 'Math.ceil(${1:x})', 'Math', 'Ceiling'),
    fn(monaco, 'Math.round', 'Math.round(${1:x})', 'Math', 'Round'),
    fn(monaco, 'Math.pow', 'Math.pow(${1:base}, ${2:exp})', 'Math', 'Power'),
    fn(monaco, 'Math.sqrt', 'Math.sqrt(${1:x})', 'Math', 'Square root'),
    fn(monaco, 'Math.random', 'Math.random()', 'Math', 'Random number [0,1)'),
    fn(monaco, 'Math.log', 'Math.log(${1:x})', 'Math', 'Natural logarithm'),
    fn(monaco, 'Math.log2', 'Math.log2(${1:x})', 'Math', 'Base-2 logarithm'),
    prop(monaco, 'Math.PI', 'Math.PI', 'Math', 'Pi constant'),
    prop(monaco, 'Math.E', 'Math.E', 'Math', "Euler's number"),
    prop(monaco, 'Infinity', 'Infinity', 'Number', 'Positive infinity'),
    prop(monaco, 'NaN', 'NaN', 'Number', 'Not a number'),
    // Object
    fn(monaco, 'Object.keys', 'Object.keys(${1:obj})', 'Object', 'Get own property keys'),
    fn(monaco, 'Object.values', 'Object.values(${1:obj})', 'Object', 'Get own property values'),
    fn(monaco, 'Object.entries', 'Object.entries(${1:obj})', 'Object', 'Get key-value pairs'),
    fn(monaco, 'Object.assign', 'Object.assign(${1:target}, ${2:source})', 'Object', 'Copy properties'),
    fn(monaco, 'Object.freeze', 'Object.freeze(${1:obj})', 'Object', 'Freeze object'),
    // Array constructors
    fn(monaco, 'Array.from', 'Array.from(${1:arrayLike})', 'Array', 'Create array from iterable'),
    fn(monaco, 'Array.isArray', 'Array.isArray(${1:value})', 'Array', 'Check if array'),
    // Global functions
    fn(monaco, 'parseInt', 'parseInt(${1:string}, ${2:10})', 'global', 'Parse integer'),
    fn(monaco, 'parseFloat', 'parseFloat(${1:string})', 'global', 'Parse float'),
    fn(monaco, 'isNaN', 'isNaN(${1:value})', 'global', 'Check NaN'),
    fn(monaco, 'isFinite', 'isFinite(${1:value})', 'global', 'Check finite'),
    fn(monaco, 'setTimeout', 'setTimeout(${1:fn}, ${2:ms})', 'global', 'Delay execution'),
    fn(monaco, 'setInterval', 'setInterval(${1:fn}, ${2:ms})', 'global', 'Repeat execution'),
    fn(monaco, 'clearTimeout', 'clearTimeout(${1:id})', 'global', 'Cancel timeout'),
    fn(monaco, 'clearInterval', 'clearInterval(${1:id})', 'global', 'Cancel interval'),
    // Promise
    fn(monaco, 'Promise.all', 'Promise.all(${1:promises})', 'Promise', 'Wait for all promises'),
    fn(monaco, 'Promise.race', 'Promise.race(${1:promises})', 'Promise', 'First settled promise'),
    fn(monaco, 'Promise.resolve', 'Promise.resolve(${1:value})', 'Promise', 'Resolved promise'),
    fn(monaco, 'Promise.reject', 'Promise.reject(${1:reason})', 'Promise', 'Rejected promise'),
    fn(monaco, 'Promise.allSettled', 'Promise.allSettled(${1:promises})', 'Promise', 'Wait for all to settle'),
    // Number
    fn(monaco, 'Number.isInteger', 'Number.isInteger(${1:value})', 'Number', 'Check if integer'),
    fn(monaco, 'Number.isFinite', 'Number.isFinite(${1:value})', 'Number', 'Check if finite'),
    prop(monaco, 'Number.MAX_SAFE_INTEGER', 'Number.MAX_SAFE_INTEGER', 'Number', 'Max safe integer'),
    prop(monaco, 'Number.MIN_SAFE_INTEGER', 'Number.MIN_SAFE_INTEGER', 'Number', 'Min safe integer'),
  ];
}

function getJSMethods(monaco: M): any[] {
  return [
    // Array methods
    method(monaco, 'push', 'push(${1:item})', 'Array', 'Add to end'),
    method(monaco, 'pop', 'pop()', 'Array', 'Remove from end'),
    method(monaco, 'shift', 'shift()', 'Array', 'Remove from start'),
    method(monaco, 'unshift', 'unshift(${1:item})', 'Array', 'Add to start'),
    method(monaco, 'slice', 'slice(${1:start}, ${2:end})', 'Array', 'Extract section'),
    method(monaco, 'splice', 'splice(${1:start}, ${2:deleteCount})', 'Array', 'Remove/insert'),
    method(monaco, 'map', 'map((${1:item}) => ${2:item})', 'Array', 'Transform elements'),
    method(monaco, 'filter', 'filter((${1:item}) => ${2:condition})', 'Array', 'Filter elements'),
    method(monaco, 'reduce', 'reduce((${1:acc}, ${2:item}) => ${3:acc + item}, ${4:initial})', 'Array', 'Reduce to single value'),
    method(monaco, 'forEach', 'forEach((${1:item}) => { ${2:} })', 'Array', 'Iterate elements'),
    method(monaco, 'find', 'find((${1:item}) => ${2:condition})', 'Array', 'Find first match'),
    method(monaco, 'findIndex', 'findIndex((${1:item}) => ${2:condition})', 'Array', 'Find first match index'),
    method(monaco, 'includes', 'includes(${1:item})', 'Array/String', 'Check membership'),
    method(monaco, 'indexOf', 'indexOf(${1:item})', 'Array/String', 'Find index'),
    method(monaco, 'lastIndexOf', 'lastIndexOf(${1:item})', 'Array/String', 'Find last index'),
    method(monaco, 'every', 'every((${1:item}) => ${2:condition})', 'Array', 'All match?'),
    method(monaco, 'some', 'some((${1:item}) => ${2:condition})', 'Array', 'Any match?'),
    method(monaco, 'sort', 'sort((${1:a}, ${2:b}) => ${3:a - b})', 'Array', 'Sort in place'),
    method(monaco, 'reverse', 'reverse()', 'Array', 'Reverse in place'),
    method(monaco, 'concat', 'concat(${1:other})', 'Array', 'Concatenate arrays'),
    method(monaco, 'flat', 'flat(${1:depth})', 'Array', 'Flatten nested array'),
    method(monaco, 'flatMap', 'flatMap((${1:item}) => ${2:result})', 'Array', 'Map then flatten'),
    method(monaco, 'fill', 'fill(${1:value})', 'Array', 'Fill with value'),
    method(monaco, 'join', 'join("${1:separator}")', 'Array', 'Join to string'),
    method(monaco, 'entries', 'entries()', 'Array/Map/Set', 'Get entries iterator'),
    method(monaco, 'keys', 'keys()', 'Array/Map/Object', 'Get keys iterator'),
    method(monaco, 'values', 'values()', 'Array/Map/Set', 'Get values iterator'),
    method(monaco, 'at', 'at(${1:index})', 'Array/String', 'Element at index (supports negative)'),
    // String methods
    method(monaco, 'split', 'split("${1:separator}")', 'String', 'Split string'),
    method(monaco, 'trim', 'trim()', 'String', 'Trim whitespace'),
    method(monaco, 'trimStart', 'trimStart()', 'String', 'Trim leading whitespace'),
    method(monaco, 'trimEnd', 'trimEnd()', 'String', 'Trim trailing whitespace'),
    method(monaco, 'replace', 'replace(${1:search}, ${2:replacement})', 'String', 'Replace first match'),
    method(monaco, 'replaceAll', 'replaceAll(${1:search}, ${2:replacement})', 'String', 'Replace all matches'),
    method(monaco, 'substring', 'substring(${1:start}, ${2:end})', 'String', 'Extract substring'),
    method(monaco, 'toLowerCase', 'toLowerCase()', 'String', 'To lowercase'),
    method(monaco, 'toUpperCase', 'toUpperCase()', 'String', 'To uppercase'),
    method(monaco, 'startsWith', 'startsWith("${1:prefix}")', 'String', 'Check prefix'),
    method(monaco, 'endsWith', 'endsWith("${1:suffix}")', 'String', 'Check suffix'),
    method(monaco, 'padStart', 'padStart(${1:length}, "${2:char}")', 'String', 'Pad start'),
    method(monaco, 'padEnd', 'padEnd(${1:length}, "${2:char}")', 'String', 'Pad end'),
    method(monaco, 'repeat', 'repeat(${1:count})', 'String', 'Repeat string'),
    method(monaco, 'match', 'match(${1:regex})', 'String', 'Match regex'),
    method(monaco, 'search', 'search(${1:regex})', 'String', 'Search regex'),
    method(monaco, 'charCodeAt', 'charCodeAt(${1:index})', 'String', 'Char code at index'),
    method(monaco, 'charAt', 'charAt(${1:index})', 'String', 'Char at index'),
    // Map / Set methods
    method(monaco, 'set', 'set(${1:key}, ${2:value})', 'Map', 'Set key-value'),
    method(monaco, 'get', 'get(${1:key})', 'Map', 'Get value by key'),
    method(monaco, 'has', 'has(${1:key})', 'Map/Set', 'Check key/value exists'),
    method(monaco, 'delete', 'delete(${1:key})', 'Map/Set', 'Delete entry'),
    method(monaco, 'add', 'add(${1:value})', 'Set', 'Add value'),
    method(monaco, 'clear', 'clear()', 'Map/Set', 'Clear all'),
    prop(monaco, 'size', 'size', 'Map/Set', 'Number of entries'),
    prop(monaco, 'length', 'length', 'Array/String', 'Number of elements/characters'),
    // Promise methods
    method(monaco, 'then', 'then((${1:value}) => { ${2:} })', 'Promise', 'Handle resolved'),
    method(monaco, 'catch', 'catch((${1:error}) => { ${2:} })', 'Promise', 'Handle rejected'),
    method(monaco, 'finally', 'finally(() => { ${1:} })', 'Promise', 'Always execute'),
    // Number/toString
    method(monaco, 'toString', 'toString(${1:radix})', 'Number/Object', 'Convert to string'),
    method(monaco, 'toFixed', 'toFixed(${1:digits})', 'Number', 'Fixed-point notation'),
  ];
}


// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

export function registerMonacoIntelliSense(monacoInstance: Parameters<NonNullable<Parameters<typeof import('@monaco-editor/react').default>[0]['beforeMount']>>[0]) {
  if (registered) return;
  registered = true;

  const m = monacoInstance as unknown as M;

  // ── C++ Completion Provider ─────────────────────────────────────────────────
  m.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['.', '>', ':', '#', '<'],
    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const fullText = model.getValue();
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      const suggestions: any[] = [];

      // #include suggestions
      if (/^\s*#include\s*[<"]/.test(textUntilPosition)) {
        for (const h of CPP_INCLUDE_HEADERS) {
          suggestions.push({
            label: h,
            kind: m.languages.CompletionItemKind.File,
            insertText: h,
            detail: 'C++ header',
            range,
          });
        }
        for (const h of C_INCLUDE_HEADERS) {
          suggestions.push({
            label: `c${h.replace('.h', '')}`,
            kind: m.languages.CompletionItemKind.File,
            insertText: `c${h.replace('.h', '')}`,
            detail: 'C compat header',
            range,
          });
        }
        return { suggestions };
      }

      // :: member access (std::)
      if (/\bstd\s*::\s*$/.test(textUntilPosition) || /\bstd::[\w]*$/.test(textUntilPosition)) {
        const stdMembers = getCppStdMembers(m);
        for (const s of stdMembers) suggestions.push({ ...s, range });
        return { suggestions };
      }

      // . or -> member access
      if (/\.\s*$/.test(textUntilPosition) || /->\s*$/.test(textUntilPosition)) {
        const methods = getCppContainerMethods(m);
        for (const s of methods) suggestions.push({ ...s, range });
        return { suggestions };
      }

      // Default: keywords + std functions + snippets + user symbols
      for (const k of CPP_KEYWORDS) suggestions.push({ ...kw(m, k), range });
      for (const s of getCppStdMembers(m)) suggestions.push({ ...s, range });
      for (const s of getCFunctions(m)) suggestions.push({ ...s, range });
      for (const s of getCppCPSnippets(m)) suggestions.push({ ...s, range });
      for (const s of extractUserSymbols(m, fullText, 'cpp')) suggestions.push({ ...s, range });

      return { suggestions };
    },
  });

  // ── C Completion Provider ───────────────────────────────────────────────────
  m.languages.registerCompletionItemProvider('c', {
    triggerCharacters: ['.', '>', '#', '<'],
    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const fullText = model.getValue();
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      const suggestions: any[] = [];

      // #include suggestions
      if (/^\s*#include\s*[<"]/.test(textUntilPosition)) {
        for (const h of C_INCLUDE_HEADERS) {
          suggestions.push({
            label: h,
            kind: m.languages.CompletionItemKind.File,
            insertText: h,
            detail: 'C header',
            range,
          });
        }
        return { suggestions };
      }

      // . or -> member access
      if (/\.\s*$/.test(textUntilPosition) || /->\s*$/.test(textUntilPosition)) {
        // Suggest struct-like members
        const methods = getCppContainerMethods(m);
        for (const s of methods) suggestions.push({ ...s, range });
        return { suggestions };
      }

      // C keywords
      const cKeywords = [
        'auto','break','case','char','const','continue','default','do','double',
        'else','enum','extern','float','for','goto','if','inline','int','long',
        'register','restrict','return','short','signed','sizeof','static',
        'struct','switch','typedef','union','unsigned','void','volatile','while',
        '_Bool','_Complex','_Imaginary',
      ];

      for (const k of cKeywords) suggestions.push({ ...kw(m, k), range });
      for (const s of getCFunctions(m)) suggestions.push({ ...s, range });
      for (const s of extractUserSymbols(m, fullText, 'c')) suggestions.push({ ...s, range });

      return { suggestions };
    },
  });

  // ── Python Completion Provider ──────────────────────────────────────────────
  m.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const fullText = model.getValue();
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      const suggestions: any[] = [];

      // . member access
      if (/\.\s*$/.test(textUntilPosition)) {
        for (const s of getPythonMethods(m)) suggestions.push({ ...s, range });
        return { suggestions };
      }

      // import line
      if (/^\s*(?:import|from)\s/.test(textUntilPosition)) {
        for (const s of getPythonImports(m)) suggestions.push({ ...s, range });
        return { suggestions };
      }

      // Default
      for (const k of PYTHON_KEYWORDS) suggestions.push({ ...kw(m, k), range });
      for (const s of getPythonBuiltins(m)) suggestions.push({ ...s, range });
      for (const s of getPythonImports(m)) suggestions.push({ ...s, range });
      for (const s of getPythonCPSnippets(m)) suggestions.push({ ...s, range });
      for (const s of extractUserSymbols(m, fullText, 'python')) suggestions.push({ ...s, range });

      return { suggestions };
    },
  });

  // ── Java Completion Provider ────────────────────────────────────────────────
  m.languages.registerCompletionItemProvider('java', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const fullText = model.getValue();
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      const suggestions: any[] = [];

      // . member access
      if (/\.\s*$/.test(textUntilPosition)) {
        for (const s of getJavaMethods(m)) suggestions.push({ ...s, range });
        return { suggestions };
      }

      // import line
      if (/^\s*import\s/.test(textUntilPosition)) {
        for (const s of getJavaImports(m)) suggestions.push({ ...s, range });
        return { suggestions };
      }

      // Default
      for (const k of JAVA_KEYWORDS) suggestions.push({ ...kw(m, k), range });
      for (const s of getJavaStdLib(m)) suggestions.push({ ...s, range });
      for (const s of getJavaMethods(m)) suggestions.push({ ...s, range });
      for (const s of getJavaCPSnippets(m)) suggestions.push({ ...s, range });
      for (const s of getJavaImports(m)) suggestions.push({ ...s, range });
      for (const s of extractUserSymbols(m, fullText, 'java')) suggestions.push({ ...s, range });

      return { suggestions };
    },
  });

  // ── JavaScript Completion Provider ──────────────────────────────────────────
  m.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const fullText = model.getValue();
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      const suggestions: any[] = [];

      // . member access
      if (/\.\s*$/.test(textUntilPosition)) {
        for (const s of getJSMethods(m)) suggestions.push({ ...s, range });
        return { suggestions };
      }

      // Default
      for (const k of JS_KEYWORDS) suggestions.push({ ...kw(m, k), range });
      for (const s of getJSGlobals(m)) suggestions.push({ ...s, range });
      for (const s of getJSMethods(m)) suggestions.push({ ...s, range });
      for (const s of extractUserSymbols(m, fullText, 'javascript')) suggestions.push({ ...s, range });

      return { suggestions };
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE HELP PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════

  interface SigEntry {
    label: string;
    documentation: string;
    parameters: { label: string; documentation: string }[];
  }

  const cppSignatures: Record<string, SigEntry> = {
    sort: { label: 'sort(first, last)', documentation: 'Sort elements in range [first, last)', parameters: [{ label: 'first', documentation: 'Iterator to beginning' }, { label: 'last', documentation: 'Iterator past end' }] },
    lower_bound: { label: 'lower_bound(first, last, value)', documentation: 'First element not less than value', parameters: [{ label: 'first', documentation: 'Start iterator' }, { label: 'last', documentation: 'End iterator' }, { label: 'value', documentation: 'Value to compare' }] },
    upper_bound: { label: 'upper_bound(first, last, value)', documentation: 'First element greater than value', parameters: [{ label: 'first', documentation: 'Start iterator' }, { label: 'last', documentation: 'End iterator' }, { label: 'value', documentation: 'Value to compare' }] },
    accumulate: { label: 'accumulate(first, last, init)', documentation: 'Compute sum of range starting from init', parameters: [{ label: 'first', documentation: 'Start iterator' }, { label: 'last', documentation: 'End iterator' }, { label: 'init', documentation: 'Initial value' }] },
    getline: { label: 'getline(stream, str)', documentation: 'Read line from stream', parameters: [{ label: 'stream', documentation: 'Input stream (cin)' }, { label: 'str', documentation: 'String to store result' }] },
    push_back: { label: 'push_back(value)', documentation: 'Add element to end of container', parameters: [{ label: 'value', documentation: 'Element to add' }] },
    emplace_back: { label: 'emplace_back(args...)', documentation: 'Construct element at end', parameters: [{ label: 'args', documentation: 'Constructor arguments' }] },
    substr: { label: 'substr(pos, len)', documentation: 'Get substring', parameters: [{ label: 'pos', documentation: 'Starting position' }, { label: 'len', documentation: 'Length of substring' }] },
  };

  const pySignatures: Record<string, SigEntry> = {
    print: { label: 'print(*objects, sep=" ", end="\\n")', documentation: 'Print objects to stdout', parameters: [{ label: '*objects', documentation: 'Objects to print' }, { label: 'sep', documentation: 'Separator (default space)' }, { label: 'end', documentation: 'End string (default newline)' }] },
    range: { label: 'range(start, stop, step)', documentation: 'Generate sequence of numbers', parameters: [{ label: 'start', documentation: 'Start (default 0)' }, { label: 'stop', documentation: 'End (exclusive)' }, { label: 'step', documentation: 'Step (default 1)' }] },
    sorted: { label: 'sorted(iterable, key=None, reverse=False)', documentation: 'Return sorted list', parameters: [{ label: 'iterable', documentation: 'Iterable to sort' }, { label: 'key', documentation: 'Sort key function' }, { label: 'reverse', documentation: 'Reverse order' }] },
    enumerate: { label: 'enumerate(iterable, start=0)', documentation: 'Return index-value pairs', parameters: [{ label: 'iterable', documentation: 'Iterable to enumerate' }, { label: 'start', documentation: 'Starting index' }] },
    map: { label: 'map(function, iterable)', documentation: 'Apply function to each item', parameters: [{ label: 'function', documentation: 'Function to apply' }, { label: 'iterable', documentation: 'Iterable to map over' }] },
    filter: { label: 'filter(function, iterable)', documentation: 'Filter items by function', parameters: [{ label: 'function', documentation: 'Filter function' }, { label: 'iterable', documentation: 'Iterable to filter' }] },
    zip: { label: 'zip(*iterables)', documentation: 'Zip multiple iterables', parameters: [{ label: '*iterables', documentation: 'Iterables to zip together' }] },
    open: { label: 'open(file, mode="r")', documentation: 'Open file and return file object', parameters: [{ label: 'file', documentation: 'File path' }, { label: 'mode', documentation: 'Open mode (r/w/a/rb/wb)' }] },
    len: { label: 'len(s)', documentation: 'Return length of object', parameters: [{ label: 's', documentation: 'Sequence or collection' }] },
    input: { label: 'input(prompt="")', documentation: 'Read line from stdin', parameters: [{ label: 'prompt', documentation: 'Optional prompt string' }] },
  };

  function registerSignatureProvider(languageId: string, signatures: Record<string, SigEntry>) {
    m.languages.registerSignatureHelpProvider(languageId, {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp(model, position) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        // Find the function name before the opening paren
        const match = textUntilPosition.match(/(\w+)\s*\(([^)]*)$/);
        if (!match) return null;

        const funcName = match[1];
        const sig = signatures[funcName];
        if (!sig) return null;

        // Count commas to determine active parameter
        const argsText = match[2];
        const activeParameter = (argsText.match(/,/g) || []).length;

        return {
          value: {
            signatures: [{
              label: sig.label,
              documentation: sig.documentation,
              parameters: sig.parameters.map(p => ({
                label: p.label,
                documentation: p.documentation,
              })),
            }],
            activeSignature: 0,
            activeParameter: Math.min(activeParameter, sig.parameters.length - 1),
          },
          dispose() {},
        };
      },
    });
  }

  registerSignatureProvider('cpp', cppSignatures);
  registerSignatureProvider('c', cppSignatures);
  registerSignatureProvider('python', pySignatures);

  // ═══════════════════════════════════════════════════════════════════════════
  // HOVER PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════

  const cppHoverDocs: Record<string, string> = {
    vector: '`std::vector<T>` — Dynamic array. Provides random access and amortized O(1) push_back.',
    map: '`std::map<K,V>` — Sorted associative container. O(log n) lookup, insert, delete.',
    unordered_map: '`std::unordered_map<K,V>` — Hash table. Average O(1) lookup.',
    set: '`std::set<T>` — Sorted unique elements. O(log n) operations.',
    priority_queue: '`std::priority_queue<T>` — Max heap by default. O(log n) push/pop.',
    sort: '`std::sort(first, last)` — Sort range in O(n log n) using IntroSort.',
    lower_bound: '`std::lower_bound(first, last, val)` — First element ≥ val. O(log n) for random access.',
    upper_bound: '`std::upper_bound(first, last, val)` — First element > val. O(log n) for random access.',
    accumulate: '`std::accumulate(first, last, init)` — Sum elements starting from init.',
    cin: '`std::cin` — Standard input stream. Use `>>` to read.',
    cout: '`std::cout` — Standard output stream. Use `<<` to write.',
    endl: '`std::endl` — Insert newline and flush stream.',
    string: '`std::string` — String class with dynamic storage.',
    pair: '`std::pair<T1,T2>` — Holds two values. Access via `.first` and `.second`.',
    bitset: '`std::bitset<N>` — Fixed-size bit sequence. O(N/64) bitwise ops.',
    deque: '`std::deque<T>` — Double-ended queue. O(1) push/pop at both ends.',
    stack: '`std::stack<T>` — LIFO adapter. O(1) push/pop/top.',
    queue: '`std::queue<T>` — FIFO adapter. O(1) push/pop/front.',
  };

  const pyHoverDocs: Record<string, string> = {
    print: '`print(*objects, sep=" ", end="\\n")` — Print objects to stdout.',
    range: '`range(stop)` or `range(start, stop, step)` — Immutable sequence of numbers.',
    len: '`len(s)` — Return the number of items in a container.',
    sorted: '`sorted(iterable, key=None, reverse=False)` — Return a new sorted list.',
    enumerate: '`enumerate(iterable, start=0)` — Yield (index, value) pairs.',
    map: '`map(func, iterable)` — Apply function to every item.',
    filter: '`filter(func, iterable)` — Filter items where func returns True.',
    zip: '`zip(*iterables)` — Aggregate elements from each iterable.',
    input: '`input(prompt)` — Read a line of text from stdin.',
    int: '`int(x, base=10)` — Convert to integer.',
    str: '`str(object)` — Convert to string.',
    list: '`list(iterable)` — Create a list.',
    dict: '`dict(**kwargs)` — Create a dictionary.',
    set: '`set(iterable)` — Create a set of unique elements.',
    tuple: '`tuple(iterable)` — Create an immutable tuple.',
    defaultdict: '`collections.defaultdict(factory)` — Dict with default value factory.',
    Counter: '`collections.Counter(iterable)` — Count hashable objects.',
    deque: '`collections.deque(iterable)` — Double-ended queue with O(1) append/pop.',
    heappush: '`heapq.heappush(heap, item)` — Push item onto min-heap.',
    heappop: '`heapq.heappop(heap)` — Pop smallest item from min-heap.',
    bisect_left: '`bisect.bisect_left(a, x)` — Leftmost insertion point for x in sorted list a.',
    bisect_right: '`bisect.bisect_right(a, x)` — Rightmost insertion point for x in sorted list a.',
    lru_cache: '`@functools.lru_cache(maxsize=128)` — Memoize function results.',
  };

  function registerHoverProvider(languageId: string, docs: Record<string, string>) {
    m.languages.registerHoverProvider(languageId, {
      provideHover(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const doc = docs[word.word];
        if (!doc) return null;

        return {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn,
          },
          contents: [{ value: doc }],
        };
      },
    });
  }

  registerHoverProvider('cpp', cppHoverDocs);
  registerHoverProvider('c', cppHoverDocs);
  registerHoverProvider('python', pyHoverDocs);
}

/**
 * Enhanced Monaco editor options to enable IntelliSense features.
 * Merge these into the `options` prop of each <Editor>.
 */
export const intelliSenseEditorOptions = {
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  parameterHints: { enabled: true },
  wordBasedSuggestions: 'currentDocument' as const,
  suggest: {
    showSnippets: true,
    showKeywords: true,
    snippetsPreventQuickSuggestions: false,
    localityBonus: true,
    showIcons: true,
    preview: true,
    filterGraceful: true,
  },
  tabCompletion: 'on' as const,
  acceptSuggestionOnEnter: 'on' as const,
  snippetSuggestions: 'inline' as const,
};
