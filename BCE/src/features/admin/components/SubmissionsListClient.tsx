'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface SubmissionsListClientProps {
  submissions: any[];
  reviewSubmissionAction: (formData: FormData) => Promise<void>;
}

export default function SubmissionsListClient({ submissions, reviewSubmissionAction }: SubmissionsListClientProps) {
  const [showAll, setShowAll] = useState(false);

  if (!submissions || submissions.length === 0) {
    return (
      <Card variant="glass" style={{ padding: 'var(--space-3xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🎉</div>
        <p>All caught up! No pending submissions to review.</p>
      </Card>
    );
  }

  const visibleSubmissions = showAll ? submissions : submissions.slice(0, 2);

  return (
    <>
      {visibleSubmissions.map(sub => (
        <Card key={sub.id} variant="glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <div>
              <h3 style={{ margin: 0 }}>{sub.assignments?.title || 'Unknown Assignment'}</h3>
              <p className="text-secondary text-sm">By {sub.profiles?.name || 'Unknown Student'} ({sub.profiles?.email || 'N/A'})</p>
            </div>
            <div className="text-gradient" style={{ fontWeight: 'bold' }}>
              +{sub.assignments?.xp_reward || 0} XP
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
            <div className="text-sm text-secondary" style={{ marginBottom: 'var(--space-xs)', textTransform: 'uppercase' }}>Submission Data</div>
            {!sub.github_link && !sub.deploy_link && !sub.answer && (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No submission data provided. The upload may have failed.
              </div>
            )}
            {sub.github_link && <div style={{ marginBottom: 'var(--space-xs)' }}><strong>GitHub:</strong> <a href={sub.github_link} target="_blank" rel="noreferrer">{sub.github_link}</a></div>}
            {sub.deploy_link && <div style={{ marginBottom: 'var(--space-xs)' }}><strong>Deploy:</strong> <a href={sub.deploy_link} target="_blank" rel="noreferrer">{sub.deploy_link}</a></div>}
            {sub.answer && (
              <div>
                <strong>Answer:</strong> 
                {sub.assignments?.type === 'ui' ? (
                  <div style={{ marginTop: 'var(--space-xs)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    {(() => {
                      let urls: string[] = [];
                      try {
                        const parsed = typeof sub.answer === 'string' ? JSON.parse(sub.answer) : sub.answer;
                        urls = Array.isArray(parsed) ? parsed : [String(sub.answer)];
                      } catch {
                        urls = [String(sub.answer)];
                      }
                      return urls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--bg-primary)', background: 'var(--neon-cyan)', padding: '4px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>
                          📄 View File {idx + 1}
                        </a>
                      ));
                    })()}
                  </div>
                ) : (
                  <pre style={{ background: 'var(--bg-input)', padding: 'var(--space-sm)', marginTop: 'var(--space-xs)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {typeof sub.answer === 'string' ? sub.answer : JSON.stringify(sub.answer, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>

          <form action={reviewSubmissionAction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <input type="hidden" name="submissionId" value={sub.id} />
            <textarea 
              name="feedback" 
              placeholder="Optional feedback..." 
              style={{ width: '100%', padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <Button type="submit" name="action" value="reject" variant="danger" size="sm" confirmMessage="Are you sure you want to reject this assignment?">Reject / Needs Work</Button>
              <Button type="submit" name="action" value="approve" variant="success" size="sm" confirmMessage="Are you sure you want to approve this assignment?">Approve & Award XP</Button>
            </div>
          </form>
        </Card>
      ))}

      {!showAll && submissions.length > 2 && (
        <Button variant="secondary" onClick={() => setShowAll(true)} style={{ padding: '16px', fontWeight: 'bold', width: '100%' }}>
          Show all {submissions.length} submissions on this page
        </Button>
      )}

      {showAll && submissions.length > 2 && (
        <Button variant="ghost" onClick={() => setShowAll(false)} style={{ padding: '16px', fontWeight: 'bold', width: '100%', border: '1px solid var(--glass-border)' }}>
          Show Less
        </Button>
      )}
    </>
  );
}
