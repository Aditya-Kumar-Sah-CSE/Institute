"use client";

import { useState } from 'react';
import { MoreVertical, X } from 'lucide-react';
import Card from '@/components/ui/Card';

export default function ExpandableSettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card variant="glass">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>{title}</h2>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          type="button" 
          style={{ 
            background: 'var(--interactive-hover)', 
            border: '1px solid var(--border-divider)', 
            cursor: 'pointer', 
            color: 'var(--text-secondary)',
            padding: 'var(--space-sm)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)'
          }}
          className="hover:text-accent-primary"
        >
          {isOpen ? <X size={20} /> : <MoreVertical size={20} />}
        </button>
      </div>
      
      <div 
        style={{ 
          marginTop: isOpen ? 'var(--space-lg)' : '0',
          maxHeight: isOpen ? '2000px' : '0',
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {children}
      </div>
    </Card>
  );
}
