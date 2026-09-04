'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, Maximize2, Loader2, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface GalleryItem {
  id: string;
  image_url: string;
  title: string;
  description?: string;
  sort_order: number;
}

function FormattedColorfulText({ 
  text, 
  isExpanded, 
  onToggleExpand, 
  alwaysFull = false 
}: { 
  text: string; 
  isExpanded: boolean; 
  onToggleExpand: () => void;
  alwaysFull?: boolean;
}) {
  if (!text) return null;

  const words = text.trim().split(/\s+/);
  const totalWords = words.length;
  const isLong = totalWords > 30;

  let textToDisplay = text;
  if (isLong && !isExpanded && !alwaysFull) {
    textToDisplay = words.slice(0, 30).join(' ') + '...';
  }

  // Split text by newlines to preserve user formatting & paragraphs
  const paragraphs = textToDisplay
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const palette = [
    { bg: 'rgba(99, 102, 241, 0.08)', border: '#6366f1' },   // Indigo
    { bg: 'rgba(6, 182, 212, 0.08)', border: '#06b6d4' },    // Cyan
    { bg: 'rgba(168, 85, 247, 0.08)', border: '#a855f7' },   // Purple
    { bg: 'rgba(16, 185, 129, 0.08)', border: '#10b981' },   // Emerald
    { bg: 'rgba(244, 63, 94, 0.08)', border: '#f43f5e' },    // Rose
    { bg: 'rgba(245, 158, 11, 0.08)', border: '#f59e0b' }    // Amber
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.6rem', width: '100%', boxSizing: 'border-box' }}>
      {paragraphs.map((paragraph, index) => {
        const theme = palette[index % palette.length];
        return (
          <div
            key={index}
            style={{
              background: theme.bg,
              borderLeft: `3px solid ${theme.border}`,
              padding: '0.6rem 0.85rem',
              borderRadius: '0 8px 8px 0',
              fontSize: '0.88rem',
              lineHeight: '1.55',
              color: 'var(--text-secondary, #cbd5e1)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease'
            }}
          >
            {paragraph}
          </div>
        );
      })}

      {isLong && !alwaysFull && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          style={{
            alignSelf: 'flex-start',
            marginTop: '0.35rem',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '20px',
            color: 'var(--human-primary, #818cf8)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.2s ease'
          }}
          title={isExpanded ? 'Collapse description' : 'Expand full description'}
        >
          {isExpanded ? (
            <>Read less <ChevronUp size={14} /></>
          ) : (
            <>Read more ({totalWords} words) <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}

export default function GallerySection({ items }: { items: GalleryItem[] }) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isModalLoading, setIsModalLoading] = useState<boolean>(true);
  const [cardImageLoaded, setCardImageLoaded] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollTrack = (direction: 'left' | 'right') => {
    if (trackRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      trackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleOpenPreview = (index: number) => {
    setPreviewIndex(index);
    setIsModalLoading(true);
  };

  const handlePrevPreview = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (previewIndex === null || items.length === 0) return;
    setIsModalLoading(true);
    setPreviewIndex((prev) => (prev !== null ? (prev - 1 + items.length) % items.length : null));
  }, [previewIndex, items.length]);

  const handleNextPreview = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (previewIndex === null || items.length === 0) return;
    setIsModalLoading(true);
    setPreviewIndex((prev) => (prev !== null ? (prev + 1) % items.length : null));
  }, [previewIndex, items.length]);

  // Keyboard navigation & ESC key handler
  useEffect(() => {
    if (previewIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewIndex(null);
      } else if (e.key === 'ArrowLeft') {
        handlePrevPreview();
      } else if (e.key === 'ArrowRight') {
        handleNextPreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, handlePrevPreview, handleNextPreview]);

  // Preload adjacent preview images for instant navigation
  useEffect(() => {
    if (previewIndex === null || items.length === 0) return;
    const nextIndex = (previewIndex + 1) % items.length;
    const prevIndex = (previewIndex - 1 + items.length) % items.length;

    const preloadImages = [items[nextIndex]?.image_url, items[prevIndex]?.image_url];
    preloadImages.forEach((url) => {
      if (url) {
        const img = new window.Image();
        img.src = url;
      }
    });
  }, [previewIndex, items]);

  if (!items || items.length === 0) return null;

  const activeItem = previewIndex !== null ? items[previewIndex] : null;

  return (
    <section className="gallery-section">
      <div 
        ref={trackRef}
        className="why-gallery-track" 
        style={{ 
          display: 'flex', 
          gap: '2rem', 
          overflowX: 'auto', 
          padding: '1rem', 
          scrollSnapType: 'x mandatory', 
          WebkitOverflowScrolling: 'touch', 
          scrollbarWidth: 'none' 
        }}
      >
        {items.map((item, idx) => {
          const isRemote = !!(item.image_url && (item.image_url.startsWith('http://') || item.image_url.startsWith('https://')));
          const isLoaded = cardImageLoaded[item.id];
          const isExpanded = !!expandedCards[item.id];

          return (
            <div key={item.id} className="gallery-card why-huge-card" style={{ scrollSnapAlign: 'start' }}>
              <div 
                className="gallery-card-img" 
                onClick={() => handleOpenPreview(idx)} 
                style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', background: '#1e293b' }}
                title="Click to view full image preview"
              >
                {/* Skeleton shimmer loader while card image is loading */}
                {!isLoaded && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      zIndex: 1, 
                      background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite'
                    }} 
                  />
                )}

                <Image
                  src={item.image_url}
                  alt={item.title}
                  width={600}
                  height={400}
                  sizes="(max-width: 768px) 100vw, 400px"
                  unoptimized={isRemote}
                  onLoad={() => setCardImageLoaded((prev) => ({ ...prev, [item.id]: true }))}
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    objectFit: 'cover',
                    opacity: isLoaded ? 1 : 0,
                    transition: 'opacity 0.4s ease, transform 0.4s ease'
                  }}
                />

                {/* Hover overlay hint */}
                <div 
                  className="gallery-card-hover-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    opacity: 0,
                    transition: 'opacity 0.25s ease',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                >
                  <Maximize2 size={20} />
                  <span>Preview</span>
                </div>
              </div>
              <div className="gallery-card-info">
                <h3>{item.title}</h3>
                {item.description && (
                  <FormattedColorfulText 
                    text={item.description}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandedCards((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button onClick={() => scrollTrack('left')} className="slider-nav-btn" aria-label="Scroll left">
          <ChevronLeft size={24} />
        </button>
        <button onClick={() => scrollTrack('right')} className="slider-nav-btn" aria-label="Scroll right">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Fullscreen Image Preview Modal with Optimized Loading & Rich Format */}
      {activeItem && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: 'rgba(5, 7, 15, 0.94)', 
            zIndex: 99999, 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'space-between', 
            alignItems: 'center', 
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setPreviewIndex(null)}
        >
          {/* Top Bar Header with Full-Width Rich Colorful Text */}
          <div 
            className="gallery-modal-header"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gallery-modal-top-row">
              <h3 className="gallery-modal-title">{activeItem.title}</h3>

              <div className="gallery-modal-header-top-controls">
                <span className="gallery-modal-counter">
                  {previewIndex! + 1} / {items.length}
                </span>
                
                <a 
                  href={activeItem.image_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  download
                  className="gallery-modal-action-btn"
                  title="Open/Download original image"
                >
                  <Download size={18} />
                </a>

                <button 
                  className="gallery-modal-action-btn"
                  onClick={() => setPreviewIndex(null)}
                  aria-label="Close image preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {activeItem.description && (
              <div className="gallery-modal-text-content">
                <FormattedColorfulText 
                  text={activeItem.description} 
                  isExpanded={true} 
                  onToggleExpand={() => {}} 
                  alwaysFull
                />
              </div>
            )}
          </div>

          {/* Main Image Container */}
          <div 
            style={{ 
              position: 'relative', 
              width: '92vw', 
              height: 'calc(75vh - 60px)', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nav Arrow Previous */}
            {items.length > 1 && (
              <button 
                onClick={handlePrevPreview}
                style={{ 
                  position: 'absolute', 
                  left: '1rem', 
                  zIndex: 20, 
                  background: 'rgba(0,0,0,0.6)', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  color: '#fff', 
                  borderRadius: '50%', 
                  width: '48px', 
                  height: '48px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  transition: 'transform 0.2s, background 0.2s'
                }}
                aria-label="Previous image"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Blurred Thumbnail Placeholder while loading full high-res preview */}
            {isModalLoading && (
              <div 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  zIndex: 5
                }}
              >
                <img 
                  src={activeItem.image_url} 
                  alt="Loading placeholder" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%', 
                    objectFit: 'contain', 
                    filter: 'blur(20px)', 
                    opacity: 0.5,
                    transform: 'scale(0.98)'
                  }} 
                />
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: 'rgba(15, 23, 42, 0.75)', padding: '16px 28px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: 'var(--human-primary, #6366f1)' }} />
                  <span style={{ color: '#e2e8f0', fontSize: '0.95rem', fontWeight: 500 }}>Loading Preview...</span>
                </div>
              </div>
            )}

            {/* High-res Main Image */}
            <Image 
              src={activeItem.image_url}
              alt={activeItem.title}
              width={1600}
              height={1000}
              sizes="100vw"
              priority
              unoptimized={activeItem.image_url.startsWith('http://') || activeItem.image_url.startsWith('https://')}
              onLoad={() => setIsModalLoading(false)}
              style={{ 
                objectFit: 'contain', 
                maxWidth: '100%', 
                maxHeight: '100%', 
                borderRadius: '12px', 
                boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
                opacity: isModalLoading ? 0 : 1,
                transform: isModalLoading ? 'scale(0.97)' : 'scale(1)',
                transition: 'opacity 0.3s ease, transform 0.3s ease'
              }}
            />

            {/* Nav Arrow Next */}
            {items.length > 1 && (
              <button 
                onClick={handleNextPreview}
                style={{ 
                  position: 'absolute', 
                  right: '1rem', 
                  zIndex: 20, 
                  background: 'rgba(0,0,0,0.6)', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  color: '#fff', 
                  borderRadius: '50%', 
                  width: '48px', 
                  height: '48px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  transition: 'transform 0.2s, background 0.2s'
                }}
                aria-label="Next image"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>

          {/* Bottom indicator hint */}
          <div style={{ paddingBottom: '1rem', color: '#64748b', fontSize: '0.8rem' }}>
            Use ← → arrow keys to navigate • Esc to close
          </div>
        </div>
      )}
    </section>
  );
}




