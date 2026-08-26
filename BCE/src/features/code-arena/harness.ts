/**
 * Dynamic Function Harness Generator for LeetCode problems in BCE Code Arena.
 * Appends or prepends driver code based on signature metadata and language.
 */

/**
 * Checks whether the student code contains a custom main() entry point.
 */
export function hasMainFunction(studentCode: string, language: string): boolean {
  if (!studentCode || typeof studentCode !== 'string') return false;
  const lang = (language || '').toLowerCase();

  if (lang.includes('cpp') || lang.includes('c') || lang.includes('gcc')) {
    return /\b(int|void)\s+main\s*\(/i.test(studentCode);
  }
  if (lang.includes('java')) {
    return /\bpublic\s+static\s+void\s+main\s*\(/i.test(studentCode);
  }
  if (lang.includes('python')) {
    return /if\s+__name__\s*==\s*['"]__main__['"]\s*:/i.test(studentCode) || /\bdef\s+main\s*\(/i.test(studentCode);
  }
  if (lang.includes('javascript') || lang.includes('js')) {
    return /\bfunction\s+main\s*\(/i.test(studentCode);
  }
  return false;
}

export function wrapCodeWithHarness(studentCode: string, signature: any, language: string): string {
  if (!signature || typeof signature !== 'object') {
    return studentCode; // Safety fallback
  }

  // If student provided a complete program containing main(), do not wrap
  if (hasMainFunction(studentCode, language)) {
    return studentCode;
  }

  const funcName = signature.name;
  const params = signature.params || [];
  const retType = signature.return?.type || 'void';

  switch (language) {
    case 'cpp17':
    case 'cpp':
      return generateCppHarness(studentCode, funcName, params, retType);
    case 'python':
    case 'python3':
      return generatePythonHarness(studentCode, funcName, params, retType);
    case 'javascript':
    case 'js':
      return generateJsHarness(studentCode, funcName, params, retType);
    case 'java':
      return generateJavaHarness(studentCode, funcName, params, retType);
    default:
      return studentCode;
  }
}

function getCppParseFunc(type: string): string {
  const norm = type.toLowerCase().replace(/\s+/g, '');
  if (norm === 'integer' || norm === 'int' || norm === 'int32_t') return 'HarnessParser::parseInteger(cin)';
  if (norm === 'long' || norm === 'longlong' || norm === 'int64_t' || norm === 'long long') return 'HarnessParser::parseLong(cin)';
  if (norm === 'float') return 'HarnessParser::parseFloat(cin)';
  if (norm === 'double') return 'HarnessParser::parseDouble(cin)';
  if (norm === 'string') return 'HarnessParser::parseString(cin)';
  if (norm === 'character' || norm === 'char') return 'HarnessParser::parseChar(cin)';
  if (norm === 'boolean' || norm === 'bool') return 'HarnessParser::parseBool(cin)';

  if (norm === 'integer[]' || norm === 'int[]' || norm === 'vector<int>' || norm === 'list<integer>') return 'HarnessParser::parseIntegerArray(cin)';
  if (norm === 'long[]' || norm === 'longlong[]' || norm === 'vector<longlong>' || norm === 'vector<long>' || norm === 'vector<long long>' || norm === 'list<long>') return 'HarnessParser::parseLongArray(cin)';
  if (norm === 'float[]' || norm === 'vector<float>' || norm === 'list<float>') return 'HarnessParser::parseFloatArray(cin)';
  if (norm === 'double[]' || norm === 'vector<double>' || norm === 'list<double>') return 'HarnessParser::parseDoubleArray(cin)';
  if (norm === 'string[]' || norm === 'vector<string>' || norm === 'list<string>') return 'HarnessParser::parseStringArray(cin)';
  if (norm === 'character[]' || norm === 'char[]' || norm === 'vector<char>' || norm === 'list<character>') return 'HarnessParser::parseCharArray(cin)';
  if (norm === 'boolean[]' || norm === 'bool[]' || norm === 'vector<bool>' || norm === 'list<boolean>') return 'HarnessParser::parseBoolArray(cin)';

  if (norm === 'integer[][]' || norm === 'int[][]' || norm === 'vector<vector<int>>' || norm === 'list<list<integer>>') return 'HarnessParser::parseIntegerMatrix(cin)';
  if (norm === 'long[][]' || norm === 'vector<vector<longlong>>' || norm === 'vector<vector<long>>' || norm === 'vector<vector<long long>>') return 'HarnessParser::parseLongMatrix(cin)';
  if (norm === 'float[][]' || norm === 'vector<vector<float>>') return 'HarnessParser::parseFloatMatrix(cin)';
  if (norm === 'double[][]' || norm === 'vector<vector<double>>') return 'HarnessParser::parseDoubleMatrix(cin)';
  if (norm === 'string[][]' || norm === 'vector<vector<string>>') return 'HarnessParser::parseStringMatrix(cin)';
  if (norm === 'character[][]' || norm === 'char[][]' || norm === 'vector<vector<char>>') return 'HarnessParser::parseCharMatrix(cin)';
  if (norm === 'boolean[][]' || norm === 'bool[][]' || norm === 'vector<vector<bool>>') return 'HarnessParser::parseBoolMatrix(cin)';

  if (norm === 'listnode') return 'HarnessParser::parseListNode(cin)';
  if (norm === 'treenode') return 'HarnessParser::parseTreeNode(cin)';

  return 'HarnessParser::parseString(cin)'; // fallback
}

function generateCppHarness(studentCode: string, funcName: string, params: any[], retType: string): string {
  const parseLines = params.map((p, idx) => {
    return `        auto arg${idx} = ${getCppParseFunc(p.type)};`;
  });
  const argsList = params.map((_, idx) => `arg${idx}`).join(', ');

  const parserLibrary = `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <queue>
#include <cctype>

using namespace std;

// Definitions
#ifndef LEETCODE_STRUCTS
#define LEETCODE_STRUCTS
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
#endif

namespace HarnessParser {
    void skipParamLabel(istream& in) {
        while (in) {
            char c;
            if (!(in >> c)) break;
            if (c == ',' || isspace(c)) continue;
            if (isalpha(c) || c == '_') {
                string token;
                token.push_back(c);
                while (in.get(c)) {
                    if (isalnum(c) || c == '_') {
                        token.push_back(c);
                    } else {
                        in.putback(c);
                        break;
                    }
                }
                while (in.get(c) && isspace(c));
                if (c == '=') {
                    continue;
                } else {
                    in.putback(c);
                    for (int i = (int)token.size() - 1; i >= 0; --i) {
                        in.putback(token[i]);
                    }
                    break;
                }
            } else {
                in.putback(c);
                break;
            }
        }
    }

    void skipWhitespaceAndChar(istream& in, char expected) {
        skipParamLabel(in);
        char c;
        while (in >> c) {
            if (c == expected) return;
        }
    }

    char peekNextChar(istream& in) {
        skipParamLabel(in);
        char c;
        if (in >> c) {
            in.putback(c);
            return c;
        }
        return '\\0';
    }

    int parseInteger(istream& in) {
        skipParamLabel(in);
        int x = 0;
        in >> x;
        return x;
    }

    long long parseLong(istream& in) {
        skipParamLabel(in);
        long long x = 0;
        in >> x;
        return x;
    }

    float parseFloat(istream& in) {
        skipParamLabel(in);
        float x = 0.0f;
        in >> x;
        return x;
    }

    double parseDouble(istream& in) {
        skipParamLabel(in);
        double x = 0.0;
        in >> x;
        return x;
    }

    bool parseBool(istream& in) {
        skipParamLabel(in);
        char c = peekNextChar(in);
        if (c == 't' || c == 'T' || c == 'f' || c == 'F') {
            string s;
            in >> s;
            transform(s.begin(), s.end(), s.begin(), ::tolower);
            return s.find("true") != string::npos;
        }
        int x = 0;
        in >> x;
        return x != 0;
    }

    char parseChar(istream& in) {
        skipParamLabel(in);
        char c;
        while (in >> c) {
            if (c == '\'') {
                char ch;
                in.get(ch);
                char endQuote;
                in >> endQuote;
                return ch;
            } else if (c == '"') {
                char ch;
                in.get(ch);
                char endQuote;
                in >> endQuote;
                return ch;
            } else {
                return c;
            }
        }
        return '\\0';
    }

    string parseString(istream& in) {
        skipParamLabel(in);
        string s;
        char c;
        while (in.get(c) && isspace(c));
        if (c == '"' || c == '\'') {
            char quote = c;
            while (in.get(c)) {
                if (c == '\\\\') {
                    char next;
                    if (in.get(next)) {
                        if (next == 'n') s.push_back('\\n');
                        else if (next == 't') s.push_back('\\t');
                        else s.push_back(next);
                    }
                } else if (c == quote) {
                    break;
                } else {
                    s.push_back(c);
                }
            }
        } else {
            s.push_back(c);
            while (in.get(c) && !isspace(c) && c != ',') {
                s.push_back(c);
            }
            if (c == ',') in.putback(c);
        }
        return s;
    }

    vector<int> parseIntegerArray(istream& in) {
        skipParamLabel(in);
        vector<int> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            skipParamLabel(in);
            int x;
            in >> x;
            res.push_back(x);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<long long> parseLongArray(istream& in) {
        skipParamLabel(in);
        vector<long long> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            skipParamLabel(in);
            long long x;
            in >> x;
            res.push_back(x);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<float> parseFloatArray(istream& in) {
        skipParamLabel(in);
        vector<float> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            skipParamLabel(in);
            float x;
            in >> x;
            res.push_back(x);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<double> parseDoubleArray(istream& in) {
        skipParamLabel(in);
        vector<double> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            skipParamLabel(in);
            double x;
            in >> x;
            res.push_back(x);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<string> parseStringArray(istream& in) {
        skipParamLabel(in);
        vector<string> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            string s = parseString(in);
            res.push_back(s);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<char> parseCharArray(istream& in) {
        vector<string> arr = parseStringArray(in);
        vector<char> res;
        for (const string& s : arr) {
            res.push_back(s.empty() ? '\\0' : s[0]);
        }
        return res;
    }

    vector<bool> parseBoolArray(istream& in) {
        skipParamLabel(in);
        vector<bool> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            bool b = parseBool(in);
            res.push_back(b);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<vector<int>> parseIntegerMatrix(istream& in) {
        skipParamLabel(in);
        vector<vector<int>> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            vector<int> row = parseIntegerArray(in);
            res.push_back(row);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<vector<long long>> parseLongMatrix(istream& in) {
        skipParamLabel(in);
        vector<vector<long long>> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            vector<long long> row = parseLongArray(in);
            res.push_back(row);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<vector<float>> parseFloatMatrix(istream& in) {
        skipParamLabel(in);
        vector<vector<float>> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            vector<float> row = parseFloatArray(in);
            res.push_back(row);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<vector<double>> parseDoubleMatrix(istream& in) {
        skipParamLabel(in);
        vector<vector<double>> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            vector<double> row = parseDoubleArray(in);
            res.push_back(row);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<vector<string>> parseStringMatrix(istream& in) {
        skipParamLabel(in);
        vector<vector<string>> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            vector<string> row = parseStringArray(in);
            res.push_back(row);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<vector<char>> parseCharMatrix(istream& in) {
        skipParamLabel(in);
        vector<vector<char>> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            vector<char> row = parseCharArray(in);
            res.push_back(row);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    vector<vector<bool>> parseBoolMatrix(istream& in) {
        skipParamLabel(in);
        vector<vector<bool>> res;
        skipWhitespaceAndChar(in, '[');
        if (peekNextChar(in) == ']') {
            skipWhitespaceAndChar(in, ']');
            return res;
        }
        while (in) {
            vector<bool> row = parseBoolArray(in);
            res.push_back(row);
            char sep;
            if (!(in >> sep)) break;
            if (sep == ']') break;
        }
        return res;
    }

    ListNode* parseListNode(istream& in) {
        vector<int> arr = parseIntegerArray(in);
        if (arr.empty()) return nullptr;
        ListNode* head = new ListNode(arr[0]);
        ListNode* curr = head;
        for (size_t i = 1; i < arr.size(); ++i) {
            curr->next = new ListNode(arr[i]);
            curr = curr->next;
        }
        return head;
    }

    TreeNode* parseTreeNode(istream& in) {
        skipWhitespaceAndChar(in, '[');
        char next = peekNextChar(in);
        if (next == ']') {
            skipWhitespaceAndChar(in, ']');
            return nullptr;
        }
        vector<string> tokens;
        while (true) {
            string tok;
            char c;
            while (in.get(c) && isspace(c));
            if (c == ']' || c == ',') {
                in.putback(c);
            } else {
                tok.push_back(c);
                while (in.get(c)) {
                    if (c == ',' || c == ']') {
                        in.putback(c);
                        break;
                    }
                    if (!isspace(c)) tok.push_back(c);
                }
            }
            tokens.push_back(tok);
            char sep;
            in >> sep;
            if (sep == ']') break;
        }
        
        if (tokens.empty() || tokens[0] == "null" || tokens[0] == "None" || tokens[0].empty()) return nullptr;
        
        TreeNode* root = new TreeNode(stoi(tokens[0]));
        queue<TreeNode*> q;
        q.push(root);
        size_t i = 1;
        while (!q.empty() && i < tokens.size()) {
            TreeNode* curr = q.front();
            q.pop();
            if (curr) {
                if (i < tokens.size() && tokens[i] != "null" && tokens[i] != "None" && !tokens[i].empty()) {
                    curr->left = new TreeNode(stoi(tokens[i]));
                    q.push(curr->left);
                }
                i++;
                if (i < tokens.size() && tokens[i] != "null" && tokens[i] != "None" && !tokens[i].empty()) {
                    curr->right = new TreeNode(stoi(tokens[i]));
                    q.push(curr->right);
                }
                i++;
            }
        }
        return root;
    }

    void printValue(int x) { cout << x << endl; }
    void printValue(long long x) { cout << x << endl; }
    void printValue(float x) { cout << x << endl; }
    void printValue(double x) { cout << x << endl; }
    void printValue(bool x) { cout << (x ? "true" : "false") << endl; }
    void printValue(char c) { cout << "'" << c << "'" << endl; }
    void printValue(const string& s) { cout << "\\"" << s << "\\"" << endl; }
    
    template<typename T>
    void printValue(const vector<T>& v) {
        cout << "[";
        for (size_t i = 0; i < v.size(); ++i) {
            cout << v[i] << (i + 1 < v.size() ? "," : "");
        }
        cout << "]" << endl;
    }

    template<typename T>
    void printValue(const vector<vector<T>>& m) {
        cout << "[";
        for (size_t i = 0; i < m.size(); ++i) {
            cout << "[";
            for (size_t j = 0; j < m[i].size(); ++j) {
                cout << m[i][j] << (j + 1 < m[i].size() ? "," : "");
            }
            cout << "]" << (i + 1 < m.size() ? "," : "");
        }
        cout << "]" << endl;
    }

    void printValue(ListNode* head) {
        cout << "[";
        ListNode* curr = head;
        while (curr) {
            cout << curr->val << (curr->next ? "," : "");
            curr = curr->next;
        }
        cout << "]" << endl;
    }

    void printValue(TreeNode* root) {
        if (!root) {
            cout << "[]" << endl;
            return;
        }
        vector<string> res;
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            TreeNode* curr = q.front();
            q.pop();
            if (curr) {
                res.push_back(to_string(curr->val));
                q.push(curr->left);
                q.push(curr->right);
            } else {
                res.push_back("null");
            }
        }
        while (!res.empty() && res.back() == "null") {
            res.pop_back();
        }
        cout << "[";
        for (size_t i = 0; i < res.size(); ++i) {
            cout << res[i] << (i + 1 < res.size() ? "," : "");
        }
        cout << "]" << endl;
    }
}
`;

  return `${parserLibrary}
${studentCode}

int main() {
    Solution sol;
    while (HarnessParser::peekNextChar(cin) != '\\0') {
${parseLines.join('\n')}
        auto res = sol.${funcName}(${argsList});
        HarnessParser::printValue(res);
    }
    return 0;
}
`;
}

function generatePythonHarness(studentCode: string, funcName: string, params: any[], retType: string): string {
  const normRet = retType.toLowerCase().replace(/\s+/g, '');
  
  const parseLines = params.map((p, idx) => {
    const norm = p.type.toLowerCase().replace(/\s+/g, '');
    let parseExpr = `parse_input_val(lines[idx], "${norm}")`;
    if (norm === 'listnode') parseExpr = `listToLinkedList(${parseExpr})`;
    if (norm === 'treenode') parseExpr = `listToTree(${parseExpr})`;
    return `            arg${idx} = ${parseExpr}
            idx += 1`;
  });
  const argsList = params.map((_, idx) => `arg${idx}`).join(', ');

  let serializeCall = `res`;
  if (normRet === 'listnode') serializeCall = `linkedListToList(res)`;
  if (normRet === 'treenode') serializeCall = `treeToList(res)`;

  const pythonLibrary = `
import sys
import json

# Definitions
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def listToLinkedList(arr):
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for x in arr[1:]:
        curr.next = ListNode(x)
        curr = curr.next
    return head

def linkedListToList(head):
    arr = []
    curr = head
    while curr:
        arr.append(curr.val)
        curr = curr.next
    return arr

def listToTree(arr):
    if not arr: return None
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    while queue and i < len(arr):
        curr = queue.pop(0)
        if curr:
            if i < len(arr) and arr[i] is not None:
                curr.left = TreeNode(arr[i])
                queue.append(curr.left)
            i += 1
            if i < len(arr) and arr[i] is not None:
                curr.right = TreeNode(arr[i])
                queue.append(curr.right)
            i += 1
    return root

def treeToList(root):
    if not root: return []
    res = []
    queue = [root]
    while queue:
        curr = queue.pop(0)
        if curr:
            res.append(curr.val)
            queue.append(curr.left)
            queue.append(curr.right)
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res

def parse_input_val(line, expected_type):
    line = line.strip()
    if not line: return None
    if '=' in line:
        line = line.split('=', 1)[1].strip()
    try:
        return json.loads(line)
    except:
        return line

def serialize_output_val(val):
    if val is None: return "null"
    if isinstance(val, bool): return str(val).lower()
    return json.dumps(val, separators=(',', ':'))
`;

  return `${pythonLibrary}
${studentCode}

def run_harness():
    lines = [line.strip() for line in sys.stdin if line.strip()]
    if not lines:
        return
    
    idx = 0
    sol = Solution()
    while idx < len(lines):
        try:
${parseLines.join('\n')}
            res = sol.${funcName}(${argsList})
            print(serialize_output_val(${serializeCall}))
        except Exception as e:
            sys.stderr.write(f"Runtime Exception: {str(e)}\\n")
            sys.exit(1)

if __name__ == '__main__':
    run_harness()
`;
}

function generateJsHarness(studentCode: string, funcName: string, params: any[], retType: string): string {
  const normRet = retType.toLowerCase().replace(/\s+/g, '');

  const parseLines = params.map((p, idx) => {
    const norm = p.type.toLowerCase().replace(/\s+/g, '');
    let parseExpr = `parseInputVal(lines[idx++])`;
    if (norm === 'listnode') parseExpr = `listToLinkedList(${parseExpr})`;
    if (norm === 'treenode') parseExpr = `listToTree(${parseExpr})`;
    return `            let arg${idx} = ${parseExpr};`;
  });
  const argsList = params.map((_, idx) => `arg${idx}`).join(', ');

  let serializeCall = `res`;
  if (normRet === 'listnode') serializeCall = `linkedListToList(res)`;
  if (normRet === 'treenode') serializeCall = `treeToList(res)`;

  const jsLibrary = `
const fs = require('fs');

function ListNode(val, next) {
    this.val = (val===undefined ? 0 : val)
    this.next = (next===undefined ? null : next)
}

function TreeNode(val, left, right) {
    this.val = (val===undefined ? 0 : val)
    this.left = (left===undefined ? null : left)
    this.right = (right===undefined ? null : right)
}

function parseInputVal(raw) {
    if (!raw) return null;
    let line = raw.trim();
    if (line.includes('=')) {
        line = line.split('=')[1].trim();
    }
    try {
        return JSON.parse(line);
    } catch {
        return line;
    }
}

function listToLinkedList(arr) {
    if (!arr || !arr.length) return null;
    let head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }
    return head;
}

function linkedListToList(head) {
    const arr = [];
    let curr = head;
    while (curr) {
        arr.push(curr.val);
        curr = curr.next;
    }
    return arr;
}

function listToTree(arr) {
    if (!arr || !arr.length) return null;
    let root = new TreeNode(arr[0]);
    let queue = [root];
    let i = 1;
    while (queue.length && i < arr.length) {
        let curr = queue.shift();
        if (curr) {
            if (i < arr.length && arr[i] !== null) {
                curr.left = new TreeNode(arr[i]);
                queue.push(curr.left);
            }
            i++;
            if (i < arr.length && arr[i] !== null) {
                curr.right = new TreeNode(arr[i]);
                queue.push(curr.right);
            }
            i++;
        }
    }
    return root;
}

function treeToList(root) {
    if (!root) return [];
    const res = [];
    const queue = [root];
    while (queue.length) {
        let curr = queue.shift();
        if (curr) {
            res.push(curr.val);
            queue.push(curr.left);
            queue.push(curr.right);
        } else {
            res.push(null);
        }
    }
    while (res.length && res[res.length - 1] === null) {
        res.pop();
    }
    return res;
}
`;

  return `${jsLibrary}
${studentCode}

function runHarness() {
    const input = fs.readFileSync(0, 'utf-8');
    const lines = input.split('\\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    
    let idx = 0;
    const sol = new Solution();
    while (idx < lines.length) {
        try {
${parseLines.join('\n')}
            let res = sol.${funcName}(${argsList});
            console.log(JSON.stringify(${serializeCall}));
        } catch (e) {
            console.error("Runtime Exception:", e);
            process.exit(1);
        }
    }
}

runHarness();
`;
}

function getJavaType(type: string): string {
  const norm = type.toLowerCase().replace(/\s+/g, '');
  if (norm === 'integer' || norm === 'int') return 'int';
  if (norm === 'long' || norm === 'longlong' || norm === 'long long') return 'long';
  if (norm === 'float') return 'float';
  if (norm === 'double') return 'double';
  if (norm === 'string') return 'String';
  if (norm === 'character' || norm === 'char') return 'char';
  if (norm === 'boolean' || norm === 'bool') return 'boolean';
  if (norm === 'integer[]' || norm === 'int[]') return 'int[]';
  if (norm === 'double[]') return 'double[]';
  if (norm === 'string[]') return 'String[]';
  if (norm === 'character[]' || norm === 'char[]') return 'char[]';
  if (norm === 'boolean[]' || norm === 'bool[]') return 'boolean[]';
  if (norm === 'integer[][]' || norm === 'int[][]') return 'int[][]';
  if (norm === 'listnode') return 'ListNode';
  if (norm === 'treenode') return 'TreeNode';
  if (norm === 'list<integer>') return 'List<Integer>';
  if (norm === 'list<string>') return 'List<String>';
  return 'String';
}

function getJavaParseFunc(type: string, argName: string): string {
  const norm = type.toLowerCase().replace(/\s+/g, '');
  if (norm === 'integer' || norm === 'int') return `Integer.parseInt(cleanLabel(${argName}))`;
  if (norm === 'long' || norm === 'longlong' || norm === 'long long') return `Long.parseLong(cleanLabel(${argName}))`;
  if (norm === 'float') return `Float.parseFloat(cleanLabel(${argName}))`;
  if (norm === 'double') return `Double.parseDouble(cleanLabel(${argName}))`;
  if (norm === 'string') return `parseString(cleanLabel(${argName}))`;
  if (norm === 'character' || norm === 'char') return `parseChar(cleanLabel(${argName}))`;
  if (norm === 'boolean' || norm === 'bool') return `Boolean.parseBoolean(cleanLabel(${argName}))`;
  if (norm === 'integer[]' || norm === 'int[]') return `parseIntArray(cleanLabel(${argName}))`;
  if (norm === 'double[]') return `parseDoubleArray(cleanLabel(${argName}))`;
  if (norm === 'string[]') return `parseStringArray(cleanLabel(${argName}))`;
  if (norm === 'character[]' || norm === 'char[]') return `parseCharArray(cleanLabel(${argName}))`;
  if (norm === 'boolean[]' || norm === 'bool[]') return `parseBoolArray(cleanLabel(${argName}))`;
  if (norm === 'integer[][]' || norm === 'int[][]') return `parseIntMatrix(cleanLabel(${argName}))`;
  if (norm === 'listnode') return `parseListNode(cleanLabel(${argName}))`;
  if (norm === 'treenode') return `parseTreeNode(cleanLabel(${argName}))`;
  if (norm === 'list<integer>') return `parseIntList(cleanLabel(${argName}))`;
  if (norm === 'list<string>') return `parseStringList(cleanLabel(${argName}))`;
  return `parseString(cleanLabel(${argName}))`;
}

function generateJavaHarness(studentCode: string, funcName: string, params: any[], retType: string): string {
  const cleanedCode = studentCode.replace(/\bpublic\s+class\s+Solution\b/g, 'class Solution');

  const argsList = params.map((_, idx) => `arg${idx}`).join(', ');

  const javaLibrary = `
import java.io.*;
import java.util.*;

class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

public class Main {
    static class Parser {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        String nextLine() {
            try { return reader.readLine(); } catch (IOException e) { return null; }
        }
    }

    static String cleanLabel(String s) {
        if (s == null) return "";
        s = s.trim();
        if (s.contains("=")) {
            s = s.substring(s.indexOf("=") + 1).trim();
        }
        return s;
    }

    static int[] parseIntArray(String s) {
        s = cleanLabel(s);
        if (s.equals("[]")) return new int[0];
        s = s.substring(1, s.length() - 1);
        String[] parts = s.split(",");
        int[] res = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = Integer.parseInt(parts[i].trim());
        }
        return res;
    }
    
    static List<Integer> parseIntList(String s) {
        int[] arr = parseIntArray(s);
        List<Integer> res = new ArrayList<>();
        for (int x : arr) res.add(x);
        return res;
    }

    static double[] parseDoubleArray(String s) {
        s = cleanLabel(s);
        if (s.equals("[]")) return new double[0];
        s = s.substring(1, s.length() - 1);
        String[] parts = s.split(",");
        double[] res = new double[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = Double.parseDouble(parts[i].trim());
        }
        return res;
    }

    static String parseString(String s) {
        s = cleanLabel(s);
        if (s.startsWith("\"") && s.endsWith("\"")) {
            s = s.substring(1, s.length() - 1);
        }
        return s;
    }

    static char parseChar(String s) {
        s = parseString(s);
        return s.length() > 0 ? s.charAt(0) : '\\0';
    }

    static String[] parseStringArray(String s) {
        s = cleanLabel(s);
        if (s.equals("[]")) return new String[0];
        s = s.substring(1, s.length() - 1);
        String[] parts = s.split(",");
        String[] res = new String[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = parseString(parts[i]);
        }
        return res;
    }

    static char[] parseCharArray(String s) {
        String[] arr = parseStringArray(s);
        char[] res = new char[arr.length];
        for (int i = 0; i < arr.length; i++) {
            res[i] = arr[i].length() > 0 ? arr[i].charAt(0) : '\\0';
        }
        return res;
    }

    static boolean[] parseBoolArray(String s) {
        s = cleanLabel(s);
        if (s.equals("[]")) return new boolean[0];
        s = s.substring(1, s.length() - 1);
        String[] parts = s.split(",");
        boolean[] res = new boolean[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = Boolean.parseBoolean(parts[i].trim());
        }
        return res;
    }

    static int[][] parseIntMatrix(String s) {
        s = cleanLabel(s);
        if (s.equals("[]") || s.equals("[[]]")) return new int[0][0];
        s = s.substring(1, s.length() - 1);
        List<int[]> rows = new ArrayList<>();
        int depth = 0;
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c == '[') {
                depth++;
                sb.setLength(0);
            } else if (c == ']') {
                depth--;
                rows.add(parseIntArray("[" + sb.toString() + "]"));
            } else {
                if (depth > 0) sb.append(c);
            }
        }
        return rows.toArray(new int[rows.size()][]);
    }

    static ListNode parseListNode(String s) {
        int[] arr = parseIntArray(s);
        if (arr.length == 0) return null;
        ListNode head = new ListNode(arr[0]);
        ListNode curr = head;
        for (int i = 1; i < arr.length; i++) {
            curr.next = new ListNode(arr[i]);
            curr = curr.next;
        }
        return head;
    }

    static TreeNode parseTreeNode(String s) {
        s = cleanLabel(s);
        if (s.equals("[]") || s.equals("[null]")) return null;
        s = s.substring(1, s.length() - 1);
        String[] parts = s.split(",");
        if (parts.length == 0 || parts[0].trim().equals("null") || parts[0].trim().isEmpty()) return null;
        
        TreeNode root = new TreeNode(Integer.parseInt(parts[0].trim()));
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < parts.length) {
            TreeNode curr = q.poll();
            if (curr != null) {
                String leftVal = parts[i].trim();
                if (!leftVal.equals("null") && !leftVal.isEmpty()) {
                    curr.left = new TreeNode(Integer.parseInt(leftVal));
                    q.add(curr.left);
                }
                i++;
                if (i < parts.length) {
                    String rightVal = parts[i].trim();
                    if (!rightVal.equals("null") && !rightVal.isEmpty()) {
                        curr.right = new TreeNode(Integer.parseInt(rightVal));
                        q.add(curr.right);
                    }
                    i++;
                }
            }
        }
        return root;
    }

    static String serialize(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof int[]) return Arrays.toString((int[]) obj).replace(" ", "");
        if (obj instanceof double[]) return Arrays.toString((double[]) obj).replace(" ", "");
        if (obj instanceof String[]) return Arrays.toString((String[]) obj).replace(" ", "");
        if (obj instanceof ListNode) {
            StringBuilder sb = new StringBuilder("[");
            ListNode curr = (ListNode) obj;
            while (curr != null) {
                sb.append(curr.val).append(curr.next != null ? "," : "");
                curr = curr.next;
            }
            return sb.append("]").toString();
        }
        if (obj instanceof TreeNode) {
            TreeNode root = (TreeNode) obj;
            List<String> res = new ArrayList<>();
            Queue<TreeNode> q = new LinkedList<>();
            q.add(root);
            while (!q.isEmpty()) {
                TreeNode curr = q.poll();
                if (curr != null) {
                    res.add(String.valueOf(curr.val));
                    q.add(curr.left);
                    q.add(curr.right);
                } else {
                    res.add("null");
                }
            }
            while (!res.isEmpty() && res.get(res.size() - 1).equals("null")) {
                res.remove(res.size() - 1);
            }
            return res.toString().replace(" ", "");
        }
        if (obj instanceof int[][]) {
            int[][] m = (int[][]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < m.length; i++) {
                sb.append(Arrays.toString(m[i]).replace(" ", ""));
                if (i + 1 < m.length) sb.append(",");
            }
            return sb.append("]").toString();
        }
        if (obj instanceof List) {
            return obj.toString().replace(" ", "");
        }
        if (obj instanceof Boolean) {
            return obj.toString().toLowerCase();
        }
        return obj.toString();
    }
    
    public static void main(String[] args) {
        Parser parser = new Parser();
        Solution sol = new Solution();
        while (true) {
            String initialLine = parser.nextLine();
            if (initialLine == null) break;
            if (initialLine.trim().isEmpty()) continue;
            
            try {
`;

  let javaBody = ``;
  params.forEach((p, idx) => {
    const javaType = getJavaType(p.type);
    if (idx === 0) {
      const parseCall = getJavaParseFunc(p.type, 'initialLine');
      javaBody += `                ${javaType} arg0 = ${parseCall};\n`;
    } else {
      const parseCall = getJavaParseFunc(p.type, `line${idx}`);
      javaBody += `                String line${idx} = parser.nextLine();\n`;
      javaBody += `                if (line${idx} == null) break;\n`;
      javaBody += `                ${javaType} arg${idx} = ${parseCall};\n`;
    }
  });

  const javaFooter = `
                ${getJavaType(retType)} res = sol.${funcName}(${argsList});
                System.out.println(serialize(res));
            } catch (Exception e) {
                System.err.println("Runtime Exception: " + e.getMessage());
                System.exit(1);
            }
        }
    }
}
`;

  return `${cleanedCode}
${javaLibrary}
${javaBody}
${javaFooter}
`;
}
