'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Lock, Code, Shield, FolderGit2 } from 'lucide-react';
import { getPreviewDSASheets } from './LandingPreviewActions';

export default function LandingDSAClient({ 
  initialSheets 
}: { 
  initialSheets: any[] 
}) {
  const [sheets, setSheets] = useState(initialSheets);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialSheets.length === 6);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  
  // Drag states
  const isDragging = useRef(false);
  const isHovered = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);
  const isMounted = useRef(false);
  
  // Auto-scroll effect
  React.useEffect(() => {
    let animationFrameId: number;
    let accumulatedScroll = 0;
    
    const scroll = () => {
      if (!isDragging.current && !isHovered.current && carouselRef.current) {
        accumulatedScroll += 0.5; // Adjust speed (pixels per frame)
        if (accumulatedScroll >= 1) {
          carouselRef.current.scrollLeft += Math.floor(accumulatedScroll);
          accumulatedScroll -= Math.floor(accumulatedScroll);
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };
    
    animationFrameId = requestAnimationFrame(scroll);
    isMounted.current = true;
    handleScroll(); // Sync active state based on any browser-restored scroll position AFTER hydration
    
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
  
  const loadMore = useCallback(async (currentPage: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const nextPage = currentPage + 1;
      const { data } = await getPreviewDSASheets(nextPage, 6);
      if (data && data.length > 0) {
        setSheets(prev => {
          const newSheets = data.filter((d: any) => !prev.some(p => p.id === d.id));
          return [...prev, ...newSheets];
        });
        setPage(nextPage);
        if (data.length < 6) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more DSA sheets:', error);
      setHasMore(false);
    }
    
    setLoading(false);
    loadingRef.current = false;
  }, []);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
        loadMore(page);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [hasMore, page, loadMore]);

  const handleScroll = () => {
    if (!isMounted.current) return;
    if (!carouselRef.current || sheets.length === 0) return;
    const firstChild = carouselRef.current.children[0] as HTMLElement;
    const secondChild = carouselRef.current.children[1] as HTMLElement;
    if (!firstChild) return;
    
    const cardWidthExact = secondChild ? (secondChild.offsetLeft - firstChild.offsetLeft) : firstChild.offsetWidth;
    const maxScroll = cardWidthExact * sheets.length;
    
    // Infinite loop check
    if (carouselRef.current.scrollLeft >= maxScroll) {
      carouselRef.current.scrollLeft -= maxScroll;
      if (isDragging.current) scrollLeftRef.current -= maxScroll;
    } else if (carouselRef.current.scrollLeft <= 0 && isDragging.current) {
      carouselRef.current.scrollLeft += maxScroll;
      if (isDragging.current) scrollLeftRef.current += maxScroll;
    }
    
    const newIndex = Math.round(carouselRef.current.scrollLeft / cardWidthExact) % sheets.length;
    if (newIndex !== activeIndex && newIndex >= 0 && !isNaN(newIndex)) {
      setActiveIndex(newIndex);
    }
  };

  // Mouse drag handlers for desktop/tablet
  const onMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeftRef.current = carouselRef.current.scrollLeft;
  };
  const onMouseLeave = () => { isDragging.current = false; };
  const onMouseUp = () => { isDragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; 
    carouselRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  return (
    <>
      {(!sheets || sheets.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '600px', margin: '0 auto' }}>
           <Code size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
           <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}>Practice sets are being prepared.</h3>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>New DSA sheets will appear here soon.</p>
        </div>
      ) : (
        <>
          <div 
            className="preview-grid mobile-carousel"
            ref={carouselRef}
            onScroll={handleScroll}
            onMouseDown={onMouseDown}
            onMouseLeave={(e) => {
               onMouseLeave();
               isHovered.current = false;
            }}
            onMouseUp={onMouseUp}
            onMouseMove={onMouseMove}
            onMouseEnter={() => isHovered.current = true}
            onTouchStart={() => isHovered.current = true}
            onTouchEnd={() => isHovered.current = false}
          >
            {[...sheets, ...sheets].map((sheet, index) => {
              const originalIndex = index % sheets.length;
              const problemsCount = sheet.coding_sheet_problems?.length || 0;
              const isLast = index === (sheets.length * 2) - 1;
              const isActive = originalIndex === activeIndex;
              return (
                <div 
                  key={`${sheet.id}-${index}`}
                  ref={isLast ? lastElementRef : null}
                  onMouseEnter={() => {
                     isHovered.current = true;
                     setActiveIndex(originalIndex);
                  }}
                  className={`preview-dsa-card coverflow-card ${isActive ? 'coverflow-active' : 'coverflow-inactive'}`}
                style={{ 
                  background: 'var(--bg-surface)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '24px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '410px',
                  maxWidth: '320px',
                  width: '100%',
                  margin: '0 auto',
                  cursor: 'default'
                }}
              >
                {/* Top Row: Icon and Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div 
                    className="dsa-icon-box"
                    style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '16px', 
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.1))', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#06b6d4',
                      transition: 'filter 0.25s ease'
                    }}>
                    <FolderGit2 size={28} />
                  </div>

                  {sheet.enrollment_access && sheet.enrollment_access !== 'public' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.75rem', fontWeight: 700,
                      padding: '4px 10px', borderRadius: '16px',
                      color: sheet.enrollment_access === 'restricted' ? '#fbbf24' : '#f87171',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: sheet.enrollment_access === 'restricted' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(248,113,113,0.3)'
                    }}>
                      {sheet.enrollment_access === 'restricted' ? <Shield size={12} /> : <Lock size={12} />}
                      {sheet.enrollment_access === 'restricted' ? 'PASSCODE' : 'PRIVATE'}
                    </div>
                  )}
                </div>

                {/* Text Content */}
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: 700, 
                  marginBottom: '8px', 
                  color: '#ffffff', 
                  lineHeight: 1.3,
                  display: '-webkit-box', 
                  WebkitLineClamp: 2, 
                  WebkitBoxOrient: 'vertical', 
                  overflow: 'hidden',
                  overflowWrap: 'break-word'
                }}>
                  {sheet.title}
                </h3>
                
                <p style={{ 
                  color: '#94a3b8', 
                  fontSize: '14px',
                  lineHeight: 1.5,
                  marginBottom: '20px', 
                  flex: 1, 
                  display: '-webkit-box', 
                  WebkitLineClamp: 3, 
                  WebkitBoxOrient: 'vertical', 
                  overflow: 'hidden',
                  overflowWrap: 'break-word'
                }}>
                  {sheet.description || 'Curated programming questions to level up your logic building.'}
                </p>

                {/* Problem Count Box */}
                <div style={{ 
                  width: '100%',
                  height: '60px',
                  background: 'rgba(6, 182, 212, 0.08)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                  border: '1px solid rgba(6, 182, 212, 0.15)'
                }}>
                  <Code size={18} color="#06b6d4" />
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{problemsCount}</span>
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>Problems</span>
                </div>

                {/* CTA Button */}
                <Link href="/login" style={{ width: '100%', textDecoration: 'none' }}>
                  <div className="preview-dsa-btn" style={{ 
                    width: '100%', 
                    height: '48px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    background: 'transparent',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}>
                    <Lock size={15} style={{ opacity: 0.8 }} /> Login to Practice
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {sheets.length > 0 && (
          <div className="carousel-pagination">
            {sheets.map((_, i) => (
              <div 
                key={i} 
                className={`carousel-dot ${i === activeIndex ? 'active' : ''}`}
                onClick={() => {
                   if (!carouselRef.current) return;
                   const firstChild = carouselRef.current.children[0] as HTMLElement;
                   const secondChild = carouselRef.current.children[1] as HTMLElement;
                   const cardWidth = secondChild ? (secondChild.offsetLeft - firstChild.offsetLeft) : firstChild.offsetWidth;
                   carouselRef.current.scrollTo({ left: i * cardWidth, behavior: 'smooth' });
                   setActiveIndex(i);
                }}
              />
            ))}
          </div>
        )}
      </>
      )}
    </>
  );
}
