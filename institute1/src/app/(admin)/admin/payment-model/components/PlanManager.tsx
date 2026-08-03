'use client';

import React, { useState, useEffect } from 'react';
import { createPlan, updatePlan, deletePlan } from '@/features/billing/actions';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Loader2, PackageOpen, Server, Users, GraduationCap, Sparkles, Copy, Monitor, PlayCircle, Library, Tag, Activity, TrendingUp, Target, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../payment.module.css';

export default function PlanManager({ isSuperAdmin, initialPlans }: { isSuperAdmin: boolean, initialPlans: any[] }) {
  const [plans, setPlans] = useState<any[]>(initialPlans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Default Form State
  const defaultForm = {
    name: '', monthly_price: 0, yearly_price: 0, student_limit: 100, faculty_limit: 10,
    storage_limit_gb: 5, courses_limit: 10, assignments_limit: 50, ai_credits: 1000,
    custom_branding: false, analytics: false, priority_support: false,
    certificate_module: false, attendance_module: false, community_access: false
  };

  const [formData, setFormData] = useState<any>(defaultForm);

  const openCreate = () => {
    if (!isSuperAdmin) return;
    setEditingPlan(null);
    setFormData(defaultForm);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handleOpenCreatePlan = () => {
      openCreate();
    };
    
    // Listen for the global button trigger
    window.addEventListener('open-create-plan', handleOpenCreatePlan);
    return () => window.removeEventListener('open-create-plan', handleOpenCreatePlan);
  }, [isSuperAdmin]);

  const openEdit = (plan: any) => {
    if (!isSuperAdmin) return;
    setEditingPlan(plan);
    setFormData(plan);
    setIsModalOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('Are you sure you want to archive this plan? Subscriptions using it will remain active.')) return;
    
    try {
      await deletePlan(planId);
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleDuplicate = async (plan: any) => {
    if (!isSuperAdmin) return;
    const duplicatedData = { ...plan, name: `${plan.name} (Copy)` };
    delete duplicatedData.id;
    delete duplicatedData.created_at;
    setEditingPlan(null);
    setFormData(duplicatedData);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setIsSubmitting(true);
    setError('');

    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, formData);
        setPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...formData } : p));
      } else {
        await createPlan(formData);
        window.location.reload();
      }
      setIsModalOpen(false);
    } catch (err: any) {
       setError(err.message || 'Failed to save plan');
    } finally {
       setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
         <div>
           <h2 className={styles.sectionTitle}>
             Pricing Plans <span className={styles.badgeCount}>{plans.length}</span>
           </h2>
           <p className={styles.sectionSubtitle}>Manage tiers and billing dimensions for SaaS institutions.</p>
         </div>
         {isSuperAdmin && plans.length > 0 && (
           <button onClick={openCreate} className={styles.primaryButton}>
             <Plus size={18} /> Create Plan
           </button>
         )}
      </div>

      {plans.length === 0 ? (
        <div className={styles.emptyState}>
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ marginBottom: '24px' }}>
              <PackageOpen size={80} color="var(--accent-amber)" opacity={0.9} />
           </motion.div>
           
           <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>No Pricing Plans Created</h3>
           <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '1.125rem', marginBottom: '32px' }}>
             Create your first pricing plan to start onboarding institutions and collecting recurring revenue.
           </p>
           
           {isSuperAdmin && (
             <button onClick={openCreate} className={styles.primaryButton} style={{ padding: '16px 32px', fontSize: '1.125rem' }}>
               <Plus size={20} /> Launch First Plan
             </button>
           )}
        </div>
      ) : (
        <div className={styles.planGrid}>
           {plans.map((p, i) => (
             <motion.div 
               key={p.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1, duration: 0.4 }}
             >
               <div className={styles.planCard}>
                  <div className={styles.glowBackground} style={{ backgroundColor: 'var(--accent-emerald)' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', zIndex: 10, position: 'relative' }}>
                     <span className={`${styles.trendBadge} ${styles.trendUp}`}>
                       Active Tier
                     </span>
                     
                     <div className={styles.planCardActions}>
                        <button onClick={() => openEdit(p)} className={styles.planActionButton}><Edit2 size={16}/></button>
                        <button onClick={() => handleDuplicate(p)} className={styles.planActionButton}><Copy size={16}/></button>
                        <button onClick={() => handleDelete(p.id)} className={`${styles.planActionButton} ${styles.danger}`}><Trash2 size={16}/></button>
                     </div>
                  </div>
                  
                  <h3 className={styles.planCardTitle}>{p.name}</h3>
                  <div className={styles.planPrice}>
                     <span className={styles.planPriceCurrency}>₹</span>
                     <span className={styles.planPriceAmount}>{p.monthly_price}</span>
                     <span className={styles.planPricePeriod}>/mo</span>
                  </div>
                  
                  <div className={styles.planFeaturesGrid}>
                     <div className={styles.planFeatureItem}>
                        <span className={styles.planFeatureLabel}><Users size={14}/> Students</span>
                        <span className={styles.planFeatureValue}>{p.student_limit.toLocaleString()} max</span>
                     </div>
                     <div className={styles.planFeatureItem}>
                        <span className={styles.planFeatureLabel}><GraduationCap size={14}/> Faculty</span>
                        <span className={styles.planFeatureValue}>{p.faculty_limit.toLocaleString()} max</span>
                     </div>
                     <div className={styles.planFeatureItem}>
                        <span className={styles.planFeatureLabel}><Server size={14}/> Storage</span>
                        <span className={styles.planFeatureValue}>{p.storage_limit_gb} GB bound</span>
                     </div>
                     <div className={styles.planFeatureItem}>
                        <span className={styles.planFeatureLabel}><Sparkles size={14} style={{color: 'var(--accent-amber)'}}/> AI Ops</span>
                        <span className={styles.planFeatureValue}>{p.ai_credits.toLocaleString()} credits</span>
                     </div>
                  </div>
                  
                  <div className={styles.planChecklist}>
                     {p.custom_branding && <div className={styles.checklistItem}><CheckCircle size={16} color="var(--accent-emerald)" style={{marginRight: '8px'}} /> Custom Brand Look & Feel</div>}
                     {p.analytics && <div className={styles.checklistItem}><CheckCircle size={16} color="var(--accent-emerald)" style={{marginRight: '8px'}} /> Advanced Analytics Engine</div>}
                     {p.certificate_module && <div className={styles.checklistItem}><CheckCircle size={16} color="var(--accent-emerald)" style={{marginRight: '8px'}} /> Digital Certificate Module</div>}
                     {p.priority_support && <div className={styles.checklistItem}><CheckCircle size={16} color="var(--accent-emerald)" style={{marginRight: '8px'}} /> Priority SLA Support</div>}
                  </div>
                  
                  <div className={styles.planMetrics}>
                     <div>
                       <div className={styles.planFeatureLabel} style={{marginBottom: '2px'}}>Subscribers</div>
                       <div style={{fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)'}}>
                         {p.subscriptions ? p.subscriptions.filter((s:any) => s.status === 'active' || s.status === 'paid').length : 0} Active
                       </div>
                     </div>
                     <div style={{textAlign: 'right'}}>
                       <div className={styles.planFeatureLabel} style={{marginBottom: '2px'}}>Generated</div>
                       <div style={{fontWeight: 700, fontSize: '0.875rem', color: 'var(--accent-emerald)'}}>
                         ₹{(p.subscriptions ? p.subscriptions.reduce((acc: number, curr: any) => acc + Number(curr.total_paid || 0), 0) : 0).toLocaleString('en-IN')}
                       </div>
                     </div>
                  </div>
               </div>
             </motion.div>
           ))}
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && isSuperAdmin && (
          <div className={styles.modalOverlay}>
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={styles.modalContent}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-blue))' }} />
              
              <div className={styles.modalHeader}>
                 <h3 className={styles.modalTitle}>{editingPlan ? 'Edit Pricing Plan' : 'Create New Pricing Plan'}</h3>
                 <button type="button" onClick={() => setIsModalOpen(false)} className={styles.modalClose}><XCircle size={20}/></button>
              </div>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className={styles.modalBody}>
                  {error && <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '24px' }}>{error}</div>}
                  
                  <div className={styles.formGrid}>
                     <div className={styles.formGroup}>
                       <label className={styles.formLabel}>Plan Name</label>
                       <div style={{position: 'relative'}}>
                         <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`${styles.formInput} ${styles.inputWithIcon}`} placeholder="e.g. Enterprise Tier" />
                         <Tag size={16} className={styles.inputIcon} />
                       </div>
                     </div>
                     <div className={styles.splitGrid}>
                       <div className={styles.formGroup}>
                         <label className={styles.formLabel}>Monthly (₹)</label>
                         <div style={{position: 'relative'}}>
                           <span className={styles.inputIcon}>₹</span>
                           <input required type="number" value={formData.monthly_price} onChange={e => setFormData({...formData, monthly_price: Number(e.target.value)})} className={`${styles.formInput} ${styles.inputWithIcon}`} />
                         </div>
                       </div>
                       <div className={styles.formGroup}>
                         <label className={styles.formLabel}>Yearly (₹)</label>
                         <div style={{position: 'relative'}}>
                           <span className={styles.inputIcon}>₹</span>
                           <input required type="number" value={formData.yearly_price} onChange={e => setFormData({...formData, yearly_price: Number(e.target.value)})} className={`${styles.formInput} ${styles.inputWithIcon}`} />
                         </div>
                       </div>
                     </div>
                  </div>

                  <div className={styles.limitsGrid}>
                     <div className={styles.formGroup}>
                       <label className={styles.formLabel} style={{display: 'flex', gap: '6px', alignItems: 'center'}}><Users size={14}/> Students</label>
                       <input required type="number" value={formData.student_limit} onChange={e => setFormData({...formData, student_limit: Number(e.target.value)})} className={styles.formInput} />
                     </div>
                     <div className={styles.formGroup}>
                       <label className={styles.formLabel} style={{display: 'flex', gap: '6px', alignItems: 'center'}}><GraduationCap size={14}/> Faculty</label>
                       <input required type="number" value={formData.faculty_limit} onChange={e => setFormData({...formData, faculty_limit: Number(e.target.value)})} className={styles.formInput} />
                     </div>
                     <div className={styles.formGroup}>
                       <label className={styles.formLabel} style={{display: 'flex', gap: '6px', alignItems: 'center'}}><Server size={14}/> Storage (GB)</label>
                       <input required type="number" value={formData.storage_limit_gb} onChange={e => setFormData({...formData, storage_limit_gb: Number(e.target.value)})} className={styles.formInput} />
                     </div>
                     <div className={styles.formGroup}>
                       <label className={styles.formLabel} style={{display: 'flex', gap: '6px', alignItems: 'center'}}><Sparkles size={14}/> AI Credits</label>
                       <input required type="number" value={formData.ai_credits} onChange={e => setFormData({...formData, ai_credits: Number(e.target.value)})} className={styles.formInput} />
                     </div>
                  </div>
                  
                  <div>
                    <label className={styles.formLabel} style={{marginBottom: '16px', display: 'block'}}>Toggle Premium Features</label>
                    <div className={styles.toggleGrid}>
                      {[
                        { key: 'custom_branding', label: 'White Label UI', icon: Monitor },
                        { key: 'analytics', label: 'Rich Analytics', icon: Activity },
                        { key: 'priority_support', label: 'Priority Support', icon: TrendingUp },
                        { key: 'certificate_module', label: 'Certificates', icon: Target },
                        { key: 'attendance_module', label: 'Attendance', icon: Clock },
                        { key: 'community_access', label: 'Community API', icon: PlayCircle }
                      ].map(feat => {
                        const Icon = feat.icon;
                        return (
                        <label key={feat.key} className={`${styles.toggleLabel} ${formData[feat.key as keyof typeof formData] ? styles.active : ''}`}>
                          <div className={styles.checkboxSquare}>
                             {formData[feat.key as keyof typeof formData] && <CheckCircle size={14} color="var(--bg-primary)" />}
                          </div>
                          <input type="checkbox" style={{display: 'none'}} checked={formData[feat.key as keyof typeof formData]} onChange={e => setFormData({...formData, [feat.key]: e.target.checked})} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                             <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{feat.label}</span>
                          </div>
                        </label>
                      )})}
                    </div>
                  </div>
                </div>
                
                <div className={styles.modalFooter}>
                   <button type="button" onClick={() => setIsModalOpen(false)} className={styles.secondaryButton}>Cancel</button>
                   <button type="submit" disabled={isSubmitting} className={styles.primaryButton}>
                      {isSubmitting ? <Loader2 size={18} className={styles.spinIcon} /> : <CheckCircle size={18} />}
                      {editingPlan ? 'Save Changes' : 'Publish Plan'}
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
