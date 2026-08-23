'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Share2, Award, Calendar, Trophy, Trash2, Edit3, Image as ImageIcon, Save, Check, ChevronDown, FileImage, FileCode } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { downloadSvgAsImage } from '@/lib/utils/certificateExporter';

interface CertificateRendererProps {
  cert: any;
  isPublicShare?: boolean;
  shareToken?: string;
  shareExpiresAt?: string;
}

export default function CertificateRenderer({
  cert,
  isPublicShare = false,
  shareToken = '',
  shareExpiresAt = '',
}: CertificateRendererProps) {
  const router = useRouter();
  const [signatureType, setSignatureType] = useState<'default' | 'upload' | 'draw'>(cert.signature_type || 'default');
  const [signatureName, setSignatureName] = useState(cert.signature_name || 'Aditya Kumar Sah');
  const [signatureDesignation, setSignatureDesignation] = useState(cert.signature_designation || 'The Developer & The Coder');
  const [signatureImage, setSignatureImage] = useState<string | null>(cert.signature_image_url || null);
  
  // Organizer branding state
  const [organizerName, setOrganizerName] = useState<string>(
    cert.coding_battles?.organizer_name || cert.company_name || 'SL Code Arena'
  );
  const [organizerLogo, setOrganizerLogo] = useState<string | null>(
    cert.coding_battles?.organizer_logo || null
  );

  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // Share countdown state
  const [timeRemaining, setTimeRemaining] = useState<string>('');

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

  useEffect(() => {
    if (!shareExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = new Date(shareExpiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeRemaining('Expired');
        clearInterval(interval);
        router.refresh();
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${mins}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [shareExpiresAt, router]);

  // Handle organizer logo upload
  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      alert('Only PNG, JPG, or SVG images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setOrganizerLogo(event.target.result as string);
        setMessage('Logo uploaded! Click Save Settings to persist.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Canvas drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const pos = getPos(e, canvas);
    lastPosRef.current = pos;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosRef.current) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    e.preventDefault();
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.strokeStyle = '#00f0ff'; // Neon Cyan brush
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const clearCanvas = () => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveDrawnSignature = () => {
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      // Check if canvas is blank/empty
      const ctx = canvas.getContext('2d');
      const buffer = new Uint32Array(ctx!.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
      const isBlank = !buffer.some(color => color !== 0);
      
      if (isBlank) {
        alert('Please draw a signature first.');
        return;
      }
      
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureImage(dataUrl);
      setMessage('Signature drawn! Click Save Changes to save permanently.');
    }
  };

  // Upload handler with validation
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      alert('Only PNG, JPG, or SVG images are allowed.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSignatureImage(event.target.result as string);
        setMessage('Image uploaded! Click Save Changes to save permanently.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignatureSettings = async () => {
    if (isPublicShare) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/coding/certificates/${cert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureType,
          signatureName,
          signatureDesignation,
          signatureImageUrl: signatureImage,
          organizerName,
          organizerLogo,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage('Changes saved successfully! 🎉');
        router.refresh();
      } else {
        setMessage(json.error || 'Failed to save settings.');
      }
    } catch {
      setMessage('Network error. Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const downloadSVG = () => {
    const svgEl = document.getElementById('battle-certificate-svg');
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URLObj = window.URL || window.webkitURL || window;
    const svgUrl = URLObj.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    const cleanName = (cert.profiles?.name || 'User').replace(/[^a-zA-Z0-9]/g, '-');
    downloadLink.download = `Coding-Battle-Certificate-${cleanName}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URLObj.revokeObjectURL(svgUrl);
  };

  const downloadPNG = async () => {
    const cleanName = (cert.profiles?.name || 'User').replace(/[^a-zA-Z0-9]/g, '-');
    await downloadSvgAsImage('battle-certificate-svg', {
      filename: `Coding-Battle-Certificate-${cleanName}`,
      format: 'png',
      width: 1920,
      height: 1080,
    });
  };

  const downloadJPG = async () => {
    const cleanName = (cert.profiles?.name || 'User').replace(/[^a-zA-Z0-9]/g, '-');
    await downloadSvgAsImage('battle-certificate-svg', {
      filename: `Coding-Battle-Certificate-${cleanName}`,
      format: 'jpeg',
      width: 1920,
      height: 1080,
    });
  };

  const cleanRecipientName = cert.profiles?.name || 'John Doe';
  const issueDateStr = new Date(cert.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const isBattle = Boolean(cert.coding_battles);
  const isSheet = Boolean(cert.coding_sheets);
  const resourceTitle = isBattle 
    ? (cert.coding_battles as any)?.title 
    : isSheet 
    ? (cert.coding_sheets as any)?.title 
    : (cert.courses as any)?.title;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1080px', margin: '0 auto', paddingBottom: '32px' }}>
      
      {/* 30-Minute sharing timer header */}
      {isPublicShare && shareExpiresAt && (
        <div style={{
          background: 'rgba(250, 204, 21, 0.08)',
          border: '1px solid rgba(250, 204, 21, 0.3)',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#facc15' }}>
            <Award className="animate-pulse" size={16} /> Temporary public link view (Read Only)
          </div>
          <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', gap: '6px', alignItems: 'center' }}>
            Link expires in: <strong style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '15px' }}>{timeRemaining || 'Loading...'}</strong>
          </div>
        </div>
      )}

      {/* Main Grid: Certificate on top/left, signature customizer on right/bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: isPublicShare ? '1fr' : '1fr 340px', gap: '24px', alignItems: 'start', flexWrap: 'wrap' }} className="cert-renderer-grid">
        
        {/* Left Side: The SVG Certificate view */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          <div style={{
            background: '#040711',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            aspectRatio: '16/9',
            overflow: 'hidden',
            width: '100%',
          }}>
            <svg
              id="battle-certificate-svg"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 960 540"
              width="100%"
              height="100%"
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                borderRadius: '8px',
              }}
            >
              {/* Background gradient */}
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
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Certificate Base */}
              <rect width="960" height="540" fill="url(#bgGrad)" />
              
              {/* Circuit Grid pattern */}
              <g opacity="0.04" stroke="#ffffff" strokeWidth="1">
                <path d="M0,60 H960 M0,120 H960 M0,180 H960 M0,240 H960 M0,300 H960 M0,360 H960 M0,420 H960 M0,480 H960" />
                <path d="M120,0 V540 M240,0 V540 M360,0 V540 M480,0 V540 M600,0 V540 M720,0 V540 M840,0 V540" />
              </g>

              {/* Circuits Accent lines */}
              <path d="M 50,50 L 150,50 L 200,100 M 910,490 L 810,490 L 760,440" stroke="#00f0ff" strokeWidth="1.5" fill="none" opacity="0.3" />
              <path d="M 50,490 L 150,490 L 200,440 M 910,50 L 810,50 L 760,100" stroke="#7f00ff" strokeWidth="1.5" fill="none" opacity="0.3" />

              {/* Premium Neon Border */}
              <rect x="20" y="20" width="920" height="500" rx="12" fill="none" stroke="url(#cyanPurpleGrad)" strokeWidth="2.5" />
              <rect x="25" y="25" width="910" height="490" rx="10" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />

              {/* Left Shield Badge */}
              <g transform="translate(60, 65)">
                <circle cx="45" cy="45" r="40" fill="rgba(6, 182, 212, 0.1)" stroke="#00f0ff" strokeWidth="1.5" filter="url(#glow)" />
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
                <text x="0" y="0" textAnchor="middle" fill="#ffffff" fontSize="24" fontWeight="900" letterSpacing="4">{(organizerName || 'CODING ARENA').toUpperCase()}</text>
                <text x="0" y="16" textAnchor="middle" fill="#00f0ff" fontSize="9" fontWeight="700" letterSpacing="2">CODE. SOLVE. CONQUER.</text>
              </g>
              
              <text x="900" y="55" textAnchor="end" fill="#64748b" fontSize="10" fontWeight="700" fontFamily="monospace">
                Certificate ID: {cert.certificate_code || cert.id.substring(0, 18).toUpperCase()}
              </text>

              {/* Header Text */}
              <text x="480" y="160" textAnchor="middle" fill="url(#cyanPurpleGrad)" fontSize="32" fontWeight="800" letterSpacing="3">CERTIFICATE OF ACHIEVEMENT</text>
              <text x="480" y="200" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="500">This is proudly presented to</text>

              {/* Recipient Name */}
              <text x="480" y="255" textAnchor="middle" fill="#ffffff" fontSize="38" fontWeight="800" letterSpacing="0.5">{cleanRecipientName}</text>
              <line x1="320" y1="270" x2="640" y2="270" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

              {/* Certification Statement */}
              <text x="480" y="300" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="500">
                {isBattle 
                  ? `has successfully participated in the Coding Battle "${resourceTitle}"` 
                  : isSheet
                  ? `has successfully completed all problem challenges in Coding Sheet "${resourceTitle}"`
                  : `has successfully completed the Course "${resourceTitle}"`}
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
                  <text x="65" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">{issueDateStr}</text>
                </g>
                {/* Score */}
                <g transform="translate(150, 0)">
                  <rect width="130" height="42" rx="6" fill="rgba(6, 182, 212, 0.05)" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="1" />
                  <text x="65" y="16" textAnchor="middle" fill="#00f0ff" fontSize="8" fontWeight="700" letterSpacing="0.5">SCORE</text>
                  <text x="65" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">{cert.xp_earned} PTS</text>
                </g>
                {/* Rank */}
                <g transform="translate(300, 0)">
                  <rect width="130" height="42" rx="6" fill="rgba(251, 191, 36, 0.05)" stroke="rgba(251, 191, 36, 0.2)" strokeWidth="1" />
                  <text x="65" y="16" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="700" letterSpacing="0.5">RANK</text>
                  <text x="65" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">#{cert.course_rank}</text>
                </g>
                {/* Solved */}
                <g transform="translate(450, 0)">
                  <rect width="130" height="42" rx="6" fill="rgba(34, 197, 94, 0.05)" stroke="rgba(34, 197, 94, 0.2)" strokeWidth="1" />
                  <text x="65" y="16" textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="700" letterSpacing="0.5">SOLVED PROBLEMS</text>
                  <text x="65" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">{cert.tasks_completed} / {cert.total_tasks}</text>
                </g>
              </g>

              {/* Signatures & Seal */}
              <g transform="translate(80, 420)">
                {/* Left signature: default BCE signature */}
                <g transform="translate(40, 20)">
                  {/* Styled cursive-like signature name */}
                  <text x="0" y="-12" fill="#38bdf8" fontSize="20" fontWeight="400" fontFamily="cursive, serif" fontStyle="italic">BCE Authority</text>
                  <line x1="0" y1="0" x2="160" y2="0" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <text x="0" y="15" fill="#f8fafc" fontSize="9" fontWeight="700" letterSpacing="0.5">BCE COORDINATOR</text>
                  <text x="0" y="26" fill="#64748b" fontSize="8" fontWeight="600">Smart Learning App</text>
                </g>

                {/* Center Seal badge */}
                <g transform="translate(365, -15)">
                  <polygon points="40,0 48,15 65,15 52,26 57,43 40,33 23,43 28,26 15,15 32,15" fill="#d97706" stroke="#fbbf24" strokeWidth="1" />
                  <circle cx="40" cy="20" r="18" fill="url(#goldGrad)" stroke="#fbbf24" strokeWidth="1.5" filter="url(#glow)" />
                  <text x="40" y="24" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="monospace">&lt;&gt;</text>
                </g>

                {/* Right signature: Custom/Drawn Signature */}
                <g transform="translate(560, 20)">
                  {signatureType === 'default' && (
                    <text x="0" y="-12" fill="#e2e8f0" fontSize="18" fontWeight="400" fontFamily="cursive, serif" fontStyle="italic">{signatureName}</text>
                  )}
                  {signatureType !== 'default' && signatureImage && (
                    <image href={signatureImage} x="0" y="-35" width="120" height="35" preserveAspectRatio="xMidYMid meet" />
                  )}
                  {!signatureImage && signatureType !== 'default' && (
                    <text x="0" y="-12" fill="#64748b" fontSize="10" fontStyle="italic">[No signature saved]</text>
                  )}
                  
                  <line x1="0" y1="0" x2="160" y2="0" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                  <text x="0" y="15" fill="#f8fafc" fontSize="9" fontWeight="700" letterSpacing="0.5">{signatureName.toUpperCase()}</text>
                  <text x="0" y="26" fill="#64748b" fontSize="8" fontWeight="600">{signatureDesignation}</text>
                </g>
              </g>

              {/* Real verification footer link */}
              <text x="480" y="515" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">
                Verify this credential authentically at: {typeof window !== 'undefined' ? window.location.origin : ''}/verify/certificate/{cert.id}
              </text>
            </svg>
          </div>

          {/* Interactive 3-Option Download Dropdown */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
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
                    top: 'calc(100% + 8px)',
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
          </div>
        </div>

        {/* Right Side: The Signature & Branding controls panel (only shown if not in public share mode) */}
        {!isPublicShare && (
          <div style={{
            background: 'rgba(15,23,42,0.4)',
            border: '1px solid var(--glass-border)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }} className="text-gradient">
              Institution & Signature Setup
            </h3>

            {/* Organizer Name input */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Organizer / Institution Name</label>
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. BCE Code Arena"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Organizer Logo Upload */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Organizer Logo (PNG, JPG, SVG)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {organizerLogo && (
                  <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#040711', border: '1px solid var(--glass-border)', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={organizerLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={handleUploadLogo}
                  style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                />
              </div>
            </div>

            {/* Type selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { value: 'default' as const, label: 'Default Signature', desc: 'Standard printed developer details.' },
                { value: 'upload' as const, label: 'Upload Signature Image', desc: 'Upload file (PNG, JPG, SVG).' },
                { value: 'draw' as const, label: 'Draw Signature', desc: 'Draw custom signature here.' },
              ].map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: signatureType === opt.value ? '1px solid rgba(6,182,212,0.3)' : '1px solid transparent',
                    background: signatureType === opt.value ? 'rgba(6,182,212,0.05)' : 'rgba(255,255,255,0.01)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="signature_type"
                    value={opt.value}
                    checked={signatureType === opt.value}
                    onChange={() => {
                      setSignatureType(opt.value);
                      if (opt.value === 'default') {
                        setSignatureImage(null);
                      }
                    }}
                    style={{ marginTop: '2px', accentColor: 'var(--neon-cyan)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{opt.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Name input */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Signer Name</label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Designation input */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Designation</label>
              <input
                type="text"
                value={signatureDesignation}
                onChange={(e) => setSignatureDesignation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Upload form */}
            {signatureType === 'upload' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Upload</label>
                <div style={{
                  border: '1px dashed var(--glass-border)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.1)',
                  position: 'relative',
                  cursor: 'pointer'
                }}>
                  <ImageIcon size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Click to upload file (Max 2MB)</div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={handleUploadImage}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Canvas Drawing form */}
            {signatureType === 'draw' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signature Pad</label>
                <canvas
                  ref={drawingCanvasRef}
                  width={300}
                  height={120}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{
                    background: '#040711',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    cursor: 'crosshair',
                    width: '100%',
                    height: '120px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button type="button" size="sm" variant="secondary" onClick={clearCanvas} style={{ flex: 1 }}>Clear</Button>
                  <Button type="button" size="sm" onClick={saveDrawnSignature} style={{ flex: 1 }}>Apply Stroke</Button>
                </div>
              </div>
            )}

            {/* Signature preview display */}
            {signatureImage && (
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Current Signature Image</label>
                <div style={{
                  background: '#040711',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  height: '60px'
                }}>
                  <img src={signatureImage} alt="Signature Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  <button
                    type="button"
                    onClick={() => setSignatureImage(null)}
                    style={{
                      position: 'absolute', top: '4px', right: '4px',
                      background: 'rgba(239,68,68,0.2)', border: 'none',
                      borderRadius: '50%', width: '18px', height: '18px',
                      color: '#ef4444', cursor: 'pointer', display: 'grid', placeItems: 'center',
                      fontSize: '10px'
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Status and Save button */}
            {message && (
              <div style={{ fontSize: '12px', color: message.includes('success') ? '#4ade80' : '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} /> {message}
              </div>
            )}

            <Button
              type="button"
              onClick={handleSaveSignatureSettings}
              isLoading={saving}
              style={{
                width: '100%',
                fontWeight: 700,
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              <Save size={15} /> Save Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
