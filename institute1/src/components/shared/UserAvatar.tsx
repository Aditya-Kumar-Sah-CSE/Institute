"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

interface UserAvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
}

export default function UserAvatar({ url, name, size = 100 }: UserAvatarProps) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', color: 'var(--neon-cyan)' }}>
        <User size={size / 2} opacity={0.5} />
      </div>
    );
  }

  return (
    <Image 
      src={url} 
      alt={name || 'User'} 
      fill 
      sizes={`${size}px`}
      style={{ objectFit: 'cover' }}
      onError={() => setError(true)}
    />
  );
}
