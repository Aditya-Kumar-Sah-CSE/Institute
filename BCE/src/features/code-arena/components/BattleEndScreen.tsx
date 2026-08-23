'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Trophy, Target, Award, CheckCircle2, BarChart2, ArrowLeft, X, Download, Share2, Shield, Settings, ChevronDown, FileImage, FileCode, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { downloadSvgAsImage } from '@/lib/utils/certificateExporter';

interface BattleEndScreenProps {
  battle: any;
  currentUser?: any;
  userStats: {
    rank: number | string;
    score: number;
    solvedCount: number;
    totalProblems: number;
    accuracy: number;
  };
  onViewLeaderboard: () => void;
  onViewAnalytics: () => void;
  onClose?: () => void;
}

export default function BattleEndScreen({
  battle,
  currentUser,
  userStats,
  onViewLeaderboard,
  onViewAnalytics,
  onClose,
}: BattleEndScreenProps) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDownloadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleOpenCertificate = async () => {
    setClaiming(true);
    try {
      const res = await fetch(`/api/coding/battles/${battle.id}/certificate`, { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data?.id) {
        router.push(`/certificates/${json.data.id}`);
      }
    } catch (e) {
      console.error('Failed to load certificate:', e);
    } finally {
      setClaiming(false);
    }
  };
  const userName = currentUser?.name || currentUser?.user_metadata?.name || 'Smart Learner';
  const organizerName = battle.organizer_name || battle.profiles?.full_name || 'SL CODE ARENA';
  const organizerLogo = battle.organizer_logo || null;
  const [particles, setParticles] = useState<any[]>([]);

  const certCode = `CB-${new Date().getFullYear()}-${userStats.score}-${battle.id.substring(0, 6).toUpperCase()}`;
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    // Generate celebration confetti particles
    const colors = ['#00f0ff', '#ff007f', '#fbbf24', '#10b981', '#a855f7', '#3b82f6'];
    const newParticles = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage from left
      y: -10 - Math.random() * 20, // start above view
      size: 5 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      rotation: Math.random() * 360,
      shape: Math.random() > 0.5 ? 'circle' : 'rect'
    }));
    setParticles(newParticles);
  }, []);

  const downloadSVG = () => {
    const svgEl = document.getElementById('battle-certificate-svg');
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URLObj = window.URL || window.webkitURL || window;
    const svgUrl = URLObj.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${battle.title.replace(/\s+/g, '_')}_Official_Certificate.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URLObj.revokeObjectURL(svgUrl);
  };

  const downloadPNG = async () => {
    const cleanTitle = (battle.title || 'Battle').replace(/\s+/g, '_');
    await downloadSvgAsImage('battle-certificate-svg', {
      filename: `${cleanTitle}_Official_SDE_Certificate`,
      format: 'png',
      width: 1920,
      height: 1080,
    });
  };

  const downloadJPG = async () => {
    const cleanTitle = (battle.title || 'Battle').replace(/\s+/g, '_');
    await downloadSvgAsImage('battle-certificate-svg', {
      filename: `${cleanTitle}_Official_SDE_Certificate`,
      format: 'jpeg',
      width: 1920,
      height: 1080,
    });
  };

  const shareToStatus = async () => {
    await downloadPNG();
    const statusCaption = `🔥 Just completed "${battle.title}" SDE Battle on BCE Code Arena!\n🏆 Rank: #${userStats.rank} | 🎯 Score: ${userStats.score} PTS\n✅ Solved: ${userStats.solvedCount}/${userStats.totalProblems} Problems (${userStats.accuracy}% Accuracy)\n\n#Coding #BCECodeArena #Programmer #SDE`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${battle.title} SDE Battle Achievement`,
          text: statusCaption,
          url: window.location.origin + '/code-arena',
        });
      } catch (err) {
        copyToClipboard(statusCaption);
      }
    } else {
      copyToClipboard(statusCaption);
    }
  };

  const shareAchievement = async () => {
    const shareText = `🏆 I completed the BCE Coding Battle "${battle.title}"! \n\n🎯 Score: ${userStats.score} PTS\n🥇 Rank: #${userStats.rank}\n✅ Solved: ${userStats.solvedCount}/${userStats.totalProblems} Problems\n⏱️ Accuracy: ${userStats.accuracy}%\n\nJoin the BCE code arena and level up your coding skills! 🚀`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BCE Code Arena Achievement',
          text: shareText,
          url: window.location.origin + '/code-arena',
        });
      } catch (err) {
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Congratulations! Share details copied to clipboard. Paste it on LinkedIn, Twitter, or WhatsApp to celebrate! 🎉');
  };

  return (
    <div className="battle-complete-wrapper">
      {/* Confetti Celebration Style block */}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(115vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Celebration Confetti rain */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 99999 }}>
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: p.shape === 'rect' ? `${p.size * 0.6}px` : `${p.size}px`,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              backgroundColor: p.color,
              transform: `rotate(${p.rotation}deg)`,
              animation: `confettiFall ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
              opacity: 0.8
            }}
          />
        ))}
      </div>

      <Card className="battle-complete-card" style={{ position: 'relative', maxWidth: '880px', width: '95%' }}>
        {/* Top Left Organizer Logo */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10,
          }}
          title={`Organized by ${organizerName}`}
        >
          {organizerLogo ? (
            organizerLogo.trim().startsWith('<svg') ? (
              <div
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                dangerouslySetInnerHTML={{ __html: organizerLogo }}
              />
            ) : (
              <img
                src={organizerLogo}
                alt={organizerName}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  objectFit: 'contain',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  padding: '2px',
                }}
              />
            )
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(168,85,247,0.2))',
                border: '1px solid var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              <Shield size={16} />
            </div>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '50%',
              transition: 'all 0.2s',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        )}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.3))',
            border: '2px solid #eab308',
            color: '#eab308',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Trophy size={36} />
        </div>

        <div style={{ textAlign: 'center', margin: '12px 0 var(--space-lg) 0' }}>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: '4px 0' }}>
            🎉 Thank You for Participating!
          </h1>
          <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, maxWidth: '650px', margin: '8px auto', lineHeight: 1.6 }}>
            Congratulations, <span style={{ color: 'var(--neon-gold)' }}>{userName}</span>! You performed incredibly well!
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px', margin: '0 auto' }}>
            You scored <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>{userStats.score} pts</span>, 
            secured <span style={{ color: 'var(--neon-gold)', fontWeight: 700 }}>Rank #{userStats.rank}</span>, 
            and successfully solved <span style={{ color: 'var(--neon-emerald)', fontWeight: 700 }}>{userStats.solvedCount}/{userStats.totalProblems}</span> problems!
          </p>
        </div>

        {/* Shareable Certificate Display and Controls */}
        <div style={{ width: '100%', marginBottom: 'var(--space-lg)' }}>
          <div style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: 'inset 0 0 20px rgba(0,240,255,0.03)'
          }}>
            {/* The SVG Container: Official Verified Certificate Template */}
            <div style={{ width: '100%', maxWidth: '750px', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg id="battle-certificate-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="100%" height="100%" style={{ borderRadius: '8px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <defs>
                  <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#080c14" />
                    <stop offset="50%" stopColor="#0b0f19" />
                    <stop offset="100%" stopColor="#02060c" />
                  </linearGradient>
                  <linearGradient id="cyanPurpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#7f00ff" />
                  </linearGradient>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#92400e" />
                  </linearGradient>
                  <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="10" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Base Background */}
                <rect width="960" height="540" fill="url(#bgGrad)" opacity="1" />
                
                {/* Circuit Grid pattern */}
                <g opacity="0.04" stroke="#ffffff" strokeWidth="1">
                  <path d="M0,60 H960 M0,120 H960 M0,180 H960 M0,240 H960 M0,300 H960 M0,360 H960 M0,420 H960 M0,480 H960" />
                  <path d="M120,0 V540 M240,0 V540 M360,0 V540 M480,0 V540 M600,0 V540 M720,0 V540 M840,0 V540" />
                </g>

                {/* Circuits Accent traces */}
                <path d="M 50,50 L 150,50 L 200,100 M 910,490 L 810,490 L 760,440" stroke="#00f0ff" strokeWidth="1.5" fill="none" opacity="0.3" />
                <path d="M 50,490 L 150,490 L 200,440 M 910,50 L 810,50 L 760,100" stroke="#7f00ff" strokeWidth="1.5" fill="none" opacity="0.3" />

                {/* Premium Neon Border */}
                <rect x="20" y="20" width="920" height="500" rx="12" fill="none" stroke="url(#cyanPurpleGrad)" strokeWidth="2.5" />
                <rect x="25" y="25" width="910" height="490" rx="10" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />

                {/* Top Left Shield Logo Badge */}
                <g transform="translate(60, 65)">
                  <circle cx="45" cy="45" r="40" fill="rgba(6, 182, 212, 0.1)" stroke="#00f0ff" strokeWidth="1.5" filter="url(#glowCyan)" />
                  {organizerLogo ? (
                    <image href={organizerLogo} x="15" y="15" width="60" height="60" preserveAspectRatio="xMidYMid meet" />
                  ) : (
                    <>
                      <path d="M45,23 L28,30 C28,42 35,53 45,57 C55,53 62,42 62,30 L45,23 Z" fill="none" stroke="#00f0ff" strokeWidth="2" />
                      <text x="45" y="44" textAnchor="middle" fill="#00f0ff" fontSize="11" fontWeight="800" fontFamily="monospace">&lt;/&gt;</text>
                    </>
                  )}
                </g>

                {/* Top Center Branding Logo */}
                <g transform="translate(480, 75)">
                  <text x="0" y="0" textAnchor="middle" fill="#ffffff" fontSize="24" fontWeight="900" letterSpacing="4">{(organizerName || 'SL CODE ARENA').toUpperCase()}</text>
                  <text x="0" y="16" textAnchor="middle" fill="#00f0ff" fontSize="9" fontWeight="700" letterSpacing="2">CODE. SOLVE. CONQUER.</text>
                </g>
                
                {/* Certificate ID */}
                <text x="900" y="55" textAnchor="end" fill="#64748b" fontSize="10" fontWeight="700" fontFamily="monospace">
                  Certificate ID: {certCode}
                </text>

                {/* Header Text */}
                <text x="480" y="160" textAnchor="middle" fill="url(#cyanPurpleGrad)" fontSize="32" fontWeight="800" letterSpacing="3">CERTIFICATE OF ACHIEVEMENT</text>
                <text x="480" y="200" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="500">This is proudly presented to</text>

                {/* Recipient Name */}
                <text x="480" y="255" textAnchor="middle" fill="#fbbf24" fontSize="38" fontWeight="800" letterSpacing="0.5" filter="url(#glowGold)">{userName}</text>
                <line x1="320" y1="270" x2="640" y2="270" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

                {/* Certification Statement */}
                <text x="480" y="300" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="500">
                  has successfully participated in the Coding Battle "{battle.title}"
                </text>
                <text x="480" y="320" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="500">
                  and demonstrated exceptional problem-solving skills, logical thinking, and coding abilities.
                </text>

                {/* Certificate Stats badges */}
                <g transform="translate(190, 355)">
                  {/* Date */}
                  <g transform="translate(0, 0)">
                    <rect width="130" height="42" rx="6" fill="rgba(168, 85, 247, 0.05)" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
                    <text x="65" y="16" textAnchor="middle" fill="#a855f7" fontSize="8" fontWeight="700" letterSpacing="0.5">DATE</text>
                    <text x="65" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">{currentDateStr}</text>
                  </g>
                  {/* Score */}
                  <g transform="translate(150, 0)">
                    <rect width="130" height="42" rx="6" fill="rgba(6, 182, 212, 0.05)" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="1" />
                    <text x="65" y="16" textAnchor="middle" fill="#00f0ff" fontSize="8" fontWeight="700" letterSpacing="0.5">SCORE</text>
                    <text x="65" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">{userStats.score} PTS</text>
                  </g>
                  {/* Rank */}
                  <g transform="translate(300, 0)">
                    <rect width="130" height="42" rx="6" fill="rgba(251, 191, 36, 0.05)" stroke="rgba(251, 191, 36, 0.2)" strokeWidth="1" />
                    <text x="65" y="16" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="700" letterSpacing="0.5">RANK</text>
                    <text x="65" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">#{userStats.rank}</text>
                  </g>
                  {/* Solved */}
                  <g transform="translate(450, 0)">
                    <rect width="130" height="42" rx="6" fill="rgba(34, 197, 94, 0.05)" stroke="rgba(34, 197, 94, 0.2)" strokeWidth="1" />
                    <text x="65" y="16" textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="700" letterSpacing="0.5">SOLVED PROBLEMS</text>
                    <text x="65" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">{userStats.solvedCount} / {userStats.totalProblems}</text>
                  </g>
                </g>

                {/* Signatures & Seal */}
                <g transform="translate(80, 420)">
                  {/* Left signature: default BCE signature */}
                  <g transform="translate(40, 20)">
                    <text x="0" y="-12" fill="#38bdf8" fontSize="20" fontWeight="400" fontFamily="cursive, serif" fontStyle="italic">BCE Authority</text>
                    <line x1="0" y1="0" x2="160" y2="0" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <text x="0" y="15" fill="#f8fafc" fontSize="9" fontWeight="700" letterSpacing="0.5">BCE COORDINATOR</text>
                    <text x="0" y="26" fill="#64748b" fontSize="8" fontWeight="600">Smart Learning App</text>
                  </g>

                  {/* Center Gold Seal badge */}
                  <g transform="translate(365, -15)">
                    <polygon points="40,0 48,15 65,15 52,26 57,43 40,33 23,43 28,26 15,15 32,15" fill="#d97706" stroke="#fbbf24" strokeWidth="1" />
                    <circle cx="40" cy="20" r="18" fill="url(#goldGrad)" stroke="#fbbf24" strokeWidth="1.5" filter="url(#glowGold)" />
                    <text x="40" y="24" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="monospace">&lt;&gt;</text>
                  </g>

                  {/* Right signature: Instructor / Founder signature */}
                  <g transform="translate(560, 20)">
                    <text x="0" y="-12" fill="#e2e8f0" fontSize="18" fontWeight="400" fontFamily="cursive, serif" fontStyle="italic">Aditya Kumar Sah</text>
                    <line x1="0" y1="0" x2="160" y2="0" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <text x="0" y="15" fill="#f8fafc" fontSize="9" fontWeight="700" letterSpacing="0.5">ADITYA KUMAR SAH</text>
                    <text x="0" y="26" fill="#64748b" fontSize="8" fontWeight="600">The Developer & The Coder</text>
                  </g>
                </g>

                {/* Real verification footer link */}
                <text x="480" y="515" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">
                  Verify this credential authentically at: {typeof window !== 'undefined' ? window.location.origin : ''}/verify/certificate
                </text>
              </svg>
            </div>
            
            {/* Interactive Download Dropdown & Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
              <Button
                variant="primary"
                onClick={handleOpenCertificate}
                disabled={claiming}
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                  color: '#000',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 15px rgba(251, 191, 36, 0.3)'
                }}
              >
                <Award size={16} /> {claiming ? 'Loading Certificate...' : '🏆 View / Customize Signatures & Logo'}
              </Button>

              {/* 3-Option Download Dropdown Button */}
              <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                  style={{
                    background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#fff',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
                  }}
                >
                  <Download size={16} /> Download Certificate <ChevronDown size={14} />
                </Button>

                {showDownloadDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#0b0f19',
                      border: '1px solid var(--neon-cyan)',
                      borderRadius: '12px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      minWidth: '230px',
                      zIndex: 1000,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.9), 0 0 15px rgba(0,240,255,0.2)',
                    }}
                  >
                    <button
                      onClick={() => { setShowDownloadDropdown(false); downloadPNG(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '10px 12px', borderRadius: '8px', background: 'transparent',
                        border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <ImageIcon size={16} style={{ color: 'var(--neon-cyan)' }} />
                      <div>
                        <div>PNG Certificate</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>High-res image (.png)</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setShowDownloadDropdown(false); downloadJPG(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '10px 12px', borderRadius: '8px', background: 'transparent',
                        border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <FileImage size={16} style={{ color: '#a855f7' }} />
                      <div>
                        <div>JPG Certificate</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Standard image (.jpg)</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setShowDownloadDropdown(false); downloadSVG(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                        padding: '10px 12px', borderRadius: '8px', background: 'transparent',
                        border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <FileCode size={16} style={{ color: '#fbbf24' }} />
                      <div>
                        <div>SVG Certificate</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Vector graphics file (.svg)</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={shareToStatus}
                style={{
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(168,85,247,0.2))',
                  border: '1px solid #3b82f6',
                  color: '#60a5fa',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Share2 size={16} /> 📲 Add to Status / Story
              </Button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="battle-complete-actions" style={{ marginTop: '8px' }}>
          <Button variant="primary" onClick={onViewLeaderboard}>
            <Trophy size={18} /> View Leaderboard
          </Button>

          <Button variant="secondary" onClick={onViewAnalytics}>
            <BarChart2 size={18} /> View Analytics
          </Button>

          <Link href="/code-arena">
            <Button variant="ghost">
              <ArrowLeft size={18} /> Back to Code Arena
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
