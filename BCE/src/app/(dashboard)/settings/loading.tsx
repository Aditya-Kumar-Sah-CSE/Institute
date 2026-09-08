import React from 'react';

export default function SettingsLoading() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
      <div style={{
        height: '40px',
        width: '60%',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        marginBottom: '16px',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <div style={{
        height: '100px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        marginBottom: '24px',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          height: '240px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '14px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        <div style={{
          height: '240px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '14px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
      </div>
    </div>
  );
}
