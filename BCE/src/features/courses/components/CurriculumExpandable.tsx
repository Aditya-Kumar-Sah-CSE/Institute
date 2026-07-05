'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

export default function CurriculumExpandable({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Convert opaque children structure to a flat array
  const childrenArray = React.Children.toArray(children);
  
  if (childrenArray.length <= 1) {
    return <>{children}</>;
  }

  const displayedChildren = isExpanded ? childrenArray : childrenArray.slice(0, 1);

  return (
    <>
      <div className="curriculum-expandable-content">
        {displayedChildren}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)' }}>
        <Button 
          variant="ghost" 
          onClick={() => setIsExpanded(!isExpanded)} 
          style={{ 
            color: 'var(--neon-cyan)', 
            border: '1px solid rgba(0, 240, 255, 0.3)',
            padding: 'var(--space-sm) var(--space-xl)'
          }}
        >
          {isExpanded ? 'Show Less' : `Show More (${childrenArray.length - 1} more weeks)`}
        </Button>
      </div>
    </>
  );
}
