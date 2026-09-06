'use client';

import React, { useState } from 'react';
import { Mic, Globe, Sparkles, Volume2, HelpCircle, Bot } from 'lucide-react';

interface VoiceControlsProps {
  onTranscriptReceived: (transcript: string) => void;
  lastFeedback: string | null;
  languageMode: 'en-IN' | 'hi-IN' | 'Auto';
  onLanguageChange: (mode: 'en-IN' | 'hi-IN' | 'Auto') => void;
}

export default function VoiceControls({
  onTranscriptReceived,
  lastFeedback,
  languageMode,
  onLanguageChange,
}: VoiceControlsProps) {
  const [transcript, setTranscript] = useState('');
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const handleOpenSmartAgentMic = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toggleSmartAgentDrawer'));
    }
  };

  const handleTestCommand = (testVoiceText: string) => {
    setTranscript(testVoiceText);
    onTranscriptReceived(testVoiceText);
  };

  return (
    <div className="voice-controls-panel">
      <div className="voice-main-toolbar">
        <div className="voice-mic-container">
          <button
            className="mic-button listening"
            onClick={handleOpenSmartAgentMic}
            title="Open Smart Learn AI Agent (Unified Voice & AI Control)"
            type="button"
          >
            <Bot className="mic-icon animate-pulse" />
            <span>Smart Learn AI Agent</span>
          </button>
        </div>

        <div className="language-selector">
          <Globe className="lang-icon" />
          <button
            className={`lang-chip ${languageMode === 'en-IN' ? 'active' : ''}`}
            onClick={() => onLanguageChange('en-IN')}
          >
            English (IN)
          </button>
          <button
            className={`lang-chip ${languageMode === 'hi-IN' ? 'active' : ''}`}
            onClick={() => onLanguageChange('hi-IN')}
          >
            Hinglish / हिंदी
          </button>
          <button
            className={`lang-chip ${languageMode === 'Auto' ? 'active' : ''}`}
            onClick={() => onLanguageChange('Auto')}
          >
            Auto
          </button>
        </div>

        <button
          className="cheatsheet-toggle-btn"
          onClick={() => setShowCheatSheet(!showCheatSheet)}
          type="button"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Voice Commands</span>
        </button>
      </div>

      <div className="transcript-feedback-bar">
        {transcript && (
          <div className="live-transcript">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span className="transcript-label">Command Triggered:</span>
            <span className="transcript-text">"{transcript}"</span>
          </div>
        )}

        {lastFeedback && (
          <div className="agent-feedback-toast">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{lastFeedback}</span>
          </div>
        )}
      </div>

      <div className="quick-test-commands">
        <span className="quick-title">Quick Voice Commands:</span>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('integral zero se infinity tak add karo')}
          type="button"
        >
          🗣️ "integral zero se infinity tak add karo"
        </button>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('3 by 3 matrix banao')}
          type="button"
        >
          🗣️ "3 by 3 matrix banao"
        </button>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('physics template lagao')}
          type="button"
        >
          🗣️ "physics template lagao"
        </button>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('title ko Quantum Mechanics karo')}
          type="button"
        >
          🗣️ "title ko Quantum Mechanics karo"
        </button>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('last change undo karo')}
          type="button"
        >
          🗣️ "last change undo karo"
        </button>
      </div>

      {showCheatSheet && (
        <div className="voice-cheatsheet-modal">
          <div className="cheatsheet-header">
            <h3>🎙️ Smart Learn AI Agent Voice Commands (Hinglish & English)</h3>
            <button onClick={() => setShowCheatSheet(false)} type="button">×</button>
          </div>
          <div className="cheatsheet-grid">
            <div className="command-card">
              <h4>Calculus & Equations</h4>
              <p>• "integral add karo" or "0 se infinity tak integral lagao"</p>
              <p>• "derivative equation insert karo"</p>
              <p>• "summation equation dalo"</p>
              <p>• "quadratic equation insert karo"</p>
            </div>
            <div className="command-card">
              <h4>Matrices & Algebra</h4>
              <p>• "3 by 3 matrix banao"</p>
              <p>• "2 by 2 matrix insert karo"</p>
              <p>• "matrix ko symmetric banao"</p>
            </div>
            <div className="command-card">
              <h4>Templates & Titles</h4>
              <p>• "physics template lagao"</p>
              <p>• "exam template load karo"</p>
              <p>• "title ko Quantum Mechanics karo"</p>
            </div>
            <div className="command-card">
              <h4>Actions & Control</h4>
              <p>• "last change undo karo"</p>
              <p>• "redo karo"</p>
              <p>• "latex code copy karo"</p>
              <p>• "editor clear karo"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
