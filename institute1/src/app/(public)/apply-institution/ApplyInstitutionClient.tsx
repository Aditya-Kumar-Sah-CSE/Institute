'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { submitInstitutionRequest } from './actions';

export default function ApplyInstitutionClient({ plans }: { plans: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await submitInstitutionRequest(formData);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccess(true);
      }
    });
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-default)' }}>
        <div style={{ background: 'var(--bg-card)', padding: '4rem 2rem', borderRadius: '1rem', border: '1px solid var(--border)', textAlign: 'center', maxWidth: '500px' }}>
          <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 1.5rem auto' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Application Submitted!</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Thank you for your interest in Smart Learn AI. Our team will review your application and contact the institute administrator email soon.
          </p>
          <Link href="/">
            <button className="btn-human-ghost">Return to Homepage</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-default)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '2rem', fontWeight: 500 }}>
          <ArrowLeft size={18} /> Back to Homepage
        </Link>
        
        <div style={{ background: 'var(--bg-surface)', padding: '3rem', borderRadius: '1.5rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Apply for Institution Access</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Deploy a dedicated ecosystem for your academy instantly.</p>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Institution Name *</label>
                <input required name="institute_name" type="text" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} placeholder="e.g. Stanford University" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Admin Full Name *</label>
                <input required name="admin_name" type="text" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} placeholder="Jane Doe" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Admin Email *</label>
                <input required name="admin_email" type="email" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} placeholder="admin@stanford.edu" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Phone Number</label>
                <input name="phone" type="tel" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} placeholder="+1 234 567 8900" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Expected Students</label>
                <input name="students_count" type="number" min="0" defaultValue={100} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Expected Faculty</label>
                <input name="faculty_count" type="number" min="0" defaultValue={5} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Plan Selection (Optional)</label>
              <select name="plan_selected" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                <option value="">Not Sure Yet (Let's Talk)</option>
                {plans?.length > 0 ? (
                  plans.map(plan => (
                    <option key={plan.id} value={plan.name}>{plan.name} - ₹{plan.monthly_price}/mo</option>
                  ))
                ) : (
                  <>
                    <option value="Starter">Starter Plan</option>
                    <option value="Professional">Professional Plan</option>
                    <option value="Enterprise">Enterprise Plan</option>
                  </>
                )}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Additional Message</label>
              <textarea name="message" rows={4} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', resize: 'vertical' }} placeholder="Any specific requirements or questions?"></textarea>
            </div>

            <button disabled={isPending} type="submit" className="btn-human" style={{ alignSelf: 'flex-start', padding: '1rem 3rem', fontSize: '1.125rem' }}>
              {isPending ? 'Submitting Application...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
