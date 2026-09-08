"use client";

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'neon' | 'gradient';
  neonColor?: 'cyan' | 'magenta' | 'purple' | 'lime' | 'gold';
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  title?: string;
}

export default function Card({
  children,
  variant = 'default',
  neonColor = 'cyan',
  hover = false,
  padding = 'md',
  className,
  style,
  onClick,
  title,
}: CardProps) {
  const baseClasses = `card card-${variant} card-pad-${padding} ${
    hover ? 'card-hover' : ''
  } ${neonColor ? `card-neon-${neonColor}` : ''}`;

  return (
    <div
      className={`${baseClasses} ${className || ''}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
    >
      {children}
    </div>
  );
}
