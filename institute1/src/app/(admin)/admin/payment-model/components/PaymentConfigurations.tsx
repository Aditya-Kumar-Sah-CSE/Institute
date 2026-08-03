'use client';

import React, { useState } from 'react';
import { savePaymentSettings } from '@/features/billing/actions';
import { Settings, CreditCard, Loader2, CheckCircle, Smartphone, AtSign, Landmark, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from '../payment.module.css';

const Toggle = ({ active, onChange, disabled }: { active: boolean, onChange: (a: boolean) => void, disabled: boolean }) => (
  <button 
     type="button" 
     disabled={disabled}
     onClick={() => onChange(!active)} 
     style={{
        position: 'relative',
        display: 'inline-flex',
        height: '24px',
        width: '44px',
        flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: '9999px',
        border: '2px solid transparent',
        transition: 'background-color 0.2s',
        outline: 'none',
        background: active ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.1)',
        boxShadow: active ? '0 0 10px rgba(16,185,129,0.5)' : 'none',
        opacity: disabled ? 0.5 : 1
     }}
     role="switch"
  >
    <motion.span
       layout
       animate={{ x: active ? 20 : 0 }}
       transition={{ type: "spring", stiffness: 500, damping: 30 }}
       style={{
          pointerEvents: 'none',
          display: 'inline-block',
          height: '20px',
          width: '20px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
       }}
    />
  </button>
);

