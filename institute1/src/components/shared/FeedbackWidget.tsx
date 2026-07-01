'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { submitFeedback } from '@/features/feedback/actions/feedback';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import './FeedbackWidget.css';

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [defaultName, setDefaultName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
        if (profile?.name) {
          setDefaultName(profile.name);
        }

        // Fetch unread notifications count
        const { count } = await supabase
          .from('feedbacks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('category', 'Notification')
          .eq('status', 'open');
        
        setUnreadCount(count || 0);
      }
    };
    fetchUser();
  }, [pathname]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await submitFeedback(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 3000);
    }
    setIsSubmitting(false);
  };

  return (
    <>
      {/* The Floating Button */}
      <button 
        className={`feedback-trigger-btn ${isOpen ? 'hidden' : ''}`} 
        onClick={() => setIsOpen(true)}
        aria-label="Give Feedback"
        style={{ position: 'fixed' }}
      >
        <span className="feedback-icon">💬</span>
        {unreadCount > 0 && <span className="notification-dot" style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          width: '12px',
          height: '12px',
          backgroundColor: 'var(--neon-pink)',
          borderRadius: '50%',
          boxShadow: '0 0 8px var(--neon-pink)',
          zIndex: 1000
        }}></span>}
      </button>

      {/* The Overlay & Panel */}
      {isOpen && (
        <div className="feedback-overlay" onClick={() => setIsOpen(false)}>
          <div className="feedback-panel" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-header">
              <h2>Submit Feedback</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            {unreadCount > 0 && (
              <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', background: 'rgba(255,71,87,0.1)', borderLeft: '3px solid var(--neon-pink)', borderRadius: 'var(--radius-sm)' }}>
                <a href="/feedbacks" style={{ color: 'var(--neon-pink)', fontWeight: 600, textDecoration: 'none', display: 'block' }}>
                  You have {unreadCount} new system notification(s)! Click here to view.
                </a>
              </div>
            )}

            {success ? (
              <div className="feedback-success">
                <div className="success-icon">✅</div>
                <h3>Thank You!</h3>
                <p>Your feedback has been submitted successfully. We appreciate your input!</p>
              </div>
            ) : (
              <form className="feedback-form" onSubmit={handleSubmit}>
                {error && <div className="feedback-error">{error}</div>}
                
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input type="text" id="name" name="name" required placeholder="Enter your full name" defaultValue={defaultName} />
                </div>

                <div className="form-group">
                  <label>I am a:</label>
                  <div className="radio-group">
                    <label>
                      <input type="radio" name="role" value="Student" defaultChecked /> Student
                    </label>
                    <label>
                      <input type="radio" name="role" value="Faculty" /> Faculty
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Feedback Category:</label>
                  <div className="radio-group">
                    <label>
                      <input type="radio" name="category" value="Issue" defaultChecked /> General Issue
                    </label>
                    <label>
                      <input type="radio" name="category" value="Bug" /> Report a Bug
                    </label>
                    <label>
                      <input type="radio" name="category" value="Feature" /> Suggest Feature
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Details</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    rows={4} 
                    required 
                    placeholder="Please describe your issue, bug, or suggestion in detail..."
                  ></textarea>
                </div>

                <Button type="submit" variant="primary" disabled={isSubmitting} style={{ width: '100%' }}>
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
