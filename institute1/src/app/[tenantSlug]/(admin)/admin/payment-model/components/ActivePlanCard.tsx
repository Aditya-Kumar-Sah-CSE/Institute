'use client';

import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, ShieldCheck, Zap } from 'lucide-react';
import styles from '../payment.module.css';
import Card from '@/components/ui/Card';

export default function ActivePlanCard({ subscription }: { subscription: any }) {
  if (!subscription) {
    return (
      <Card variant="glass" padding="lg" style={{ textAlign: 'center' }}>
        <Clock size={48} color="var(--accent-amber)" style={{ margin: '0 auto', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>No Active Plan</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Your institution does not have an active billing plan attached. Please select a premium plan below to upgrade your limits.</p>
      </Card>
    );
  }

  const plan = subscription.pricing_plans;
  const isTrial = subscription.status === 'trial';

  return (
    <Card variant="glass" style={{ border: '1px solid var(--accent-emerald)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--accent-emerald), var(--neon-cyan))' }} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 4vw, 24px)', padding: 'clamp(16px, 5vw, 32px)' }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={24} color="var(--accent-emerald)" />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'var(--weight-bold)' }}>Your Active Plan</h2>
           </div>
           <p style={{ color: 'var(--text-secondary)' }}>This handles your limits, access validity, and processing.</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
           <div style={{ flex: '1 1 300px', background: 'var(--bg-elevated)', borderRadius: '12px', padding: '24px', border: '1px solid var(--glass-border)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Current Plan Tier</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                 {plan?.name || 'Custom Setup'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span style={{ padding: '4px 12px', background: isTrial ? 'rgba(251, 191, 36, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isTrial ? 'var(--accent-amber)' : 'var(--accent-emerald)', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {isTrial ? 'Trial Mode' : 'Active Subscription'}
                 </span>
                 <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    ₹{plan?.monthly_price || 0} / month
                 </span>
              </div>
           </div>

           <div style={{ flex: '1 1 300px', background: 'var(--bg-elevated)', borderRadius: '12px', padding: '24px', border: '1px solid var(--glass-border)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Validity & Process</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Started On</span>
                    <span style={{ fontWeight: 600 }}>{format(new Date(subscription.created_at), 'MMMM dd, yyyy')}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Next Renewal</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{subscription.renews_at ? format(new Date(subscription.renews_at), 'MMMM dd, yyyy') : 'Manual processing'}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Paid</span>
                    <span style={{ fontWeight: 600 }}>₹{(subscription.total_paid || 0).toLocaleString()}</span>
                 </div>
              </div>
           </div>
        </div>

        {plan && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={20} color="var(--accent-emerald)" />
                <span>Up to <strong>{plan.student_limit}</strong> Students</span>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={20} color="var(--accent-emerald)" />
                <span>Up to <strong>{plan.faculty_limit}</strong> Faculty</span>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={20} color="var(--accent-emerald)" />
                <span><strong>{plan.storage_limit_gb} GB</strong> Cloud Storage</span>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={20} color="var(--accent-emerald)" />
                <span><strong>{plan.ai_credits}</strong> AI Credits / mo</span>
             </div>
          </div>
        )}
      </div>
    </Card>
  );
}
