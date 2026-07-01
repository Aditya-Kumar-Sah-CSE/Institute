import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DoubtsRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('graduation_period, role').eq('id', user.id).single();

  if (!profile) return <div>Profile not found.</div>;

  if (profile.role === 'admin' || profile.role === 'instructor') {
    // For faculty, redirect to a default batch or a faculty hub (for now just redirect to their profile to select a batch)
    // You could create a faculty dashboard for all doubts later.
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h2>Faculty Doubts View</h2>
        <p>Please navigate to a specific batch or lesson to view doubts.</p>
      </div>
    );
  }

  if (!profile.graduation_period) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--neon-gold)' }}>Batch Not Assigned</h2>
        <p className="text-secondary" style={{ marginTop: 'var(--space-md)' }}>
          You need to have a batch (graduation period) set to access the doubts forum.
        </p>
      </div>
    );
  }

  redirect(`/batch/${profile.graduation_period}/doubts`);
}
