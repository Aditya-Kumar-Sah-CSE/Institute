'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  CheckCircle2,
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Code2,
  Zap,
  BookOpen,
  Loader2,
  Copy,
  AlertTriangle,
} from 'lucide-react';

type ImportedProblem = {
  id: string;
  title: string;
  platform: string;
  difficulty: string;
  tags: string[];
};

type ImportResult = {
  input: string;
  success: boolean;
  title?: string;
  error?: string;
};

export default function CreateSheetWizard({
  initialSheet = null,
  onClose,
  onSuccess,
}: {
  initialSheet?: any | null;
  onClose: () => void;
  onSuccess: (sheet: any) => void;
}) {
  const isEditing = Boolean(initialSheet?.id);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basic Info
  const [title, setTitle] = useState(initialSheet?.title || 'Recursion & Backtracking');
  const [description, setDescription] = useState(initialSheet?.description || 'Curated problem sheet for fundamental DSA patterns.');

  // Step 2: Add Problems (Bulk Importer)
  const [addedProblems, setAddedProblems] = useState<ImportedProblem[]>([]);
  const [problemSource, setProblemSource] = useState<'CODEFORCES' | 'LEETCODE' | 'INTERNAL'>('CODEFORCES');

  // Bulk input details
  const [bulkInput, setBulkInput] = useState('');
  const [importPlatform, setImportPlatform] = useState<'CODEFORCES' | 'LEETCODE'>('CODEFORCES');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

  // Internal problems list
  const [internalProblems, setInternalProblems] = useState<any[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [selectedInternalId, setSelectedInternalId] = useState<string>('');

  const [creating, setCreating] = useState(false);
  const [createdSheet, setCreatedSheet] = useState<any | null>(initialSheet);

  // Populate initial problems if editing
  useEffect(() => {
    if (initialSheet?.problems) {
      setAddedProblems(initialSheet.problems);
    }
  }, [initialSheet]);

  // Fetch internal problems
  useEffect(() => {
    if (problemSource === 'INTERNAL' && internalProblems.length === 0) {
      setLoadingInternal(true);
      fetch('/api/coding/problems/import?mode=list')
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            setInternalProblems(json.data);
            if (json.data.length > 0) setSelectedInternalId(json.data[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingInternal(false));
    }
  }, [problemSource, internalProblems.length]);

  const handleBulkImport = async () => {
    const rawLines = bulkInput.split(/[\n,;]+/).map(line => line.trim()).filter(Boolean);
    if (rawLines.length === 0) return;

    setImporting(true);
    setImportResults([]);

    const results: ImportResult[] = [];
    const newProblems: ImportedProblem[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const inputLine = rawLines[i];
      try {
        const res = await fetch('/api/coding/problems/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: inputLine,
            platform: importPlatform,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          const p = json.data.problem;
          newProblems.push({
            id: p.id,
            title: p.title,
            platform: p.source_type || importPlatform,
            difficulty: p.difficulty,
            tags: p.tags || [],
          });
          results.push({ input: inputLine, success: true, title: p.title });
        } else {
          results.push({ input: inputLine, success: false, error: json.error?.message || 'Failed to parse' });
        }
      } catch (err: any) {
        results.push({ input: inputLine, success: false, error: err.message || 'Network error' });
      }
      setImportResults([...results]);
    }

    setAddedProblems((prev) => {
      const existingIds = new Set(prev.map(p => p.id));
      const filtered = newProblems.filter(p => !existingIds.has(p.id));
      return [...prev, ...filtered];
    });

    setImporting(false);
  };

  const handleAddSelectedInternal = () => {
    if (!selectedInternalId) return;
    const item = internalProblems.find((p) => p.id === selectedInternalId);
    if (!item) return;

    if (addedProblems.some((p) => p.id === item.id)) {
      alert('This problem is already in the sheet.');
      return;
    }

    const formatted: ImportedProblem = {
      id: item.id,
      title: item.title,
      platform: item.source_type || 'INTERNAL',
      difficulty: item.difficulty || 'EASY',
      tags: item.tags || [],
    };

    setAddedProblems([...addedProblems, formatted]);
  };

  const handleRemoveProblem = (idx: number) => {
    setAddedProblems(addedProblems.filter((_, i) => i !== idx));
  };

  const handleMoveProblem = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= addedProblems.length) return;
    const copy = [...addedProblems];
    const item = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = item;
    setAddedProblems(copy);
  };

  const handleSaveSheet = async () => {
    if (!title.trim()) {
      alert('Please enter a sheet name.');
      return;
    }
    if (addedProblems.length === 0) {
      alert('Please add at least one problem to the sheet.');
      return;
    }

    setCreating(true);
    try {
      const endpoint = isEditing ? `/api/coding/sheets/${initialSheet.id}` : '/api/coding/sheets';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          problems: addedProblems.map((p) => p.id),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save coding sheet.');
      }

      setCreatedSheet(json.data);
      setStep(3);
      onSuccess(json.data);
    } catch (err: any) {
      alert(err.message || 'Coding sheet save failed.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Card
        variant="glass"
        style={{
          maxWidth: '680px',
          width: '100%',
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--glass-border)',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0 }} className="text-gradient">
              {step === 3 ? '🎉 Coding Sheet Ready!' : isEditing ? 'Edit Coding Sheet' : 'Create Coding Sheet'}
            </h2>
            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
              Curate and publish practice problem sheets for yourself or students
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Sheet Name</label>
                <input
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none',
                  }}
                  value={title}
                  placeholder="e.g. Recursion & Backtracking"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Description</label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none',
                    minHeight: '100px',
                    resize: 'vertical',
                  }}
                  value={description}
                  placeholder="e.g. Learn fundamental recursion concepts and build backtracking logic."
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                <Button onClick={() => setStep(2)}>Next: Add Problems →</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {/* Problem Add Source Tabs */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '8px' }}>
                  + Add Problems
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    size="sm"
                    variant={problemSource === 'CODEFORCES' ? 'primary' : 'secondary'}
                    onClick={() => { setProblemSource('CODEFORCES'); setImportPlatform('CODEFORCES'); }}
                  >
                    <Code2 size={14} /> Bulk Codeforces Import
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={problemSource === 'LEETCODE' ? 'primary' : 'secondary'}
                    onClick={() => { setProblemSource('LEETCODE'); setImportPlatform('LEETCODE'); }}
                  >
                    <Zap size={14} /> Bulk LeetCode Import
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={problemSource === 'INTERNAL' ? 'primary' : 'secondary'}
                    onClick={() => setProblemSource('INTERNAL')}
                  >
                    <BookOpen size={14} /> Internal Problems
                  </Button>
                </div>
              </div>

              {/* Bulk Importer Panel */}
              {(problemSource === 'CODEFORCES' || problemSource === 'LEETCODE') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                    ⚡ Bulk Paste Importer ({importPlatform === 'CODEFORCES' ? 'Codeforces' : 'LeetCode'})
                  </h4>
                  <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>
                    Paste multiple problem IDs or full URLs below. Separate them by newlines, commas, or semicolons.
                    We will automatically import them in one batch.
                  </p>
                  <textarea
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-main)',
                      fontSize: 'var(--text-sm)',
                      outline: 'none',
                      minHeight: '120px',
                      fontFamily: 'monospace',
                    }}
                    placeholder={
                      importPlatform === 'CODEFORCES'
                        ? 'e.g.\n4A\n158A\n1985B\nhttps://codeforces.com/problemset/problem/158/B'
                        : 'e.g.\ntwo-sum\nreverse-integer\n3sum\nhttps://leetcode.com/problems/lru-cache/'
                    }
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    disabled={importing}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Detected {bulkInput.split(/[\n,;]+/).map(line => line.trim()).filter(Boolean).length} entries
                    </div>
                    <Button type="button" size="sm" onClick={handleBulkImport} isLoading={importing}>
                      {importing ? 'Importing Batch...' : 'Import All Problems'}
                    </Button>
                  </div>

                  {/* Batch results list */}
                  {importResults.length > 0 && (
                    <div style={{ maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '6px' }}>Import Log:</div>
                      {importResults.map((res, index) => (
                        <div key={index} style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{res.input}</span>
                          {res.success ? (
                            <span style={{ color: '#4ade80' }}>✓ {res.title}</span>
                          ) : (
                            <span style={{ color: '#f87171' }} title={res.error}>✗ Failed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Internal Problem Selector */}
              {problemSource === 'INTERNAL' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Select Existing Internal Problem</label>
                  {loadingInternal ? (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}><Loader2 className="animate-spin" size={14} /> Loading...</div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-main)',
                          fontSize: 'var(--text-sm)',
                          outline: 'none',
                        }}
                        value={selectedInternalId}
                        onChange={(e) => setSelectedInternalId(e.target.value)}
                      >
                        {internalProblems.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.difficulty})
                          </option>
                        ))}
                      </select>
                      <Button type="button" size="sm" onClick={handleAddSelectedInternal} disabled={!selectedInternalId}>
                        Add Problem
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Added Problems List */}
              <div style={{ marginTop: 'var(--space-xs)' }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
                  Selected Problems ({addedProblems.length})
                </h4>

                {addedProblems.length === 0 ? (
                  <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic' }}>
                    No problems added yet. Paste values in the box above or select an internal problem.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {addedProblems.map((p, idx) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--glass-border)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{idx + 1}.</span>
                          <div>
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{p.title}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {p.platform} • {p.difficulty}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleMoveProblem(idx, -1)}
                            disabled={idx === 0}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveProblem(idx, 1)}
                            disabled={idx === addedProblems.length - 1}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveProblem(idx)}
                            style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-md)', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <Button variant="secondary" onClick={() => setStep(1)}>
                  ← Back to Info
                </Button>
                <Button onClick={handleSaveSheet} isLoading={creating} disabled={addedProblems.length === 0}>
                  {creating ? 'Saving...' : isEditing ? 'Update Coding Sheet' : 'Save Coding Sheet'}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '2px solid #22c55e',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#22c55e',
                  marginBottom: '8px',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 6px 0' }}>
                  Sheet "{createdSheet?.title}" Saved!
                </h3>
                <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', maxWidth: '360px', margin: 0 }}>
                  The coding sheet has been published successfully and is now active for practice.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: '8px', width: '100%', justifyContent: 'center' }}>
                <Button onClick={onClose}>Close Wizard</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
