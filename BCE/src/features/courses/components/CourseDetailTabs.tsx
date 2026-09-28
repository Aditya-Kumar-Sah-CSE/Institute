'use client';

import { ReactNode, useState } from 'react';
import { BookOpen, MessageSquareText, UsersRound } from 'lucide-react';

type DetailTab = 'detail' | 'feedback' | 'students';

const tabs: { id: DetailTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'detail', label: 'Detail', icon: BookOpen },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareText },
  { id: 'students', label: 'Students', icon: UsersRound },
];

export default function CourseDetailTabs({
  detail,
  feedback,
  students,
}: {
  detail: ReactNode;
  feedback: ReactNode;
  students: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('detail');
  const content = { detail, feedback, students }[activeTab];

  return (
    <div>
      <div role="tablist" aria-label="Course details" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px 12px', borderBottom: '1px solid var(--border-divider)' }}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id;
          return (
            <button
              key={id}
              id={`course-detail-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="course-detail-panel"
              onClick={() => setActiveTab(id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                flex: '0 0 auto',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${selected ? 'var(--neon-cyan)' : 'var(--border-divider)'}`,
                background: selected ? 'rgba(0, 240, 255, 0.1)' : 'var(--bg-secondary)',
                color: selected ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                fontWeight: selected ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              <Icon size={17} />{label}
            </button>
          );
        })}
      </div>
      <div id="course-detail-panel" role="tabpanel" aria-labelledby={`course-detail-tab-${activeTab}`} style={{ paddingTop: 'var(--space-lg)' }}>
        {content}
      </div>
    </div>
  );
}
