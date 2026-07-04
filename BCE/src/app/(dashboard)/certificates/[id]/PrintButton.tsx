'use client';

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      style={{
        padding: '8px 16px',
        background: 'var(--neon-gold)',
        color: '#000',
        border: 'none',
        borderRadius: '4px',
        fontWeight: 'bold',
        cursor: 'pointer'
      }}
    >
      🖨️ Print / Save as PDF
    </button>
  );
}
