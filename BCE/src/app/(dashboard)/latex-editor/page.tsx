import React, { Suspense } from 'react';
import LaTeXEditorClient from '@/components/latex/LaTeXEditorClient';

export const metadata = {
  title: 'LaTeX Editor & ATS Resume Builder | BCE',
  description: 'Browser-based LaTeX Code Editor with ATS Resume Template, LocalStorage Persistence, and Real-Time ATS Preview.',
};

export default function LaTeXEditorPage() {
  return (
    <div style={{ padding: '0 0 var(--space-xl) 0', width: '100%' }}>
      <Suspense fallback={
        <div style={{ 
          height: '600px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'var(--bg-surface)', 
          borderRadius: '12px',
          color: 'var(--text-muted)' 
        }}>
          Loading LaTeX Editor...
        </div>
      }>
        <LaTeXEditorClient />
      </Suspense>
    </div>
  );
}
