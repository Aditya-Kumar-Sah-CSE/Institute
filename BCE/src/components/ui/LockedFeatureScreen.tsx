'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, ShieldAlert, ArrowLeft, AlertTriangle } from 'lucide-react';

interface LockedFeatureScreenProps {
  featureName?: string;
  reason?: string;
}

export default function LockedFeatureScreen({
  featureName = 'Coding Arena',
  reason = 'The Platform Owner / System Administrator has activated an Emergency Kill Switch for this module.',
}: LockedFeatureScreenProps) {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '20px',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(239, 68, 68, 0.15), 0 0 30px rgba(0, 0, 0, 0.5)',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {/* Glowing Icon Container */}
        <div
          style={{
            width: '84px',
            height: '84px',
            margin: '0 auto 24px auto',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.05))',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.3)',
          }}
        >
          <Lock size={42} style={{ color: '#ef4444' }} />
        </div>

        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          <ShieldAlert size={14} />
          <span>Feature Temporarily Locked</span>
        </div>

        {/* Title */}
        <h2
          style={{
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: 800,
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em',
          }}
        >
          {featureName} is Disabled
        </h2>

        {/* Reason */}
        <p
          style={{
            color: '#94a3b8',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: '0 0 28px 0',
          }}
        >
          {reason}
        </p>

        {/* Status Box */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#fbbf24',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} />
          <span>Super Admin Emergency Kill Switch Active</span>
        </div>

        {/* Action Button */}
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px 24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            transition: 'transform 0.2s ease',
          }}
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
