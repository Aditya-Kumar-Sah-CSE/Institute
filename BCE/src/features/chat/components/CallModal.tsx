'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Volume2 } from 'lucide-react';
import Image from 'next/image';

interface CallModalProps {
  type: 'video' | 'audio';
  peerName: string;
  peerAvatar?: string | null;
  onClose: () => void;
}

export default function CallModal({ type, peerName, peerAvatar, onClose }: CallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#0d0f17',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '40px 20px',
      color: '#fff',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Background glow or video */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 50% 30%, rgba(0, 240, 255, 0.15), transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Top Header */}
      <div style={{ zIndex: 10, textAlign: 'center' }}>
        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--neon-cyan)', marginBottom: '4px', fontWeight: 700 }}>
          {type === 'video' ? '📹 Encrypted Video Call' : '📞 Encrypted Voice Call'}
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{peerName}</h2>
        <div style={{ fontSize: '14px', color: 'var(--neon-lime)', fontWeight: 600 }}>
          Connected • {formatTime(callDuration)}
        </div>
      </div>

      {/* Center Avatar / Video Box */}
      <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {isVideoOff ? (
          <div style={{
            position: 'relative',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid var(--neon-cyan)',
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            background: 'var(--bg-secondary)'
          }}>
            {peerAvatar ? (
              <Image src={peerAvatar} alt={peerName} fill style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <User size={64} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
        ) : (
          <div style={{
            width: 'min(90vw, 480px)',
            height: 'min(55vh, 360px)',
            background: '#1a1d2d',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center'
          }}>
            {peerAvatar && <Image src={peerAvatar} alt={peerName} fill style={{ objectFit: 'cover', opacity: 0.6 }} unoptimized />}
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', backdropFilter: 'blur(6px)' }}>
              {peerName}
            </div>

            {/* Self Mini Camera Box */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '100px',
              height: '130px',
              borderRadius: '12px',
              background: '#000',
              border: '2px solid var(--neon-cyan)',
              overflow: 'hidden',
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justify: 'center'
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Your Cam</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div style={{
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '16px 32px',
        borderRadius: '32px',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        {/* Mic Toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: 'none',
            background: isMuted ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: isMuted ? '#ff3b30' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* Video Toggle */}
        {type === 'video' && (
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: 'none',
              background: isVideoOff ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: isVideoOff ? '#ff3b30' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        )}

        {/* Speaker / Volume button */}
        <button
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            cursor: 'pointer'
          }}
          title="Speaker"
        >
          <Volume2 size={22} />
        </button>

        {/* End Call Button */}
        <button
          onClick={onClose}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            background: '#ff3b30',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(255, 59, 48, 0.5)',
            transform: 'scale(1.05)'
          }}
          title="End Call"
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );
}
