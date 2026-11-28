'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  resolveCoordinatorStatus,
  type ClubCoordinator,
  type ClubEvent,
  type ClubEventWinner,
  type ClubFacultyMentor,
  type CoordinatorStatusMode,
} from '@/lib/club-utils';

interface SuperAdminClubManagerProps {
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const inputStyle: React.CSSProperties = {
  background: '#0b0f19',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  borderRadius: '8px',
  padding: '8px 10px',
  color: '#f8fafc',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
};

const EMPTY_MENTOR: Partial<ClubFacultyMentor> = {
  name: '',
  club_role: 'Club Mentor',
  post: 'Assistant Professor, Computer Science & Engineering',
  timeline: '2026 – Present',
  photo_url: '',
  profile_url: '',
  sort_order: 1,
  is_active: true,
};

const EMPTY_COORDINATOR: Partial<ClubCoordinator> = {
  name: '',
  profile_url: '',
  batch_label: '28 Batch',
  term_label: '2027 – 2028',
  term_end_date: '2028-12-31',
  status_mode: 'auto',
  sort_order: 1,
  is_active: true,
};

const EMPTY_EVENT: Partial<ClubEvent> = {
  title: '',
  badge_label: 'Coding Contest',
  event_date_label: '',
  venue: 'CSE Department',
  description: '',
  winners: [{ medal: '🥇', name: '', detail: '' }],
  image_urls: [],
  sort_order: 1,
  is_active: true,
};

export default function SuperAdminClubManager({ onToast }: SuperAdminClubManagerProps) {
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [mentors, setMentors] = useState<ClubFacultyMentor[]>([]);
  const [coordinators, setCoordinators] = useState<ClubCoordinator[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [todayIst, setTodayIst] = useState<string>('2026-11-28');

  // New Mentor form
  const [showAddMentor, setShowAddMentor] = useState(false);
  const [newMentor, setNewMentor] = useState<Partial<ClubFacultyMentor>>({ ...EMPTY_MENTOR });

  // New Coordinator form
  const [showAddCoordinator, setShowAddCoordinator] = useState(false);
  const [newCoord, setNewCoord] = useState<Partial<ClubCoordinator>>({ ...EMPTY_COORDINATOR });

  // New Event form
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<ClubEvent>>({
    ...EMPTY_EVENT,
    winners: [{ medal: '🥇', name: '', detail: '' }],
    image_urls: [],
  });
  const [eventUrlDrafts, setEventUrlDrafts] = useState<Record<string, string>>({});

  // Coordinator filter state
  const [coordFilter, setCoordFilter] = useState<'all' | 'active' | 'past'>('all');
  const [coordSearch, setCoordSearch] = useState('');

  const loadClub = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/club');
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToastRef.current('error', json.error || 'Failed to load club records.');
      } else {
        setMentors(json.data.mentors || []);
        setCoordinators(json.data.coordinators || []);
        setEvents(json.data.events || []);
        if (json.data.todayIst) setTodayIst(json.data.todayIst);
      }
    } catch {
      onToastRef.current('error', 'Network error loading club management data.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

  const uploadMentorPhoto = async (
    targetKey: string,
    file: File | undefined,
    onDone: (url: string) => void
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast('error', 'Please choose a PNG, JPG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onToast('error', 'Photo must be smaller than 5 MB.');
      return;
    }
    setUploadingId(targetKey);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/super-admin/club/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.success || !json.url) {
        onToast('error', json.error || 'Photo upload failed.');
      } else {
        onDone(json.url);
        onToast('success', 'Photo uploaded. Click Save to publish it to the landing page.');
      }
    } catch {
      onToast('error', 'Upload failed.');
    }
    setUploadingId(null);
  };

