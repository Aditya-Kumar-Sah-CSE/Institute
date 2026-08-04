'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchChartData } from '@/features/billing/actions';
import { motion } from 'framer-motion';
import { LineChart, Plus } from 'lucide-react';
import styles from '../payment.module.css';

export default function RevenueCharts() {
  const [data, setData] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchChartData(days).then(res => {
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [days]);

  const triggerCreatePlan = () => {
    window.dispatchEvent(new CustomEvent('open-create-plan'));
  };

  return (
    <div className={styles.chartCard}>
      {/* Background gradients */}
      <div className={styles.glowBackground} style={{ backgroundColor: 'var(--accent-emerald)', top: 0, right: 0, transform: 'translate(30%, -50%)', width: '384px', height: '384px' }} />
      <div className={styles.glowBackground} style={{ backgroundColor: 'var(--accent-blue)', bottom: 0, left: 0, transform: 'translate(-30%, 30%)', width: '384px', height: '384px' }} />

      <div className={styles.chartHeader}>
        <div>
          <h2 className={styles.chartTitle}>Revenue Analytics</h2>
          <p className={styles.chartSubtitle}>Live transaction aggregation mapping gross inflows.</p>
        </div>
        
        <div className={styles.chartFilterContainer}>
          {[7, 30, 90, 365].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`${styles.chartFilterButton} ${days === d ? styles.active : ''}`}
            >
              {d === 365 ? '1 Year' : `${d} Days`}
            </button>
          ))}
          <div className={styles.chartDivider} />
          <button className={styles.chartFilterButton} disabled>
            Custom Range
          </button>
        </div>
      </div>

      <div className={styles.chartArea}>
        {loading ? (
          <div className={styles.chartLoading}>
            <div className={styles.chartLoadingFlex}>
              <div className={styles.chartSpinner} />
              <div className={styles.chartLoadingText}>Aggregating ledgers...</div>
            </div>
          </div>
        ) : data.length === 0 ? (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.chartEmpty}>
             <div className={styles.chartEmptyIconWrapper}>
                <div className={styles.chartEmptyGlow} />
                <LineChart size={80} color="var(--accent-emerald)" style={{ position: 'relative', zIndex: 10, margin: '0 auto', marginBottom: '16px' }} />
             </div>
             
             <h3 className={styles.chartEmptyTitle}>No Revenue Yet</h3>
             <p className={styles.chartEmptyText}>
                Revenue data will automatically appear after institutions complete successful payments against your active plans.
             </p>
             <button onClick={triggerCreatePlan} className={styles.chartEmptyButton}>
                <Plus size={20} /> Create First Plan
             </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ height: '100%', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  
                  {/* Grid gradient for fading out vertical lines at bottom */}
                  <linearGradient id="gridFade" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="rgba(255,255,255,0.08)"/>
                     <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
                  </linearGradient>
                </defs>
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} 
                   dy={15} 
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }}
                   tickFormatter={(value) => `₹${value.toLocaleString()}`}
                />
                <CartesianGrid vertical={false} stroke="url(#gridFade)" />
                <Tooltip 
                  cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className={styles.chartTooltip}>
                          <p className={styles.chartTooltipLabel}>{label}</p>
                          <p className={styles.chartTooltipValue}>
                             <span style={{ color: 'var(--accent-emerald)', marginRight: '4px' }}>₹</span>
                             {payload[0].value?.toLocaleString('en-IN')}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  fill="url(#colorRevenue)" 
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#fff' }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </div>
  );
}
