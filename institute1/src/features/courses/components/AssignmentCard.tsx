'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input, { TextArea } from '@/components/ui/Input';
import type { Assignment, Submission } from '@/types';
import './AssignmentCard.css';

interface AssignmentCardProps {
  assignment: Assignment;
  submission?: Submission | null;
  onSubmit: (formData: FormData) => Promise<void>;
}

export default function AssignmentCard({ assignment, submission, onSubmit }: AssignmentCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [githubUrl, setGithubUrl] = useState(submission?.github_link || '');
  const [deployUrl, setDeployUrl] = useState(submission?.deploy_link || '');
  const [answer, setAnswer] = useState(submission?.answer ? (typeof submission.answer === 'string' ? submission.answer : JSON.stringify(submission.answer)) : '');

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
      </div>

      {!isCompleted && (
        <form action={actionHandler} className="assignment-form">
          
          {assignment.type === 'code' && (
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

          {(assignment.type === 'github' || assignment.requires_github) && (
            <Input
              name="githubUrl"
              label="GitHub Repository URL"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
              icon="🐙"
              required={assignment.type === 'github' || assignment.requires_github}
              disabled={isPending}
            />
          )}

          {(assignment.type === 'deploy' || assignment.requires_deploy) && (
            <Input
              name="deployUrl"
              label="Live Deployment URL"
              type="url"
              value={deployUrl}
              onChange={(e) => setDeployUrl(e.target.value)}
              placeholder="https://your-project.vercel.app"
              icon="🚀"
              required={assignment.type === 'deploy' || assignment.requires_deploy}
              disabled={isPending}
            />
          )}

          {assignment.type === 'ui' && (
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
                        return (
                          <div key={idx} style={{ position: 'relative', width: '100%', height: '150px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                            {isPdf ? (
                              <a href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-primary)', textDecoration: 'none' }}>
                                <span style={{ fontSize: '3rem' }}>📄</span>
                                <span style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-xs)' }}>View PDF</span>
                              </a>
                            ) : (
                              <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                                <Image src={url} alt={`Submission ${idx + 1}`} fill style={{ objectFit: 'contain' }} />
                              </a>
                            )}
                          </div>
                        );
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
                    required={!answer}
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
    </Card>
  );
}
