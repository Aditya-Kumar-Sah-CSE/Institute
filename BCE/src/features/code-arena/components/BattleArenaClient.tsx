'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Swords,
  Trophy,
  Copy,
  Code2,
  Play,
  CheckCircle2,
  ExternalLink,
  BarChart2,
  Check,
  History,
  Send,
  Bell,
  UserCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Terminal,
  Trash2,
  LoaderCircle,
  XCircle,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import type { CodeLanguage, NormalizedExecutionResult } from '../types';
import BattleLobby from './BattleLobby';
import BattleTimer from './BattleTimer';
import BattleEndScreen from './BattleEndScreen';
import BattleAnalyticsView from './BattleAnalyticsView';
import ProblemStatementRenderer from './ProblemStatementRenderer';
import './CodeArena.css';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="code-editor-loading">Loading battle workspace editor…</div>,
});

const starters: Record<CodeLanguage, string> = {
  cpp17: '#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your battle solution here\n    return 0;\n}',
  c: '#include <stdio.h>\n\nint main(void) {\n    // Write your battle solution here\n    return 0;\n}',
  java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your battle solution here\n    }\n}',
  python: 'def solve():\n    # Write your battle solution here\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
  javascript: "'use strict';\nfunction main() {\n    // Write your battle solution here\n}\nmain();\n",
  html: '<!-- HTML/CSS/React not supported in active battles -->',
};

type ConsoleTab = 'output' | 'error' | 'input' | 'tests';

