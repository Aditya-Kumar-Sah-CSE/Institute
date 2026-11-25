'use client';

import { ReactNode, useState } from 'react';
import { BookOpen, ClipboardList, MessageCircleQuestion } from 'lucide-react';
import './CourseSectionTabs.css';

type CourseTab = 'curriculum' | 'doubts' | 'mcqs';

export default function CourseContentTabs({
  curriculum,
  doubts,
  mcqs,
  weeksCount = 0,
  lessonsCount = 0,
  doubtsCount = 0,
  mcqsCount = 0,
}: {
  curriculum: ReactNode;
  doubts: ReactNode;
  mcqs: ReactNode;
  weeksCount?: number;
  lessonsCount?: number;
  doubtsCount?: number;
  mcqsCount?: number;
}) {
  const [activeTab, setActiveTab] = useState<CourseTab>('curriculum');
  const content = { curriculum, doubts, mcqs }[activeTab];

  const curriculumMeta =
    weeksCount > 0
      ? `${weeksCount} ${weeksCount === 1 ? 'Week' : 'Weeks'}`
      : `${lessonsCount} ${lessonsCount === 1 ? 'Lesson' : 'Lessons'}`;

  const tabs: { id: CourseTab; label: string; countLabel: string; icon: typeof BookOpen }[] = [
    { id: 'curriculum', label: 'Course Curriculum', countLabel: curriculumMeta, icon: BookOpen },
    { id: 'doubts', label: 'Course Doubts', countLabel: String(doubtsCount), icon: MessageCircleQuestion },
    { id: 'mcqs', label: 'Course MCQs', countLabel: String(mcqsCount), icon: ClipboardList },
  ];

  return (
    <section className="course-content-tabs">
      <div className="course-section-tabs" role="tablist" aria-label="Course learning sections">
        {tabs.map(({ id, label, countLabel, icon: Icon }) => {
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
              <span>{label}</span>
              <span className={`course-section-tabs__count${selected ? ' is-active' : ''}`}>
                ({countLabel})
              </span>
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