  const saveMentor = async (mentor: Partial<ClubFacultyMentor>, key: string) => {
    if (!mentor.name?.trim()) {
      onToast('error', 'Faculty / Mentor name is required.');
      return;
    }
    setSavingId(key);
    try {
      const res = await fetch('/api/super-admin/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'mentor', ...mentor }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast('error', json.error || 'Failed to save mentor.');
      } else {
        onToast('success', `${mentor.name} saved.`);
        if (key === 'new-mentor') {
          setNewMentor({ ...EMPTY_MENTOR, sort_order: mentors.length + 1 });
          setShowAddMentor(false);
        }
        await loadClub();
      }
    } catch {
      onToast('error', 'Failed to save mentor.');
    }
    setSavingId(null);
  };

  const deleteMentor = async (mentor: ClubFacultyMentor) => {
    if (!confirm(`Remove ${mentor.name} from Club Mentors?`)) return;
    setSavingId(mentor.id);
    try {
      const res = await fetch('/api/super-admin/club', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'mentor', id: mentor.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast('error', json.error || 'Failed to delete mentor.');
      } else {
        onToast('success', `${mentor.name} removed.`);
        await loadClub();
      }
    } catch {
      onToast('error', 'Delete failed.');
    }
    setSavingId(null);
  };

  const saveCoordinator = async (coord: Partial<ClubCoordinator>, key: string) => {
    if (!coord.name?.trim()) {
      onToast('error', 'Coordinator name is required.');
      return;
    }
    setSavingId(key);
    try {
      const res = await fetch('/api/super-admin/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'coordinator', ...coord }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast('error', json.error || 'Failed to save coordinator.');
      } else {
        onToast('success', `${coord.name} saved.`);
        if (key === 'new-coord') {
          setNewCoord((prev) => ({
            ...prev,
            name: '',
            profile_url: '',
            sort_order: coordinators.length + 1,
          }));
          setShowAddCoordinator(false);
        }
        await loadClub();
      }
    } catch {
      onToast('error', 'Failed to save coordinator.');
    }
    setSavingId(null);
  };

  const deleteCoordinator = async (coord: ClubCoordinator) => {
    if (!confirm(`Remove ${coord.name} (${coord.batch_label}) from coordinators?`)) return;
    setSavingId(coord.id);
    try {
      const res = await fetch('/api/super-admin/club', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'coordinator', id: coord.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast('error', json.error || 'Failed to delete coordinator.');
      } else {
        onToast('success', `${coord.name} removed.`);
        await loadClub();
      }
    } catch {
      onToast('error', 'Delete failed.');
    }
    setSavingId(null);
  };

  const patchEventTarget = (
    key: string,
    updater: (prev: Partial<ClubEvent>) => Partial<ClubEvent>
  ) => {
    if (key === 'new-event') {
      setNewEvent((prev) => updater(prev));
      return;
    }
    setEvents((prev) =>
      prev.map((ev) => (ev.id === key ? ({ ...ev, ...updater(ev) } as ClubEvent) : ev))
    );
  };

  const addEventPhotoUrl = (key: string, url: string) => {
    const cleaned = url.trim();
    if (!cleaned) return;
    patchEventTarget(key, (ev) => ({
      ...ev,
      image_urls: [...(ev.image_urls || []), cleaned],
    }));
  };

  const removeEventPhoto = (key: string, index: number) => {
    patchEventTarget(key, (ev) => ({
      ...ev,
      image_urls: (ev.image_urls || []).filter((_, i) => i !== index),
    }));
  };

  const addWinnerRow = (key: string) => {
    patchEventTarget(key, (ev) => {
      const cur = Array.isArray(ev.winners) ? ev.winners : [];
      const defaultMedals = ['🥇', '🥈', '🥉', '🏅'];
      const medal = defaultMedals[cur.length] || '🏅';
      return { ...ev, winners: [...cur, { medal, name: '', detail: '' }] };
    });
  };

  const updateWinnerRow = (
    key: string,
    index: number,
    field: keyof ClubEventWinner,
    value: string
  ) => {
    patchEventTarget(key, (ev) => {
      const next = [...(ev.winners || [])];
      const existing = next[index] || { medal: '🏅', name: '', detail: '' };
      next[index] = { ...existing, [field]: value };
      return { ...ev, winners: next };
    });
  };

