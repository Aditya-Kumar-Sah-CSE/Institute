'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  AgentInteractionState,
  AgentVisualStatePayload,
  subscribeAgentVisualState,
  isAgentSessionActive,
  getScanProgress
} from '@/lib/ai/agent-visual-state';

interface AgentInteractionCursorProps {
  sessionActive?: boolean;
}

// State-specific cursor colors
const STATE_COLORS: Record<AgentInteractionState, { fill: string; glow: string; badge: string }> = {
  idle:       { fill: '#06b6d4', glow: 'rgba(6,182,212,0.6)',   badge: 'rgba(6,182,212,0.15)' },
  scanning:   { fill: '#06b6d4', glow: 'rgba(6,182,212,0.8)',   badge: 'rgba(6,182,212,0.2)' },
  reading:    { fill: '#60a5fa', glow: 'rgba(96,165,250,0.7)',  badge: 'rgba(96,165,250,0.15)' },
  resolving:  { fill: '#818cf8', glow: 'rgba(129,140,248,0.6)', badge: 'rgba(129,140,248,0.15)' },
  targeting:  { fill: '#06b6d4', glow: 'rgba(6,182,212,0.8)',   badge: 'rgba(6,182,212,0.2)' },
  clicking:   { fill: '#22d3ee', glow: 'rgba(34,211,238,0.9)',  badge: 'rgba(34,211,238,0.2)' },
  typing:     { fill: '#f59e0b', glow: 'rgba(245,158,11,0.8)',  badge: 'rgba(245,158,11,0.2)' },
  selecting:  { fill: '#a78bfa', glow: 'rgba(167,139,250,0.7)', badge: 'rgba(167,139,250,0.15)' },
  scrolling:  { fill: '#06b6d4', glow: 'rgba(6,182,212,0.5)',   badge: 'rgba(6,182,212,0.1)' },
  navigating: { fill: '#6366f1', glow: 'rgba(99,102,241,0.7)',  badge: 'rgba(99,102,241,0.2)' },
  verifying:  { fill: '#34d399', glow: 'rgba(52,211,153,0.6)',  badge: 'rgba(52,211,153,0.15)' },
  success:    { fill: '#22c55e', glow: 'rgba(34,197,94,0.8)',   badge: 'rgba(34,197,94,0.2)' },
  error:      { fill: '#ef4444', glow: 'rgba(239,68,68,0.8)',   badge: 'rgba(239,68,68,0.2)' },
};

// Max trail points to keep
const TRAIL_LENGTH = 6;
const TRAIL_SAMPLE_DIST = 12;

