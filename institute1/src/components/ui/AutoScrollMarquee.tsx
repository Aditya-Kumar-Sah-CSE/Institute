"use client";

import React from 'react';
import './AutoScrollMarquee.css';

export default function AutoScrollMarquee({ 
  children, 
  className = '',
  innerClassName = '',
  style
}: { 
  children: React.ReactNode, 
  className?: string,
  innerClassName?: string,
  style?: React.CSSProperties
}) {
  return (
    <div className={`marquee-viewport ${className}`} style={style}>
      <div className={`marquee-track ${innerClassName}`}>
        {children}
        {children}
      </div>
    </div>
  );
}
