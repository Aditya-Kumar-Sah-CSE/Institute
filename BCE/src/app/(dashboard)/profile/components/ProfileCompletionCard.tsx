'use client';

import React, { useState } from 'react';
import { calculateProfileCompletion, ProfileCompletionResult } from '@/lib/profile-completion';
import { Profile } from '@/types/database';
import Card from '@/components/ui/Card';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, Award } from 'lucide-react';

interface ProfileCompletionCardProps {
  profile: Profile | null;
}

export default function ProfileCompletionCard({ profile }: ProfileCompletionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const result: ProfileCompletionResult = calculateProfileCompletion(profile);
  const { percentage, items, completedCount, totalCount } = result;

  const getGradient = (pct: number) => {
    if (pct >= 80) return 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)';
    if (pct >= 50) return 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)';
    return 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)';
  };

  const getStatusText = (pct: number) => {
    if (pct === 100) return 'All Set! Outstanding Profile 🌟';
    if (pct >= 80) return 'Almost Complete! Looking Great ✨';
    if (pct >= 50) return 'Good Progress! Keep Going 🚀';
    return 'Basic Profile. Add details to unlock full potential 📈';
  };

  return (
    <Card variant="glass" className="profile-completion-card" style={{ overflow: 'hidden', border: '1px solid rgba(6, 182, 212, 0.3)', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ 
              position: 'relative', 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: getGradient(percentage),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
            }}>
              {percentage}%
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                Profile Completion <Sparkles size={16} style={{ color: 'var(--neon-cyan)' }} />
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {getStatusText(percentage)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '20px',
              padding: '6px 14px',
              color: 'var(--neon-cyan)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <span>{completedCount}/{totalCount} Completed</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'rgba(0, 0, 0, 0.3)', overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${percentage}%`, 
              height: '100%', 
              background: getGradient(percentage), 
              borderRadius: '4px',
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' 
            }} 
          />
        </div>

        {/* Expandable Checklist */}
        {isExpanded && (
          <div style={{ 
            marginTop: 'var(--space-xs)', 
            paddingTop: 'var(--space-md)', 
            borderTop: '1px solid var(--glass-border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 'var(--space-sm)'
          }}>
            {items.map(item => (
              <div 
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-xs)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: item.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${item.completed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`
                }}
              >
                {item.completed ? (
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <Circle size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: item.completed ? '#10b981' : 'var(--text-primary)' }}>
                    {item.label} ({item.weight}%)
                  </div>
                  {!item.completed && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {item.hint}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
