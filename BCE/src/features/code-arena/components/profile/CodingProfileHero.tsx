'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Flame, CheckCircle2, TerminalSquare, Swords, Sparkles, Calendar } from 'lucide-react';
import type { Profile } from '@/types';

interface CodingProfileHeroProps {
  profile: Profile | null;
  codeforcesConnected: boolean;
  leetCodeConnected: boolean;
  codechefConnected?: boolean;
  gfgConnected?: boolean;
  isOwnProfile?: boolean;
  dailyActivity?: Record<string, { bce: number; cf: number; lc: number; cc?: number; gfg?: number; total: number }>;
}

export default function CodingProfileHero({ profile, codeforcesConnected, leetCodeConnected, codechefConnected = false, gfgConnected = false, isOwnProfile = true, dailyActivity }: CodingProfileHeroProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>('last12');
  const [copied, setCopied] = React.useState(false);

  // Extract unique active years from activity data
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    Object.keys(dailyActivity || {}).forEach(dateStr => {
      try {
        const y = new Date(dateStr).getFullYear();
        if (!isNaN(y)) {
          years.add(y);
        }
      } catch (e) {
        // Ignored
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [dailyActivity]);

  // Generate cells based on selectedPeriod (either sliding last12 months or full calendar year)
  const weeks = React.useMemo(() => {
    const cells: { dateStr: string; dateObj: Date; dayOfWeek: number; weekIdx: number; activity: { bce: number; cf: number; lc: number; cc?: number; gfg?: number; total: number } }[] = [];
    const today = new Date();
    
    let startDate = new Date();
    let endDate = new Date();

    if (selectedPeriod === 'last12') {
      startDate.setDate(today.getDate() - 364);
    } else {
      const year = Number(selectedPeriod);
      startDate = new Date(year, 0, 1); // Jan 1
      endDate = new Date(year, 11, 31); // Dec 31
      // If selected year is current year, clamp endDate to today
      const currentYear = today.getFullYear();
      if (year === currentYear) {
        endDate = today;
      }
    }

    // Align startDate to Sunday for a clean layout
    const startDay = startDate.getDay();
    const adjustedStartDate = new Date(startDate);
    adjustedStartDate.setDate(startDate.getDate() - startDay); // Shift back to Sunday

    let current = new Date(adjustedStartDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const dayOfWeek = current.getDay();
      
      const diffTime = current.getTime() - adjustedStartDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const weekIdx = Math.floor(diffDays / 7);

      cells.push({
        dateStr,
        dateObj: new Date(current),
        dayOfWeek,
        weekIdx,
        activity: dailyActivity?.[dateStr] || { bce: 0, cf: 0, lc: 0, cc: 0, gfg: 0, total: 0 },
      });

      current.setDate(current.getDate() + 1);
    }

    const gridWeeks: typeof cells[] = [];
    cells.forEach(cell => {
      if (!gridWeeks[cell.weekIdx]) {
        gridWeeks[cell.weekIdx] = [];
      }
      gridWeeks[cell.weekIdx][cell.dayOfWeek] = cell;
    });

    return gridWeeks;
  }, [selectedPeriod, dailyActivity]);

  const handleShare = () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/code-arena/profile?id=${profile.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="profile-hero-container">
      {/* Animated gradient orbs in background */}
      <div className="hero-bg-orb hero-bg-orb-1" />
      <div className="hero-bg-orb hero-bg-orb-2" />
      <div className="hero-bg-orb hero-bg-orb-3" />
      
      <div className="profile-hero-content">
        <div className="profile-hero-avatar">
          <div className="avatar-glow-ring" />
          {profile?.avatar_url ? (
            <Image 
              src={profile.avatar_url} 
              alt={profile.name} 
              width={100}
              height={100}
              style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }}
              unoptimized
            />
          ) : (
            <User size={48} opacity={0.5} />
          )}
        </div>
        
        <div className="profile-hero-details">
          <div className="hero-name-row">
            <h1 className="profile-hero-name">{profile?.name || 'Loading...'}</h1>
            <Sparkles size={20} className="hero-sparkle-icon" />
          </div>
          <p className="profile-hero-title">
            {isOwnProfile ? 'Competitive Programmer' : `Viewing ${profile?.name || 'User'}'s Coding Profile`}
          </p>
          <p className="profile-hero-college" suppressHydrationWarning>
            <span className="college-dot" />
            {profile?.college_name || 'Smart Learn App'}
          </p>
          
          <div className="profile-hero-badges">
            {profile?.streak_days && profile.streak_days > 0 ? (
              <span className="profile-badge streak-badge">
                <Flame size={14} />
                {profile.streak_days} Day Streak
              </span>
            ) : null}
            {codeforcesConnected && (
              <span className="profile-badge connection-badge cf-badge">
                <CheckCircle2 size={14} />
                Codeforces
              </span>
            )}
            {leetCodeConnected && (
              <span className="profile-badge connection-badge lc-badge">
                <CheckCircle2 size={14} />
                LeetCode
              </span>
            )}
            {codechefConnected && (
              <span className="profile-badge connection-badge cc-badge" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}>
                <CheckCircle2 size={14} />
                CodeChef
              </span>
            )}
            {gfgConnected && (
              <span className="profile-badge connection-badge gfg-badge" style={{ borderColor: 'rgba(34, 197, 94, 0.4)', color: '#22c55e' }}>
                <CheckCircle2 size={14} />
                GeeksforGeeks
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* 12-Month Solving Contribution Calendar Grid */}
      <div className="profile-hero-calendar-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} style={{ color: 'var(--neon-emerald)' }} /> Activity Grid 
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: '4px',
                color: 'var(--text-main)',
                fontSize: '9px',
                fontWeight: 700,
                padding: '2px 4px',
                marginLeft: '8px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="last12" style={{ background: '#0f172a', color: '#f8fafc' }}>Last 12 Months</option>
              {availableYears.map(year => (
                <option key={year} value={String(year)} style={{ background: '#0f172a', color: '#f8fafc' }}>{year}</option>
              ))}
            </select>
          </span>
          <div style={{ display: 'flex', gap: '6px', fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>SL</span>
            <span style={{ color: 'var(--neon-cyan)' }}>■</span>
            <span>CF</span>
            <span style={{ color: '#ee5b5b' }}>■</span>
            <span>LC</span>
            <span style={{ color: '#ffa116' }}>■</span>
            <span>CC</span>
            <span style={{ color: '#f59e0b' }}>■</span>
            <span>GFG</span>
            <span style={{ color: '#22c55e' }}>■</span>
          </div>
        </div>

        {/* Contribution Calendar Grid */}
        <div className="calendar-scroll-wrapper" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: '16px', paddingBottom: '4px' }}>
          <div className="contribution-calendar-grid" style={{ display: 'flex', gap: '4px', minWidth: '450px' }}>
            {weeks.map((week, wIdx) => {
              // Find month label if it's the start of a month
              const firstCell = week.find(c => c !== undefined);
              const showMonthLabel = firstCell && firstCell.dateObj.getDate() <= 7;
              const monthName = firstCell ? firstCell.dateObj.toLocaleString('default', { month: 'short' }) : '';

              return (
                <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                  {showMonthLabel && (
                    <span style={{
                      position: 'absolute',
                      top: '-15px',
                      left: '0',
                      fontSize: '8.5px',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      {monthName}
                    </span>
                  )}
                  {/* 7 Days of the Week */}
                  {Array.from({ length: 7 }).map((_, dIdx) => {
                    const cell = week[dIdx];
                    if (!cell) {
                      return <div key={dIdx} style={{ width: '10px', height: '10px', opacity: 0 }} />;
                    }

                    // Compute background color based on activity
                    let bgColor = 'rgba(255, 255, 255, 0.04)'; // empty
                    let borderStyle = '1px solid rgba(255, 255, 255, 0.01)';
                    const total = cell.activity.total;
                    
                    if (total > 0) {
                      if (total === 1) bgColor = 'rgba(34, 197, 94, 0.2)';
                      else if (total === 2) bgColor = 'rgba(34, 197, 94, 0.4)';
                      else if (total <= 4) bgColor = 'rgba(34, 197, 94, 0.7)';
                      else bgColor = 'rgba(34, 197, 94, 1.0)';
                      borderStyle = '1px solid rgba(34, 197, 94, 0.15)';
                    }

                    return (
                      <div
                        key={dIdx}
                        className="calendar-cell"
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '2px',
                          background: bgColor,
                          border: borderStyle,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Tooltip */}
                        <div className="cell-tooltip" style={{
                          visibility: 'hidden',
                          opacity: 0,
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%) translateY(-6px)',
                          background: '#0b0f19',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-main)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          whiteSpace: 'nowrap',
                          zIndex: 1000,
                          pointerEvents: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                          transition: 'opacity 0.15s, transform 0.15s'
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: '2px' }}>{new Date(cell.dateStr).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                          <div style={{ color: 'var(--neon-emerald)', fontWeight: 800 }}>Total: {total} solved</div>
                          <div style={{ display: 'flex', gap: '6px', color: 'var(--text-muted)', fontSize: '9px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span>SL: {cell.activity.bce}</span>
                            <span>CF: {cell.activity.cf}</span>
                            <span>LC: {cell.activity.lc}</span>
                            <span>CC: {cell.activity.cc || 0}</span>
                            <span>GFG: {cell.activity.gfg || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .calendar-cell {
          position: relative;
        }
        .calendar-cell:hover {
          transform: scale(1.3);
          border-color: #22c55e !important;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
          z-index: 100 !important;
        }
        .calendar-cell:hover .cell-tooltip {
          visibility: visible !important;
          opacity: 1 !important;
          transform: translateX(-50%) translateY(-4px) !important;
          z-index: 1000 !important;
        }
      `}</style>
      
      <div className="profile-hero-actions" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: '150px',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}>
        {isOwnProfile ? (
          <>
            <button 
              onClick={handleShare} 
              className="hero-action-btn secondary"
              style={{
                background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                borderColor: copied ? '#22c55e' : 'var(--glass-border)',
                color: copied ? '#22c55e' : 'var(--text-main)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                padding: '6px 12px',
                fontSize: '11px',
                height: '32px',
                width: '100%',
              }}
            >
              {copied ? 'Copied! ✓' : 'Share Profile 🔗'}
            </button>
            <Link href="/code-arena/problems" className="hero-action-btn primary" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              height: '32px',
              width: '100%',
            }}>
              <TerminalSquare size={13} />
              Problem Hub
            </Link>
            <Link href="/code-arena" className="hero-action-btn secondary" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              height: '32px',
              width: '100%',
            }}>
              <Swords size={13} />
              Coding Battles
            </Link>
          </>
        ) : (
          <Link href="/code-arena/profile" className="hero-action-btn primary" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            height: '32px',
            width: '100%',
          }}>
            Back to My Profile
          </Link>
        )}
      </div>
    </div>
  );
}