  const removeWinnerRow = (key: string, index: number) => {
    patchEventTarget(key, (ev) => ({
      ...ev,
      winners: (ev.winners || []).filter((_, i) => i !== index),
    }));
  };

  const saveEvent = async (ev: Partial<ClubEvent>, key: string) => {
    if (!ev.title?.trim()) {
      onToast('error', 'Event title is required.');
      return;
    }
    setSavingId(key);
    try {
      const sanitizedWinners = (ev.winners || []).filter((w) => w && w.name.trim());
      const res = await fetch('/api/super-admin/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'event',
          ...ev,
          winners: sanitizedWinners,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast('error', json.error || 'Failed to save event.');
      } else {
        onToast('success', 'Event saved & published to landing page.');
        if (key === 'new-event') {
          setNewEvent({
            ...EMPTY_EVENT,
            winners: [{ medal: '🥇', name: '', detail: '' }],
            image_urls: [],
            sort_order: events.length + 1,
          });
          setEventUrlDrafts((d) => ({ ...d, 'new-event': '' }));
          setShowAddEvent(false);
        }
        await loadClub();
      }
    } catch {
      onToast('error', 'Failed to save event.');
    }
    setSavingId(null);
  };

  const deleteEvent = async (ev: ClubEvent) => {
    if (!confirm(`Delete event "${ev.title}" from the landing page?`)) return;
    setSavingId(ev.id);
    try {
      const res = await fetch('/api/super-admin/club', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'event', id: ev.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        onToast('error', json.error || 'Failed to delete event.');
      } else {
        onToast('success', 'Event removed.');
        await loadClub();
      }
    } catch {
      onToast('error', 'Failed to delete event.');
    }
    setSavingId(null);
  };

