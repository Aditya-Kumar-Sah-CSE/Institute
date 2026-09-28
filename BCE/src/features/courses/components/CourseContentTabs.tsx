'use client';

import { ReactNode, useState } from 'react';
import { BookOpen, ClipboardList, MessageCircleQuestion } from 'lucide-react';
import './CourseSectionTabs.css';

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
    <section className="course-content-tabs">
      <div className="course-section-tabs" role="tablist" aria-label="Course learning sections">
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
              className={`course-section-tabs__button${selected ? ' is-active' : ''}`}
            >
              <Icon size={17} />
              {label}
            </button>
          );
        })}
      </div>
      <div className="course-section-tab-panel" id="course-tab-panel" role="tabpanel" aria-labelledby={`course-tab-${activeTab}`}>
        {content}
      </div>
    </section>
  );
}
