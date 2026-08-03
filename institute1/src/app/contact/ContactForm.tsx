'use client';

import React, { useState } from 'react';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { submitSupportTicket } from '@/features/support/actions';

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const res = await submitSupportTicket(formData);
    
    setResult(res);
    setIsSubmitting(false);
    
    if (res.success) {
      e.currentTarget.reset();
    }
  }

  if (result?.success) {
    return (
      <div className="contact-success-state">
        <CheckCircle size={48} color="#10b981" />
        <h4>Ticket Submitted</h4>
        <p>Our secure infrastructure has received your request. The SuperAdmin will review it inside the Feedback dashboard shortly.</p>
        <button type="button" onClick={() => setResult(null)} className="contact-submit-btn" style={{ marginTop: '1.5rem' }}>
          Submit another ticket
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      {result && !result.success && (
        <div className="contact-error-banner">
          {result.error}
        </div>
      )}

      <div className="contact-form-group">
        <label htmlFor="name">Full Name</label>
        <input type="text" id="name" name="name" required placeholder="John Doe" />
      </div>

      <div className="contact-form-group">
        <label htmlFor="email">Email Address</label>
        <input type="email" id="email" name="email" required placeholder="john@university.edu" />
      </div>

      <div className="contact-form-group">
        <label htmlFor="subject">Subject</label>
        <input type="text" id="subject" name="subject" required placeholder="Enterprise Pricing Review" />
      </div>

      <div className="contact-form-group">
        <label htmlFor="message">How can we help?</label>
        <textarea id="message" name="message" required rows={5} placeholder="Describe your request in detail..."></textarea>
      </div>

      <button type="submit" disabled={isSubmitting} className="contact-submit-btn">
        {isSubmitting ? <Loader2 size={20} className="spin-icon" /> : <Send size={20} />}
        {isSubmitting ? 'Transmitting...' : 'Send Secure Message'}
      </button>
    </form>
  );
}
