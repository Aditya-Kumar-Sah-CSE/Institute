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
              viewBox="0 0 1200 800"
              width="100%"
              height="100%"
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                borderRadius: '12px',
              }}
            >
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
              {(cert.organizer_logo || cert.coding_battles?.organizer_logo || organizerLogo) ? (
                <g transform="translate(60, 50)">
                  <rect x="-10" y="-10" width="180" height="70" rx="10" fill="rgba(11, 16, 33, 0.6)" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" />
                  <image href={cert.organizer_logo || cert.coding_battles?.organizer_logo || organizerLogo || ''} x="0" y="0" width="160" height="50" preserveAspectRatio="xMidYMid contain" />
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
                  ID: {cert.certificate_code || cert.id?.substring(0, 18).toUpperCase() || 'CB-2026-VERIFIED'}
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
                {cleanRecipientName}
              </text>
              <line x1="380" y1="385" x2="820" y2="385" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

              {/* Description Text */}
              <text x="600" y="420" textAnchor="middle" fill="#cbd5e1" fontSize="15" fontWeight="500">
                {isBattle 
                  ? `has successfully participated in the Coding Battle "${resourceTitle || 'Code Arena Battle'}" and demonstrated` 
                  : isSheet
                  ? `has successfully completed all problem challenges in Coding Sheet "${resourceTitle}" and demonstrated`
                  : `has successfully completed Course "${resourceTitle}" and demonstrated`}
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
                  <text x="-10" y="16" fill="#ffffff" fontSize="16" fontWeight="700">{issueDateStr}</text>
                </g>

                <line x1="-60" y1="-15" x2="-60" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                {/* 2. SCORE */}
                <g transform="translate(0, 0)">
                  <rect x="-60" y="-18" width="36" height="36" rx="8" fill="rgba(168, 85, 247, 0.1)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" />
                  <path d="M -46,-10 H -38 V -2 C -38,3 -42,6 -46,6 Z M -38,-10 V 2 C -38,6 -42,8 -46,8 M -46,8 V 14 M -50,14 H -42" stroke="#a855f7" strokeWidth="1.5" fill="none" />

                  <text x="-10" y="-4" fill="#a855f7" fontSize="11" fontWeight="700" letterSpacing="1">SCORE</text>
                  <text x="-10" y="16" fill="#ffffff" fontSize="16" fontWeight="700">{cert.xp_earned || 0}</text>
                </g>

                <line x1="120" y1="-15" x2="120" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                {/* 3. RANK */}
                <g transform="translate(180, 0)">
                  <rect x="-40" y="-18" width="36" height="36" rx="8" fill="rgba(168, 85, 247, 0.1)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" />
                  <polygon points="-22,-12 -18,-2 -8,-2 -15,4 -12,14 -22,8 -32,14 -29,4 -36,-2 -26,-2" fill="#a855f7" opacity="0.9" />

                  <text x="10" y="-4" fill="#38bdf8" fontSize="11" fontWeight="700" letterSpacing="1">RANK</text>
                  <text x="10" y="16" fill="#ffffff" fontSize="16" fontWeight="700">{cert.course_rank ? `#${cert.course_rank}` : 'Top 10%'}</text>
                </g>

                <line x1="-350" y1="45" x2="350" y2="45" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
              </g>

              {/* SIGNATURES & RANK MEDAL BADGE SECTION */}
              <g transform="translate(600, 650)">
                {/* CENTER RANK-DRIVEN MEDAL BADGE */}
                <g transform="translate(0, 0)">
                  {(cert.course_rank === 1 || cert.rank === 1) ? (
                    <>
                      <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#d97706" stroke="#92400e" strokeWidth="1" />
                      <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#d97706" stroke="#92400e" strokeWidth="1" />
                      <circle cx="0" cy="0" r="48" fill="url(#goldGrad)" stroke="#fef08a" strokeWidth="2.5" filter="url(#glow)" />
                      <circle cx="0" cy="0" r="42" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                      <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#goldGrad)" strokeWidth="2" />
                      <path d="M -16,8 L -20,-10 L -10,-2 L 0,-14 L 10,-2 L 20,-10 L 16,8 Z" fill="#fbbf24" />
                      <text x="0" y="24" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="900" letterSpacing="1">RANK #1</text>
                    </>
                  ) : (cert.course_rank === 2 || cert.rank === 2) ? (
                    <>
                      <path d="M -25,25 L -45,75 L -20,65 L 0,75 L -5,25 Z" fill="#64748b" stroke="#334155" strokeWidth="1" />
                      <path d="M 25,25 L 5,75 L 20,65 L 45,75 L 25,25 Z" fill="#64748b" stroke="#334155" strokeWidth="1" />
                      <circle cx="0" cy="0" r="48" fill="url(#silverMedalGrad)" stroke="#ffffff" strokeWidth="2.5" filter="url(#glow)" />
                      <circle cx="0" cy="0" r="42" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5,3" fill="none" />
                      <circle cx="0" cy="0" r="36" fill="#0b0f19" stroke="url(#silverMedalGrad)" strokeWidth="2" />
                      <polygon points="0,-14 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4" fill="#e2e8f0" />
                      <text x="0" y="24" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="900" letterSpacing="1">RANK #2</text>
                    </>
                  ) : (cert.course_rank === 3 || cert.rank === 3) ? (
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

                {/* INSTRUCTOR / AUTHORIZED SIGNATURE */}
                <g transform="translate(320, 0)">
                  {(cert.instructor_signature || signatureImage) ? (
                    <g transform="translate(-100, -45)">
                      <image href={cert.instructor_signature || signatureImage || ''} x="0" y="0" width="200" height="45" preserveAspectRatio="xMidYMid contain" />
                    </g>
                  ) : (
                    <text x="0" y="-20" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="400" fontFamily="'Brush Script MT', 'Dancing Script', cursive, serif" fontStyle="italic">
                      {signatureName || cert.signature_name || 'Aditya Kumar Sah'}
                    </text>
                  )}
                  <line x1="-110" y1="-5" x2="110" y2="-5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                  <text x="0" y="16" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="800" letterSpacing="1">
                    {(signatureName || cert.signature_name || 'ADITYA KUMAR SAH').toUpperCase()}
                  </text>
                  <text x="0" y="32" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
                    {signatureDesignation || cert.signature_designation || 'The Developer & The Coder'}
                  </text>
                </g>
              </g>

              {/* FOOTER VERIFICATION LINK */}
              <g transform="translate(600, 762)">
                <circle cx="-200" cy="-4" r="9" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="1" />
                <path d="M -204,-4 L -201,-1 L -195,-7" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

                <text x="-185" y="0" textAnchor="start" fill="#64748b" fontSize="12" fontWeight="600">
                  Verify certificate at: <tspan fill="#38bdf8" fontWeight="700">https://codingbattle.com/verify/certificate/{cert.certificate_code || cert.id}</tspan>
                </text>
              </g>
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
