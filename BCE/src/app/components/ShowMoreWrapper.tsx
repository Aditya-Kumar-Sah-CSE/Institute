'use client';
import React, { useState } from 'react';

interface ShowMoreWrapperProps {
  children: React.ReactNode[];
  initialCount: number;
  showMoreText?: string;
  showLessText?: string;
}

export default function ShowMoreWrapper({
  children,
  initialCount,
  showMoreText = 'Show More',
  showLessText = 'Show Less',
}: ShowMoreWrapperProps) {
  const [expanded, setExpanded] = useState(false);
  const items = React.Children.toArray(children);
  const visible = expanded ? items : items.slice(0, initialCount);
  const hasMore = items.length > initialCount;

  return (
    <>
      {visible}
      {hasMore && (
        <button
          className="show-more-btn"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? showLessText : showMoreText}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              marginLeft: '6px',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </>
  );
}
