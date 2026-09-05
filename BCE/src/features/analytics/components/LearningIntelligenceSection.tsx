import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { getStudent360Profile } from '../services/student-intelligence';
import { Zap, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Clock, Target, Compass, Award, BookOpen, Code, Brain } from 'lucide-react';

interface LearningIntelligenceSectionProps {
  userId: string;
}

export default async function LearningIntelligenceSection({ userId }: LearningIntelligenceSectionProps) {
  const profile = await getStudent360Profile(userId);

  // Confidence level badge color
  const confidenceColorMap = {
    High: 'var(--neon-lime)',
    Medium: 'var(--neon-cyan)',
    Low: 'var(--neon-gold)',
    Insufficient: 'var(--text-muted)'
  };
  const confidenceColor = confidenceColorMap[profile.confidenceLevel];

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-md)' }}>
          <div style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--neon-cyan)', padding: '10px', borderRadius: '12px' }}>
            <Brain size={28} />
          </div>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-xl)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Your Learning Intelligence
              <span style={{ fontSize: '10px', background: 'rgba(0, 229, 255, 0.15)', color: 'var(--neon-cyan)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.3)', fontWeight: 'bold' }}>
                AI Ready
              </span>
            </h2>
            <p className="text-secondary" style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)' }}>
              Personalized insights based on your Smart Learn activity.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px border-dashed var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-xl)', textAlign: 'center' }}>
          <Compass size={40} style={{ color: 'var(--neon-cyan)', opacity: 0.8, marginBottom: 'var(--space-sm)' }} />
          <h3 style={{ margin: '0 0 var(--space-xs) 0', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>
            Welcome to Smart Learn Intelligence 🚀
          </h3>
          <p style={{ margin: '0 auto var(--space-lg) auto', maxWidth: '520px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Complete your first course lesson, attempt an MCQ quiz, or solve a DSA problem to unlock your personalized 360° analytics profile, skill gap analysis, and evidence-backed recommendations.
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

  const { dataCoverage } = profile;

  return (
    <Card
      variant="glass"
      padding="lg"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)'
      }}
    >
      {/* 1. HEADER ROW WITH TIMESTAMP & CONFIDENCE BADGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)', borderBottom: '1px solid var(--glass-border)', paddingBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(0, 229, 255, 0.12)', color: 'var(--neon-cyan)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.25)' }}>
            <Brain size={28} />
          </div>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-xl)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Your Learning Intelligence
            </h2>
            <p className="text-secondary" style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)' }}>
              Personalized insights calculated from your Smart Learn activity.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {/* Confidence Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${confidenceColor}` }}>
            <ShieldCheck size={14} style={{ color: confidenceColor }} />
            <span style={{ color: 'var(--text-secondary)' }}>Analytics Confidence:</span>
            <strong style={{ color: confidenceColor }}>{profile.confidenceLevel}</strong>
          </div>
          
          {/* Data Coverage & Timestamp */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={12} /> Updated just now
            </span>
            <span>•</span>
            <span>Based on {dataCoverage.assessmentsCount} tests, {dataCoverage.coursesCount} courses, {dataCoverage.dsaSolvedCount} DSA problems</span>
          </div>
        </div>
      </div>

      {/* 2. TOP SUMMARY GRID: OVERALL SCORE + STRENGTHS / WEAKNESSES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
        
        {/* A. OVERALL PROFILE SCORE */}
        <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Learning Readiness
            </span>
            <span style={{ fontSize: '11px', color: 'var(--neon-cyan)', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>
              360° Score
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div 
              style={{ 
                width: '72px', 
                height: '72px', 
                borderRadius: '50%', 
                background: `conic-gradient(var(--neon-cyan) ${profile.overallLearningScore}%, rgba(255,255,255,0.08) 0%)`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 15px rgba(0, 229, 255, 0.2)'
              }}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--neon-cyan)', lineHeight: 1 }}>{profile.overallLearningScore}</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'Academic', value: profile.academicScore, color: 'var(--neon-cyan)' },
                { label: 'Skills', value: profile.skillScore, color: 'var(--neon-lime)' },
                { label: 'Coding', value: profile.codingScore, color: 'var(--neon-magenta)' },
                { label: 'Assessment', value: profile.assessmentScore, color: '#f59e0b' }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{ width: '70px', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${item.value}%`, height: '100%', background: item.color, borderRadius: '3px' }} />
                  </div>
                  <span style={{ width: '28px', textAlign: 'right', fontWeight: 'bold', color: item.color }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* B. STRENGTHS & NEEDS IMPROVEMENT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {/* STRENGTHS */}
          <div style={{ background: 'rgba(57, 255, 20, 0.05)', border: '1px solid rgba(57, 255, 20, 0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <CheckCircle2 size={15} style={{ color: 'var(--neon-lime)' }} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--neon-lime)', textTransform: 'uppercase' }}>
                Your Key Strengths
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.strengths.map((str, i) => (
                <span key={i} style={{ fontSize: '11px', background: 'rgba(57, 255, 20, 0.12)', color: 'var(--neon-lime)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(57, 255, 20, 0.25)', fontWeight: 500 }}>
                  ✓ {str}
                </span>
              ))}
            </div>
          </div>

          {/* NEEDS IMPROVEMENT */}
          <div style={{ background: 'rgba(255, 69, 58, 0.05)', border: '1px solid rgba(255, 69, 58, 0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <AlertTriangle size={15} style={{ color: '#ff4d4f' }} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: '#ff4d4f', textTransform: 'uppercase' }}>
                Needs Improvement
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.weakAreas.length > 0 ? (
                profile.weakAreas.map((weak, i) => (
                  <span key={i} style={{ fontSize: '11px', background: 'rgba(255, 69, 58, 0.12)', color: '#ff4d4f', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(255, 69, 58, 0.25)', fontWeight: 500 }}>
                    ⚠️ {weak}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No major weak areas detected. Keep up the great work!</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. NEXT BEST ACTION BANNER */}
      {profile.nextBestAction && (
        <div style={{ background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, rgba(57, 255, 20, 0.08) 100%)', border: '1px solid var(--neon-cyan)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '260px' }}>
            <div style={{ background: 'var(--neon-cyan)', color: '#000', padding: '8px', borderRadius: '8px', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚡ Next Best Action
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.4)', color: 'var(--text-secondary)', padding: '1px 6px', borderRadius: '4px' }}>
                  Recommended Focus
                </span>
              </div>
              <h4 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {profile.nextBestAction.title}
              </h4>
              <p style={{ margin: '2px 0 6px 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {profile.nextBestAction.description}
              </p>
              {/* Evidence "Why?" Badge */}
              <div style={{ display: 'inline-block', fontSize: '11px', background: 'rgba(0, 229, 255, 0.15)', color: 'var(--neon-cyan)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 229, 255, 0.3)', fontWeight: 'bold' }}>
                {profile.nextBestAction.evidenceWhy}
              </div>
            </div>
          </div>

          <Link href={profile.nextBestAction.actionUrl} style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Button variant="primary" size="sm" style={{ padding: '8px 18px', fontWeight: 'bold' }}>
              {profile.nextBestAction.actionText} <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      )}

      {/* 4. SKILL GAP MATRIX */}
      {profile.skillGaps.length > 0 && (
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-sm)' }}>
            <Target size={16} style={{ color: 'var(--neon-gold)' }} />
            <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neon-gold)' }}>
              Target Capability vs Current Skill Gap
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
            {profile.skillGaps.map((gapItem, idx) => (
              <div key={idx} style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{gapItem.topic}</span>
                  <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold' }}>Gap: -{gapItem.gap}%</span>
                </div>

                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', position: 'relative', marginBottom: '6px' }}>
                  {/* Current progress */}
                  <div style={{ width: `${gapItem.currentCapability}%`, height: '100%', background: 'var(--neon-cyan)', borderRadius: '4px 0 0 4px' }} />
                  {/* Target indicator mark */}
                  <div style={{ position: 'absolute', left: `${gapItem.targetCapability}%`, top: 0, bottom: 0, width: '2px', background: 'var(--neon-gold)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span>Current: {gapItem.currentCapability}%</span>
                  <span>Target: {gapItem.targetCapability}%</span>
                </div>

                <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Why? {gapItem.evidence}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. PERSONALIZED RECOMMENDATIONS GRID */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Personalized Content Recommendations</span>
          </h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Evidence-Backed Choice
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
          {profile.recommendations.map(rec => (
            <div
              key={rec.id}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 'var(--space-sm)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--neon-cyan)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                    {rec.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Match Score: {Math.min(99, rec.relevanceScore)}%
                  </span>
                </div>

                <h4 style={{ margin: '0 0 4px 0', fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {rec.title}
                </h4>

                <p style={{ margin: '0 0 var(--space-xs) 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {rec.description}
                </p>

                {/* Evidence "Why?" Tag */}
                <div style={{ fontSize: '11px', background: 'rgba(255, 215, 0, 0.08)', color: 'var(--neon-gold)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 215, 0, 0.2)', fontWeight: 500, lineHeight: 1.3 }}>
                  <strong>Why?</strong> {rec.evidenceWhy.replace(/^Why\?\s*/i, '')}
                </div>
              </div>

              <Link href={rec.actionUrl} style={{ textDecoration: 'none', marginTop: 'var(--space-xs)' }}>
                <Button variant="ghost" size="sm" style={{ width: '100%', justifyContent: 'center', fontSize: 'var(--text-xs)', borderColor: 'var(--glass-border)' }}>
                  {rec.actionText} →
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
