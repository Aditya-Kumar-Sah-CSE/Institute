'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Database, HardDrive, RefreshCw } from 'lucide-react';
import { getUserStorageUsage, StorageUsageResult } from '@/features/profile/actions/storage';

interface StorageUsageIndicatorProps {
  userId?: string;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function StorageUsageIndicator({
  userId,
  compact = false,
  className = '',
  style = {},
}: StorageUsageIndicatorProps) {
  const [data, setData] = useState<StorageUsageResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const result = await getUserStorageUsage(userId);
        if (isMounted) {
          setData(result);
          setLoading(false);
          setIsRefreshing(false);
        }
      } catch (err) {
        console.error('Failed to load storage usage:', err);
        if (isMounted) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadData();

    // Listen for global storage-updated event (triggered after file uploads/deletions)
    const handleStorageUpdate = () => {
      if (isMounted) {
        setIsRefreshing(true);
        loadData();
      }
    };

    window.addEventListener('storage-updated', handleStorageUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('storage-updated', handleStorageUpdate);
    };
  }, [userId]);

  const percentage = data?.percentage || 0;
  const formattedUsed = data?.formattedUsed || '0 MB';
  const formattedQuota = data?.formattedQuota || '100 MB';
  const bytes = data?.bytes || 0;

  // Determine indicator color theme based on usage
  const getProgressColor = () => {
    if (percentage > 90) return 'linear-gradient(90deg, #ff007f, #ff2a85)'; // Neon Pink / Red alert
    if (percentage > 70) return 'linear-gradient(90deg, #ff9900, #ff5500)'; // Neon Orange warning
    return 'linear-gradient(90deg, #00f2fe, #4facfe)'; // Neon Cyan standard
  };

  const getGlowColor = () => {
    if (percentage > 90) return 'rgba(255, 0, 127, 0.4)';
    if (percentage > 70) return 'rgba(255, 153, 0, 0.4)';
    return 'rgba(0, 242, 254, 0.3)';
  };

  return (
    <div
      className={`storage-usage-indicator ${className}`}
      style={{
        background: 'var(--bg-elevated, rgba(15, 23, 42, 0.6))',
        border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: compact ? '12px 16px' : '16px 20px',
        width: '100%',
        boxSizing: 'border-box',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        textAlign: 'left',
        ...style,
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: compact ? '26px' : '30px',
              height: compact ? '26px' : '30px',
              borderRadius: '8px',
              background: 'rgba(0, 242, 254, 0.12)',
              color: 'var(--neon-cyan, #00f2fe)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
            }}
          >
            <Database size={compact ? 14 : 16} />
          </div>
          <div>
            <span
              style={{
                fontSize: compact ? '13px' : '14px',
                fontWeight: '600',
                color: 'var(--text-primary, #ffffff)',
                letterSpacing: '0.2px',
              }}
            >
              Database Usage
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isRefreshing && (
            <RefreshCw
              size={12}
              style={{
                animation: 'spin 1s linear infinite',
                color: 'var(--text-secondary, #94a3b8)',
              }}
            />
          )}
          <span
            style={{
              fontSize: compact ? '11px' : '12px',
              fontWeight: '700',
              color: percentage > 90 ? '#ff2a85' : percentage > 70 ? '#ff9900' : 'var(--neon-cyan, #00f2fe)',
              background: percentage > 90 ? 'rgba(255, 42, 133, 0.1)' : percentage > 70 ? 'rgba(255, 153, 0, 0.1)' : 'rgba(0, 242, 254, 0.1)',
              padding: '2px 8px',
              borderRadius: '10px',
              border: '1px solid currentColor',
            }}
          >
            {bytes === 0 ? '0% Used' : `${percentage}% Used`}
          </span>
        </div>
      </div>

      {/* Usage Numbers */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '8px',
          fontSize: compact ? '12px' : '13px',
        }}
      >
        <span style={{ color: 'var(--text-secondary, #94a3b8)', fontWeight: '500' }}>
          {bytes === 0 ? '0 MB Used' : formattedUsed}
        </span>
        <span style={{ color: 'var(--text-muted, #64748b)', fontSize: compact ? '11px' : '12px' }}>
          {formattedUsed} / {formattedQuota}
        </span>
      </div>

      {/* Progress Bar Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: compact ? '6px' : '8px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Progress Bar Fill */}
        <div
          style={{
            height: '100%',
            width: loading ? '0%' : `${bytes === 0 ? 0 : Math.max(percentage, 2)}%`,
            background: getProgressColor(),
            borderRadius: '4px',
            boxShadow: `0 0 8px ${getGlowColor()}`,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
