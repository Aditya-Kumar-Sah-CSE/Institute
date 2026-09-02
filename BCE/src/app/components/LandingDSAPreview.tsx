import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Lock, Code, Shield, FolderGit2 } from 'lucide-react';

export default async function LandingDSAPreview() {
  const supabase = await createClient();
  
  // Fetch available DSA sheets
  const { data: sheets, error } = await supabase
    .from('coding_sheets')
    .select('id, title, description, enrollment_access, coding_sheet_problems(problem_id)')
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error('Error fetching preview DSA sheets:', error);
    return null;
  }

  return (
    <section id="landing-dsa" className="landing-section" style={{ background: 'var(--bg-card)', position: 'relative', zIndex: 1, padding: '3rem 24px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ color: '#06b6d4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem', display: 'inline-block', marginBottom: '0.5rem' }}>DSA SHEETS</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Master Data Structures</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
            Structured problem sets to build strong problem-solving skills.
          </p>
        </div>

        {(!sheets || sheets.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '600px', margin: '0 auto' }}>
             <Code size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
             <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 700 }}>Practice sets are being prepared.</h3>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>New DSA sheets will appear here soon.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', justifyContent: 'center' }}>
            {sheets.map((sheet: any) => {
              const problemsCount = sheet.coding_sheet_problems?.length || 0;
              return (
                <div 
                  key={sheet.id} 
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
      </div>
    </section>
  );
}
