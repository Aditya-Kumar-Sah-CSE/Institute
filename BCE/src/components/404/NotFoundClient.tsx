'use client';

import React, { useState, useEffect } from 'react';

export default function NotFoundClient() {
  const [GameComponent, setGameComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import('./BrickBreakerGame').then((mod) => {
      setGameComponent(() => mod.default);
    });
  }, []);

  if (!GameComponent) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#070a12', 
        color: '#818cf8', 
        fontWeight: 600,
        fontSize: '1.1rem'
      }}>
        Loading 404 Brick Breaker Game...
      </div>
    );
  }

  return <GameComponent />;
}
