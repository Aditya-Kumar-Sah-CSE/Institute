'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, ExternalLink, Cloud, CheckCircle, LogOut, ArrowRight, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getUserStorageUsage, StorageUsageResult } from '@/features/profile/actions/storage';
import { getGoogleDriveStatus, disconnectGoogleDrive, migrateExistingFilesToDrive, GoogleDriveStatusResult } from '@/features/profile/actions/google-drive';

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
  const [dbData, setDbData] = useState<StorageUsageResult | null>(null);
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatusResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const [migrating, setMigrating] = useState<boolean>(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [showMigrateModal, setShowMigrateModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [dbRes, driveRes] = await Promise.all([
        getUserStorageUsage(userId),
        getGoogleDriveStatus(userId),
      ]);
      setDbData(dbRes);
      setDriveStatus(driveRes);
    } catch (err) {
      console.error('Failed to load storage status:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setHasMounted(true);
    loadData();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('drive_connected') === 'true') {
        setShowMigrateModal(true);
      }
      const err = params.get('drive_error');
      if (err) {
        setErrorMessage('Google Drive is temporarily unavailable. Please try again later.');
      }
    }

    const handleStorageUpdate = () => loadData();
    window.addEventListener('storage-updated', handleStorageUpdate);
    return () => window.removeEventListener('storage-updated', handleStorageUpdate);
  }, [userId]);

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Files stored in your Drive will remain safe.')) return;
    setIsRefreshing(true);
    await disconnectGoogleDrive();
    await loadData();
  };

  const handleMigrateFiles = async () => {
    setMigrating(true);
    setMigrationResult(null);
    const res = await migrateExistingFilesToDrive();
    setMigrating(false);
    if (res.success) {
      setMigrationResult(`Successfully moved ${res.migratedCount} file(s) to Google Drive!`);
      setTimeout(() => {
        setShowMigrateModal(false);
        loadData();
      }, 2500);
    } else {
      setMigrationResult(`Migration error: ${res.error}`);
    }
  };

  if (!hasMounted) {
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
          minHeight: '120px',
          ...style,
        }}
      />
    );
  }

  // 1. CONNECTED STATE (Google Drive Connected ✓)
  if (driveStatus?.connected) {
    const percentage = driveStatus.percentageUsed || 0;
    const driveUsed = driveStatus.formattedDriveUsed || '0 B';
    const driveLimit = driveStatus.formattedDriveLimit || '15 GB';
    const email = driveStatus.email || 'connected@gmail.com';
    const fileCount = driveStatus.appFileCount || 0;
    const appBytes = driveStatus.formattedAppFileBytes || '0 B';

    const getProgressColor = () => {
      if (percentage > 90) return 'linear-gradient(90deg, #ff007f, #ff2a85)';
      if (percentage > 70) return 'linear-gradient(90deg, #ff9900, #ff5500)';
      return 'linear-gradient(90deg, #00f2fe, #4facfe)';
    };

    return (
      <div
        className={`storage-usage-indicator ${className}`}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: compact ? '14px 16px' : '18px 22px',
          width: '100%',
          boxSizing: 'border-box',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.3s ease',
          textAlign: 'left',
          boxShadow: 'var(--shadow-md)',
          ...style,
        }}
      >
        {/* Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(0, 242, 254, 0.15)',
                color: '#00f2fe',
                border: '1px solid rgba(0, 242, 254, 0.3)',
              }}
            >
              <Cloud size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.2px' }}>
                Google Drive Storage
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{email}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '3px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle size={12} /> ✓ Google Drive Connected
            </span>
          </div>
        </div>

        {/* Usage Numbers */}
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.4px' }}>
          {driveUsed} <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>/ {driveLimit}</span>
        </div>

        {/* Subtext */}
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Smart Learn Files: <strong style={{ color: 'var(--text-primary)' }}>{fileCount} files</strong> ({appBytes})
        </div>

        {/* Progress Bar Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '8px',
            background: 'var(--interactive-hover)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '14px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.max(percentage, 2)}%`,
              background: getProgressColor(),
              borderRadius: '4px',
              transition: 'width 0.6s ease',
            }}
          />
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href={driveStatus.rootFolderId ? `https://drive.google.com/drive/folders/${driveStatus.rootFolderId}` : 'https://drive.google.com'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#00f2fe',
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              padding: '6px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={13} /> Open Drive
          </a>

          <button
            onClick={loadData}
            disabled={isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>

          <button
            onClick={handleDisconnect}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#f43f5e',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} /> Disconnect
          </button>
        </div>

        {/* Move Existing Files Modal Banner */}
        {showMigrateModal && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Move existing files to Google Drive?</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Safe migration directly to your Code Arena Drive folder.</div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleMigrateFiles}
                disabled={migrating}
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {migrating ? 'Moving...' : 'Move Files'}
              </button>
              <button
                onClick={() => setShowMigrateModal(false)}
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Not Now
              </button>
            </div>
          </div>
        )}

        {migrationResult && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
            {migrationResult}
          </div>
        )}
      </div>
    );
  }

  // 2. DISCONNECTED STATE (Clean, production-ready UI)
  return (
    <div
      className={`storage-usage-indicator ${className}`}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: compact ? '14px 16px' : '18px 22px',
        width: '100%',
        boxSizing: 'border-box',
        backdropFilter: 'blur(10px)',
        textAlign: 'left',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cloud size={18} style={{ color: '#00f2fe' }} />
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Google Drive Storage</span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            padding: '2px 8px',
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
          }}
        >
          Disconnected
        </span>
      </div>

      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
        {loading ? '...' : dbData?.formattedTotal || '0 B'}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
        Connect your Google Drive to store files securely in your own Drive.
      </p>

      {/* EXPANDABLE CONNECTION GUIDE */}
      <div style={{ marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--neon-cyan)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <HelpCircle size={14} /> How to connect Google Drive? {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showGuide && (
          <div
            style={{
              marginTop: '8px',
              padding: '10px 12px',
              background: 'rgba(0, 242, 254, 0.05)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6'
            }}
          >
            <ol style={{ margin: 0, paddingLeft: '16px' }}>
              <li>Click <strong>Connect Google Drive</strong> below.</li>
              <li>Sign in to your Google account and grant permissions.</li>
              <li>Smart Learn automatically creates your <strong>/Smart Learn/</strong> root folder.</li>
              <li>Your files stay 100% private in your own Google Drive!</li>
            </ol>
          </div>
        )}
      </div>

      {errorMessage && (
        <div
          style={{
            marginBottom: '12px',
            padding: '8px 12px',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '8px',
            color: '#fb7185',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertCircle size={14} /> {errorMessage}
        </div>
      )}

      <a
        href="/api/auth/google-drive/connect"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: '700',
          color: '#ffffff',
          background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
          padding: '10px 18px',
          borderRadius: '8px',
          textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(0, 242, 254, 0.3)',
          transition: 'all 0.2s ease',
        }}
      >
        <Cloud size={16} /> Connect Google Drive <ArrowRight size={14} />
      </a>
    </div>
  );
}
