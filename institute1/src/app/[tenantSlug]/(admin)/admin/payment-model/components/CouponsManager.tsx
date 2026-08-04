'use client';

import React, { useState } from 'react';
import { createCoupon, deleteCoupon } from '@/features/billing/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Trash2, Plus, XCircle, Percent, Minus, Loader2, Scissors, CopyIcon, Clock } from 'lucide-react';
import styles from '../payment.module.css';

export default function CouponsManager({ isSuperAdmin, initialCoupons }: { isSuperAdmin: boolean, initialCoupons: any[] }) {
  const [coupons, setCoupons] = useState<any[]>(initialCoupons);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    code: '', discount_type: 'percentage', discount_value: 0, 
    max_discount: 0, min_purchase: 0, usage_limit: 100
  });

  const handleDelete = async (id: string, code: string) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Revoke coupon ${code}? This immediately prevents future uses.`)) return;
    try {
      await deleteCoupon(id);
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, status: 'disabled' } : c));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      await createCoupon({...form, code: form.code.toUpperCase()});
      window.location.reload();
    } catch(err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
             <Tag className={styles.accentRoseText} size={24}/> Promotional Offers
          </h2>
          <p className={styles.sectionSubtitle}>Provide specific institutions with override acquisition discounts.</p>
        </div>
        {isSuperAdmin && (
           <button onClick={() => setShowModal(true)} className={styles.primaryButton}>
             <Plus size={16} style={{ marginRight: '8px' }} /> Issue Coupon
           </button>
        )}
      </div>

      <div className={styles.couponGrid}>
         {coupons.map((c, i) => {
            const isActive = c.status === 'active';
            const isPercent = c.discount_type === 'percentage';
            
            return (
              <motion.div 
                 key={c.id}
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.1 }}
              >
                <div className={`${styles.couponTicket} ${isActive ? '' : styles.inactive}`}>
                  
                  {/* Left Ticket Side */}
                  <div className={`${styles.couponLeft} ${isActive ? styles.active : ''}`}>
                     {/* Punch holes */}
                     <div className={styles.punchHoleTop} />
                     <div className={styles.punchHoleBottom} />
                     
                     <div className={styles.couponIconBox}>
                        {isPercent ? <Percent size={32} color="var(--accent-rose)" /> : <Minus size={32} color="var(--accent-rose)" />}
                     </div>
                     <span className={styles.couponValue}>
                        {c.discount_value}
                     </span>
                     <span className={styles.couponType}>
                        {isPercent ? 'Percent' : 'Flat Off'}
                     </span>
                  </div>
                  
                  {/* Right Ticket Side */}
                  <div className={styles.couponRight}>
                     <div className={styles.couponGlow} />
                     
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span className={styles.couponType} style={{ marginBottom: '4px' }}>Coupon Code</span>
                           <h3 className={styles.couponCode}>
                             {c.code} 
                             {isActive && (
                               <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Copy Code">
                                 <CopyIcon size={16}/>
                               </button>
                             )}
                           </h3>
                        </div>
                        {isSuperAdmin && isActive && (
                           <button onClick={() => handleDelete(c.id, c.code)} className={styles.tableActionButton}>
                             <Trash2 size={16}/>
                           </button>
                        )}
                     </div>

                     <div className={styles.couponMetaBox}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Scissors size={10}/> Limit</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.usage_limit ? `${c.usage_count}/${c.usage_limit}` : 'Uncapped'}</span>
                        </div>
                        <div className={styles.couponDivider} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10}/> Status</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isActive ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>{isActive ? 'Valid' : 'Revoked'}</span>
                        </div>
                     </div>
                  </div>
                </div>
              </motion.div>
            );
         })}
      </div>

      {coupons.length === 0 && (
         <div className={styles.emptyState}>
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ marginBottom: '24px' }}>
              <div className={styles.chartEmptyIconWrapper}>
                 <div className={styles.chartEmptyGlow} style={{ background: 'rgba(244,63,94,0.2)' }} />
                 <Tag size={80} style={{ color: 'var(--accent-rose)', position: 'relative', zIndex: 10, margin: '0 auto', marginBottom: '16px' }} strokeWidth={1.5} />
              </div>
           </motion.div>
           <h3 className={styles.chartEmptyTitle}>No Coupons Crafted</h3>
           <p className={styles.chartEmptyText}>
              Boost your SaaS conversions by generating explicit acquisition discounts.
           </p>
           {isSuperAdmin && (
             <button onClick={() => setShowModal(true)} className={styles.primaryButton}>
               <Plus size={20} style={{ marginRight: '8px' }} /> Issue First Coupon
             </button>
           )}
         </div>
      )}

      <AnimatePresence>
         {showModal && isSuperAdmin && (
             <div className={styles.modalBackdrop}>
               <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} className={styles.modalContent}>
                 
                 <div className={styles.modalHeaderLine} style={{ background: 'linear-gradient(to right, #f43f5e, #a855f7)' }} />
                 
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h3 className={styles.sectionTitle} style={{ fontSize: '1.25rem', marginBottom: 0 }}>
                      <Tag size={20} style={{ color: 'var(--accent-rose)' }} /> Create Promotion Code
                    </h3>
                    <button onClick={() => setShowModal(false)} className={styles.modalCloseBtn}><XCircle size={20}/></button>
                 </div>
                 
                 <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label className={styles.configLabel}>Coupon Identity</label>
                      <input required type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className={styles.configInput} style={{ fontFamily: 'monospace', fontSize: '1.125rem', letterSpacing: '0.1em', textTransform: 'uppercase' }} placeholder="e.g. EARLYBIRD2026" />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                       <div>
                         <label className={styles.configLabel}>Type</label>
                         <div style={{ position: 'relative' }}>
                           <select value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})} className={`${styles.configInput} ${styles.configSelect}`}>
                              <option value="percentage">Percentage (%)</option>
                              <option value="flat">Flat Amount (₹)</option>
                           </select>
                           <div className={styles.selectCaret} />
                         </div>
                       </div>
                       <div>
                         <label className={styles.configLabel}>Value</label>
                         <input required type="number" step="0.01" value={form.discount_value} onChange={e => setForm({...form, discount_value: Number(e.target.value)})} className={styles.configInput} />
                       </div>
                    </div>
                    
                    <div>
                      <label className={styles.configLabel}>Usage Execution Limit</label>
                      <input type="number" placeholder="Leave empty for unlimited deployments" value={form.usage_limit} onChange={e => setForm({...form, usage_limit: Number(e.target.value)})} className={styles.configInput} />
                    </div>
                    
                    <button type="submit" disabled={loading} className={styles.primaryButton} style={{ width: '100%', marginTop: '16px', background: 'var(--accent-rose)', color: '#fff', boxShadow: '0 0 20px rgba(244,63,94,0.3)' }}>
                       {loading ? <Loader2 className={styles.spinIcon} size={20} /> : 'Issue Promotion Code'}
                    </button>
                 </form>
               </motion.div>
             </div>
         )}
      </AnimatePresence>
    </div>
  );
}
