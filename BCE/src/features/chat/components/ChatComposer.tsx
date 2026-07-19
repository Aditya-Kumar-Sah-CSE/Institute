import React from 'react';
import { Send, Smile, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ChatComposerProps {
  msgInput: string;
  setMsgInput: (val: string) => void;
  handleSend: (e: React.FormEvent) => Promise<void>;
  isSomeoneTyping: boolean;
}

export default function ChatComposer({ msgInput, setMsgInput, handleSend, isSomeoneTyping }: ChatComposerProps) {
  return (
    <div style={{ padding: 'var(--space-md)', background: 'transparent', position: 'relative' }}>
        {isSomeoneTyping && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '-32px', 
              left: '24px', 
              fontSize: '12px', 
              color: 'var(--neon-cyan)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'var(--bg-card)', 
              padding: '6px 14px', 
              borderRadius: '12px 12px 0 0', 
              border: '1px solid var(--border-divider)', 
              borderBottom: 'none',
              boxShadow: '0 -4px 10px rgba(0,0,0,0.1)'
            }}
          >
            <Loader2 size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontWeight: 500 }}>Someone is typing...</span>
          </div>
        )}
        
        <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <button 
            type="button" 
            title="Emojis (Coming soon)"
            style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Smile size={22} />
          </button>
          
          <button 
            type="button" 
            title="Attach file (Coming soon)"
            style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ImageIcon size={22} />
          </button>
          
          <div style={{ flex: 1 }}>
            <input 
              type="text" 
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              placeholder="Type a message..."
              style={{ 
                width: '100%', 
                background: 'rgba(255,255,255,0.05)', 
                backdropFilter: 'blur(10px)',
                borderRadius: '24px', 
                padding: '12px 20px', 
                outline: 'none', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--glass-border)', 
                fontSize: '15px', 
                boxSizing: 'border-box',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0,240,255,0.2), inset 0 2px 4px rgba(0,0,0,0.2)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
              }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={!msgInput.trim()}
            style={{ 
              padding: '12px', 
              background: msgInput.trim() ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))' : 'var(--bg-elevated)', 
              color: msgInput.trim() ? '#000' : 'var(--text-muted)', 
              borderRadius: '50%', 
              border: 'none', 
              cursor: !msgInput.trim() ? 'not-allowed' : 'pointer', 
              transition: 'all 0.2s',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: msgInput.trim() ? '0 4px 15px rgba(0, 240, 255, 0.4)' : 'none'
            }}
          >
            <Send size={18} style={{ transform: 'translateX(1px)' }} />
          </button>
        </form>
    </div>
  );
}
