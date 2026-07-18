import React from 'react';
import { createClient } from '@/lib/supabase/server';
import CourseDoubtsClient from './CourseDoubtsClient';

interface CourseDoubtsSectionProps {
  courseId: string;
  isEnrolledOrFaculty: boolean;
}

export default async function CourseDoubtsSection({ courseId, isEnrolledOrFaculty }: CourseDoubtsSectionProps) {
  if (!isEnrolledOrFaculty) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id || '';
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUserId).single();
  const isFaculty = profile?.role === 'admin' || profile?.role === 'instructor';

  const { data: doubts, error } = await supabase
    .from('doubts')
    .select(`
      *,
      author:profiles(name, avatar_url, role),
      view_count:doubt_views(count),
      replies:doubt_replies(count),
      lesson:lessons(id, title)
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching course doubts:', error);
  }

  const userLikes = new Set<string>();
  if (doubts && doubts.length > 0 && currentUserId) {
    const doubtIds = doubts.map(d => d.id);
    const { data: likesData } = await supabase
      .from('doubt_likes')
      .select('doubt_id')
      .eq('user_id', currentUserId)
      .in('doubt_id', doubtIds);
      
    if (likesData) {
      likesData.forEach(l => userLikes.add(l.doubt_id));
    }
    
    doubts.forEach(d => {
      d.has_liked = userLikes.has(d.id);
    });
  }

  return (
    <CourseDoubtsClient 
      courseId={courseId} 
      initialDoubts={doubts || []} 
      currentUserId={currentUserId}
      isFaculty={isFaculty}
    />
  );
}
