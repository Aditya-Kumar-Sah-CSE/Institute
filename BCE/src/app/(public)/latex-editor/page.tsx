import React from 'react';
import VoiceLatexEditor from '@/components/latex/VoiceLatexEditor';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voice-Controlled LaTeX Workspace & Template Editor | SkillArena',
  description: 'Interactive voice-controlled LaTeX code editor with live KaTeX rendering, Hinglish/English voice parser, template library, and export tools.',
};

export default function PublicLatexEditorPage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0b0e14' }}>
      <VoiceLatexEditor />
    </main>
  );
}
