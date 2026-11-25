'use client';

import '@/lib/monacoInit';
import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  ExternalLink,
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
  RefreshCw,
  RotateCcw,
  Sparkles,
  Terminal,
  UploadCloud,
  Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { CodeBlockWrapper } from '@/components/ui/MarkdownRenderer';
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

function getOfficialJsDoc(lessonTitle: string, stepTitle: string, stepSummary: string): { label: string; url: string } {
  const combined = `${lessonTitle} ${stepTitle} ${stepSummary}`.toLowerCase();

  if (/\?\?|nullish/.test(combined)) {
    return { label: 'MDN: Nullish ?? & ?.', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing' };
  }
  if (/optional chaining|\?\./.test(combined)) {
    return { label: 'MDN: Optional ?.', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining' };
  }
  if (/== vs ===|coercion|truthy|falsy/.test(combined)) {
    return { label: 'MDN: Equality & Coercion', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness' };
  }
  if (/closure|once\(|memoize|debounce/.test(combined)) {
    return { label: 'MDN: Closures', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures' };
  }
  if (/hoist|tdz/.test(combined)) {
    return { label: 'MDN: Hoisting & TDZ', url: 'https://developer.mozilla.org/en-US/docs/Glossary/Hoisting' };
  }
  if (/regex|regexp/.test(combined)) {
    return { label: 'MDN: RegExp Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions' };
  }
  if (/event delegation|addeventlistener|bubbling|capturing|custom event/.test(combined)) {
    return { label: 'MDN: Events & Listeners', url: 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener' };
  }
  if (/queryselector|dom|dark mode|accordion|table rows/.test(combined)) {
    return { label: 'MDN: DOM API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model' };
  }
  if (/promise|async\/await|retry|polyfill/.test(combined)) {
    return { label: 'MDN: Promises & Async', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise' };
  }
  if (/fetch|abortcontroller/.test(combined)) {
    return { label: 'MDN: Fetch API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch' };
  }
  if (/event loop|settimeout|microtask/.test(combined)) {
    return { label: 'MDN: Event Loop', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model' };
  }
  if (/localstorage/.test(combined)) {
    return { label: 'MDN: localStorage', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage' };
  }
  if (/structuredclone|deep clone/.test(combined)) {
    return { label: 'MDN: structuredClone', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone' };
  }
  if (/generator|function\*/.test(combined)) {
    return { label: 'MDN: Generators', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_generators' };
  }
  if (/prototype chain|__proto__/.test(combined)) {
    return { label: 'MDN: Prototypes', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain' };
  }
  if (/express|rest api/.test(combined)) {
    return { label: 'Express 5 Docs', url: 'https://expressjs.com/en/5x/api.html' };
  }
  if (/node\.js|fs\.promises|npm|http server/.test(combined)) {
    return { label: 'Node.js API Docs', url: 'https://nodejs.org/docs/latest/api/' };
  }
  if (/error|try\/catch|validationerror|finally/.test(combined)) {
    return { label: 'MDN: Error Handling', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch' };
  }

  const tM = lessonTitle.match(/^(\d{1,2})\.\s/);
  const topicId = tM ? Number(tM[1]) : null;
  const topicDocs: Record<number, { label: string; url: string }> = {
    0: { label: 'MDN: JS Introduction', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction' },
    1: { label: 'MDN: Grammar & Variables', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types' },
    2: { label: 'MDN: Data Types & Operators', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures' },
    3: { label: 'MDN: Control Flow & Loops', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration' },
    4: { label: 'MDN: Functions', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions' },
    5: { label: 'MDN: Scope & Closures', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures' },
    6: { label: 'MDN: Array Reference', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array' },
    7: { label: 'MDN: String & RegExp', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String' },
    8: { label: 'MDN: Objects & this', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects' },
    9: { label: 'MDN: ES Modules & ES6+', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules' },
    10: { label: 'MDN: Classes & OOP', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes' },
    11: { label: 'MDN: DOM Manipulation', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model' },
    12: { label: 'MDN: DOM Events', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Event' },
    13: { label: 'MDN: Async JS & Promises', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise' },
    14: { label: 'MDN: Errors & Debugging', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch' },
    15: { label: 'Node.js API Docs', url: 'https://nodejs.org/docs/latest/api/' },
    16: { label: 'MDN: JS Data Structures', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map' },
  };
  if (topicId !== null && topicDocs[topicId]) return topicDocs[topicId];

  if (/array/.test(combined)) return { label: 'MDN: Arrays', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array' };
  if (/string/.test(combined)) return { label: 'MDN: Strings', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String' };
  if (/object/.test(combined)) return { label: 'MDN: Objects', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object' };
  if (/function|this/.test(combined)) return { label: 'MDN: Functions', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions' };

  return { label: 'MDN: JS Reference', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference' };
}

function isHtmlMarkup(code: string): boolean {
  return /<!doctype|<html|<head|<body|<div|<main|<section|<h[1-6]|<button|<form|<ul|<p\b/i.test(code);
}

function hasDomCode(code: string, lang: 'javascript' | 'html'): boolean {
  return lang === 'html' || isHtmlMarkup(code) || /\bdocument\.(?:querySelector|getElementById|createElement|body|documentElement|addEventListener)\b/.test(code);
}

function wrapJsIntoHtmlTemplate(rawJs: string, title = 'HTML Playground'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title.replace(/</g, '&lt;')}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; margin: 0; }
    .card { max-width: 520px; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 700; }
  </style>
</head>
<body>
  <div id="app" class="card">
    <h2 style="margin-top:0">${title.replace(/</g, '&lt;')}</h2>
    <p id="status">Edit HTML, CSS, and JavaScript below.</p>
  </div>
  <script>
${rawJs}
  </script>
</body>
</html>`;
}

// Injects safe storage fallback (for sandboxed iframes without allow-same-origin) + console postMessage bridge
function buildLiveHtmlDocument(rawCode: string): string {
  const bridge = `<script>
(function() {
  try {
    var testKey = '__sl_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
  } catch (err) {
    var memStore = {};
    var safeStorage = {
      getItem: function(k) { return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null; },
      setItem: function(k, v) { memStore[String(k)] = String(v); },
      removeItem: function(k) { delete memStore[String(k)]; },
      clear: function() { memStore = {}; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: safeStorage, configurable: true }); } catch (e) {}
  }

  var send = function(type, args) {
    try {
      var text = Array.prototype.slice.call(args).map(function(a) {
        if (typeof a === 'object' && a !== null) { try { return JSON.stringify(a); } catch(e) { return String(a); } }
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
    if (/<head[^>]*>/i.test(trimmed)) return trimmed.replace(/<head[^>]*>/i, match => `${match}\n${bridge}`);
    if (/<body[^>]*>/i.test(trimmed)) return trimmed.replace(/<body[^>]*>/i, match => `${bridge}\n${match}`);
    return `${bridge}\n${trimmed}`;
  }

  if (isHtmlMarkup(trimmed)) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; background: #0f172a; color: #f8fafc; margin: 0; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 700; }
  </style>
  ${bridge}
</head>
<body>
${trimmed}
</body>
</html>`;
  }

  // Raw JS touching document.*
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; background: #0f172a; color: #f8fafc; margin: 0; }
    button { background: #06b6d4; color: #082f49; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 700; }
  </style>
  ${bridge}
</head>
<body>
  <div id="app"></div>
  <script>
${trimmed}
  </script>
</body>
</html>`;
}

// Standalone HTML page for "Open in Browser" new tab (no fake message, authentic browser execution)
function buildStandaloneBrowserHtml(rawCode: string, title: string, lang: 'javascript' | 'html'): string {
  const trimmed = rawCode.trim();
  if (lang === 'html' || /<!doctype|<html|<body/i.test(trimmed)) {
    return trimmed;
  }
  if (isHtmlMarkup(trimmed)) {
    return `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8" /><title>${title.replace(/</g, '&lt;')}</title></head>\n<body style="font-family:system-ui,sans-serif;padding:24px;background:#0f172a;color:#f8fafc">\n${trimmed}\n</body>\n</html>`;
  }
  // Pure JS opened in real browser tab: run inside real browser DevTools AND show live captured console output
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title.replace(/</g, '&lt;')} — Browser Runner</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; max-width: 820px; margin: 0 auto; }
    h1 { font-size: 18px; color: #38bdf8; margin-bottom: 6px; }
    p { font-size: 13px; color: #94a3b8; margin-top: 0; }
    #console { background: #020617; border: 1px solid #334155; border-radius: 10px; padding: 14px; font-family: ui-monospace, monospace; font-size: 13px; white-space: pre-wrap; min-height: 80px; }
    .err { color: #f87171; }
  </style>
</head>
<body>
  <h1>${title.replace(/</g, '&lt;')}</h1>
  <p>Running natively in your browser tab (open F12 DevTools Console to inspect objects interactively).</p>
  <div id="app" style="margin-bottom:14px"></div>
  <div id="console"></div>
  <script>
    (function() {
      const box = document.getElementById('console');
      const write = (cls, args) => {
        const line = document.createElement('div');
        if (cls) line.className = cls;
        line.textContent = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
        box.appendChild(line);
      };
      const origLog = console.log, origWarn = console.warn, origErr = console.error;
      console.log = function(...a) { write('', a); origLog.apply(console, a); };
      console.warn = function(...a) { write('', ['[warn]', ...a]); origWarn.apply(console, a); };
      console.error = function(...a) { write('err', ['[error]', ...a]); origErr.apply(console, a); };
      window.addEventListener('error', e => write('err', [e.message]));
    })();
  </script>
  <script>
${trimmed}
  </script>
</body>
</html>`;
}

// Render inline `code` tokens cleanly inside structured prose
function renderInlineFormatted(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="gcw-inline-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function StructuredArrowPoint({ text }: { text: string }) {
  const arrowMatch = /^([^→]{2,36})\s*→\s*(.+)$/.exec(text.trim());
  const colonMatch = !arrowMatch ? /^([^:]{2,30}):\s+(.+)$/.exec(text.trim()) : null;

  return (
    <div className="gcw-arrow-row">
      <span className="gcw-arrow-icon" aria-hidden="true">→</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {arrowMatch ? (
          <>
            <span className="gcw-point-heading">{arrowMatch[1].trim()}</span>{' '}
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>→</span>{' '}
            <span>{renderInlineFormatted(arrowMatch[2].trim())}</span>
          </>
        ) : colonMatch ? (
          <>
            <span className="gcw-point-heading">{colonMatch[1].trim()}</span>{' '}
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>→</span>{' '}
            <span>{renderInlineFormatted(colonMatch[2].trim())}</span>
          </>
        ) : (
          renderInlineFormatted(text.trim())
        )}
      </div>
    </div>
  );
}

function splitSummaryBullets(summary: string): string[] {
  const clean = String(summary || '').trim();
  if (!clean) return [];
  const pieces = clean.split(/(?:\s*;\s*|\.\s+(?=[A-Z]))/).map(s => s.trim()).filter(Boolean);
  return pieces.length > 0 ? pieces : [clean];
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

  // 2 Draggable Resizable Window Sliders (Left Sidebar <-> Center, Center <-> Right IDE)
  const bodyGridRef = useRef<HTMLDivElement>(null);
  const [leftSidebarPx, setLeftSidebarPx] = useState<number>(265);
  const [rightPanePct, setRightPanePct] = useState<number>(46);
  const [activeResizer, setActiveResizer] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    try {
      const savedLeft = parseFloat(localStorage.getItem('bce:gcw-left-px') || '');
      if (savedLeft >= 200 && savedLeft <= 440) setLeftSidebarPx(savedLeft);
      const savedRight = parseFloat(localStorage.getItem('bce:gcw-right-pct') || '');
      if (savedRight >= 26 && savedRight <= 68) setRightPanePct(savedRight);
    } catch {}
  }, []);

  useEffect(() => {
    if (!activeResizer) return;
    const handleMove = (clientX: number) => {
      if (!bodyGridRef.current) return;
      const rect = bodyGridRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      if (activeResizer === 'left') {
        const nextPx = Math.round(Math.min(440, Math.max(200, clientX - rect.left)));
        setLeftSidebarPx(nextPx);
      } else if (activeResizer === 'right') {
        const fromRight = rect.right - clientX;
        const pct = Math.min(68, Math.max(26, (fromRight / rect.width) * 100));
        setRightPanePct(Number(pct.toFixed(2)));
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const onEnd = () => {
      setActiveResizer(null);
      try {
        localStorage.setItem('bce:gcw-left-px', String(leftSidebarPx));
        localStorage.setItem('bce:gcw-right-pct', String(rightPanePct));
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [activeResizer, leftSidebarPx, rightPanePct]);

  useEffect(() => {
    const syncTheme = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setIsDarkTheme(t !== 'light');
    };
    syncTheme();
    const obs = new MutationObserver(syncTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>(() => ({
    [lesson.week_number || 1]: true,
  }));

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

  const [revealedHintsCount, setRevealedHintsCount] = useState<Record<string, number>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});

  const activeStep: GuidedLessonStep = steps[Math.min(activeStepIdx, Math.max(0, steps.length - 1))] || {
    id: 'fallback',
    stepNumber: 1,
    kind: 'overview',
    badge: 'Lesson',
    title: lesson.title,
    summary: '',
    runMode: 'none',
  };

  // Right Workspace State
  const [codeByStep, setCodeByStep] = useState<Record<string, string>>({});
  const [editorLang, setEditorLang] = useState<'javascript' | 'html'>('javascript');
  const [rightTab, setRightTab] = useState<RightTab>('console');
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOut, setConsoleOut] = useState<string>('');
  const [consoleErr, setConsoleErr] = useState<string>('');
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // AI Topic & Code Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiFollowupReply, setAiFollowupReply] = useState<string | null>(null);
  const [aiFollowupLoading, setAiFollowupLoading] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);

  const defaultCodeForStep =
    activeStep.starterCode ||
    activeStep.codeSnippet ||
    `// ${activeStep.title}\nconsole.log('Practice active step live!');`;

  const editorCode = codeByStep[activeStep.id] ?? defaultCodeForStep;
  const canRenderWebPreview = hasDomCode(editorCode, editorLang);

  // Sync editor language & initial tab when switching steps
  useEffect(() => {
    if (steps.length === 0) return;
    const code = codeByStep[activeStep.id] ?? (activeStep.starterCode || activeStep.codeSnippet || '');
    const isHtml = activeStep.runMode === 'html_preview' || isHtmlMarkup(code);
    setEditorLang(isHtml ? 'html' : 'javascript');
    if (isHtml) {
      setRightTab('preview');
      setPreviewSrcDoc(buildLiveHtmlDocument(code));
      setPreviewKey(k => k + 1);
    } else {
      setRightTab(prev => (prev === 'preview' ? 'console' : prev));
    }
    setConsoleOut('');
    setConsoleErr('');
    setExecTimeMs(null);
    setAiFollowupReply(null);
  }, [activeStep.id, steps.length]);

  // Real-time debounced Web Preview refresh whenever HTML/DOM code changes
  useEffect(() => {
    if (rightTab !== 'preview' || !canRenderWebPreview) return;
    const timer = setTimeout(() => {
      setPreviewSrcDoc(buildLiveHtmlDocument(editorCode));
    }, 240);
    return () => clearTimeout(timer);
  }, [editorCode, rightTab, canRenderWebPreview]);

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

  const weeks = useMemo(() => {
    const grouped = new Map<number, SidebarLessonSummary[]>();
    allLessons.forEach(l => {
      const w = l.week_number || 1;
      if (!grouped.has(w)) grouped.set(w, []);
      grouped.get(w)!.push(l);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [allLessons]);

  const handleOpenInBrowser = useCallback(() => {
    try {
      const html = buildStandaloneBrowserHtml(editorCode, activeStep.title, editorLang);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        setSyncMessage('Popup blocked — please allow popups for this site to open full Browser Preview.');
        setTimeout(() => setSyncMessage(null), 4000);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: any) {
      setConsoleErr(err?.message || 'Could not open preview in new tab.');
    }
  }, [editorCode, activeStep.title, editorLang]);

  const handleSwitchToHtmlMode = () => {
    const wrapped = isHtmlMarkup(editorCode)
      ? editorCode
      : wrapJsIntoHtmlTemplate(editorCode, activeStep.title);
    setCodeByStep(prev => ({ ...prev, [activeStep.id]: wrapped }));
    setEditorLang('html');
    setRightTab('preview');
    setPreviewSrcDoc(buildLiveHtmlDocument(wrapped));
    setPreviewKey(k => k + 1);
  };

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
    const isHtml = forceHtml || isHtmlMarkup(codeToLoad);
    setCodeByStep(prev => ({ ...prev, [activeStep.id]: codeToLoad }));
    setEditorLang(isHtml ? 'html' : 'javascript');
    if (isHtml) {
      setRightTab('preview');
      setPreviewSrcDoc(buildLiveHtmlDocument(codeToLoad));
      setPreviewKey(k => k + 1);
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

    if (hasDomCode(editorCode, editorLang)) {
      setRightTab('preview');
      setPreviewSrcDoc(buildLiveHtmlDocument(editorCode));
      setPreviewKey(k => k + 1);
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
      const targetFile = editorLang === 'html' ? 'index.html' : 'lesson.js';
      const res = await fetch('/api/code-arena/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetFile, content: editorCode }),
      });
      if (res.ok) {
        setSyncMessage(`Saved to ~/workspace/${targetFile}`);
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
      setAiFollowupReply(data?.answer || 'Open Full Agent below for a deeper step-by-step explanation.');
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
  const officialDoc = getOfficialJsDoc(lesson.title, activeStep.title, activeStep.summary);
  const summaryBullets = splitSummaryBullets(activeStep.summary);
  const keywords = activeStep.keywords && activeStep.keywords.length > 0 ? activeStep.keywords : [];

  return (
    <div className={`gcw-shell ${activeResizer ? 'is-resizing' : ''}`} data-mobile-pane={mobilePane}>
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
            title="Toggle Curriculum Syllabus"
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

        {/* Status, Official Docs, XP, Doubts, Complete */}
        <div className="gcw-topbar-right">
          <a
            href={officialDoc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="gcw-icon-btn is-accent"
            title={`Official JavaScript Docs (${officialDoc.url})`}
          >
            <BookOpen size={13} />
            <span>{officialDoc.label}</span>
            <ExternalLink size={11} />
          </a>
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
            title="Switch to full reading view"
          >
            <FileText size={14} /> Book View
          </button>
        </div>
      </header>

      {/* Mobile Pane Switcher */}
      <div className="gcw-mobile-switcher">
        <button
          type="button"
          className={`gcw-icon-btn ${mobilePane === 'curriculum' ? 'is-accent' : ''}`}
          style={{ justifyContent: 'center' }}
          onClick={() => setMobilePane('curriculum')}
        >
          Weeks ({allLessons.length})
        </button>
        <button
          type="button"
          className={`gcw-icon-btn ${mobilePane === 'lesson' ? 'is-accent' : ''}`}
          style={{ justifyContent: 'center' }}
          onClick={() => setMobilePane('lesson')}
        >
          Step {activeStepIdx + 1}/{steps.length}
        </button>
        <button
          type="button"
          className={`gcw-icon-btn ${mobilePane === 'workspace' ? 'is-accent' : ''}`}
          style={{ justifyContent: 'center' }}
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

      {/* ── MAIN 3-PANE WORKSPACE WITH 2 DRAGGABLE RESIZERS ── */}
      <div ref={bodyGridRef} className={`gcw-body-grid ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        {/* PANE 1: LEFT SIDEBAR (Week -> Lesson -> Sub-Parts) */}
        {sidebarOpen && (
          <>
            <aside className="gcw-left-sidebar" style={{ width: `${leftSidebarPx}px` }}>
              <div className="gcw-sidebar-heading">
                Course Modules • {courseTitle}
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
                                <span style={{ flex: 1, minWidth: 0 }}>{wl.title}</span>
                                {isWLCompleted && (
                                  <CheckCircle2 size={13} style={{ color: 'var(--accent-success)', flexShrink: 0, marginTop: '2px' }} />
                                )}
                              </Link>

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
                                        <span className="gcw-substep-label">
                                          {st.kind === 'task' ? (
                                            <Code2 size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                                          ) : st.kind === 'assignment' ? (
                                            <FolderGit2 size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                                          ) : st.kind.startsWith('interview') ? (
                                            <HelpCircle size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                                          ) : (
                                            <BookOpen size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                                          )}
                                          <span>{idx + 1}. {st.badge}</span>
                                        </span>
                                        {isStDone && (
                                          <CheckCircle2 size={11} style={{ color: 'var(--accent-success)', flexShrink: 0, marginTop: '2px' }} />
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
            <div
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize Syllabus width (double-click to reset)"
              className={`gcw-resizer ${activeResizer === 'left' ? 'is-active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); setActiveResizer('left'); }}
              onTouchStart={() => setActiveResizer('left')}
              onDoubleClick={() => {
                setLeftSidebarPx(265);
                try { localStorage.setItem('bce:gcw-left-px', '265'); } catch {}
              }}
            />
          </>
        )}

        {/* PANE 2: CENTER FOCUSED CONCEPT / STRUCTURED POINTS / ONE-TASK PLAYER */}
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

            {/* Keywords Pill Strip */}
            {keywords.length > 0 && (
              <div className="gcw-kw-strip">
                <span className="gcw-kw-label">Keywords:</span>
                {keywords.map((kw, i) => (
                  <span key={i} className="gcw-kw-pill">{kw}</span>
                ))}
              </div>
            )}

            {/* Structured Concise Focus Summary (Arrows — no walls of prose) */}
            {summaryBullets.length > 0 && (
              <div className="gcw-summary-list">
                {summaryBullets.map((line, i) => (
                  <StructuredArrowPoint key={i} text={line} />
                ))}
              </div>
            )}

            {/* Structured Heading + Arrow Sections */}
            {activeStep.sections && activeStep.sections.length > 0 ? (
              activeStep.sections.map((sec, sIdx) => (
                <div key={sIdx} className="gcw-box">
                  <div className="gcw-box-title">
                    <span>{sec.heading}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {sec.points.map((pt, pIdx) => (
                      <StructuredArrowPoint key={pIdx} text={pt} />
                    ))}
                  </div>
                </div>
              ))
            ) : activeStep.keyPoints && activeStep.keyPoints.length > 0 ? (
              <div className="gcw-box">
                <div className="gcw-box-title">
                  <span>Key Points</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeStep.keyPoints.map((pt, i) => (
                    <StructuredArrowPoint key={i} text={pt} />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Syntax-Highlighted Example Snippet */}
            {activeStep.codeSnippet && (
              <CodeBlockWrapper
                language={isHtmlMarkup(activeStep.codeSnippet) ? 'html' : 'javascript'}
                code={activeStep.codeSnippet}
                margin="0"
                extraActions={
                  <button
                    type="button"
                    className="gcw-icon-btn is-accent"
                    style={{ padding: '3px 9px', fontSize: '11px' }}
                    onClick={() => handleLoadCodeToWorkspace(activeStep.codeSnippet!)}
                  >
                    <Play size={11} /> Load in IDE →
                  </button>
                }
              />
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
                      <StructuredArrowPoint text={`Step ${h.step} → ${h.text}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Solution Card (Syntax-Highlighted) */}
            {activeStep.solutionCode && (
              <div className="gcw-box">
                <div className="gcw-box-title">
                  <span>Verified Reference Solution</span>
                  <button
                    type="button"
                    className="gcw-icon-btn"
                    onClick={() =>
                      setRevealedSolutions(prev => ({ ...prev, [activeStep.id]: !prev[activeStep.id] }))
                    }
                  >
                    <Eye size={12} /> {revealedSolutions[activeStep.id] ? 'Hide Solution' : 'Reveal Solution'}
                  </button>
                </div>
                {revealedSolutions[activeStep.id] ? (
                  <CodeBlockWrapper
                    language={isHtmlMarkup(activeStep.solutionCode) ? 'html' : 'javascript'}
                    code={activeStep.solutionCode}
                    margin="0"
                    extraActions={
                      <button
                        type="button"
                        className="gcw-icon-btn is-accent"
                        style={{ padding: '3px 9px', fontSize: '11px' }}
                        onClick={() => handleLoadCodeToWorkspace(activeStep.solutionCode!)}
                      >
                        <Play size={11} /> Load Solution →
                      </button>
                    }
                  />
                ) : (
                  <StructuredArrowPoint text='Workflow → Write & run your solution in the Right IDE first, then click "Reveal Solution" to verify.' />
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
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                          {qa.id}. {qa.question}
                        </strong>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          {qa.code && (
                            <button
                              type="button"
                              className="gcw-icon-btn is-accent"
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
                        <CodeBlockWrapper language="javascript" code={qa.code} margin="0" />
                      )}

                      {isOpen && (
                        <div style={{ borderTop: '1px solid var(--border-divider)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {qa.answer && <StructuredArrowPoint text={`Answer → ${qa.answer}`} />}
                          {qa.explanation && <StructuredArrowPoint text={`Reason → ${qa.explanation}`} />}
                          {activeStep.kind === 'interview_coding' && qa.code && (
                            <CodeBlockWrapper language="javascript" code={qa.code} margin="0" />
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

          {/* Sticky Center Navigation Footer */}
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

        {/* SLIDER 2: Drag between Center Lesson Pane & Right IDE/Terminal Pane */}
        <div
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize Lesson / IDE width (double-click to reset)"
          className={`gcw-resizer ${activeResizer === 'right' ? 'is-active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); setActiveResizer('right'); }}
          onTouchStart={() => setActiveResizer('right')}
          onDoubleClick={() => {
            setRightPanePct(46);
            try { localStorage.setItem('bce:gcw-right-pct', '46'); } catch {}
          }}
        />

        {/* PANE 3: RIGHT SMART LEARN IDE + TERMINAL + REAL WEB PREVIEW + AI TOPIC ANALYSIS */}
        <section className="gcw-right-pane" style={{ width: `${rightPanePct}%` }}>
          {/* Editor Toolbar */}
          <div className="gcw-editor-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Code2 size={14} /> {editorLang === 'html' ? 'index.html' : 'practice.js'}
              </span>
              <select
                value={editorLang}
                onChange={(e) => {
                  const nextLang = e.target.value as 'javascript' | 'html';
                  if (nextLang === 'html') {
                    handleSwitchToHtmlMode();
                  } else {
                    setEditorLang('javascript');
                  }
                }}
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
                title="Save file to ~/workspace for Smart Terminal"
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

          {/* Output / Real Web Preview / Smart Learn Terminal / AI Topic Analysis */}
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
                  if (hasDomCode(editorCode, editorLang)) {
                    setPreviewSrcDoc(buildLiveHtmlDocument(editorCode));
                    setPreviewKey(k => k + 1);
                  }
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
                  <div className="gcw-preview-toolbar">
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={12} style={{ color: 'var(--accent-primary)' }} />
                      {canRenderWebPreview ? 'index.html — Live Interactive Preview' : 'practice.js — Node / Console Script'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {canRenderWebPreview && (
                        <button
                          type="button"
                          className="gcw-icon-btn"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => {
                            setConsoleOut('');
                            setConsoleErr('');
                            setPreviewSrcDoc(buildLiveHtmlDocument(editorCode));
                            setPreviewKey(k => k + 1);
                          }}
                          title="Reload live preview"
                        >
                          <RefreshCw size={11} /> Refresh
                        </button>
                      )}
                      <button
                        type="button"
                        className="gcw-icon-btn is-accent"
                        style={{ padding: '4px 9px', fontSize: '11px' }}
                        onClick={handleOpenInBrowser}
                        title="Open real preview in a new full browser tab"
                      >
                        <ExternalLink size={11} /> Open in Browser
                      </button>
                    </div>
                  </div>

                  {canRenderWebPreview ? (
                    <>
                      <iframe
                        key={previewKey}
                        title="Smart Learn Live Web Preview"
                        className="gcw-preview-iframe"
                        sandbox="allow-scripts allow-modals allow-forms"
                        srcDoc={previewSrcDoc || buildLiveHtmlDocument(editorCode)}
                      />
                      {(consoleOut || consoleErr) && (
                        <div style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '11.5px', fontFamily: 'var(--font-code)', maxHeight: '72px', overflowY: 'auto' }}>
                          {consoleOut && <div>{consoleOut}</div>}
                          {consoleErr && <div style={{ color: '#f87171' }}>{consoleErr}</div>}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="gcw-preview-empty">
                      <strong style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>
                        This step runs pure JavaScript (no HTML/DOM markup yet)
                      </strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <StructuredArrowPoint text="Console Output → Click Run Code to see logs and tables in the Console Output tab" />
                        <StructuredArrowPoint text="HTML Preview → Switch to HTML Playground below if you want to build & preview a visual DOM UI" />
                        <StructuredArrowPoint text="Browser Tab → Or click Open in Browser above to run this script inside Chrome/Edge DevTools" />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <button type="button" className="gcw-icon-btn" onClick={handleRunCode}>
                          <Play size={12} /> Run in Console Output
                        </button>
                        <button type="button" className="gcw-icon-btn is-accent" onClick={handleSwitchToHtmlMode}>
                          <Code2 size={12} /> Switch to HTML Playground
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {rightTab === 'terminal' && (
                <div style={{ flex: 1, minHeight: '150px', height: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ flex: 1, minHeight: '135px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
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
                            <StructuredArrowPoint key={idx} text={k} />
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
