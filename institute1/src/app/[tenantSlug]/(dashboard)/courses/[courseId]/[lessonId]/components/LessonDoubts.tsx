'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import AskDoubtModal from '@/features/doubts/components/AskDoubtModal';

interface LessonDoubtsProps {
  courseId: string;
  lessonId: string;
  doubts: any[];
}

export default function LessonDoubts({ courseId, lessonId, doubts }: LessonDoubtsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const askDoubtParam = searchParams.get('askDoubt');
  const sharedFileUrl = searchParams.get('sharedFileUrl');

  useEffect(() => {
    if (askDoubtParam === 'true') {
      setIsModalOpen(true);
    }
  }, [askDoubtParam]);

  return (
    <div style={{ marginTop: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <h3 style={{ fontSize: 'var(--text-xl)', color: 'var(--text-primary)', margin: 0 }}>
          Lesson Doubts
        </h3>
        <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>
          Ask a Doubt
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {doubts.length > 0 ? (
          doubts.map(doubt => (
            <Link key={doubt.id} href={`/courses/${courseId}/${lessonId}/doubt/${doubt.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Card variant="glass" className="hover-lift" style={{ padding: 'var(--space-md)' }}>
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
                  <span suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
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
          <p className="text-secondary" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
            No doubts asked for this lesson yet.
          </p>
        )}
      </div>

      <AskDoubtModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        courseId={courseId}
        lessonId={lessonId}
        initialFileUrl={sharedFileUrl}
      />
    </div>
  );
}
