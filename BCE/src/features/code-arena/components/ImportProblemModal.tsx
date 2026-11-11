'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Loader2, Sparkles, AlertCircle, Trash2, ExternalLink, ArrowRight, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type Platform = 'CODEFORCES' | 'LEETCODE' | 'CODECHEF' | 'GFG';

interface ImportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportProblemModal({ isOpen, onClose }: ImportProblemModalProps) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>('CODEFORCES');
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localProblems, setLocalProblems] = useState<any[]>([]);

  // Load saved problems from device storage
  const reloadLocalProblems = () => {
    try {
      const raw = localStorage.getItem('sl_imported_problems');
      if (raw) {
        setLocalProblems(JSON.parse(raw));
      } else {
        setLocalProblems([]);
      }
    } catch {
      setLocalProblems([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadLocalProblems();
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Auto-detect platform from URL
  const handleInputChange = (val: string) => {
    setInputVal(val);
    setErrorMsg(null);
    const low = val.toLowerCase();
    if (low.includes('codeforces.com')) setPlatform('CODEFORCES');
    else if (low.includes('leetcode.com')) setPlatform('LEETCODE');
    else if (low.includes('codechef.com')) setPlatform('CODECHEF');
    else if (low.includes('geeksforgeeks.org')) setPlatform('GFG');
  };

  const getPlaceholder = () => {
    switch (platform) {
      case 'CODEFORCES':
        return 'e.g. 780B, 4A, or https://codeforces.com/problemset/problem/780/B';
      case 'LEETCODE':
        return 'e.g. two-sum, 1, or https://leetcode.com/problems/two-sum/';
      case 'CODECHEF':
        return 'e.g. FLOW001 or https://www.codechef.com/problems/FLOW001';
      case 'GFG':
        return 'e.g. reverse-an-array or problem URL';
      default:
        return 'Enter problem ID or URL...';
    }
  };

  const handleImport = async () => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a problem URL or ID');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/coding/problems/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: trimmed,
          platform,
          persist: false, // Save to device storage only, zero Supabase writes
        }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success || !payload.data?.problem) {
        const msg = payload.error?.message || payload.error || 'Failed to import problem from external platform.';
        setErrorMsg(msg);
        return;
      }

      const problem = payload.data.problem;
      const testCases = payload.data.testCases || [];

      // Attach testcases to problem object for offline local solver
      if (testCases.length > 0 && (!problem.samples || problem.samples.length === 0)) {
        problem.samples = testCases;
      }

      // 1. Save directly into localStorage (device storage)
      localStorage.setItem(`sl_problem_${problem.id}`, JSON.stringify(problem));

      // 2. Add or update in list of imported problems
      try {
        const rawList = localStorage.getItem('sl_imported_problems');
        const list = rawList ? JSON.parse(rawList) : [];
        const filtered = list.filter((p: any) => p.id !== problem.id && p.slug !== problem.slug);
        const updatedList = [
          {
            id: problem.id,
            title: problem.title,
            slug: problem.slug,
            difficulty: problem.difficulty,
            platform: problem.source_type || problem.external_platform || platform,
            tags: problem.tags || [],
            importedAt: new Date().toISOString(),
          },
          ...filtered,
        ];
        localStorage.setItem('sl_imported_problems', JSON.stringify(updatedList));
      } catch (err) {
        console.warn('Could not update sl_imported_problems:', err);
      }

      onClose();
      // 3. Open the problem render page immediately
      router.push(`/code-arena/problems/${problem.id}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while importing problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProblem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(`sl_problem_${id}`);
      const updated = localProblems.filter((p) => p.id !== id);
      localStorage.setItem('sl_imported_problems', JSON.stringify(updated));
      setLocalProblems(updated);
    } catch (err) {
      console.warn('Failed to delete local problem:', err);
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all imported problems from your device storage?')) {
      try {
        localProblems.forEach((p) => localStorage.removeItem(`sl_problem_${p.id}`));
        localStorage.removeItem('sl_imported_problems');
        setLocalProblems([]);
      } catch (err) {
        console.warn('Failed to clear local problems:', err);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Problem to Practice">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '16px 4px' }}>
        {/* Header Description */}
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Import any problem from Codeforces, LeetCode, CodeChef, or GeeksForGeeks to practice. Everything is saved directly to your device storage with zero cloud persistence.
        </p>

        {/* Platform Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['CODEFORCES', 'LEETCODE', 'CODECHEF', 'GFG'] as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPlatform(p);
                setErrorMsg(null);
              }}
              style={{
                flex: '1 1 auto',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease',
                border: platform === p ? '1px solid var(--neon-cyan, #06b6d4)' : '1px solid var(--glass-border)',
                background: platform === p ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: platform === p ? 'var(--neon-cyan, #06b6d4)' : 'var(--text-secondary)',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input & Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleImport();
              }}
              placeholder={getPlaceholder()}
              disabled={loading}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '10px 14px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, var(--neon-cyan, #06b6d4), var(--neon-purple, #8b5cf6))',
                color: '#fff',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Import &amp; Solve &rarr;</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Saved on Device Section */}
        {localProblems.length > 0 && (
          <div style={{ marginTop: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Saved on this Device ({localProblems.length})
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={12} /> Clear All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
              {localProblems.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onClose();
                    router.push(`/code-arena/problems/${p.id}`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--neon-cyan, #06b6d4)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--glass-border)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(6, 182, 212, 0.15)',
                        color: 'var(--neon-cyan, #06b6d4)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {p.platform || 'LOCAL'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProblem(p.id, e)}
                      title="Delete from device"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <Trash2 size={13} />
                    </button>
                    <span style={{ color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 600, gap: '2px' }}>
                      Solve <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
