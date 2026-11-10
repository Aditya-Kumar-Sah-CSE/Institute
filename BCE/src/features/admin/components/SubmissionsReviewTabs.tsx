'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { BookOpen, Rocket } from 'lucide-react';
import SubmissionsListClient from './SubmissionsListClient';
import ShowcaseReviewListClient from './ShowcaseReviewListClient';

interface SubmissionsReviewTabsProps {
  submissions: any[];
  reviewSubmissionAction: (formData: FormData) => Promise<void>;
  pendingApps: any[];
  totalPages: number;
  currentPage: number;
  basePath: string;
}

export default function SubmissionsReviewTabs({
  submissions,
  reviewSubmissionAction,
  pendingApps,
  totalPages,
  currentPage,
  basePath
}: SubmissionsReviewTabsProps) {
  // If there are pending apps and no assignment submissions, default to apps tab so instructors see pending reviews immediately!
  const defaultTab = submissions.length === 0 && pendingApps.length > 0 ? 'showcases' : 'assignments';
  const [activeTab, setActiveTab] = useState<'assignments' | 'showcases'>(defaultTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: '12px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: activeTab === 'assignments' ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid transparent',
            background: activeTab === 'assignments' ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
            color: activeTab === 'assignments' ? '#00f0ff' : 'var(--text-secondary)',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <BookOpen size={16} />
          <span>Course Assignments</span>
          {submissions.length > 0 && (
            <span style={{
              background: activeTab === 'assignments' ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              {submissions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('showcases')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: activeTab === 'showcases' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
            background: activeTab === 'showcases' ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
            color: activeTab === 'showcases' ? '#c084fc' : 'var(--text-secondary)',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Rocket size={16} />
          <span>Student App Showcases</span>
          {pendingApps.length > 0 && (
            <span style={{
              background: '#a855f7',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              {pendingApps.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Course Assignment Submissions */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <SubmissionsListClient 
            submissions={submissions || []} 
            reviewSubmissionAction={reviewSubmissionAction} 
          />

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
              {currentPage > 1 && (
                <Link href={`${basePath}?page=${currentPage - 1}`}>
                  <Button variant="secondary" size="sm">Previous Page</Button>
                </Link>
              )}
              <span style={{ padding: 'var(--space-xs) var(--space-sm)', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link href={`${basePath}?page=${currentPage + 1}`}>
                  <Button variant="secondary" size="sm">Next Page</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Student App Showcases */}
      {activeTab === 'showcases' && (
        <ShowcaseReviewListClient pendingApps={pendingApps} />
      )}
    </div>
  );
}
