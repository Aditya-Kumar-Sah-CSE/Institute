import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DiscussionThread from './components/DiscussionThread';

export const dynamic = 'force-dynamic';

export default async function DiscussionPage({ 
  params 
}: { 
  params: Promise<{ courseId: string, lessonId: string, doubtId: string }> 
}) {
  const { doubtId } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  
  const { data: profile } = await supabase.from('profiles').select('id, name, avatar_url, role').eq('id', user.id).single();
  if (!profile) return <div>Profile error</div>;

  // Fetch the doubt with everything
  const { data: doubt, error } = await supabase
    .from('doubts')
    .select(`
      *,
      author:profiles(name, avatar_url, role),
      course:courses(title),
      lesson:lessons(title),
      tags:doubt_tags(tag_name),
      likes:doubt_likes(user_id)
    `)
    .eq('id', doubtId)
    .single();

  if (error || !doubt) {
    console.error(error);
    return <div>Doubt not found or you don't have access.</div>;
  }

  // Fetch replies, we will organize them into a tree on the client
  const { data: replies, error: repliesErr } = await supabase
    .from('doubt_replies')
    .select(`
      *,
      author:profiles(name, avatar_url, role),
      votes:reply_votes(user_id, vote_type)
    `)
    .eq('doubt_id', doubtId)
    .order('created_at', { ascending: true });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <DiscussionThread 
        doubt={doubt} 
        replies={replies || []} 
        currentUser={profile} 
      />
    </div>
  );
}
