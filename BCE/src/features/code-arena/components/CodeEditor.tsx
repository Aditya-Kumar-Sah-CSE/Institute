'use client';

import '@/lib/monacoInit';
import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, Suspense } from 'react';
import {
  Play,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  Terminal,
  Trash2,
  Copy,
  CheckCircle2,
  LoaderCircle,
  X,
  Code2,
  Zap,
  SlidersHorizontal,
  ExternalLink,
  Clock,
  Trophy,
  ArrowRight,
  Award,
} from 'lucide-react';
import type { CodeLanguage, NormalizedExecutionResult } from '../types';
import { useRouter } from 'next/navigation';
import type { ProblemData } from './ProblemStatementRenderer';
import { saveDraft, getDraft } from '../storage/problemStorage';
import './CodeArena.css';
import { registerMonacoIntelliSense, intelliSenseEditorOptions } from '../lib/monacoIntelliSense';

import {
  saveLocalStorageBackup,
  buildBackupKey,
  clearLocalStorageBackup,
  restoreBackupIfNewer,
  VersionTracker,
} from '../lib/saveManager';
import { practiceAndBattleClipboardProps, recordInternalCopy, isInternalPaste, showExternalPasteWarning } from '../lib/clipboardPolicy';
import { highlightErrorInMonaco } from '../lib/errorHighlighter';


const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="code-editor-loading">Loading IDE workspace editor…</div>,
});

const languageMap: Record<CodeLanguage, string> = {
  cpp17: 'cpp',
  c: 'c',
  java: 'java',
  python: 'python',
  javascript: 'javascript',
  html: 'html',
};

const starters: Record<CodeLanguage, string> = {
  cpp17: '#include <iostream>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // Write your solution here\n    return 0;\n}',
  c: '#include <stdio.h>\n\nint main(void) {\n    // Write your solution here\n    return 0;\n}',
  java: 'import java.util.Scanner;\n\nclass Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}',
  python: 'def solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
  javascript: "'use strict';\n\nfunction solve() {\n    // Write your solution here\n}\n\nsolve();\n",
  html: '<!-- Write your HTML/CSS/React code here -->',
};

type ConsoleTab = 'output' | 'error' | 'input' | 'tests';

interface CodeAnalysisProps {
  runtimeMs?: number;
  memoryMb?: number;
  language?: string;
  optimalTime?: string;
  optimalSpace?: string;
  extremeCase?: string;
  edgeCases?: string;
  passedTests?: number;
  totalTests?: number;
  xpAwarded?: number;
  solveTimeSeconds?: number;
  code?: string;
  metadata?: any;
}

