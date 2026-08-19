'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AssignmentCard from '@/features/courses/components/AssignmentCard';
import LessonDoubts from './LessonDoubts';
import { ClipboardList, MessageCircle } from 'lucide-react';
import type { Assignment, Submission } from '@/types';

interface LessonPageClientProps {
  assignments: Assignment[];
  submissions: Submission[];
  allSubmissions: any[];
  submitAssignment: (assignmentId: string, formData: FormData) => Promise<void>;
  doubts: any[];
  courseId: string;
  lessonId: string;
  showDoubts: boolean;
}

type SectionTab = 'assignments' | 'doubts';

export default function LessonPageClient({
  assignments,
  submissions,
  allSubmissions,
  submitAssignment,
  doubts,
  courseId,
  lessonId,
  showDoubts,
}: LessonPageClientProps) {
  const hasAssignments = assignments.length > 0;
  const hasDoubts = showDoubts;

  // Build section tabs
  const sectionTabs: { id: SectionTab; label: string; icon: React.ReactNode; badge?: number }[] = [];

  if (hasAssignments) {
    sectionTabs.push({
      id: 'assignments',
      label: 'Assignments',
      icon: <ClipboardList size={15} />,
      badge: assignments.length,
    });
  }

  if (hasDoubts) {
    sectionTabs.push({
      id: 'doubts',
      label: 'Doubts',
      icon: <MessageCircle size={15} />,
      badge: doubts.length > 0 ? doubts.length : undefined,
    });
  }

  const searchParams = useSearchParams();
  const askDoubtParam = searchParams ? searchParams.get('askDoubt') : null;
  const fromCompilerParam = searchParams ? searchParams.get('fromCompiler') : null;

  const [activeSection, setActiveSection] = useState<SectionTab>(() => {
    if (askDoubtParam === 'true') return 'doubts';
    if (fromCompilerParam === 'true') return 'assignments';
    return sectionTabs.length > 0 ? sectionTabs[0].id : 'assignments';
  });

  useEffect(() => {
    if (askDoubtParam === 'true') {
      setActiveSection('doubts');
    } else if (fromCompilerParam === 'true') {
      setActiveSection('assignments');
    }
  }, [askDoubtParam, fromCompilerParam]);

  if (sectionTabs.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Section Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        border: '1px solid var(--glass-border)',
        padding: '0 var(--space-md)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {sectionTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`lesson-tab ${activeSection === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderTop: 'none',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
        padding: 'var(--space-xl)',
        minHeight: '200px',
        animation: 'tabFadeIn 0.3s ease',
      }} key={activeSection}>
        {activeSection === 'assignments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            {assignments.map(assign => {
              const sub = submissions.find(s => s.assignment_id === assign.id);
              const communitySubs = allSubmissions.filter(s => s.assignment_id === assign.id);
              const submitAction = submitAssignment.bind(null, assign.id);
              return (
                <AssignmentCard
                  key={assign.id}
                  assignment={assign}
                  submission={sub}
                  communitySubmissions={communitySubs}
                  onSubmit={submitAction}
                />
              );
            })}
          </div>
        )}

        {activeSection === 'doubts' && showDoubts && (
          <LessonDoubts courseId={courseId} lessonId={lessonId} doubts={doubts} />
        )}
      </div>
    </div>
  );
}
