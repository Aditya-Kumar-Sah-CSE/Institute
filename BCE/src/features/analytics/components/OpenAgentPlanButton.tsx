'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { Sparkles } from 'lucide-react';
import { useSmartAgentSession } from '../context/SmartAgentSessionContext';

interface OpenAgentPlanButtonProps {
  label?: string;
  prompt?: string;
}

export default function OpenAgentPlanButton({
  label = 'Talk to Smart Agent about your learning plan →',
  prompt = 'Explain my personalized learning plan, why these topics are recommended, and what I should study today.'
}: OpenAgentPlanButtonProps) {
  const { openDrawer } = useSmartAgentSession();

  return (
    <Button 
      variant="primary" 
      size="sm" 
      onClick={() => openDrawer(prompt)}
      style={{ 
        gap: '6px', 
        whiteSpace: 'nowrap',
        background: 'linear-gradient(135deg, var(--neon-cyan) 0%, rgba(99, 102, 241, 1) 100%)',
        border: 'none',
        fontWeight: 'bold',
        padding: '10px 16px'
      }}
    >
      <Sparkles size={16} /> {label}
    </Button>
  );
}
