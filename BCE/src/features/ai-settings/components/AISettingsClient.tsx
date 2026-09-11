'use client';

import React, { useState, useEffect } from 'react';
import { 
  getAIProviderStatusAction, 
  saveAIProviderKeyAction, 
  setActiveProviderAction, 
  removeAIProviderKeyAction, 
  testAIProviderConnectionAction 
} from '../actions/ai-settings';
import { AIProviderName } from '@/lib/ai/providers/types';
import Button from '@/components/ui/Button';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound, 
  Trash2, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Loader2, 
  Zap, 
  Eye, 
  EyeOff,
  AlertCircle
} from 'lucide-react';
import StorageUsageIndicator from '@/components/shared/StorageUsageIndicator';

interface ProviderState {
  provider: AIProviderName;
  keyMask: string;
  isActive: boolean;
  updatedAt: string;
}

export default function AISettingsClient() {
  const [loading, setLoading] = useState(true);
  const [activeProvider, setActiveProvider] = useState<AIProviderName | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<ProviderState[]>([]);
  
  // Form states per provider
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [grokKeyInput, setGrokKeyInput] = useState('');
  
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGrokKey, setShowGrokKey] = useState(false);
  
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isSavingGroq, setIsSavingGroq] = useState(false);
  const [isSavingGrok, setIsSavingGrok] = useState(false);
  
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [isTestingGroq, setIsTestingGroq] = useState(false);
  const [isTestingGrok, setIsTestingGrok] = useState(false);
  
  const [isRemovingGemini, setIsRemovingGemini] = useState(false);
  const [isRemovingGroq, setIsRemovingGroq] = useState(false);
  const [isRemovingGrok, setIsRemovingGrok] = useState(false);
  
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  
  // Expandable guide toggle state
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Status alert messages
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await getAIProviderStatusAction();
      if (res.success) {
        setActiveProvider(res.activeProvider);
        setConnectedProviders(res.providers || []);
      }
    } catch (err: any) {
      console.error('Failed to load AI provider status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getProviderInfo = (name: AIProviderName) => {
    return connectedProviders.find(p => p.provider === name);
  };

  const handleSaveKey = async (provider: AIProviderName) => {
    const rawKey = provider === 'gemini' ? geminiKeyInput : provider === 'groq' ? groqKeyInput : grokKeyInput;
    if (!rawKey.trim()) {
      setAlert({ type: 'error', message: 'Please enter a valid API key first.' });
      return;
    }

    if (provider === 'gemini') setIsSavingGemini(true);
    else if (provider === 'groq') setIsSavingGroq(true);
    else setIsSavingGrok(true);
    setAlert(null);

    try {
      const res = await saveAIProviderKeyAction({ provider, apiKey: rawKey.trim() });
      if (res.success) {
        setAlert({ type: 'success', message: res.message });
        if (provider === 'gemini') setGeminiKeyInput('');
        else if (provider === 'groq') setGroqKeyInput('');
        else setGrokKeyInput('');
        await fetchStatus();
      } else {
        setAlert({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to connect API key.' });
    } finally {
      if (provider === 'gemini') setIsSavingGemini(false);
      else if (provider === 'groq') setIsSavingGroq(false);
      else setIsSavingGrok(false);
    }
  };

  const handleSwitchProvider = async (provider: AIProviderName) => {
    setIsSwitching(provider);
    setAlert(null);
    try {
      const res = await setActiveProviderAction({ provider });
      if (res.success) {
        setAlert({ type: 'success', message: res.message });
        await fetchStatus();
      } else {
        setAlert({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to switch provider.' });
    } finally {
      setIsSwitching(null);
    }
  };

  const handleRemoveKey = async (provider: AIProviderName) => {
    const providerTitle = provider === 'gemini' ? 'Google Gemini' : provider === 'groq' ? 'Groq API' : 'xAI Grok';
    if (!confirm(`Are you sure you want to remove your ${providerTitle} API key? This will permanently delete it from encrypted storage.`)) {
      return;
    }

    if (provider === 'gemini') setIsRemovingGemini(true);
    else if (provider === 'groq') setIsRemovingGroq(true);
    else setIsRemovingGrok(true);
    setAlert(null);

    try {
      const res = await removeAIProviderKeyAction({ provider });
      if (res.success) {
        setAlert({ type: 'success', message: res.message });
        await fetchStatus();
      } else {
        setAlert({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to remove key.' });
    } finally {
      if (provider === 'gemini') setIsRemovingGemini(false);
      else if (provider === 'groq') setIsRemovingGroq(false);
      else setIsRemovingGrok(false);
    }
  };

  const handleTestConnection = async (provider: AIProviderName) => {
    if (provider === 'gemini') setIsTestingGemini(true);
    else if (provider === 'groq') setIsTestingGroq(true);
    else setIsTestingGrok(true);
    setAlert(null);

    const typedKey = provider === 'gemini' ? geminiKeyInput.trim() : provider === 'groq' ? groqKeyInput.trim() : grokKeyInput.trim();

    try {
      const res = await testAIProviderConnectionAction({
        provider,
        apiKey: typedKey || undefined
      });
      if (res.success) {
        setAlert({ type: 'success', message: res.message });
      } else {
        setAlert({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Connection test failed.' });
    } finally {
      if (provider === 'gemini') setIsTestingGemini(false);
      else if (provider === 'groq') setIsTestingGroq(false);
      else setIsTestingGrok(false);
    }
  };

  const geminiInfo = getProviderInfo('gemini');
  const groqInfo = getProviderInfo('groq');
  const grokInfo = getProviderInfo('grok');

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: 'var(--space-md)' }}>
      {/* BREADCRUMB HEADER */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ fontSize: '12px', color: 'var(--neon-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span>Settings</span>
          <span>→</span>
          <span>AI Agent</span>
          <span>→</span>
          <span style={{ color: 'var(--text-primary)' }}>AI Provider</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={26} style={{ color: 'var(--neon-cyan)' }} />
          Per-User BYOK AI Provider
        </h1>
        <p style={{ margin: '6px 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Connect your personal API key for Google Gemini, Groq (Ultra-Fast Llama), or xAI Grok. Keys are encrypted at rest on the server and never exposed to client scripts.
        </p>
      </div>

      {/* SECURITY NOTICE BADGE */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        background: 'rgba(0, 229, 255, 0.08)', 
        border: '1px solid rgba(0, 229, 255, 0.3)', 
        borderRadius: '12px', 
        padding: '12px 16px', 
        marginBottom: 'var(--space-lg)' 
      }}>
        <ShieldCheck size={20} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
          <strong>Zero Trust Security:</strong> Your keys are encrypted with AES-256-GCM server-side. They are never stored in localStorage, never sent back unmasked to the browser, and never logged.
        </span>
      </div>

      {/* ALERT NOTIFICATION */}
      {alert && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: 'var(--space-md)',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: alert.type === 'success' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 68, 68, 0.15)',
          border: alert.type === 'success' ? '1px solid #00ff88' : '1px solid #ff4444',
          color: alert.type === 'success' ? '#00ff88' : '#ff6666'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {alert.message}
          </span>
          <button onClick={() => setAlert(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* EXPANDABLE HOW TO CONNECT SECTION */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--glass-border)', 
        borderRadius: '14px', 
        marginBottom: 'var(--space-lg)',
        overflow: 'hidden'
      }}>
        <button
          type="button"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          style={{
            width: '100%',
            padding: '14px 18px',
            background: 'none',
            border: 'none',
            color: 'var(--neon-cyan)',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} /> How to get your API keys?
          </span>
          {isGuideOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {isGuideOpen && (
          <div style={{ padding: '0 18px 18px 18px', borderTop: '1px solid var(--glass-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', paddingTop: '16px' }}>
            {/* GEMINI GUIDE */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Google Gemini
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-cyan)', display: 'inline-flex', alignItems: 'center' }}>
                  <ExternalLink size={12} />
                </a>
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>Open <strong>Google AI Studio</strong>.</li>
                <li>Click <strong>Get API key</strong>.</li>
                <li>Key starts with <code>AIzaSy...</code></li>
                <li>Paste into Gemini card.</li>
              </ol>
            </div>

            {/* GROQ GUIDE */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00ff88', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Groq API (Fast Llama)
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#00ff88', display: 'inline-flex', alignItems: 'center' }}>
                  <ExternalLink size={12} />
                </a>
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>Open <strong>Groq Console</strong>.</li>
                <li>Click <strong>Create API Key</strong>.</li>
                <li>Key starts with <code>gsk_...</code></li>
                <li>Paste into Groq card.</li>
              </ol>
            </div>

            {/* GROK GUIDE */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                xAI Grok
                <a href="https://console.x.ai/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-cyan)', display: 'inline-flex', alignItems: 'center' }}>
                  <ExternalLink size={12} />
                </a>
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>Open <strong>xAI Console</strong>.</li>
                <li>Create API key.</li>
                <li>Key starts with <code>xai-...</code></li>
                <li>Paste into xAI Grok card.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* PROVIDER CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
        
        {/* GOOGLE GEMINI CARD */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: geminiInfo?.isActive ? '2px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: geminiInfo?.isActive ? '0 0 20px rgba(0, 229, 255, 0.15)' : 'none',
          position: 'relative'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0, 229, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)', fontWeight: 'bold', fontSize: '18px' }}>
                  ✦
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Google Gemini</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gemini 3.6 Flash & Live Voice</span>
                </div>
              </div>

              {geminiInfo ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#00ff88', background: 'rgba(0, 255, 136, 0.15)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(0, 255, 136, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Connected
                  </span>
                  {geminiInfo.isActive && (
                    <span style={{ fontSize: '10px', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                      ★ Active
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '12px' }}>
                  Not Connected
                </span>
              )}
            </div>

            {/* KEY DISPLAY / INPUT */}
            <div style={{ marginTop: '16px' }}>
              {geminiInfo ? (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Stored API Key (Masked)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <KeyRound size={14} style={{ color: 'var(--neon-cyan)' }} />
                    <span style={{ flex: 1 }}>{geminiInfo.keyMask}</span>
                  </div>
                </div>
              ) : null}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {geminiInfo ? 'Update Gemini API Key' : 'Enter Gemini API Key'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSaveKey('gemini')}
              disabled={isSavingGemini || !geminiKeyInput.trim()}
              style={{ flex: 1 }}
            >
              {isSavingGemini ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Connect & Test'}
            </Button>

            {geminiInfo && (
              <>
                {!geminiInfo.isActive && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSwitchProvider('gemini')}
                    disabled={isSwitching === 'gemini'}
                  >
                    Set Active
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTestConnection('gemini')}
                  disabled={isTestingGemini}
                  title="Test Gemini API Key Connection"
                >
                  {isTestingGemini ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Test'}
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveKey('gemini')}
                  disabled={isRemovingGemini}
                  title="Remove Key"
                >
                  {isRemovingGemini ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* GROQ API CARD */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: groqInfo?.isActive ? '2px solid #00ff88' : '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: groqInfo?.isActive ? '0 0 20px rgba(0, 255, 136, 0.18)' : 'none',
          position: 'relative'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0, 255, 136, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ff88', fontWeight: 'bold', fontSize: '18px' }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Groq API</h3>
                  <span style={{ fontSize: '11px', color: '#00ff88', fontWeight: 600 }}>Ultra-Fast Llama-3.3-70B</span>
                </div>
              </div>

              {groqInfo ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#00ff88', background: 'rgba(0, 255, 136, 0.15)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(0, 255, 136, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Connected
                  </span>
                  {groqInfo.isActive && (
                    <span style={{ fontSize: '10px', color: '#00ff88', fontWeight: 'bold' }}>
                      ★ Active
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '12px' }}>
                  Not Connected
                </span>
              )}
            </div>

            {/* KEY DISPLAY / INPUT */}
            <div style={{ marginTop: '16px' }}>
              {groqInfo ? (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Stored API Key (Masked)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <KeyRound size={14} style={{ color: '#00ff88' }} />
                    <span style={{ flex: 1 }}>{groqInfo.keyMask}</span>
                  </div>
                </div>
              ) : null}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {groqInfo ? 'Update Groq API Key' : 'Enter Groq API Key'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showGroqKey ? 'text' : 'password'}
                    value={groqKeyInput}
                    onChange={(e) => setGroqKeyInput(e.target.value)}
                    placeholder="gsk_..."
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showGroqKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSaveKey('groq')}
              disabled={isSavingGroq || !groqKeyInput.trim()}
              style={{ flex: 1 }}
            >
              {isSavingGroq ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Connect & Test'}
            </Button>

            {groqInfo && (
              <>
                {!groqInfo.isActive && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSwitchProvider('groq')}
                    disabled={isSwitching === 'groq'}
                  >
                    Set Active
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTestConnection('groq')}
                  disabled={isTestingGroq}
                  title="Test Groq API Key Connection"
                >
                  {isTestingGroq ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Test'}
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveKey('groq')}
                  disabled={isRemovingGroq}
                  title="Remove Key"
                >
                  {isRemovingGroq ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* XAI GROK CARD */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: grokInfo?.isActive ? '2px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: grokInfo?.isActive ? '0 0 20px rgba(0, 229, 255, 0.15)' : 'none',
          position: 'relative'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>
                  𝕏
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>xAI Grok</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grok-2 & High-Speed Reasoning</span>
                </div>
              </div>

              {grokInfo ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#00ff88', background: 'rgba(0, 255, 136, 0.15)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(0, 255, 136, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Connected
                  </span>
                  {grokInfo.isActive && (
                    <span style={{ fontSize: '10px', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                      ★ Active
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '12px' }}>
                  Not Connected
                </span>
              )}
            </div>

            {/* KEY DISPLAY / INPUT */}
            <div style={{ marginTop: '16px' }}>
              {grokInfo ? (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Stored API Key (Masked)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <KeyRound size={14} style={{ color: 'var(--neon-cyan)' }} />
                    <span style={{ flex: 1 }}>{grokInfo.keyMask}</span>
                  </div>
                </div>
              ) : null}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {grokInfo ? 'Update Grok API Key' : 'Enter Grok API Key'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showGrokKey ? 'text' : 'password'}
                    value={grokKeyInput}
                    onChange={(e) => setGrokKeyInput(e.target.value)}
                    placeholder="xai-..."
                    style={{
                      width: '100%',
                      padding: '10px 36px 10px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGrokKey(!showGrokKey)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showGrokKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSaveKey('grok')}
              disabled={isSavingGrok || !grokKeyInput.trim()}
              style={{ flex: 1 }}
            >
              {isSavingGrok ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Connect & Test'}
            </Button>

            {grokInfo && (
              <>
                {!grokInfo.isActive && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSwitchProvider('grok')}
                    disabled={isSwitching === 'grok'}
                  >
                    Set Active
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTestConnection('grok')}
                  disabled={isTestingGrok}
                  title="Test Grok API Key Connection"
                >
                  {isTestingGrok ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Test'}
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveKey('grok')}
                  disabled={isRemovingGrok}
                  title="Remove Key"
                >
                  {isRemovingGrok ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                </Button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* GOOGLE DRIVE STORAGE SECTION */}
      <div style={{ marginTop: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
          Cloud Storage Connection
        </h2>
        <StorageUsageIndicator />
      </div>
    </div>
  );
}
