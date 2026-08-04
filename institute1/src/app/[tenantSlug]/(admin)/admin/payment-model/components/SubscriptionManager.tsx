'use client';

import React, { useState } from 'react';
import { generateInvoice } from '@/features/billing/actions';
import { FileText, Download, CheckCircle, Clock, XCircle, Search, CreditCard, Building2, PauseCircle, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import styles from '../payment.module.css';

export default function SubscriptionManager({ isSuperAdmin, initialSubs }: { isSuperAdmin: boolean, initialSubs: any[] }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredSubs = initialSubs.filter(sub => {
    if (filter !== 'all' && sub.status !== filter) return false;
    if (search && sub.profiles?.name && !sub.profiles.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleInvoice = async (id: string) => {
    if (!isSuperAdmin) return;
    try {
      await generateInvoice(id);
      alert('Invoice generating...');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
     switch(status.toLowerCase()) {
       case 'active': case 'paid': 
         return <div className={`${styles.statusBadge} ${styles.statusActive}`}><CheckCircle size={14}/> Active</div>;
       case 'trial': 
         return <div className={`${styles.statusBadge} ${styles.statusTrial}`}><Clock size={14}/> Trial</div>;
       case 'cancelled': 
         return <div className={`${styles.statusBadge} ${styles.statusCancelled}`}><XCircle size={14}/> Cancelled</div>;
       case 'paused':
         return <div className={`${styles.statusBadge} ${styles.statusPaused}`}><PauseCircle size={14}/> Paused</div>;
       default: 
         return <div className={styles.statusBadge}><Clock size={14}/> {status}</div>;
     }
  };

  const getGradient = (name: string) => {
    const gradients = [
      'linear-gradient(135deg, #34d399 0%, #06b6d4 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
      'linear-gradient(135deg, #d946ef 0%, #f43f5e 100%)',
      'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #9333ea 100%)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            Ledger & Subscriptions
          </h2>
          <p className={styles.sectionSubtitle}>Monitor billing cycles, payment statuses, and upcoming renewals.</p>
        </div>
        
        <div className={styles.filterControls}>
           <div className={styles.searchInputWrapper}>
              <Search className={styles.searchIcon} size={16} />
              <input type="text" placeholder="Search institutions..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
           </div>
           
           <div className={styles.selectInputWrapper}>
             <select value={filter} onChange={e => setFilter(e.target.value)} className={styles.selectInput}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">At Trial</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
             </select>
             <div className={styles.selectCaret} />
           </div>
        </div>
      </div>

      <div className={styles.tableCard}>
         <div className={styles.tableWrapper}>
           <table className={styles.premiumTable}>
             <thead>
               <tr className={styles.tableHeader}>
                 <th className="firstCol">Institution</th>
                 <th>Pricing Tier</th>
                 <th>Status</th>
                 <th>Ledger History</th>
                 <th className="lastCol">Actions</th>
               </tr>
             </thead>
             <tbody>
               <AnimatePresence>
                 {filteredSubs.length === 0 ? (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                       <td colSpan={5} style={{ padding: '64px', textAlign: 'center' }}>
                          <div className={styles.chartEmptyIconWrapper}>
                             <div className={styles.chartEmptyGlow} />
                             <Building2 size={64} style={{ color: 'var(--text-muted)', position: 'relative', zIndex: 10, margin: '0 auto', marginBottom: '24px' }} />
                          </div>
                          <h3 className={styles.chartEmptyTitle}>No Subscriptions Active</h3>
                          <p className={styles.chartEmptyText} style={{ margin: '0 auto' }}>
                             Institutions signing up and attaching billing plans will appear securely tracked right here.
                          </p>
                       </td>
                    </motion.tr>
                 ) : filteredSubs.map((s, i) => {
                   const instName = s.profiles?.name || 'Unknown Institution';
                   const initial = instName.charAt(0).toUpperCase();
                   
                   return (
                     <motion.tr 
                        key={s.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={styles.tableRow}
                     >
                       <td className={`${styles.tableCell} firstCol`}>
                          <div className={styles.identityFlex}>
                             <div className={styles.avatarBox} style={{ background: getGradient(instName) }}>
                               {initial}
                             </div>
                             <div>
                               <div className={styles.identityName}>{instName}</div>
                               <div className={styles.identityMeta}><Fingerprint size={12}/> {s.profiles?.email || 'N/A'}</div>
                             </div>
                          </div>
                       </td>
                       
                       <td className={styles.tableCell}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                             {s.pricing_plans?.name || 'Custom Build'}
                             <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-emerald)', fontWeight: 400 }}>
                               ₹{s.pricing_plans?.monthly_price || 0}/mo
                             </span>
                          </div>
                       </td>
                       
                       <td className={styles.tableCell}>
                          {getStatusBadge(s.status)}
                       </td>
                       
                       <td className={styles.tableCell}>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: 'var(--accent-emerald)' }}>₹</span>{(s.total_paid || 0).toLocaleString('en-IN')} Secured
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Renews {s.renews_at ? format(new Date(s.renews_at), 'MMM dd, yyyy') : 'Manual'}
                            </span>
                         </div>
                       </td>
                       
                       <td className={`${styles.tableCell} lastCol`}>
                         {isSuperAdmin ? (
                            <button onClick={() => handleInvoice(s.id)} className={`${styles.tableActionButton} ${styles.primary}`}>
                               <FileText size={16} /> Dispatch Invoice
                            </button>
                         ) : (
                            <button className={styles.tableActionButton}>
                               <Download size={16} /> Download PDF
                            </button>
                         )}
                       </td>
                     </motion.tr>
                   );
                 })}
               </AnimatePresence>
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
