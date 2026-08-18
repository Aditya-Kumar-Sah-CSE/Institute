'use client';

import React from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface MessageSearchProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  matchCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onClose: () => void;
}

export default function MessageSearch({
  searchQuery,
  setSearchQuery,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
  onClose
}: MessageSearchProps) {
  return (
    <div style={{
      padding: '8px 16px',
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-divider)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 15,
      animation: 'slideDown 0.2s ease-out'
    }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search in conversation..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            padding: '8px 12px 8px 36px',
            borderRadius: '20px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none'
          }}
        />
      </div>

      {searchQuery.trim() && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>
            {matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : 'No matches'}
          </span>
          <button
            onClick={onPrevMatch}
            disabled={matchCount === 0}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: matchCount === 0 ? 'not-allowed' : 'pointer', padding: 4 }}
            title="Previous match"
          >
            <ChevronUp size={18} />
          </button>
          <button
            onClick={onNextMatch}
            disabled={matchCount === 0}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: matchCount === 0 ? 'not-allowed' : 'pointer', padding: 4 }}
            title="Next match"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      )}

      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
        title="Close Search"
      >
        <X size={18} />
      </button>
    </div>
  );
}
