import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCoursePolls } from '../actions/polls';
import CoursePollsClient from './CoursePollsClient';
import CreatePollWidget from './CreatePollWidget';
import CreateAlertSection from './CreateAlertSection';

interface CoursePollsSectionProps {
  courseId: string;
  currentUserId: string;
  isEnrolledOrFaculty: boolean;
}

export default async function CoursePollsSection({ courseId, currentUserId, isEnrolledOrFaculty }: CoursePollsSectionProps) {
  if (!isEnrolledOrFaculty) return null; // Only enrolled students/faculty can see polls

  const supabase = await createClient();
  const { data: course } = await supabase.from('courses').select('created_by').eq('id', courseId).single();
  const isCreator = course?.created_by === currentUserId;

  const { data: enrollment } = await supabase.from('enrollments').select('status').eq('course_id', courseId).eq('user_id', currentUserId).single();
  const isEnrolled = enrollment?.status === 'approved';

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUserId).single();
  const isFaculty = profile?.role === 'admin' || profile?.role === 'instructor';
  
  const canAlert = isCreator || isEnrolled;

  const { data: polls, error } = await getCoursePolls(courseId);

  if (error) {
    console.error('Error fetching course polls:', error);
    return null;
  }

  const hasPollContent = polls && polls.length > 0;

  return (
    <div style={{ marginBottom: 'var(--space-2xl)' }}>
      {/* Desktop: 50/50 two-column layout for Alert + Polls creation */}
      <div className="polls-desktop-grid">
        {/* Left column: Emergency Alert */}
        {canAlert && (
          <div className="polls-desktop-col-left">
            <CreateAlertSection courseId={courseId} />
          </div>
        )}

        {/* Right column: Course Polls creation & List */}
        <div className={`polls-desktop-col-right ${!canAlert ? 'polls-desktop-col-full' : ''}`}>
          <CreatePollWidget courseId={courseId} />
          
          {hasPollContent ? (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <CoursePollsClient polls={polls} currentUserId={currentUserId} isFaculty={isFaculty} />
            </div>
          ) : (
            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)', marginTop: 'var(--space-md)' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No active polls for this course.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
