import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { getStudent360Profile } from '../services/student-intelligence';
import OpenAgentPlanButton from './OpenAgentPlanButton';
import { 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Target, 
  Compass, 
  BookOpen, 
  Code, 
  Brain,
  Sparkles,
  Calendar,
  Layers,
  CheckSquare
} from 'lucide-react';

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
              Student-Aware Learning Intelligence
              <span style={{ fontSize: '10px', background: 'rgba(0, 229, 255, 0.15)', color: 'var(--neon-cyan)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(0, 229, 255, 0.3)', fontWeight: 'bold' }}>
                AI Engine
              </span>
            </h2>
            <p className="text-secondary" style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)' }}>
              Personalized recommendations based on your real learning analytics.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px border-dashed var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-xl)', textAlign: 'center' }}>
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

  const { nextBestAction, recommendedCourse, personalizedPlan, dataCoverage } = profile;

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
        gap: 'var(--space-xl)'
      }}
    >
      {/* 1. HEADER ROW WITH METRICS & AI COACH CALL-TO-ACTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', borderBottom: '1px solid var(--glass-border)', paddingBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(0, 229, 255, 0.12)', color: 'var(--neon-cyan)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.25)' }}>
            <Brain size={28} />
          </div>
          <div>
            <h2 className="section-title" style={{ margin: 0, fontSize: 'var(--text-xl)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Student-Aware Learning Intelligence
              <span style={{ fontSize: '10px', background: 'rgba(57, 255, 20, 0.15)', color: 'var(--neon-lime)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(57, 255, 20, 0.3)', fontWeight: 'bold' }}>
                Adaptive
              </span>
            </h2>
            <p className="text-secondary" style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)' }}>
              Personalized for your learning profile • Updated in real time
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <OpenAgentPlanButton />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${confidenceColor}` }}>
              <ShieldCheck size={14} style={{ color: confidenceColor }} />
              <span style={{ color: 'var(--text-secondary)' }}>Confidence:</span>
              <strong style={{ color: confidenceColor }}>{profile.confidenceLevel}</strong>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={12} /> Live Analytics
              </span>
              <span>•</span>
              <span>{dataCoverage.assessmentsCount} tests • {dataCoverage.coursesCount} courses</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NEXT BEST ACTION & RECOMMENDED COURSE GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 'var(--space-lg)' }}>
        
        {/* A. NEXT BEST ACTION CARD */}
        {nextBestAction && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08) 0%, rgba(57, 255, 20, 0.05) 100%)', 
            border: '1px solid var(--neon-cyan)', 
            borderRadius: 'var(--radius-md)', 
            padding: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
            boxShadow: '0 4px 20px rgba(0, 229, 255, 0.1)'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={15} /> NEXT BEST ACTION
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(0, 229, 255, 0.15)', color: 'var(--neon-cyan)', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                  Match: {nextBestAction.relevanceScore}%
                </span>
              </div>

              <h3 style={{ margin: '0 0 6px 0', fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {nextBestAction.title}
              </h3>

              <p style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {nextBestAction.description}
              </p>

              {/* Progress Level (If applicable) */}
              {typeof nextBestAction.currentLevel === 'number' && typeof nextBestAction.targetLevel === 'number' && (
                <div style={{ marginBottom: 'var(--space-md)', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Current level: <strong style={{ color: 'var(--neon-cyan)' }}>{nextBestAction.currentLevel}%</strong></span>
                    <span style={{ color: 'var(--text-secondary)' }}>Target: <strong style={{ color: 'var(--neon-lime)' }}>{nextBestAction.targetLevel}%</strong></span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (nextBestAction.currentLevel / nextBestAction.targetLevel) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-lime))', borderRadius: '3px' }} />
                  </div>
                </div>
              )}

              {/* Evidence Why Badge */}
              <div style={{ fontSize: '11px', background: 'rgba(0, 229, 255, 0.12)', color: 'var(--neon-cyan)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 229, 255, 0.25)', fontWeight: 500, lineHeight: 1.4 }}>
                <strong>Why this is recommended:</strong> "{nextBestAction.evidenceWhy.replace(/^Why\?\s*/i, '')}"
              </div>
            </div>

            <Link href={nextBestAction.actionUrl} style={{ textDecoration: 'none', marginTop: 'var(--space-xs)' }}>
              <Button variant="primary" size="sm" style={{ width: '100%', justifyContent: 'center', fontWeight: 'bold', padding: '10px' }}>
                {nextBestAction.actionText} <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        )}

        {/* B. RECOMMENDED COURSE CARD */}
        {recommendedCourse ? (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)', 
            border: '1px solid var(--neon-magenta)', 
            borderRadius: 'var(--radius-md)', 
            padding: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
            boxShadow: '0 4px 20px rgba(255, 0, 255, 0.1)'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--neon-magenta)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={15} /> RECOMMENDED COURSE
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(255, 0, 255, 0.15)', color: 'var(--neon-magenta)', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                  Match: {recommendedCourse.matchScore}%
                </span>
              </div>

              <h3 style={{ margin: '0 0 6px 0', fontSize: 'var(--text-lg)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {recommendedCourse.title}
              </h3>

              <p style={{ margin: '0 0 var(--space-md) 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {recommendedCourse.description}
              </p>

              {/* Evidence Why Badge */}
              <div style={{ fontSize: '11px', background: 'rgba(255, 0, 255, 0.12)', color: 'var(--neon-magenta)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 0, 255, 0.25)', fontWeight: 500, lineHeight: 1.4 }}>
                <strong>Why:</strong> "{recommendedCourse.whyReason}"
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Link href={recommendedCourse.actionUrl} style={{ textDecoration: 'none', flex: 1 }}>
                <Button variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'center' }}>
                  View Course
                </Button>
              </Link>
              <Link href={recommendedCourse.actionUrl} style={{ textDecoration: 'none', flex: 1 }}>
                <Button variant="primary" size="sm" style={{ width: '100%', justifyContent: 'center', background: 'var(--neon-magenta)', border: 'none' }}>
                  Enroll Now
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <CheckCircle2 size={36} style={{ color: 'var(--neon-lime)', margin: '0 auto var(--space-sm) auto' }} />
            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>All Platform Courses Explored!</h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
              You are currently enrolled in or have completed all primary courses in your curriculum.
            </p>
          </div>
        )}

      </div>

      {/* 3. YOUR PERSONALIZED LEARNING PLAN */}
      {personalizedPlan && (
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} style={{ color: 'var(--neon-cyan)' }} />
              <span>YOUR PERSONALIZED LEARNING PLAN</span>
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Tailored to your weak areas &amp; goals
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
            
            {/* TODAY COLUMN */}
            <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-sm)', color: 'var(--neon-cyan)', fontWeight: 'bold', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
                <CheckSquare size={14} /> TODAY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {personalizedPlan.today.map((task, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: 'var(--text-xs)' }}>
                    <span style={{ background: 'rgba(0, 229, 255, 0.15)', color: 'var(--neon-cyan)', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{task.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{task.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* THIS WEEK COLUMN */}
            <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-sm)', color: 'var(--neon-lime)', fontWeight: 'bold', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
                <Target size={14} /> THIS WEEK
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {personalizedPlan.thisWeek.map((milestone, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: 'var(--text-xs)' }}>
                    <span style={{ background: 'rgba(57, 255, 20, 0.15)', color: 'var(--neon-lime)', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', flexShrink: 0, marginTop: '2px' }}>
                      ✓
                    </span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{milestone.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{milestone.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NEXT COURSE COLUMN */}
            <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-sm)', color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
                <Compass size={14} /> NEXT STEP COURSE
              </div>
              {personalizedPlan.nextCourse ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 'var(--text-xs)' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                    "{personalizedPlan.nextCourse.title}"
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: 1.4 }}>
                    <strong>Why:</strong> {personalizedPlan.nextCourse.reason}
                  </div>
                  <Link href={personalizedPlan.nextCourse.url} style={{ textDecoration: 'none', marginTop: '4px' }}>
                    <span style={{ color: 'var(--neon-gold)', fontWeight: 'bold', fontSize: '11px' }}>
                      View Details →
                    </span>
                  </Link>
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  Complete your current active courses to reveal your next structured milestone course!
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. ASK YOUR AI COACH BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(0, 229, 255, 0.15) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md) var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '10px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              Ask Your AI Coach
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Discuss your personalized plan, clear doubt topics, or request custom 7-day schedule adjustments.
            </p>
          </div>
        </div>

        <OpenAgentPlanButton label="Talk to your AI Coach about your learning plan →" />
      </div>

    </Card>
  );
}
