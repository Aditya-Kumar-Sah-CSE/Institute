'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, BookOpen, Layers, Star } from 'lucide-react';
import { getPreviewCourses } from './LandingPreviewActions';

export default function LandingCourseClient({ 
  initialCourses, 
  categories 
}: { 
  initialCourses: any[], 
  categories: string[] 
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialCourses.length === 6);
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
  
  // Mount sync effect
  React.useEffect(() => {
    isMounted.current = true;
    handleScroll(); // Sync active state based on any browser-restored scroll position AFTER hydration
  }, []);
  
  const loadMore = useCallback(async (currentPage: number, currentCategory: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const nextPage = currentPage + 1;
      const { data } = await getPreviewCourses(nextPage, 6, currentCategory);
      if (data && data.length > 0) {
        setCourses(prev => {
          const newCourses = data.filter((d: any) => !prev.some(p => p.id === d.id));
          return [...prev, ...newCourses];
        });
        setPage(nextPage);
        if (data.length < 6) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more courses:', error);
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
        loadMore(page, activeCategory);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [hasMore, page, activeCategory, loadMore]);

  const [isSwapping, setIsSwapping] = useState(false);

  const handleCategoryChange = async (cat: string) => {
    if (cat === activeCategory) return;
    setActiveCategory(cat);
    setIsSwapping(true);
    setLoading(true);
    setPage(0);
    setActiveIndex(0);
    const { data } = await getPreviewCourses(0, 6, cat);
    setCourses(data || []);
    setHasMore(data && data.length === 6);
    setLoading(false);
    // Small delay for fade-in animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsSwapping(false));
    });
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const handleScroll = useCallback(() => {
    if (!isMounted.current || !carouselRef.current || courses.length === 0) return;
    const container = carouselRef.current;
    if (container.scrollLeft <= 10) {
      if (activeIndex !== 0) setActiveIndex(0);
      return;
    }
    const firstChild = container.children[0] as HTMLElement;
    const secondChild = container.children[1] as HTMLElement;
    if (!firstChild) return;
    
    const cardWidthExact = secondChild ? (secondChild.offsetLeft - firstChild.offsetLeft) : (firstChild.offsetWidth + 16);
    if (cardWidthExact <= 0) return;

    const calculatedIndex = Math.round(container.scrollLeft / cardWidthExact);
    const clampedIndex = Math.max(0, Math.min(courses.length - 1, calculatedIndex));
    if (clampedIndex !== activeIndex && !isNaN(clampedIndex)) {
      setActiveIndex(clampedIndex);
    }
  }, [courses.length, activeIndex]);

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

  const allTabs = ['All Categories', ...categories];

  return (
    <>
      <div className="category-tabs-container">
        {allTabs.map(cat => (
          <button 
            key={cat} 
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {(!courses || courses.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-default)', maxWidth: '600px', margin: '0 auto' }}>
           <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
           <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}>No courses available in this category yet.</h3>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Try selecting a different category or check back later.</p>
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
            style={{ 
              opacity: isSwapping ? 0 : 1, 
              transform: isSwapping ? 'translateY(12px)' : 'translateY(0)',
              transition: 'opacity 0.35s ease, transform 0.35s ease'
            }}
          >
            {courses.map((course, index) => {
              const isLast = index === courses.length - 1;
              const isActive = index === activeIndex;
              return (
                <div 
                  key={course.id}
                  suppressHydrationWarning
                  ref={isLast ? lastElementRef : null}
                  onMouseEnter={() => {
                     isHovered.current = true;
                     setActiveIndex(index);
                  }}
                  className={`preview-course-card coverflow-card ${isActive ? 'coverflow-active' : 'coverflow-inactive'}`}
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-default)', 
                  borderRadius: '24px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '380px',
                  maxWidth: '360px',
                  width: '100%',
                  cursor: 'default'
                }}
              >
                {/* Top Row: Category & Locked Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    color: 'var(--text-secondary)', 
                    padding: '4px 12px', 
                    borderRadius: '16px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    maxWidth: '130px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {course.difficulty || 'General'}
                  </div>
                  
                  <div style={{ 
                    background: 'rgba(239, 68, 68, 0.15)', 
                    color: '#f87171', 
                    padding: '4px 10px', 
                    borderRadius: '16px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.1)'
                  }}>
                    <Lock size={12} /> LOCKED
                  </div>
                </div>

                {/* Thumbnail / Icon Container */}
                <div style={{ 
                  width: '72px', 
                  height: '72px', 
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.1))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {course.thumbnail_url ? (
                    <Image src={course.thumbnail_url} alt={course.title} fill sizes="72px" style={{ objectFit: 'cover' }} />
                  ) : (
                    <BookOpen size={32} color="#818cf8" />
                  )}
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
                  {course.title}
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
                  {course.description || 'Curated premium course designed to boost your skills and knowledge.'}
                </p>

                {/* Modules Metadata & Rating Badge */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '20px', 
                  fontSize: '13px', 
                  color: 'var(--text-muted)',
                  fontWeight: 500
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="#818cf8" /> {course.lesson_count || 0} Modules
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <Star size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                    <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '12px' }}>
                      {course.totalReviews > 0 ? course.averageRating.toFixed(1) : 'New'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      ({course.totalReviews || 0})
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <Link href="/login" style={{ width: '100%', textDecoration: 'none' }}>
                  <div className="preview-course-btn" style={{ 
                    width: '100%', 
                    height: '44px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    background: 'rgba(99, 102, 241, 0.06)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}>
                    <Lock size={15} style={{ opacity: 0.8 }} /> Login to Access
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
        
        {courses.length > 0 && (
          <div className="carousel-pagination">
            {courses.map((_, i) => (
              <div 
                key={i} 
                className={`carousel-dot ${i === activeIndex ? 'active' : ''}`}
                onClick={() => {
                   if (!carouselRef.current) return;
                   const targetIndex = Math.max(0, Math.min(courses.length - 1, i));
                   if (targetIndex === 0) {
                     carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                   } else {
                     const firstChild = carouselRef.current.children[0] as HTMLElement;
                     const secondChild = carouselRef.current.children[1] as HTMLElement;
                     const cardWidth = secondChild ? (secondChild.offsetLeft - firstChild.offsetLeft) : (firstChild.offsetWidth + 16);
                     carouselRef.current.scrollTo({ left: targetIndex * cardWidth, behavior: 'smooth' });
                   }
                   setActiveIndex(targetIndex);
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
