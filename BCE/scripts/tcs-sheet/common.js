// BCE/scripts/tcs-sheet/common.js

function formatDescription(title, desc, inputFormat, outputFormat, constraints, examples) {
  let html = `<p><strong>Problem Description:</strong><br/>${desc}</p>`;
  
  html += `<h4>Input Format</h4><p>${inputFormat}</p>`;
  html += `<h4>Output Format</h4><p>${outputFormat}</p>`;
  html += `<h4>Constraints</h4><p><code>${constraints}</code></p>`;

  if (examples && examples.length > 0) {
    html += `<h4>Examples</h4>`;
    examples.forEach((ex, idx) => {
      html += `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 10px; margin-bottom: 8px;">`;
      html += `<p><strong>Example ${idx + 1}:</strong></p>`;
      html += `<pre><strong>Input:</strong>\n${ex.input}\n<strong>Output:</strong>\n${ex.output}</pre>`;
      if (ex.explanation) {
        html += `<p><em>Explanation:</em> ${ex.explanation}</p>`;
      }
      html += `</div>`;
    });
  }

  return html;
}

function makeStarterCode(cComment) {
  return {
    cpp17: `#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // ${cComment}\n    return 0;\n}`,
    c: `#include <stdio.h>\n\nint main() {\n    /* ${cComment} */\n    return 0;\n}`,
    java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // ${cComment}\n    }\n}`,
    python: `import sys\n\ndef solve():\n    # ${cComment}\n    pass\n\nif __name__ == '__main__':\n    solve()`,
    javascript: `const fs = require('fs');\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim();\n\nfunction solve() {\n    // ${cComment}\n}\nsolve();`
  };
}

module.exports = {
  formatDescription,
  makeStarterCode
};

