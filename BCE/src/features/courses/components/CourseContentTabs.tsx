'use client';

import { ReactNode, useState } from 'react';
import { BookOpen, ClipboardList, MessageCircleQuestion } from 'lucide-react';

type CourseTab = 'curriculum' | 'doubts' | 'mcqs';

const tabs: { id: CourseTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'curriculum', label: 'Course Curriculum', icon: BookOpen },
  { id: 'doubts', label: 'Course Doubts', icon: MessageCircleQuestion },
  { id: 'mcqs', label: 'Course MCQs', icon: ClipboardList },
];

export default function CourseContentTabs({
  curriculum,
  doubts,
  mcqs,
}: {
  curriculum: ReactNode;
  doubts: ReactNode;
  mcqs: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<CourseTab>('mcqs');
  const content = { curriculum, doubts, mcqs }[activeTab];

  return (
    <section style={{ marginTop: 'var(--space-xl)' }}>
      <div role="tablist" aria-label="Course learning sections" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 2px 12px', borderBottom: '1px solid var(--border-divider)' }}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id;
          return (
            <button
              key={id}
              id={`course-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="course-tab-panel"
              onClick={() => setActiveTab(id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
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
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </div>
      <div id="course-tab-panel" role="tabpanel" aria-labelledby={`course-tab-${activeTab}`} style={{ paddingTop: 'var(--space-md)' }}>
        {content}
      </div>
    </section>
  );
}
