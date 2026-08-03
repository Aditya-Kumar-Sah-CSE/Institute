'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, IndianRupee, Layers, Users, CreditCard, Clock, Activity, Info } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import styles from '../payment.module.css';

interface Metrics {
  totalPlans: number;
  mrr: number;
  arr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  trialInstitutions: number;
}

function AnimatedCounter({ value, prefix = '' }: { value: number, prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const duration = 1200;
    const incrementTime = 30;
    const step = Math.max(1, Math.ceil((end - start) / (duration / incrementTime)));
    
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value]);

  return <>{prefix}{displayValue.toLocaleString('en-IN')}</>;
}

// Generate simple mock sparkline data for each card based on trend
const generateSparkline = (up: boolean) => 
  Array.from({ length: 15 }, (_, i) => ({ 
    val: up ? 10 + i * Math.random() * 5 : 50 - i * Math.random() * 5 
  }));

export default function BillingStatsCards({ metrics }: { metrics: Metrics }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (metrics) setLoading(false);
  }, [metrics]);

  const cards = [
    { title: 'Monthly Recurring (MRR)', val: metrics?.mrr || 0, prefix: '₹', icon: IndianRupee, trend: '+5.2%', up: true, stroke: '#10b981', glowBg: 'var(--accent-emerald)' },
    { title: 'Annual Recurring (ARR)', val: metrics?.arr || 0, prefix: '₹', icon: Activity, trend: '+12.4%', up: true, stroke: '#3b82f6', glowBg: 'var(--accent-blue)' },
    { title: 'Active Subscriptions', val: metrics?.activeSubscriptions || 0, icon: CreditCard, trend: '+2', up: true, stroke: '#10b981', glowBg: 'var(--accent-emerald)' },
    { title: 'Active Pricing Plans', val: metrics?.totalPlans || 0, icon: Layers, trend: '0%', up: true, stroke: '#f59e0b', glowBg: 'var(--accent-amber)' },
    { title: 'Trial Institutions', val: metrics?.trialInstitutions || 0, icon: Clock, trend: '-1', up: false, stroke: '#ef4444', glowBg: 'var(--accent-red)' },
    { title: 'Total Revenue Collected', val: metrics?.totalRevenue || 0, prefix: '₹', icon: Users, trend: '+2.1%', up: true, stroke: '#10b981', glowBg: 'var(--accent-emerald)' },
  ];

  if (loading) {
    return (
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonFlex}>
              <div className={styles.skeletonIcon} />
              <div className={styles.skeletonBadge} />
            </div>
            <div className={`${styles.skeletonTitle} ${styles.skeletonPulse}`} />
            <div className={`${styles.skeletonValue} ${styles.skeletonPulse}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.statsGrid}>
      {cards.map((c, i) => {
        const sparkData = generateSparkline(c.up);
        return (
          <motion.div
             key={c.title}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.05, duration: 0.4 }}
             className={styles.statCardWrapper}
          >
            <div className={styles.statCard}>
              {/* Background Glow */}
              <div className={styles.glowBackground} style={{ backgroundColor: c.glowBg }} />
              
              <div className={styles.statCardContent}>
                <div className={styles.statCardHeader}>
                   <div className={styles.iconContainer}>
                      <c.icon size={20} color={c.stroke} />
                   </div>
                   
                   <div className={`${styles.trendBadge} ${c.up ? styles.trendUp : styles.trendDown}`}>
                      {c.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {c.trend}
                   </div>
                </div>
                
                <div className={`${styles.statTitleWrapper} ${styles.hasTooltip}`}>
                  <h3 className={styles.statTitle}>{c.title}</h3>
                  <Info size={14} className={styles.infoIcon} />
                  <div className={styles.tooltip}>
                    Total cumulative aggregation for {c.title.toLowerCase()}.
                  </div>
                </div>

                <div className={styles.statValueWrapper}>
                   <div className={styles.statValue}>
                      <AnimatedCounter value={c.val} prefix={c.prefix} />
                   </div>
                   
                   {/* Sparkline mini-graph */}
                   <div className={styles.sparklineContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData}>
                          <defs>
                            <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={c.stroke} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={c.stroke} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                          <Area type="monotone" dataKey="val" stroke={c.stroke} strokeWidth={2} fillOpacity={1} fill={`url(#grad-${i})`} isAnimationActive={true} animationDuration={1500} />
                        </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
