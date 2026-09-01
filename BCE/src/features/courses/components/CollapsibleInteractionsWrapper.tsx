'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, X, ChevronDown, Activity, Settings, BellRing } from 'lucide-react';
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
  const [showMenu, setShowMenu] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const savedState = localStorage.getItem(storageKey);
    if (savedState === 'open' || savedState === 'collapsed' || savedState === 'hidden') {
      setWrapperState(savedState);
    }
    setIsLoaded(true);

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [storageKey]);

  const updateState = (newState: 'open' | 'collapsed' | 'hidden') => {
    setWrapperState(newState);
    localStorage.setItem(storageKey, newState);
    setShowMenu(false);
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
          
          <div className="interactions-menu-container" ref={menuRef}>
            <button 
              className="interactions-action-btn"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical size={20} />
            </button>
            
            {showMenu && (
              <div className="interactions-dropdown-menu">
                <button onClick={() => updateState('collapsed')}>
                  Collapse Menu
                </button>
                <button onClick={() => updateState('hidden')} className="danger-text">
                  Hide Completely
                </button>
              </div>
            )}
          </div>
          
          <button 
            className="interactions-action-btn"
            title="Close"
            onClick={() => updateState('collapsed')}
          >
            <X size={20} />
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
