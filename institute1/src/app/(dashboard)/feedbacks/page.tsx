import { getUserFeedbacks } from '@/features/feedback/actions/feedback';
import Card from '@/components/ui/Card';
import type { Feedback } from '@/types';

import { createClient } from '@/lib/supabase/server';

export default async function StudentFeedbacksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: feedbacks, error } = await getUserFeedbacks();

  if (user) {
    // Mark notifications as read in the DB for future page loads
    await supabase.from('feedbacks')
      .update({ status: 'resolved' })
      .eq('user_id', user.id)
      .eq('category', 'Notification')
      .eq('status', 'open');
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Bug': return 'var(--neon-pink)';
      case 'Issue': return 'var(--neon-cyan)';
      case 'Doubt': return 'var(--neon-purple)';
      default: return 'var(--text-secondary)';
    }
  };

  let notificationCount = 0;

  return (
    <div className="student-feedbacks-page">
      <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 className="text-gradient">Notifications</h1>
        <p className="text-secondary">View your system notifications and feedback updates.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!feedbacks || feedbacks.length === 0 ? (
        <Card variant="glass" className="empty-state">
          <p>You haven&apos;t submitted any feedback, issues, or doubts yet.</p>
        </Card>
      ) : (
        <div className="feedback-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {(feedbacks as unknown as Feedback[]).map((fb) => {
            let isRecentNotification = false;
            if (fb.category === 'Notification') {
              notificationCount++;
              if (notificationCount <= 5) {
                isRecentNotification = true;
              }
            }

            return (
              <Card key={fb.id} variant="glass" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 var(--space-xs) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      {fb.category === 'Notification' ? 'System Notice' : 'Feedback'}
                    </h3>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      color: getCategoryColor(fb.category),
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      {fb.category}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div suppressHydrationWarning style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(fb.created_at).toLocaleString()}
                    </div>
                    {fb.category === 'Notification' ? (
                      isRecentNotification && fb.status === 'open' ? (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: 'rgba(255, 71, 87, 0.2)',
                          color: 'var(--neon-pink)'
                        }}>
                          New
                        </span>
                      ) : null
                    ) : (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        background: fb.status === 'resolved' ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255, 165, 2, 0.2)',
                        color: fb.status === 'resolved' ? '#2ed573' : '#ffa502'
                      }}>
                        {fb.status === 'resolved' ? 'Resolved' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', margin: 'var(--space-sm) 0' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Your Message:</p>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{fb.message}</p>
                {fb.image_url && (
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    <img 
                      src={fb.image_url} 
                      alt="Feedback Screenshot" 
                      style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--glass-border)' }} 
                    />
                  </div>
                )}
              </div>

              {fb.admin_reply && (
                <div style={{ background: 'rgba(var(--neon-cyan-rgb), 0.1)', borderLeft: '3px solid var(--neon-cyan)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', margin: 'var(--space-sm) 0' }}>
                  <p suppressHydrationWarning style={{ margin: '0 0 var(--space-xs) 0', fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 600 }}>Reply from Admin/Instructor (on {fb.replied_at ? new Date(fb.replied_at).toLocaleDateString() : ''}):</p>
                  <p style={{ margin: 0 }}>{fb.admin_reply}</p>
                </div>
              )}
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
