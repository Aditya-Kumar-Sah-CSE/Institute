'use client';

import React, { useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { useSmartAgentSession } from '../context/SmartAgentSessionContext';
import DualAudioVisualizer from './DualAudioVisualizer';
import { 
  X, Send, Mic, MicOff, Sparkles, Bot, User, ArrowRight, RefreshCw, 
  ExternalLink, AlertTriangle, Terminal, HelpCircle, Loader2, Volume2, VolumeX, Square, Trash2, CheckCircle2, AlertCircle, Maximize2, Minimize2
} from 'lucide-react';

const QUICK_COMMANDS = [
  '• Open my DSA sheet',
  '• Open problem 4',
  '• Search this problem on YouTube',
  '• Open LaTeX editor',
  '• Make my routine for tomorrow',
  '• Open my ITW course',
  '• What should I learn next?'
];

export default function SmartAgentDrawer() {
  const [isMaximized, setIsMaximized] = React.useState(false);
  const {
    isOpen,
    closeDrawer,
    messages,
    executionState,
    realtimeVoiceState,
    connectionState,
    inputVal,
    setInputVal,
    isLoading,
    isListening,
    isTranscribing,
    isSpeaking,
    isVoiceMode,
    setIsVoiceMode,
    voiceNotice,
    setVoiceNotice,
    handleSendPrompt,
    stopSpeech,
    stopVoiceSession,
    toggleVoiceRecording,
    clearConversation,
    getDynamicLoadingText
  } = useSmartAgentSession();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, isLoading, isListening, isTranscribing, isSpeaking, executionState]);

  // Clean up recording and speech when drawer component unmounts
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        zIndex: 100000,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'stretch'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDrawer();
      }}
    >
      <div 
        style={{
          width: isMaximized ? '100vw' : '450px',
          maxWidth: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.6)',
          position: 'relative',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* HEADER */}
        <div 
          style={{
            padding: 'var(--space-md) var(--space-lg)',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(0, 229, 255, 0.15)', color: 'var(--neon-cyan)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✦ Smart Learn Agent
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                {isMaximized ? 'Full-Screen AI Workspace' : 'AI Assistant & Voice Companion'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* VOICE MODE TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => {
                const nextMode = !isVoiceMode;
                setIsVoiceMode(nextMode);
                if (!nextMode) stopVoiceSession();
              }}
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '4px 10px',
                borderRadius: '12px',
                background: isVoiceMode ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                color: isVoiceMode ? 'var(--neon-cyan)' : 'var(--text-muted)',
                border: isVoiceMode ? '1px solid rgba(0, 229, 255, 0.4)' : '1px solid var(--glass-border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={isVoiceMode ? "Voice Mode ON (Assistant speaks responses)" : "Voice Mode OFF (Silent response text)"}
            >
              {isVoiceMode ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>Voice: {isVoiceMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* FULLSCREEN / MAXIMIZE TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => setIsMaximized(prev => !prev)}
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '4px 10px',
                borderRadius: '12px',
                background: isMaximized ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                color: isMaximized ? 'var(--neon-cyan)' : 'var(--text-muted)',
                border: isMaximized ? '1px solid rgba(0, 229, 255, 0.4)' : '1px solid var(--glass-border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={isMaximized ? "Restore Drawer Size" : "Full Screen AI Assistant"}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isMaximized ? 'Full Screen' : 'Full Open'}</span>
            </button>

            {/* RESET CONVERSATION BUTTON */}
            <button 
              type="button"
              onClick={clearConversation}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              title="Reset Conversation"
            >
              <Trash2 size={16} />
            </button>

            {/* CLOSE PANEL BUTTON */}
            <button 
              type="button"
              onClick={closeDrawer}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              title="Close Assistant Panel"
            >
              <X size={20} />
            </button>
          </div>
        </div>

      {/* VOICE NOTICE TOAST IF UNSUPPORTED OR ERROR */}
      {voiceNotice && (
        <div style={{ padding: '8px 14px', background: 'rgba(255, 170, 0, 0.15)', borderBottom: '1px solid rgba(255, 170, 0, 0.3)', color: '#ffcc00', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> {voiceNotice}
          </span>
          <button onClick={() => setVoiceNotice(null)} style={{ background: 'none', border: 'none', color: '#ffcc00', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* MESSAGES LIST */}
      <div 
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)'
        }}
      >
        {messages.map((msg, idx) => (
          <div 
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: '4px'
            }}
          >
            <div 
              style={{
                display: 'flex',
                gap: '8px',
                maxWidth: '92%',
                alignItems: 'flex-start',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <div 
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: msg.role === 'user' ? 'var(--neon-cyan)' : 'rgba(0, 229, 255, 0.15)',
                  color: msg.role === 'user' ? '#000' : 'var(--neon-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(0, 229, 255, 0.3)'
                }}
              >
                {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
              </div>

              <div 
                style={{
                  background: msg.role === 'user' ? 'rgba(0, 229, 255, 0.15)' : 'var(--bg-input)',
                  border: msg.role === 'user' ? '1px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {/* TOOL EXECUTION OR NAVIGATION STATE BADGE */}
                {msg.navigationState === 'VERIFIED' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#00ff88', background: 'rgba(0, 255, 136, 0.1)', padding: '2px 8px', borderRadius: '4px', marginBottom: '6px' }}>
                    <CheckCircle2 size={10} /> Verified Page Navigation
                  </div>
                )}
                {msg.navigationState === 'FAILED' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#ff6666', background: 'rgba(255, 102, 102, 0.1)', padding: '2px 8px', borderRadius: '4px', marginBottom: '6px' }}>
                    <AlertCircle size={10} /> Verification Failed
                  </div>
                )}
                {msg.navigationState === 'NOT_FOUND' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#ffcc00', background: 'rgba(255, 204, 0, 0.1)', padding: '2px 8px', borderRadius: '4px', marginBottom: '6px' }}>
                    <AlertTriangle size={10} /> 404 Page Not Found
                  </div>
                )}
                {!msg.navigationState && msg.toolExecuted && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--neon-cyan)', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 8px', borderRadius: '4px', marginBottom: '6px' }}>
                    <Terminal size={10} /> Executed: {msg.toolExecuted}
                  </div>
                )}

                {msg.content}

                {/* ACTION BUTTONS */}
                {msg.actions && msg.actions.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {msg.actions.map((act, aIdx) => (
                      act.isExternal ? (
                        <a key={aIdx} href={act.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Button variant="secondary" size="sm" style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', gap: '4px' }}>
                            {act.label} <ExternalLink size={12} />
                          </Button>
                        </a>
                      ) : (
                        <Link key={aIdx} href={act.url} style={{ textDecoration: 'none' }}>
                          <Button variant="primary" size="sm" style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', gap: '4px' }}>
                            {act.label} <ArrowRight size={12} />
                          </Button>
                        </Link>
                      )
                    ))}
                  </div>
                )}

                {/* HIGH RISK CONFIRMATION BOX */}
                {msg.requiresConfirmation && (
                  <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255, 68, 68, 0.12)', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#ff6666', fontWeight: 'bold', marginBottom: '8px' }}>
                      ⚠️ {msg.requiresConfirmation.promptMessage}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        style={{ fontSize: '11px', padding: '4px 12px' }}
                        onClick={() => handleSendPrompt(undefined, {
                          toolName: msg.requiresConfirmation!.toolName,
                          args: msg.requiresConfirmation!.args
                        })}
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {msg.timestamp && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '0 4px' }}>
                {msg.timestamp}
              </span>
            )}
          </div>
        ))}

        {/* LOADING & NAVIGATION HANDSHAKE VERIFICATION STATUS */}
        {isLoading && !isVoiceMode && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--neon-cyan)', fontSize: 'var(--text-xs)', padding: '8px 12px', background: 'rgba(0, 229, 255, 0.08)', borderRadius: 'var(--radius-sm)', width: 'fit-content' }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            <span>{getDynamicLoadingText()}</span>
          </div>
        )}

        {executionState === 'VERIFYING' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#00ff88', fontSize: 'var(--text-xs)', padding: '8px 12px', background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.3)', borderRadius: 'var(--radius-sm)', width: 'fit-content' }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Checking destination page state...</span>
          </div>
        )}

        {/* REAL-TIME DUAL AUDIO ANALYZER BARS */}
        <DualAudioVisualizer />

        {/* VOICE SESSION STOP BUTTON (WHEN ACTIVE) */}
        {realtimeVoiceState !== 'STOPPED' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px' }}>
            <span style={{ fontSize: '11px', color: connectionState === 'error' ? '#ff6666' : 'var(--text-secondary)' }}>
              {connectionState === 'starting' || connectionState === 'connecting'
                ? 'Connecting to voice agent…'
                : connectionState === 'error'
                ? 'Voice agent connection failed'
                : 'Live Voice Session Active'}
            </span>
            <button
              type="button"
              onClick={stopVoiceSession}
              style={{
                background: 'rgba(255, 68, 68, 0.15)',
                border: '1px solid rgba(255, 68, 68, 0.4)',
                color: '#ff6666',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Square size={12} /> Stop Voice Session
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK COMMANDS DISCOVERY CHIPS */}
      <div style={{ padding: '8px 12px', background: 'var(--bg-primary)', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <HelpCircle size={10} /> Things I can do:
        </div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {QUICK_COMMANDS.map((cmdText, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendPrompt(cmdText.replace(/^•\s*/, ''))}
              disabled={isLoading || isListening || isTranscribing}
              style={{
                fontSize: '11px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--glass-border)',
                color: 'var(--neon-cyan)',
                padding: '4px 10px',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
            >
              {cmdText}
            </button>
          ))}
        </div>
      </div>

      {/* INPUT FORM */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendPrompt();
        }}
        style={{
          padding: 'var(--space-md)',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          gap: '8px'
        }}
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask Smart Learn anything..."
          disabled={isLoading || isListening || isTranscribing}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--bg-input)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            outline: 'none'
          }}
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={toggleVoiceRecording}
          disabled={isLoading}
          title={isListening ? "Stop Voice Listening" : "Start Live Voice Assistant"}
          style={{
            padding: '0 12px',
            color: isListening ? '#00ff88' : isVoiceMode ? 'var(--neon-cyan)' : 'var(--text-muted)',
            borderColor: isListening ? 'rgba(0, 255, 136, 0.5)' : isVoiceMode ? 'rgba(0, 229, 255, 0.4)' : 'var(--glass-border)',
            background: isListening ? 'rgba(0, 255, 136, 0.15)' : undefined
          }}
        >
          {isListening ? <Square size={16} /> : isVoiceMode ? <Mic size={16} /> : <MicOff size={16} />}
        </Button>

        <Button 
          type="submit" 
          variant="primary" 
          size="sm" 
          disabled={(isLoading && !isVoiceMode) || !inputVal.trim()}
          style={{ padding: '0 16px' }}
        >
          <Send size={16} />
        </Button>
      </form>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }
      `}</style>
      </div>
    </div>
  );
}
