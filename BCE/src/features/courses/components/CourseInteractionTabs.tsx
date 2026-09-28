'use client';

import { ReactNode, useState } from 'react';
import { BellRing, ChartNoAxesColumnIncreasing, Megaphone } from 'lucide-react';

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
    <div>
      <div role="tablist" aria-label="Course interactions" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px 12px', borderBottom: '1px solid var(--border-divider)' }}>
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
      <div id="course-interaction-panel" role="tabpanel" aria-labelledby={`course-interaction-tab-${activeTab}`} style={{ paddingTop: 'var(--space-md)' }}>
        {content}
      </div>
    </div>
  );
}
