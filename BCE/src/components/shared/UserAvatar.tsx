"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

interface UserAvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function UserAvatar({ url, name, size = 40, className, style }: UserAvatarProps) {
  const [error, setError] = useState(false);
  const initial = name ? name.trim().charAt(0).toUpperCase() : null;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {url && !error ? (
        <Image 
          src={url} 
          alt={name || 'User'} 
          fill 
          sizes={`${size}px`}
          style={{ objectFit: 'cover' }}
          onError={() => setError(true)}
          unoptimized={true}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)', fontWeight: 'bold', fontSize: `${size * 0.4}px` }}>
          {initial ? initial : <User size={size / 2} opacity={0.6} />}
        </div>
      )}
    </div>
  );
}
