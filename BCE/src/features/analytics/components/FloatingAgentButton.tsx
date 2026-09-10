'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import SmartAgentDrawer from './SmartAgentDrawer';
import { useSmartAgentSession } from '../context/SmartAgentSessionContext';

const POSITION_KEY = 'smart-learn-agent-button-position';
const MARGIN = 12;
const DESKTOP_TOP_SAFE_AREA = 76;

interface ButtonPosition {
  left: number;
  top: number;
}

function clampPosition(position: ButtonPosition, width: number, height: number): ButtonPosition {
  const topSafeArea = window.innerWidth <= 768 ? MARGIN : DESKTOP_TOP_SAFE_AREA;
  return {
    left: Math.min(Math.max(MARGIN, position.left), Math.max(MARGIN, window.innerWidth - width - MARGIN)),
    top: Math.min(Math.max(topSafeArea, position.top), Math.max(topSafeArea, window.innerHeight - height - MARGIN))
  };
}

export default function FloatingAgentButton() {
  const { isOpen, toggleDrawer } = useSmartAgentSession();
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<ButtonPosition>({ left: MARGIN, top: DESKTOP_TOP_SAFE_AREA });
  const [dragging, setDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(POSITION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') setPosition(parsed);
      }
    } catch {
      // Ignore unavailable or malformed local storage.
    }
  }, []);

  useEffect(() => {
    if (!mounted || !buttonRef.current) return;
    const updatePosition = () => setPosition(previous => clampPosition(previous, buttonRef.current?.offsetWidth || 140, buttonRef.current?.offsetHeight || 40));
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {
      // Ignore unavailable local storage.
    }

  }, [mounted, position]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: position.left, top: position.top, moved: false };
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.moved = drag.moved || Math.abs(event.clientX - drag.startX) > 4 || Math.abs(event.clientY - drag.startY) > 4;
    if (!drag.moved) return;
    setPosition(clampPosition({ left: drag.left + event.clientX - drag.startX, top: drag.top + event.clientY - drag.startY }, event.currentTarget.offsetWidth, event.currentTarget.offsetHeight));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    suppressClickRef.current = drag.moved;
    dragRef.current = null;
    setDragging(false);
  };

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    toggleDrawer();
  };

  return (
    <>
      {mounted && !isOpen && (
        <button
          ref={buttonRef}
          type="button"
          className="floating-agent-btn"
          aria-label="Open Smart Learn Agent"
          title="Smart Agent"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ position: 'fixed', left: `${position.left}px`, top: `${position.top}px`, touchAction: 'none', userSelect: 'none', cursor: dragging ? 'grabbing' : 'grab', zIndex: 9990 }}
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>Smart Agent</span>
        </button>
      )}
      <SmartAgentDrawer />
    </>
  );
}

