import React from 'react';
import { Crown, ShieldCheck } from 'lucide-react';

interface SuperAdminBadgeProps {
  email?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export const SuperAdminBadge: React.FC<SuperAdminBadgeProps> = ({
  email = process.env.SUPER_ADMIN_EMAIL || 'iambestadi@gmail.com',
  showDetails = true,
  compact = false,
}) => {
  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.1))',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          color: '#facc15',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px',
        }}
      >
        <Crown size={13} style={{ color: '#facc15' }} /> SUPER ADMIN
      </span>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.95))',
        border: '1px solid rgba(234, 179, 8, 0.4)',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 8px 32px rgba(234, 179, 8, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          width: '60px',
          height: '60px',
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #eab308, #ca8a04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)',
          }}
        >
          <Crown size={22} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#facc15',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              👑 SUPER ADMIN
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={10} /> IMMUTABLE
            </span>
          </div>

          <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, marginTop: '2px' }}>
            Platform Owner
          </div>

          {showDetails && (
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
              {email}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
