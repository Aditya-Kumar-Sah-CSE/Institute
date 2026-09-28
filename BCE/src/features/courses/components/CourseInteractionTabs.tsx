'use client';

import { ReactNode, useState } from 'react';
import { BellRing, ChartNoAxesColumnIncreasing, Megaphone } from 'lucide-react';
import './CourseSectionTabs.css';

type InteractionTab = 'alert' | 'poll' | 'notice';

const tabs: { id: InteractionTab; label: string; icon: typeof BellRing }[] = [
  { id: 'alert', label: 'Alert', icon: BellRing },
  { id: 'poll', label: 'Poll', icon: ChartNoAxesColumnIncreasing },
  { id: 'notice', label: 'Notice', icon: Megaphone },
];

export default function CourseInteractionTabs({
  alert,
  poll,
  notice,
}: {
  alert: ReactNode;
  poll: ReactNode;
  notice: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<InteractionTab>('alert');
  const content = { alert, poll, notice }[activeTab];

  return (
    <div style={{ minWidth: 0 }}>
      <div className="course-section-tabs" role="tablist" aria-label="Course interactions">
        {tabs.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id;
          return (
            <button
              key={id}
              id={`course-interaction-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="course-interaction-panel"
              onClick={() => setActiveTab(id)}
              className={`course-section-tabs__button${selected ? ' is-active' : ''}`}
            >
              <Icon size={17} />{label}
            </button>
          );
        })}
      </div>
      <div className="course-section-tab-panel" id="course-interaction-panel" role="tabpanel" aria-labelledby={`course-interaction-tab-${activeTab}`}>
        {content}
      </div>
    </div>
  );
}
