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
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const loadMore = useCallback(async (currentPage: number) => {
    setLoading(true);
    const nextPage = currentPage + 1;
    const { data } = await getPreviewDSASheets(nextPage, 6);
    if (data && data.length > 0) {
      setSheets(prev => [...prev, ...data]);
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
        loadMore(page);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, page, loadMore]);

  return (
    <>
      {(!sheets || sheets.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '600px', margin: '0 auto' }}>
           <Code size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
           <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}>Practice sets are being prepared.</h3>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>New DSA sheets will appear here soon.</p>
        </div>
      ) : (
        <div className="preview-grid mobile-carousel">
          {sheets.map((sheet, index) => {
            const problemsCount = sheet.coding_sheet_problems?.length || 0;
            const isLast = index === sheets.length - 1;
            return (
              <div 
                key={`${sheet.id}-${index}`}
                ref={isLast ? lastElementRef : null}
                className="preview-dsa-card"
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
      )}
    </>
  );
}
