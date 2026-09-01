'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Activity, Settings, BellRing } from 'lucide-react';
import './CollapsibleInteractionsWrapper.css';

interface CollapsibleInteractionsWrapperProps {
  children: React.ReactNode;
  courseId: string;
}

export default function CollapsibleInteractionsWrapper({ children, courseId }: CollapsibleInteractionsWrapperProps) {
  // Use course-specific key to allow different settings per course
  const storageKey = `bce_course_${courseId}_interactions_state`;
  
  // States: 'open', 'collapsed', 'hidden'
  const [wrapperState, setWrapperState] = useState<'open' | 'collapsed' | 'hidden'>('collapsed');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const savedState = localStorage.getItem(storageKey);
    if (savedState === 'open' || savedState === 'collapsed' || savedState === 'hidden') {
      setWrapperState(savedState);
    }
    setIsLoaded(true);
  }, [storageKey]);

  const updateState = (newState: 'open' | 'collapsed' | 'hidden') => {
    setWrapperState(newState);
    localStorage.setItem(storageKey, newState);
  };

  if (!isLoaded) return null; // Avoid hydration mismatch
  if (wrapperState === 'hidden') return null;

  return (
    <div className={`interactions-wrapper ${wrapperState === 'open' ? 'is-open' : 'is-collapsed'}`}>
      <div 
        className="interactions-header" 
        onClick={() => updateState(wrapperState === 'open' ? 'collapsed' : 'open')}
      >
        <div className="interactions-header-title">
          <div className="interactions-header-icon">
            <BellRing size={18} />
          </div>
          <div>
            <h3>Course Interactions</h3>
            <p>Emergency Alerts & Polls</p>
          </div>
        </div>
        
        <div className="interactions-header-actions" onClick={e => e.stopPropagation()}>
          <button 
            className="interactions-action-btn"
            title={wrapperState === 'open' ? "Collapse" : "Expand"}
            onClick={() => updateState(wrapperState === 'open' ? 'collapsed' : 'open')}
          >
            <ChevronDown size={20} className={`chevron-icon ${wrapperState === 'open' ? 'rotated' : ''}`} />
          </button>
        </div>
      </div>
      
      <div className="interactions-content">
        <div className="interactions-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
