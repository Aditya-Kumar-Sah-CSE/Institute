import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCoursePolls } from '../actions/polls';
import PollCard, { Poll } from './PollCard';
import CreatePollButton from './CreatePollButton';

interface CoursePollsSectionProps {
  courseId: string;
  currentUserId: string;
  isEnrolledOrFaculty: boolean;
}

export default async function CoursePollsSection({ courseId, currentUserId, isEnrolledOrFaculty }: CoursePollsSectionProps) {
  if (!isEnrolledOrFaculty) return null; // Only enrolled students/faculty can see polls

  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUserId).single();
  const isFaculty = profile?.role === 'admin' || profile?.role === 'instructor';

  const { data: polls, error } = await getCoursePolls(courseId);

  if (error) {
    console.error('Error fetching course polls:', error);
    return null;
  }

  if (!polls || polls.length === 0) {
    return (
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Course Polls</h2>
          <CreatePollButton courseId={courseId} />
        </div>
        <div style={{ padding: 'var(--space-lg)', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No active polls for this course.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Course Polls</h2>
        <CreatePollButton courseId={courseId} />
      </div>
      <div className="polls-flex">
        {polls.map((poll: any) => (
          <PollCard key={poll.id} poll={poll as Poll} currentUserId={currentUserId} isFaculty={isFaculty} />
        ))}
      </div>
    </div>
  );
}