export default function PaymentConfigurations({ isSuperAdmin, initialSettings }: { isSuperAdmin: boolean, initialSettings?: any }) {
  const [data, setData] = useState<any>(initialSettings || {
    currency: 'INR',
    tax_percentage: 0,
    gst_percentage: 18.00,
    active_gateway: 'razorpay',
    invoice_prefix: 'INV-',
    grace_period_days: 3,
    late_fee_amount: 0,
    auto_invoice: true,
    email_notifications: true,
    sms_notifications: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    setSuccess('');
    try {
      await savePaymentSettings(data);
      setSuccess('Settings synced globally.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
             <Settings className={styles.iconAccent} size={24}/> Platform & Routing
          </h2>
          <p className={styles.sectionSubtitle}>Configure core infrastructure, tax routing, and system automations.</p>
        </div>
        
        {isSuperAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             {success && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16}/> {success}</motion.div>}
             <button disabled={isSaving} onClick={handleSave} className={styles.primaryButton}>
                {isSaving ? <Loader2 className={styles.chartSpinner} style={{ width: '20px', height: '20px', marginRight: '8px', border: 'none', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={20} style={{ marginRight: '8px' }} />}
                Sync Configuration
             </button>
          </div>
        )}
      </div>

      <div className={styles.configGrid}>
        
        {/* Gateway & Currency */}
        <div className={styles.configCard}>
           <div className={styles.configLineTop} style={{ background: 'linear-gradient(to right, #3b82f6, #6366f1)' }} />
           <div className={styles.configGlowCorner} style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
           
           <h4 className={styles.configTitle}>
             <div className={styles.configIconBox} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }}><CreditCard size={18}/></div>
             Core Processing
           </h4>
           
           <div style={{ position: 'relative', zIndex: 10 }}>
             <div className={styles.configFormGroup}>
               <label className={styles.configLabel}>Active Web Gateway</label>
               <div style={{ position: 'relative' }}>
                 <select disabled={!isSuperAdmin} value={data.active_gateway} onChange={(e) => setData({...data, active_gateway: e.target.value})} className={`${styles.configInput} ${styles.configSelect}`}>
                    <option value="razorpay">Razorpay (Preferred Node)</option>
                    <option value="stripe">Stripe Global</option>
                    <option value="cashfree">Cashfree Core</option>
                 </select>
                 <div className={styles.selectCaret} />
               </div>
             </div>
             <div className={styles.configFormGroup}>
               <label className={styles.configLabel}>Fiat Currency</label>
               <div style={{ position: 'relative' }}>
                 <select disabled={!isSuperAdmin} value={data.currency} onChange={(e) => setData({...data, currency: e.target.value})} className={`${styles.configInput} ${styles.configSelect}`}>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                 </select>
                 <div className={styles.selectCaret} />
               </div>
             </div>
           </div>
        </div>

        {/* Taxes & Fees */}
        <div className={styles.configCard}>
           <div className={styles.configLineTop} style={{ background: 'linear-gradient(to right, #f59e0b, #f97316)' }} />
           <div className={styles.configGlowCorner} style={{ background: 'rgba(245, 158, 11, 0.2)' }} />
           
           <h4 className={styles.configTitle}>
             <div className={styles.configIconBox} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)' }}><Landmark size={18}/></div>
             Financial Routing
           </h4>
           
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', position: 'relative', zIndex: 10, width: '100%', marginBottom: '20px' }}>
             <div>
               <label className={styles.configLabel}>Std Tax (%)</label>
               <input disabled={!isSuperAdmin} type="number" step="0.01" value={data.tax_percentage} onChange={e => setData({...data, tax_percentage: Number(e.target.value)})} className={styles.configInput} />
             </div>
             <div>
               <label className={styles.configLabel}>GST Ratio (%)</label>
               <input disabled={!isSuperAdmin} type="number" step="0.01" value={data.gst_percentage} onChange={e => setData({...data, gst_percentage: Number(e.target.value)})} className={styles.configInput} />
             </div>
           </div>
           
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', position: 'relative', zIndex: 10, width: '100%' }}>
             <div>
               <label className={styles.configLabel}>Grace (Days)</label>
               <input disabled={!isSuperAdmin} type="number" value={data.grace_period_days} onChange={e => setData({...data, grace_period_days: Number(e.target.value)})} className={styles.configInput} />
             </div>
             <div>
               <label className={styles.configLabel}>Late Fee (₹)</label>
               <input disabled={!isSuperAdmin} type="number" value={data.late_fee_amount} onChange={e => setData({...data, late_fee_amount: Number(e.target.value)})} className={styles.configInput} />
             </div>
           </div>
        </div>

        {/* Automation */}
        <div className={styles.configCard}>
           <div className={styles.configLineTop} style={{ background: 'linear-gradient(to right, #a855f7, #d946ef)' }} />
           <div className={styles.configGlowCorner} style={{ background: 'rgba(168, 85, 247, 0.2)' }} />
           
           <h4 className={styles.configTitle}>
             <div className={styles.configIconBox} style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)' }}><Zap size={18}/></div>
             Workflow Ops
           </h4>
           
           <div style={{ position: 'relative', zIndex: 10 }}>
              <div className={styles.configToggleRow} style={{ background: data.auto_invoice ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.4)', borderColor: data.auto_invoice ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)' }}>
                 <div className={styles.configToggleInfo}>
                    <CheckCircle size={20} style={{ color: data.auto_invoice ? 'var(--accent-emerald)' : 'var(--text-secondary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span className={styles.configToggleTitle}>Auto Invoice Gen</span>
                       <span className={styles.configToggleDesc}>Dispatches PDFs immediately to institutions upon success.</span>
                    </div>
                 </div>
                 <Toggle active={data.auto_invoice} onChange={(val) => setData({...data, auto_invoice: val})} disabled={!isSuperAdmin} />
              </div>

              <div className={styles.configToggleRow} style={{ background: data.email_notifications ? 'rgba(168,85,247,0.05)' : 'rgba(0,0,0,0.4)', borderColor: data.email_notifications ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)' }}>
                 <div className={styles.configToggleInfo}>
                    <AtSign size={20} style={{ color: data.email_notifications ? 'var(--accent-purple)' : 'var(--text-secondary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span className={styles.configToggleTitle}>Email Alarms</span>
                       <span className={styles.configToggleDesc}>Push dunning logic warnings sequentially over SMTP.</span>
                    </div>
                 </div>
                 <Toggle active={data.email_notifications} onChange={(val) => setData({...data, email_notifications: val})} disabled={!isSuperAdmin} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
