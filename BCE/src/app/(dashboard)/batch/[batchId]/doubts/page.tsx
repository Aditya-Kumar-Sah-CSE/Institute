import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import HubDoubtCard from './components/HubDoubtCard';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function BatchDoubtsPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ batchId: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { batchId } = await params;
  const sp = await searchParams;
  const filter = typeof sp.filter === 'string' ? sp.filter : 'all';
  const query = typeof sp.q === 'string' ? sp.q : '';

  const decodedBatchId = decodeURIComponent(batchId);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('graduation_period, role').eq('id', user.id).single();
  if (!profile) return <div>Profile not found.</div>;

  const isFaculty = profile.role === 'admin' || profile.role === 'instructor';
  
  if (!isFaculty && profile.graduation_period !== decodedBatchId) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--neon-pink)' }}>Access Denied</h2>
        <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
          You don't have access to the doubts hub for batch {decodedBatchId}.
        </p>
      </div>
    );
  }

  // Get enrolled courses for student
  let enrolledCourseIds: string[] = [];
  if (!isFaculty) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', user.id);

    if (enrollments) {
      enrolledCourseIds = enrollments.map(e => e.course_id);
    }
  }

  // Base query
  let doubtsQuery = supabase
    .from('doubts')
    .select(`
      *, 
      author:profiles(name, avatar_url, role), 
      course:courses(id, title), 
      lesson:lessons(id, title),
      view_count:doubt_views(count),
      replies:doubt_replies(count)
    `)
    .eq('batch', decodedBatchId);

  // Filter by enrolled courses for students
  if (!isFaculty) {
    if (enrolledCourseIds.length > 0) {
      const idsString = enrolledCourseIds.join(',');
      doubtsQuery = doubtsQuery.or(`course_id.in.(${idsString}),course_id.is.null`);
    } else {
      doubtsQuery = doubtsQuery.is('course_id', null);
    }
  }

  // Apply filters
  if (filter === 'unanswered') {
    doubtsQuery = doubtsQuery.eq('status', 'open');
  } else if (filter === 'solved') {
    doubtsQuery = doubtsQuery.eq('status', 'resolved');
  }

  // Search
  if (query) {
    doubtsQuery = doubtsQuery.ilike('title', `%${query}%`);
  }

  // Apply sorting
  if (filter === 'most-active') {
    // In PostgREST, ordering by a relation count is tricky without a dedicated column or RPC.
    // For now, we order by created_at. In a real highly-scaled app, we'd use a materialised view or trigger column.
    doubtsQuery = doubtsQuery.order('created_at', { ascending: false }); 
  } else {
    doubtsQuery = doubtsQuery.order('created_at', { ascending: false });
  }

  const { data: doubts, error } = await doubtsQuery;

  if (error) {
    console.error('Batch Doubts fetch error:', error);
  }

  const userLikes = new Set<string>();
  if (doubts && doubts.length > 0) {
    const doubtIds = doubts.map(d => d.id);
    const { data: likesData } = await supabase
      .from('doubt_likes')
      .select('doubt_id')
      .eq('user_id', user.id)
      .in('doubt_id', doubtIds);
      
    if (likesData) {
      likesData.forEach(l => userLikes.add(l.doubt_id));
    }
    
    doubts.forEach(d => {
      d.has_liked = userLikes.has(d.id);
    });
  }

  const filterOptions = [
    { id: 'all', label: 'Recent' },
    { id: 'unanswered', label: 'Unanswered' },
    { id: 'solved', label: 'Solved' },
    // { id: 'most-active', label: 'Most Active' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', margin: 0, background: 'linear-gradient(45deg, var(--neon-blue), var(--neon-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Batch Hub: {decodedBatchId}
          </h1>
          <p className="text-secondary" style={{ marginTop: 'var(--space-2xs)' }}>
            Discuss doubts with your batchmates and faculty.
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
        {filterOptions.map(opt => (
          <Link key={opt.id} href={`/batch/${batchId}/doubts?filter=${opt.id}${query ? `&q=${query}` : ''}`} style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '6px 16px',
              borderRadius: '20px',
              background: filter === opt.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: filter === opt.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              border: '1px solid',
              borderColor: filter === opt.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)'
            }}>
              {opt.label}
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {doubts && doubts.length > 0 ? (
          doubts.map((doubt: any) => (
            <HubDoubtCard key={doubt.id} doubt={doubt} batchId={decodedBatchId} />
          ))
        ) : (
          <Card variant="glass" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 'var(--space-md)' }}>🤷‍♂️</span>
            <h3 style={{ color: 'var(--text-primary)' }}>No doubts found</h3>
            <p className="text-secondary">It's quiet in here...</p>
          </Card>
        )}
      </div>
    </div>
  );
}
