'use client';

import React, { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { askSmartAgentAction } from '../actions/agent';
import { X, Send, Mic, MicOff, Sparkles, Bot, User, ArrowRight, RefreshCw, ExternalLink, AlertTriangle, Terminal, HelpCircle } from 'lucide-react';

interface SmartAgentMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{ label: string; url: string; isExternal?: boolean }>;
  requiresConfirmation?: {
    toolName: string;
    args: any;
    promptMessage: string;
  };
  toolExecuted?: string;
  timestamp?: string;
}

interface SmartAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  pageContext?: {
    problemId?: string;
    problemTitle?: string;
    courseId?: string;
    courseTitle?: string;
  };
}

const QUICK_COMMANDS = [
  '• Open my DSA sheet',
  '• Open problem 4',
  '• Search this problem on YouTube',
  '• Open LaTeX editor',
  '• Make my routine for tomorrow',
  '• Open my ITW course',
  '• What should I learn next?'
];

export default function SmartAgentDrawer({
  isOpen,
  onClose,
  initialPrompt,
  pageContext
}: SmartAgentDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [messages, setMessages] = useState<SmartAgentMessage[]>([
    {
      role: 'assistant',
      content: `Hi! I'm **Smart Learn AI Agent** ✦\n\nI can execute actions, open courses, launch DSA sheets, search YouTube/GPT, open LaTeX editor, and manage your routine or goals using natural language or voice commands.\n\nTry one of the commands below!`,
      actions: [
        { label: 'Open DSA Sheets', url: '/code-arena/sheets' },
        { label: 'Explore Courses', url: '/courses' }
      ]
    }
  ]);

  const [currentPromptText, setCurrentPromptText] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProcessingVoiceRef = useRef<boolean>(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
  }, [messages, isLoading, isListening]);

  if (!isOpen) return null;

  const getDynamicLoadingText = () => {
    const t = currentPromptText.toLowerCase();
    if (t.includes('search') || t.includes('youtube') || t.includes('yt') || t.includes('gpt') || t.includes('seat') || t.includes('bsc')) {
      return 'Searching Smart Learn & External Sources...';
    }
    if (t.includes('open') || t.includes('kholo') || t.includes('dsa') || t.includes('course') || t.includes('problem') || t.includes('sheet')) {
      return 'Opening page...';
    }
    if (t.includes('weak') || t.includes('intelligence') || t.includes('plan') || t.includes('recommend') || t.includes('kya karu')) {
      return 'Checking your learning intelligence...';
    }
    return 'Processing your command...';
  };

  const handleSendPrompt = async (textToSend?: string, confirmedTool?: { toolName: string; args: any }) => {
    const promptText = (textToSend || inputVal).trim();
    if ((!promptText && !confirmedTool) || isLoading) return;

    setCurrentPromptText(promptText);

    if (!confirmedTool) {
      const userMsg: SmartAgentMessage = {
        role: 'user',
        content: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);
      setInputVal('');
    }

    setIsLoading(true);

    try {
      const historyForAction = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await askSmartAgentAction({
        prompt: promptText || 'Execute confirmed tool',
        history: historyForAction,
        pageContext: {
          route: pathname,
          ...pageContext
        },
        confirmedTool
      });

      if (res.message) {
        const assistantMsg: SmartAgentMessage = {
          role: 'assistant',
          content: res.message,
          actions: res.actions,
          requiresConfirmation: res.requiresConfirmation,
          toolExecuted: res.toolExecuted,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMsg]);

        // Auto-navigate if action provided and low-risk single internal route returned
        if (res.actions && res.actions.length === 1 && !res.actions[0].isExternal) {
          const targetUrl = res.actions[0].url;
          if (targetUrl && targetUrl !== pathname) {
            setTimeout(() => {
              onClose();
              router.push(targetUrl);
            }, 600);
          }
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'An error occurred while executing the command. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceRecognition = () => {
    setVoiceNotice(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Voice input is not supported in this browser. You can use text.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      isProcessingVoiceRef.current = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        if (isProcessingVoiceRef.current) return;
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          isProcessingVoiceRef.current = true;
          setInputVal(transcript);
          handleSendPrompt(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceNotice('Voice input error. Please try typing your command.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setVoiceNotice('Could not start microphone.');
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 100000,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'stretch'
      }}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '500px',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.6)',
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
            <div style={{ background: 'rgba(0, 229, 255, 0.15)', color: 'var(--neon-cyan)', padding: '8px', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✦ Smart Learn Agent
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                Control Smart Learn using natural language or voice
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
            title="Close Agent"
          >
            <X size={22} />
          </button>
        </div>

        {/* VOICE NOTICE TOAST IF UNSUPPORTED */}
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
                  {/* TOOL EXECUTION BADGE */}
                  {msg.toolExecuted && (
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
                          <Link key={aIdx} href={act.url} onClick={onClose} style={{ textDecoration: 'none' }}>
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
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          style={{ fontSize: '11px', padding: '4px 12px' }}
                          onClick={() => setMessages(prev => [...prev, { role: 'assistant', content: 'Action cancelled.' }])}
                        >
                          Cancel
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

          {/* LOADING STATE */}
          {isLoading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--neon-cyan)', fontSize: 'var(--text-xs)', padding: '8px 12px', background: 'rgba(0, 229, 255, 0.08)', borderRadius: 'var(--radius-sm)', width: 'fit-content' }}>
              <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>{getDynamicLoadingText()}</span>
            </div>
          )}

          {/* LISTENING VOICE STATE */}
          {isListening && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#ff4444', fontSize: 'var(--text-xs)', padding: '8px 12px', background: 'rgba(255, 68, 68, 0.12)', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', width: 'fit-content' }}>
              <Mic size={14} style={{ animation: 'pulse 1s infinite alternate' }} />
              <span>Listening... Speak your command now.</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* QUICK COMMANDS DISCOVERY CHIPS ("Things I can do") */}
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
                disabled={isLoading || isListening}
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
            disabled={isLoading || isListening}
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
            onClick={startVoiceRecognition}
            disabled={isLoading || isListening}
            title="Speak Command (Microphone)"
            style={{ padding: '0 12px', color: isListening ? '#ff4444' : 'var(--neon-cyan)', borderColor: isListening ? '#ff4444' : 'var(--glass-border)' }}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </Button>

          <Button 
            type="submit" 
            variant="primary" 
            size="sm" 
            disabled={isLoading || isListening || !inputVal.trim()}
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
        @keyframes pulse {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