export default function AgentInteractionCursor({ sessionActive }: AgentInteractionCursorProps) {
  const [visualState, setVisualState] = useState<AgentVisualStatePayload>({
    state: 'idle',
    timestamp: Date.now()
  });

  const getCenterPos = () => {
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    }
    return { x: 500, y: 400 };
  };

  const [pos, setPos] = useState<{ x: number; y: number }>(getCenterPos);
  const [trail, setTrail] = useState<Array<{ x: number; y: number }>>([]);
  const [scrollY, setScrollY] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const targetPosRef = useRef<{ x: number; y: number }>(getCenterPos());
  const animFrameRef = useRef<number | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTrailPos = useRef<{ x: number; y: number }>(getCenterPos());

  const [activeSession, setActiveSession] = useState<boolean>(() => sessionActive ?? isAgentSessionActive());
  const isPersistent = sessionActive ?? activeSession;

  // Scroll tracking — keeps cursor correct during page scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      setScrollY(window.scrollY);
      setScrollX(window.scrollX);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Window resize handler
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

  // Subscribe to visual state changes
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

      if (!isPersistent && (payload.state === 'idle' || payload.state === 'success')) {
        hideTimerRef.current = setTimeout(() => {
          setVisualState(prev => ({ ...prev, state: 'idle', targetRect: null }));
        }, 2500);
      }
    });

    return () => {
      unsubscribe();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPersistent]);

  // Smooth lerp animation — slower factor (0.12) for visible movement
  useEffect(() => {
    let active = true;

    const animate = () => {
      setPos(prev => {
        const dx = targetPosRef.current.x - prev.x;
        const dy = targetPosRef.current.y - prev.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
          return targetPosRef.current;
        }
        const next = {
          x: prev.x + dx * 0.12,
          y: prev.y + dy * 0.12
        };

        // Build trail — only add point if moved enough distance
        const tdx = next.x - lastTrailPos.current.x;
        const tdy = next.y - lastTrailPos.current.y;
        if (tdx * tdx + tdy * tdy > TRAIL_SAMPLE_DIST * TRAIL_SAMPLE_DIST) {
          lastTrailPos.current = { x: next.x, y: next.y };
          setTrail(prev => {
            const updated = [...prev, { x: next.x, y: next.y }];
            return updated.slice(-TRAIL_LENGTH);
          });
        }

        return next;
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
  const isVisibleState = isPersistent || state !== 'idle';
  if (!isPersistent && state === 'idle' && !targetRect) return null;

  const colors = STATE_COLORS[state] || STATE_COLORS.idle;
  const scanProgress = getScanProgress();

  const getDisplayText = () => {
    if (message) return message;
    switch (state) {
      case 'scanning': return scanProgress.total > 0 ? `Scanning page... (${scanProgress.current}/${scanProgress.total})` : 'Scanning page...';
      case 'reading': return targetText ? `Reading: ${targetText}` : 'Reading content...';
      case 'resolving': return 'Resolving target...';
      case 'targeting': return targetText ? `Target: ${targetText}` : 'Targeting element...';
      case 'clicking': return targetText ? `Clicking: ${targetText}` : 'Clicking...';
      case 'typing': return targetText ? `Typing: ${targetText}` : 'Typing...';
      case 'selecting': return 'Selecting option...';
      case 'scrolling': return 'Scrolling page...';
      case 'navigating': return targetText ? `Opening: ${targetText}` : 'Navigating...';
      case 'verifying': return 'Verifying action...';
      case 'success': return '✓ Action completed';
      case 'error': return '✗ Action error';
      default: return '✦ Smart Agent Active';
    }
  };

  // Screen-space positions (account for scroll)
  const screenX = pos.x - scrollX;
  const screenY = pos.y - scrollY;

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
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes agentRadarPulse {
          0% { transform: scale(0.5); opacity: 0.7; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes agentTypeDots {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        @keyframes agentSuccessPop {
          0% { transform: scale(0.6); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes agentCursorEntrance {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes agentErrorShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        .agent-target-box {
          position: absolute;
          border: 2px dashed ${colors.fill};
          background: ${colors.badge};
          border-radius: 6px;
          transition: all 0.18s ease-out;
          animation: agentPulseRing 1.5s infinite ease-in-out;
          box-shadow: 0 0 18px ${colors.glow};
        }
        .agent-click-ripple {
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid ${colors.fill};
          background: ${colors.glow};
          animation: agentClickRipple 0.55s ease-out forwards;
          pointer-events: none;
        }
      `}</style>

      {/* Trail effect — fading circles following cursor path */}
      {isVisibleState && trail.map((pt, i) => {
        const opacity = ((i + 1) / trail.length) * 0.35;
        const size = 4 + ((i + 1) / trail.length) * 4;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${pt.y - scrollY - size / 2}px`,
              left: `${pt.x - scrollX - size / 2}px`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              background: colors.fill,
              opacity,
              transition: 'opacity 0.3s ease-out',
              pointerEvents: 'none'
            }}
          />
        );
      })}

      {/* Target Node Highlight Box */}
      {isVisibleState && targetRect && targetRect.width > 0 && targetRect.height > 0 && (
        <div
          className="agent-target-box"
          style={{
            top: `${targetRect.top - scrollY}px`,
            left: `${targetRect.left - scrollX}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`
          }}
        />
      )}

      {/* Click Ripple Indicator */}
      {state === 'clicking' && (
        <div
          className="agent-click-ripple"
          style={{
            top: `${screenY - 24}px`,
            left: `${screenX - 24}px`
          }}
        />
      )}

      {/* Scanning Radar Pulse */}
      {state === 'scanning' && (
        <div
          style={{
            position: 'absolute',
            top: `${screenY - 20}px`,
            left: `${screenX - 20}px`,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `2px solid ${colors.fill}`,
            animation: 'agentRadarPulse 1.2s ease-out infinite',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Animated Virtual Agent Cursor & Status Badge */}
      {isVisibleState && (
        <div
          style={{
            position: 'absolute',
            top: `${screenY}px`,
            left: `${screenX}px`,
            transition: 'opacity 0.2s ease-in-out',
            opacity: 1,
            transform: 'translate(-4px, -4px)',
            animation: state === 'error' ? 'agentErrorShake 0.4s ease-in-out' : undefined
          }}
        >
          <div style={{ position: 'relative' }}>
            {/* Outer glow ring */}
            <div
              style={{
                position: 'absolute',
                top: '-6px',
                left: '-6px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
                animation: state === 'success' ? 'agentSuccessPop 0.6s ease-out' : 'agentPulseRing 2s infinite ease-in-out',
                pointerEvents: 'none'
              }}
            />

            {/* Virtual SVG Pointer Icon — larger 32px */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                filter: `drop-shadow(0 2px 10px ${colors.glow})`,
                animation: 'agentCursorEntrance 0.4s ease-out'
              }}
            >
              <path
                d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                fill={colors.fill}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Typing indicator dots */}
            {state === 'typing' && (
              <div style={{ position: 'absolute', top: '-8px', left: '20px', display: 'flex', gap: '3px' }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      animation: `agentTypeDots 0.8s ${i * 0.15}s infinite ease-in-out`
                    }}
                  />
                ))}
              </div>
            )}

            {/* Glowing Pointer Dot */}
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: colors.fill,
                boxShadow: `0 0 6px ${colors.glow}`,
                animation: 'agentPulseRing 1s infinite ease-in-out'
              }}
            />

            {/* Action Status Badge */}
            <div
              style={{
                position: 'absolute',
                left: '28px',
                top: '16px',
                minWidth: '140px',
                maxWidth: '300px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: `1px solid ${colors.fill}`,
                background: `linear-gradient(135deg, rgba(15,23,42,0.95), ${colors.badge})`,
                backdropFilter: 'blur(12px)',
                fontSize: '11px',
                fontWeight: 600,
                color: '#e2e8f0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxShadow: `0 4px 16px ${colors.glow}, 0 0 1px rgba(255,255,255,0.1)`,
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: colors.fill,
                    boxShadow: `0 0 4px ${colors.fill}`,
                    animation: 'agentPulseRing 1s infinite'
                  }}
                />
                <span>{getDisplayText()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
