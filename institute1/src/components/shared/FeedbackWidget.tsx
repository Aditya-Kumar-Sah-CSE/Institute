'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { submitFeedback } from '@/features/feedback/actions/feedback';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import { ChevronLeft } from 'lucide-react';
import './FeedbackWidget.css';

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [defaultName, setDefaultName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
          const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
          if (profile?.name) {
            setDefaultName(profile.name);
          }
        }
      } catch (err) {
        console.error('Error fetching user for feedback widget:', err);
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
    
    // Upload image if selected
    if (selectedFile) {
      const supabase = createClient();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('feedback_images')
        .upload(filePath, selectedFile);
        
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('feedback_images')
          .getPublicUrl(filePath);
        formData.append('image_url', publicUrl);
      }
    }

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
      >
        <ChevronLeft size={16} className="hint-arrow" />
      </button>

      {/* The Overlay & Panel */}
      {isOpen && (
        <div className="feedback-overlay" onClick={() => setIsOpen(false)}>
          <div className="feedback-panel" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-header">
              <h2>Submit Feedback</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            {success ? (
              <div className="feedback-success">
                <div className="success-icon">✅</div>
                <h3>Thank You!</h3>
                <p>Your feedback has been submitted successfully. We appreciate your input!</p>
                <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(0, 255, 128, 0.1)', borderRadius: '8px', color: 'var(--neon-lime)', fontWeight: 'bold' }}>
                  🎉 You earned 5 XP!
                </div>
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
                      <input type="radio" name="category" value="Bug" defaultChecked /> Report a Bug
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

                <div className="form-group">
                  <label htmlFor="screenshot">Screenshot (Optional)</label>
                  <input 
                    type="file" 
                    id="screenshot" 
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}
                  />
                  {selectedFile && <p style={{ fontSize: '0.8rem', color: 'var(--neon-cyan)', marginTop: '4px' }}>Selected: {selectedFile.name}</p>}
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
