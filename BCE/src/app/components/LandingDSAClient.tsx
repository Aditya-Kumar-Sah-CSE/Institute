'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Lock, Code, Shield, FolderGit2, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPreviewDSASheets } from './LandingPreviewActions';

export default function LandingDSAClient({ 
  initialSheets 
}: { 
  initialSheets: any[] 
}) {
  const [sheets, setSheets] = useState(initialSheets);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialSheets.length === 100);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  
  // Drag states
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);
  const isMounted = useRef(false);

  // Scroll to target card index smoothly
  const scrollToCard = useCallback((targetIndex: number) => {
    if (!carouselRef.current || sheets.length === 0) return;
    const container = carouselRef.current;
    const clampedIndex = Math.max(0, Math.min(sheets.length - 1, targetIndex));
    const children = Array.from(container.children) as HTMLElement[];
    if (children[clampedIndex]) {
      const targetCard = children[clampedIndex];
      const scrollPosition = targetCard.offsetLeft - (container.offsetWidth - targetCard.offsetWidth) / 2;
      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
      setActiveIndex(clampedIndex);
    }
  }, [sheets.length]);
  
  // Handle scroll active index calculation
  const handleScroll = useCallback(() => {
    if (!isMounted.current || !carouselRef.current || sheets.length === 0) return;
    const container = carouselRef.current;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const containerCenter = container.scrollLeft + container.offsetWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    children.forEach((child, idx) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  }, [sheets.length, activeIndex]);

  // Mount sync effect — force initial scroll position to 0 and sync active state
  React.useEffect(() => {
    isMounted.current = true;
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = 0;
    }
    setActiveIndex(0);
    handleScroll();
  }, [handleScroll]);

  const loadMore = useCallback(async (currentPage: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const nextPage = currentPage + 1;
      const { data } = await getPreviewDSASheets(nextPage, 100);
      if (data && data.length > 0) {
        setSheets(prev => {
          const newSheets = data.filter((d: any) => !prev.some(p => p.id === d.id));
          return [...prev, ...newSheets];
        });
        setPage(nextPage);
        if (data.length < 100) setHasMore(false);
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
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-default)', maxWidth: '600px', margin: '0 auto' }}>
           <Code size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
           <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}>Practice sets are being prepared.</h3>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>New DSA sheets will appear here soon.</p>
        </div>
      ) : (
        <>
          <div className="card-slider-wrapper" style={{ position: 'relative', width: '100%' }}>
            {sheets.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => scrollToCard(activeIndex - 1)}
                  disabled={activeIndex <= 0}
                  aria-label="Previous Sheet"
                  className="card-swap-btn card-swap-btn-left"
                >
                  <ChevronLeft size={22} />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToCard(activeIndex + 1)}
                  disabled={activeIndex >= sheets.length - 1}
                  aria-label="Next Sheet"
                  className="card-swap-btn card-swap-btn-right"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <div 
              className="preview-grid mobile-carousel"
              ref={carouselRef}
              onScroll={handleScroll}
              onMouseDown={onMouseDown}
              onMouseLeave={onMouseLeave}
              onMouseUp={onMouseUp}
              onMouseMove={onMouseMove}
            >
            {sheets.map((sheet, index) => {
              const problemsCount = sheet.coding_sheet_problems?.length || 0;
              const isLast = index === sheets.length - 1;
              const isActive = index === activeIndex;
              return (
                <div 
                  key={sheet.id}
                  suppressHydrationWarning
                  ref={isLast ? lastElementRef : null}
                  onMouseEnter={() => {
                     setActiveIndex(index);
                  }}
                  className={`preview-dsa-card coverflow-card ${isActive ? 'coverflow-active' : 'coverflow-inactive'}`}
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-default)', 
                  borderRadius: '24px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '370px',
                  maxWidth: '350px',
                  width: '100%',
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

                  <div className="dsa-badge-container" suppressHydrationWarning>
                    {/* Star Rating Badge */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#f59e0b',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      boxShadow: '0 0 10px rgba(245, 158, 11, 0.15)'
                    }}>
                      <Star size={12} fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))' }} />
                      <span>{sheet.averageRating > 0 ? `${sheet.averageRating} (${sheet.totalReviews})` : 'New Sheet'}</span>
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
                </div>

                {/* Text Content */}
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: 700, 
                  marginBottom: '8px', 
                  color: 'var(--text-primary)', 
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
                  color: 'var(--text-secondary)', 
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
                  height: '52px',
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
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{problemsCount}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>Problems</span>
                </div>

                {/* CTA Button */}
                <Link href="/login" style={{ width: '100%', textDecoration: 'none' }}>
                  <div className="preview-dsa-btn" style={{ 
                    width: '100%', 
                    height: '44px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    background: 'rgba(6, 182, 212, 0.06)',
                    color: 'var(--text-primary)',
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
      </div>

        {sheets.length > 0 && (
          <div className="carousel-pagination">
            {sheets.map((_, i) => (
              <div 
                key={i} 
                className={`carousel-dot ${i === activeIndex ? 'active' : ''}`}
                onClick={() => scrollToCard(i)}
              />
            ))}
          </div>
        )}
      </>
      )}
    </>
  );
}
