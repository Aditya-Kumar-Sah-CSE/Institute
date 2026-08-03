'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, Search } from 'lucide-react';
import styles from '../payment.module.css';

export default function RecentTransactions({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  // Empty State Design
  return (
    <div className={styles.tableCard} style={{ padding: '32px' }}>
      <div className={styles.sectionHeader}>
         <div>
           <h2 className={styles.sectionTitle}>
             Recent Transactions
           </h2>
           <p className={styles.sectionSubtitle}>Real-time payment capturing and invoice ledger.</p>
         </div>
         <div className={styles.filterControls}>
           <div className={styles.searchInputWrapper}>
              <Search className={styles.searchIcon} size={16} />
              <input type="text" placeholder="Search invoices..." className={styles.searchInput} />
           </div>
         </div>
      </div>

      <div className={styles.emptyState}>
         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ marginBottom: '24px' }}>
            <div className={styles.chartEmptyIconWrapper}>
               <div className={styles.chartEmptyGlow} />
               <Receipt size={80} style={{ color: 'var(--accent-emerald)', position: 'relative', zIndex: 10, margin: '0 auto', marginBottom: '16px' }} />
            </div>
         </motion.div>
         <h3 className={styles.chartEmptyTitle}>No Transactions Yet</h3>
         <p className={styles.chartEmptyText}>
           Payments will automatically populate here after successful billing setups or manual invoice clearing.
         </p>
         {isSuperAdmin && (
           <button className={styles.secondaryButton}>
             Configure Webhooks
           </button>
         )}
      </div>
    </div>
  );
}
