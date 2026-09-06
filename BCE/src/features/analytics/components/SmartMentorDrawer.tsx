'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { askSmartMentorAction, MentorChatMessage } from '../actions/mentor';
import { X, Send, Sparkles, Brain, Bot, User, ArrowRight, RefreshCw, CheckCircle2, Maximize2, Minimize2 } from 'lucide-react';

interface SmartMentorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

const SUGGESTED_PROMPTS = [
  '• What should I learn next?',
  '• Analyze my DSA',
  '• Make my 30-day plan',
  '• Best course for me?',
  '• Why are you recommending this course?'
];

export default function SmartMentorDrawer({
  isOpen,
  onClose,
  initialPrompt
}: SmartMentorDrawerProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<MentorChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi! I'm **Smart Mentor**, your personal learning guide powered by your Smart Learn 360° profile.\n\nHow can I help you improve your skills, DSA, or course completion today?`,
      actionButtons: [
        { label: 'Explore Courses', url: '/courses' },
        { label: 'View DSA Sheets', url: '/code-arena/sheets' }
      ]
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const promptText = (textToSend || inputVal).trim();
    if (!promptText || isLoading) return;

    const userMsg: MentorChatMessage = {
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    try {
      const historyForAction = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await askSmartMentorAction({
        prompt: promptText,
        history: historyForAction
      });

      if (res.error) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ ${res.error}`,
            actionButtons: [{ label: 'View Courses', url: '/courses' }]
          }
        ]);
      } else if (res.reply) {
        const replyText: string = res.reply;
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: replyText,
            actionButtons: res.actionButtons,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Your analytics are available, but the AI mentor service is temporarily offline. Please try again.',
          actionButtons: [{ label: 'Explore Courses', url: '/courses' }]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && !isMaximized) {
      document.body.classList.remove('sidebar-is-collapsed');
    } else if (!isOpen && typeof document !== 'undefined') {
      const sidebarElem = document.querySelector('.sidebar');
      const sidebarIsCollapsed = sidebarElem?.classList.contains('is-collapsed');
      if (sidebarIsCollapsed) {
        document.body.classList.add('sidebar-is-collapsed');
      }
    }
  }, [isOpen, isMaximized]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (initialPrompt) {
        handleSendPrompt(initialPrompt);
      }
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && !isMaximized) {
      document.body.classList.remove('sidebar-is-collapsed');
      document.body.classList.add('mentor-drawer-open');
    } else {
      document.body.classList.remove('mentor-drawer-open');
      if (!isOpen && typeof document !== 'undefined') {
        const sidebarElem = document.querySelector('.sidebar');
        const sidebarIsCollapsed = sidebarElem?.classList.contains('is-collapsed');
        if (sidebarIsCollapsed) {
          document.body.classList.add('sidebar-is-collapsed');
        }
      }
    }
    return () => {
      document.body.classList.remove('mentor-drawer-open');
    };
  }, [isOpen, isMaximized]);

  if (!isOpen || !mounted) return null;

  const drawerContent = (
    <div 
      className={`smart-mentor-container ${isMaximized ? 'is-maximized' : 'in-sidebar'}`}
      style={
        isMaximized
          ? {
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              zIndex: 1000000,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }
          : {
              position: 'fixed',
              right: 0,
              top: '64px',
              bottom: 0,
              width: '420px',
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary)',
              borderLeft: '1px solid var(--glass-border)',
              boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.7)',
              boxSizing: 'border-box',
              zIndex: 999999
            }
      }
    >
      <div 
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
          position: 'relative'
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
            <div style={{ background: 'rgba(0, 229, 255, 0.12)', color: 'var(--neon-cyan)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✦ Smart Mentor
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                {isMaximized ? 'Full-Screen Learning Guide' : 'Personal AI Mentor'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              title={isMaximized ? "Restore Drawer Size" : "Full Screen AI Mentor"}
            >
              {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isMaximized ? 'Full Screen' : 'Full Open'}</span>
            </button>

            <button 
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              title="Close Drawer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

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
                  maxWidth: '90%',
                  alignItems: 'flex-start',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                }}
              >
                <div 
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: msg.role === 'user' ? 'var(--neon-cyan)' : 'rgba(57, 255, 20, 0.15)',
                    color: msg.role === 'user' ? '#000' : 'var(--neon-lime)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(57, 255, 20, 0.3)'
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
                  {msg.content}

                  {/* ACTION BUTTONS IN MENTOR REPLY */}
                  {msg.actionButtons && msg.actionButtons.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      {msg.actionButtons.map((btn, bIdx) => (
                        <Link key={bIdx} href={btn.url} onClick={onClose} style={{ textDecoration: 'none' }}>
                          <Button variant="primary" size="sm" style={{ fontSize: '11px', padding: '4px 10px', height: 'auto' }}>
                            {btn.label} <ArrowRight size={12} />
                          </Button>
                        </Link>
                      ))}
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

          {/* LOADING STATE */}
          {isLoading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--neon-cyan)', fontSize: 'var(--text-xs)', padding: '8px 12px', background: 'rgba(0, 229, 255, 0.08)', borderRadius: 'var(--radius-sm)', width: 'fit-content' }}>
              <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Analyzing your learning profile...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* SUGGESTED PROMPT CHIPS */}
        <div style={{ padding: '8px 12px', background: 'var(--bg-primary)', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {SUGGESTED_PROMPTS.map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendPrompt(promptText.replace(/^•\s*/, ''))}
              disabled={isLoading}
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
              {promptText}
            </button>
          ))}
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
            placeholder="Ask your mentor (e.g. 'Main next kya karun?')..."
            disabled={isLoading}
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
            type="submit" 
            variant="primary" 
            size="sm" 
            disabled={isLoading || !inputVal.trim()}
            style={{ padding: '0 16px' }}
          >
            <Send size={16} />
          </Button>
        </form>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(drawerContent, document.body);
  }

  return drawerContent;
}
