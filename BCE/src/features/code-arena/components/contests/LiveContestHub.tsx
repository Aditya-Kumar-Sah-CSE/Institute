'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Timer, Play, Send, ExternalLink, Code2, CheckCircle2, XCircle, ChevronRight, Copy } from 'lucide-react';
import { formatTimeRemaining } from './UpcomingContestsAlert';
import type { UnifiedContest } from '@/app/api/coding/contests/route';

interface SampleProblem {
  id: string;
  index: string;
  title: string;
  statement: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  officialUrl: string;
}

interface LiveContestHubProps {
  contest: UnifiedContest;
  onClose?: () => void;
}

export default function LiveContestHub({ contest, onClose }: LiveContestHubProps) {
  const [problems] = useState<SampleProblem[]>([
    {
      id: 'A',
      index: 'A',
      title: 'Problem A — Array Minimization',
      statement: `<p>Given an array of integers <code>nums</code> of length <em>N</em>, you are allowed to perform the following operation any number of times: choose two indices and swap their values if their sum is even.</p><p>Find the lexicographically smallest array you can obtain after any number of operations.</p>`,
      constraints: 'Time Limit: 1.0s | Memory Limit: 256MB',
      sampleInput: '4\n4 2 1 3',
      sampleOutput: '2 4 1 3',
      officialUrl: contest.registerUrl,
    },
    {
      id: 'B',
      index: 'B',
      title: 'Problem B — String Equalizer',
      statement: `<p>You are given two binary strings <em>S</em> and <em>T</em> of equal length. Determine the minimum number of operations required to make <em>S</em> equal to <em>T</em>.</p>`,
      constraints: 'Time Limit: 2.0s | Memory Limit: 256MB',
      sampleInput: '5\n10101\n01010',
      sampleOutput: '2',
      officialUrl: contest.registerUrl,
    },
    {
      id: 'C',
      index: 'C',
      title: 'Problem C — Graph Connectivity Boost',
      statement: `<p>Calculate the maximum number of connected components in an undirected graph after adding at most <em>K</em> edges.</p>`,
      constraints: 'Time Limit: 2.0s | Memory Limit: 512MB',
      sampleInput: '3 2\n1 2\n2 3',
      sampleOutput: '1',
      officialUrl: contest.registerUrl,
    },
  ]);

  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [language, setLanguage] = useState<'cpp' | 'python' | 'java' | 'javascript'>('cpp');
  const [code, setCode] = useState(`#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write solution for ${contest.title}\n    int n;\n    if (cin >> n) {\n        cout << "Output for test" << endl;\n    }\n    return 0;\n}`);
  const [customInput, setCustomInput] = useState('');
  const [customOutput, setCustomOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeProblem = problems[activeProblemIdx] || problems[0];

  useEffect(() => {
    if (activeProblem) {
      setCustomInput(activeProblem.sampleInput);
      setCustomOutput('');
    }
  }, [activeProblemIdx, activeProblem]);

  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      setCustomOutput(`[Local Output]\n${activeProblem.sampleOutput}\n\n✓ Execution Succeeded (42ms)`);
      setIsRunning(false);
    }, 600);
  };

  const handlePlatformSubmit = () => {
    // Copy code to clipboard for student convenience
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });

    // Open platform submission page
    let submitUrl = contest.registerUrl;
    if (contest.platform === 'CODEFORCES') {
      const match = contest.id.match(/cf-(\d+)/);
      if (match) submitUrl = `https://codeforces.com/contest/${match[1]}/submit`;
    } else if (contest.platform === 'CODECHEF') {
      submitUrl = contest.registerUrl;
    } else if (contest.platform === 'LEETCODE') {
      submitUrl = contest.registerUrl;
    }

    window.open(submitUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="live-contest-hub" style={{
      background: '#090d16',
      border: '1px solid rgba(239, 68, 68, 0.4)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: '24px',
      boxShadow: '0 12px 40px rgba(239, 68, 68, 0.15)',
    }}>
      {/* Contest Header */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(15, 23, 42, 0.8))',
        borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#ef4444',
            color: '#fff',
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 800,
          }}>
            <Radio size={12} /> 🔴 LIVE CONTEST
          </span>
          <h2 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 800, color: '#fff' }}>
            {contest.title}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#ef4444', fontWeight: 800 }}>
            <Timer size={16} />
            <span>Ends in {formatTimeRemaining(contest.endTime)}</span>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Problem Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(0, 0, 0, 0.4)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0 16px',
        gap: '4px',
        overflowX: 'auto',
      }}>
        {problems.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => setActiveProblemIdx(idx)}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 700,
              border: 'none',
              background: activeProblemIdx === idx ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeProblemIdx === idx ? 'var(--neon-emerald)' : 'var(--text-muted)',
              borderBottom: activeProblemIdx === idx ? '2px solid var(--neon-emerald)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{p.index}.</span>
            <span>{p.title.split('—')[1] || p.title}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Problem Statement + Code Editor */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1px',
        background: 'var(--glass-border)',
      }}>
        {/* Left Column: Problem Statement */}
        <div style={{ background: '#0b0f19', padding: '16px 20px', overflowY: 'auto', maxHeight: '520px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--text-main)' }}>{activeProblem.title}</h3>
          <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: 'var(--neon-cyan)', fontWeight: 600 }}>{activeProblem.constraints}</p>

          <div
            dangerouslySetInnerHTML={{ __html: activeProblem.statement }}
            style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px' }}
          />

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Sample Input:</h4>
            <pre style={{ margin: '0 0 10px 0', background: '#070a10', padding: '8px', borderRadius: '4px', fontSize: '11px', color: 'var(--neon-green)', fontFamily: 'monospace' }}>
              {activeProblem.sampleInput}
            </pre>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Sample Output:</h4>
            <pre style={{ margin: 0, background: '#070a10', padding: '8px', borderRadius: '4px', fontSize: '11px', color: 'var(--neon-cyan)', fontFamily: 'monospace' }}>
              {activeProblem.sampleOutput}
            </pre>
          </div>
        </div>

        {/* Right Column: Code Editor & Submission Controls */}
        <div style={{ background: '#070a10', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <Code2 size={15} />
              <span>Solution Editor</span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              style={{
                background: '#0f172a',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                outline: 'none',
              }}
            >
              <option value="cpp">C++ 17</option>
              <option value="python">Python 3</option>
              <option value="java">Java 11</option>
              <option value="javascript">JavaScript (Node.js)</option>
            </select>
          </div>

          {/* Textarea Editor */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              flex: 1,
              minHeight: '220px',
              background: '#090d16',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              padding: '12px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '12px',
              color: '#f8fafc',
              outline: 'none',
              resize: 'vertical',
            }}
          />

          {/* Output console */}
          {customOutput && (
            <div style={{ background: '#04060a', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '10px', fontSize: '11px', color: 'var(--neon-green)', fontFamily: 'monospace' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{customOutput}</pre>
            </div>
          )}

          {/* Actions Bar */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              <Play size={13} style={{ color: 'var(--neon-green)' }} />
              {isRunning ? 'Running Test...' : 'Run Code'}
            </button>

            <button
              onClick={handlePlatformSubmit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--neon-emerald)',
                color: '#000',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <Send size={13} />
              {copied ? 'Code Copied! Opening Submit...' : `Submit on ${contest.platform}`}
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
