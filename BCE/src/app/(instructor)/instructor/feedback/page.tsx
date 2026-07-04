import { getFeedbacks } from '@/features/feedback/actions/feedback';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { Feedback } from '@/types';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export default async function InstructorFeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  const { data: feedbacks, error } = await getFeedbacks();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Bug': return 'var(--neon-pink)';
      case 'Issue': return 'var(--neon-cyan)';
      case 'Doubt': return 'var(--neon-purple)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="instructor-feedback-page">
      <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 className="text-gradient">Student Doubts & Feedback</h1>
        <p className="text-secondary">Help students resolve their doubts and issues.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!feedbacks || feedbacks.length === 0 ? (
        <Card variant="glass" className="empty-state">
          <p>No feedback or doubts submitted yet.</p>
        </Card>
      ) : (
        <div className="feedback-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {(feedbacks as unknown as Feedback[]).map((fb) => (
            <Card key={fb.id} variant="glass" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', opacity: fb.status === 'resolved' ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 var(--space-xs) 0', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    {fb.name} <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)' }}>{fb.role}</span>
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
                <div suppressHydrationWarning style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {new Date(fb.created_at).toLocaleString()}
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', margin: 'var(--space-sm) 0' }}>
                {fb.message}
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
                  <p suppressHydrationWarning style={{ margin: '0 0 var(--space-xs) 0', fontSize: '0.8rem', color: 'var(--neon-cyan)', fontWeight: 600 }}>Reply sent on {fb.replied_at ? new Date(fb.replied_at).toLocaleDateString() : ''}:</p>
                  <p style={{ margin: 0 }}>{fb.admin_reply}</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {fb.status === 'open' ? (
                  <form action={async (formData) => {
                    'use server';
                    const reply = formData.get('reply') as string;
                    if (reply) {
                      const { replyToFeedback } = await import('@/features/feedback/actions/feedback');
                      await replyToFeedback(fb.id, reply);
                    } else {
                      const { resolveFeedback } = await import('@/features/feedback/actions/feedback');
                      await resolveFeedback(fb.id);
                    }
                  }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <textarea 
                      name="reply" 
                      placeholder="Write a reply to the user..." 
                      rows={2}
                      style={{ 
                        width: '100%', 
                        padding: 'var(--space-sm)', 
                        background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid var(--border-color)', 
                        color: 'white',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                      <Button variant="primary" type="submit" confirmMessage="Are you sure you want to resolve this doubt/feedback?">Reply & Resolve</Button>
                      <Button variant="danger" formAction={async () => {
                        'use server';
                        const { deleteFeedback } = await import('@/features/feedback/actions/feedback');
                        await deleteFeedback(fb.id);
                      }} confirmMessage="Are you sure you want to delete this doubt/feedback?">Delete</Button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)', padding: 'var(--space-xs) var(--space-md)' }}>✅ Resolved</span>
                    <form action={async () => {
                      'use server';
                      const { deleteFeedback } = await import('@/features/feedback/actions/feedback');
                      await deleteFeedback(fb.id);
                    }}>
                      <Button variant="danger" type="submit" confirmMessage="Are you sure you want to delete this doubt/feedback?">Delete</Button>
                    </form>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
