import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { InstructorRegistrationForm, InstructorApplicationForm } from './ApplyForms';

export default async function ApplyInstructorPage({ searchParams }: { searchParams: Promise<{ reapply?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const resolvedSearchParams = await searchParams;
  const reapply = resolvedSearchParams?.reapply === 'true';

  // If already logged in, check if they are already an instructor or pending
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).single();
    if (profile?.role === 'instructor' || profile?.role === 'admin') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <Card variant="glass" padding="lg" style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1 style={{ color: 'var(--neon-lime)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-md)' }}>Congratulations!</h1>
            <p className="text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
              You are already an approved instructor.
            </p>
            <a href="/instructor" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Go to Instructor Dashboard</Button>
            </a>
          </Card>
        </div>
      );
    }

    // Check if they have a pending or rejected application
    const { data: appData } = await supabase
      .from('instructor_applications')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (appData?.status === 'pending') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <Card variant="glass" padding="lg" style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1 className="text-gradient" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-md)' }}>Application Received</h1>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308', fontWeight: 'bold' }}>Status: Pending</span>
            </div>
            <p className="text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
              Your instructor application has been submitted and is currently awaiting admin approval. We will notify you once reviewed.
            </p>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Go to Dashboard</Button>
            </Link>
          </Card>
        </div>
      );
    } else if (appData?.status === 'rejected' && !reapply) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <Card variant="glass" padding="lg" style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1 style={{ color: 'var(--neon-red)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-md)' }}>OOPs!</h1>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 'bold' }}>Status: Rejected</span>
            </div>
            <p className="text-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
              Your previous application was rejected. Please contact the admin for details.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <Button variant="secondary">Back to Dashboard</Button>
              </Link>
              <Link href="/apply-instructor?reapply=true" style={{ textDecoration: 'none' }}>
                <Button variant="primary">Reapply</Button>
              </Link>
            </div>
          </Card>
        </div>
      );
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-2xl) 0' }}>
      <Card variant="glass" padding="lg" style={{ width: '100%', maxWidth: '600px' }}>
        <h1 className="text-gradient" style={{ fontSize: 'var(--text-3xl)', textAlign: 'center', marginBottom: 'var(--space-sm)' }}>
          Become an Instructor
        </h1>
        <p className="text-secondary" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          Share your knowledge with thousands of students. Apply today!
        </p>

        {!user ? (
          <InstructorRegistrationForm />
        ) : (
          <InstructorApplicationForm userEmail={user.email || ''} />
        )}

        {!user && (
          <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', fontSize: 'var(--text-sm)' }}>
            <span className="text-secondary">Already have an account? </span>
            <Link href="/login" style={{ color: 'var(--neon-cyan)', fontWeight: 'var(--weight-semibold)' }}>
              Log in first to apply
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
