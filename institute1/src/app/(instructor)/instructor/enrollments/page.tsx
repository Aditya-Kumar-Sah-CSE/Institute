import { getPendingEnrollments, approveEnrollmentFormAction, rejectEnrollmentFormAction } from '@/features/instructor/actions/enrollments';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface PendingEnrollmentReq {
  id: string;
  enrolled_at: string;
  courses: { title: string };
  profiles: { name: string; email: string; institute_id: string };
}

export default async function InstructorEnrollmentsPage() {
  const { data: enrollments, error } = await getPendingEnrollments();

  return (
    <div className="instructor-enrollments-page">
      <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 className="text-gradient">Enrollment Requests</h1>
        <p className="text-secondary">Approve or reject students wanting to join your courses.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!enrollments || enrollments.length === 0 ? (
        <Card variant="glass" className="empty-state">
          <p>No pending enrollment requests.</p>
        </Card>
      ) : (
        <div className="enrollment-requests-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {(enrollments as unknown as PendingEnrollmentReq[]).map((req) => (
            <Card key={req.id} variant="glass" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
              <div style={{ flex: '1 1 300px' }}>
                <h3 style={{ margin: '0 0 var(--space-xs) 0' }}>{req.profiles.name} ({req.profiles.email})</h3>
                {req.profiles.institute_id ? (
                  <p style={{ margin: '0 0 var(--space-xs) 0', color: 'var(--neon-cyan)', fontSize: 'var(--text-sm)' }}>
                    ID: {req.profiles.institute_id}
                  </p>
                ) : (
                  <p style={{ margin: '0 0 var(--space-xs) 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    ID: Not provided
                  </p>
                )}
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Requested to join <strong>{req.courses.title}</strong> on {new Date(req.enrolled_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <form action={approveEnrollmentFormAction.bind(null, req.id)}>
                  <Button variant="primary" type="submit" confirmMessage="Are you sure you want to approve this student to enroll in the course?">Approve</Button>
                </form>
                <form action={rejectEnrollmentFormAction.bind(null, req.id)}>
                  <Button variant="danger" type="submit" confirmMessage="Are you sure you want to reject this enrollment request?">Reject</Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