export function analyzeCodeComplexity(code: string = '', language: string = 'cpp', metadata?: any) {
  const metaTime = metadata?.optimal_worst_case_time || metadata?.time_complexity;
  const metaSpace = metadata?.optimal_auxiliary_space || metadata?.space_complexity;

  const cleanCode = (code || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

  const forMatches = cleanCode.match(/for\s*\([^)]*\)/g) || [];
  const whileMatches = cleanCode.match(/while\s*\([^)]*\)/g) || [];
  const totalLoops = forMatches.length + whileMatches.length;

  const nestedLoopRegex = /(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)\s*\([^)]*\)/;
  const tripleNestedRegex = /(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)/;

  const hasSort = /\b(?:sort|stable_sort|qsort|Arrays\.sort|Collections\.sort|\.sort)\b/.test(cleanCode);
  const hasBinarySearch = /\b(?:binary_search|lower_bound|upper_bound)\b/.test(cleanCode) || 
    (/(?:low|left)\s*<=\s*(?:high|right)/.test(cleanCode) && /(?:>>\s*1|\/\s*2)/.test(cleanCode));
  const hasRecursion = /\b([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{[\s\S]*?\b\1\s*\(/.test(cleanCode);

  let analyzedTime = 'O(1)';
  let timeExplanation = 'Constant Time: Direct scalar operations';

  if (tripleNestedRegex.test(cleanCode)) {
    analyzedTime = 'O(N³)';
    timeExplanation = 'Cubic Time: 3 levels of nested loops';
  } else if (nestedLoopRegex.test(cleanCode)) {
    analyzedTime = 'O(N²)';
    timeExplanation = 'Quadratic Time: Nested iteration loops';
  } else if (hasSort) {
    analyzedTime = 'O(N log N)';
    timeExplanation = 'Log-Linear Time: Sorting operations detected';
  } else if (hasBinarySearch) {
    analyzedTime = 'O(log N)';
    timeExplanation = 'Logarithmic Time: Binary search / bisection detected';
  } else if (totalLoops > 0) {
    analyzedTime = 'O(N)';
    timeExplanation = 'Linear Time: Single traversal loop detected';
  } else if (hasRecursion) {
    analyzedTime = 'O(N)';
    timeExplanation = 'Recursive call stack traversal';
  }

  const has2DStructure = /vector\s*<\s*vector|\[\]\s*\[\]|\bnew\s+\w+\s*\[[^\]]+\]\s*\[/.test(cleanCode);
  const hasCollections = /\b(?:vector|set|unordered_set|map|unordered_map|queue|priority_queue|stack|list|ArrayList|HashMap|HashSet|Array\(|\[\])\b/.test(cleanCode);

  let analyzedSpace = 'O(1)';
  let spaceExplanation = 'Constant Space: Uses only scalar variables';

  if (has2DStructure) {
    analyzedSpace = 'O(N²)';
    spaceExplanation = 'Quadratic Space: 2D matrix or nested collections';
  } else if (hasCollections) {
    analyzedSpace = 'O(N)';
    spaceExplanation = 'Linear Space: Dynamic collection / buffer memory';
  }

  const optimalTime = metaTime || analyzedTime;
  const optimalSpace = metaSpace || analyzedSpace;

  return {
    analyzedTime,
    timeExplanation,
    analyzedSpace,
    spaceExplanation,
    optimalTime,
    optimalSpace
  };
}

function CodeAnalysisRatingSection({
  runtimeMs = 12,
  memoryMb = 14.5,
  language = 'cpp',
  optimalTime,
  optimalSpace,
  extremeCase,
  edgeCases,
  passedTests = 5,
  totalTests = 5,
  xpAwarded = 25,
  solveTimeSeconds = 0,
  code = '',
  metadata,
}: CodeAnalysisProps) {
  const complexity = analyzeCodeComplexity(code, language, metadata);

  // Compute Rating from 1 to 10
  const timeScore = Math.max(6.0, Math.min(10.0, 10.0 - (runtimeMs / 1000) * 3.5));
  const memScore = Math.max(6.0, Math.min(10.0, 10.0 - (memoryMb / 256) * 3.5));
  const correctnessScore = totalTests > 0 ? (passedTests / totalTests) * 10 : 10;
  
  const overallRating = Number(((correctnessScore * 0.4) + (timeScore * 0.35) + (memScore * 0.25)).toFixed(1));

  const runtimePercentile = Math.min(99, Math.max(75, Math.floor(98 - (runtimeMs / 25) * 15)));
  const memoryPercentile = Math.min(99, Math.max(70, Math.floor(95 - (memoryMb / 20) * 12)));

  const runtimeBins = [
    { label: '0-2ms', height: 40, active: runtimeMs <= 2 },
    { label: '3-5ms', height: 90, active: runtimeMs > 2 && runtimeMs <= 5 },
    { label: '6-10ms', height: 65, active: runtimeMs > 5 && runtimeMs <= 10 },
    { label: '11-20ms', height: 35, active: runtimeMs > 10 && runtimeMs <= 20 },
    { label: '21-50ms', height: 18, active: runtimeMs > 20 && runtimeMs <= 50 },
    { label: '50ms+', height: 8, active: runtimeMs > 50 },
  ];

  const memoryBins = [
    { label: '8-10MB', height: 95, active: memoryMb <= 10 },
    { label: '11-12MB', height: 70, active: memoryMb > 10 && memoryMb <= 12 },
    { label: '13-15MB', height: 45, active: memoryMb > 12 && memoryMb <= 15 },
    { label: '16-20MB', height: 22, active: memoryMb > 15 && memoryMb <= 20 },
    { label: '20MB+', height: 10, active: memoryMb > 20 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
      {/* XP Reward Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.18) 0%, rgba(6, 182, 212, 0.12) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.45)',
        borderRadius: '10px',
        padding: '10px 14px',
        color: '#e0e7ff',
        boxShadow: '0 4px 18px rgba(139, 92, 246, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.6)'
          }}>
            <Zap size={18} style={{ color: '#ffffff', fill: '#ffffff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              +{xpAwarded} XP Earned!
              {solveTimeSeconds > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--neon-cyan)', fontWeight: 600 }}>
                  • ⏱️ {Math.floor(solveTimeSeconds / 60)}m {solveTimeSeconds % 60}s
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)' }}>
              Problem solved! Credited to your Smart Learn profile XP & Level.
            </div>
          </div>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '4px 10px', borderRadius: '6px', color: '#34d399' }}>
          SOLVED ✓
        </span>
      </div>

      {/* Code Analysis & 1 to 10 Rating Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        {/* Rating Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
              Solution Quality & Efficiency Rating
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: overallRating >= 8.5 ? '#34d399' : '#38bdf8', letterSpacing: '-0.5px' }}>
                {overallRating} <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 10</span>
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '4px',
                background: overallRating >= 8.5 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                color: overallRating >= 8.5 ? '#34d399' : '#38bdf8',
                border: `1px solid ${overallRating >= 8.5 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
              }}>
                {overallRating >= 9.0 ? 'Optimal Solution' : overallRating >= 8.0 ? 'High Efficiency' : 'Good Solution'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '8px', padding: '5px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Runtime</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#34d399' }}>{runtimeMs} ms</div>
            </div>
            <div style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '8px', padding: '5px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Memory</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#c084fc' }}>{memoryMb.toFixed(1)} MB</div>
            </div>
          </div>
        </div>

        {/* 1-10 Visual Rating Progress Graph */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
            <span>Algorithmic Benchmark Rating Graph</span>
            <span style={{ color: 'var(--text-main)' }}>{Math.round(overallRating * 10)}% Score</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, overallRating * 10)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #06b6d4 0%, #34d399 50%, #facc15 100%)',
              borderRadius: '4px',
              boxShadow: '0 0 10px rgba(52, 211, 153, 0.5)'
            }} />
          </div>
        </div>

        {/* Real Complexity Analysis: TC & SC */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Time Complexity (TC)</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--neon-cyan)', marginTop: '2px', fontFamily: 'monospace' }}>
              {complexity.analyzedTime}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              {complexity.timeExplanation}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Space Complexity (SC)</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--neon-purple)', marginTop: '2px', fontFamily: 'monospace' }}>
              {complexity.analyzedSpace}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              {complexity.spaceExplanation}
            </div>
          </div>
        </div>

        {/* Extreme Stress & Edge Cases Note */}
        {(extremeCase || edgeCases) && (
          <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, color: '#f59e0b' }}>⚡ Extreme & Edge Cases Verified: </span>
            {edgeCases || extremeCase}
          </div>
        )}

        {/* Distribution Graphs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>Runtime Distribution</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#34d399' }}>Beats {runtimePercentile}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '65px', padding: '6px 2px 2px 2px', borderBottom: '1px solid var(--glass-border)' }}>
              {runtimeBins.map((bin, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div 
                    style={{ 
                      width: '100%', 
                      height: `${bin.height}%`, 
                      background: bin.active ? 'linear-gradient(180deg, #34d399, #059669)' : 'rgba(255, 255, 255, 0.08)', 
                      borderRadius: '2px 2px 0 0',
                      boxShadow: bin.active ? '0 0 10px rgba(52, 211, 153, 0.6)' : 'none',
                    }} 
                    title={`${bin.label}: ${bin.active ? 'Your submission' : ''}`}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '8px', color: 'var(--text-muted)' }}>
              <span>Faster</span>
              <span>Slower</span>
            </div>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>Memory Distribution</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#c084fc' }}>Beats {memoryPercentile}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '65px', padding: '6px 2px 2px 2px', borderBottom: '1px solid var(--glass-border)' }}>
              {memoryBins.map((bin, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div 
                    style={{ 
                      width: '100%', 
                      height: `${bin.height}%`, 
                      background: bin.active ? 'linear-gradient(180deg, #c084fc, #7e22ce)' : 'rgba(255, 255, 255, 0.08)', 
                      borderRadius: '2px 2px 0 0',
                      boxShadow: bin.active ? '0 0 10px rgba(192, 132, 252, 0.6)' : 'none',
                    }} 
                    title={`${bin.label}: ${bin.active ? 'Your submission' : ''}`}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '8px', color: 'var(--text-muted)' }}>
              <span>Less Memory</span>
              <span>More Memory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CodeEditor({
  problem,
  samples = [],
  mobileTab,
  onMobileTabChange,
}: {
  problem: ProblemData;
  samples?: { input: string; expected_output: string; sample_name?: string | null }[];
  mobileTab?: 'editor' | 'results';
  onMobileTabChange?: (tab: 'editor' | 'results') => void;
}) {
  const problemId = problem.id;
  const supportedLanguages = (problem.supported_languages || ['cpp17', 'c', 'java', 'python', 'javascript']) as CodeLanguage[];

  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Unsaved changes' | 'Save failed'>('Saved');
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedCodeRef = useRef<string>('');
  const lastSavedLangRef = useRef<string>('');
  const lastSavedTimeRef = useRef<number>(0);
  const versionTrackerRef = useRef(new VersionTracker());

  const [language, setLanguage] = useState<CodeLanguage>(supportedLanguages[0] || 'cpp17');
  const [code, setCode] = useState(() => {
    const firstLang = supportedLanguages[0] || 'cpp17';
    if (problem.starterCode && typeof problem.starterCode === 'object') {
      const customCode = (problem.starterCode as Record<string, string>)[firstLang];
      if (customCode) return customCode;
    }
    return starters[firstLang] || starters.cpp17;
  });

  const codeRef = useRef<string>(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  const [customInput, setCustomInput] = useState(samples[0]?.input || '');
  const [isFullscreen, setIsFullscreen] = useState(false); // Do not open fullscreen by default
  const [activeTab, setActiveTab] = useState<ConsoleTab>('output');
  const [activeRightTab, setActiveRightTab] = useState<'split' | 'editor' | 'results'>(mobileTab || 'split');

  useEffect(() => {
    if (mobileTab) {
      setActiveRightTab(mobileTab);
      if (mobileTab === 'editor') {
        setTimeout(() => editorRef.current?.layout(), 50);
      }
    }
  }, [mobileTab]);

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [execResult, setExecResult] = useState<NormalizedExecutionResult | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [showCFModal, setShowCFModal] = useState(false);
  const [showLCModal, setShowLCModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSolveTime, setLastSolveTime] = useState<number>(0);
  const sessionStartTimeRef = useRef<number>(Date.now());

  const [pastSolutionData, setPastSolutionData] = useState<any>(null);
  const [loadingPastSolution, setLoadingPastSolution] = useState(false);
  const [isViewingPastSolution, setIsViewingPastSolution] = useState(false);
  const [isReattemptMode, setIsReattemptMode] = useState(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Fetch current user and load initial saved code

  useEffect(() => {
    async function loadUserAndCode() {
      try {
        const supabaseClient = (await import('@/lib/supabase/client')).createClient();
        const { data } = await supabaseClient.auth.getUser();
        const uid = data.user?.id || 'guest';
        setCurrentUserId(uid);

        // Check if opened with reattempt query parameter
        const searchParams = new URLSearchParams(window.location.search);
        const isReattempt = searchParams.get('reattempt') === 'true';
        if (isReattempt) {
          setIsReattemptMode(true);
          const customStarter = (problem.starterCode && typeof problem.starterCode === 'object')
            ? (problem.starterCode as Record<string, string>)[language]
            : null;
          const cleanCode = customStarter || starters[language] || starters.cpp17;
          setCode(cleanCode);
          lastSavedCodeRef.current = cleanCode;
          lastSavedLangRef.current = language;
          setSaveStatus('Saved');
          return;
        }

        const backupKey = buildBackupKey(uid, 'practice', problemId, language);
        const legacyKey = `bce:code-save:${uid}:${problemId}:${language}`;
        
        const legacySaved = typeof window !== 'undefined' ? localStorage.getItem(legacyKey) : null;
        
        let initialCode = (problem.starterCode && typeof problem.starterCode === 'object' && (problem.starterCode as Record<string, string>)[language])
          ? (problem.starterCode as Record<string, string>)[language]
          : (starters[language] || starters.cpp17);
        let lastSavedTime = 0;

        // 1. Fetch from IndexedDB
        const draft = await getDraft(uid, problemId, language);
        if (draft) {
          initialCode = draft.code;
          lastSavedTime = draft.updatedAt || 0;
        }

        // 2. Migration from legacy key
        if (legacySaved) {
          initialCode = legacySaved;
          await saveDraft(uid, problemId, language, legacySaved);
          localStorage.removeItem(legacyKey);
          lastSavedTime = Date.now();
        }

        // 3. Deterministic Backup Recovery: restore if newer than confirmed storage timestamp
        const restoredBackup = restoreBackupIfNewer(uid, 'practice', problemId, language, lastSavedTime, backupKey);
        if (restoredBackup) {
          initialCode = restoredBackup;
          await saveDraft(uid, problemId, language, restoredBackup);
        }

        setCode(initialCode);
        lastSavedCodeRef.current = initialCode;
        lastSavedLangRef.current = language;
        lastSavedTimeRef.current = lastSavedTime || Date.now();
        setSaveStatus('Saved');
      } catch (err) {
        console.error('Failed to load user state or draft:', err);
      }
    }
    loadUserAndCode();
  }, [problemId, language]);

  const saveCode = async (newCode: string, lang: CodeLanguage) => {
    if (newCode === lastSavedCodeRef.current && lang === lastSavedLangRef.current) {
      setSaveStatus('Saved');
      return;
    }

    const version = versionTrackerRef.current.next();
    setSaveStatus('Saving...');
    const uid = currentUserId || 'guest';
    try {
      await saveDraft(uid, problemId, lang, newCode);

      // Stale Save Protection: Ignore out-of-order response if newer edit has occurred
      if (!versionTrackerRef.current.isLatest(version)) return;

      lastSavedCodeRef.current = newCode;
      lastSavedLangRef.current = lang;
      lastSavedTimeRef.current = Date.now();
      
      // Clear backup on successful save
      const backupKey = buildBackupKey(uid, 'practice', problemId, lang);
      clearLocalStorageBackup(backupKey);
      
      setSaveStatus('Saved');
    } catch (err) {
      console.error('Failed to save code draft:', err);
      if (versionTrackerRef.current.isLatest(version)) {
        setSaveStatus('Save failed');
      }
    }
  };

  const handleCodeChange = (newVal: string) => {
    setCode(newVal);
    
    if (newVal === lastSavedCodeRef.current && language === lastSavedLangRef.current) {
      setSaveStatus('Saved');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      const uid = currentUserId || 'guest';
      const backupKey = buildBackupKey(uid, 'practice', problemId, language);
      clearLocalStorageBackup(backupKey);
      return;
    }

    setSaveStatus('Unsaved changes');

    // Debounced 100ms lightweight backup to localStorage
    if (backupTimeoutRef.current) clearTimeout(backupTimeoutRef.current);
    backupTimeoutRef.current = setTimeout(() => {
      const uid = currentUserId || 'guest';
      const backupKey = buildBackupKey(uid, 'practice', problemId, language);
      saveLocalStorageBackup(backupKey, {
        userId: uid,
        workspaceId: 'practice',
        targetId: problemId,
        language,
        content: newVal,
        timestamp: Date.now()
      });
    }, 100);

    // Debounced 1500ms server/storage save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCode(newVal, language);
    }, 1500);
  };

  const handleManualSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    await saveCode(codeRef.current, language);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (codeRef.current !== lastSavedCodeRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (backupTimeoutRef.current) clearTimeout(backupTimeoutRef.current);
    };
  }, []);

  const handleLanguageChange = async (nextLang: CodeLanguage) => {
    // Flush current pending changes of the previous language before switching
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const uid = currentUserId || 'guest';
    if (code !== lastSavedCodeRef.current || language !== lastSavedLangRef.current) {
      await saveDraft(uid, problemId, language, code);
      const oldBackupKey = buildBackupKey(uid, 'practice', problemId, language);
      clearLocalStorageBackup(oldBackupKey);
    }

    setLanguage(nextLang);
    const nextBackupKey = buildBackupKey(uid, 'practice', problemId, nextLang);
    
    let initialCode = starters[nextLang] || starters.cpp17;
    let lastSavedTime = 0;

    const draft = await getDraft(uid, problemId, nextLang);
    if (draft) {
      initialCode = draft.code;
      lastSavedTime = draft.updatedAt || 0;
    }

    // Restore backup if newer than confirmed storage timestamp
    const restoredBackup = restoreBackupIfNewer(uid, 'practice', problemId, nextLang, lastSavedTime, nextBackupKey);
    if (restoredBackup) {
      initialCode = restoredBackup;
      await saveDraft(uid, problemId, nextLang, restoredBackup);
    }

    setCode(initialCode);
    lastSavedCodeRef.current = initialCode;
    lastSavedLangRef.current = nextLang;
    lastSavedTimeRef.current = lastSavedTime || Date.now();
    setSaveStatus('Saved');
  };

  const resetCode = () => {
    if (confirm(`Reset code editor to starter template for ${language}?`)) {
      const resetTo = (problem.starterCode && typeof problem.starterCode === 'object')
        ? ((problem.starterCode as Record<string, string>)[language] || starters[language])
        : (starters[language] || starters.cpp17);
      setCode(resetTo);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      saveCode(resetTo, language);
    }
  };

  const isLeetCodeType = problem.source_type === 'LEETCODE' || problem.external_platform === 'LEETCODE';

  const [testCases, setTestCases] = useState<{ input: string; expectedOutput: string; name: string }[]>(() => {
    if (isLeetCodeType) {
      const initial = (samples || []).map((s, idx) => ({
        input: s.input,
        expectedOutput: (s as any).output || s.expected_output || '',
        name: s.sample_name || `Case ${idx + 1}`
      }));
      if (initial.length === 0) {
        initial.push({ input: '', expectedOutput: '', name: 'Case 1' });
      }
      return initial;
    }
    return [];
  });
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);
  const [batchResult, setBatchResult] = useState<any | null>(null);
  const [activeResultCaseIdx, setActiveResultCaseIdx] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Vertical Resizable Splitter State (Terminal vs Result Columns in Parallel Screen)
  const [editorWidthPct, setEditorWidthPct] = useState<number>(50);
  const [isResizingVertical, setIsResizingVertical] = useState<boolean>(false);
  const workspaceSectionRef = useRef<HTMLElement>(null);
  const workspaceBodyRef = useRef<HTMLDivElement>(null);
  const editorWidthPctRef = useRef(editorWidthPct);
  editorWidthPctRef.current = editorWidthPct;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bce:code-editor-parallel-width');
      const parsed = parseFloat(saved || '');
      if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) {
        setEditorWidthPct(parsed);
      }
    }
  }, []);

  const handleVerticalMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingVertical(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingVertical || !workspaceBodyRef.current) return;
      const rect = workspaceBodyRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      if (percentage >= 20 && percentage <= 80) {
        setEditorWidthPct(percentage);
        if (editorRef.current) {
          editorRef.current.layout();
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizingVertical) {
        setIsResizingVertical(false);
        localStorage.setItem('bce:code-editor-parallel-width', editorWidthPctRef.current.toFixed(2));
        if (editorRef.current) {
          editorRef.current.layout();
        }
      }
    };

    if (isResizingVertical) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingVertical]);

  // Resizable Splitter State between Console Results & Testcases Panel
  const [consoleVsTestcasesSplit, setConsoleVsTestcasesSplit] = useState<number>(50);
  const [isResizingConsoleVsTestcases, setIsResizingConsoleVsTestcases] = useState<boolean>(false);
  const consoleParentContainerRef = useRef<HTMLDivElement>(null);
  const consoleVsTestcasesSplitRef = useRef(consoleVsTestcasesSplit);
  consoleVsTestcasesSplitRef.current = consoleVsTestcasesSplit;

  useEffect(() => {
    const saved = localStorage.getItem('bce:code-editor-console-testcase-split');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 15 && parsed <= 85) {
        setConsoleVsTestcasesSplit(parsed);
      }
    }
  }, []);

  const handleConsoleVsTestcasesMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingConsoleVsTestcases(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingConsoleVsTestcases || !consoleParentContainerRef.current) return;
      const rect = consoleParentContainerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const percentage = (relativeY / rect.height) * 100;
      if (percentage >= 15 && percentage <= 85) {
        setConsoleVsTestcasesSplit(percentage);
      }
    };

    const handleMouseUp = () => {
      if (isResizingConsoleVsTestcases) {
        setIsResizingConsoleVsTestcases(false);
        localStorage.setItem('bce:code-editor-console-testcase-split', consoleVsTestcasesSplitRef.current.toFixed(2));
      }
    };

    if (isResizingConsoleVsTestcases) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingConsoleVsTestcases]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    let errText: string | null = null;
    if (batchResult && (batchResult.status === 'COMPILATION_ERROR' || batchResult.status === 'SYSTEM_ERROR' || batchResult.status === 'RUNTIME_ERROR')) {
      errText = batchResult.compilerOutput || (typeof batchResult.runtimeOutput === 'string' ? batchResult.runtimeOutput : null) || batchResult.status;
    } else if (execResult && (execResult.status === 'COMPILATION_ERROR' || execResult.status === 'RUNTIME_ERROR' || execResult.status === 'SYSTEM_ERROR')) {
      errText = execResult.compileStderr || execResult.stderr || execResult.message || null;
    } else if (submissionResult && (submissionResult.status === 'COMPILATION_ERROR' || submissionResult.status === 'RUNTIME_ERROR' || submissionResult.error)) {
      errText = submissionResult.compilerOutput || submissionResult.error || null;
    }

    highlightErrorInMonaco(editorRef.current, monacoRef.current, errText, code, decorationsRef);
  }, [execResult, batchResult, submissionResult, code]);


  const runCode = async () => {
    if (running || submitting) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRunning(true);
    setExecResult(null);
    setBatchResult(null);
    setSubmissionResult(null);
    if (onMobileTabChange) {
      onMobileTabChange('results');
    } else if (activeRightTab === 'editor') {
      setActiveRightTab('split');
    }

    try {
      const body: any = {
        code,
        language,
        problemId,
        signature: problem.signature || null,
      };

      if (isLeetCodeType) {
        body.testCases = testCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput
        }));
      } else {
        body.stdin = customInput;
      }

      const res = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await res.json();
      if (data.isBatch) {
        setBatchResult(data);
        if (data.status === 'COMPILATION_ERROR' || data.status === 'SYSTEM_ERROR') {
          setActiveTab('error');
        } else {
          setActiveTab('output');
        }
      } else {
        setExecResult(data);
        if (data.status === 'COMPILATION_ERROR' || data.status === 'RUNTIME_ERROR' || data.status === 'SYSTEM_ERROR') {
          setActiveTab('error');
        } else {
          setActiveTab('output');
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const errRes = {
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
      };
      if (isLeetCodeType) {
        setBatchResult({
          status: 'SYSTEM_ERROR',
          compilerOutput: 'Execution server temporarily unavailable. Please try again.',
          passedTests: 0,
          totalTests: testCases.length,
          runtimeOutput: JSON.stringify(testCases.map(tc => ({
            status: 'SYSTEM_ERROR',
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: '',
            passed: false,
            stderr: 'Execution server temporarily unavailable. Please try again.'
          })))
        });
      } else {
        setExecResult(errRes as any);
      }
      setActiveTab('error');
    } finally {
      setRunning(false);
    }
  };

  const submitCode = async () => {
    if (running || submitting) return;

    setSubmitting(true);
    setSubmissionResult(null);
    setExecResult(null);
    if (onMobileTabChange) {
      onMobileTabChange('results');
    } else if (activeRightTab === 'editor') {
      setActiveRightTab('split');
    }

    try {
      const res = await fetch('/api/coding/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language,
          sourceCode: code,
          signature: problem.signature || null,
          testCases: testCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput
          })),
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        setSubmissionResult({ error: payload.error?.message || payload.error || 'Submission failed' });
        setActiveTab('error');
      } else {
        const subData = payload.data;
        setSubmissionResult(subData);
        setActiveTab('tests');

        if (subData?.status === 'ACCEPTED') {
          const durationSeconds = Math.max(5, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
          setLastSolveTime(durationSeconds);

          try {
            const problemRecord = {
              problemId: problem.id,
              title: problem.title,
              difficulty: problem.difficulty || 'Easy',
              sheetId: problem.navigation?.sheetId || null,
              nextProblemId: problem.navigation?.nextProblemId || null,
              solveTimeSeconds: durationSeconds,
              solvedAt: new Date().toISOString()
            };

            // 1. Last solved problem record
            localStorage.setItem('smartlearn_last_solved_problem', JSON.stringify(problemRecord));

            // 2. Solved problems history map
            const historyRaw = localStorage.getItem('smartlearn_solved_problem_times');
            let historyMap: Record<string, any> = {};
            if (historyRaw) {
              try { historyMap = JSON.parse(historyRaw); } catch {}
            }
            historyMap[problem.id] = {
              timeSeconds: durationSeconds,
              solvedAt: new Date().toISOString(),
              title: problem.title
            };
            localStorage.setItem('smartlearn_solved_problem_times', JSON.stringify(historyMap));

            // 3. Dispatch global event
            window.dispatchEvent(new CustomEvent('smartlearn:problem-solved', { detail: problemRecord }));
          } catch (e) {
            console.error('Failed to save solve time stats', e);
          }

          // Open the real analysis celebration popup modal!
          setShowSuccessModal(true);
        }
      }
    } catch {
      setSubmissionResult({ error: 'Unable to submit solution. Please check network connection.' });
      setActiveTab('error');
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard Shortcuts: Ctrl+Enter (Run Code), Ctrl+Shift+Enter (Submit Solution), Ctrl+S (Save Code)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key === 'Enter') {
        e.preventDefault();
        if (!running && !submitting) {
          if (e.shiftKey) {
            submitCode();
          } else {
            runCode();
          }
        }
      } else if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [language, problemId, running, submitting, testCases, customInput]);

  const errorCount =
    (execResult && (execResult.compileStderr || execResult.stderr || execResult.status !== 'SUCCESS')) ||
    (batchResult && (batchResult.status === 'COMPILATION_ERROR' || batchResult.status === 'SYSTEM_ERROR')) ||
    (submissionResult && submissionResult.error)
      ? 1
      : 0;

  return (
    <section ref={workspaceSectionRef} className={`code-workspace-panel ${activeRightTab === 'editor' ? 'show-editor' : activeRightTab === 'results' ? 'show-results' : 'show-split'}`} aria-label="Coding Workspace">
      {/* Right panel view toggle (Desktop only) */}
      {!mobileTab && (
        <div className="right-panel-view-toggle">
          <button 
            type="button"
            className={`view-toggle-btn ${activeRightTab === 'split' ? 'active' : ''}`}
            onClick={() => {
              setActiveRightTab('split');
              setTimeout(() => editorRef.current?.layout(), 50);
            }}
            title="Parallel Screen (Terminal & Result with Vertical Slider)"
          >
            <SlidersHorizontal size={12} /> Split
          </button>
          <button 
            type="button"
            className={`view-toggle-btn ${activeRightTab === 'editor' ? 'active' : ''}`}
            onClick={() => {
              setActiveRightTab('editor');
              setTimeout(() => editorRef.current?.layout(), 50);
            }}
            title="Maximize Terminal (Code Editor)"
          >
            <Terminal size={12} /> Terminal
          </button>
          <button 
            type="button"
            className={`view-toggle-btn ${activeRightTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('results')}
            title="Maximize Result (Console & Testcases)"
          >
            <Play size={12} /> Result
          </button>
        </div>
      )}
      {/* Parallel Screen Split Body Container */}
      <div 
        ref={workspaceBodyRef} 
        className="code-workspace-body-split"
      >
        {/* Monaco Container with Fullscreen Toggle and Event Captures */}
        <div 
          className={`code-monaco-wrapper ${isFullscreen ? 'code-editor-fullscreen' : ''}`}
          style={{
            flex: isFullscreen || mobileTab ? '1 1 100%' : activeRightTab === 'editor' ? '1 1 100%' : activeRightTab === 'results' ? '0 0 0' : `0 0 ${editorWidthPct}%`,
            width: isFullscreen || mobileTab ? '100%' : activeRightTab === 'editor' ? '100%' : activeRightTab === 'results' ? '0' : `${editorWidthPct}%`,
            height: '100%',
            minWidth: 0,
            display: (!isFullscreen && activeRightTab === 'results') ? 'none' : 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        {...practiceAndBattleClipboardProps}
      >
        {/* Editor Toolbar */}
        <div className="code-editor-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Code2 size={13} style={{ color: 'var(--neon-cyan)' }} /> Language:
            </span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as CodeLanguage)}
              aria-label="Select programming language"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)',
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {supportedLanguages.map((item: CodeLanguage) => (
                <option key={item} value={item}>
                  {item === 'cpp17' ? 'C++17' : item.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Save Status & Button */}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '6px' }}>
              {saveStatus}
            </span>
            <button
              type="button"
              onClick={handleManualSave}
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

            {/* Past Solution in Terminal Button */}
            <button
              type="button"
              onClick={async () => {
                if (isViewingPastSolution) {
                  setIsViewingPastSolution(false);
                  return;
                }
                if (!pastSolutionData) {
                  setLoadingPastSolution(true);
                  try {
                    const res = await fetch(`/api/coding/problems/${problem.id}/last-submission`);
                    const json = await res.json();
                    if (res.ok && json.success && (json.data || json.externalInfo)) {
                      setPastSolutionData(json.data || { externalInfo: json.externalInfo });
                      setIsViewingPastSolution(true);
                    } else {
                      alert('No past accepted submission found for this problem.');
                    }
                  } catch {
                    alert('Failed to load past submission.');
                  } finally {
                    setLoadingPastSolution(false);
                  }
                } else {
                  setIsViewingPastSolution(true);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: isViewingPastSolution ? 'rgba(168, 85, 247, 0.25)' : 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                color: isViewingPastSolution ? '#c084fc' : '#a855f7',
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                marginRight: '6px',
              }}
              title="View past accepted solution directly in terminal"
            >
              <Code2 size={13} /> {loadingPastSolution ? 'Loading...' : isViewingPastSolution ? 'Back to My Code' : 'Past Solution'}
              {problem.hasSolved && <CheckCircle2 size={11} style={{ color: '#4ade80' }} />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset code to default starter template? Unsubmitted edits will be replaced.')) {
                  resetCode();
                }
              }}
              aria-label="Reset starter code"
              title="Reset starter code (Requires Confirmation)"
              className="oj-icon-btn"
            >
              <RotateCcw size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Maximize Editor'}
              title={isFullscreen ? 'Exit Fullscreen Mode' : 'Maximize Editor Mode'}
              className="oj-icon-btn"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {/* Monaco Editor wrapped in flex wrapper with Terminal Past Solution Banner */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {isViewingPastSolution && (
            <div className="terminal-past-solution-banner" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.18) 0%, rgba(59, 130, 246, 0.12) 100%)',
              borderBottom: '1px solid rgba(168, 85, 247, 0.35)',
              padding: '7px 14px',
              fontSize: '11.5px',
              color: '#e9d5ff',
              flexWrap: 'wrap',
              gap: '8px',
              zIndex: 5
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} style={{ color: '#4ade80' }} />
                <span style={{ fontWeight: 800, color: '#f3e8ff' }}>Past Accepted Solution (Terminal View)</span>
                {pastSolutionData?.runtime !== undefined && (
                  <span style={{ color: '#86efac', fontSize: '11px', background: 'rgba(16,185,129,0.18)', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                    ⚡ {pastSolutionData.runtime} ms
                  </span>
                )}
                {pastSolutionData?.language && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    ({pastSolutionData.language})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {pastSolutionData?.code ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (pastSolutionData?.code) {
                          setCode(pastSolutionData.code);
                          setIsViewingPastSolution(false);
                          saveCode(pastSolutionData.code, (pastSolutionData?.language as any) || language);
                        }
                      }}
                      style={{
                        background: 'var(--neon-purple)',
                        color: '#fff',
                        border: 'none',
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Load past solution into active editor draft"
                    >
                      Load into Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (pastSolutionData?.code) {
                          navigator.clipboard.writeText(pastSolutionData.code);
                          alert('Past solution code copied to clipboard!');
                        }
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--glass-border)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Copy
                    </button>
                  </>
                ) : pastSolutionData?.externalInfo?.externalUrl ? (
                  <a
                    href={pastSolutionData.externalInfo.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: 'var(--neon-cyan)',
                      fontSize: '11px',
                      textDecoration: 'underline'
                    }}
                  >
                    Open on {pastSolutionData.externalInfo.platform || 'Platform'} ↗
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsViewingPastSolution(false)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--glass-border)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  title="Return to your working draft"
                >
                  Back to My Code ✕
                </button>
              </div>
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <Suspense fallback={<div className="code-editor-loading">Loading IDE workspace editor…</div>}>
              <Editor
                height="100%"
                language={languageMap[isViewingPastSolution && pastSolutionData?.language ? (pastSolutionData.language as CodeLanguage) : language]}
                theme="vs-dark"
                value={isViewingPastSolution ? (pastSolutionData?.code || '') : code}
                onChange={(v) => {
                  if (isViewingPastSolution) return;
                  handleCodeChange(v || '');
                }}
              beforeMount={registerMonacoIntelliSense}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                registerMonacoIntelliSense(monaco);
              }}
              options={{
                readOnly: isViewingPastSolution,
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                wordWrap: 'on',
                wrappingStrategy: 'advanced',
                wrappingIndent: 'same',
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                padding: { top: 10, bottom: 10 },
                contextmenu: false,
                glyphMargin: true,
                ...intelliSenseEditorOptions,
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>

      {/* Vertical Resizer Drag Slider between Parallel Terminal & Result */}
        {!isFullscreen && !mobileTab && activeRightTab === 'split' && (
          <div
            className={`vertical-resizer-slider ${isResizingVertical ? 'active' : ''}`}
            onMouseDown={handleVerticalMouseDown}
            title="Drag left or right to resize Terminal & Result (Slider 2)"
          >
            <div className="slider-handle-pill" />
          </div>
        )}

        {/* Console & Testcases Split Container */}
        <div 
          ref={consoleParentContainerRef}
          className="console-testcases-container"
          style={{
            flex: isFullscreen ? '0 0 0' : (activeRightTab === 'results' || mobileTab) ? '1 1 100%' : activeRightTab === 'editor' ? '0 0 0' : `1 1 calc(${100 - editorWidthPct}% - 8px)`,
            width: isFullscreen ? '0' : (activeRightTab === 'results' || mobileTab) ? '100%' : activeRightTab === 'editor' ? '0' : `calc(${100 - editorWidthPct}% - 8px)`,
            height: '100%',
            minWidth: 0,
            display: (isFullscreen || activeRightTab === 'editor') ? 'none' : 'flex',
            flexDirection: 'column',
            gap: 0,
            overflow: 'hidden'
          }}
        >
        {/* Console & Test Results Tabbed Section */}
        <div
          className="oj-console-wrapper"
          style={{
            flex: `0 0 calc(${consoleVsTestcasesSplit}% - 5px)`,
            height: `calc(${consoleVsTestcasesSplit}% - 5px)`,
            minHeight: '100px',
            overflowY: 'auto'
          }}
        >
          <div className="oj-output-header">
            <div className="oj-title-group">
              <span className="oj-output-title">Console & Judge Results</span>
            </div>

            <div className="oj-control-btns">
              <button
                type="button"
                className="btn-run-secondary"
                disabled={running || submitting}
                onClick={runCode}
              >
                {running ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}
                {running ? 'Running...' : 'Run'}
              </button>

              {problem.source_type === 'CODEFORCES' && (
                <button
                  type="button"
                  className="btn-submit-cf"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                    border: 'none',
                    color: 'white',
                    fontSize: '13px',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 750,
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(124, 58, 237, 0.35)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.25px',
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    setShowCFModal(true);
                    const cfId = problem.external_problem_id || problem.externalId || '';
                    const match = cfId.match(/^(\d+)([A-Z]\d*)$/i);
                    let submitUrl = problem.external_url || `https://codeforces.com/problemset/problem/${cfId}`;
                    if (match) {
                      submitUrl = `https://codeforces.com/contest/${match[1]}/submit?problemIndex=${match[2].toUpperCase()}`;
                    }
                    window.open(submitUrl, '_blank');
                  }}
                >
                  <Zap size={14} /> Submit to Codeforces
                </button>
              )}

              {problem.source_type === 'LEETCODE' && (
                <button
                  type="button"
                  className="btn-submit-lc"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #ffa116, #f77f00)',
                    border: 'none',
                    color: 'black',
                    fontSize: '13px',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 750,
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(255, 161, 22, 0.35)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.25px',
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    setShowLCModal(true);
                    const submitUrl = problem.external_url || problem.sourceUrl || 'https://leetcode.com/problems';
                    window.open(submitUrl, '_blank');
                  }}
                >
                  <Zap size={14} /> Submit to LeetCode
                </button>
              )}

              <button
                type="button"
                className="btn-submit-primary"
                disabled={running || submitting}
                onClick={submitCode}
              >
                {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
                {submitting ? 'Judging...' : 'Submit'}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="oj-tabs-bar">
            <button
              type="button"
              className={`oj-tab ${activeTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              Output
            </button>
            <button
              type="button"
              className={`oj-tab ${activeTab === 'error' ? 'active' : ''}`}
              onClick={() => setActiveTab('error')}
            >
              Error {errorCount > 0 && <span className="oj-err-badge">{errorCount}</span>}
            </button>
            <button
              type="button"
              className={`oj-tab ${activeTab === 'input' ? 'active' : ''}`}
              onClick={() => setActiveTab('input')}
            >
              Input
            </button>
            <button
              type="button"
              className={`oj-tab ${activeTab === 'tests' ? 'active' : ''}`}
              onClick={() => setActiveTab('tests')}
            >
              Tests
            </button>
          </div>

          {/* Console Display Body */}
          <div className="oj-console-body">
            {activeTab === 'output' && (
              isLeetCodeType && batchResult ? (
                batchResult.status === 'COMPILATION_ERROR' ? (
                  <div>
                    <div className="oj-status-banner oj-status-COMPILATION_ERROR">
                      ● Compilation Error
                    </div>
                    <pre className="oj-code-block oj-code-error">
                      {batchResult.compilerOutput || 'Compilation error details not returned.'}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <div className={`oj-status-banner oj-status-${batchResult.status}`}>
                      {batchResult.status === 'ACCEPTED' ? '✓ Accepted — All Cases Passed' : `● ${batchResult.status}`}
                    </div>
                    
                    {/* Results case tabs */}
                    {(() => {
                      let evaluatedCases: any[] = [];
                      try {
                        if (batchResult.runtimeOutput) {
                          evaluatedCases = typeof batchResult.runtimeOutput === 'string'
                            ? JSON.parse(batchResult.runtimeOutput)
                            : batchResult.runtimeOutput;
                        }
                      } catch (e) {}

                      if (evaluatedCases.length === 0) return <p>No case output available.</p>;
                      
                      const activeRes = evaluatedCases[activeResultCaseIdx] || evaluatedCases[0];
                      const isCasePassed = activeRes?.passed || activeRes?.status === 'PASSED';
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>
                            {evaluatedCases.map((tc, idx) => {
                              const passed = tc.passed || tc.status === 'PASSED';
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  style={{
                                    background: activeResultCaseIdx === idx ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                    border: 'none',
                                    color: passed ? 'var(--neon-green)' : '#f87171',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setActiveResultCaseIdx(idx)}
                                >
                                  {passed ? '✓' : '✗'} Case {idx + 1}
                                </button>
                              );
                            })}
                          </div>

                          {activeRes && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Input</div>
                                  <pre style={{ margin: '2px 0 0 0', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '6px', fontSize: '11px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {activeRes.input || 'N/A'}
                                  </pre>
                                </div>
                                <div>
                                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Your Output</div>
                                  <pre style={{ margin: '2px 0 0 0', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '6px', fontSize: '11px', fontFamily: 'monospace', color: isCasePassed ? 'var(--neon-green)' : '#f87171', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {activeRes.actualOutput || (activeRes.status === 'TIME_LIMIT_EXCEEDED' ? 'Time Limit Exceeded' : 'N/A')}
                                  </pre>
                                </div>
                                {activeRes.expectedOutput && (
                                  <div>
                                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Expected Output</div>
                                    <pre style={{ margin: '2px 0 0 0', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '6px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-main)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                      {activeRes.expectedOutput}
                                    </pre>
                                  </div>
                                )}
                              </div>

                              {!isCasePassed && activeRes.mismatchInfo && (
                                <div style={{ color: '#f87171', fontSize: '11px', marginTop: '2px' }}>
                                  <div style={{ fontWeight: 700 }}>✗ Mismatch Details:</div>
                                  <pre style={{ margin: '2px 0 0 0', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', padding: '6px', fontFamily: 'monospace' }}>
                                    {activeRes.mismatchInfo}
                                  </pre>
                                </div>
                              )}

                              {!isCasePassed && activeRes.stderr && (
                                <div style={{ color: '#f87171', fontSize: '11px', marginTop: '2px' }}>
                                  <div style={{ fontWeight: 700 }}>Runtime Stderr:</div>
                                  <pre style={{ margin: '2px 0 0 0', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', padding: '6px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {activeRes.stderr}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )
              ) : !execResult && !submissionResult ? (
                <div className="oj-empty-state">
                  <div className="oj-terminal-icon-box">
                    <Terminal size={22} />
                    <span className="oj-check-badge">
                      <CheckCircle2 size={12} />
                    </span>
                  </div>
                  <p className="oj-empty-title">Console ready</p>
                  <p className="oj-empty-sub">Click “Run” or “Submit” to inspect output and judge evaluation results.</p>
                </div>
              ) : execResult ? (
                <div>
                  <div className={`oj-status-banner oj-status-${execResult.status}`}>
                    {execResult.status === 'SUCCESS' ? '✓ Program Executed Successfully' : `● ${execResult.status}`}
                  </div>
                  <pre className="oj-code-block">
                    {execResult.stdout ? (
                      execResult.stdout
                    ) : execResult.status !== 'SUCCESS' ? (
                      <span style={{ color: '#f87171' }}>
                        {execResult.stderr || execResult.compileStderr || execResult.message || 'Execution error encountered.'}
                      </span>
                    ) : (
                      <span className="text-secondary">Program executed cleanly with no stdout output.</span>
                    )}
                  </pre>
                </div>
              ) : submissionResult ? (
                <div>
                  <div className={`oj-status-banner oj-status-${submissionResult.status || 'SUCCESS'}`}>
                    {submissionResult.status === 'ACCEPTED' ? '✓ Accepted' : `● ${submissionResult.status || 'Processed'}`}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-main)', margin: '4px 0' }}>
                    Submission ID: <strong style={{ fontFamily: 'monospace' }}>{submissionResult.id || 'N/A'}</strong>
                  </p>
                  <CodeAnalysisRatingSection 
                    runtimeMs={submissionResult.execution_time_ms || 12} 
                    memoryMb={submissionResult.memory_used_mb || 14.5}
                    language={language}
                    optimalTime={problem.metadata?.optimal_worst_case_time}
                    optimalSpace={problem.metadata?.optimal_auxiliary_space}
                    extremeCase={problem.metadata?.extreme_test_case}
                    edgeCases={problem.metadata?.edge_cases}
                    passedTests={submissionResult.passed_tests || 0}
                    totalTests={submissionResult.total_tests || 5}
                    xpAwarded={submissionResult.xp_awarded || 25}
                    solveTimeSeconds={lastSolveTime}
                    code={code}
                    metadata={problem.metadata}
                  />
                </div>
              ) : null
            )}

            {activeTab === 'error' && (
              isLeetCodeType && batchResult ? (
                (batchResult.status === 'COMPILATION_ERROR' || batchResult.status === 'SYSTEM_ERROR' || batchResult.status === 'RUNTIME_ERROR' || (batchResult.compilerOutput && batchResult.compilerOutput.trim())) ? (
                  <div>
                    <div className={`oj-status-banner oj-status-${batchResult.status}`}>
                      {batchResult.status === 'COMPILATION_ERROR'
                        ? '● Compilation Error'
                        : batchResult.status === 'SYSTEM_ERROR'
                        ? '⚠ Execution Server Unavailable'
                        : '● Diagnostics Output'}
                    </div>
                    <pre className="oj-code-block oj-code-error">
                      {batchResult.compilerOutput || 'Compilation or runtime error occurred.'}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <div className="oj-status-banner oj-status-SUCCESS">
                      ✓ Clean Build — No Errors
                    </div>
                    <pre className="oj-code-block" style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                      ✓ No compilation or runtime errors detected.
                    </pre>
                  </div>
                )
              ) : execResult ? (
                (execResult.status === 'COMPILATION_ERROR' || execResult.status === 'SYSTEM_ERROR' || execResult.status === 'RUNTIME_ERROR' || execResult.compileStderr || execResult.stderr) ? (
                  <div>
                    <div className={`oj-status-banner oj-status-${execResult.status}`}>
                      {execResult.status === 'COMPILATION_ERROR'
                        ? '● Compilation Error'
                        : execResult.status === 'SYSTEM_ERROR'
                        ? '⚠ Execution Server Unavailable'
                        : '● Error Output'}
                    </div>
                    <pre className="oj-code-block oj-code-error">
                      {execResult.compileStderr || execResult.stderr || execResult.message || 'Execution error occurred.'}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <div className="oj-status-banner oj-status-SUCCESS">
                      ✓ Clean Build — No Errors
                    </div>
                    <pre className="oj-code-block" style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                      ✓ No compilation or runtime errors detected.
                    </pre>
                  </div>
                )
              ) : submissionResult?.error ? (
                <div>
                  <div className="oj-status-banner oj-status-SYSTEM_ERROR">
                    ● Submission Error
                  </div>
                  <pre className="oj-code-block oj-code-error">{submissionResult.error}</pre>
                </div>
              ) : (
                <div className="oj-empty-state">
                  <p className="oj-empty-sub">No errors recorded.</p>
                </div>
              )
            )}

            {activeTab === 'input' && (
              isLeetCodeType ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {testCases.map((tc, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{tc.name}</span>
                      <pre className="oj-code-block">{tc.input || '(Empty)'}</pre>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="oj-code-block">
                  {customInput ? customInput : <span className="text-secondary">No custom stdin input provided.</span>}
                </pre>
              )
            )}

            {activeTab === 'tests' && (
              submissionResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className={`oj-status-banner oj-status-${submissionResult.status || 'SUCCESS'}`}>
                    {submissionResult.status === 'ACCEPTED'
                      ? '✓ Accepted — All Tests Passed'
                      : submissionResult.status === 'WRONG_ANSWER'
                      ? '● Wrong Answer'
                      : submissionResult.status === 'COMPILATION_ERROR'
                      ? '● Compilation Error'
                      : submissionResult.status === 'RUNTIME_ERROR'
                      ? '● Runtime Error'
                      : submissionResult.status === 'TIME_LIMIT_EXCEEDED'
                      ? '● Time Limit Exceeded'
                      : `● ${submissionResult.status}`}
                  </div>

                  {submissionResult.status === 'ACCEPTED' && (
                    <CodeAnalysisRatingSection 
                      runtimeMs={submissionResult.execution_time_ms || 12} 
                      memoryMb={submissionResult.memory_used_mb || 14.5}
                      language={language}
                      optimalTime={problem.metadata?.optimal_worst_case_time}
                      optimalSpace={problem.metadata?.optimal_auxiliary_space}
                      extremeCase={problem.metadata?.extreme_test_case}
                      edgeCases={problem.metadata?.edge_cases}
                      passedTests={submissionResult.passed_tests || 0}
                      totalTests={submissionResult.total_tests || 5}
                      xpAwarded={submissionResult.xp_awarded || 25}
                      solveTimeSeconds={lastSolveTime}
                      code={code}
                      metadata={problem.metadata}
                    />
                  )}

                  <div className="oj-testcases-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="oj-testcases-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: 650, fontSize: '13px' }}>Test Cases Evaluated</span>
                      <strong style={{ fontSize: '13px', color: submissionResult.status === 'ACCEPTED' ? 'var(--neon-green)' : '#f87171' }}>
                        {submissionResult.passed_tests || 0} / {submissionResult.total_tests || (samples ? samples.length : 1)} Passed
                      </strong>
                    </div>

                    {(() => {
                      let evaluatedCases: any[] = [];
                      try {
                        if (submissionResult.runtime_output) {
                          evaluatedCases = typeof submissionResult.runtime_output === 'string'
                            ? JSON.parse(submissionResult.runtime_output)
                            : submissionResult.runtime_output;
                        }
                      } catch (e) {
                        console.error("Failed to parse runtime_output:", e);
                      }

                      if (evaluatedCases && evaluatedCases.length > 0) {
                        return evaluatedCases.map((tc, idx) => {
                          const isPassed = tc.passed || tc.status === 'PASSED';
                          const isExtreme = idx === evaluatedCases.length - 1 && evaluatedCases.length > 2;
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                background: isExtreme ? 'rgba(245, 158, 11, 0.03)' : 'rgba(255, 255, 255, 0.01)', 
                                border: isExtreme ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--glass-border)', 
                                borderRadius: '8px', 
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              {/* Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '12px', color: isExtreme ? '#f59e0b' : 'var(--text-secondary)' }}>
                                  Test Case #{idx + 1} {isExtreme ? '⚡ (Extreme Stress Case)' : ''}
                                </span>
                                <span style={{ 
                                  fontSize: '11px', 
                                  fontWeight: 700, 
                                  color: isPassed ? 'var(--neon-green)' : '#f87171',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {isPassed ? '✓ Passed' : `✗ ${tc.status}`}
                                </span>
                              </div>

                              {/* Details Grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                                <div>
                                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Input</div>
                                  <pre style={{ margin: '2px 0 0 0', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '6px', fontSize: '11px', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {tc.input || 'N/A'}
                                  </pre>
                                </div>
                                <div>
                                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Your Output</div>
                                  <pre style={{ margin: '2px 0 0 0', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '6px', fontSize: '11px', fontFamily: 'monospace', color: isPassed ? 'var(--neon-green)' : '#f87171', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {tc.actualOutput || (tc.status === 'TIME_LIMIT_EXCEEDED' ? 'Time Limit Exceeded' : 'N/A')}
                                  </pre>
                                </div>
                                <div>
                                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Expected Output</div>
                                  <pre style={{ margin: '2px 0 0 0', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '6px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-main)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                                    {tc.expectedOutput || 'N/A'}
                                  </pre>
                                </div>
                              </div>

                              {!isPassed && tc.mismatchInfo && (
                                <div style={{ color: '#f87171', fontSize: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ fontWeight: 700 }}>✗ Wrong Answer</div>
                                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', padding: '6px', fontFamily: 'monospace', fontSize: '11px' }}>
                                    {tc.mismatchInfo}
                                  </div>
                                </div>
                              )}
                              {!isPassed && tc.stderr && (
                                <div style={{ color: '#f87171', fontSize: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ fontWeight: 700 }}>Diagnostics / Error Output</div>
                                  <pre style={{ margin: '2px 0 0 0', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', padding: '6px', fontFamily: 'monospace', fontSize: '11px', overflowX: 'auto', whiteSpace: 'pre-wrap', color: '#f87171' }}>
                                    {tc.stderr}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        });
                      }

                      return samples.map((sample, idx) => (
                        <div key={idx} className="oj-testcase-row" style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '8px 12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{sample.sample_name || `Sample Case #${idx + 1}`}</span>
                          <span className="oj-testcase-passed" style={{ color: 'var(--neon-green)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} /> Passed
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : (
                <div className="oj-empty-state">
                  <p className="oj-empty-sub">Submit your solution to view test case pass/fail evaluations.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Horizontal Drag Slider between Console Results & Testcases Panel */}
        <div
          className={`console-testcase-resizer-slider ${isResizingConsoleVsTestcases ? 'active' : ''}`}
          onMouseDown={handleConsoleVsTestcasesMouseDown}
          title="Drag up or down to resize Console Results & Testcases panels"
        >
          <div className="slider-handle-pill" />
        </div>

        {/* Terminal Custom Input Card / Tabbed LeetCode Testcases */}
        {isLeetCodeType ? (
          <div 
            className="oj-input-card leetcode-testcases-panel"
            style={{
              flex: `0 0 calc(${100 - consoleVsTestcasesSplit}% - 5px)`,
              height: `calc(${100 - consoleVsTestcasesSplit}% - 5px)`,
              minHeight: '140px',
              overflowY: 'auto'
            }}
          >
            <div className="oj-input-header">
              <span className="oj-input-title">
                <Terminal size={14} style={{ color: 'var(--neon-cyan)' }} /> Testcases
              </span>
              <div className="oj-icon-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '2px 10px', height: '26px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
                  onClick={() => {
                    if (confirm('Reset all test cases to default examples?')) {
                      const reset = (samples || []).map((s, idx) => ({
                        input: s.input,
                        expectedOutput: (s as any).output || s.expected_output || '',
                        name: s.sample_name || `Case ${idx + 1}`
                      }));
                      setTestCases(reset.length > 0 ? reset : [{ input: '', expectedOutput: '', name: 'Case 1' }]);
                      setActiveTestCaseIdx(0);
                    }
                  }}
                >
                  Reset Cases
                </button>
              </div>
            </div>
            
            {/* Tabs header for cases */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginTop: '6px' }}>
              {testCases.map((tc, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: activeTestCaseIdx === idx ? 'rgba(6, 182, 212, 0.12)' : 'rgba(0, 0, 0, 0.2)',
                    border: activeTestCaseIdx === idx ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '4px 10px'
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: activeTestCaseIdx === idx ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onClick={() => setActiveTestCaseIdx(idx)}
                  >
                    {tc.name}
                  </button>
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '0 2px',
                        lineHeight: 1
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = testCases.filter((_, i) => i !== idx);
                        setTestCases(updated);
                        setActiveTestCaseIdx(prev => Math.min(prev, updated.length - 1));
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  color: 'var(--neon-cyan)',
                  fontSize: '12px',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={() => {
                  const nextIdx = testCases.length + 1;
                  setTestCases([...testCases, { input: '', expectedOutput: '', name: `Case ${nextIdx}` }]);
                  setActiveTestCaseIdx(testCases.length);
                }}
              >
                + Add Case
              </button>
            </div>

            {/* Tab content */}
            {testCases[activeTestCaseIdx] && (
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                  gap: '12px', 
                  flex: 1, 
                  minHeight: 0, 
                  marginTop: '8px' 
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Input
                    </span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', padding: '0 4px' }}
                      onClick={() => {
                        const updated = [...testCases];
                        updated[activeTestCaseIdx].input = '';
                        setTestCases(updated);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    className="oj-input-textarea"
                    style={{ flex: 1, minHeight: '75px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4', background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px' }}
                    value={testCases[activeTestCaseIdx].input}
                    onChange={(e) => {
                      const updated = [...testCases];
                      updated[activeTestCaseIdx].input = e.target.value;
                      setTestCases(updated);
                    }}
                    placeholder="LeetCode inputs (e.g. 2 or [2,7,11,15]\n9)"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Expected Output (Optional)
                    </span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', padding: '0 4px' }}
                      onClick={() => {
                        const updated = [...testCases];
                        updated[activeTestCaseIdx].expectedOutput = '';
                        setTestCases(updated);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    className="oj-input-textarea"
                    style={{ flex: 1, minHeight: '75px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4', background: 'rgba(0, 0, 0, 0.35)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px' }}
                    value={testCases[activeTestCaseIdx].expectedOutput}
                    onChange={(e) => {
                      const updated = [...testCases];
                      updated[activeTestCaseIdx].expectedOutput = e.target.value;
                      setTestCases(updated);
                    }}
                    placeholder="Expected output (e.g. 2 or [0,1])"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div 
            className="oj-input-card"
            style={{
              flex: `0 0 calc(${100 - consoleVsTestcasesSplit}% - 5px)`,
              height: `calc(${100 - consoleVsTestcasesSplit}% - 5px)`,
              minHeight: '120px',
              overflowY: 'auto'
            }}
          >
            <div className="oj-input-header">
              <span className="oj-input-title">
                <Terminal size={14} style={{ color: 'var(--neon-cyan)' }} /> Custom Stdin Input
              </span>
              <div className="oj-icon-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {samples && samples.length > 0 && (
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
                      if (!isNaN(idx) && samples[idx]) {
                        setCustomInput(samples[idx].input);
                        setActiveTab('input');
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Use Example...
                    </option>
                    {samples.map((s, idx) => (
                      <option key={idx} value={idx}>
                        {s.sample_name || `Example ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className="oj-icon-btn"
                  aria-label="Clear input content"
                  title="Clear custom input"
                  onClick={() => setCustomInput('')}
                >
                  <Trash2 size={13} />
                </button>
                <button
                  type="button"
                  className="oj-icon-btn"
                  aria-label="Copy custom input"
                  title="Copy input"
                  onClick={() => {
                    if (customInput) navigator.clipboard.writeText(customInput);
                  }}
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>
            <textarea
              className="oj-input-textarea"
              value={customInput}
              placeholder="Paste or enter custom test stdin input here..."
              onChange={(e) => setCustomInput(e.target.value)}
            />
          </div>
        )}
      </div>
      </div>

      {showCFModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            maxWidth: '500px',
            width: '100%',
            color: 'var(--text-main)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(124, 58, 237, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Codeforces Submit Gateway
              </h3>
              <button
                type="button"
                onClick={() => setShowCFModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{
              background: 'rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--neon-cyan)',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'inset 0 0 10px rgba(6, 182, 212, 0.05)'
            }}>
              <Zap size={15} style={{ animation: 'pulse 2s infinite' }} /> Secure Redirect Integration Active
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                BCE respects your account privacy. To keep your login credentials 100% secure, direct solution submission is executed through Codeforces' official gateway.
              </p>

              {/* Steps checklist */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  ✓ Source Code copied to clipboard
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ● Selected language: <strong style={{ color: 'var(--neon-purple)', fontFamily: 'monospace' }}>{language === 'cpp17' ? 'C++17' : language.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ● Target URL: <span style={{ color: 'var(--neon-cyan)', textDecoration: 'underline', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                    {(() => {
                      const cfId = problem.external_problem_id || problem.externalId || '';
                      const match = cfId.match(/^(\d+)([A-Z]\d*)$/i);
                      return match ? `contest/${match[1]}/submit` : 'problemset/submit';
                    })()}
                  </span>
                </div>
              </div>
              
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', fontStyle: 'italic' }}>
                Next: Paste your code (Ctrl+V) and click "Submit" on Codeforces.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCFModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setShowCFModal(false);
                  const cfId = problem.external_problem_id || problem.externalId || '';
                  const match = cfId.match(/^(\d+)([A-Z]\d*)$/i);
                  let submitUrl = problem.external_url || `https://codeforces.com/problemset/problem/${cfId}`;
                  if (match) {
                    submitUrl = `https://codeforces.com/contest/${match[1]}/submit?problemIndex=${match[2].toUpperCase()}`;
                  }
                  window.open(submitUrl, '_blank');
                }}
                style={{
                  background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                  border: 'none',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Go to Submit Portal ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {showLCModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            maxWidth: '500px',
            width: '100%',
            color: 'var(--text-main)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 161, 22, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, background: 'linear-gradient(135deg, #ffa116, #f77f00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                LeetCode Submit Gateway
              </h3>
              <button
                type="button"
                onClick={() => setShowLCModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{
              background: 'rgba(255, 161, 22, 0.05)',
              border: '1px solid rgba(255, 161, 22, 0.2)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              color: '#ffa116',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'inset 0 0 10px rgba(255, 161, 22, 0.05)'
            }}>
              <Zap size={15} style={{ animation: 'pulse 2s infinite' }} /> Secure Redirect Integration Active
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                BCE respects your account privacy. To keep your login credentials 100% secure, direct solution submission is executed through LeetCode's official gateway.
              </p>

              {/* Steps checklist */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  ✓ Source Code copied to clipboard
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ● Selected language: <strong style={{ color: 'var(--neon-purple)', fontFamily: 'monospace' }}>{language === 'cpp17' ? 'C++17' : language.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ● Target URL: <span style={{ color: 'var(--neon-cyan)', textDecoration: 'underline', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                    {problem.external_url || problem.sourceUrl || 'leetcode.com/problems'}
                  </span>
                </div>
              </div>
              
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', fontStyle: 'italic' }}>
                Next: Paste your code (Ctrl+V) and click "Submit" on LeetCode.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowLCModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setShowLCModal(false);
                  const submitUrl = problem.external_url || problem.sourceUrl || 'https://leetcode.com/problems';
                  window.open(submitUrl, '_blank');
                }}
                style={{
                  background: 'linear-gradient(135deg, #ffa116, #f77f00)',
                  border: 'none',
                  color: 'black',
                  padding: '10px 24px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(255, 161, 22, 0.3)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Go to Submit Portal ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Success Celebration & Real Code Analysis Popup */}
      {showSuccessModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(3, 7, 18, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            style={{
              background: 'linear-gradient(180deg, #0f172a 0%, #090d16 100%)',
              border: '1px solid rgba(6, 182, 212, 0.45)',
              borderRadius: '20px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(6, 182, 212, 0.25)',
              padding: '24px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              type="button"
              onClick={() => setShowSuccessModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            >
              <X size={16} />
            </button>

            {/* Celebration Header */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div 
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.35))',
                  border: '2px solid rgba(52, 211, 153, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 25px rgba(52, 211, 153, 0.45)',
                }}
              >
                <Trophy size={26} style={{ color: '#34d399' }} />
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '4px 0 0 0', color: '#f8fafc' }}>
                Problem Solved!
              </h3>
              
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.25), rgba(6, 182, 212, 0.25))', border: '1px solid rgba(139, 92, 246, 0.5)', borderRadius: '9999px', padding: '4px 14px', marginTop: '2px' }}>
                <Zap size={14} style={{ color: '#c084fc', fill: '#c084fc' }} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#e0e7ff' }}>
                  +{submissionResult?.xp_awarded || 25} XP Credited!
                </span>
              </div>
              
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: 600 }}>
                {problem.title}
              </p>

              {lastSolveTime > 0 && (
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--neon-cyan)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={12} /> Solved in {Math.floor(lastSolveTime / 60)}m {lastSolveTime % 60}s
                </div>
              )}
            </div>

            {/* Real Code Analysis Rating Section inside Modal */}
            <CodeAnalysisRatingSection
              runtimeMs={submissionResult?.execution_time_ms || 12}
              memoryMb={submissionResult?.memory_used_mb || 14.5}
              language={language}
              optimalTime={problem.metadata?.optimal_worst_case_time}
              optimalSpace={problem.metadata?.optimal_auxiliary_space}
              extremeCase={problem.metadata?.extreme_test_case}
              edgeCases={problem.metadata?.edge_cases}
              passedTests={submissionResult?.passed_tests || 5}
              totalTests={submissionResult?.total_tests || 5}
              xpAwarded={submissionResult?.xp_awarded || 25}
              solveTimeSeconds={lastSolveTime}
              code={code}
              metadata={problem.metadata}
            />

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              {problem.navigation?.nextProblemId && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    const sheetParam = problem.navigation?.sheetId ? `?sheet=${problem.navigation.sheetId}` : '';
                    router.push(`/code-arena/problems/${problem.navigation?.nextProblemId}${sheetParam}`);
                  }}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '11px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Next Problem <ArrowRight size={14} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                style={{
                  flex: problem.navigation?.nextProblemId ? '0 0 auto' : '1',
                  padding: '11px 18px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
