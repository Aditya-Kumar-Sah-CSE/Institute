'use client';

import React from 'react';
import { LivePageContextProvider } from '@/features/analytics/context/LivePageContext';
import { SmartAgentSessionProvider } from '@/features/analytics/context/SmartAgentSessionContext';
import FloatingAgentButton from '@/features/analytics/components/FloatingAgentButton';

/**
 * Global persistent Smart Agent provider mounted at root layout level.
 * Guarantees a SINGLE continuous Smart Agent session across Student, Instructor, Admin, and Developer panels.
 */
export default function GlobalAgentProvider({ children }: { children: React.ReactNode }) {
  return (
    <LivePageContextProvider>
      <SmartAgentSessionProvider>
        {children}
        <FloatingAgentButton />
      </SmartAgentSessionProvider>
    </LivePageContextProvider>
  );
}
