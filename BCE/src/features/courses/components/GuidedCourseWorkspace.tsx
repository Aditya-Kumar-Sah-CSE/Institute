'use client';

import '@/lib/monacoInit';
import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Eye,
  FileText,
  FolderGit2,
  Globe,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  UploadCloud,
  Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import LessonView from '@/features/courses/components/LessonView';
import AssignmentCard from '@/features/courses/components/AssignmentCard';
import LessonDoubts from '@/app/(dashboard)/courses/[courseId]/[lessonId]/components/LessonDoubts';
import { registerMonacoIntelliSense, intelliSenseEditorOptions } from '@/features/code-arena/lib/monacoIntelliSense';
import { useSmartAgentSession } from '@/features/analytics/context/SmartAgentSessionContext';
import type { Assignment, Lesson, Submission } from '@/types';
import type { GuidedLessonStep, SidebarLessonSummary } from '../types/guided';
import './GuidedCourseWorkspace.css';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Loading Code Editor…</div>,
});

const TerminalWorkspace = dynamic(() => import('@/features/code-arena/components/TerminalWorkspace'), {
  ssr: false,
  loading: () => <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Starting Smart Learn Terminal…</div>,
});

interface GuidedCourseWorkspaceProps {
  courseId: string;
  courseTitle: string;
  lesson: Lesson;
  allLessons: SidebarLessonSummary[];
  completedLessonIds: string[];
  isCompleted: boolean;
  onComplete: () => Promise<void>;
  assignments?: Assignment[];
  submissions?: Submission[];
  allSubmissions?: any[];
  submitAssignment?: (assignmentId: string, formData: FormData) => Promise<void>;
  doubts?: any[];
  showDoubts?: boolean;
}

type RightTab = 'console' | 'preview' | 'terminal' | 'analysis';
type MobilePane = 'curriculum' | 'lesson' | 'workspace';

