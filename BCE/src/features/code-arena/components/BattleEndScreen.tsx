'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Trophy, Target, Award, CheckCircle2, BarChart2, ArrowLeft, X, Download, Share2, Shield, Settings } from 'lucide-react';
import Link from 'next/link';

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
  const userName = currentUser?.name || currentUser?.user_metadata?.name || 'BCE Star Programmer';
  const organizerName = battle.organizer_name || battle.profiles?.full_name || 'BCE Faculty';
  const organizerLogo = battle.organizer_logo || null;
  const [particles, setParticles] = useState<any[]>([]);

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
    downloadLink.download = `${battle.title.replace(/\s+/g, '_')}_BCE_Certificate.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URLObj.revokeObjectURL(svgUrl);
  };

  const downloadPNG = () => {
    const svgEl = document.getElementById('battle-certificate-svg') as SVGSVGElement | null;
    if (!svgEl) return;
    try {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 900;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#0b0f19';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `${battle.title.replace(/\s+/g, '_')}_SDE_Certificate.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URLObj.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (e) {
      console.error('PNG conversion failed:', e);
      downloadSVG();
    }
  };

  const shareToStatus = async () => {
    downloadPNG();
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

      <Card className="battle-complete-card" style={{ position: 'relative', maxWidth: '850px', width: '90%' }}>
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
            gap: '12px',
            boxShadow: 'inset 0 0 20px rgba(0,240,255,0.03)'
          }}>
            {/* The SVG Container */}
            <div style={{ width: '100%', maxWidth: '680px', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <svg id="battle-certificate-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%" style={{ borderRadius: '8px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <defs>
                  <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0b0f19" />
                    <stop offset="50%" stopColor="#111827" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  
                  <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#0072ff" />
                  </linearGradient>
                  
                  <linearGradient id="neonPink" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ff007f" />
                    <stop offset="100%" stopColor="#7f00ff" />
                  </linearGradient>
                  
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#b45309" />
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
                  
                  <style>{`
                    @keyframes borderRotate {
                      0% { stroke-dashoffset: 0; }
                      100% { stroke-dashoffset: 2500; }
                    }
                    @keyframes pulseGlow {
                      0%, 100% { opacity: 0.3; }
                      50% { opacity: 0.8; }
                    }
                    @keyframes floatTrophy {
                      0%, 100% { transform: translateY(0px) scale(1); }
                      50% { transform: translateY(-8px) scale(1.02); }
                    }
                    .rotating-border {
                      stroke: url(#neonCyan);
                      stroke-dasharray: 250, 100;
                      animation: borderRotate 20s linear infinite;
                    }
                    .trophy-group {
                      transform-origin: 400px 95px;
                      animation: floatTrophy 4s ease-in-out infinite;
                    }
                    .glow-light {
                      animation: pulseGlow 3s ease-in-out infinite;
                    }
                  `}</style>
                </defs>

                {/* Background */}
                <rect width="800" height="450" fill="url(#bgGrad)" rx="12" />
                
                {/* Mesh Grid Effect */}
                <g opacity="0.05">
                  <path d="M 0,45 L 800,45 M 0,90 L 800,90 M 0,135 L 800,135 M 0,180 L 800,180 M 0,225 L 800,225 M 0,270 L 800,270 M 0,315 L 800,315 M 0,360 L 800,360 M 0,405 L 800,405" stroke="#ffffff" strokeWidth="1" />
                  <path d="M 80,0 L 80,450 M 160,0 L 160,450 M 240,0 L 240,450 M 320,0 L 320,450 M 400,0 L 400,450 M 480,0 L 480,450 M 560,0 L 560,450 M 640,0 L 640,450 M 720,0 L 720,450" stroke="#ffffff" strokeWidth="1" />
                </g>

                {/* Glowing Corners */}
                <circle cx="0" cy="0" r="150" fill="#00f0ff" opacity="0.15" filter="url(#glowCyan)" className="glow-light" />
                <circle cx="800" cy="450" r="180" fill="#7f00ff" opacity="0.15" filter="url(#glowCyan)" className="glow-light" />

                {/* Animated Border */}
                <rect x="15" y="15" width="770" height="420" rx="10" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="2" />
                <rect x="15" y="15" width="770" height="420" rx="10" fill="none" strokeWidth="3" className="rotating-border" />

                {/* Trophy Icon */}
                <g className="trophy-group">
                  <circle cx="400" cy="95" r="45" fill="rgba(251, 191, 36, 0.1)" filter="url(#glowGold)" />
                  <path d="M400,68 C392,68 388,72 388,80 C388,86 394,92 400,95 C406,92 412,86 412,80 C412,72 408,68 400,68 Z M382,74 C378,74 376,77 376,81 C376,85 379,88 383,89 L384,81 Z M418,74 C422,74 424,77 424,81 C424,85 421,88 417,89 L416,81 Z M400,96 L400,105 M392,105 L408,105" stroke="url(#goldGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#glowGold)" />
                </g>

                {/* Header Text */}
                <text x="400" y="175" textAnchor="middle" fill="#00f0ff" fontSize="14" fontWeight="700" letterSpacing="4" filter="url(#glowCyan)">BCE CODE ARENA CHAMPION</text>
                <text x="400" y="210" text-anchor="middle" fill="#ffffff" fontSize="28" fontWeight="800" letterSpacing="1">CERTIFICATE OF ACHIEVEMENT</text>

                {/* Divider Line */}
                <line x1="250" y1="230" x2="550" y2="230" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />

                {/* Recipient Name */}
                <text x="400" y="265" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="600">This is proudly awarded to</text>
                <text x="400" y="305" text-anchor="middle" fill="#fbbf24" fontSize="34" fontWeight="800" letterSpacing="0.5" filter="url(#glowGold)">{userName}</text>

                {/* Achievement Description */}
                <text x="400" y="340" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="500">for exceptional coding performance in the live battle</text>
                <text x="400" y="365" text-anchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="700">"{battle.title}"</text>

                {/* Stats Indicators footer */}
                <g transform="translate(140, 395)">
                  {/* Score */}
                  <g transform="translate(0, 0)">
                    <rect x="0" y="0" width="120" height="28" rx="6" fill="rgba(6, 182, 212, 0.08)" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="1" />
                    <text x="60" y="18" textAnchor="middle" fill="#00f0ff" fontSize="11" fontWeight="700">{userStats.score} PTS</text>
                  </g>
                  {/* Rank */}
                  <g transform="translate(135, 0)">
                    <rect x="0" y="0" width="120" height="28" rx="6" fill="rgba(251, 191, 36, 0.08)" stroke="rgba(251, 191, 36, 0.2)" strokeWidth="1" />
                    <text x="60" y="18" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">RANK #{userStats.rank}</text>
                  </g>
                  {/* Solved */}
                  <g transform="translate(270, 0)">
                    <rect x="0" y="0" width="120" height="28" rx="6" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" />
                    <text x="60" y="18" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="700">SOLVED {userStats.solvedCount}/{userStats.totalProblems}</text>
                  </g>
                  {/* Accuracy */}
                  <g transform="translate(405, 0)">
                    <rect x="0" y="0" width="120" height="28" rx="6" fill="rgba(168, 85, 247, 0.08)" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
                    <text x="60" y="18" textAnchor="middle" fill="#a855f7" fontSize="11" fontWeight="700">{userStats.accuracy}% ACC</text>
                  </g>
                </g>
              </svg>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
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
                <Award size={16} /> {claiming ? 'Loading Certificate...' : '🏆 View / Customize Certificate & Signatures'}
              </Button>

              <Button
                variant="secondary"
                onClick={downloadPNG}
                style={{
                  background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Download size={16} /> Download PNG Certificate
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  const svgEl = document.getElementById('battle-certificate-svg') as SVGSVGElement | null;
                  if (!svgEl) return;
                  try {
                    const svgString = new XMLSerializer().serializeToString(svgEl);
                    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const URLObj = window.URL || window.webkitURL || window;
                    const blobURL = URLObj.createObjectURL(svgBlob);
                    const image = new Image();
                    image.onload = () => {
                      const canvas = document.createElement('canvas');
                      canvas.width = 1600;
                      canvas.height = 900;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.fillStyle = '#0b0f19';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                        const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
                        const downloadLink = document.createElement('a');
                        downloadLink.href = jpgUrl;
                        const cleanName = userName.replace(/[^a-zA-Z0-9]/g, '-');
                        downloadLink.download = `Coding-Battle-Certificate-${cleanName}.jpg`;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                      }
                      URLObj.revokeObjectURL(blobURL);
                    };
                    image.src = blobURL;
                  } catch (e) {
                    console.error('JPG conversion failed:', e);
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Download size={16} /> Download JPG Certificate
              </Button>

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
