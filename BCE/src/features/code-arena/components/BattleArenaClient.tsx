'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  ArrowLeft,
  X,
  Download,
  Share2,
  Shield,
  ChevronDown,
  FileImage,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import type { CodeLanguage, NormalizedExecutionResult } from '../types';
import BattleLobby from './BattleLobby';
import BattleTimer from './BattleTimer';
import BattleEndScreen from './BattleEndScreen';
import BattleAnalyticsView from './BattleAnalyticsView';
import ProblemStatementRenderer from './ProblemStatementRenderer';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { saveDraft, getDraft } from '../storage/problemStorage';
import { downloadSvgAsImage } from '@/lib/utils/certificateExporter';
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
  const [isFullscreen, setIsFullscreen] = useState(false); // Default fullscreen mode in battle off
  const [activeRightTab, setActiveRightTab] = useState<'editor' | 'results'>('editor');

  // Editor save states
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Unsaved changes'>('Saved');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Anti-cheat states
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);
  const [isScreenHidden, setIsScreenHidden] = useState(false);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<NormalizedExecutionResult | null>(null);
  const [lastSubmission, setLastSubmission] = useState<any | null>(null);

  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [showEndModal, setShowEndModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDownloadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Synchronized Clock & Virtual Practice States
  const [serverNow, setServerNow] = useState<string | null>(null);
  const [isVirtualPractice, setIsVirtualPractice] = useState(false);
  const [virtualStartTime, setVirtualStartTime] = useState<string | null>(null);

  const [dismissCompletedBanner, setDismissCompletedBanner] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const myParticipant = participants.find(p => p.profiles?.id === currentUser?.id);
  const studentName = myParticipant?.profiles?.full_name || currentUser?.name || currentUser?.user_metadata?.name || 'BCE Star Programmer';
  const organizerName = battle.organizer_name || battle.profiles?.full_name || 'BCE Faculty';
  const organizerLogo = battle.organizer_logo || null;

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



  const downloadPNG = async () => {
    const cleanTitle = (battle.title || 'Battle').replace(/\s+/g, '_');
    await downloadSvgAsImage('battle-certificate-svg-arena', {
      filename: `${cleanTitle}_SDE_Certificate`,
      format: 'png',
      width: 1920,
      height: 1080,
    });
  };

  const downloadJPG = async () => {
    const cleanTitle = (battle.title || 'Battle').replace(/\s+/g, '_');
    await downloadSvgAsImage('battle-certificate-svg-arena', {
      filename: `${cleanTitle}_SDE_Certificate`,
      format: 'jpeg',
      width: 1920,
      height: 1080,
    });
  };

  const downloadCertificate = () => {
    const svgEl = document.getElementById('battle-certificate-svg-arena');
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URLObj = window.URL || window.webkitURL || window;
    const svgUrl = URLObj.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${battle.title.replace(/\s+/g, '_')}_BCE_Certificate.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URLObj.revokeObjectURL(svgUrl);
  };

  const shareToStatus = async () => {
    downloadPNG();
    const statusCaption = `🔥 Just completed "${battle.title}" SDE Battle on BCE Code Arena!\n🏆 Rank: #${userRank} | 🎯 Score: ${userScore} PTS\n✅ Solved: ${officialSolvedProblemIds.size}/${problems.length} Problems (${userAccuracy}% Accuracy)\n\n#Coding #BCECodeArena #Programmer #SDE`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${battle.title} SDE Battle Achievement`,
          text: statusCaption,
          url: window.location.origin + '/code-arena',
        });
      } catch (err) {
        navigator.clipboard.writeText(statusCaption);
        alert('Image downloaded! Status caption copied to clipboard. Share it on WhatsApp / Instagram Story! 🚀');
      }
    } else {
      navigator.clipboard.writeText(statusCaption);
      alert('Image downloaded! Status caption copied to clipboard. Share it on WhatsApp / Instagram Story! 🚀');
    }
  };



  // Helper to load or derive draft code partitioned by user + battle + problem + language
  const loadDraftOrStarter = async (problem: any, lang: CodeLanguage) => {
    if (!problem) return starters[lang];
    const uid = currentUser?.id || 'guest';
    const storageProbId = `${battle.id}:${problem.id}`;
    
    if (typeof window !== 'undefined') {
      const legacyKey = `bce:code-save:${uid}:${battle.id}:${problem.id}:${lang}`;
      const legacySaved = localStorage.getItem(legacyKey);
      if (legacySaved) {
        await saveDraft(uid, storageProbId, lang, legacySaved);
        localStorage.removeItem(legacyKey);
        return legacySaved;
      }
      
      // Fallback to legacy draft key to never lose code
      const draftKey = `bce:code-draft:${battle.id}:${problem.id}:${lang}`;
      const legacySaved2 = localStorage.getItem(draftKey);
      if (legacySaved2) {
        await saveDraft(uid, storageProbId, lang, legacySaved2);
        localStorage.removeItem(draftKey);
        return legacySaved2;
      }
    }

    const draft = await getDraft(uid, storageProbId, lang);
    if (draft) return draft.code;
    return problem.starterCode?.[lang] || starters[lang];
  };

  // Load initial code draft on mount
  useEffect(() => {
    async function initCode() {
      if (problems && problems[0]) {
        const initialCode = await loadDraftOrStarter(problems[0], language);
        setCode(initialCode);
      }
    }
    initCode();
  }, [problems, currentUser]);

  // Anti-cheat activity reporter
  const reportSuspiciousActivity = async (eventType: 'paste' | 'tab_switch' | 'focus_loss' | 'devtools' | 'screenshot' | 'copy', detail: string) => {
    let warningMsg = '';
    if (eventType === 'tab_switch') {
      warningMsg = 'Warning: Tab/window switching detected! Suspicious activity is logged.';
    } else if (eventType === 'focus_loss') {
      warningMsg = 'Warning: Focus loss detected! Keep your coding workspace active.';
    } else if (eventType === 'devtools') {
      warningMsg = 'Warning: Developer tools shortcut detected! Suspicious activity is logged.';
    } else if (eventType === 'paste') {
      warningMsg = 'Warning: Paste action blocked! Manual coding is required in battles.';
    } else if (eventType === 'screenshot') {
      warningMsg = 'Warning: Screenshot taking attempt detected and blocked!';
    } else if (eventType === 'copy') {
      warningMsg = 'Warning: Copying problem statement is strictly prohibited!';
    }

    setCheatWarning(warningMsg);
    setTimeout(() => setCheatWarning(null), 5000);

    try {
      const res = await fetch(`/api/coding/battles/${battle.id}/report-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, detail }),
      });
      if (res.ok) {
        // Refresh participants roster to fetch latest flagged stats
        const partRes = await fetch(`/api/coding/battles/${battle.id}/leaderboard`);
        if (partRes.ok) {
          const partData = await partRes.json();
          if (partData.participants) setParticipants(partData.participants);
        }
      }
    } catch (err) {
      console.error('Failed to report anti-cheat event:', err);
    }
  };

  // Anti-cheat visibility & window focus event listeners
  useEffect(() => {
    if (battle.status !== 'LIVE' || isInstructor || isVirtualPractice) return;

    let screenHiddenTimer: NodeJS.Timeout;

    const triggerScreenBlock = (detail: string) => {
      setIsScreenHidden(true);
      reportSuspiciousActivity('screenshot', detail);

      try {
        navigator.clipboard.writeText('');
      } catch (err) {}

      clearTimeout(screenHiddenTimer);
      screenHiddenTimer = setTimeout(() => {
        setIsScreenHidden(false);
      }, 2000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportSuspiciousActivity('tab_switch', 'User minimized window or switched browser tabs');
      }
    };

    const handleWindowBlur = () => {
      reportSuspiciousActivity('focus_loss', 'User clicked outside coding screen area');
    };

    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      const isF12 = e.key === 'F12';
      const isCtrlShiftI = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j');
      const isMacDevTools = e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i');

      if (isF12 || isCtrlShiftI || isMacDevTools) {
        e.preventDefault();
        reportSuspiciousActivity('devtools', `Keyboard shortcut devtools access: ${e.key}`);
      }

      // 1. Detect PrintScreen Key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        triggerScreenBlock('User pressed PrintScreen key');
      }

      // 2. Detect Screenshot Shortcuts
      const isShiftS = e.shiftKey && e.key.toLowerCase() === 's';
      const isWinShiftS = e.metaKey && isShiftS; // Windows Key + Shift + S
      const isCtrlShiftS = e.ctrlKey && isShiftS; // Ctrl + Shift + S
      
      // Mac Screenshot commands: Cmd + Shift + 3, 4, 5
      const isMacScreenshot = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key);

      if (isWinShiftS || isCtrlShiftS || isMacScreenshot) {
        e.preventDefault();
        triggerScreenBlock(`User triggered screenshot shortcut: ${e.key}`);
      }

      // 3. Prevent Print Page (Ctrl + P or Cmd + P)
      const isPrint = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p';
      if (isPrint) {
        e.preventDefault();
        triggerScreenBlock('User attempted to print/save page');
      }
    };

    const handleKeyUpGlobal = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        triggerScreenBlock('User released PrintScreen key');
      }
    };

    const handleCopyGlobal = (e: Event) => {
      e.preventDefault();
      try {
        navigator.clipboard.writeText('Copying is disabled in live battles.');
      } catch (err) {}
      reportSuspiciousActivity('copy', 'User attempted to copy screen content');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDownGlobal);
    window.addEventListener('keyup', handleKeyUpGlobal);
    document.addEventListener('copy', handleCopyGlobal);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDownGlobal);
      window.removeEventListener('keyup', handleKeyUpGlobal);
      document.removeEventListener('copy', handleCopyGlobal);
      clearTimeout(screenHiddenTimer);
    };
  }, [battle.status, isInstructor, isVirtualPractice]);

  const saveCode = async (newCode: string, probId: string, lang: CodeLanguage) => {
    setSaveStatus('Saving...');
    const uid = currentUser?.id || 'guest';
    await saveDraft(uid, `${battle.id}:${probId}`, lang, newCode);
    setSaveStatus('Saved');
  };

  // Initialize code when problem or language changes
  const handleSelectProblem = async (idx: number) => {
    setActiveProblemIdx(idx);
    const prob = problems[idx];
    if (prob) {
      const loadedCode = await loadDraftOrStarter(prob, language);
      setCode(loadedCode);
      setSaveStatus('Saved');
    }
  };

  const handleSelectLanguage = async (lang: CodeLanguage) => {
    setLanguage(lang);
    if (currentProblem) {
      const loadedCode = await loadDraftOrStarter(currentProblem, lang);
      setCode(loadedCode);
      setSaveStatus('Saved');
    }
  };

  const handleCodeChange = (newVal: string) => {
    setCode(newVal);
    setSaveStatus('Unsaved changes');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (currentProblem) {
        saveCode(newVal, currentProblem.id, language);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const resetCode = () => {
    if (confirm(`Reset code editor to starter template for ${language}?`)) {
      if (currentProblem) {
        const starter = currentProblem.starterCode?.[language] || starters[language];
        setCode(starter);
        saveCode(starter, currentProblem.id, language);
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
    setActiveRightTab('results');
 
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
    setActiveRightTab('results');

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
      {/* Visual Overlay for Screenshot Blocker */}
      {isScreenHidden && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 15, 25, 0.96)',
          backdropFilter: 'blur(20px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-danger, #ef4444)',
          gap: '16px',
        }}>
          <AlertTriangle size={64} style={{ animation: 'bounce 1s infinite' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '1px' }}>
            SCREENSHOT DETECTED / PROHIBITED!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Taking screenshots is strictly forbidden during live coding battles.
          </p>
        </div>
      )}
      {/* Anti-cheat suspension warning banner */}
      {cheatWarning && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(239, 68, 68, 0.95)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
          zIndex: 10000,
          fontWeight: 700,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #f87171',
          backdropFilter: 'blur(8px)',
        }}>
          <AlertTriangle size={16} />
          {cheatWarning}
        </div>
      )}

      {/* Compact Battle Room IDE Header Bar */}
      <header className="code-arena-header-compact">
        <div className="code-arena-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeTab !== 'arena' ? (
            <button 
              onClick={() => setActiveTab('arena')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--neon-cyan, #06b6d4)',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.18)';
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.25)';
              }}
            >
              <ArrowLeft size={14} /> Back to Arena
            </button>
          ) : (
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to leave the battle room?')) {
                  window.location.href = '/code-arena';
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-danger, #ef4444)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
              }}
            >
              <ArrowLeft size={14} /> Leave Battle
            </button>
          )}
          <div>
            <h1 className="code-arena-header-title" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginRight: '4px' }}>Battle:</span> {battle.title}
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


        </div>
      </header>

      {/* End Battle Summary Modal */}
      {showEndModal && (
        <BattleEndScreen
          battle={battle}
          currentUser={currentUser}
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
          onClose={() => setShowEndModal(false)}
        />
      )}

      {/* ARENA MAIN VIEW */}
      {activeTab === 'arena' && (
        <div className="code-arena-workspace-container">
          {/* Virtual Practice and Completion Banners */}
          {battle.status === 'COMPLETED' && !isVirtualPractice && !dismissCompletedBanner ? (
            <Card
              style={{
                background: 'linear-gradient(135deg, rgba(11, 15, 25, 0.9), rgba(30, 27, 75, 0.9))',
                border: '1px solid var(--neon-cyan)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-2xl) var(--space-xl)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-lg)',
                maxWidth: '650px',
                margin: '40px auto',
                boxShadow: '0 10px 30px rgba(0,240,255,0.1)',
                position: 'relative'
              }}
            >
              {/* Top Left Organizer Logo */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: 10,
                }}
                title={`Organized by ${organizerName}`}
              >
                {organizerLogo ? (
                  organizerLogo.trim().startsWith('<svg') ? (
                    <div
                      style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      dangerouslySetInnerHTML={{ __html: organizerLogo }}
                    />
                  ) : (
                    <img
                      src={organizerLogo}
                      alt={organizerName}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        objectFit: 'contain',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        padding: '2px',
                      }}
                    />
                  )
                ) : (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(168,85,247,0.2))',
                      border: '1px solid var(--neon-cyan)',
                      color: 'var(--neon-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '13px',
                    }}
                  >
                    <Shield size={16} />
                  </div>
                )}
              </div>

              {/* Dismiss cross button */}
              <button
                type="button"
                onClick={() => setDismissCompletedBanner(true)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                  zIndex: 10
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="Dismiss Banner"
              >
                <X size={20} />
              </button>

              {/* The Hidden SVG Container for Certificate Download */}
              {isMounted && (
                <div style={{ display: 'none' }} suppressHydrationWarning>
                  <svg id="battle-certificate-svg-arena" suppressHydrationWarning xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="100%" height="100%" style={{ borderRadius: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  <defs>
                    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#050814" />
                      <stop offset="50%" stopColor="#0b1021" />
                      <stop offset="100%" stopColor="#04060e" />
                    </linearGradient>

                    <linearGradient id="cyanPurpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00f0ff" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>

                    <linearGradient id="silverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="50%" stopColor="#e2e8f0" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>

                    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="30%" stopColor="#fbbf24" />
                      <stop offset="70%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#92400e" />
                    </linearGradient>

                    <linearGradient id="silverMedalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="30%" stopColor="#e2e8f0" />
                      <stop offset="70%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>

                    <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffedd5" />
                      <stop offset="30%" stopColor="#f97316" />
                      <stop offset="70%" stopColor="#c2410c" />
                      <stop offset="100%" stopColor="#7c2d12" />
                    </linearGradient>

                    <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#0284c7" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>

                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Base Background */}
                  <rect width="1200" height="800" fill="url(#bgGrad)" rx="16" />

                  {/* Circuit Grid pattern */}
                  <g opacity="0.05" stroke="#ffffff" strokeWidth="1">
                    <path d="M 0,100 H 1200 M 0,200 H 1200 M 0,300 H 1200 M 0,400 H 1200 M 0,500 H 1200 M 0,600 H 1200 M 0,700 H 1200" />
                    <path d="M 150,0 V 800 M 300,0 V 800 M 450,0 V 800 M 600,0 V 800 M 750,0 V 800 M 900,0 V 800 M 1050,0 V 800" />
                  </g>

                  {/* Glowing Corner Orbs */}
                  <circle cx="0" cy="0" r="300" fill="#00f0ff" opacity="0.1" filter="url(#glow)" />
                  <circle cx="1200" cy="800" r="350" fill="#7f00ff" opacity="0.1" filter="url(#glow)" />

                  {/* Outer Neon Border */}
                  <rect x="24" y="24" width="1152" height="752" rx="14" fill="none" stroke="url(#cyanPurpleGrad)" strokeWidth="2.5" />
                  <rect x="32" y="32" width="1136" height="736" rx="10" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />

                  {/* Ornate Corner Tech Accents */}
                  <path d="M 20,60 L 20,20 L 60,20 M 24,70 L 70,24" stroke="#00f0ff" strokeWidth="2.5" fill="none" />
                  <path d="M 1180,60 L 1180,20 L 1140,20 M 1176,70 L 1130,24" stroke="#00f0ff" strokeWidth="2.5" fill="none" />
                  <path d="M 20,740 L 20,780 L 60,780 M 24,730 L 70,776" stroke="#7f00ff" strokeWidth="2.5" fill="none" />
                  <path d="M 1180,740 L 1180,780 L 1140,780 M 1176,730 L 1130,776" stroke="#7f00ff" strokeWidth="2.5" fill="none" />

                  {/* TOP LEFT: Instructor/Organizer Logo */}
                  {organizerLogo ? (
                    <g transform="translate(60, 50)">
                      <rect x="-10" y="-10" width="180" height="70" rx="10" fill="rgba(11, 16, 33, 0.6)" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" />
                      <image href={organizerLogo} x="0" y="0" width="160" height="50" preserveAspectRatio="xMidYMid contain" />
                    </g>
                  ) : (
                    <g transform="translate(140, 150)">
                      <path d="M -45,15 C -60,-5 -55,-30 -40,-45 C -45,-25 -40,-10 -35,5 M -55,35 C -70,15 -65,-10 -50,-25 C -55,-5 -50,10 -45,25" stroke="#38bdf8" strokeWidth="2" fill="none" />
                      <path d="M -40,-40 C -35,-50 -20,-55 -10,-55 M -50,-20 C -45,-32 -30,-40 -15,-40" stroke="#38bdf8" strokeWidth="2" fill="none" />
                      <path d="M 45,15 C 60,-5 55,-30 40,-45 C 45,-25 40,-10 35,5 M 55,35 C 70,15 65,-10 50,-25 C 55,-5 50,10 45,25" stroke="#38bdf8" strokeWidth="2" fill="none" />
                      <path d="M 40,-40 C 35,-50 20,-55 10,-55 M 50,-20 C 45,-32 30,-40 15,-40" stroke="#38bdf8" strokeWidth="2" fill="none" />
                      <path d="M 0,-50 L -35,-35 C -35,0 -20,35 0,55 C 20,35 35,0 35,-35 Z" fill="rgba(6, 182, 212, 0.12)" stroke="#00f0ff" strokeWidth="3" filter="url(#glow)" />
                      <path d="M 0,-42 L -28,-29 C -28,0 -16,28 0,44 C 16,28 28,0 28,-29 Z" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
                      <text x="0" y="8" textAnchor="middle" fill="#00f0ff" fontSize="20" fontWeight="900" fontFamily="monospace" filter="url(#glow)">&lt;/&gt;</text>
                    </g>
                  )}

                  {/* TOP CENTER: Smart Learn Branding */}
                  <g transform="translate(600, 95)">
                    <g transform="translate(0, -28)">
                      <polygon points="0,-18 16,0 0,18 -16,0" fill="url(#cyanPurpleGrad)" opacity="0.9" />
                      <polygon points="0,-12 11,0 0,12 -11,0" fill="#0b1021" />
                      <text x="0" y="4" textAnchor="middle" fill="#00f0ff" fontSize="10" fontWeight="900" fontFamily="monospace">&lt;&gt;</text>
                    </g>

                    <text x="0" y="8" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" letterSpacing="4">SMART LEARN</text>
                    <text x="0" y="28" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="800" letterSpacing="3">{(organizerName || 'OFFICIAL BATTLE CERTIFICATE').toUpperCase()}</text>
                  </g>

                  {/* TOP RIGHT: Certificate ID */}
                  <g transform="translate(1110, 60)">
                    <rect x="-240" y="-12" width="240" height="26" rx="6" fill="rgba(6, 182, 212, 0.1)" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1" />
                    <text x="-120" y="5" textAnchor="middle" fill="#00f0ff" fontSize="11" fontWeight="700" fontFamily="monospace">
                      ID: {myParticipant?.certificate_code || myParticipant?.id?.substring(0, 18)?.toUpperCase() || 'CB-2026-LIVE-BATTLE'}
                    </text>
                  </g>

                  {/* MAIN HEADER TITLE */}
                  <g transform="translate(600, 200)">
                    <text x="0" y="0" textAnchor="middle" fill="url(#silverGrad)" fontSize="60" fontWeight="900" letterSpacing="8" filter="url(#glow)">CERTIFICATE</text>
                    
                    {/* Sub-Line with Cyan Diamonds */}
                    <g transform="translate(0, 35)">
                      <line x1="-280" y1="0" x2="-140" y2="0" stroke="url(#cyanPurpleGrad)" strokeWidth="2" />
                      <circle cx="-140" cy="0" r="3" fill="#00f0ff" />
                      <polygon points="-120,0 -115,-5 -110,0 -115,5" fill="#00f0ff" />
                      <circle cx="-105" cy="0" r="2" fill="#00f0ff" />

                      <text x="0" y="6" textAnchor="middle" fill="url(#cyanPurpleGrad)" fontSize="18" fontWeight="800" letterSpacing="5">OF CODING BATTLE</text>

                      <circle cx="105" cy="0" r="2" fill="#00f0ff" />
                      <polygon points="110,0 115,-5 120,0 115,5" fill="#00f0ff" />
                      <circle cx="140" cy="0" r="3" fill="#00f0ff" />
                      <line x1="140" y1="0" x2="280" y2="0" stroke="url(#cyanPurpleGrad)" strokeWidth="2" />
                    </g>
                  </g>

                  {/* RECIPIENT SECTION */}
                  <text x="600" y="300" textAnchor="middle" fill="#94a3b8" fontSize="16" fontWeight="500">This is to certify that</text>

                  {/* Recipient Name in Cyan-Purple Gradient */}
                  <text x="600" y="365" textAnchor="middle" fill="url(#cyanPurpleGrad)" fontSize="54" fontWeight="900" letterSpacing="1" filter="url(#glow)">
                    {studentName}
                  </text>
                  <line x1="380" y1="385" x2="820" y2="385" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

                  {/* Description Text */}
                  <text x="600" y="420" textAnchor="middle" fill="#cbd5e1" fontSize="15" fontWeight="500">
                    has successfully participated in the Coding Battle "{battle.title || 'Code Arena Battle'}" and demonstrated
                  </text>
                  <text x="600" y="445" textAnchor="middle" fill="#cbd5e1" fontSize="15" fontWeight="500">
                    exceptional problem-solving skills, algorithmic logic, and coding performance.
                  </text>

                  {/* 3 KEY STATS CARDS (DATE, SCORE, RANK) */}
                  <g transform="translate(600, 520)">
                    <line x1="-350" y1="-30" x2="350" y2="-30" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

                    {/* 1. DATE */}
                    <g transform="translate(-240, 0)">
                      <rect x="-60" y="-18" width="36" height="36" rx="8" fill="rgba(56, 189, 248, 0.1)" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
                      <path d="M -48,-8 H -36 M -48,-2 H -36 M -48,4 H -40" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                      <rect x="-50" y="-12" width="16" height="18" rx="2" fill="none" stroke="#38bdf8" strokeWidth="1.5" />

                      <text x="-10" y="-4" fill="#94a3b8" fontSize="11" fontWeight="700" letterSpacing="1">DATE</text>
                      <text x="-10" y="16" fill="#ffffff" fontSize="16" fontWeight="700">
                        {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </text>
                    </g>

                    <line x1="-60" y1="-15" x2="-60" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                    {/* 2. SCORE */}
                    <g transform="translate(0, 0)">
                      <rect x="-60" y="-18" width="36" height="36" rx="8" fill="rgba(168, 85, 247, 0.1)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" />
                      <path d="M -46,-10 H -38 V -2 C -38,3 -42,6 -46,6 Z M -38,-10 V 2 C -38,6 -42,8 -46,8 M -46,8 V 14 M -50,14 H -42" stroke="#a855f7" strokeWidth="1.5" fill="none" />

                      <text x="-10" y="-4" fill="#a855f7" fontSize="11" fontWeight="700" letterSpacing="1">SCORE</text>
                      <text x="-10" y="16" fill="#ffffff" fontSize="16" fontWeight="700">{userScore || 0}</text>
                    </g>

                    <line x1="120" y1="-15" x2="120" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                    {/* 3. RANK */}
                    <g transform="translate(180, 0)">
                      <rect x="-40" y="-18" width="36" height="36" rx="8" fill="rgba(168, 85, 247, 0.1)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" />
                      <polygon points="-22,-12 -18,-2 -8,-2 -15,4 -12,14 -22,8 -32,14 -29,4 -36,-2 -26,-2" fill="#a855f7" opacity="0.9" />

                      <text x="10" y="-4" fill="#38bdf8" fontSize="11" fontWeight="700" letterSpacing="1">RANK</text>
                      <text x="10" y="16" fill="#ffffff" fontSize="16" fontWeight="700">{userRank ? `#${userRank}` : 'Top 10%'}</text>
                    </g>

                    <line x1="-350" y1="45" x2="350" y2="45" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
                  </g>

                  {/* SIGNATURES & RANK MEDAL BADGE SECTION */}
                  <g transform="translate(600, 650)">
                    {/* CENTER RANK-DRIVEN MEDAL BADGE */}
                    <g transform="translate(0, 0)">
                      {userRank === 1 ? (
                        <>
                          <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#d97706" stroke="#92400e" strokeWidth="1" />
                          <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#d97706" stroke="#92400e" strokeWidth="1" />
                          <circle cx="0" cy="0" r="48" fill="url(#goldGrad)" stroke="#fef08a" strokeWidth="2.5" filter="url(#glow)" />
                          <circle cx="0" cy="0" r="42" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                          <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#goldGrad)" strokeWidth="2" />
                          <path d="M -16,8 L -20,-10 L -10,-2 L 0,-14 L 10,-2 L 20,-10 L 16,8 Z" fill="#fbbf24" />
                          <text x="0" y="24" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="900" letterSpacing="1">RANK #1</text>
                        </>
                      ) : userRank === 2 ? (
                        <>
                          <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#64748b" stroke="#334155" strokeWidth="1" />
                          <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#64748b" stroke="#334155" strokeWidth="1" />
                          <circle cx="0" cy="0" r="48" fill="url(#silverMedalGrad)" stroke="#ffffff" strokeWidth="2.5" filter="url(#glow)" />
                          <circle cx="0" cy="0" r="42" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                          <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#silverMedalGrad)" strokeWidth="2" />
                          <polygon points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4" fill="#e2e8f0" />
                          <text x="0" y="24" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="900" letterSpacing="1">RANK #2</text>
                        </>
                      ) : userRank === 3 ? (
                        <>
                          <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#c2410c" stroke="#7c2d12" strokeWidth="1" />
                          <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#c2410c" stroke="#7c2d12" strokeWidth="1" />
                          <circle cx="0" cy="0" r="48" fill="url(#bronzeGrad)" stroke="#ffedd5" strokeWidth="2.5" filter="url(#glow)" />
                          <circle cx="0" cy="0" r="42" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                          <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#bronzeGrad)" strokeWidth="2" />
                          <polygon points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4" fill="#f97316" />
                          <text x="0" y="24" textAnchor="middle" fill="#f97316" fontSize="10" fontWeight="900" letterSpacing="1">RANK #3</text>
                        </>
                      ) : (
                        <>
                          <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                          <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                          <circle cx="0" cy="0" r="48" fill="url(#sealGrad)" stroke="#38bdf8" strokeWidth="2.5" filter="url(#glow)" />
                          <circle cx="0" cy="0" r="42" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                          <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#sealGrad)" strokeWidth="2" />
                          <text x="0" y="6" textAnchor="middle" fill="#00f0ff" fontSize="20" fontWeight="900" fontFamily="monospace">&lt;/&gt;</text>
                          <text x="0" y="24" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="900" letterSpacing="1">VERIFIED</text>
                        </>
                      )}
                    </g>

                    {/* AUTHORIZED INSTRUCTOR SIGNATURE */}
                    <g transform="translate(320, 0)">
                      {battle.instructor_signature ? (
                        <g transform="translate(-100, -45)">
                          <image href={battle.instructor_signature} x="0" y="0" width="200" height="45" preserveAspectRatio="xMidYMid contain" />
                        </g>
                      ) : (
                        <text x="0" y="-20" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="400" fontFamily="'Brush Script MT', 'Dancing Script', cursive, serif" fontStyle="italic">
                          {battle.instructor_name || 'Aditya Kumar Sah'}
                        </text>
                      )}
                      <line x1="-110" y1="-5" x2="110" y2="-5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                      <text x="0" y="16" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="800" letterSpacing="1">
                        {(battle.instructor_name || 'ADITYA KUMAR SAH').toUpperCase()}
                      </text>
                      <text x="0" y="32" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
                        {battle.instructor_designation || 'The Developer & The Coder'}
                      </text>
                    </g>
                  </g>

                  {/* FOOTER VERIFICATION LINK */}
                  <g transform="translate(600, 762)">
                    <circle cx="-210" cy="-4" r="9" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="1" />
                    <path d="M -214,-4 L -211,-1 L -205,-7" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                    <text x="-195" y="0" textAnchor="start" fill="#64748b" fontSize="12" fontWeight="600">
                      Verify this certificate at: <tspan fill="#38bdf8" fontWeight="700">{typeof window !== 'undefined' ? `${window.location.origin}/verify/certificate/${myParticipant?.id || battle.id}` : 'https://smartlearn.com/verify'}</tspan>
                    </text>
                  </g>
                </svg>
              </div>
              )}

              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(124,58,237,0.2))',
                  border: '2px solid var(--neon-cyan)',
                  color: 'var(--neon-cyan)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Trophy size={40} style={{ animation: 'pulse 2s infinite' }} />
              </div>

              <div>
                <h2 className="text-gradient" style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0' }}>
                  Thank You for Participating!
                </h2>

                {/* Participant and Organizer Info */}
                <div style={{ margin: '12px 0 6px 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Participant: <span style={{ color: 'var(--neon-gold)' }}>{studentName}</span>
                  <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.2)' }}>|</span>
                  Organized by: <span style={{ color: 'var(--neon-cyan)' }}>{organizerName}</span>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginTop: '6px' }}>
                  The battle <strong>{battle.title}</strong> has ended. Coding workspace and submissions are now closed.
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '16px 24px',
                width: '100%',
                display: 'flex',
                justifyContent: 'space-around',
                margin: '8px 0'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rank</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--neon-gold)' }}>#{userRank}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--neon-cyan)' }}>{userScore} pts</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Solved</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--neon-emerald)' }}>{officialSolvedProblemIds.size} / {problems.length}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                {/* 3-Option Download Dropdown Button */}
                <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
                  <Button
                    variant="secondary"
                    onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                    style={{
                      background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#fff',
                      boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
                    }}
                  >
                    <Download size={16} /> Download Certificate <ChevronDown size={14} />
                  </Button>

                  {showDownloadDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#0b0f19',
                        border: '1px solid var(--neon-cyan)',
                        borderRadius: '12px',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: '230px',
                        zIndex: 1000,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.9), 0 0 15px rgba(0,240,255,0.2)',
                      }}
                    >
                      <button
                        onClick={() => { setShowDownloadDropdown(false); downloadPNG(); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                          padding: '10px 12px', borderRadius: '8px', background: 'transparent',
                          border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <ImageIcon size={16} style={{ color: 'var(--neon-cyan)' }} />
                        <div>
                          <div>PNG Certificate</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>High-res image (.png)</div>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowDownloadDropdown(false); downloadJPG(); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                          padding: '10px 12px', borderRadius: '8px', background: 'transparent',
                          border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <FileImage size={16} style={{ color: '#a855f7' }} />
                        <div>
                          <div>JPG Certificate</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Standard image (.jpg)</div>
                        </div>
                      </button>

                      <button
                        onClick={() => { setShowDownloadDropdown(false); downloadCertificate(); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                          padding: '10px 12px', borderRadius: '8px', background: 'transparent',
                          border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <FileCode size={16} style={{ color: '#fbbf24' }} />
                        <div>
                          <div>SVG Certificate</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Vector graphics file (.svg)</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  onClick={shareToStatus}
                  style={{
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(168,85,247,0.2))',
                    border: '1px solid #3b82f6',
                    color: '#60a5fa',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Share2 size={16} /> 📲 Add to Status / Story
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsVirtualPractice(true);
                    setVirtualStartTime(new Date().toISOString());
                  }}
                  style={{
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ⚡ Practice Mode
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('leaderboard')}
                  style={{ fontWeight: 700 }}
                >
                  🏆 View Leaderboard
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('analytics')}
                  style={{ fontWeight: 700 }}
                >
                  📊 View Analytics
                </Button>
              </div>
            </Card>
          ) : (
            <>
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
              <section className={`code-workspace-panel ${activeRightTab === 'editor' ? 'show-editor' : 'show-results'}`}>
                {/* Right panel view toggle */}
                <div className="right-panel-view-toggle">
                  <button 
                    type="button"
                    className={`view-toggle-btn ${activeRightTab === 'editor' ? 'active' : ''}`}
                    onClick={() => setActiveRightTab('editor')}
                  >
                    Terminal
                  </button>
                  <button 
                    type="button"
                    className={`view-toggle-btn ${activeRightTab === 'results' ? 'active' : ''}`}
                    onClick={() => setActiveRightTab('results')}
                  >
                    Submit
                  </button>
                </div>
                {/* Monaco Container with protections and captures */}
                <div 
                  className={`code-monaco-wrapper ${isFullscreen ? 'code-editor-fullscreen' : ''}`}
                  onContextMenuCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onCopyCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onCutCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onPasteCapture={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    reportSuspiciousActivity('paste', 'User attempted to paste text into editor');
                  }}
                  onDragStartCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDropCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onKeyDownCapture={(e) => {
                    const isMod = e.ctrlKey || e.metaKey;
                    if (isMod && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.key.toLowerCase() === 'v') {
                        reportSuspiciousActivity('paste', 'User attempted to paste code via keyboard shortcut');
                      }
                    }
                  }}
                >
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
                      {/* Save Button and Status indicator */}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '6px' }}>
                        {saveStatus}
                      </span>
                      <button
                        type="button"
                        onClick={() => currentProblem && saveCode(code, currentProblem.id, language)}
                        style={{
                          background: 'rgba(6, 182, 212, 0.1)',
                          border: '1px solid rgba(6, 182, 212, 0.3)',
                          color: 'var(--neon-cyan)',
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginRight: '8px',
                        }}
                      >
                        Save
                      </button>

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
                    height={isFullscreen ? 'calc(100vh - 50px)' : '100%'}
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
            </>
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
                    <div style={{ fontWeight: isSelf ? 800 : 600, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{pt.profiles?.full_name || pt.student?.full_name || 'Anonymous Student'} {isSelf && <span style={{ color: 'var(--neon-cyan)' }}>(You)</span>}</span>
                      {pt.is_flagged && (
                        <span 
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.15)', 
                            color: '#f87171', 
                            fontSize: '9px', 
                            padding: '1px 6px', 
                            borderRadius: '4px', 
                            fontWeight: 700, 
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            cursor: 'help'
                          }}
                          title={`Suspicious violations detail:\n- Paste attempts: ${pt.suspicious_paste_count || 0}\n- Tab/Window switches: ${pt.tab_switch_count || 0}\n- Focus losses: ${pt.focus_loss_count || 0}\n- DevTools events: ${pt.devtools_count || 0}`}
                        >
                          <AlertTriangle size={10} /> SUSPICIOUS
                        </span>
                      )}
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

          {(() => {
            const battleSubmissions = mySubmissions.filter(
              (sub) => sub.battle_id === battle.id || (isVirtualPractice && problems.some((p) => p.id === sub.problem_id))
            );

            if (battleSubmissions.length === 0) {
              return <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No submissions made yet in this battle.</p>;
            }

            return (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Submitted At</th>
                    <th style={{ padding: '8px 12px' }}>Problem</th>
                    <th style={{ padding: '8px 12px' }}>Language</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Tests Passed</th>
                    <th style={{ padding: '8px 12px' }}>Exec Runtime</th>
                  </tr>
                </thead>
                <tbody>
                  {battleSubmissions.map((sub) => {
                    const subProblem = problems.find((p) => p.id === sub.problem_id);
                    const problemTitle = subProblem ? subProblem.title : 'Unknown Problem';
                    const problemIdx = problems.findIndex((p) => p.id === sub.problem_id);
                    
                    const execTimeDisplay = sub.execution_time_ms
                      ? `${sub.execution_time_ms} ms`
                      : (sub.created_at && battle?.start_time && new Date(sub.created_at) >= new Date(battle.start_time))
                      ? `+${Math.floor((new Date(sub.created_at).getTime() - new Date(battle.start_time).getTime()) / 60000)}m ${Math.floor(((new Date(sub.created_at).getTime() - new Date(battle.start_time).getTime()) % 60000) / 1000)}s`
                      : (sub.status === 'ACCEPTED' ? '< 50 ms' : 'N/A');

                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {new Date(sub.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          })}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => {
                              if (problemIdx !== -1) {
                                handleSelectProblem(problemIdx);
                                setActiveTab('arena');
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--neon-cyan)',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 700,
                              fontSize: 'var(--text-sm)',
                              textAlign: 'left'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'var(--neon-pink)'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--neon-cyan)'}
                          >
                            {problemTitle}
                          </button>
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
                        <td style={{ padding: '10px 12px', color: 'var(--neon-cyan)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                          {execTimeDisplay}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </Card>
      )}

      {/* ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <BattleAnalyticsView
          battle={battle}
          problems={problems}
          participants={participants}
          submissions={isVirtualPractice ? mySubmissions.filter((s) => problems.some((p) => p.id === s.problem_id)) : officialSubmissions}
          currentUser={currentUser}
          isInstructor={isInstructor}
          onBack={() => setActiveTab('arena')}
        />
      )}
    </div>
  );
}
