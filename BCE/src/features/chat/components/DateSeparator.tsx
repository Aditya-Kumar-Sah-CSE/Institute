'use client';

import React from 'react';

interface DateSeparatorProps {
  dateStr: string;
}

export function formatDateLabel(dateString: string): string {
  const msgDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (msgDate.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (msgDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return msgDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}

export default function DateSeparator({ dateStr }: DateSeparatorProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '20px 0 12px 0',
      position: 'relative',
      zIndex: 2,
    }}>
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-divider)',
        color: 'var(--text-muted)',
        fontSize: '11px',
        fontWeight: 700,
        padding: '4px 14px',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        {formatDateLabel(dateStr)}
      </div>
    </div>
  );
}
