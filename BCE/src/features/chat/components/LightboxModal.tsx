'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Share2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxModalProps {
  mediaUrl: string | null;
  mediaType?: 'image' | 'video' | null;
  allMedia?: { url: string; type: string }[];
  onClose: () => void;
}

export default function LightboxModal({ mediaUrl, mediaType = 'image', allMedia = [], onClose }: LightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (mediaUrl && allMedia.length > 0) {
      const idx = allMedia.findIndex(m => m.url === mediaUrl);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [mediaUrl, allMedia]);

  if (!mediaUrl) return null;

  const currentItem = allMedia.length > 0 ? allMedia[currentIndex] : { url: mediaUrl, type: mediaType || 'image' };
  const isVideo = currentItem.type === 'video' || /\.(mp4|webm|mov|ogg)$/i.test(currentItem.url);

  const handleNext = () => {
    if (allMedia.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % allMedia.length);
      setZoom(1);
    }
  };

  const handlePrev = () => {
    if (allMedia.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
      setZoom(1);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentItem.url;
    a.download = currentItem.url.split('/').pop()?.split('?')[0] || 'media-download';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Shared Media', url: currentItem.url });
      } catch (err) {
        console.log(err);
      }
    } else {
      navigator.clipboard.writeText(currentItem.url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(0, 0, 0, 0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
    }}>
      {/* Top Toolbar */}
      <div style={{
        height: '60px',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        zIndex: 10,
      }}>
        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
          {allMedia.length > 1 ? `${currentIndex + 1} of ${allMedia.length}` : 'Media Viewer'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!isVideo && (
            <>
              <button 
                onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}
                title="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
              <button 
                onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.75))} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}
                title="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
            </>
          )}

          <button 
            onClick={handleDownload} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}
            title="Download"
          >
            <Download size={20} />
          </button>
          
          <button 
            onClick={handleShare} 
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}
            title="Share"
          >
            <Share2 size={20} />
          </button>

          <button 
            onClick={onClose} 
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, borderRadius: '50%' }}
            title="Close"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        overflow: 'hidden',
        padding: '20px',
      }}>
        {allMedia.length > 1 && (
          <button 
            onClick={handlePrev}
            style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {isVideo ? (
          <video 
            src={currentItem.url} 
            controls 
            autoPlay 
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }} 
          />
        ) : (
          <img 
            src={currentItem.url} 
            alt="Enlarged view" 
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '80vh', 
              objectFit: 'contain', 
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s ease-out',
              borderRadius: '8px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }} 
          />
        )}

        {allMedia.length > 1 && (
          <button 
            onClick={handleNext}
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );
}
