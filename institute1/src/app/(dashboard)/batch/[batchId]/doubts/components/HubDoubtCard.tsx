import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface HubDoubtCardProps {
  doubt: any;
  batchId: string;
}

export default function HubDoubtCard({ doubt, batchId }: HubDoubtCardProps) {
  const isResolved = doubt.status === 'resolved';
  
  return (
    <Link href={doubt.lesson_id ? `/courses/${doubt.course_id}/${doubt.lesson_id}/doubt/${doubt.id}` : `/batch/${batchId}/doubts`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div 
        className="glass-card hover-lift" 
        style={{ 
          padding: 'var(--space-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
          borderLeft: isResolved ? '4px solid #22c55e' : '4px solid #eab308'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', margin: 0, color: 'var(--text-primary)', wordBreak: 'break-word', flex: '1 1 auto', minWidth: 0 }}>
            {doubt.title}
          </h3>
          <span style={{ 
            fontSize: 'var(--text-xs)', 
            padding: '2px 8px', 
            borderRadius: '12px', 
            background: isResolved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
            color: isResolved ? '#22c55e' : '#eab308',
            flexShrink: 0
          }}>
            {isResolved ? 'Resolved' : 'Open'}
          </span>
        </div>

        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: 'var(--text-sm)', 
          display: '-webkit-box', 
          WebkitLineClamp: 2, 
          WebkitBoxOrient: 'vertical', 
          overflow: 'hidden',
          margin: 0,
          wordBreak: 'break-word'
        }}>
          {doubt.description}
        </p>

        {(doubt.course || doubt.lesson) && (
          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', marginTop: 'var(--space-2xs)', flexWrap: 'wrap' }}>
            {doubt.course && (
              <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                📚 {doubt.course.title}
              </span>
            )}
            {doubt.lesson && (
              <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                📄 {doubt.lesson.title}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            {doubt.author?.avatar_url ? (
              <img src={doubt.author.avatar_url} alt={doubt.author.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                {doubt.author?.name?.charAt(0) || '?'}
              </div>
            )}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {doubt.author?.name} {doubt.author?.role !== 'student' ? `(${doubt.author?.role})` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              👁️ {doubt.view_count?.[0]?.count || 0}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              💬 {doubt.replies?.[0]?.count || 0}
            </span>
            <span>
              {formatDistanceToNow(new Date(doubt.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
