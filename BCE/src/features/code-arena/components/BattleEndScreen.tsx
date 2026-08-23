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
              <svg id="battle-certificate-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="100%" height="100%" style={{ borderRadius: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <defs>
                  <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#050814" />
                    <stop offset="50%" stopColor="#0b1021" />
                    <stop offset="100%" stopColor="#04060e" />
                  </linearGradient>

                  <linearGradient id="cyanPurpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>

                  <linearGradient id="silverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>

                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="30%" stopColor="#fbbf24" />
                    <stop offset="70%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#92400e" />
                  </linearGradient>

                  <linearGradient id="silverMedalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#e2e8f0" />
                    <stop offset="70%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>

                  <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffedd5" />
                    <stop offset="30%" stopColor="#f97316" />
                    <stop offset="70%" stopColor="#c2410c" />
                    <stop offset="100%" stopColor="#7c2d12" />
                  </linearGradient>

                  <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>

                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Base Background */}
                <rect width="1200" height="800" fill="url(#bgGrad)" rx="16" />

                {/* Circuit Grid pattern */}
                <g opacity="0.05" stroke="#ffffff" strokeWidth="1">
                  <path d="M 0,100 H 1200 M 0,200 H 1200 M 0,300 H 1200 M 0,400 H 1200 M 0,500 H 1200 M 0,600 H 1200 M 0,700 H 1200" />
                  <path d="M 150,0 V 800 M 300,0 V 800 M 450,0 V 800 M 600,0 V 800 M 750,0 V 800 M 900,0 V 800 M 1050,0 V 800" />
                </g>

                {/* Glowing Corner Orbs */}
                <circle cx="0" cy="0" r="300" fill="#00f0ff" opacity="0.1" filter="url(#glow)" />
                <circle cx="1200" cy="800" r="350" fill="#7f00ff" opacity="0.1" filter="url(#glow)" />

                {/* Outer Neon Border */}
                <rect x="24" y="24" width="1152" height="752" rx="14" fill="none" stroke="url(#cyanPurpleGrad)" strokeWidth="2.5" />
                <rect x="32" y="32" width="1136" height="736" rx="10" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />

                {/* Ornate Corner Tech Accents */}
                <path d="M 20,60 L 20,20 L 60,20 M 24,70 L 70,24" stroke="#00f0ff" strokeWidth="2.5" fill="none" />
                <path d="M 1180,60 L 1180,20 L 1140,20 M 1176,70 L 1130,24" stroke="#00f0ff" strokeWidth="2.5" fill="none" />
                <path d="M 20,740 L 20,780 L 60,780 M 24,730 L 70,776" stroke="#7f00ff" strokeWidth="2.5" fill="none" />
                <path d="M 1180,740 L 1180,780 L 1140,780 M 1176,730 L 1130,776" stroke="#7f00ff" strokeWidth="2.5" fill="none" />

                {/* TOP LEFT: Instructor/Institution Logo or Shield Emblem */}
                {(organizerLogo) ? (
                  <g transform="translate(60, 50)">
                    <rect x="-10" y="-10" width="180" height="70" rx="10" fill="rgba(11, 16, 33, 0.6)" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" />
                    <image href={organizerLogo} x="0" y="0" width="160" height="50" preserveAspectRatio="xMidYMid contain" />
                  </g>
                ) : (
                  <g transform="translate(140, 150)">
                    <path d="M -45,15 C -60,-5 -55,-30 -40,-45 C -45,-25 -40,-10 -35,5 M -55,35 C -70,15 -65,-10 -50,-25 C -55,-5 -50,10 -45,25" stroke="#38bdf8" strokeWidth="2" fill="none" />
                    <path d="M -40,-40 C -35,-50 -20,-55 -10,-55 M -50,-20 C -45,-32 -30,-40 -15,-40" stroke="#38bdf8" strokeWidth="2" fill="none" />
                    <path d="M 45,15 C 60,-5 55,-30 40,-45 C 45,-25 40,-10 35,5 M 55,35 C 70,15 65,-10 50,-25 C 55,-5 50,10 45,25" stroke="#38bdf8" strokeWidth="2" fill="none" />
                    <path d="M 40,-40 C 35,-50 20,-55 10,-55 M 50,-20 C 45,-32 30,-40 15,-40" stroke="#38bdf8" strokeWidth="2" fill="none" />
                    <path d="M 0,-50 L -35,-35 C -35,0 -20,35 0,55 C 20,35 35,0 35,-35 Z" fill="rgba(6, 182, 212, 0.12)" stroke="#00f0ff" strokeWidth="3" filter="url(#glow)" />
                    <path d="M 0,-42 L -28,-29 C -28,0 -16,28 0,44 C 16,28 28,0 28,-29 Z" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
                    <text x="0" y="8" textAnchor="middle" fill="#00f0ff" fontSize="20" fontWeight="900" fontFamily="monospace" filter="url(#glow)">&lt;/&gt;</text>
                  </g>
                )}

                {/* TOP CENTER: Smart Learn Branding */}
                <g transform="translate(600, 95)">
                  <g transform="translate(0, -28)">
                    <polygon points="0,-18 16,0 0,18 -16,0" fill="url(#cyanPurpleGrad)" opacity="0.9" />
                    <polygon points="0,-12 11,0 0,12 -11,0" fill="#0b1021" />
                    <text x="0" y="4" textAnchor="middle" fill="#00f0ff" fontSize="10" fontWeight="900" fontFamily="monospace">&lt;&gt;</text>
                  </g>

                  <text x="0" y="8" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" letterSpacing="4">SMART LEARN</text>
                  <text x="0" y="28" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="800" letterSpacing="3">{(organizerName || 'OFFICIAL BATTLE CERTIFICATE').toUpperCase()}</text>
                </g>

                {/* TOP RIGHT: Dynamic Immutable Certificate ID */}
                <g transform="translate(1110, 60)">
                  <rect x="-240" y="-12" width="240" height="26" rx="6" fill="rgba(6, 182, 212, 0.1)" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1" />
                  <text x="-120" y="5" textAnchor="middle" fill="#00f0ff" fontSize="11" fontWeight="700" fontFamily="monospace">
                    ID: {certCode}
                  </text>
                </g>

                {/* MAIN HEADER TITLE */}
                <g transform="translate(600, 200)">
                  <text x="0" y="0" textAnchor="middle" fill="url(#silverGrad)" fontSize="60" fontWeight="900" letterSpacing="8" filter="url(#glow)">CERTIFICATE</text>
                  
                  {/* Sub-Line with Cyan Diamonds */}
                  <g transform="translate(0, 35)">
                    <line x1="-280" y1="0" x2="-140" y2="0" stroke="url(#cyanPurpleGrad)" strokeWidth="2" />
                    <circle cx="-140" cy="0" r="3" fill="#00f0ff" />
                    <polygon points="-120,0 -115,-5 -110,0 -115,5" fill="#00f0ff" />
                    <circle cx="-105" cy="0" r="2" fill="#00f0ff" />

                    <text x="0" y="6" textAnchor="middle" fill="url(#cyanPurpleGrad)" fontSize="18" fontWeight="800" letterSpacing="5">OF CODING BATTLE</text>

                    <circle cx="105" cy="0" r="2" fill="#00f0ff" />
                    <polygon points="110,0 115,-5 120,0 115,5" fill="#00f0ff" />
                    <circle cx="140" cy="0" r="3" fill="#00f0ff" />
                    <line x1="140" y1="0" x2="280" y2="0" stroke="url(#cyanPurpleGrad)" strokeWidth="2" />
                  </g>
                </g>

                {/* RECIPIENT SECTION */}
                <text x="600" y="300" textAnchor="middle" fill="#94a3b8" fontSize="16" fontWeight="500">This is to certify that</text>

                {/* Recipient Name in Cyan-Purple Gradient */}
                <text x="600" y="365" textAnchor="middle" fill="url(#cyanPurpleGrad)" fontSize="54" fontWeight="900" letterSpacing="1" filter="url(#glow)">
                  {userName}
                </text>
                <line x1="380" y1="385" x2="820" y2="385" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

                {/* Description Text */}
                <text x="600" y="420" textAnchor="middle" fill="#cbd5e1" fontSize="15" fontWeight="500">
                  has successfully participated in the Coding Battle "{battle.title || 'Code Arena Battle'}" and demonstrated
                </text>
                <text x="600" y="445" textAnchor="middle" fill="#cbd5e1" fontSize="15" fontWeight="500">
                  exceptional problem-solving skills, algorithmic logic, and coding performance.
                </text>

                {/* 3 KEY STATS CARDS (DATE, SCORE, RANK) */}
                <g transform="translate(600, 520)">
                  <line x1="-350" y1="-30" x2="350" y2="-30" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

                  {/* 1. DATE */}
                  <g transform="translate(-240, 0)">
                    <rect x="-60" y="-18" width="36" height="36" rx="8" fill="rgba(56, 189, 248, 0.1)" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
                    <path d="M -48,-8 H -36 M -48,-2 H -36 M -48,4 H -40" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                    <rect x="-50" y="-12" width="16" height="18" rx="2" fill="none" stroke="#38bdf8" strokeWidth="1.5" />

                    <text x="-10" y="-4" fill="#94a3b8" fontSize="11" fontWeight="700" letterSpacing="1">DATE</text>
                    <text x="-10" y="16" fill="#ffffff" fontSize="16" fontWeight="700">{currentDateStr}</text>
                  </g>

                  <line x1="-60" y1="-15" x2="-60" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                  {/* 2. SCORE */}
                  <g transform="translate(0, 0)">
                    <rect x="-60" y="-18" width="36" height="36" rx="8" fill="rgba(168, 85, 247, 0.1)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" />
                    <path d="M -46,-10 H -38 V -2 C -38,3 -42,6 -46,6 Z M -38,-10 V 2 C -38,6 -42,8 -46,8 M -46,8 V 14 M -50,14 H -42" stroke="#a855f7" strokeWidth="1.5" fill="none" />

                    <text x="-10" y="-4" fill="#a855f7" fontSize="11" fontWeight="700" letterSpacing="1">SCORE</text>
                    <text x="-10" y="16" fill="#ffffff" fontSize="16" fontWeight="700">{userStats.score || 0}</text>
                  </g>

                  <line x1="120" y1="-15" x2="120" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                  {/* 3. RANK */}
                  <g transform="translate(180, 0)">
                    <rect x="-40" y="-18" width="36" height="36" rx="8" fill="rgba(168, 85, 247, 0.1)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" />
                    <polygon points="-22,-12 -18,-2 -8,-2 -15,4 -12,14 -22,8 -32,14 -29,4 -36,-2 -26,-2" fill="#a855f7" opacity="0.9" />

                    <text x="10" y="-4" fill="#38bdf8" fontSize="11" fontWeight="700" letterSpacing="1">RANK</text>
                    <text x="10" y="16" fill="#ffffff" fontSize="16" fontWeight="700">{userStats.rank ? `#${userStats.rank}` : 'Top 10%'}</text>
                  </g>

                  <line x1="-350" y1="45" x2="350" y2="45" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
                </g>

                {/* SIGNATURES & RANK MEDAL BADGE SECTION */}
                <g transform="translate(600, 650)">
                  {/* CENTER RANK-DRIVEN MEDAL BADGE */}
                  <g transform="translate(0, 0)">
                    {userStats.rank === 1 ? (
                      <>
                        <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#d97706" stroke="#92400e" strokeWidth="1" />
                        <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#d97706" stroke="#92400e" strokeWidth="1" />
                        <circle cx="0" cy="0" r="48" fill="url(#goldGrad)" stroke="#fef08a" strokeWidth="2.5" filter="url(#glow)" />
                        <circle cx="0" cy="0" r="42" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                        <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#goldGrad)" strokeWidth="2" />
                        <path d="M -16,8 L -20,-10 L -10,-2 L 0,-14 L 10,-2 L 20,-10 L 16,8 Z" fill="#fbbf24" />
                        <text x="0" y="24" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="900" letterSpacing="1">RANK #1</text>
                      </>
                    ) : userStats.rank === 2 ? (
                      <>
                        <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#64748b" stroke="#334155" strokeWidth="1" />
                        <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#64748b" stroke="#334155" strokeWidth="1" />
                        <circle cx="0" cy="0" r="48" fill="url(#silverMedalGrad)" stroke="#ffffff" strokeWidth="2.5" filter="url(#glow)" />
                        <circle cx="0" cy="0" r="42" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                        <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#silverMedalGrad)" strokeWidth="2" />
                        <polygon points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4" fill="#e2e8f0" />
                        <text x="0" y="24" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="900" letterSpacing="1">RANK #2</text>
                      </>
                    ) : userStats.rank === 3 ? (
                      <>
                        <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#c2410c" stroke="#7c2d12" strokeWidth="1" />
                        <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#c2410c" stroke="#7c2d12" strokeWidth="1" />
                        <circle cx="0" cy="0" r="48" fill="url(#bronzeGrad)" stroke="#ffedd5" strokeWidth="2.5" filter="url(#glow)" />
                        <circle cx="0" cy="0" r="42" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                        <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#bronzeGrad)" strokeWidth="2" />
                        <polygon points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4" fill="#f97316" />
                        <text x="0" y="24" textAnchor="middle" fill="#f97316" fontSize="10" fontWeight="900" letterSpacing="1">RANK #3</text>
                      </>
                    ) : (
                      <>
                        <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                        <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                        <circle cx="0" cy="0" r="48" fill="url(#sealGrad)" stroke="#38bdf8" strokeWidth="2.5" filter="url(#glow)" />
                        <circle cx="0" cy="0" r="42" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                        <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#sealGrad)" strokeWidth="2" />
                        <text x="0" y="6" textAnchor="middle" fill="#00f0ff" fontSize="20" fontWeight="900" fontFamily="monospace">&lt;/&gt;</text>
                        <text x="0" y="24" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="900" letterSpacing="1">VERIFIED</text>
                      </>
                    )}
                  </g>

                  {/* INSTRUCTOR SIGNATURE */}
                  <g transform="translate(320, 0)">
                    <text x="0" y="-20" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="400" fontFamily="'Brush Script MT', 'Dancing Script', cursive, serif" fontStyle="italic">
                      Aditya Kumar Sah
                    </text>
                    <line x1="-110" y1="-5" x2="110" y2="-5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                    <text x="0" y="16" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="800" letterSpacing="1">ADITYA KUMAR SAH</text>
                    <text x="0" y="32" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">The Developer &amp; The Coder</text>
                  </g>
                </g>

                {/* FOOTER VERIFICATION LINK */}
                <g transform="translate(600, 762)">
                  <circle cx="-200" cy="-4" r="9" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="1" />
                  <path d="M -204,-4 L -201,-1 L -195,-7" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                  <text x="-185" y="0" textAnchor="start" fill="#64748b" fontSize="12" fontWeight="600">
                    Verify certificate at: <tspan fill="#38bdf8" fontWeight="700">https://codingbattle.com/verify/certificate/{certCode}</tspan>
                  </text>
                </g>
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
