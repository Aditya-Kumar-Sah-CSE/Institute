'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input, { TextArea } from '@/components/ui/Input';
import LazyAttachment from '@/components/ui/LazyAttachment';
import type { Assignment, Submission } from '@/types';
import './AssignmentCard.css';

interface AssignmentCardProps {
  assignment: Assignment;
  submission?: Submission | null;
  communitySubmissions?: any[];
  onSubmit: (formData: FormData) => Promise<void>;
}

export default function AssignmentCard({ assignment, submission, communitySubmissions, onSubmit }: AssignmentCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [githubUrl, setGithubUrl] = useState(submission?.github_link || '');
  const [deployUrl, setDeployUrl] = useState(submission?.deploy_link || '');
  const [answer, setAnswer] = useState(submission?.answer ? (typeof submission.answer === 'string' ? submission.answer : JSON.stringify(submission.answer)) : '');
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);

  const isCompleted = submission?.status === 'approved';
  const isPending = submission?.status === 'pending';

  const actionHandler = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Failed to submit assignment. The files might be too large.';
      alert(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card 
      variant="neon" 
      neonColor={isCompleted ? 'lime' : isPending ? 'gold' : 'cyan'}
      className="assignment-card"
    >
      <div className="assignment-header">
        <div className="assignment-title-area">
          <span className="assignment-icon">
            {assignment.type === 'code' ? '💻' : 
             assignment.type === 'github' ? '🐙' : 
             assignment.type === 'deploy' ? '🚀' : '📝'}
          </span>
          <h3 className="assignment-title">{assignment.title}</h3>
        </div>
        <div className="assignment-meta">
          <span className="assignment-xp text-gradient">+{assignment.xp_reward} XP</span>
          {isCompleted && <span className="status-badge approved">Approved</span>}
          {isPending && <span className="status-badge pending">In Review</span>}
          {submission?.status === 'rejected' && <span className="status-badge rejected">Needs Work</span>}
        </div>
      </div>

      <div className="assignment-desc" style={{ whiteSpace: 'pre-wrap' }}>
        {assignment.description}
        {(() => {
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const descriptionUrls = (assignment.description || '').match(urlRegex) || [];
          if (descriptionUrls.length === 0) return null;
          
          return (
            <div style={{ marginTop: 'var(--space-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-sm)' }}>
                {descriptionUrls.map((url, idx) => {
                  const isPdf = url.split('?')[0].toLowerCase().endsWith('.pdf');
                  return <LazyAttachment key={`desc-att-${idx}`} url={url} type={isPdf ? 'pdf' : 'image'} title={`Attachment ${idx + 1}`} />;
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {!isCompleted && (
        <form action={actionHandler} className="assignment-form">
          
          {(assignment.type === 'code' || assignment.type === 'any') && (
             <TextArea
               name="answer"
               label="Your Answer / Code Snippet"
               value={answer}
               onChange={(e) => setAnswer(e.target.value)}
               placeholder="Paste your solution here..."
               required
               disabled={isPending}
             />
          )}

          {(assignment.type === 'github' || assignment.requires_github || assignment.type === 'any') && (
            <Input
              name="githubUrl"
              label="GitHub Repository URL (Optional)"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
              icon="🐙"
              disabled={isPending}
            />
          )}

          {(assignment.type === 'deploy' || assignment.requires_deploy || assignment.type === 'any') && (
            <Input
              name="deployUrl"
              label="Live Deployment URL (Optional)"
              type="url"
              value={deployUrl}
              onChange={(e) => setDeployUrl(e.target.value)}
              placeholder="https://your-project.vercel.app"
              icon="🚀"
              disabled={isPending}
            />
          )}

          {(assignment.type === 'ui' || assignment.type === 'any') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>UI Screenshots / PDFs</label>
              
              <input type="hidden" name="answer" value={answer} />

              {answer && (
                <div className="submission-answer" style={{ marginBottom: 'var(--space-sm)' }}>
                  <h4 style={{ margin: '0 0 var(--space-xs) 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Previously Uploaded</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-sm)' }}>
                    {(() => {
                      let urls: string[] = [];
                      try {
                        const parsed = JSON.parse(answer);
                        urls = Array.isArray(parsed) ? parsed : [answer];
                      } catch {
                        urls = [answer];
                      }
                      return urls.map((url, idx) => {
                        const isPdf = url.split('?')[0].toLowerCase().endsWith('.pdf');
                        return <LazyAttachment key={idx} url={url} type={isPdf ? 'pdf' : 'image'} title={`Submission ${idx + 1}`} />;
                      });
                    })()}
                  </div>
                </div>
              )}

              {(!isCompleted && !isPending) && (
                <div style={{ marginTop: answer ? 'var(--space-xs)' : '0' }}>
                  {answer && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2xs)' }}>Select new files to replace your previous submission.</p>}
                  <input 
                    type="file" 
                    name="ui_files" 
                    accept="image/*,application/pdf" 
                    multiple
                    required={!answer && assignment.type !== 'any'}
                    disabled={isPending}
                    style={{ padding: 'var(--space-sm)', background: 'var(--bg-input)', color: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', width: '100%' }}
                  />
                </div>
              )}
            </div>
          )}

          {submission?.feedback && (
            <div className="assignment-feedback">
              <strong>Feedback:</strong> {submission.feedback}
            </div>
          )}

          {!isPending && (
            <div className="assignment-actions">
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Submit Assignment
              </Button>
            </div>
          )}
        </form>
      )}

      {isCompleted && (
        <div className="assignment-completed-state">
          <p className="completed-text">✅ You have successfully completed this assignment and earned {assignment.xp_reward} XP!</p>
          {submission?.feedback && (
            <div className="assignment-feedback positive">
              <strong>Feedback:</strong> {submission.feedback}
            </div>
          )}
        </div>
      )}

      {/* Community Submissions Section */}
      {communitySubmissions && communitySubmissions.length > 0 && (
        <div style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid var(--glass-border)', paddingTop: 'var(--space-md)' }}>
          <h4 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-md)' }}>Community Submissions ({communitySubmissions.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {(showAllSubmissions ? communitySubmissions : communitySubmissions.slice(0, 1)).map((sub, i) => (
              <div key={sub.id || i} style={{ background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                  {sub.profile?.avatar_url ? (
                    <Image src={sub.profile.avatar_url} alt="Avatar" width={32} height={32} style={{ borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                      {sub.profile?.name?.[0] || '?'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>{sub.profile?.name || 'Anonymous Student'}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {new Date(sub.submitted_at).toLocaleDateString()} {sub.status === 'approved' && <span style={{ color: 'var(--neon-lime)' }}>• Approved</span>}
                    </div>
                  </div>
                </div>
                
                {/* Submission Content */}
                <div style={{ fontSize: 'var(--text-sm)' }}>
                  {sub.github_link && <div style={{ marginBottom: '4px' }}><strong>GitHub:</strong> <a href={sub.github_link} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)' }}>{sub.github_link}</a></div>}
                  {sub.deploy_link && <div style={{ marginBottom: '4px' }}><strong>Deploy:</strong> <a href={sub.deploy_link} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)' }}>{sub.deploy_link}</a></div>}
                  
                  {sub.answer && (
                    <div style={{ marginTop: 'var(--space-xs)' }}>
                      {assignment.type === 'ui' ? (
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                          {(() => {
                            let urls: string[] = [];
                            try {
                              const parsed = typeof sub.answer === 'string' ? JSON.parse(sub.answer) : sub.answer;
                              urls = Array.isArray(parsed) ? parsed : [String(sub.answer)];
                            } catch {
                              urls = [String(sub.answer)];
                            }
                            return urls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ color: '#000', background: 'var(--neon-cyan)', padding: '4px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>
                                📄 View Attachment {idx + 1}
                              </a>
                            ));
                          })()}
                        </div>
                      ) : (
                        <pre style={{ background: 'var(--bg-input)', padding: 'var(--space-sm)', overflowX: 'auto', whiteSpace: 'pre-wrap', borderRadius: 'var(--radius-sm)' }}>
                          {typeof sub.answer === 'string' ? sub.answer : JSON.stringify(sub.answer, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!showAllSubmissions && communitySubmissions.length > 1 && (
            <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowAllSubmissions(true)}>
                Show More Submissions
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