function buildLiveHtmlDocument(rawCode: string): string {
  const bridge = `<script>
(function() {
  var send = function(type, args) {
    try {
      var text = Array.prototype.slice.call(args).map(function(a) {
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch(e) { return String(a); } }
        return String(a);
      }).join(' ');
      window.parent.postMessage({ source: 'smartlearn-preview', type: type, text: text }, '*');
    } catch(e) {}
  };
  var origLog = console.log, origErr = console.error, origWarn = console.warn;
  console.log = function() { send('log', arguments); origLog.apply(console, arguments); };
  console.warn = function() { send('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function() { send('error', arguments); origErr.apply(console, arguments); };
  window.onerror = function(msg, url, line) { send('error', [msg + ' (line ' + line + ')']); };
})();
</script>`;

  const trimmed = rawCode.trim();
  if (/<!doctype|<html|<body/i.test(trimmed)) {
    if (trimmed.includes('<head>')) return trimmed.replace('<head>', `<head>${bridge}`);
    return `${bridge}\n${trimmed}`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: system-ui, sans-serif; padding: 16px; background: #0f172a; color: #f8fafc; margin: 0; }
  button { background: #0ea5e9; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }
</style>
${bridge}
</head>
<body>
<div id="app">Preview Console Mode Ready — check Output tab or render DOM elements into #app.</div>
<script>
${trimmed}
</script>
</body>
</html>`;
}

export default function GuidedCourseWorkspace({
  courseId,
  courseTitle,
  lesson,
  allLessons,
  completedLessonIds,
  isCompleted,
  onComplete,
  assignments = [],
  submissions = [],
  allSubmissions = [],
  submitAssignment,
  doubts = [],
  showDoubts = false,
}: GuidedCourseWorkspaceProps) {
  const router = useRouter();
  const smartAgentSession = useSmartAgentSession();

  const steps: GuidedLessonStep[] = useMemo(() => {
    const raw = (lesson as any)?.interactive_steps;
    return Array.isArray(raw) ? (raw as GuidedLessonStep[]) : [];
  }, [lesson]);

  const [viewMode, setViewMode] = useState<'guided' | 'classic'>('guided');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobilePane, setMobilePane] = useState<MobilePane>('lesson');
  const [showDoubtsDrawer, setShowDoubtsDrawer] = useState<boolean>(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(true);

  useEffect(() => {
    const syncTheme = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setIsDarkTheme(t === 'dark');
    };
    syncTheme();
    const obs = new MutationObserver(syncTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // Expanded weeks in Left Sidebar
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>(() => ({
    [lesson.week_number || 1]: true,
  }));

  // Step state & completion persistence per lesson
  const storageKey = `bce:guided-steps:${courseId}:${lesson.id}`;
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return new Set(JSON.parse(saved));
      } catch {}
    }
    return isCompleted ? new Set(steps.map(s => s.id)) : new Set<string>();
  });

  useEffect(() => {
    if (isCompleted && steps.length > 0) {
      setCompletedStepIds(new Set(steps.map(s => s.id)));
    }
  }, [isCompleted, steps]);

  const markStepDoneLocal = (stepId: string) => {
    setCompletedStepIds(prev => {
      const next = new Set(prev);
      next.add(stepId);
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Interactive task reveals (Hints 1->2->3 and Reference Solutions)
  const [revealedHintsCount, setRevealedHintsCount] = useState<Record<string, number>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeStep: GuidedLessonStep = steps[Math.min(activeStepIdx, Math.max(0, steps.length - 1))] || {
    id: 'fallback',
    stepNumber: 1,
    kind: 'overview',
    badge: 'Lesson',
    title: lesson.title,
    summary: '',
    runMode: 'none',
  };

  // Right Workspace State (Code per step, execution output, HTML preview, AI topic analysis)
  const [codeByStep, setCodeByStep] = useState<Record<string, string>>({});
  const [editorLang, setEditorLang] = useState<'javascript' | 'html'>('javascript');
  const [rightTab, setRightTab] = useState<RightTab>('console');
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOut, setConsoleOut] = useState<string>('');
  const [consoleErr, setConsoleErr] = useState<string>('');
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // AI Topic & Code Analysis state (Right Pane)
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiFollowupReply, setAiFollowupReply] = useState<string | null>(null);
  const [aiFollowupLoading, setAiFollowupLoading] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);

  // Active editor code for the current step
  const defaultCodeForStep =
    activeStep.starterCode ||
    activeStep.codeSnippet ||
    `// ${activeStep.title}\nconsole.log('Practice active step live!');`;

  const editorCode = codeByStep[activeStep.id] ?? defaultCodeForStep;

  // Sync editor language & tab smoothly when switching steps
  useEffect(() => {
    if (steps.length === 0) return;
    const code = codeByStep[activeStep.id] ?? (activeStep.starterCode || activeStep.codeSnippet || '');
    const isHtml =
      activeStep.runMode === 'html_preview' || /<!doctype|<html|<body/i.test(code);
    setEditorLang(isHtml ? 'html' : 'javascript');
    if (isHtml) {
      setRightTab('preview');
      setPreviewSrcDoc(buildLiveHtmlDocument(code));
    } else if (rightTab === 'preview') {
      setRightTab('console');
    }
    setConsoleOut('');
    setConsoleErr('');
    setExecTimeMs(null);
    setAiFollowupReply(null);
  }, [activeStep.id, steps.length]);

  // Listen to iframe console bridge messages
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (ev.data?.source !== 'smartlearn-preview') return;
      const line = String(ev.data.text ?? '');
      if (ev.data.type === 'error') {
        setConsoleErr(prev => (prev ? `${prev}\n${line}` : line));
      } else {
        setConsoleOut(prev => (prev ? `${prev}\n${line}` : line));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Group all course lessons by Week for Left Sidebar
  const weeks = useMemo(() => {
    const grouped = new Map<number, SidebarLessonSummary[]>();
    allLessons.forEach(l => {
      const w = l.week_number || 1;
      if (!grouped.has(w)) grouped.set(w, []);
      grouped.get(w)!.push(l);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [allLessons]);

  // If this lesson has no interactive steps, render standard LessonView smoothly
  if (steps.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        <div>
          <Link href={`/courses/${courseId}`} style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-md)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            ← Back to Course
          </Link>
          <LessonView
            lesson={lesson}
            isCompleted={isCompleted}
            onComplete={onComplete}
            assignments={assignments}
            submissions={submissions}
            allSubmissions={allSubmissions}
            submitAssignment={submitAssignment}
            doubts={doubts}
            courseId={courseId}
            lessonId={lesson.id}
            showDoubts={showDoubts}
          />
        </div>
      </div>
    );
  }

  const handleLoadCodeToWorkspace = (codeToLoad: string, forceHtml = false) => {
    const isHtml = forceHtml || /<!doctype|<html|<body/i.test(codeToLoad);
    setCodeByStep(prev => ({ ...prev, [activeStep.id]: codeToLoad }));
    setEditorLang(isHtml ? 'html' : 'javascript');
    if (isHtml) {
      setRightTab('preview');
      setPreviewSrcDoc(buildLiveHtmlDocument(codeToLoad));
    } else {
      setRightTab('console');
    }
    setMobilePane('workspace');
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setConsoleOut('');
    setConsoleErr('');
    setExecTimeMs(null);

    const isHtmlMode = editorLang === 'html' || /<!doctype|<html|<body/i.test(editorCode);
    if (isHtmlMode) {
      setRightTab('preview');
      setPreviewSrcDoc(buildLiveHtmlDocument(editorCode));
      setExecTimeMs(1);
      setIsRunning(false);
      return;
    }

    setRightTab('console');
    try {
      const res = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'javascript',
          code: editorCode,
          stdin: '',
          raw: true,
        }),
      });
      const data = await res.json();
      setConsoleOut(data.stdout || '');
      setConsoleErr(data.stderr || data.compileStderr || (data.status === 'SYSTEM_ERROR' ? data.message : '') || '');
      if (typeof data.executionTimeMs === 'number') setExecTimeMs(data.executionTimeMs);
    } catch (err: any) {
      setConsoleErr(err?.message || 'Execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSyncToTerminal = async () => {
    setSyncMessage('Syncing...');
    try {
      const res = await fetch('/api/code-arena/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'lesson.js', content: editorCode }),
      });
      if (res.ok) {
        setSyncMessage('Saved to ~/workspace/lesson.js — run `node lesson.js` below!');
        setRightTab('terminal');
      } else {
        setSyncMessage('Sync failed (login required)');
      }
    } catch {
      setSyncMessage('Sync failed');
    } finally {
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  const handleAnalyzeTopic = async () => {
    setRightTab('analysis');
    setAiLoading(true);
    try {
      const res = await fetch('/api/coding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle: `${lesson.title} — ${activeStep.title}`,
          language: editorLang === 'html' ? 'html' : 'javascript',
          code: editorCode || `// Concept: ${activeStep.title}\n// ${activeStep.summary}`,
          constraints: activeStep.analysisFocus || activeStep.summary,
          passedTests: 1,
          totalTests: 1,
        }),
      });
      const data = await res.json();
      if (data?.analysis) {
        setAiAnalysis(prev => ({ ...prev, [activeStep.id]: data.analysis }));
      }
    } catch {
      // ignore cleanly
    } finally {
      setAiLoading(false);
    }
  };

  const handleFollowupQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = aiQuestion.trim();
    if (!q || aiFollowupLoading) return;
    setAiFollowupLoading(true);
    try {
      const res = await fetch('/api/coding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle: `${lesson.title} — ${activeStep.title}`,
          language: editorLang === 'html' ? 'html' : 'javascript',
          code: editorCode || `// Concept: ${activeStep.summary}`,
          constraints: activeStep.analysisFocus || activeStep.summary,
          followUpQuestion: q,
          previousAnalysis: aiAnalysis[activeStep.id],
        }),
      });
      const data = await res.json();
      setAiFollowupReply(data?.answer || 'Try opening full Smart Agent for a deeper walkthrough.');
      setAiQuestion('');
    } catch {
      setAiFollowupReply('Could not reach AI mentor right now.');
    } finally {
      setAiFollowupLoading(false);
    }
  };

  const currentLessonIdx = allLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = currentLessonIdx > 0 ? allLessons[currentLessonIdx - 1] : null;
  const nextLesson =
    currentLessonIdx >= 0 && currentLessonIdx < allLessons.length - 1
      ? allLessons[currentLessonIdx + 1]
      : null;

  const completedSet = new Set(completedLessonIds);
  const coursePct = allLessons.length > 0 ? Math.round((completedSet.size / allLessons.length) * 100) : 0;
  const stepPct = Math.round(((activeStepIdx + 1) / steps.length) * 100);

  const handleMarkLessonComplete = async (goToNext = false) => {
    setCompletingLesson(true);
    try {
      await onComplete();
      steps.forEach(s => markStepDoneLocal(s.id));
      if (goToNext && nextLesson) {
        router.push(`/courses/${courseId}/${nextLesson.id}`);
      }
    } finally {
      setCompletingLesson(false);
    }
  };

  const handleNextStep = () => {
    markStepDoneLocal(activeStep.id);
    if (activeStepIdx < steps.length - 1) {
      setActiveStepIdx(activeStepIdx + 1);
    } else {
      handleMarkLessonComplete(true);
    }
  };

  const handleCopy = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  // Classic Book Fallback Mode Toggle
  if (viewMode === 'classic') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <Link href={`/courses/${courseId}`} className="gcw-icon-btn">
            <ArrowLeft size={14} /> Back to Course
          </Link>
          <Button variant="primary" size="sm" onClick={() => setViewMode('guided')}>
            <Sparkles size={14} /> Switch to Interactive Guided Mode
          </Button>
        </div>
        <LessonView
          lesson={lesson}
          isCompleted={isCompleted}
          onComplete={onComplete}
          assignments={assignments}
          submissions={submissions}
          allSubmissions={allSubmissions}
          submitAssignment={submitAssignment}
          doubts={doubts}
          courseId={courseId}
          lessonId={lesson.id}
          showDoubts={showDoubts}
        />
      </div>
    );
  }

  const currentAnalysis = aiAnalysis[activeStep.id];

  return (
    <div className="gcw-shell" data-mobile-pane={mobilePane}>
      {/* ── TOP PROGRESS & STATUS BAR ── */}
      <header className="gcw-topbar">
        <div className="gcw-topbar-left">
          <Link href={`/courses/${courseId}`} className="gcw-icon-btn" title="Back to Course Overview">
            <ArrowLeft size={14} /> Course
          </Link>
          <button
            type="button"
            className="gcw-icon-btn"
            onClick={() => setSidebarOpen(o => !o)}
            title="Toggle Curriculum Sidebar"
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            <span>Syllabus</span>
          </button>
          <div className="gcw-course-crumb">
            <span className="gcw-course-crumb-sub">
              Week {lesson.week_number || 1} • Lesson {currentLessonIdx + 1}/{allLessons.length}
            </span>
            <span className="gcw-course-crumb-title" title={lesson.title}>
              {lesson.title}
            </span>
          </div>
        </div>

        {/* Dual Progress Indicators */}
        <div className="gcw-progress-cluster">
          <div className="gcw-progress-item">
            <div className="gcw-progress-meta">
              <span>Course Progress</span>
              <span>{completedSet.size}/{allLessons.length} ({coursePct}%)</span>
            </div>
            <div className="gcw-progress-track">
              <div className="gcw-progress-fill" style={{ width: `${coursePct}%` }} />
            </div>
          </div>

          <div className="gcw-progress-item">
            <div className="gcw-progress-meta">
              <span>Lesson Parts</span>
              <span>Step {activeStepIdx + 1}/{steps.length} ({stepPct}%)</span>
            </div>
            <div className="gcw-progress-track">
              <div className="gcw-progress-fill step-fill" style={{ width: `${stepPct}%` }} />
            </div>
          </div>
        </div>

        {/* Status, XP, Doubts, Complete */}
        <div className="gcw-topbar-right">
          <span className="gcw-xp-pill">+{lesson.xp_reward} XP</span>
          {showDoubts && (
            <button
              type="button"
              className="gcw-icon-btn"
              onClick={() => setShowDoubtsDrawer(v => !v)}
            >
              <MessageCircle size={14} /> Doubts ({doubts.length})
            </button>
          )}
          <button
            type="button"
            className={`gcw-status-pill ${isCompleted ? 'is-done' : ''}`}
            disabled={completingLesson || isCompleted}
            onClick={() => handleMarkLessonComplete(false)}
          >
            <CheckCircle2 size={14} />
            {isCompleted ? 'Completed' : completingLesson ? 'Saving…' : 'Mark Done'}
          </button>
          <button
            type="button"
            className="gcw-icon-btn"
            onClick={() => setViewMode('classic')}
            title="Switch to full reading mode"
          >
            <FileText size={14} /> Book View
          </button>
        </div>
      </header>

      {/* Mobile Pane Switcher */}
      <div className="gcw-mobile-switcher">
        <button
          type="button"
          className={`gcw-icon-btn ${mobilePane === 'curriculum' ? 'is-active' : ''}`}
          style={{ justifyContent: 'center', borderColor: mobilePane === 'curriculum' ? 'var(--accent-primary)' : undefined }}
          onClick={() => setMobilePane('curriculum')}
        >
          Weeks ({allLessons.length})
        </button>
        <button
          type="button"
          className="gcw-icon-btn"
          style={{ justifyContent: 'center', borderColor: mobilePane === 'lesson' ? 'var(--accent-primary)' : undefined }}
          onClick={() => setMobilePane('lesson')}
        >
          Step {activeStepIdx + 1}/{steps.length}
        </button>
        <button
          type="button"
          className="gcw-icon-btn"
          style={{ justifyContent: 'center', borderColor: mobilePane === 'workspace' ? 'var(--accent-primary)' : undefined }}
          onClick={() => setMobilePane('workspace')}
        >
          IDE &amp; Preview
        </button>
      </div>

      {/* Optional Doubts Slide Panel */}
      {showDoubtsDrawer && showDoubts && (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)', maxHeight: '320px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ fontSize: '13px' }}>Lesson Doubts &amp; Discussion</strong>
            <button type="button" className="gcw-icon-btn" onClick={() => setShowDoubtsDrawer(false)}>Close</button>
          </div>
          <LessonDoubts courseId={courseId} lessonId={lesson.id} doubts={doubts} />
        </div>
      )}

      {/* ── MAIN 3-PANE CODING NINJAS STYLE WORKSPACE ── */}
      <div className={`gcw-body-grid ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        {/* PANE 1: LEFT SIDEBAR (Week -> Lesson -> Sub-Parts) */}
        {sidebarOpen && (
          <aside className="gcw-left-sidebar">
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', padding: '2px 4px' }}>
              Course Modules • {courseTitle.slice(0, 26)}
            </div>
            {weeks.map(([weekNum, weekLessons]) => {
              const isOpen = !!expandedWeeks[weekNum];
              const doneInWeek = weekLessons.filter(l => completedSet.has(l.id)).length;
              return (
                <div key={weekNum} className="gcw-week-card">
                  <button
                    type="button"
                    className="gcw-week-header"
                    onClick={() => setExpandedWeeks(prev => ({ ...prev, [weekNum]: !prev[weekNum] }))}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      Week {weekNum}
                    </span>
                    <span style={{ fontSize: '10.5px', color: doneInWeek === weekLessons.length ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                      {doneInWeek}/{weekLessons.length}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="gcw-week-lessons">
                      {weekLessons.map(wl => {
                        const isCur = wl.id === lesson.id;
                        const isWLCompleted = completedSet.has(wl.id);
                        return (
                          <div key={wl.id}>
                            <Link
                              href={`/courses/${courseId}/${wl.id}`}
                              className={`gcw-lesson-link ${isCur ? 'is-active' : ''}`}
                              title={wl.title}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {wl.title}
                              </span>
                              {isWLCompleted && (
                                <CheckCircle2 size={13} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
                              )}
                            </Link>

                            {/* Sub-parts tree of currently active lesson */}
                            {isCur && (
                              <div className="gcw-substeps-list">
                                {steps.map((st, idx) => {
                                  const isStActive = idx === activeStepIdx;
                                  const isStDone = completedStepIds.has(st.id);
                                  return (
                                    <button
                                      key={st.id}
                                      type="button"
                                      className={`gcw-substep-btn ${isStActive ? 'is-active' : ''}`}
                                      onClick={() => {
                                        setActiveStepIdx(idx);
                                        setMobilePane('lesson');
                                      }}
                                    >
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                        {st.kind === 'task' ? (
                                          <Code2 size={11} style={{ flexShrink: 0 }} />
                                        ) : st.kind === 'assignment' ? (
                                          <FolderGit2 size={11} style={{ flexShrink: 0 }} />
                                        ) : st.kind.startsWith('interview') ? (
                                          <HelpCircle size={11} style={{ flexShrink: 0 }} />
                                        ) : (
                                          <BookOpen size={11} style={{ flexShrink: 0 }} />
                                        )}
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {idx + 1}. {st.badge}
                                        </span>
                                      </span>
                                      {isStDone && (
                                        <CheckCircle2 size={11} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </aside>
        )}

        {/* PANE 2: CENTER FOCUSED CONCEPT / ONE-TASK PLAYER */}
        <section className="gcw-center-pane">
          <div className="gcw-center-scroll">
            <div className="gcw-step-badge-row">
              <span className="gcw-step-badge">
                {activeStep.badge} • Step {activeStepIdx + 1} of {steps.length}
              </span>
              {completedStepIds.has(activeStep.id) && (
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent-success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> Step Completed
                </span>
              )}
            </div>

            <h2 className="gcw-step-title">{activeStep.title}</h2>
            <p className="gcw-step-summary">{activeStep.summary}</p>

            {/* Key Points Card */}
            {activeStep.keyPoints && activeStep.keyPoints.length > 0 && (
              <div className="gcw-box">
                <div className="gcw-box-title">
                  <span>Key Points &amp; Breakdown</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-primary)', fontSize: '13.5px', lineHeight: 1.55 }}>
                  {activeStep.keyPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Code Example Snippet inside Concept / Code Lab / Project Overview */}
            {activeStep.codeSnippet && (
              <div className="gcw-box">
                <div className="gcw-box-title">
                  <span>Example Snippet</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="gcw-icon-btn"
                      onClick={() => handleCopy('snippet', activeStep.codeSnippet!)}
                    >
                      <Copy size={12} /> {copiedId === 'snippet' ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      className="gcw-icon-btn"
                      style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                      onClick={() => handleLoadCodeToWorkspace(activeStep.codeSnippet!)}
                    >
                      <Play size={12} /> Load in IDE →
                    </button>
                  </div>
                </div>
                <pre className="gcw-code-pre">{activeStep.codeSnippet}</pre>
              </div>
            )}

            {/* Progressive Guided Task Hints (Step 1 -> Step 2 -> Step 3) */}
            {activeStep.hints && activeStep.hints.length > 0 && (
              <div className="gcw-box">
                <div className="gcw-box-title">
                  <span>Step-by-Step Guided Hints</span>
                  {(revealedHintsCount[activeStep.id] || 0) < activeStep.hints.length && (
                    <button
                      type="button"
                      className="gcw-icon-btn"
                      onClick={() =>
                        setRevealedHintsCount(prev => ({
                          ...prev,
                          [activeStep.id]: Math.min((prev[activeStep.id] || 0) + 1, activeStep.hints!.length),
                        }))
                      }
                    >
                      <Lightbulb size={12} /> Reveal Step {(revealedHintsCount[activeStep.id] || 0) + 1} Hint
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeStep.hints.slice(0, revealedHintsCount[activeStep.id] || 1).map(h => (
                    <div key={h.step} className="gcw-hint-card">
                      <strong>Step {h.step}:</strong> {h.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Solution Verification Card */}
            {activeStep.solutionCode && (
              <div className="gcw-box">
                <div className="gcw-box-title">
                  <span>Reference Verified Solution</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="gcw-icon-btn"
                      onClick={() =>
                        setRevealedSolutions(prev => ({ ...prev, [activeStep.id]: !prev[activeStep.id] }))
                      }
                    >
                      <Eye size={12} /> {revealedSolutions[activeStep.id] ? 'Hide Solution' : 'Reveal Solution'}
                    </button>
                    {revealedSolutions[activeStep.id] && (
                      <button
                        type="button"
                        className="gcw-icon-btn"
                        style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                        onClick={() => handleLoadCodeToWorkspace(activeStep.solutionCode!)}
                      >
                        <Play size={12} /> Load Solution →
                      </button>
                    )}
                  </div>
                </div>
                {revealedSolutions[activeStep.id] ? (
                  <pre className="gcw-code-pre">{activeStep.solutionCode}</pre>
                ) : (
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Pehle Right Editor me code likhkar Run karo! Atak jao ya verify karne ke liye "Reveal Solution" click karo.
                  </p>
                )}
              </div>
            )}

            {/* Structured Table (Study Plan / 150 MCQ Key Reference) */}
            {activeStep.tableRows && activeStep.tableRows.length > 0 && (
              <div className="gcw-box" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)', textAlign: 'left' }}>
                      <th style={{ padding: '7px 10px', border: '1px solid var(--border-default)' }}>Item</th>
                      <th style={{ padding: '7px 10px', border: '1px solid var(--border-default)' }}>Focus / Topic</th>
                      <th style={{ padding: '7px 10px', border: '1px solid var(--border-default)' }}>Target / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeStep.tableRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border-default)', fontWeight: 700 }}>{r.col1}</td>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border-default)' }}>{r.col2}</td>
                        <td style={{ padding: '6px 10px', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>{r.col3 || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Interview Q&A / Coding / Output Interactive Decks */}
            {activeStep.qaItems && activeStep.qaItems.length > 0 && (
              <div className="gcw-qa-deck">
                {activeStep.qaItems.map(qa => {
                  const isOpen = !!revealedSolutions[qa.id];
                  return (
                    <div key={qa.id} className="gcw-qa-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          {qa.id}. {qa.question}
                        </strong>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          {qa.code && (
                            <button
                              type="button"
                              className="gcw-icon-btn"
                              style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                              onClick={() => handleLoadCodeToWorkspace(qa.code!)}
                            >
                              <Play size={11} /> Load IDE
                            </button>
                          )}
                          <button
                            type="button"
                            className="gcw-icon-btn"
                            onClick={() => setRevealedSolutions(prev => ({ ...prev, [qa.id]: !prev[qa.id] }))}
                          >
                            {isOpen ? 'Hide' : 'Answer'}
                          </button>
                        </div>
                      </div>

                      {activeStep.kind === 'interview_output' && qa.code && (
                        <pre className="gcw-code-pre">{qa.code}</pre>
                      )}

                      {isOpen && (
                        <div style={{ borderTop: '1px solid var(--border-divider)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {qa.answer && (
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                              <strong>Answer:</strong> {qa.answer}
                            </div>
                          )}
                          {qa.explanation && (
                            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                              <strong>Explanation:</strong> {qa.explanation}
                            </div>
                          )}
                          {activeStep.kind === 'interview_coding' && qa.code && (
                            <pre className="gcw-code-pre">{qa.code}</pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Inline Assignment Submission Step */}
            {activeStep.kind === 'assignment' && assignments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assignments.map(assign => {
                  const sub = submissions.find(s => s.assignment_id === assign.id);
                  const communitySubs = allSubmissions.filter(s => s.assignment_id === assign.id);
                  const submitAction = submitAssignment ? submitAssignment.bind(null, assign.id) : async () => {};
                  return (
                    <AssignmentCard
                      key={assign.id}
                      assignment={assign}
                      submission={sub}
                      communitySubmissions={communitySubs}
                      onSubmit={submitAction}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Center Navigation Footer (Prev Step / Mark Done / Next Step ->) */}
          <div className="gcw-center-footer">
            <div>
              {activeStepIdx > 0 ? (
                <button
                  type="button"
                  className="gcw-icon-btn"
                  onClick={() => setActiveStepIdx(i => Math.max(0, i - 1))}
                >
                  ← Prev Step
                </button>
              ) : prevLesson ? (
                <Link href={`/courses/${courseId}/${prevLesson.id}`} className="gcw-icon-btn">
                  ← Prev Lesson
                </Link>
              ) : <div />}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="gcw-icon-btn"
                onClick={() => markStepDoneLocal(activeStep.id)}
              >
                <CheckCircle2 size={13} style={{ color: completedStepIds.has(activeStep.id) ? 'var(--accent-success)' : undefined }} />
                {completedStepIds.has(activeStep.id) ? 'Step Saved' : 'Mark Step Done'}
              </button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleNextStep}
                isLoading={completingLesson}
                style={{ fontWeight: 700, padding: '8px 16px' }}
              >
                {activeStepIdx < steps.length - 1
                  ? 'Next Step →'
                  : nextLesson
                    ? 'Finish Lesson & Next →'
                    : 'Complete Course Lesson ✓'}
              </Button>
            </div>
          </div>
        </section>

        {/* PANE 3: RIGHT SMART LEARN IDE + TERMINAL + WEB PREVIEW + AI TOPIC ANALYSIS */}
        <section className="gcw-right-pane">
          {/* Editor Toolbar */}
          <div className="gcw-editor-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Code2 size={14} /> {editorLang === 'html' ? 'index.html' : 'practice.js'}
              </span>
              <select
                value={editorLang}
                onChange={(e) => setEditorLang(e.target.value as 'javascript' | 'html')}
                style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              >
                <option value="javascript">Node / JavaScript</option>
                <option value="html">HTML / Web Preview</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="gcw-icon-btn"
                onClick={() => handleLoadCodeToWorkspace(defaultCodeForStep)}
                title="Reset editor to starter code"
              >
                <RotateCcw size={12} /> Reset
              </button>
              <button
                type="button"
                className="gcw-icon-btn"
                onClick={handleSyncToTerminal}
                title="Write code into ~/workspace/lesson.js for Smart Terminal"
              >
                <UploadCloud size={12} /> Terminal Sync
              </button>
              <button
                type="button"
                className="gcw-icon-btn"
                style={{ borderColor: 'var(--accent-secondary)', color: 'var(--accent-secondary)' }}
                onClick={handleAnalyzeTopic}
              >
                <Sparkles size={12} /> AI Analyze
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunCode}
                isLoading={isRunning}
                style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 700 }}
              >
                <Play size={12} /> Run Code
              </Button>
            </div>
          </div>

          {/* Monaco Code Editor */}
          <div className="gcw-editor-wrap">
            <Editor
              height="100%"
              language={editorLang === 'html' ? 'html' : 'javascript'}
              theme={isDarkTheme ? 'vs-dark' : 'vs'}
              value={editorCode}
              onChange={(val) => setCodeByStep(prev => ({ ...prev, [activeStep.id]: val ?? '' }))}
              beforeMount={registerMonacoIntelliSense}
              options={{
                ...intelliSenseEditorOptions,
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 10 },
              }}
            />
          </div>

          {/* Output / Web Preview / Smart Learn Terminal / AI Topic Analysis */}
          <div className="gcw-output-pane">
            <div className="gcw-output-tabs">
              <button
                type="button"
                className={`gcw-output-tab ${rightTab === 'console' ? 'is-active' : ''}`}
                onClick={() => setRightTab('console')}
              >
                <Terminal size={13} /> Console Output
                {execTimeMs !== null && rightTab === 'console' && (
                  <span style={{ fontSize: '10px', color: 'var(--accent-success)' }}>({execTimeMs}ms)</span>
                )}
              </button>
              <button
                type="button"
                className={`gcw-output-tab ${rightTab === 'preview' ? 'is-active' : ''}`}
                onClick={() => {
                  setRightTab('preview');
                  setPreviewSrcDoc(buildLiveHtmlDocument(editorCode));
                }}
              >
                <Globe size={13} /> Web Preview
              </button>
              <button
                type="button"
                className={`gcw-output-tab ${rightTab === 'terminal' ? 'is-active' : ''}`}
                onClick={() => setRightTab('terminal')}
              >
                <Terminal size={13} /> Smart Terminal
              </button>
              <button
                type="button"
                className={`gcw-output-tab ${rightTab === 'analysis' ? 'is-active' : ''}`}
                onClick={() => {
                  if (!aiAnalysis[activeStep.id] && !aiLoading) handleAnalyzeTopic();
                  else setRightTab('analysis');
                }}
              >
                <Bot size={13} /> AI Topic Analysis
              </button>
            </div>

            <div className="gcw-output-body">
              {syncMessage && (
                <div style={{ fontSize: '11.5px', padding: '5px 8px', background: 'var(--interactive-selected)', color: 'var(--accent-primary)', borderRadius: '6px', fontWeight: 600 }}>
                  {syncMessage}
                </div>
              )}

              {rightTab === 'console' && (
                <>
                  {!consoleOut && !consoleErr && !isRunning && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Click <strong>Run Code ▶</strong> above to execute JavaScript in Smart Learn Node runtime and inspect output here.
                    </span>
                  )}
                  {isRunning && <span style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>Executing code…</span>}
                  {consoleOut && <pre className="gcw-console-pre">{consoleOut}</pre>}
                  {consoleErr && (
                    <pre className="gcw-console-pre" style={{ color: '#f87171', borderTop: consoleOut ? '1px solid var(--border-default)' : 'none', paddingTop: consoleOut ? '6px' : 0 }}>
                      {consoleErr}
                    </pre>
                  )}
                </>
              )}

              {rightTab === 'preview' && (
                <>
                  <iframe
                    title="Smart Learn Live Web Preview"
                    className="gcw-preview-iframe"
                    sandbox="allow-scripts allow-modals"
                    srcDoc={previewSrcDoc || buildLiveHtmlDocument(editorCode)}
                  />
                  {(consoleOut || consoleErr) && (
                    <div style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '11.5px', fontFamily: 'var(--font-code)', maxHeight: '72px', overflowY: 'auto' }}>
                      {consoleOut && <div>{consoleOut}</div>}
                      {consoleErr && <div style={{ color: '#f87171' }}>{consoleErr}</div>}
                    </div>
                  )}
                </>
              )}

              {rightTab === 'terminal' && (
                <div style={{ flex: 1, minHeight: '160px', height: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ flex: 1, minHeight: '140px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                    <TerminalWorkspace />
                  </div>
                </div>
              )}

              {rightTab === 'analysis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      Topic &amp; Code AI Tutor — {activeStep.badge}
                    </span>
                    <button type="button" className="gcw-icon-btn" onClick={handleAnalyzeTopic}>
                      <Zap size={12} /> {aiLoading ? 'Analyzing…' : 'Refresh AI Review'}
                    </button>
                  </div>

                  {aiLoading && !currentAnalysis && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Analyzing current topic &amp; your code with Smart Agent AI…</div>
                  )}

                  {currentAnalysis && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="gcw-step-badge">Rating: {currentAnalysis.overallRating}/10 ({currentAnalysis.ratingLabel})</span>
                        <span className="gcw-step-badge">TC: {currentAnalysis.analyzedTime}</span>
                        <span className="gcw-step-badge">SC: {currentAnalysis.analyzedSpace}</span>
                      </div>
                      {Array.isArray(currentAnalysis.keyLogic) && (
                        <div className="gcw-box" style={{ padding: '8px 10px' }}>
                          {currentAnalysis.keyLogic.map((k: string, idx: number) => (
                            <div key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)' }}>• {k}</div>
                          ))}
                        </div>
                      )}
                      {currentAnalysis.optimizationTip && (
                        <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--accent-secondary)' }}>Mentor Tip:</strong> {currentAnalysis.optimizationTip}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Cross-Question / Ask Agent right inside the step */}
                  <form onSubmit={handleFollowupQuestion} style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input
                      type="text"
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder={`Ask AI about "${activeStep.title.slice(0, 32)}"...`}
                      style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    />
                    <Button type="submit" size="sm" variant="primary" isLoading={aiFollowupLoading}>Ask</Button>
                    <button
                      type="button"
                      className="gcw-icon-btn"
                      onClick={() =>
                        smartAgentSession?.openDrawer?.(
                          `Help me understand "${lesson.title} -> ${activeStep.title}". Context: ${activeStep.summary}. My current code:\n${editorCode}`
                        )
                      }
                      title="Open in full Smart Learn AI Drawer"
                    >
                      <Sparkles size={12} /> Full Agent →
                    </button>
                  </form>

                  {aiFollowupReply && (
                    <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', borderLeft: '3px solid var(--accent-primary)', fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {aiFollowupReply}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
