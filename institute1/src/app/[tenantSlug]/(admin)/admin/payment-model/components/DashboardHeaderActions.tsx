'use client';

import React from 'react';
import { Plus, Tag, Download, RefreshCw } from 'lucide-react';
import styles from '../payment.module.css';

export default function DashboardHeaderActions() {
  const triggerCreatePlan = () => {
    window.dispatchEvent(new CustomEvent('open-create-plan'));
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className={styles.headerActions}>
       <button className={styles.actionButton} onClick={handleRefresh}>
         <RefreshCw size={16} className={styles.buttonIcon} /> Refresh
       </button>
       <button className={styles.actionButton} onClick={() => alert('Exporting report...')}>
         <Download size={16} className={styles.buttonIcon} /> Export Report
       </button>
       <button className={styles.actionButton} onClick={() => alert('Coupon issuer opening...')}>
         <Tag size={16} className={styles.buttonIcon} /> Issue Coupon
       </button>
       <button className={styles.primaryButton} onClick={triggerCreatePlan}>
         <Plus size={18} /> Create Plan
       </button>
    </div>
  );
}
