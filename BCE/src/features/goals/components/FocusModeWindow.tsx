'use client';

import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Play, Pause, RotateCcw, X, Target, Minimize2, ExternalLink } from 'lucide-react';
import { useFocusMode } from '../hooks/useFocusMode';
import '../styles/focus-mode.css';

interface FocusModeWindowProps {
  activeSession: any;
  onComplete: () => void;
  onExit: () => void;
}

export default function FocusModeWindow({ activeSession, onComplete, onExit }: FocusModeWindowProps) {
  const {
    state,
    togglePlay,
    reset,
    exit,
    setSize,
    setPosition,
  } = useFocusMode(activeSession, onComplete, onExit);

  const [isMinimized, setIsMinimized] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (pipWindow) {
        pipWindow.close();
      }
    };
  }, [pipWindow]);

  // Handle header dragging
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = state.position.x;
    const startPosY = state.position.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Restrain within viewport
      const newX = Math.max(0, Math.min(window.innerWidth - state.size.width, startPosX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - state.size.height, startPosY + deltaY));

      setPosition(newX, newY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Handle bottom-right resizing
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startWidth = state.size.width;
    const startHeight = state.size.height;
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newWidth = Math.max(320, Math.min(900, startWidth + deltaX));
      const newHeight = Math.max(180, Math.min(500, startHeight + deltaY));

      setSize(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Initialize keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if currently typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        reset();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        exit(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Also bind inside Document PiP if running
    let pipDoc: Document | null = null;
    if (pipWindow) {
      pipDoc = pipWindow.document;
      pipDoc.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (pipDoc) {
        pipDoc.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [togglePlay, reset, exit, pipWindow]);

  // Picture-in-Picture activation
  const handleTogglePiP = async () => {
    // If PiP is active, close it
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    // Check availability
    const anyWindow = window as any;
    if (!anyWindow.documentPictureInPicture) {
      alert('Document Picture-in-Picture is not supported in this browser. Try Chrome/Edge or use the standard viewport overlay.');
      return;
    }

    try {
      const pip = await anyWindow.documentPictureInPicture.requestWindow({
        width: state.size.width,
        height: state.size.height,
      });

      // Copy styles to Document PiP
      const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
      styles.forEach((style) => {
        pip.document.head.appendChild(style.cloneNode(true));
      });

      // Add a body background override inside pip
      const bgStyle = pip.document.createElement('style');
      bgStyle.textContent = `
        body {
          margin: 0;
          padding: 0;
          background: #090d16 !important;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
        }
      `;
      pip.document.head.appendChild(bgStyle);

      pip.addEventListener('pagehide', () => {
        setPipWindow(null);
      });

      setPipWindow(pip);
    } catch (e) {
      console.error('Failed to enter PiP mode:', e);
    }
  };

  if (!isMounted || !state.session) return null;

  const total = state.session.total || 1800;
  const remaining = state.remaining;
  const isRunning = state.isRunning;
  const progressPct = Math.min(((total - remaining) / total) * 100, 100);

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');

  // Base markup variables
  const isPipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  const innerContent = (
    <div
      className={`focus-window-container ${isRunning ? 'active-focus' : ''} ${isMinimized ? 'focus-small' : ''}`}
      style={{
        position: pipWindow ? 'absolute' : 'fixed',
        left: pipWindow ? 0 : `${state.position.x}px`,
        top: pipWindow ? 0 : `${state.position.y}px`,
        width: pipWindow ? '100vw' : `${state.size.width}px`,
        height: pipWindow ? '100vh' : isMinimized ? 'auto' : `${state.size.height}px`,
        borderRadius: pipWindow ? '0px' : '12px',
        border: pipWindow ? 'none' : undefined,
      }}
    >
      {/* Header Bar */}
      <div 
        className="focus-window-header" 
        onMouseDown={pipWindow ? undefined : handleHeaderMouseDown}
      >
        <span className="focus-window-title">
          <Target size={14} className="text-gradient" />
          {state.session.name}
        </span>
        <div className="focus-window-controls">
          {/* PiP Button */}
          {isPipSupported && (
            <button
              onClick={handleTogglePiP}
              className="focus-window-header-btn"
              title={pipWindow ? "Return to Tab" : "Always on Top (PiP)"}
            >
              <ExternalLink size={13} />
            </button>
          )}

          {/* Minimize Button (not relevant in PiP frame) */}
          {!pipWindow && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="focus-window-header-btn"
              title={isMinimized ? "Expand Window" : "Minimize Window"}
            >
              <Minimize2 size={13} />
            </button>
          )}

          {/* Exit Button */}
          <button
            onClick={() => exit(true)}
            className="focus-window-header-btn exit-btn"
            title="Leave Session"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body Frame */}
      <div className="focus-window-body">
        {/* Timer Display */}
        <div 
          className="focus-window-time-display"
          style={{ fontSize: isMinimized ? '28px' : '44px' }}
        >
          {mins}:{secs}
        </div>

        {/* Progress Bar (hidden in header-only minimize mode) */}
        {!isMinimized && (
          <div className="focus-window-progress-track">
            <div 
              className="focus-window-progress-fill" 
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Action Controls */}
        <div className="focus-window-actions">
          {isRunning ? (
            <button 
              onClick={togglePlay} 
              className="focus-action-round-btn pause-btn"
              title="Pause (Space)"
            >
              <Pause size={18} />
            </button>
          ) : (
            <button 
              onClick={togglePlay} 
              className="focus-action-round-btn play-btn"
              title="Resume (Space)"
            >
              <Play size={18} style={{ marginLeft: '2px' }} />
            </button>
          )}

          <button 
            onClick={reset} 
            className="focus-action-round-btn reset-btn" 
            title="Reset (R)"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        {/* DRAG CORNER HANDLE (only when not maximized, minimized or PiPed) */}
        {!isMinimized && !pipWindow && (
          <div 
            className="focus-window-resize-handle" 
            onMouseDown={handleResizeMouseDown}
          />
        )}
      </div>
    </div>
  );

  // Render to portal
  if (pipWindow) {
    return ReactDOM.createPortal(innerContent, pipWindow.document.body);
  }

  return ReactDOM.createPortal(
    <div className="focus-mode-overlay-root">
      {innerContent}
    </div>,
    document.body
  );
}
