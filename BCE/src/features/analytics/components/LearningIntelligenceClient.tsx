'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { Student360Profile } from '../services/student-intelligence';
import { refreshStudentAnalyticsAction } from '../actions/student';
import OpenAgentPlanButton from './OpenAgentPlanButton';
import { 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Target, 
  Compass, 
  BookOpen, 
  Code, 
  Brain,
  Calendar,
  Layers,
  CheckSquare,
  RotateCw,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface LearningIntelligenceClientProps {
  userId: string;
  initialProfile: Student360Profile;
}

export default function LearningIntelligenceClient({ userId, initialProfile }: LearningIntelligenceClientProps) {
  const [profile, setProfile] = useState<Student360Profile>(initialProfile);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isMainCollapsed, setIsMainCollapsed] = useState(false);

  const CACHE_KEY = `smartlearn_analytics_v1_${userId}`;

  // 1. On Mount: Check localStorage cache
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed && parsed.profile) {
          setProfile(parsed.profile);
          if (parsed.updatedAt) {
            const date = new Date(parsed.updatedAt);
            setLastSyncedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } else {
        // Save initial server-fetched profile to cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          profile: initialProfile,
          updatedAt: Date.now()
        }));
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.warn('Failed to access localStorage cache for analytics:', err);
    }
  }, [userId, initialProfile]);

  // 2. Manual Sync Handler
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncNotice(null);

    try {
      const res = await refreshStudentAnalyticsAction();
      if (res.success && res.profile) {
        setProfile(res.profile);
        const now = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          profile: res.profile,
          updatedAt: now
        }));
        const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedTime(timeStr);
        setSyncNotice('Analytics synced successfully!');
        setTimeout(() => setSyncNotice(null), 3000);
      } else {
        setSyncNotice(res.error || 'Sync failed');
        setTimeout(() => setSyncNotice(null), 4000);
      }
    } catch (err) {
      console.error('Error syncing analytics:', err);
      setSyncNotice('Failed to refresh data');
      setTimeout(() => setSyncNotice(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Confidence level badge color
  const confidenceColorMap = {
    High: 'var(--neon-lime)',
    Medium: 'var(--neon-cyan)',
    Low: 'var(--neon-gold)',
    Insufficient: 'var(--text-muted)'
  };
  const confidenceColor = confidenceColorMap[profile.confidenceLevel] || 'var(--neon-cyan)';

  // Header JSX with Sync Button & Top-Right Student-Aware Learning Intelligence Badge
  const HeaderComponent = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--neon-cyan)', padding: '10px', borderRadius: '12px' }}>
          <Brain size={24} />
        </div>
        <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 'bold' }}>
          Learning Analytics
        </h2>
      </div>

      {/* TOP RIGHT BADGE & SYNC / REFRESH BUTTON & INTERACTIVE TOGGLE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setIsMainCollapsed(!isMainCollapsed)}
          title={isMainCollapsed ? 'Click to expand analytics' : 'Click to collapse analytics'}
          style={{
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.4px',
            color: 'var(--neon-cyan)',
            background: 'rgba(0, 229, 255, 0.12)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            padding: '4px 10px',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 0 12px rgba(0, 229, 255, 0.2)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none'
          }}
        >
          <span>Analytics</span>
          {isMainCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        {syncNotice && (
          <span style={{ fontSize: '11px', color: 'var(--neon-lime)', fontWeight: 'bold', background: 'rgba(57, 255, 20, 0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(57, 255, 20, 0.3)' }}>
            {syncNotice}
          </span>
        )}
        
        <button
          onClick={handleSync}
          disabled={isSyncing}
          title="Refresh analytics data from server"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isSyncing ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: '8px',
            padding: '6px 14px',
            color: 'var(--neon-cyan)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: isSyncing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 10px rgba(0, 229, 255, 0.1)'
          }}
        >
          <RotateCw 
            size={14} 
            style={{ 
              animation: isSyncing ? 'spin 1s linear infinite' : 'none'
            }} 
          />
          <span>{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
          {lastSyncedTime && !isSyncing && (
            <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 'normal' }}>
              ({lastSyncedTime})
            </span>
          )}
        </button>
      </div>

      {/* Inline Spin CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  // If new user with insufficient data, show clean onboarding state
  if (!profile.hasSufficientData) {
    return (
      <Card
        variant="glass"
        padding="lg"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {HeaderComponent}

        <div style={{ marginTop: 'var(--space-lg)', background: 'rgba(255, 255, 255, 0.02)', border: '1px border-dashed var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-xl)', textAlign: 'center' }}>
          <Compass size={40} style={{ color: 'var(--neon-cyan)', opacity: 0.8, marginBottom: 'var(--space-sm)' }} />
          <h3 style={{ margin: '0 0 var(--space-xs) 0', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>
            Welcome to Smart Learn Intelligence 🚀
          </h3>
          <p style={{ margin: '0 auto var(--space-lg) auto', maxWidth: '520px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Complete your first course lesson, attempt an MCQ quiz, or solve a DSA problem to unlock your personalized 360° analytics profile, skill gap analysis, and student-aware recommendations.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/courses" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">
                <BookOpen size={16} /> Explore Courses
              </Button>
            </Link>
            <Link href="/code-arena/sheets" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm">
                <Code size={16} /> Solve DSA Sheets
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const { nextBestAction, recommendedCourse, recommendedCourses, personalizedPlan } = profile;
  const coursesToDisplay = recommendedCourses && recommendedCourses.length > 0 ? recommendedCourses : (recommendedCourse ? [recommendedCourse] : []);

  return (
    <Card
      variant="glass"
      padding="lg"
      className="intelligence-card"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: isMainCollapsed ? '0' : 'var(--space-xl)'
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .intelligence-card {
            padding: 12px !important;
            gap: ${isMainCollapsed ? '0 !important' : '14px !important'};
          }
          .intelligence-card h2 {
            font-size: 1.1rem !important;
          }
        }
      `}</style>

      {/* HEADER WITH SYNC BUTTON & TOP-RIGHT INTERACTIVE TOGGLE */}
      {HeaderComponent}

      {!isMainCollapsed && (
        <>
          {/* 1. TOP SECTION: LEARNING READINESS (LEFT) + STRENGTHS & NEEDS IMPROVEMENT (RIGHT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'var(--space-md)' }}>
        
        {/* LEFT CARD: LEARNING READINESS (360° Score + Bars) */}
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              LEARNING READINESS
            </span>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            {/* Circular Score Gauge */}
            <div 
              style={{ 
                position: 'relative',
                width: '76px', 
                height: '76px', 
                borderRadius: '50%', 
                background: `conic-gradient(var(--neon-cyan) ${profile.overallLearningScore}%, rgba(255,255,255,0.06) 0%)`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)'
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--neon-cyan)', lineHeight: 1 }}>{profile.overallLearningScore}</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>

            {/* 4 Score Breakdown Bars */}
            <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Academic', value: profile.academicScore, color: 'var(--neon-cyan)' },
                { label: 'Skills', value: profile.skillScore, color: 'var(--neon-lime)' },
                { label: 'Coding', value: profile.codingScore, color: 'var(--neon-magenta)' },
                { label: 'Assessment', value: profile.assessmentScore, color: '#f59e0b' }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{ width: '68px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${item.value}%`, height: '100%', background: item.color, borderRadius: '3px' }} />
                  </div>
                  <span style={{ width: '32px', textAlign: 'right', fontWeight: 'bold', color: item.color }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: KEY STRENGTHS & NEEDS IMPROVEMENT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {/* YOUR KEY STRENGTHS */}
          <div style={{ background: 'rgba(57, 255, 20, 0.04)', border: '1px solid rgba(57, 255, 20, 0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--neon-lime)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--neon-lime)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  YOUR KEY STRENGTHS
                </span>
              </div>

            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.strengths.map((str, i) => (
                <span key={i} style={{ fontSize: '11px', background: 'rgba(57, 255, 20, 0.12)', color: 'var(--neon-lime)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(57, 255, 20, 0.3)', fontWeight: 600 }}>
                  ✓ {str}
                </span>
              ))}
            </div>
          </div>

          {/* NEEDS IMPROVEMENT */}
          <div style={{ background: 'rgba(255, 69, 58, 0.04)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} style={{ color: '#ff4d4f' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: '#ff4d4f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  NEEDS IMPROVEMENT
                </span>
              </div>

            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.weakAreas.map((weak, i) => (
                <span key={i} style={{ fontSize: '11px', background: 'rgba(255, 69, 58, 0.12)', color: '#ff4d4f', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255, 69, 58, 0.3)', fontWeight: 600 }}>
                  ⚠️ {weak}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>



      {/* 3. TARGET CAPABILITY VS CURRENT SKILL GAP */}
      {profile.skillGaps.length > 0 && (
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md) var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} style={{ color: 'var(--neon-gold)' }} />
              <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'bold', color: 'var(--neon-gold)' }}>
                Target Capability vs Current Skill Gap
              </h3>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
            {profile.skillGaps.map((gapItem, idx) => (
              <div key={idx} style={{ background: 'var(--bg-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{gapItem.topic}</span>
                  <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold' }}>Gap: -{gapItem.gap}%</span>
                </div>

                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                  <div style={{ width: `${gapItem.currentCapability}%`, height: '100%', background: 'var(--neon-cyan)', borderRadius: '4px 0 0 4px' }} />
                  <div style={{ position: 'absolute', left: `${gapItem.targetCapability}%`, top: 0, bottom: 0, width: '2px', background: 'var(--neon-gold)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Current: {gapItem.currentCapability}%</span>
                  <span>Target: {gapItem.targetCapability}%</span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Why? {gapItem.evidence}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. RECOMMENDED COURSE & PERSONALIZED LEARNING PLAN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 'var(--space-lg)' }}>
        
        {/* RECOMMENDED COURSES GRID (COMPACT SMALL BOXES) */}
        {coursesToDisplay.length > 0 && (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid var(--neon-magenta)', 
            borderRadius: 'var(--radius-md)', 
            padding: 'var(--space-md) var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
            boxShadow: '0 4px 20px rgba(255, 0, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--neon-magenta)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} /> RECOMMENDED COURSES
              </span>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 'var(--space-sm)' }}>
              {coursesToDisplay.map((course, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.06) 0%, rgba(99, 102, 241, 0.04) 100%)', 
                    border: '1px solid rgba(255, 0, 255, 0.3)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {course.title}
                      </h4>
                      <span style={{ fontSize: '9px', background: 'rgba(255, 0, 255, 0.15)', color: 'var(--neon-magenta)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {course.matchScore}%
                      </span>
                    </div>

                    <p style={{ margin: '0 0 6px 0', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {course.description}
                    </p>

                    <div style={{ fontSize: '9.5px', background: 'rgba(255, 0, 255, 0.1)', color: 'var(--neon-magenta)', padding: '3px 6px', borderRadius: '4px', border: '1px solid rgba(255, 0, 255, 0.2)', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      Why: "{course.whyReason}"
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <Link href={course.actionUrl} style={{ textDecoration: 'none', flex: 1 }}>
                      <Button variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'center', fontSize: '10px', padding: '3px 6px', height: '24px' }}>
                        View
                      </Button>
                    </Link>
                    <Link href={course.actionUrl} style={{ textDecoration: 'none', flex: 1 }}>
                      <Button variant="primary" size="sm" style={{ width: '100%', justifyContent: 'center', fontSize: '10px', padding: '3px 6px', height: '24px', background: 'var(--neon-magenta)', border: 'none' }}>
                        Enroll
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PERSONALIZED LEARNING PLAN CARD */}
        {personalizedPlan && (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} style={{ color: 'var(--neon-cyan)' }} />
                  <span>PERSONALIZED LEARNING PLAN</span>
                </h3>

              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* TODAY */}
                <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--neon-cyan)', fontWeight: 'bold', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
                    <CheckSquare size={13} /> TODAY
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {personalizedPlan.today.map((task, idx) => (
                      <div key={idx} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        • <strong style={{ color: 'var(--text-primary)' }}>{task.title}:</strong> {task.detail}
                      </div>
                    ))}
                  </div>
                </div>

                {/* THIS WEEK */}
                <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--neon-lime)', fontWeight: 'bold', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
                    <Target size={13} /> THIS WEEK
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {personalizedPlan.thisWeek.map((milestone, idx) => (
                      <div key={idx} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        • <strong style={{ color: 'var(--text-primary)' }}>{milestone.title}:</strong> {milestone.detail}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ASK SMART AGENT */}
            <OpenAgentPlanButton label="Talk to Smart Agent about your learning plan →" />
          </div>
        )}

      </div>
        </>
      )}

    </Card>
  );
}
