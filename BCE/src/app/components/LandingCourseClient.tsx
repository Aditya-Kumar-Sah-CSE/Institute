'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, BookOpen, Layers } from 'lucide-react';
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
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const loadMore = useCallback(async (currentPage: number, currentCategory: string) => {
    setLoading(true);
    const nextPage = currentPage + 1;
    const { data } = await getPreviewCourses(nextPage, 6, currentCategory);
    if (data && data.length > 0) {
      setCourses(prev => [...prev, ...data]);
      setPage(nextPage);
      if (data.length < 6) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  }, []);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore(page, activeCategory);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, page, activeCategory, loadMore]);

  const handleCategoryChange = async (cat: string) => {
    if (cat === activeCategory) return;
    setActiveCategory(cat);
    setLoading(true);
    setPage(0);
    const { data } = await getPreviewCourses(0, 6, cat);
    setCourses(data || []);
    setHasMore(data && data.length === 6);
    setLoading(false);
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
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '600px', margin: '0 auto' }}>
           <BookOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
           <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}>No courses available in this category yet.</h3>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Try selecting a different category or check back later.</p>
        </div>
      ) : (
        <div className="preview-grid mobile-carousel">
          {courses.map((course, index) => {
            const isLast = index === courses.length - 1;
            return (
              <div 
                key={`${course.id}-${index}`}
                ref={isLast ? lastElementRef : null}
                className="preview-course-card"
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '24px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '430px',
                  maxWidth: '360px',
                  width: '100%',
                  margin: '0 auto',
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
                    <Image src={course.thumbnail_url} alt={course.title} fill style={{ objectFit: 'cover' }} unoptimized />
                  ) : (
                    <BookOpen size={32} color="#818cf8" />
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
                  {course.title}
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
                  {course.description || 'Curated premium course designed to boost your skills and knowledge.'}
                </p>

                {/* Modules Metadata */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  marginBottom: '20px', 
                  fontSize: '13px', 
                  color: '#64748b',
                  fontWeight: 500
                }}>
                  <Layers size={14} color="#818cf8" /> {course.lesson_count || 0} Modules
                </div>

                {/* CTA Button */}
                <Link href="/login" style={{ width: '100%', textDecoration: 'none' }}>
                  <div className="preview-course-btn" style={{ 
                    width: '100%', 
                    height: '48px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    background: 'transparent',
                    color: '#ffffff',
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
      )}
    </>
  );
}
