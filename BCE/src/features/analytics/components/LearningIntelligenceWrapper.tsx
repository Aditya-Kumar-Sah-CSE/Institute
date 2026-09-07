'use client';

import React, { useState, ReactNode } from 'react';
import Card from '@/components/ui/Card';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface LearningIntelligenceWrapperProps {
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  badgeText?: string;
  headerActions?: ReactNode;
  variant?: 'card' | 'glass' | 'bare';
  padding?: string;
  style?: React.CSSProperties;
  className?: string;
  badgeStyle?: React.CSSProperties;
  showBadge?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

/**
 * LearningIntelligenceWrapper
 * 
 * Standard wrapper container for Student-Aware Learning Intelligence analytics cards,
 * modals, drawers, and performance views. Includes top-right "✦ Student-Aware Learning Intelligence ^"
 * badge and an optional interactive toggle (^ / v) that defaults to closed.
 */
export default function LearningIntelligenceWrapper({
  children,
  title,
  subtitle,
  icon,
  badgeText = '✦ Student-Aware Learning Intelligence',
  headerActions,
  variant = 'card',
  padding = 'var(--space-lg)',
  style,
  className = '',
  badgeStyle,
  showBadge = true,
  collapsible = false,
  defaultCollapsed = true,
}: LearningIntelligenceWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(collapsible ? defaultCollapsed : false);

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed((prev) => !prev);
    }
  };

  const badgeElement = showBadge ? (
    <div
      onClick={collapsible ? toggleCollapse : undefined}
      className="student-aware-badge"
      title={collapsible ? (isCollapsed ? 'Click to expand details' : 'Click to collapse details') : undefined}
      style={{
        fontSize: '10px',
        fontWeight: '600',
        color: 'var(--neon-cyan, #00e5ff)',
        background: 'rgba(0, 229, 255, 0.12)',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        padding: '3px 10px',
        borderRadius: '12px',
        whiteSpace: 'nowrap',
        letterSpacing: '0.3px',
        boxShadow: '0 0 10px rgba(0, 229, 255, 0.15)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        flexShrink: 0,
        cursor: collapsible ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        ...badgeStyle,
      }}
    >
      <span>{badgeText}</span>
      {collapsible && (
        <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--neon-cyan)' }}>
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      )}
    </div>
  ) : null;

  const content = (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md, 16px)',
        width: '100%',
        ...style,
      }}
      className={className}
    >
      {(title || subtitle || icon || headerActions || showBadge) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: (!isCollapsed && children) ? '4px' : 0,
          }}
        >
          {(title || icon || subtitle) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {icon}
                {title && (
                  <h3 style={{ margin: 0, fontSize: 'var(--text-md, 16px)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {title}
                  </h3>
                )}
              </div>
              {subtitle && (
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
            {headerActions}
            {badgeElement}

            {collapsible && !showBadge && (
              <button
                type="button"
                onClick={toggleCollapse}
                style={{
                  background: 'rgba(0, 229, 255, 0.12)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  color: 'var(--neon-cyan)',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title={isCollapsed ? 'Expand section (^)' : 'Collapse section (v)'}
              >
                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}
          </div>
        </div>
      )}

      {!isCollapsed && children}
    </div>
  );

  if (variant === 'bare') {
    return content;
  }

  return (
    <Card
      variant={variant === 'glass' ? 'glass' : 'default'}
      style={{
        padding,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(0, 229, 255, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {content}
    </Card>
  );
}
