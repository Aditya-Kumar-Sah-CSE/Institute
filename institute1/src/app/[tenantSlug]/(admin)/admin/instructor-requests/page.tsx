import { createClient } from '@/lib/supabase/server';
import { TenantAdminService } from '@/services/tenant/tenantAdminService';
import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { approveInstructor, rejectInstructor } from '@/features/admin/actions/instructor-actions';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';
import ActionButtons from './ActionButtons';

export default async function InstructorRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }
  const { data: profile } = await supabase.from('profiles').select('role, institution_id').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return null;
  }

  let requests: any[] = [];
  let approvedRequests: any[] = [];
  let errorMsg = '';

  try {
    const data = await TenantAdminService.getInstructorApplications(profile.institution_id);
    requests = data.requests;
    approvedRequests = data.approvedRequests;
  } catch (err: any) {
    errorMsg = err.message || 'Failed to load applications';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
      <div className="page-header">
        <h1 className="text-gradient">Instructor Approval Panel</h1>
        <p className="text-secondary">Review and approve applications to become an instructor.</p>
      </div>

      {errorMsg && (
        <div style={{ padding: '1rem', background: '#ffcccc', color: '#cc0000', borderRadius: '8px' }}>
          <h3>Database Error (For debugging):</h3>
          <p>{errorMsg}</p>
        </div>
      )}

      <section>
        <h2 style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>Pending Requests</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
          {requests && requests.length > 0 ? (
            requests.map(request => (
              <Card key={request.id} variant="glass" padding="lg">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{request.profiles?.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{request.profiles?.email}</p>
                    {request.profiles?.institute_id && (
                      <p style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
                        Institute ID: <strong>{request.profiles.institute_id}</strong>
                      </p>
                    )}
                  </div>
                  <span suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Applied {request.submitted_at ? formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true }) : ''}
                  </span>
                </div>
                
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '4px' }}>Bio</h4>
                  <p style={{ fontSize: 'var(--text-sm)', background: 'var(--bg-input)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                    {request.bio}
                  </p>
                </div>

                <div style={{ marginBottom: 'var(--space-xl)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '4px' }}>Experience</h4>
                  <p style={{ fontSize: 'var(--text-sm)', background: 'var(--bg-input)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap' }}>
                    {request.experience}
                  </p>
                </div>

                <ActionButtons applicationId={request.id} userId={request.user_id} />
              </Card>
            ))
          ) : (
            <Card variant="glass" padding="lg" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-md)' }}> inbox_zero </div>
              <p className="text-secondary">No pending instructor requests.</p>
            </Card>
          )}
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>Approved Instructors</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
          {approvedRequests && approvedRequests.length > 0 ? (
            approvedRequests.map(request => (
              <Card key={request.id} variant="glass" padding="lg">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{request.profiles?.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{request.profiles?.email}</p>
                    {request.profiles?.institute_id && (
                      <p style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
                        Institute ID: <strong>{request.profiles.institute_id}</strong>
                      </p>
                    )}
                  </div>
                  <span suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Approved {request.approved_at ? formatDistanceToNow(new Date(request.approved_at), { addSuffix: true }) : ''}
                  </span>
                </div>
                
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '4px' }}>Bio</h4>
                  <p style={{ fontSize: 'var(--text-sm)', background: 'var(--bg-input)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                    {request.bio}
                  </p>
                </div>

                <div style={{ marginBottom: 'var(--space-xl)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '4px' }}>Experience</h4>
                  <p style={{ fontSize: 'var(--text-sm)', background: 'var(--bg-input)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', whiteSpace: 'pre-wrap' }}>
                    {request.experience}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <form action={rejectInstructor.bind(null, request.id, request.user_id)} style={{ flex: 1 }}>
                    <Button type="submit" variant="danger" style={{ width: '100%' }}>Revoke Access</Button>
                  </form>
                </div>
              </Card>
            ))
          ) : (
            <Card variant="glass" padding="lg" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-md)' }}> 👨‍🏫 </div>
              <p className="text-secondary">No approved instructors yet.</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}


