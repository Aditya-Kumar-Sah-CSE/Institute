'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Compass,
  Copy,
  Flame,
  Layers,
  ListChecks,
  Search,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import type {
  RoadmapLevel,
  RoadmapProblem,
  RoadmapProblemProgress,
  RoadmapTheoryModule,
} from '@/features/code-arena/data/roadmapSheetTypes';

export function RoadmapTheoryModulesView({
  level,
  modules,
  onFilterByTopic,
}: {
  level: RoadmapLevel;
  modules: RoadmapTheoryModule[];
  onFilterByTopic: (topicName: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [copiedTplIdx, setCopiedTplIdx] = useState<number | null>(null);

  const batches = useMemo(() => {
    const set = new Set<string>();
    modules.forEach((m) => {
      if (m.batch) set.add(m.batch);
    });
    return Array.from(set);
  }, [modules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules.filter((m) => {
      if (selectedBatch !== 'ALL' && m.batch !== selectedBatch) return false;
      if (!q) return true;
      return (
        m.topic.toLowerCase().includes(q) ||
        m.concept.toLowerCase().includes(q) ||
        (m.template_cpp || '').toLowerCase().includes(q) ||
        (m.key_points || []).some((k) => k.toLowerCase().includes(q)) ||
        (m.pitfalls || []).some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [modules, search, selectedBatch]);

  const mapModuleToProblemTopic = (moduleTopic: string): string => {
    const lower = moduleTopic.toLowerCase();
    if (lower.includes('sliding window') || lower.includes('frequency window') || lower.includes('monotonic deque') || lower.includes('atmost')) return 'Sliding Window';
    if (lower.includes('kadane')) return "Kadane's Algorithm";
    if (lower.includes('prefix remainder') || lower.includes('prefix sum + hashmap')) return 'Prefix Sum + HashMap';
    if (lower.includes('prefix sum')) return 'Prefix Sum';
    if (lower.includes('difference array')) return 'Difference Array';
    if (lower.includes('two pointers') && level.level_number === 2) return 'Two Pointers';
    if (lower.includes('rotated sorted')) return 'Binary Search (Rotated)';
    if (lower.includes('matrix & peak')) return 'Binary Search (Matrix)';
    if (lower.includes('binary search on answer')) return 'Binary Search on Answer';
    if (lower.includes('binary search on value')) return 'Binary Search on Value Range';
    if (lower.includes('binary search') && level.level_number === 2) return 'Binary Search';
    if (lower.includes('comparator')) return 'Sorting (Custom Comparator)';
    if (lower.includes('quickselect')) return 'Sorting (Quickselect)';
    if (lower.includes('counting & bucket')) return 'Sorting (Counting';
    if (lower.includes('greedy')) return 'Greedy';
    if (lower.includes('matrix')) return 'Matrix';
    if (lower.includes('bit')) return 'Bit Manipulation';
    if (lower.includes('binary search')) return 'Searching';
    if (lower.includes('sort') || lower.includes('dutch national')) return 'Sorting';
    if (lower.includes('hash')) return 'Hashing';
    if (lower.includes('string') || (lower.includes('palindrome') && lower.includes('prefix'))) return 'Strings';
    if (lower.includes('math') || lower.includes('divisor') || lower.includes('gcd') || lower.includes('number')) return 'Math';
    if (lower.includes('recursion')) return 'Recursion';
    if (lower.includes('array') || lower.includes('merging') || lower.includes('two pointers') || lower.includes('read/write')) return 'Arrays';
    return 'ALL';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="rm-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
              Level {level.level_number} Concept Theory Modules ({modules.length})
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary, #475569)' }}>
              Core Hinglish intuition, key patterns, and interview pitfalls before jumping into code.
            </p>
          </div>
          <div className="rm-filter-input-wrap" style={{ minWidth: '240px', flex: '0 1 320px' }}>
            <Search size={15} style={{ position: 'absolute', left: '11px', color: 'var(--text-muted, #64748b)' }} />
            <input
              type="text"
              className="rm-filter-input"
              placeholder="Search concepts, pitfalls, STL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {batches.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={() => setSelectedBatch('ALL')}
              className={selectedBatch === 'ALL' ? 'rm-btn-primary' : 'rm-btn-outline'}
              style={{ padding: '5px 12px', fontSize: '12px' }}
            >
              All Batches ({modules.length})
            </button>
            {batches.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBatch(b)}
                className={selectedBatch === b ? 'rm-btn-primary' : 'rm-btn-outline'}
                style={{ padding: '5px 12px', fontSize: '12px' }}
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rm-theory-grid">
        {filtered.map((mod, idx) => {
          const problemTopic = mapModuleToProblemTopic(mod.topic);
          return (
            <div key={`${mod.topic}-${idx}`} className="rm-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                    {mod.batch || `Module ${idx + 1}`}
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    {mod.topic}
                  </h3>
                </div>
                {problemTopic !== 'ALL' && (
                  <button
                    type="button"
                    className="rm-btn-outline"
                    style={{ padding: '4px 10px', fontSize: '11.5px', flexShrink: 0 }}
                    onClick={() => onFilterByTopic(problemTopic)}
                  >
                    Practice {problemTopic} <ArrowRight size={12} />
                  </button>
                )}
              </div>

              <div className="rm-info-callout hinglish">
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                  Concept Intuition
                </span>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: 'var(--text-primary, #0f172a)' }}>
                  {mod.concept}
                </p>
              </div>

              {Array.isArray(mod.key_points) && mod.key_points.length > 0 && (
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 size={14} /> KEY TAKEAWAYS
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', color: 'var(--text-secondary, #334155)', lineHeight: 1.5 }}>
                    {mod.key_points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {mod.template_cpp && (
                <div style={{ borderRadius: '10px', border: '1px solid rgba(14, 165, 233, 0.25)', background: '#0b1220', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: 'rgba(14, 165, 233, 0.12)', borderBottom: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase' }}>
                      <Code2 size={13} /> C++17 Pattern Template
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(mod.template_cpp || '');
                        setCopiedTplIdx(idx);
                        setTimeout(() => setCopiedTplIdx(null), 1500);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.1)', color: '#7dd3fc', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {copiedTplIdx === idx ? <Check size={11} /> : <Copy size={11} />}
                      {copiedTplIdx === idx ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre style={{ margin: 0, padding: '10px 12px', overflowX: 'auto', fontSize: '12px', lineHeight: 1.5, color: '#e2e8f0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                    <code>{mod.template_cpp}</code>
                  </pre>
                </div>
              )}

              {Array.isArray(mod.pitfalls) && mod.pitfalls.length > 0 && (
                <div className="rm-info-callout edge">
                  <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertTriangle size={14} /> COMMON PITFALLS
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', color: 'var(--text-primary, #0f172a)', lineHeight: 1.5 }}>
                    {mod.pitfalls.map((pf, i) => (
                      <li key={i}>{pf}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RoadmapRevisionView({
  level,
  problemsByCode,
  progressMap,
  onSelectProblem,
  nextLevelTargetCount,
}: {
  level: RoadmapLevel;
  problemsByCode: Record<string, RoadmapProblem>;
  progressMap: Record<string, RoadmapProblemProgress>;
  onSelectProblem: (problemCode: string) => void;
  nextLevelTargetCount?: number;
}) {
  const rev = level.revision_data || {};
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const nextLevelNum = level.level_number + 1;
  const selfTestBlock =
    rev[`self_test_before_level_${nextLevelNum}`] ||
    rev.self_test_before_level_2 ||
    rev.self_test_before_level_3 ||
    null;
  const selfTestIds: string[] = selfTestBlock?.problem_ids || [];
  const selfTestSolvedCount = selfTestIds.filter((id) => progressMap[id]?.is_solved).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Header Banner */}
      <div className="rm-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="rm-badge-primary">
              <Sparkles size={12} /> Level {level.level_number} Mastery Revision
            </span>
            <h2 style={{ margin: '10px 0 4px', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
              {rev.title || `Level ${level.level_number} Revision & Interview Playbook`}
            </h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary, #475569)' }}>
              Click any <code style={{ fontWeight: 700 }}>L{level.level_number}-xxx</code> chip below to jump straight into its C++ workbench and test cases.
            </p>
          </div>
          {selfTestIds.length > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                Self-Test Readiness
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                {selfTestSolvedCount} / {selfTestIds.length} Solved
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Self-Test Gate */}
      {selfTestIds.length > 0 && (
        <div className="rm-panel">
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={18} color="#f59e0b" /> Self-Test Before Level {nextLevelNum} ({selfTestIds.length} Must-Master Problems)
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: 'var(--text-secondary, #475569)' }}>
            {selfTestBlock?.instruction}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {selfTestIds.map((id) => {
              const prob = problemsByCode[id];
              const isSolved = Boolean(progressMap[id]?.is_solved);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectProblem(id)}
                  className={`rm-problem-list-item ${isSolved ? 'active' : ''}`}
                  style={{ borderColor: isSolved ? 'rgba(16, 185, 129, 0.45)' : 'var(--border-default, #e2e8f0)' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: isSolved ? '#059669' : '#0284c7' }}>
                      {id} {prob ? `• ${prob.topic}` : ''}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                      {prob?.title || id}
                    </div>
                  </div>
                  {isSolved ? <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} /> : <ArrowRight size={15} style={{ flexShrink: 0, opacity: 0.6 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision Guide (when present, e.g. Level 2 Pattern Selection) */}
      {Array.isArray(rev.decision_guide) && rev.decision_guide.length > 0 && (
        <div className="rm-panel">
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} /> Pattern Decision Guide (Problem → Pattern)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
            {rev.decision_guide.map((rule: string, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: 'rgba(2, 132, 199, 0.06)',
                  border: '1px solid rgba(2, 132, 199, 0.18)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary, #0f172a)',
                  lineHeight: 1.45,
                }}
              >
                {rule}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Cheat Sheet */}
      {Array.isArray(rev.pattern_cheat_sheet) && rev.pattern_cheat_sheet.length > 0 && (
        <div className="rm-panel">
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#0284c7" /> Pattern Cheat Sheet (When To Use What)
          </h3>
          <div className="rm-revision-table-wrap">
            <table className="rm-revision-table">
              <thead>
                <tr>
                  <th>Pattern</th>
                  <th>When To Use</th>
                  <th>Core Idea</th>
                  <th>Practice Problems</th>
                </tr>
              </thead>
              <tbody>
                {rev.pattern_cheat_sheet.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary, #0f172a)', minWidth: '160px' }}>{row.pattern}</td>
                    <td style={{ color: 'var(--text-secondary, #475569)', minWidth: '180px' }}>{row.when_to_use}</td>
                    <td style={{ color: 'var(--text-primary, #0f172a)', minWidth: '200px' }}>{row.idea}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(row.practice_ids || []).map((pid) => {
                          const solved = Boolean(progressMap[pid]?.is_solved);
                          return (
                            <button
                              key={pid}
                              type="button"
                              onClick={() => onSelectProblem(pid)}
                              className={`rm-id-chip-btn ${solved ? 'solved' : ''}`}
                              title={problemsByCode[pid]?.title || pid}
                            >
                              {solved && <Check size={11} />}
                              {pid}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complexity Cheat Sheet + 8-Step Interview Checklist */}
      <div className="rm-compare-grid">
        {Array.isArray(rev.complexity_cheat_sheet) && rev.complexity_cheat_sheet.length > 0 && (
          <div className="rm-panel">
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#8b5cf6" /> Complexity Cheat Sheet
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rev.complexity_cheat_sheet.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: 'rgba(139, 92, 246, 0.06)',
                    border: '1px solid rgba(139, 92, 246, 0.16)',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{c.item}</span>
                  <code className="rm-mono-pill" style={{ fontWeight: 800, color: '#7c3aed' }}>{c.complexity}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(rev.interview_checklist) && rev.interview_checklist.length > 0 && (
          <div className="rm-panel">
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ListChecks size={18} color="#10b981" /> 8-Step Interview Playbook
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rev.interview_checklist.map((step, idx) => {
                const checked = Boolean(checkedSteps[idx]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: `1px solid ${checked ? 'rgba(16,185,129,0.4)' : 'var(--border-default, #e2e8f0)'}`,
                      background: checked ? 'rgba(16,185,129,0.08)' : 'transparent',
                      color: 'var(--text-primary, #0f172a)',
                      fontSize: '13px',
                      fontWeight: 600,
                      lineHeight: 1.45,
                    }}
                  >
                    <CheckCircle2 size={16} color={checked ? '#10b981' : '#94a3b8'} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.78 : 1 }}>{step}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Common Mistakes + C++17 Interview Tips */}
      <div className="rm-compare-grid">
        {Array.isArray(rev.common_mistakes) && rev.common_mistakes.length > 0 && (
          <div className="rm-panel">
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} /> Common Mistakes To Avoid
            </h3>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px', color: 'var(--text-primary, #0f172a)', lineHeight: 1.5 }}>
              {rev.common_mistakes.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(rev.cpp_tips) && rev.cpp_tips.length > 0 && (
          <div className="rm-panel">
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} /> C++17 STL & Interview Tips
            </h3>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px', color: 'var(--text-primary, #0f172a)', lineHeight: 1.5 }}>
              {rev.cpp_tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next Level Preview */}
      {rev.next_level_preview && (
        <div
          className="rm-panel"
          style={{
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(139, 92, 246, 0.1))',
            borderColor: 'rgba(99, 102, 241, 0.35)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="rm-badge-primary">
                <Code2 size={12} /> Coming Up Next — Level {rev.next_level_preview.level}
              </span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                {rev.next_level_preview.title}
                {nextLevelTargetCount ? ` (~${nextLevelTargetCount} Problems)` : ''}
              </h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary, #475569)', maxWidth: '760px' }}>
                {rev.next_level_preview.why}
              </p>
            </div>
            <BookOpen size={28} color="#6366f1" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {(rev.next_level_preview.topics || []).map((t, idx) => (
              <span key={idx} className="rm-company-chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

