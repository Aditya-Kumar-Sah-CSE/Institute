'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AgentInteractionState, AgentVisualStatePayload, subscribeAgentVisualState, isAgentSessionActive } from '@/lib/ai/agent-visual-state';

interface AgentInteractionCursorProps {
  /** When true, cursor stays visible even during idle states */
  sessionActive?: boolean;
}

export default function AgentInteractionCursor({ sessionActive }: AgentInteractionCursorProps) {
  const [visualState, setVisualState] = useState<AgentVisualStatePayload>({
    state: 'idle',
    timestamp: Date.now()
  });

  // Calculate dynamic screen center position
  const getCenterPos = () => {
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    }
    return { x: 500, y: 400 };
  };

  const [pos, setPos] = useState<{ x: number; y: number }>(getCenterPos);
  const targetPosRef = useRef<{ x: number; y: number }>(getCenterPos());
  const animFrameRef = useRef<number | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeSession, setActiveSession] = useState<boolean>(() => sessionActive ?? isAgentSessionActive());
  const isPersistent = sessionActive ?? activeSession;

  // Window resize handler to maintain center target when idle
  useEffect(() => {
    const handleResize = () => {
      if (!visualState.targetRect && (visualState.state === 'idle' || visualState.state === 'success')) {
        targetPosRef.current = getCenterPos();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [visualState.state, visualState.targetRect]);

  useEffect(() => {
    const unsubscribe = subscribeAgentVisualState((payload) => {
      setVisualState(payload);
      setActiveSession(isAgentSessionActive());

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      if (payload.targetRect) {
        const centerX = payload.targetRect.left + payload.targetRect.width / 2;
        const centerY = payload.targetRect.top + payload.targetRect.height / 2;
        targetPosRef.current = { x: centerX, y: centerY };
      } else if (payload.state === 'scanning' || payload.state === 'reading') {
        const vW = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const vH = typeof window !== 'undefined' ? window.innerHeight : 800;
        targetPosRef.current = { x: vW * 0.5, y: vH * 0.3 };
      } else if (payload.state === 'idle') {
        targetPosRef.current = getCenterPos();
      }

      // Only auto-hide if the session is NOT persistently active
      if (!isPersistent && (payload.state === 'idle' || payload.state === 'success')) {
        hideTimerRef.current = setTimeout(() => {
          setVisualState(prev => ({ ...prev, state: 'idle', targetRect: null }));
        }, 1800);
      }
    });

    return () => {
      unsubscribe();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPersistent]);

  // Smooth lerp movement animation using requestAnimationFrame
  useEffect(() => {
    let active = true;

    const animate = () => {
      setPos(prev => {
        const dx = targetPosRef.current.x - prev.x;
        const dy = targetPosRef.current.y - prev.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
          return targetPosRef.current;
        }
        return {
          x: prev.x + dx * 0.22,
          y: prev.y + dy * 0.22
        };
      });

      if (active) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const { state, targetText, targetRect, message } = visualState;

  // Whenever session is active/persistent, cursor stays ALWAYS visible!
  const isVisibleState = isPersistent || state !== 'idle';
  if (!isPersistent && state === 'idle' && !targetRect) return null;

  const getBadgeColor = (s: AgentInteractionState) => {
    switch (s) {
      case 'error': return 'bg-red-600 text-white border-red-400';
      case 'success': return 'bg-emerald-600 text-white border-emerald-400';
      case 'clicking': return 'bg-cyan-600 text-white border-cyan-300';
      case 'typing': return 'bg-amber-600 text-white border-amber-300';
      case 'navigating': return 'bg-indigo-600 text-white border-indigo-300';
      default: return 'bg-cyan-950/90 text-cyan-200 border-cyan-500/50 backdrop-blur-md';
    }
  };

  const getDisplayText = () => {
    if (message) return message;
    switch (state) {
      case 'scanning': return 'Scanning page...';
      case 'reading': return targetText ? `Reading: ${targetText}` : 'Reading content...';
      case 'resolving': return 'Resolving target...';
      case 'targeting': return targetText ? `Target: ${targetText}` : 'Targeting element...';
      case 'clicking': return targetText ? `Clicking: ${targetText}` : 'Clicking...';
      case 'typing': return 'Typing...';
      case 'selecting': return 'Selecting option...';
      case 'scrolling': return 'Scrolling page...';
      case 'navigating': return targetText ? `Opening: ${targetText}` : 'Navigating...';
      case 'verifying': return 'Verifying action...';
      case 'success': return '✓ Action completed';
      case 'error': return '✗ Action error';
      default: return '✦ Smart Learn Agent Active';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 999999,
        overflow: 'hidden'
      }}
    >
      <style>{`
        @keyframes agentPulseRing {
          0% { transform: scale(0.95); opacity: 0.9; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.9; }
        }
        @keyframes agentClickRipple {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .agent-target-box {
          position: absolute;
          border: 2px dashed rgba(6, 182, 212, 0.85);
          background: rgba(6, 182, 212, 0.08);
          border-radius: 6px;
          transition: all 0.15s ease-out;
          animation: agentPulseRing 1.5s infinite ease-in-out;
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.35);
        }
        .agent-click-ripple {
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid #06b6d4;
          background: rgba(6, 182, 212, 0.3);
          animation: agentClickRipple 0.5s ease-out forwards;
          pointer-events: none;
        }
      `}</style>

      {/* 1. Target Node Highlight Box */}
      {isVisibleState && targetRect && targetRect.width > 0 && targetRect.height > 0 && (
        <div
          className="agent-target-box"
          style={{
            top: `${targetRect.top - (typeof window !== 'undefined' ? window.scrollY : 0)}px`,
            left: `${targetRect.left - (typeof window !== 'undefined' ? window.scrollX : 0)}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`
          }}
        />
      )}

      {/* 2. Click Ripple Indicator */}
      {state === 'clicking' && (
        <div
          className="agent-click-ripple"
          style={{
            top: `${pos.y - (typeof window !== 'undefined' ? window.scrollY : 0) - 22}px`,
            left: `${pos.x - (typeof window !== 'undefined' ? window.scrollX : 0) - 22}px`
          }}
        />
      )}

      {/* 3. Animated Virtual Agent Cursor & Status Badge */}
      {isVisibleState && (
        <div
          style={{
            position: 'absolute',
            top: `${pos.y - (typeof window !== 'undefined' ? window.scrollY : 0)}px`,
            left: `${pos.x - (typeof window !== 'undefined' ? window.scrollX : 0)}px`,
            transition: 'opacity 0.2s ease-in-out',
            opacity: 1,
            transform: 'translate(-4px, -4px)'
          }}
        >
          {/* Virtual SVG Pointer Icon */}
          <div className="relative">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-[0_2px_8px_rgba(6,182,212,0.8)]"
            >
              <path
                d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                fill="#06b6d4"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Glowing Pointer Dot */}
            <span className="absolute top-0 left-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />

            {/* Action Status Badge */}
            <div
              className={`absolute left-6 top-4 min-w-[140px] max-w-[280px] px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-lg whitespace-nowrap overflow-hidden text-ellipsis ${getBadgeColor(state)}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>{getDisplayText()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

