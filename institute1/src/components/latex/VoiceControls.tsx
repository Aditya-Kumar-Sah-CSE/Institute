'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Globe, Sparkles, Volume2, HelpCircle } from 'lucide-react';

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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = languageMode === 'hi-IN' ? 'hi-IN' : 'en-IN';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            currentTranscript += result[0].transcript;
            if (result.isFinal) {
              onTranscriptReceived(result[0].transcript);
              setTranscript(result[0].transcript);
            }
          }
          if (currentTranscript && !event.results[event.results.length - 1].isFinal) {
            setTranscript(currentTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }
  }, [languageMode]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.lang = languageMode === 'hi-IN' ? 'hi-IN' : 'en-IN';
      recognitionRef.current.start();
      setIsListening(true);
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
            className={`mic-button ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
            title={isListening ? 'Click to Stop Listening' : 'Click to Speak Voice Command'}
          >
            {isListening ? <Mic className="mic-icon animate-pulse" /> : <MicOff className="mic-icon" />}
            <span>{isListening ? 'Listening...' : 'Voice Agent'}</span>
          </button>

          {isListening && (
            <div className="mic-sound-waves">
              <span className="wave bar-1"></span>
              <span className="wave bar-2"></span>
              <span className="wave bar-3"></span>
              <span className="wave bar-4"></span>
            </div>
          )}
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
        >
          <HelpCircle className="w-4 h-4" />
          <span>Voice Commands</span>
        </button>
      </div>

      {/* Live Transcript & Feedback Display */}
      <div className="transcript-feedback-bar">
        {transcript && (
          <div className="live-transcript">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span className="transcript-label">Recognized Speech:</span>
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

      {!isSupported && (
        <div className="unsupported-voice-warning">
          ⚠️ Browser Web Speech API not active in current environment. Use quick test voice command buttons below to simulate Hinglish/English voice prompts!
        </div>
      )}

      {/* Quick Test Voice Command Chips */}
      <div className="quick-test-commands">
        <span className="quick-title">Test Voice Prompts:</span>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('integral zero se infinity tak add karo')}
        >
          🗣️ "integral zero se infinity tak add karo"
        </button>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('3 by 3 matrix banao')}
        >
          🗣️ "3 by 3 matrix banao"
        </button>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('physics template lagao')}
        >
          🗣️ "physics template lagao"
        </button>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('title ko Quantum Mechanics karo')}
        >
          🗣️ "title ko Quantum Mechanics karo"
        </button>
        <button
          className="voice-test-badge"
          onClick={() => handleTestCommand('last change undo karo')}
        >
          🗣️ "last change undo karo"
        </button>
      </div>

      {/* Voice Cheat Sheet Drawer */}
      {showCheatSheet && (
        <div className="voice-cheatsheet-modal">
          <div className="cheatsheet-header">
            <h3>🎙️ Supported Voice Commands (Hinglish & English)</h3>
            <button onClick={() => setShowCheatSheet(false)}>×</button>
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
