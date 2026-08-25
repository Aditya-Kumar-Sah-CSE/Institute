import React, { useState, useCallback } from 'react';
import { AlertCircle, HelpCircle, CheckCircle, Info } from 'lucide-react';

export interface AlertConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function usePremiumAlert() {
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const showAlert = useCallback((message: string, title = 'Alert', type: AlertConfig['type'] = 'info') => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        title,
        message,
        type,
        confirmText: 'OK',
        onConfirm: () => {
          setConfig(null);
          resolve(true);
        }
      });
    });
  }, []);

  const showConfirm = useCallback((message: string, title = 'Confirm Action', confirmText = 'Confirm', cancelText = 'Cancel', type: AlertConfig['type'] = 'confirm') => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm: () => {
          setConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setConfig(null);
          resolve(false);
        }
      });
    });
  }, []);

  const AlertComponent = () => {
    if (!config) return null;

    const getIcon = () => {
      switch (config.type) {
        case 'success': 
          return <CheckCircle size={28} style={{ color: 'var(--neon-cyan)' }} />;
        case 'warning': 
          return <AlertCircle size={28} style={{ color: '#eab308' }} />;
        case 'error': 
          return <AlertCircle size={28} style={{ color: '#ef4444' }} />;
        case 'confirm': 
          return <HelpCircle size={28} style={{ color: 'var(--neon-purple)' }} />;
        default: 
          return <Info size={28} style={{ color: 'var(--neon-cyan)' }} />;
      }
    };

    const isConfirm = config.type === 'confirm' || !!config.cancelText;

    return (
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        animation: 'prem-fadeIn 0.2s ease-out',
      }}>
        {/* Modal Outer */}
        <div style={{
          background: 'rgba(20, 20, 30, 0.85)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          animation: 'prem-scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              display: 'grid',
              placeItems: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              flexShrink: 0,
            }}>
              {getIcon()}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>{config.title}</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '13.5px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>{config.message}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            {isConfirm && (
              <button
                onClick={config.onCancel}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {config.cancelText || 'Cancel'}
              </button>
            )}
            <button
              onClick={config.onConfirm}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: config.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'var(--neon-cyan)',
                border: config.type === 'error' ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                color: config.type === 'error' ? '#ff8888' : '#000',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: config.type === 'error' ? 'none' : '0 4px 12px rgba(6, 182, 212, 0.2)',
                transition: 'all 0.15s',
              }}
            >
              {config.confirmText || 'OK'}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes prem-fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes prem-scaleUp {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  };

  return { alert: showAlert, confirm: showConfirm, AlertComponent };
}
