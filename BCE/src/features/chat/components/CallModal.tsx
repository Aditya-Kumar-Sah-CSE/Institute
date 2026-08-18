'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, 
  User, Volume2, RefreshCw, PhoneCall, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import Image from 'next/image';
import UserAvatar from '@/components/shared/UserAvatar';

export type CallState = 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'rejected' | 'failed';

interface CallModalProps {
  callId: string;
  type: 'video' | 'audio';
  isIncoming: boolean;
  peerName: string;
  peerAvatar?: string | null;
  peerId: string;
  currentUserId: string;
  conversationId: string;
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  permissionError: string | null;
  permissionState: 'granted' | 'prompt' | 'denied';
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMic: (isMuted: boolean) => void;
  onToggleCamera: (isOff: boolean) => void;
  onSwitchCamera?: () => void;
  onContinuePermission: () => void;
  onRetryPermission: () => void;
}

export default function CallModal({
  callId,
  type,
  isIncoming,
  peerName,
  peerAvatar,
  peerId,
  currentUserId,
  conversationId,
  callState,
  localStream,
  remoteStream,
  permissionError,
  permissionState,
  onAccept,
  onReject,
  onEndCall,
  onToggleMic,
  onToggleCamera,
  onSwitchCamera,
  onContinuePermission,
  onRetryPermission
}: CallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Call timer
  useEffect(() => {
    let timer: any = null;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video/audio elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleMicClick = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    onToggleMic(nextMuted);
  };

  const handleCameraClick = () => {
    const nextOff = !isVideoOff;
    setIsVideoOff(nextOff);
    onToggleCamera(nextOff);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const getStatusBadgeText = () => {
    if (callState === 'calling') return 'Calling...';
    if (callState === 'ringing') return isIncoming ? 'Incoming Call' : 'Ringing...';
    if (callState === 'connecting') return 'Establishing P2P WebRTC Connection...';
    if (callState === 'connected') return `Connected • ${formatTime(callDuration)}`;
    if (callState === 'rejected') return 'Call Declined';
    if (callState === 'failed') return 'Connection Failed';
    if (callState === 'ended') return 'Call Ended';
    return 'Connecting...';
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#0a0c14',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '30px 20px',
      color: '#fff',
      userSelect: 'none',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      {/* Custom Permission Overlay */}
      {permissionState !== 'granted' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10, 12, 20, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 100000,
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: '24px',
            padding: '32px 24px',
            maxWidth: '380px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: permissionState === 'denied' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(0, 240, 255, 0.1)',
              border: permissionState === 'denied' ? '1px solid #ff3b30' : '1px solid var(--neon-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              {permissionState === 'denied' ? (
                <AlertTriangle size={32} color="#ff3b30" />
              ) : type === 'video' ? (
                <VideoIcon size={32} color="var(--neon-cyan)" />
              ) : (
                <Mic size={32} color="var(--neon-cyan)" />
              )}
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
              {permissionState === 'denied' 
                ? `${type === 'video' ? 'Camera/Mic' : 'Microphone'} Access Blocked` 
                : `${type === 'video' ? 'Camera/Mic' : 'Microphone'} Permission Needed`}
            </h3>

            <p style={{ fontSize: '13px', color: '#a0aec0', lineHeight: 1.6, margin: 0 }}>
              {permissionState === 'denied' 
                ? `Chrome needs permission to access your ${type === 'video' ? 'camera and microphone' : 'microphone'}. Please update your Chrome Site Settings to allow access and try again.`
                : `Chrome needs permission to access your ${type === 'video' ? 'camera and microphone' : 'microphone'} for this site to establish the call.`}
            </p>

            {permissionState === 'denied' && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '11px',
                color: '#718096',
                textAlign: 'left',
                width: '100%',
                lineHeight: 1.4
              }}>
                <strong>How to unblock on Chrome (Android/Desktop):</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>Tap the <strong>Lock / Settings icon</strong> to the left of the URL bar.</li>
                  <li>Toggle the <strong>Microphone</strong> (and <strong>Camera</strong>) to <strong>Allow</strong>.</li>
                  <li>Return here and tap <strong>Retry Permission</strong>.</li>
                </ol>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              {permissionState === 'prompt' ? (
                <button
                  type="button"
                  onClick={onContinuePermission}
                  style={{
                    flex: 1,
                    background: 'var(--neon-cyan)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)'
                  }}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRetryPermission}
                  style={{
                    flex: 1,
                    background: 'var(--neon-cyan)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)'
                  }}
                >
                  Retry Permission
                </button>
              )}

              <button
                type="button"
                onClick={isIncoming ? onReject : onEndCall}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '12px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden audio element for remote audio stream during audio calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Subtle Background Glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 50% 30%, rgba(0, 240, 255, 0.12), transparent 75%)',
        pointerEvents: 'none'
      }} />

      {/* Top Bar Header */}
      <div style={{ zIndex: 10, textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <div style={{ 
          fontSize: '11px', 
          textTransform: 'uppercase', 
          letterSpacing: '1.2px', 
          color: 'var(--neon-cyan)', 
          marginBottom: '6px', 
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0, 240, 255, 0.1)',
          padding: '4px 12px',
          borderRadius: '16px',
          border: '1px solid rgba(0, 240, 255, 0.2)'
        }}>
          <ShieldCheck size={14} color="var(--neon-cyan)" />
          {type === 'video' ? 'WebRTC Encrypted Video' : 'WebRTC Encrypted Voice'}
        </div>
        
        <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>
          {peerName}
        </h2>
        
        <div style={{ 
          fontSize: '13px', 
          color: callState === 'connected' ? 'var(--neon-lime)' : 'var(--neon-cyan)', 
          fontWeight: 600,
          animation: callState === 'ringing' || callState === 'calling' ? 'pulse 1.5s infinite' : 'none'
        }}>
          {getStatusBadgeText()}
        </div>

        {permissionError && (
          <div style={{
            marginTop: '10px',
            background: 'rgba(255, 59, 48, 0.15)',
            border: '1px solid rgba(255, 59, 48, 0.4)',
            color: '#ff453a',
            padding: '8px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{permissionError}</span>
          </div>
        )}
      </div>

      {/* Main Stream Rendering Area */}
      <div style={{ 
        zIndex: 10, 
        width: '100%', 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative',
        margin: '20px 0'
      }}>
        {type === 'audio' || isVideoOff || callState !== 'connected' ? (
          /* Avatar View for Voice Calls or Pre-connection State */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'relative',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid var(--neon-cyan)',
              boxShadow: '0 0 35px rgba(0, 240, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-secondary)',
              animation: (callState === 'ringing' || callState === 'calling') ? 'pulse 2s infinite' : 'none'
            }}>
              <UserAvatar url={peerAvatar} name={peerName} size={140} />
            </div>
          </div>
        ) : (
          /* Video Call View: Remote Video Full + Local Self Preview */
          <div style={{
            width: 'min(92vw, 640px)',
            height: 'min(60vh, 420px)',
            background: '#121522',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid var(--glass-border)',
            position: 'relative',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Remote Video Stream */}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />

            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              background: 'rgba(0,0,0,0.65)',
              padding: '6px 14px',
              borderRadius: '14px',
              fontSize: '12px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontWeight: 600
            }}>
              {peerName}
            </div>

            {/* Self Camera Mini Overlay */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '120px',
              height: '160px',
              borderRadius: '16px',
              background: '#000',
              border: '2px solid var(--neon-cyan)',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              zIndex: 20
            }}>
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Controls Bar */}
      <div style={{
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        background: 'rgba(255, 255, 255, 0.06)',
        padding: '16px 28px',
        borderRadius: '36px',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 35px rgba(0,0,0,0.6)'
      }}>
        {isIncoming && (callState === 'ringing' || callState === 'calling') ? (
          /* Incoming Call Actions: Accept vs Decline */
          <>
            <button
              onClick={onReject}
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                border: 'none',
                background: '#ff3b30',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(255, 59, 48, 0.5)',
                transition: 'all 0.2s'
              }}
              title="Decline Call"
            >
              <PhoneOff size={26} />
            </button>

            <button
              onClick={onAccept}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: 'none',
                background: 'var(--neon-lime)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 25px rgba(48, 209, 88, 0.6)',
                transform: 'scale(1.08)',
                transition: 'all 0.2s'
              }}
              title="Accept Call"
            >
              <PhoneCall size={28} />
            </button>
          </>
        ) : (
          /* Active Call Controls */
          <>
            {/* Microphone Mute */}
            <button
              onClick={handleMicClick}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: 'none',
                background: isMuted ? 'rgba(255, 59, 48, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                color: isMuted ? '#ff3b30' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Video Toggle */}
            {type === 'video' && (
              <button
                onClick={handleCameraClick}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  border: 'none',
                  background: isVideoOff ? 'rgba(255, 59, 48, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                  color: isVideoOff ? '#ff3b30' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isVideoOff ? <VideoOff size={22} /> : <VideoIcon size={22} />}
              </button>
            )}

            {/* Switch Camera (Mobile Device Support) */}
            {type === 'video' && onSwitchCamera && (
              <button
                onClick={onSwitchCamera}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Switch Camera (Front/Back)"
              >
                <RefreshCw size={20} />
              </button>
            )}

            {/* Speaker Button */}
            <button
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Speaker Output"
            >
              <Volume2 size={22} />
            </button>

            {/* End Call Button */}
            <button
              onClick={onEndCall}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: 'none',
                background: '#ff3b30',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(255, 59, 48, 0.5)',
                transform: 'scale(1.05)'
              }}
              title="End Call"
            >
              <PhoneOff size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
