'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import type { CodeLanguage } from '../types';
import './CodeArena.css';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => <div className="code-editor-loading">Loading editor…</div> });
const languageMap: Record<CodeLanguage, string> = { cpp17: 'cpp', c: 'c', java: 'java', python: 'python', javascript: 'javascript' };
const starters: Record<CodeLanguage, string> = { cpp17: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  return 0;\n}', c: '#include <stdio.h>\n\nint main(void) {\n  return 0;\n}', java: 'public class Main {\n  public static void main(String[] args) {\n  }\n}', python: 'def solve():\n    pass\n\nif __name__ == "__main__":\n    solve()\n', javascript: "'use strict';\n\nfunction solve(input) {\n}\n" };

export default function CodeEditor({ problemId, supportedLanguages = ['cpp17', 'c', 'java', 'python', 'javascript'], samples }: { problemId: string; supportedLanguages?: CodeLanguage[]; samples: { input: string; expected_output: string; sample_name?: string | null }[] }) {
  const [language, setLanguage] = useState<CodeLanguage>(supportedLanguages[0] || 'cpp17');
  const [code, setCode] = useState(starters[supportedLanguages[0] || 'cpp17']);
  const [customInput, setCustomInput] = useState(samples[0]?.input || '');
  const [result, setResult] = useState('Ready. Run and submit are queued safely for the external judge worker.');
  const [pending, setPending] = useState(false);
  const reset = () => setCode(starters[language]);
  const submit = async () => {
    setPending(true); setResult('Queueing submission…');
    try {
      const response = await fetch('/api/coding/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ problemId, language, sourceCode: code }) });
      const payload = await response.json(); setResult(payload.error || `Submission ${payload.data?.status || 'QUEUED'}. ${payload.data?.id ? 'It will be processed by the judge worker when configured.' : ''}`);
    } catch { setResult('Unable to queue the submission. Please try again.'); } finally { setPending(false); }
  };
  return <section className="code-workspace" aria-label="Coding workspace">
    <div className="code-editor-toolbar"><select value={language} onChange={e => { const next = e.target.value as CodeLanguage; setLanguage(next); setCode(starters[next]); }} aria-label="Programming language">{supportedLanguages.map(item => <option key={item} value={item}>{item === 'cpp17' ? 'C++17' : item.toUpperCase()}</option>)}</select><Button variant="ghost" size="sm" onClick={reset}>Reset code</Button></div>
    <Editor height="420px" language={languageMap[language]} theme="vs-dark" value={code} onChange={value => setCode(value || '')} options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true, scrollBeyondLastLine: false }} />
    <div className="code-console"><div><label htmlFor="custom-input">Custom input</label><textarea id="custom-input" value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="Provide input for the future judge" /></div><div><strong>Console / Test Results</strong><p>{result}</p><div className="code-actions"><Button variant="secondary" onClick={() => setResult('Run is queued for the external judge worker. No code executes on BCE servers.')}>Run</Button><Button variant="primary" onClick={submit} isLoading={pending}>Submit</Button></div></div></div>
  </section>;
}
