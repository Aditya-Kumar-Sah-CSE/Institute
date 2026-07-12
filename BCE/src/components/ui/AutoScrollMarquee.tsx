"use client";

import React, { useEffect, useRef, useState } from 'react';

export default function AutoScrollMarquee({ 
  children, 
  className,
  innerClassName
}: { 
  children: React.ReactNode, 
  className?: string,
  innerClassName?: string
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let animationFrameId: number;
    
    const scroll = () => {
      if (!isPaused && rowRef.current) {
        // Adjust speed by changing the scroll increment
        rowRef.current.scrollLeft += 1;
        
        // When we have scrolled exactly halfway (since content is duplicated), snap back to start
        if (rowRef.current.scrollLeft >= (rowRef.current.scrollWidth / 2)) {
          rowRef.current.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };
    
    animationFrameId = requestAnimationFrame(scroll);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused]);

  return (
    <div 
      ref={rowRef} 
      className={className}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className={innerClassName} style={{ display: 'flex', width: 'max-content' }}>
        {children}
      </div>
    </div>
  );
}
