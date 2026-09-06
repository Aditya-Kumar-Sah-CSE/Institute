import React from 'react';
import VoiceLatexEditor from '@/components/latex/VoiceLatexEditor';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LaTeX Workspace Tool | SkillArena Tenant Dashboard',
  description: 'Voice-controlled LaTeX Workspace for courses, assignments, and exam paper creation.',
};

export default function DashboardLatexEditorPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0e14', padding: '1rem' }}>
      <VoiceLatexEditor />
    </div>
  );
}
