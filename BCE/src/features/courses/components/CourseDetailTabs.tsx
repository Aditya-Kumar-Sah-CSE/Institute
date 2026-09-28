'use client';

import { ReactNode, useState } from 'react';
import { BookOpen, MessageSquareText, UsersRound } from 'lucide-react';
import './CourseSectionTabs.css';

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
    <div style={{ minWidth: 0 }}>
      <div className="course-section-tabs" role="tablist" aria-label="Course details">
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
              className={`course-section-tabs__button${selected ? ' is-active' : ''}`}
            >
              <Icon size={17} />{label}
            </button>
          );
        })}
      </div>
      <div className="course-section-tab-panel" id="course-detail-panel" role="tabpanel" aria-labelledby={`course-detail-tab-${activeTab}`}>
        {content}
      </div>
    </div>
  );
}