  const renderEventEditor = (ev: Partial<ClubEvent>, key: string, isNew: boolean) => {
    const photos = ev.image_urls || [];
    const winners = ev.winners || [];
    const draftUrl = eventUrlDrafts[key] || '';

    return (
      <div
        key={key}
        style={{
          background: isNew ? 'rgba(245, 158, 11, 0.06)' : 'rgba(255, 255, 255, 0.03)',
          border: isNew
            ? '1px solid rgba(245, 158, 11, 0.32)'
            : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '12px',
          }}
        >
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              EVENT TITLE *
            </label>
            <input
              style={inputStyle}
              value={ev.title || ''}
              onChange={(e) => patchEventTarget(key, (p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. 🏆 Coding Contest — Winners Announcement! 💻🎉"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              BADGE LABEL
            </label>
            <input
              style={inputStyle}
              value={ev.badge_label || ''}
              onChange={(e) => patchEventTarget(key, (p) => ({ ...p, badge_label: e.target.value }))}
              placeholder="e.g. Coding Contest"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              DATE & TIME LABEL
            </label>
            <input
              style={inputStyle}
              value={ev.event_date_label || ''}
              onChange={(e) => patchEventTarget(key, (p) => ({ ...p, event_date_label: e.target.value }))}
              placeholder="e.g. 10/08/2026 • 3PM Sharp"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              VENUE
            </label>
            <input
              style={inputStyle}
              value={ev.venue || ''}
              onChange={(e) => patchEventTarget(key, (p) => ({ ...p, venue: e.target.value }))}
              placeholder="e.g. CSE Department"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
              SORT ORDER
            </label>
            <input
              style={inputStyle}
              type="number"
              value={ev.sort_order ?? 1}
              onChange={(e) =>
                patchEventTarget(key, (p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))
              }
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
            ANNOUNCEMENT / DESCRIPTION
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: '78px', resize: 'vertical' }}
            value={ev.description || ''}
            onChange={(e) => patchEventTarget(key, (p) => ({ ...p, description: e.target.value }))}
            placeholder="Event highlights, contest summary, rules or celebration note..."
          />
        </div>

        {/* Event Photos */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>
              Event Photos ({photos.length})
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label
                style={{
                  background: 'rgba(6, 182, 212, 0.16)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  color: '#22d3ee',
                  padding: '6px 11px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: uploadingId === `event-photo-${key}` ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Upload size={13} />
                {uploadingId === `event-photo-${key}` ? 'Uploading...' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    uploadMentorPhoto(`event-photo-${key}`, e.target.files?.[0], (url) =>
                      addEventPhotoUrl(key, url)
                    );
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          {photos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
              {photos.map((url, idx) => (
                <div
                  key={`${key}-img-${idx}`}
                  style={{
                    position: 'relative',
                    width: '92px',
                    height: '68px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    background: '#0b0f19',
                  }}
                >
                  <img
                    src={url}
                    alt={`Event photo ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeEventPhoto(key, idx)}
                    title="Remove photo"
                    style={{
                      position: 'absolute',
                      top: '3px',
                      right: '3px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '999px',
                      border: 'none',
                      background: 'rgba(15, 23, 42, 0.88)',
                      color: '#f87171',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              style={inputStyle}
              value={draftUrl}
              onChange={(e) => setEventUrlDrafts((d) => ({ ...d, [key]: e.target.value }))}
              placeholder="Or paste image path/URL (e.g. /images/events/...)"
            />
            <button
              type="button"
              onClick={() => {
                if (!draftUrl.trim()) return;
                addEventPhotoUrl(key, draftUrl);
                setEventUrlDrafts((d) => ({ ...d, [key]: '' }));
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                color: '#f8fafc',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Add URL
            </button>
          </div>
        </div>

        {/* Winners Editor */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>
              Winners ({winners.length})
            </span>
            <button
              type="button"
              onClick={() => addWinnerRow(key)}
              style={{
                background: 'rgba(245, 158, 11, 0.16)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fbbf24',
                padding: '5px 10px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Add Winner
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {winners.map((w, wIdx) => (
              <div
                key={`${key}-winner-${wIdx}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '68px 1fr 1fr auto',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <input
                  style={inputStyle}
                  value={w.medal || ''}
                  onChange={(e) => updateWinnerRow(key, wIdx, 'medal', e.target.value)}
                  placeholder="🥇"
                />
                <input
                  style={inputStyle}
                  value={w.name || ''}
                  onChange={(e) => updateWinnerRow(key, wIdx, 'name', e.target.value)}
                  placeholder="Winner Name"
                />
                <input
                  style={inputStyle}
                  value={w.detail || ''}
                  onChange={(e) => updateWinnerRow(key, wIdx, 'detail', e.target.value)}
                  placeholder="e.g. 2nd Year CSE"
                />
                <button
                  type="button"
                  onClick={() => removeWinnerRow(key, wIdx)}
                  title="Remove Winner"
                  style={{
                    background: 'rgba(239, 68, 68, 0.16)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '7px 9px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={ev.is_active !== false}
              onChange={(e) => patchEventTarget(key, (p) => ({ ...p, is_active: e.target.checked }))}
            />
            Visible on Landing Page
          </label>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isNew && ev.id && (
              <button
                type="button"
                onClick={() => deleteEvent(ev as ClubEvent)}
                disabled={savingId === key}
                style={{
                  background: 'rgba(239, 68, 68, 0.16)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => saveEvent(ev, key)}
              disabled={savingId === key}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                border: 'none',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: savingId === key ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Save size={13} />
              {savingId === key ? 'Saving...' : isNew ? 'Publish Event' : 'Save Event'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const counts = useMemo(() => {
    let active = 0;
    let past = 0;
    coordinators.forEach((c) => {
      if (resolveCoordinatorStatus(c, todayIst) === 'active') active++;
      else past++;
    });
    return { total: coordinators.length, active, past };
  }, [coordinators, todayIst]);

  const filteredCoordinators = useMemo(() => {
    const q = coordSearch.trim().toLowerCase();
    return coordinators.filter((c) => {
      const bucket = resolveCoordinatorStatus(c, todayIst);
      if (coordFilter !== 'all' && bucket !== coordFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.batch_label.toLowerCase().includes(q) ||
        c.term_label.toLowerCase().includes(q) ||
        (c.profile_url || '').toLowerCase().includes(q)
      );
    });
  }, [coordinators, coordFilter, coordSearch, todayIst]);

  if (loading) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8' }}>
        <RefreshCw size={28} className="spin" style={{ color: '#06b6d4', marginBottom: '10px' }} />
        <div>Loading Debuggerzz Coding Club roster...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Section 1: Faculty Heads & Club Mentors */}
      <section>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} /> Faculty Heads &amp; Club Mentors ({mentors.length})
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Edit photos, names, posts/departments, roles, timelines, and visibility directly on the landing page.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMentor((v) => !v)}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} /> {showAddMentor ? 'Close Form' : 'Add Faculty / Mentor'}
          </button>
        </div>

        {showAddMentor && (
          <div
            style={{
              background: 'rgba(14, 165, 233, 0.06)',
              border: '1px solid rgba(14, 165, 233, 0.35)',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '12px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                FULL NAME *
              </label>
              <input
                value={newMentor.name || ''}
                onChange={(e) => setNewMentor((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Dr. Mintu Singh"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                CLUB ROLE (MENTOR / HEAD)
              </label>
              <input
                value={newMentor.club_role || ''}
                onChange={(e) => setNewMentor((p) => ({ ...p, club_role: e.target.value }))}
                placeholder="e.g. Club Mentor"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                POST / DESIGNATION
              </label>
              <input
                value={newMentor.post || ''}
                onChange={(e) => setNewMentor((p) => ({ ...p, post: e.target.value }))}
                placeholder="Assistant Professor, CSE"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                TIMELINE
              </label>
              <input
                value={newMentor.timeline || ''}
                onChange={(e) => setNewMentor((p) => ({ ...p, timeline: e.target.value }))}
                placeholder="2026 – Present"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                PHOTO URL OR UPLOAD
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={newMentor.photo_url || ''}
                  onChange={(e) => setNewMentor((p) => ({ ...p, photo_url: e.target.value }))}
                  placeholder="/images/club/... or https://..."
                  style={inputStyle}
                />
                <label
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    color: '#e2e8f0',
                  }}
                >
                  <Upload size={14} />
                  {uploadingId === 'new-mentor' ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={(e) =>
                      uploadMentorPhoto('new-mentor', e.target.files?.[0], (url) =>
                        setNewMentor((p) => ({ ...p, photo_url: url }))
                      )
                    }
                  />
                </label>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                PROFILE / LINKEDIN URL (OPTIONAL)
              </label>
              <input
                value={newMentor.profile_url || ''}
                onChange={(e) => setNewMentor((p) => ({ ...p, profile_url: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => saveMentor(newMentor, 'new-mentor')}
                disabled={savingId === 'new-mentor'}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Save size={15} /> {savingId === 'new-mentor' ? 'Saving...' : 'Create Mentor'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
          {mentors.map((mentor) => (
            <div
              key={mentor.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid rgba(6, 182, 212, 0.45)',
                    background: 'rgba(14, 165, 233, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {mentor.photo_url ? (
                    <img
                      src={mentor.photo_url}
                      alt={mentor.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <ImageIcon size={24} color="#38bdf8" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label
                      style={{
                        background: 'rgba(6, 182, 212, 0.15)',
                        border: '1px solid rgba(6, 182, 212, 0.35)',
                        color: '#38bdf8',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Upload size={13} />
                      {uploadingId === mentor.id ? 'Uploading...' : 'Change Photo'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        style={{ display: 'none' }}
                        onChange={(e) =>
                          uploadMentorPhoto(mentor.id, e.target.files?.[0], (url) =>
                            setMentors((prev) =>
                              prev.map((m) => (m.id === mentor.id ? { ...m, photo_url: url } : m))
                            )
                          )
                        }
                      />
                    </label>

                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={mentor.is_active}
                        onChange={(e) =>
                          setMentors((prev) =>
                            prev.map((m) => (m.id === mentor.id ? { ...m, is_active: e.target.checked } : m))
                          )
                        }
                      />
                      Visible
                    </label>
                  </div>
                  <input
                    value={mentor.photo_url || ''}
                    onChange={(e) =>
                      setMentors((prev) =>
                        prev.map((m) => (m.id === mentor.id ? { ...m, photo_url: e.target.value } : m))
                      )
                    }
                    placeholder="Photo URL (/images/club/...)"
                    style={{ ...inputStyle, marginTop: '8px', fontSize: '11.5px', padding: '6px 8px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Name</label>
                  <input
                    value={mentor.name}
                    onChange={(e) =>
                      setMentors((prev) =>
                        prev.map((m) => (m.id === mentor.id ? { ...m, name: e.target.value } : m))
                      )
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Club Role</label>
                  <input
                    value={mentor.club_role}
                    onChange={(e) =>
                      setMentors((prev) =>
                        prev.map((m) => (m.id === mentor.id ? { ...m, club_role: e.target.value } : m))
                      )
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Post / Designation</label>
                <input
                  value={mentor.post}
                  onChange={(e) =>
                    setMentors((prev) =>
                      prev.map((m) => (m.id === mentor.id ? { ...m, post: e.target.value } : m))
                    )
                  }
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Timeline</label>
                  <input
                    value={mentor.timeline}
                    onChange={(e) =>
                      setMentors((prev) =>
                        prev.map((m) => (m.id === mentor.id ? { ...m, timeline: e.target.value } : m))
                      )
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Profile Link</label>
                  <input
                    value={mentor.profile_url || ''}
                    onChange={(e) =>
                      setMentors((prev) =>
                        prev.map((m) => (m.id === mentor.id ? { ...m, profile_url: e.target.value } : m))
                      )
                    }
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Order</label>
                  <input
                    type="number"
                    value={mentor.sort_order}
                    onChange={(e) =>
                      setMentors((prev) =>
                        prev.map((m) =>
                          m.id === mentor.id ? { ...m, sort_order: Number(e.target.value) || 0 } : m
                        )
                      )
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => deleteMentor(mentor)}
                  disabled={savingId === mentor.id}
                  style={{
                    background: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Trash2 size={14} /> Remove
                </button>

                <button
                  type="button"
                  onClick={() => saveMentor(mentor, mentor.id)}
                  disabled={savingId === mentor.id}
                  style={{
                    background: '#0ea5e9',
                    border: 'none',
                    color: '#fff',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Save size={14} /> {savingId === mentor.id ? 'Saving...' : 'Save Mentor'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Student Coordinators (Current & Past with Auto End-of-Year Transition) */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '28px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#22d3ee', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> Student Coordinators ({counts.total})
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Manage 2026 outgoing (27 Batch), active 2027–2028 (28 Batch), or upcoming coordinators — name &amp; portfolio/LinkedIn links.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCoordinator((v) => !v)}
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} /> {showAddCoordinator ? 'Close Form' : 'Add Coordinator'}
          </button>
        </div>

        {/* Auto-Archive Rule Notice */}
        <div
          style={{
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '12.5px',
            color: '#cbd5e1',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <Calendar size={15} color="#22d3ee" />
          <span>
            <strong>Auto-Transition Active (Today IST: {todayIst}):</strong> Any coordinator set to{' '}
            <code>Auto by End Date</code> stays <strong>Current</strong> through their <em>Term End Date</em> (e.g.{' '}
            <code>2028-12-31</code>) and automatically shifts to <strong>Past Coordinators</strong> when that year ends.
          </span>
        </div>

        {showAddCoordinator && (
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.06)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              borderRadius: '14px',
              padding: '18px',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#94a3b8' }}>Quick Batch Preset:</span>
              <button
                type="button"
                onClick={() =>
                  setNewCoord((p) => ({
                    ...p,
                    batch_label: '28 Batch',
                    term_label: '2027 – 2028',
                    term_end_date: '2028-12-31',
                    status_mode: 'auto',
                  }))
                }
                style={{
                  background: 'rgba(16, 185, 129, 0.16)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                New / 28 Batch (2027–2028, Auto Past after 2028)
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewCoord((p) => ({
                    ...p,
                    batch_label: '27 Batch',
                    term_label: '2026',
                    term_end_date: '2026-11-26',
                    status_mode: 'auto',
                  }))
                }
                style={{
                  background: 'rgba(148, 163, 184, 0.16)',
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  color: '#cbd5e1',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Past / 27 Batch (2026)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Name *</label>
                <input
                  value={newCoord.name || ''}
                  onChange={(e) => setNewCoord((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Coordinator Name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Portfolio / LinkedIn URL</label>
                <input
                  value={newCoord.profile_url || ''}
                  onChange={(e) => setNewCoord((p) => ({ ...p, profile_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Batch</label>
                <input
                  value={newCoord.batch_label || ''}
                  onChange={(e) => setNewCoord((p) => ({ ...p, batch_label: e.target.value }))}
                  placeholder="28 Batch"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Term Label</label>
                <input
                  value={newCoord.term_label || ''}
                  onChange={(e) => setNewCoord((p) => ({ ...p, term_label: e.target.value }))}
                  placeholder="2027 – 2028"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Term End Date</label>
                <input
                  type="date"
                  value={newCoord.term_end_date || '2028-12-31'}
                  onChange={(e) => setNewCoord((p) => ({ ...p, term_end_date: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>Status Mode</label>
                <select
                  value={newCoord.status_mode || 'auto'}
                  onChange={(e) => setNewCoord((p) => ({ ...p, status_mode: e.target.value as CoordinatorStatusMode }))}
                  style={inputStyle}
                >
                  <option value="auto">Auto by End Date</option>
                  <option value="active">Force Current</option>
                  <option value="past">Force Past</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => saveCoordinator(newCoord, 'new-coord')}
                disabled={savingId === 'new-coord'}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Save size={15} /> {savingId === 'new-coord' ? 'Saving...' : 'Add Coordinator'}
              </button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {([
              { id: 'all', label: `All (${counts.total})` },
              { id: 'active', label: `Current / New (${counts.active})` },
              { id: 'past', label: `Past (${counts.past})` },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCoordFilter(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: coordFilter === tab.id ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.04)',
                  border: coordFilter === tab.id ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)',
                  color: coordFilter === tab.id ? '#22d3ee' : '#94a3b8',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search name, batch or link..."
              value={coordSearch}
              onChange={(e) => setCoordSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '32px' }}
            />
          </div>
        </div>

        {/* Editable Coordinator Rows */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '1020px' }}>
          {filteredCoordinators.map((coord) => {
            const liveStatus = resolveCoordinatorStatus(coord, todayIst);
            return (
              <div
                key={coord.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'grid',
                  gridTemplateColumns: '110px minmax(150px, 1.1fr) minmax(190px, 1.3fr) 95px 115px 130px 115px 60px auto',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      textAlign: 'center',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      background: liveStatus === 'active' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(148, 163, 184, 0.16)',
                      color: liveStatus === 'active' ? '#34d399' : '#cbd5e1',
                      border: liveStatus === 'active' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    {liveStatus === 'active' ? 'CURRENT' : 'PAST'}
                  </span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={coord.is_active}
                      onChange={(e) =>
                        setCoordinators((prev) =>
                          prev.map((c) => (c.id === coord.id ? { ...c, is_active: e.target.checked } : c))
                        )
                      }
                    />
                    Shown
                  </label>
                </div>

                <input
                  value={coord.name}
                  onChange={(e) =>
                    setCoordinators((prev) =>
                      prev.map((c) => (c.id === coord.id ? { ...c, name: e.target.value } : c))
                    )
                  }
                  placeholder="Coordinator Name"
                  aria-label="Coordinator Name"
                  style={inputStyle}
                />

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LinkIcon size={13} style={{ color: '#64748b', flexShrink: 0 }} />
                  <input
                    value={coord.profile_url || ''}
                    onChange={(e) =>
                      setCoordinators((prev) =>
                        prev.map((c) => (c.id === coord.id ? { ...c, profile_url: e.target.value } : c))
                      )
                    }
                    placeholder="Portfolio / LinkedIn URL"
                    aria-label="Portfolio or LinkedIn URL"
                    style={inputStyle}
                  />
                  {coord.profile_url && (
                    <a
                      href={coord.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open link"
                      style={{ color: '#38bdf8', flexShrink: 0 }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                <input
                  value={coord.batch_label}
                  onChange={(e) =>
                    setCoordinators((prev) =>
                      prev.map((c) => (c.id === coord.id ? { ...c, batch_label: e.target.value } : c))
                    )
                  }
                  placeholder="28 Batch"
                  aria-label="Batch Label"
                  style={inputStyle}
                />

                <input
                  value={coord.term_label}
                  onChange={(e) =>
                    setCoordinators((prev) =>
                      prev.map((c) => (c.id === coord.id ? { ...c, term_label: e.target.value } : c))
                    )
                  }
                  placeholder="2027 – 2028"
                  aria-label="Term Label"
                  style={inputStyle}
                />

                <input
                  type="date"
                  value={String(coord.term_end_date || '').slice(0, 10)}
                  onChange={(e) =>
                    setCoordinators((prev) =>
                      prev.map((c) => (c.id === coord.id ? { ...c, term_end_date: e.target.value } : c))
                    )
                  }
                  aria-label="Term End Date"
                  style={inputStyle}
                />

                <select
                  value={coord.status_mode}
                  onChange={(e) =>
                    setCoordinators((prev) =>
                      prev.map((c) =>
                        c.id === coord.id ? { ...c, status_mode: e.target.value as CoordinatorStatusMode } : c
                      )
                    )
                  }
                  aria-label="Status Mode"
                  style={inputStyle}
                >
                  <option value="auto">Auto</option>
                  <option value="active">Force Current</option>
                  <option value="past">Force Past</option>
                </select>

                <input
                  type="number"
                  value={coord.sort_order}
                  onChange={(e) =>
                    setCoordinators((prev) =>
                      prev.map((c) =>
                        c.id === coord.id ? { ...c, sort_order: Number(e.target.value) || 0 } : c
                      )
                    )
                  }
                  aria-label="Sort Order"
                  style={inputStyle}
                />

                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => saveCoordinator(coord, coord.id)}
                    disabled={savingId === coord.id}
                    title="Save Coordinator"
                    style={{
                      background: '#0ea5e9',
                      border: 'none',
                      color: '#fff',
                      padding: '7px 11px',
                      borderRadius: '7px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Save size={13} /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCoordinator(coord)}
                    disabled={savingId === coord.id}
                    title="Delete Coordinator"
                    style={{
                      background: 'rgba(239, 68, 68, 0.16)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      padding: '7px 9px',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </section>

      {/* Section 3: Club Events & Winners Announcements */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '28px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} style={{ color: '#fbbf24' }} /> Club Events &amp; Winners ({events.length})
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Add or edit events, upload contest photos, and showcase winners on the landing page (#events).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddEvent((v) => !v)}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
              color: '#fff',
              border: 'none',
              padding: '9px 15px',
              borderRadius: '9px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={15} /> {showAddEvent ? 'Cancel' : 'Add Event'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {showAddEvent && renderEventEditor(newEvent, 'new-event', true)}

          {events.map((ev) => renderEventEditor(ev, ev.id, false))}
        </div>
      </section>
    </div>
  );
}
