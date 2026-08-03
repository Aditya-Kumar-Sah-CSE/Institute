'use client';

import React from 'react';
import { Check, Minus } from 'lucide-react';
import styles from '../payment.module.css';

export default function SubscriptionMatrix({ plans }: { plans: any[] }) {
  if (!plans || plans.length === 0) return null;

  const features = [
    { label: 'Students Limit', key: 'student_limit', type: 'number' },
    { label: 'Faculty Limit', key: 'faculty_limit', type: 'number' },
    { label: 'Storage Bound', key: 'storage_limit_gb', type: 'string', append: ' GB' },
    { label: 'AI Operations Limit', key: 'ai_credits', type: 'number' },
    { label: 'Custom Look & Feel', key: 'custom_branding', type: 'boolean' },
    { label: 'Advanced Analytics', key: 'analytics', type: 'boolean' },
    { label: 'Certificates Module', key: 'certificate_module', type: 'boolean' },
    { label: 'Attendance API', key: 'attendance_module', type: 'boolean' },
    { label: 'Community Support', key: 'community_access', type: 'boolean' },
    { label: 'Priority SL', key: 'priority_support', type: 'boolean' },
  ];

  return (
    <div className={styles.matrixCard}>
      <div className={styles.matrixHeader}>
        <h2 className={styles.matrixTitle}>Plan Comparison Matrix</h2>
        <p className={styles.matrixSubtitle}>Enterprise capability overview across active tiers</p>
      </div>
      
      <div className={styles.matrixTableWrapper}>
        <table className={styles.matrixTable}>
          <thead className={styles.matrixThead}>
            <tr>
              <th className={styles.matrixTh}>Features / Tiers</th>
              {plans.map(p => (
                <th key={p.id} className={styles.matrixThTier}>
                  {p.name}
                  <div className={styles.matrixPriceContainer}>₹{p.monthly_price}/mo</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={styles.matrixTbody}>
            {features.map((feat, idx) => (
              <tr key={idx} className={styles.matrixTr}>
                <td className={styles.matrixTdLabel}>{feat.label}</td>
                
                {plans.map(p => (
                  <td key={p.id} className={styles.matrixTdValue}>
                    {feat.type === 'boolean' ? (
                      p[feat.key] ? <Check size={20} className={styles.matrixIconCenter} color="var(--accent-emerald)" /> : <Minus size={20} className={styles.matrixIconCenter} color="var(--text-muted)" />
                    ) : (
                      <span>{p[feat.key]?.toLocaleString() || 0}{feat.append || ''}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