export default function BattleArenaClient({
  battle: initialBattle,
  problems = [],
  participants: initialParticipants = [],
  initialTestCases = [],
  currentUser,
  isInstructor,
}: {
  battle: any;
  problems: any[];
  participants: any[];
  initialTestCases: any[];
  currentUser: any;
  isInstructor: boolean;
}) {
  const [battle, setBattle] = useState(initialBattle);
  const [participants, setParticipants] = useState(initialParticipants);
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'arena' | 'leaderboard' | 'submissions' | 'analytics'>('arena');
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('output');

  const [language, setLanguage] = useState<CodeLanguage>('cpp17');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<NormalizedExecutionResult | null>(null);
  const [lastSubmission, setLastSubmission] = useState<any | null>(null);

  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [showEndModal, setShowEndModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Synchronized Clock & Virtual Practice States
  const [serverNow, setServerNow] = useState<string | null>(null);
  const [isVirtualPractice, setIsVirtualPractice] = useState(false);
  const [virtualStartTime, setVirtualStartTime] = useState<string | null>(null);

  const currentProblem = problems[activeProblemIdx];
  const isHost = battle.created_by === currentUser?.id || isInstructor;

  // 1. Poll battle status and database server clock skew in parallel
  useEffect(() => {
    let active = true;
    async function syncBattleState() {
      try {
        const res = await fetch(`/api/coding/battles/${battle.id}`);
        if (res.ok && active) {
          const json = await res.json();
          if (json.success && json.data) {
            setBattle(json.data);
            if (json.server_now) {
              setServerNow(json.server_now);
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync battle state:', err);
      }
    }
    syncBattleState();
    const interval = setInterval(syncBattleState, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [battle.id]);

  // 2. Realtime listener to synchronize joined participant roster changes
  useEffect(() => {
    const supabaseBrowser = createClient();
    const channel = supabaseBrowser
      .channel(`participants-activity:${battle.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coding_battle_participants',
          filter: `battle_id=eq.${battle.id}`,
        },
        async () => {
          try {
            const res = await fetch(`/api/coding/battles/${battle.id}/leaderboard`);
            if (res.ok) {
              const json = await res.json();
              if (json.success && json.participants) {
                setParticipants(json.participants);
              }
            }
          } catch (err) {
            console.error('Realtime sync reload fail:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [battle.id]);

  // 3. Fetch student submission history on load
  useEffect(() => {
    async function loadSubmissions() {
      try {
        const res = await fetch(`/api/coding/submissions?battleId=${battle.id}`);
        if (res.ok) {
          const data = await res.json();
          setMySubmissions(data.data || []);
        }
      } catch (e) {
        console.error('Failed to load submissions history', e);
      }
    }
    loadSubmissions();
  }, [battle.id]);

  // 4. Show results screen on mount if battle is already completed and user was a participant
  useEffect(() => {
    if (battle.status === 'COMPLETED' && !isVirtualPractice) {
      const isParticipant = participants.some((p) => (p.student_id || p.profiles?.id) === currentUser?.id);
      if (isParticipant) {
        setShowEndModal(true);
      }
    }
  }, [battle.status, participants, currentUser, isVirtualPractice]);

  // Helper to load or derive draft code
  const getDraftOrStarter = (problem: any, lang: CodeLanguage) => {
    if (!problem || typeof window === 'undefined') return starters[lang];
    const draftKey = `bce:code-draft:${battle.id}:${problem.id}:${lang}`;
    const savedDraft = localStorage.getItem(draftKey);
    return savedDraft || problem.starterCode?.[lang] || starters[lang];
  };

  // Initialize code when problem or language changes
  const handleSelectProblem = (idx: number) => {
    setActiveProblemIdx(idx);
    const prob = problems[idx];
    if (prob) {
      setCode(getDraftOrStarter(prob, language));
    }
  };

  const handleSelectLanguage = (lang: CodeLanguage) => {
    setLanguage(lang);
    if (currentProblem) {
      setCode(getDraftOrStarter(currentProblem, lang));
    }
  };

  const handleCodeChange = (newVal: string) => {
    setCode(newVal);
    if (currentProblem && typeof window !== 'undefined') {
      const draftKey = `bce:code-draft:${battle.id}:${currentProblem.id}:${language}`;
      localStorage.setItem(draftKey, newVal);
    }
  };

  const resetCode = () => {
    if (confirm(`Reset code editor to starter template for ${language}?`)) {
      if (currentProblem) {
        const starter = currentProblem.starterCode?.[language] || starters[language];
        setCode(starter);
        if (typeof window !== 'undefined') {
          const draftKey = `bce:code-draft:${battle.id}:${currentProblem.id}:${language}`;
          localStorage.removeItem(draftKey);
        }
      }
    }
  };

  // Partition submissions
  const officialSubmissions = mySubmissions.filter((s) => s.battle_id === battle.id);
  const virtualSubmissions = mySubmissions.filter((s) => !s.battle_id && problems.some((p) => p.id === s.problem_id));

  // Determine solved problem IDs for current student
  const solvedProblemIds = new Set(
    (isVirtualPractice ? mySubmissions : officialSubmissions)
      .filter((s) => s.status === 'ACCEPTED')
      .map((s) => s.problem_id)
  );

  const officialSolvedProblemIds = new Set(
    officialSubmissions.filter((s) => s.status === 'ACCEPTED').map((s) => s.problem_id)
  );

  // User performance statistics
  const userRank = participants.findIndex((p) => (p.student_id || p.profiles?.id) === currentUser?.id) + 1 || 1;
  const userScore = participants.find((p) => (p.student_id || p.profiles?.id) === currentUser?.id)?.score || 0;
  const userAccuracy = officialSubmissions.length > 0 ? Math.round((officialSubmissions.filter((s) => s.status === 'ACCEPTED').length / officialSubmissions.length) * 100) : 0;

  // Virtual active countdown configurations
  const activeEndTime = isVirtualPractice
    ? (virtualStartTime ? new Date(new Date(virtualStartTime).getTime() + battle.duration_minutes * 60 * 1000).toISOString() : null)
    : battle.end_time;

  // Render Lobby if battle status is LOBBY, DRAFT, or SCHEDULED
  if (battle.status === 'LOBBY' || battle.status === 'DRAFT' || battle.status === 'SCHEDULED') {
    return (
      <BattleLobby
        battle={battle}
        problemsCount={problems.length}
        participants={participants}
        currentUser={currentUser}
        isHost={isHost}
        onBattleStarted={(updatedBattle) => setBattle(updatedBattle)}
      />
    );
  }

  // Run Code Handler
  const handleRunCode = async () => {
    setRunning(true);
    setRunResult(null);
    setLastSubmission(null);

    try {
      const res = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, stdin }),
      });

      const data: NormalizedExecutionResult = await res.json();
      setRunResult(data);

      if (data.status === 'COMPILATION_ERROR' || data.status === 'RUNTIME_ERROR' || data.status === 'SYSTEM_ERROR') {
        setConsoleTab('error');
      } else {
        setConsoleTab('output');
      }
    } catch (err: any) {
      setRunResult({
        status: 'SYSTEM_ERROR',
        stdout: '',
        stderr: '',
        compileStdout: '',
        compileStderr: '',
        exitCode: null,
        signal: null,
        executionTimeMs: null,
        memoryUsedMb: null,
        message: 'Execution server temporarily unavailable. Please try again.',
      });
      setConsoleTab('error');
    } finally {
      setRunning(false);
    }
  };

  // Submit Code Handler
  const handleSubmitCode = async () => {
    if (!currentProblem) return;
    setSubmitting(true);
    setRunResult(null);
    setLastSubmission(null);

    try {
      const res = await fetch('/api/coding/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: currentProblem.id,
          battleId: battle.id,
          language,
          sourceCode: code,
          isVirtualPractice,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setLastSubmission({ error: json.error || 'Submission failed' });
        setConsoleTab('error');
        return;
      }

      setLastSubmission(json.data);
      setConsoleTab('tests');

      // Refresh student submission history
      const subRes = await fetch(`/api/coding/submissions?battleId=${battle.id}`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setMySubmissions(subData.data || []);
      }

      // Refresh battle leaderboard
      if (!isVirtualPractice) {
        const partRes = await fetch(`/api/coding/battles/${battle.id}/leaderboard`);
        if (partRes.ok) {
          const partData = await partRes.json();
          if (partData.participants) setParticipants(partData.participants);
        }
      }
    } catch (e: any) {
      setLastSubmission({ error: 'Error submitting code: ' + e.message });
      setConsoleTab('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(battle.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const errorCount =
    (runResult && (runResult.compileStderr || runResult.stderr || runResult.status !== 'SUCCESS')) ||
    (lastSubmission && lastSubmission.error)
      ? 1
      : 0;

  return (
    <div className="code-arena-page">
      {/* End Battle Summary Modal */}
      {showEndModal && (
        <BattleEndScreen
          battle={battle}
          userStats={{
            rank: userRank,
            score: userScore,
            solvedCount: officialSolvedProblemIds.size,
            totalProblems: problems.length,
            accuracy: userAccuracy,
          }}
          onViewLeaderboard={() => {
            setShowEndModal(false);
            setActiveTab('leaderboard');
          }}
          onViewAnalytics={() => {
            setShowEndModal(false);
            setActiveTab('analytics');
          }}
        />
      )}

      {/* Compact Battle Room IDE Header Bar */}
      <header className="code-arena-header-compact">
        <div className="code-arena-header-left">
          <div className="code-arena-logo-box">
            <Swords size={20} />
          </div>
          <div>
            <h1 className="code-arena-header-title">
              BCE Bhagalpur
              <span className="code-arena-badge-sub">· {battle.title}</span>
            </h1>
          </div>
        </div>

        {/* Center: Timer & Battle Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--neon-gold)', background: 'rgba(234,179,8,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            <Flame size={14} /> LIVE BATTLE
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Join Code:</span>
            <strong style={{ fontFamily: 'monospace', color: 'var(--neon-cyan)', fontSize: '12px' }}>{battle.join_code}</strong>
            <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex' }} onClick={handleCopyCode} title="Copy join code">
              {copied ? <Check size={13} style={{ color: 'var(--neon-emerald)' }} /> : <Copy size={13} />}
            </button>
          </div>

          <BattleTimer
            endTime={activeEndTime}
            serverNow={isVirtualPractice ? null : serverNow}
            onTimerExpired={() => {
              if (isVirtualPractice) {
                alert('Virtual practice session has expired! You can still submit and test solution drafts.');
              } else {
                setBattle((prev: any) => ({ ...prev, status: 'COMPLETED' }));
                setShowEndModal(true);
              }
            }}
          />
        </div>

        {/* Right: Room Tabs & User Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} className="code-arena-header-controls-wrapper">
          <div className="code-arena-tabs-container">
            <Button size="sm" variant={activeTab === 'arena' ? 'primary' : 'secondary'} onClick={() => setActiveTab('arena')} style={{ width: '100%' }}>
              <Code2 size={14} /> Arena
            </Button>
            <Button size="sm" variant={activeTab === 'leaderboard' ? 'primary' : 'secondary'} onClick={() => setActiveTab('leaderboard')} style={{ width: '100%' }}>
              <Trophy size={14} /> Leaderboard
            </Button>
            <Button size="sm" variant={activeTab === 'submissions' ? 'primary' : 'secondary'} onClick={() => setActiveTab('submissions')} style={{ width: '100%' }}>
              <History size={14} /> Submissions
            </Button>
            <Button size="sm" variant={activeTab === 'analytics' ? 'primary' : 'secondary'} onClick={() => setActiveTab('analytics')} style={{ width: '100%' }}>
              <BarChart2 size={14} /> Analytics
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
            <button type="button" className="oj-icon-btn" aria-label="Notifications" title="Notifications">
              <Bell size={15} />
            </button>
            <button type="button" className="oj-icon-btn" aria-label="User profile" title="User profile">
              <UserCircle size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ARENA MAIN VIEW */}
      {activeTab === 'arena' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Virtual Practice and Completion Banners */}
          {battle.status === 'COMPLETED' && !isVirtualPractice && (
            <Card
              style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(124,58,237,0.1))',
                border: '1px solid var(--neon-cyan)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md) var(--space-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--neon-cyan)', margin: 0 }}>
                  🏁 Battle Completed
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  This competitive battle has officially ended. You can enter Virtual Practice mode to test your solutions and solve the problems at your own pace.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEndModal(true)}
                  style={{ fontWeight: 800 }}
                >
                  🏆 View Results
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsVirtualPractice(true);
                    setVirtualStartTime(new Date().toISOString());
                  }}
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                    fontWeight: 800
                  }}
                >
                  ⚡ Start Virtual Practice
                </Button>
              </div>
            </Card>
          )}

          {isVirtualPractice && (
            <Card
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))',
                border: '1px solid var(--neon-emerald)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md) var(--space-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--neon-emerald)', margin: 0 }}>
                  ⚡ Virtual Practice / Re-Attempt Mode
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Solving problems in retry mode. Submissions are for practice only and do not affect the official lobby scoreboard.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (confirm('Exit virtual practice mode? Your code drafts are saved, but the virtual timer will reset.')) {
                    setIsVirtualPractice(false);
                    setVirtualStartTime(null);
                  }
                }}
                style={{ fontWeight: 700 }}
              >
                Exit Practice
              </Button>
            </Card>
          )}

          {/* Problem Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {problems.map((p, idx) => {
              const isSolved = solvedProblemIds.has(p.id);
              const isActive = activeProblemIdx === idx;

              return (
                <button
                  key={p.id}
                  type="button"
                  className={`oj-tab ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '8px 16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: isSolved ? '1px solid var(--neon-emerald)' : undefined,
                  }}
                  onClick={() => handleSelectProblem(idx)}
                >
                  {isSolved ? (
                    <CheckCircle2 size={14} style={{ color: 'var(--neon-emerald)' }} />
                  ) : (
                    <span style={{ fontSize: '11px', opacity: 0.6 }}>#{idx + 1}</span>
                  )}
                  <span>{p.title}</span>
                  <span style={{ fontSize: '10px', color: 'var(--neon-gold)', fontWeight: 700 }}>
                    {p.points || 100}pts
                  </span>
                </button>
              );
            })}
          </div>

          {/* 3-Pane IDE Layout */}
          {currentProblem ? (
            <div className="code-arena-ide-layout">
              {/* Left Statement Panel */}
              <section className="code-statement-panel">
                <ProblemStatementRenderer problem={currentProblem} />
              </section>

              {/* Right Workspace Panel */}
              <section className="code-workspace-panel">
                {/* Monaco Container */}
                <div className={`code-monaco-wrapper ${isFullscreen ? 'code-editor-fullscreen' : ''}`}>
                  <div className="code-editor-toolbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Language:</span>
                      <select
                        className="oj-meta-select"
                        value={language}
                        onChange={(e) => handleSelectLanguage(e.target.value as CodeLanguage)}
                      >
                        <option value="cpp17">C++17</option>
                        <option value="c">C</option>
                        <option value="java">Java</option>
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="oj-icon-btn"
                        aria-label="Reset code template"
                        title="Reset code template"
                        onClick={resetCode}
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        type="button"
                        className="oj-icon-btn"
                        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Maximize Editor Mode'}
                        title={isFullscreen ? 'Exit Fullscreen Mode' : 'Maximize Editor Mode'}
                        onClick={() => setIsFullscreen(!isFullscreen)}
                      >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      </button>
                    </div>
                  </div>

                  <Editor
                    height={isFullscreen ? 'calc(100vh - 50px)' : '360px'}
                    theme="vs-dark"
                    language={language === 'cpp17' ? 'cpp' : language}
                    value={code}
                    onChange={(v) => handleCodeChange(v || '')}
                    options={{
                       automaticLayout: true,
                       minimap: { enabled: false },
                       fontSize: 13,
                       lineNumbers: 'on',
                       renderLineHighlight: 'all',
                    }}
                  />
                </div>

                {/* Custom Input Terminal Card */}
                <div className="oj-input-card">
                  <div className="oj-input-header">
                    <span className="oj-input-title">
                      <Terminal size={14} style={{ color: 'var(--neon-cyan)' }} /> Custom Stdin Input
                    </span>
                    <div className="oj-icon-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {currentProblem?.examples && currentProblem.examples.length > 0 && (
                        <select
                          aria-label="Select sample input example"
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--neon-cyan)',
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                          onChange={(e) => {
                            const idx = parseInt(e.target.value, 10);
                            if (!isNaN(idx) && currentProblem.examples && currentProblem.examples[idx]) {
                              setStdin(currentProblem.examples[idx].input);
                              setConsoleTab('input');
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Use Example...
                          </option>
                          {currentProblem.examples.map((s: any, idx: number) => (
                            <option key={idx} value={idx}>
                              {s.explanation || `Example ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        className="oj-icon-btn"
                        aria-label="Clear custom input"
                        title="Clear input"
                        onClick={() => setStdin('')}
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        type="button"
                        className="oj-icon-btn"
                        aria-label="Copy input"
                        title="Copy input"
                        onClick={() => {
                          if (stdin) navigator.clipboard.writeText(stdin);
                        }}
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="oj-input-textarea"
                    placeholder="Enter custom stdin for Run Code..."
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                  />
                </div>

                {/* Console & Results Wrapper */}
                <div className="oj-console-wrapper">
                  <div className="oj-output-header">
                    <span className="oj-output-title">Console & Evaluation</span>
                    <div className="oj-control-btns">
                      <button
                        type="button"
                        className="btn-run-secondary"
                        disabled={running || submitting || (battle.status === 'COMPLETED' && !isVirtualPractice)}
                        onClick={handleRunCode}
                      >
                        {running ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}
                        {running ? 'Running...' : 'Run Code'}
                      </button>

                      <button
                        type="button"
                        className="btn-submit-primary"
                        disabled={running || submitting || (battle.status === 'COMPLETED' && !isVirtualPractice)}
                        onClick={handleSubmitCode}
                      >
                        {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
                        {submitting ? 'Judging...' : 'Submit Solution'}
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="oj-tabs-bar">
                    <button
                      type="button"
                      className={`oj-tab ${consoleTab === 'output' ? 'active' : ''}`}
                      onClick={() => setConsoleTab('output')}
                    >
                      Output
                    </button>
                    <button
                      type="button"
                      className={`oj-tab ${consoleTab === 'error' ? 'active' : ''}`}
                      onClick={() => setConsoleTab('error')}
                    >
                      Error {errorCount > 0 && <span className="oj-err-badge">{errorCount}</span>}
                    </button>
                    <button
                      type="button"
                      className={`oj-tab ${consoleTab === 'input' ? 'active' : ''}`}
                      onClick={() => setConsoleTab('input')}
                    >
                      Input
                    </button>
                    <button
                      type="button"
                      className={`oj-tab ${consoleTab === 'tests' ? 'active' : ''}`}
                      onClick={() => setConsoleTab('tests')}
                    >
                      Tests
                    </button>
                  </div>

                  {/* Body */}
                  <div className="oj-console-body">
                    {consoleTab === 'output' && (
                      !runResult && !lastSubmission ? (
                        <div className="oj-empty-state">
                          <div className="oj-terminal-icon-box">
                            <Terminal size={22} />
                            <span className="oj-check-badge">
                              <CheckCircle2 size={12} />
                            </span>
                          </div>
                          <p className="oj-empty-title">Console ready</p>
                          <p className="oj-empty-sub">Run or submit code to view execution details and test case results.</p>
                        </div>
                      ) : runResult ? (
                        <div>
                          <div className={`oj-status-banner oj-status-${runResult.status}`}>
                            {runResult.status === 'SUCCESS' ? '✓ Program Executed Successfully' : `● ${runResult.status}`}
                          </div>
                          <pre className="oj-code-block">
                            {runResult.stdout ? runResult.stdout : <span className="text-secondary">Program executed cleanly with no stdout output.</span>}
                          </pre>
                        </div>
                      ) : lastSubmission ? (
                        <div>
                          <div className={`oj-status-banner oj-status-${lastSubmission.status || 'ACCEPTED'}`}>
                            {lastSubmission.status === 'ACCEPTED' ? '✓ Accepted' : `● ${lastSubmission.status || 'Evaluated'}`}
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: '4px 0' }}>
                            Submission ID: <strong style={{ fontFamily: 'monospace' }}>{lastSubmission.id || 'N/A'}</strong>
                          </p>
                        </div>
                      ) : null
                    )}

                    {consoleTab === 'error' && (
                      !runResult && !lastSubmission ? (
                        <div className="oj-empty-state">
                          <p className="oj-empty-sub">No errors recorded.</p>
                        </div>
                      ) : runResult ? (
                        <div>
                          <div className={`oj-status-banner oj-status-${runResult.status}`}>
                            {runResult.status === 'COMPILATION_ERROR'
                              ? '● Compilation Error'
                              : runResult.status === 'SYSTEM_ERROR'
                              ? '⚠ Execution Server Unavailable'
                              : '● Error Output'}
                          </div>
                          <pre className="oj-code-block oj-code-error">
                            {runResult.compileStderr || runResult.stderr || runResult.message || 'No error output.'}
                          </pre>
                        </div>
                      ) : lastSubmission?.error ? (
                        <div>
                          <div className="oj-status-banner oj-status-SYSTEM_ERROR">
                            ● Submission Error
                          </div>
                          <pre className="oj-code-block oj-code-error">{lastSubmission.error}</pre>
                        </div>
                      ) : null
                    )}

                    {consoleTab === 'input' && (
                      <pre className="oj-code-block">
                        {stdin ? stdin : <span className="text-secondary">No custom stdin input provided.</span>}
                      </pre>
                    )}

                    {consoleTab === 'tests' && (
                      lastSubmission ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div className={`oj-status-banner oj-status-${lastSubmission.status || 'ACCEPTED'}`}>
                            {lastSubmission.status === 'ACCEPTED'
                              ? '✓ Accepted — All Tests Passed'
                              : `● ${lastSubmission.status || 'Evaluated'}`}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--glass-border)',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>Test Cases Evaluated</span>
                              <strong style={{ color: lastSubmission.status === 'ACCEPTED' ? 'var(--neon-emerald)' : '#f87171' }}>
                                {lastSubmission.passed_tests || 0} / {lastSubmission.total_tests || 1} Passed
                              </strong>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--glass-border)',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                              }}
                            >
                              <span style={{ color: 'var(--text-muted)' }}>Public Test Case 1</span>
                              <span style={{ color: 'var(--neon-emerald)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={13} /> Passed
                              </span>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--glass-border)',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                              }}
                            >
                              <span style={{ color: 'var(--text-muted)' }}>Hidden BCE Judge Case 1</span>
                              <span style={{ color: lastSubmission.status === 'ACCEPTED' ? 'var(--neon-emerald)' : '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {lastSubmission.status === 'ACCEPTED' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                                {lastSubmission.status === 'ACCEPTED' ? 'Passed' : 'Failed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="oj-empty-state">
                          <p className="oj-empty-sub">Submit your solution to evaluate battle test cases.</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <p>No problems configured for this battle.</p>
            </Card>
          )}
        </div>
      )}

      {/* LEADERBOARD VIEW */}
      {activeTab === 'leaderboard' && (
        <Card variant="glass" style={{ padding: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            🏆 Live Battle Leaderboard ({participants.length} participants)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {participants.map((pt, idx) => {
              const isSelf = (pt.student_id || pt.profiles?.id) === currentUser?.id;
              return (
                <div
                  key={pt.student_id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isSelf ? 'rgba(6,182,212,0.1)' : 'var(--bg-card)',
                    border: isSelf ? '1px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 800, fontSize: 'var(--text-sm)', color: idx === 0 ? 'var(--neon-gold)' : 'var(--text-muted)' }}>
                      #{idx + 1}
                    </span>
                    <div style={{ fontWeight: isSelf ? 800 : 600, fontSize: 'var(--text-sm)' }}>
                      {pt.profiles?.full_name || pt.student?.full_name || 'Anonymous Student'} {isSelf && <span style={{ color: 'var(--neon-cyan)' }}>(You)</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {pt.finished_at && pt.score > 0 && battle.start_time && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Solved in {Math.round((new Date(pt.finished_at).getTime() - new Date(battle.start_time).getTime()) / 60000)}m
                      </span>
                    )}
                    <span style={{ fontWeight: 700, color: 'var(--neon-cyan)', fontSize: 'var(--text-md)' }}>
                      {pt.score || 0} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* MY SUBMISSIONS TAB */}
      {activeTab === 'submissions' && (
        <Card variant="glass" style={{ padding: 'var(--space-lg)', overflowX: 'auto' }}>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            📜 My Submissions History
          </h2>

          {mySubmissions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No submissions made yet in this battle.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Submitted At</th>
                  <th style={{ padding: '8px 12px' }}>Language</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Tests Passed</th>
                  <th style={{ padding: '8px 12px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {mySubmissions.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {new Date(sub.created_at).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{sub.language}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          background: sub.status === 'ACCEPTED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: sub.status === 'ACCEPTED' ? 'var(--neon-emerald)' : '#f87171',
                        }}
                      >
                        {sub.status}
                      </span>
                      {!sub.battle_id && (
                        <span
                          style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: 700,
                            background: 'rgba(168,85,247,0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(168,85,247,0.3)',
                          }}
                        >
                          PRACTICE
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                      {sub.passed_tests || 0} / {sub.total_tests || 0}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {sub.execution_time_ms ? `${sub.execution_time_ms} ms` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <BattleAnalyticsView
          battle={battle}
          problems={problems}
          participants={participants}
          submissions={mySubmissions}
          currentUser={currentUser}
          isInstructor={isInstructor}
          onBack={() => setActiveTab('arena')}
        />
      )}
    </div>
  );
}
