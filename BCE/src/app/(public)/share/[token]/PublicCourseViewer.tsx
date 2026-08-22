'use client';

import { useState } from 'react';
import { BookOpen, Award, Clock, ArrowRight, UserCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import LoginRequiredModal from '@/components/shared/LoginRequiredModal';

interface PublicCourseViewerProps {
  course: any;
  shareExpiresAt: string;
}

export default function PublicCourseViewer({ course, shareExpiresAt }: PublicCourseViewerProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div style={{
      maxWidth: '680px',
      width: '100%',
      margin: '40px auto',
      background: 'rgba(15, 23, 42, 0.4)',
      border: '1px solid var(--glass-border)',
      borderRadius: '16px',
      padding: '32px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-cyan)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
        <BookOpen size={14} /> Shared Course Credentials
      </div>

      <div>
        <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 10px 0', color: '#ffffff' }}>{course.title}</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
          {course.description || 'Learn advanced software development concepts through curated lessons and hands-on coding sheets.'}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '16px 0'
      }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Difficulty</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', textTransform: 'capitalize' }}>
            {course.difficulty || 'Intermediate'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Status</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: course.is_completed ? '#4ade80' : '#38bdf8' }}>
            {course.is_completed ? 'Completed' : 'Active'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Created</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>
            {new Date(course.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
        <Button
          onClick={() => setShowLoginModal(true)}
          style={{
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
            fontWeight: 800,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            padding: '12px'
          }}
        >
          Enroll in Course <ArrowRight size={16} />
        </Button>
      </div>

      <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
        This temporary share view will automatically expire in 30 minutes.
      </div>

      <LoginRequiredModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
