import React from 'react';
import VoiceLatexEditor from '@/components/latex/VoiceLatexEditor';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voice-Controlled LaTeX Workspace & Template Editor | BCE',
  description: 'Browser-based voice-controlled LaTeX Code Editor with live KaTeX rendering, ATS templates, and export tools.',
};

export default function LaTeXEditorPage() {
  return (
    <div style={{ padding: '0 0 var(--space-xl) 0', width: '100%' }}>
      <VoiceLatexEditor />
    </div>
  );
}
