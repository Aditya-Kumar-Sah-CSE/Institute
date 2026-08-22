'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import {
  CheckCircle2,
  Copy,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Code2,
  Zap,
  BookOpen,
  FilePlus,
  Loader2,
} from 'lucide-react';
import ProblemForm from './ProblemForm';
import type { PlatformName } from '@/lib/coding-platforms/types';

type ImportedProblem = {
  id: string;
  title: string;
  platform: string;
  difficulty: string;
  rating?: number | null;
  tags: string[];
  points: number;
  sampleCount: number;
  hasStatement: boolean;
  hasConstraints: boolean;
};

export default function CreateBattleWizard({
  isInstructor,
  batches = [],
  initialBattle = null,
  onClose,
  onSuccess,
}: {
  isInstructor: boolean;
  batches?: { id: string; name: string }[];
  initialBattle?: any | null;
  onClose: () => void;
  onSuccess: (battle: any) => void;
}) {
  const isEditing = Boolean(initialBattle?.id);
  // Helper to format ISO to datetime-local value (YYYY-MM-DDTHH:MM)
  const formatDateTimeLocal = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basic Info
  const [title, setTitle] = useState(initialBattle?.title || 'DSA Battle #01');
  const [durationMinutes, setDurationMinutes] = useState<number>(initialBattle?.duration_minutes || 30);
  const [visibility, setVisibility] = useState<'CODE' | 'BATCH' | 'PRIVATE'>(initialBattle?.visibility || 'CODE');
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBattle?.batch_id || batches[0]?.id || '');
  const [maxParticipants, setMaxParticipants] = useState<number>(initialBattle?.max_participants || 25);
  const [teamMode, setTeamMode] = useState<boolean>(initialBattle?.team_mode || false);
  const [minTeamSize, setMinTeamSize] = useState<number>(initialBattle?.min_team_size || 1);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(initialBattle?.max_team_size || 1);
  const [isScheduled, setIsScheduled] = useState<boolean>(initialBattle?.status === 'SCHEDULED' || !!initialBattle?.start_time);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>(formatDateTimeLocal(initialBattle?.start_time));
  const [organizerName, setOrganizerName] = useState<string>(initialBattle?.organizer_name || '');
  const [organizerLogo, setOrganizerLogo] = useState<string>(initialBattle?.organizer_logo || '');

  // File upload handler for organizer logo from computer system
  const handleUploadOrganizerLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      alert('Only PNG, JPG, or SVG image files are allowed.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setOrganizerLogo(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Step 2: Add Problems
  const [problemSource, setProblemSource] = useState<'CODEFORCES' | 'LEETCODE' | 'INTERNAL' | 'CREATE_NEW'>('CODEFORCES');
  const [platform, setPlatform] = useState<PlatformName>('CODEFORCES');
  const [problemInput, setProblemInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [previewProblem, setPreviewProblem] = useState<ImportedProblem | null>(null);
  const [previewRawData, setPreviewRawData] = useState<any | null>(null);

  // Internal problems state
  const [internalProblems, setInternalProblems] = useState<any[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [selectedInternalId, setSelectedInternalId] = useState<string>('');

  // Nested Create Internal Problem Modal
  const [showNestedCreateModal, setShowNestedCreateModal] = useState(false);

  const [addedProblems, setAddedProblems] = useState<ImportedProblem[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdBattle, setCreatedBattle] = useState<any | null>(initialBattle);

  // Populate initial battle problems if editing
  useEffect(() => {
    if (initialBattle?.coding_battle_problems) {
      const formatted = initialBattle.coding_battle_problems.map((bp: any) => {
        const p = bp.coding_problems || {};
        return {
          id: p.id || bp.problem_id,
          title: p.title || 'Coding Problem',
          platform: p.source_type || 'INTERNAL',
          difficulty: p.difficulty || 'MEDIUM',
          tags: p.tags || [],
          points: bp.points || 100,
          sampleCount: 1,
          hasStatement: true,
          hasConstraints: true,
        };
      });
      setAddedProblems(formatted);
    }
  }, [initialBattle]);

  // Fetch internal BCE problems when tab changes
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

  // Handle Fetch External Problem
  const handleFetchProblem = async () => {
    if (!problemInput.trim()) return;
    setFetching(true);
    setFetchError(null);
    setPreviewProblem(null);
    setPreviewRawData(null);

    try {
      const res = await fetch('/api/coding/problems/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: problemInput.trim(),
          platform: problemSource === 'LEETCODE' ? 'LEETCODE' : 'CODEFORCES',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Could not fetch this problem.');
      }

      const p = json.data.problem;
      const testCases = json.data.testCases || [];

      const parsed: ImportedProblem = {
        id: p.id,
        title: p.title,
        platform: p.source_type || platform,
        difficulty: p.difficulty,
        rating: p.external_platform === 'CODEFORCES' ? 800 : null,
        tags: p.tags || [],
        points: 100,
        sampleCount: testCases.length,
        hasStatement: Boolean(p.description),
        hasConstraints: Boolean(p.constraints),
      };

      setPreviewProblem(parsed);
      setPreviewRawData(p);
    } catch (err: any) {
      setFetchError(err.message || 'Could not fetch this problem. Check problem ID or URL.');
    } finally {
      setFetching(false);
    }
  };

  const handleAddPreviewToBattle = () => {
    if (!previewProblem) return;
    if (addedProblems.some((item) => item.id === previewProblem.id)) {
      alert('This problem is already added to the battle.');
      return;
    }
    setAddedProblems([...addedProblems, previewProblem]);
    setPreviewProblem(null);
    setPreviewRawData(null);
    setProblemInput('');
  };

  const handleAddSelectedInternal = () => {
    if (!selectedInternalId) return;
    const item = internalProblems.find((p) => p.id === selectedInternalId);
    if (!item) return;

    if (addedProblems.some((p) => p.id === item.id)) {
      alert('This problem is already in the battle.');
      return;
    }

    const formatted: ImportedProblem = {
      id: item.id,
      title: item.title,
      platform: item.source_type || 'INTERNAL',
      difficulty: item.difficulty || 'EASY',
      tags: item.tags || [],
      points: 100,
      sampleCount: 1,
      hasStatement: true,
      hasConstraints: true,
    };

    setAddedProblems([...addedProblems, formatted]);
  };

  // Called when nested ProblemForm finishes creating a problem
  const handleNestedProblemCreated = (newProblem: any) => {
    if (!newProblem?.id) return;
    const formatted: ImportedProblem = {
      id: newProblem.id,
      title: newProblem.title,
      platform: newProblem.source_type || 'INTERNAL',
      difficulty: newProblem.difficulty || 'EASY',
      tags: newProblem.tags || [],
      points: 100,
      sampleCount: 1,
      hasStatement: true,
      hasConstraints: true,
    };

    setAddedProblems((prev) => [...prev, formatted]);
    setShowNestedCreateModal(false);
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

  const handlePointsChange = (idx: number, pts: number) => {
    const copy = [...addedProblems];
    copy[idx].points = pts;
    setAddedProblems(copy);
  };

  // Submit Battle Creation or Update
  const handleSaveBattle = async () => {
    if (!title.trim()) {
      alert('Please enter a battle name.');
      return;
    }
    if (addedProblems.length === 0) {
      alert('Please add at least one problem to the battle.');
      return;
    }

    setCreating(true);
    try {
      const endpoint = isEditing ? `/api/coding/battles/${initialBattle.id}` : '/api/coding/battles';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          durationMinutes,
          batchId: isInstructor && visibility === 'BATCH' ? selectedBatchId : null,
          visibility,
          problems: addedProblems.map((p) => ({ id: p.id, points: p.points })),
          maxParticipants,
          teamMode,
          minTeamSize,
          maxTeamSize,
          scheduledStartTime: isScheduled ? scheduledStartTime : null,
          organizerName: organizerName.trim() || null,
          organizerLogo: organizerLogo.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save battle.');
      }

      setCreatedBattle(json.data);
      setStep(3);
      onSuccess(json.data);
    } catch (err: any) {
      alert(err.message || 'Battle save failed.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div
        className="modal-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          padding: '16px',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Card
          variant="glass"
          style={{
            maxWidth: '640px',
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
                {step === 3 ? '🎉 Battle Ready!' : isEditing ? 'Edit Coding Battle' : 'Create Coding Battle'}
              </h2>
              <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                {isInstructor ? 'Faculty Battle Setup' : 'Student Battle Setup'}
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

          {/* Body Container (Scrollable) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Battle Name</label>
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
                    placeholder="e.g. DSA Battle #01"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>
                    Organizer Name
                  </label>
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
                    value={organizerName}
                    placeholder="e.g. Code Arena League / Prof. Sharma (Optional)"
                    onChange={(e) => setOrganizerName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>
                    Organizer Logo (Image / SVG URL)
                  </label>
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
                    value={organizerLogo}
                    placeholder="e.g. https://example.com/logo.png or SVG link (Optional)"
                    onChange={(e) => setOrganizerLogo(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Duration</label>
                  <select
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
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>
                    Participants / Access
                  </label>
                  {isInstructor ? (
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <Button
                        type="button"
                        variant={visibility === 'BATCH' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setVisibility('BATCH')}
                      >
                        My Batch
                      </Button>
                      <Button
                        type="button"
                        variant={visibility === 'CODE' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setVisibility('CODE')}
                      >
                        Anyone with Battle Code
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      <Button
                        type="button"
                        variant={visibility === 'CODE' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setVisibility('CODE')}
                      >
                        Anyone with Battle Code
                      </Button>
                      <Button
                        type="button"
                        variant={visibility === 'PRIVATE' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setVisibility('PRIVATE')}
                      >
                        Private (Invite Only)
                      </Button>
                    </div>
                  )}
                </div>

                {isInstructor && visibility === 'BATCH' && batches.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Select Batch</label>
                    <select
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
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Max Participants Limit</label>
                  <input
                    type="number"
                    min={1}
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
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    id="team-mode-checkbox"
                    checked={teamMode}
                    onChange={(e) => setTeamMode(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--neon-cyan)', cursor: 'pointer' }}
                  />
                  <label htmlFor="team-mode-checkbox" style={{ fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                    Enable Team Play Mode (Students join as teams)
                  </label>
                </div>

                {teamMode && (
                  <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Min Team Members</label>
                      <input
                        type="number"
                        min={1}
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
                        value={minTeamSize}
                        onChange={(e) => setMinTeamSize(Number(e.target.value))}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Max Team Members</label>
                      <input
                        type="number"
                        min={minTeamSize}
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
                        value={maxTeamSize}
                        onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}

                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    id="schedule-battle-checkbox"
                    checked={isScheduled}
                    onChange={(e) => {
                      setIsScheduled(e.target.checked);
                      if (!e.target.checked) setScheduledStartTime('');
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--neon-cyan)', cursor: 'pointer' }}
                  />
                  <label htmlFor="schedule-battle-checkbox" style={{ fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                    Schedule Battle for Later Date/Time (Calendar Picker)
                  </label>
                </div>

                {isScheduled && (
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Upcoming Date & Start Time</label>
                    <input
                      type="datetime-local"
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
                      value={scheduledStartTime}
                      onChange={(e) => setScheduledStartTime(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Institution & Certificate Branding */}
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 'var(--space-md)', marginTop: '8px' }}>
                  <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', color: 'var(--neon-cyan)' }}>
                    🏢 Certificate & Institution Branding (Optional)
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>Organizer / Institution Name</label>
                      <input
                        type="text"
                        placeholder="e.g. BCE Bhagalpur / Code Arena"
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
                        value={organizerName}
                        onChange={(e) => setOrganizerName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>
                        Organizer Logo (Upload from Computer System - PNG, JPG, SVG)
                      </label>
                      
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {organizerLogo && (
                          <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', background: '#040711', border: '1px solid var(--glass-border)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={organizerLogo} alt="Uploaded Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            <button
                              type="button"
                              onClick={() => setOrganizerLogo('')}
                              style={{
                                position: 'absolute', top: '2px', right: '2px',
                                background: 'rgba(239,68,68,0.8)', border: 'none',
                                borderRadius: '50%', width: '16px', height: '16px',
                                color: 'white', cursor: 'pointer', display: 'grid', placeItems: 'center',
                                fontSize: '10px'
                              }}
                              title="Remove logo"
                            >
                              ×
                            </button>
                          </div>
                        )}

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(6, 182, 212, 0.1)',
                            border: '1px solid rgba(6, 182, 212, 0.3)',
                            color: 'var(--neon-cyan)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            width: 'fit-content',
                          }}>
                            📁 Choose Logo File from Computer
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/svg+xml"
                              onChange={handleUploadOrganizerLogo}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Select PNG, JPG, or SVG file from your computer system (Max 2MB)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                  <Button onClick={() => setStep(2)}>Next → Add Problems</Button>
                </div>
              </div>
            )}

            {/* STEP 2: Add Problems */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '8px' }}>
                    + Add Problem Source
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <Button
                      type="button"
                      size="sm"
                      variant={problemSource === 'CODEFORCES' ? 'primary' : 'secondary'}
                      onClick={() => setProblemSource('CODEFORCES')}
                    >
                      <Code2 size={14} /> Codeforces
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={problemSource === 'LEETCODE' ? 'primary' : 'secondary'}
                      onClick={() => setProblemSource('LEETCODE')}
                    >
                      <Zap size={14} /> LeetCode
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={problemSource === 'INTERNAL' ? 'primary' : 'secondary'}
                      onClick={() => setProblemSource('INTERNAL')}
                    >
                      <BookOpen size={14} /> Internal SL
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      style={{ border: '1px dashed var(--neon-cyan)', color: 'var(--neon-cyan)' }}
                      onClick={() => setShowNestedCreateModal(true)}
                    >
                      <FilePlus size={14} /> + Create New Internal
                    </Button>
                  </div>
                </div>

                {/* External Import Form (Codeforces / LeetCode) */}
                {(problemSource === 'CODEFORCES' || problemSource === 'LEETCODE') && (
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>
                      {problemSource} Problem ID or URL
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
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
                        placeholder={
                          problemSource === 'CODEFORCES'
                            ? 'e.g. 4A or https://codeforces.com/problemset/problem/4/A'
                            : 'e.g. 1 or two-sum or https://leetcode.com/problems/two-sum/'
                        }
                        value={problemInput}
                        onChange={(e) => setProblemInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFetchProblem();
                        }}
                      />
                      <Button type="button" onClick={handleFetchProblem} isLoading={fetching}>
                        {fetching ? 'Fetching...' : 'Fetch'}
                      </Button>
                    </div>
                    {fetchError && <p style={{ color: '#f87171', fontSize: 'var(--text-xs)', marginTop: '6px' }}>{fetchError}</p>}
                  </div>
                )}

                {/* Existing Internal Problem Selector */}
                {problemSource === 'INTERNAL' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '6px' }}>
                      Select Existing Internal Problem
                    </label>
                    {loadingInternal ? (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Loading internal problems...</div>
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

                {/* Preview Card */}
                {previewProblem && (
                  <div
                    style={{
                      background: 'rgba(34,197,94,0.08)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                        <CheckCircle2 size={14} /> Problem Ready
                      </span>
                      <span style={{ fontSize: '11px', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)' }}>
                        {previewProblem.platform}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: 0 }}>{previewProblem.title}</h3>

                    <div style={{ display: 'flex', gap: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      <span>
                        Difficulty: <strong style={{ color: 'var(--neon-cyan)' }}>{previewProblem.difficulty}</strong>
                      </span>
                      <span>Statement ✓</span>
                      <span>Constraints ✓</span>
                    </div>

                    <div style={{ marginTop: '4px' }}>
                      <Button size="sm" onClick={handleAddPreviewToBattle}>
                        <Plus size={14} /> Add to Battle
                      </Button>
                    </div>
                  </div>
                )}

                {/* Added Problems List */}
                <div style={{ marginTop: 'var(--space-sm)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
                    Battle Problems ({addedProblems.length})
                  </h4>

                  {addedProblems.length === 0 ? (
                    <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic' }}>
                      No problems added yet. Choose a source above to add problems.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                            <input
                              type="number"
                              style={{
                                width: '60px',
                                padding: '4px 6px',
                                fontSize: '12px',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                              }}
                              value={p.points}
                              onChange={(e) => handlePointsChange(idx, Number(e.target.value))}
                            />
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>pts</span>

                            <button
                              type="button"
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                              onClick={() => handleMoveProblem(idx, -1)}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                              onClick={() => handleMoveProblem(idx, 1)}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                              onClick={() => handleRemoveProblem(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-md)' }}>
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button onClick={handleSaveBattle} isLoading={creating} disabled={addedProblems.length === 0}>
                    {creating ? 'Saving Battle...' : isEditing ? 'Update Battle 💾' : 'Create Battle 🚀'}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Success & Battle Code */}
            {step === 3 && createdBattle && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--space-md)' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: '#4ade80', display: 'grid', placeItems: 'center' }}>
                  <CheckCircle2 size={32} />
                </div>

                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>{createdBattle.title} Saved!</h3>

                <div style={{ background: 'var(--bg-card)', border: '2px dashed var(--neon-cyan)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', width: '100%' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Battle Join Code</span>
                  <strong style={{ fontSize: '28px', letterSpacing: '3px', color: 'var(--neon-cyan)', fontFamily: 'monospace' }}>
                    {createdBattle.join_code}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(createdBattle.join_code);
                      alert('Battle code copied to clipboard!');
                    }}
                  >
                    <Copy size={14} /> Copy Code
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = `/code-arena/battles/${createdBattle.id}`;
                    }}
                  >
                    Enter Battle Arena →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* NESTED CREATE INTERNAL PROBLEM MODAL */}
      {showNestedCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 1100,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Card
            variant="glass"
            style={{
              maxWidth: '560px',
              width: '100%',
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }} className="text-gradient">
                Create Internal BCE Problem
              </h3>
              <button
                type="button"
                onClick={() => setShowNestedCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <ProblemForm onSuccess={handleNestedProblemCreated} />
          </Card>
        </div>
      )}
    </>
  );
}
