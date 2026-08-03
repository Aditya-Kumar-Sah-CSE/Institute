'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ListFilter } from 'lucide-react';
import styles from '../payment.module.css';

export default function AuditLogs({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  if (!isSuperAdmin) return null; // Security rule

  return (
    <div className={styles.tableCard} style={{ padding: '32px' }}>
      <div className={styles.sectionHeader}>
         <div>
           <h2 className={styles.sectionTitle}>
             System Audit Logs
           </h2>
           <p className={styles.sectionSubtitle}>Immutable security ledger capturing sensitive billing mutations.</p>
         </div>
         <div className={styles.filterControls}>
           <button className={styles.secondaryButton}>
              <ListFilter size={16} style={{ marginRight: '8px' }} /> Filter Events
           </button>
         </div>
      </div>

      <div className={styles.emptyState}>
         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ marginBottom: '24px' }}>
            <div className={styles.chartEmptyIconWrapper}>
               <div className={styles.chartEmptyGlow} style={{ background: 'rgba(59,130,246,0.2)' }} />
               <ShieldAlert size={80} style={{ color: 'var(--accent-blue)', position: 'relative', zIndex: 10, margin: '0 auto', marginBottom: '16px' }} />
            </div>
         </motion.div>
         <h3 className={styles.chartEmptyTitle}>No Auditable Events</h3>
         <p className={styles.chartEmptyText}>
           Security sweeps show no critical mutations on the billing logic yet.
         </p>
      </div>
    </div>
  );
}
