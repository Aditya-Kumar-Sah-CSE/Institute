'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import AskDoubtModal from '@/features/doubts/components/AskDoubtModal';

interface CourseDoubtsClientProps {
  courseId: string;
  initialDoubts: any[];
}

export default function CourseDoubtsClient({ courseId, initialDoubts }: CourseDoubtsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const displayedDoubts = isExpanded ? initialDoubts : initialDoubts.slice(0, 1);

  return (
    <div style={{ marginBottom: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Course Doubts</h2>
        <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
          Ask a Doubt
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {displayedDoubts.length > 0 ? (
          displayedDoubts.map(doubt => (
            <Link key={doubt.id} href={`/doubts/${doubt.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Card variant="glass" className="hover-lift" style={{ padding: 'var(--space-md)' }}>
                {doubt.lesson && (
                  <div style={{ marginBottom: 'var(--space-xs)' }}>
                    <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'var(--neon-cyan)', display: 'inline-block' }}>
                      📄 {doubt.lesson.title}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontSize: 'var(--text-md)', margin: 0 }}>{doubt.title}</h4>
                  <span style={{ 
                    fontSize: 'var(--text-xs)', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    background: doubt.status === 'resolved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                    color: doubt.status === 'resolved' ? '#22c55e' : '#eab308' 
                  }}>
                    {doubt.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Asked by {doubt.author?.name || 'Unknown'} • {new Date(doubt.created_at).toLocaleDateString()}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>👁️ {doubt.view_count?.[0]?.count || 0}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>💬 {doubt.replies?.[0]?.count || 0}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No doubts asked for this course yet.</p>
          </div>
        )}
      </div>

      {initialDoubts.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
          <Button variant="ghost" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'Show Less' : `Read more (${initialDoubts.length - 1} more)`}
          </Button>
        </div>
      )}

      <AskDoubtModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        courseId={courseId}
      />
    </div>
  );
}
