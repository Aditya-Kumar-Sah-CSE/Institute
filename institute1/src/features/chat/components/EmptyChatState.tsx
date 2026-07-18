import React from 'react';
import { Smile } from 'lucide-react';

interface EmptyChatStateProps {
  onQuickReply: (text: string) => void;
}

export default function EmptyChatState({ onQuickReply }: EmptyChatStateProps) {
  const suggestions = ['Hii 👋', 'Hello! 😊', 'Good Morning 🌅', 'I have a quick doubt 🤔'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', position: 'absolute', inset: 0 }}>
      {/* Neon glowing Smile icon */}
      <div 
        style={{ 
          background: 'rgba(0, 240, 255, 0.1)', 
          padding: 'var(--space-xl)', 
          borderRadius: '50%', 
          marginBottom: 'var(--space-lg)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)',
          border: '1px solid rgba(0, 240, 255, 0.3)'
        }}
      >
        <Smile size={48} color="var(--neon-cyan)" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.8))' }} />
      </div>
      
      <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--text-primary)', fontSize: 'var(--text-2xl)', fontWeight: 'bold' }}>
        Ready to Connect?
      </h3>
      <p style={{ marginBottom: 'var(--space-2xl)', color: 'var(--text-secondary)', fontSize: 'var(--text-md)', textAlign: 'center', maxWidth: '400px' }}>
        Select a conversation from the sidebar or start a new seamless chat to begin messaging natively.
      </p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-md)', maxWidth: '350px' }}>
        {suggestions.map(suggestion => (
          <button 
            key={suggestion}
            onClick={() => onQuickReply(suggestion)}
            className="glass-card"
            style={{ 
              padding: '10px 20px', 
              borderRadius: 'var(--radius-full)', 
              fontSize: 'var(--text-sm)', 
              color: 'var(--text-primary)', 
              cursor: 'pointer', 
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              border: '1px solid var(--border-default)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--neon-cyan)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0,240,255,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
