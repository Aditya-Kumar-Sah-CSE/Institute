'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Search, Sparkles, Brain, BookOpen, PlayCircle, Check, Copy, ExternalLink } from 'lucide-react';
import { useSmartAgentSession } from '@/features/analytics/context/SmartAgentSessionContext';
import SpotifyConnect from './SpotifyConnect';
import FocusTimer from './FocusTimer';
import UserAvatar from '@/components/shared/UserAvatar';
import type { ProblemData } from './ProblemStatementRenderer';
import { generateChatGPTPrompt } from './ProblemStatementRenderer';
import Modal from '@/components/ui/Modal';

interface PracticeArenaHeaderProps {
  problem: ProblemData;
  profileName: string;
  profileAvatar: string | null;
  sheetId?: string | null;
}

export default function PracticeArenaHeader({
  problem,
  profileName,
  profileAvatar,
  sheetId,
}: PracticeArenaHeaderProps) {
  const smartAgentSession = useSmartAgentSession();
  const [isGptModalOpen, setIsGptModalOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [copied, setCopied] = useState(false);

  const backUrl = sheetId ? `/code-arena/sheets/${sheetId}` : '/code-arena/compiler';
  const backTitle = sheetId ? 'Back to Sheet' : 'Back to Compiler';

  const handleAskChatGPT = () => {
    const prompt = generateChatGPTPrompt(problem);
    try {
      navigator.clipboard.writeText(prompt);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }

    const canPrefill = prompt.length < 2000;
    if (canPrefill) {
      window.open(`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`, '_blank');
    } else {
      setPromptText(prompt);
      setIsGptModalOpen(true);
      setTimeout(() => {
        window.open('https://chatgpt.com/', '_blank');
      }, 800);
    }
  };

  const handleAskSmartLearnAI = () => {
    if (smartAgentSession?.openDrawer) {
      smartAgentSession.openDrawer(
        `I am analyzing the problem "${problem.title}". Can you explain the problem statement, constraints, and suggest the optimal approach?`
      );
    } else {
      // Dispatch custom event for problem statement renderer drawer fallback
      window.dispatchEvent(new CustomEvent('code-arena:open-ai-drawer'));
    }
  };

  const handleOpenTextSolution = () => {
    window.dispatchEvent(new CustomEvent('code-arena:open-text-solution'));
  };

  const handleOpenVideoSolution = () => {
    window.dispatchEvent(new CustomEvent('code-arena:open-video-solution'));
  };

  const handleCopyPrompt = () => {
    try {
      navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <>
      <header className="code-arena-header-compact">
        {/* Left: Navigation and Title */}
        <div className="code-arena-header-left">
          <Link
            href={backUrl}
            className="oj-icon-btn"
            title={backTitle}
            style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit', textDecoration: 'none', marginRight: '6px' }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="code-arena-logo-box">
            <Trophy size={18} />
          </div>
          <h1 className="code-arena-header-title">
            Practice Arena
            <span className="code-arena-badge-sub">Code Arena</span>
          </h1>
        </div>

        {/* Center: Action Buttons moved to Top as requested */}
        <div className="code-arena-header-actions">
          {/* Ask YT Button */}
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(problem.title || problem.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="header-action-btn btn-ask-yt"
            title="Search for editorial / tutorials on YouTube"
          >
            <Search size={13} style={{ color: '#ef4444' }} />
            <span>Ask YT</span>
          </a>

          {/* Ask ChatGPT Button */}
          <button
            type="button"
            onClick={handleAskChatGPT}
            className="header-action-btn btn-ask-chatgpt"
            title="Ask ChatGPT to explain or help with this problem"
          >
            <Sparkles size={13} style={{ color: 'var(--neon-cyan)' }} />
            <span>Ask ChatGPT</span>
          </button>

          {/* Ask Smart Learn AI Button */}
          <button
            type="button"
            onClick={handleAskSmartLearnAI}
            className="header-action-btn btn-ask-smartlearn"
            title="Open Smart Learn AI interactive assistant"
          >
            <Brain size={13} style={{ color: 'var(--neon-cyan)' }} />
            <span>Ask Smart Learn AI</span>
          </button>

          {/* Text Solution button if available */}
          {problem.text_solution && (
            <button
              type="button"
              onClick={handleOpenTextSolution}
              className="header-action-btn btn-solution-text"
              title="View written solution & explanation"
            >
              <BookOpen size={13} />
              <span>Text Solution</span>
            </button>
          )}

          {/* Video Solution button if available */}
          {problem.youtube_url && (
            <button
              type="button"
              onClick={handleOpenVideoSolution}
              className="header-action-btn btn-solution-video"
              title="Watch video walkthrough"
            >
              <PlayCircle size={13} />
              <span>Video Solution</span>
            </button>
          )}
        </div>

        {/* Right: Controls & Profile */}
        <div className="code-arena-header-controls">
          <SpotifyConnect />
          <FocusTimer />

          <Link
            href="/profile"
            className="oj-icon-btn profile-avatar-btn"
            style={{ overflow: 'hidden', position: 'relative', width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}
            title={`View Profile: ${profileName}`}
            aria-label="View Profile"
          >
            <UserAvatar url={profileAvatar} name={profileName} size={32} />
          </Link>
        </div>
      </header>

      {/* ChatGPT Large Prompt Fallback Modal */}
      <Modal
        isOpen={isGptModalOpen}
        onClose={() => setIsGptModalOpen(false)}
        title="Prompt Copied for ChatGPT"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            The problem prompt has been copied to your clipboard. Since it exceeds URL limits, ChatGPT has been opened in a new tab. Paste (<kbd>Ctrl+V</kbd> / <kbd>Cmd+V</kbd>) into ChatGPT.
          </p>

          <div style={{ position: 'relative' }}>
            <textarea
              readOnly
              value={promptText}
              rows={8}
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: 'var(--text-main)',
                resize: 'none',
                outline: 'none',
              }}
            />
            <button
              onClick={handleCopyPrompt}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--glass-border)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                color: copied ? 'var(--neon-green)' : 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
