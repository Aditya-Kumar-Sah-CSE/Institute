'use client';

import { useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { refreshStudentAnalyticsAction } from '../actions/student';
import type { Student360Profile } from '../services/student-intelligence';
import { Activity, Award, BookOpen, CheckCircle2, Clock3, RotateCw, Trophy } from 'lucide-react';

interface LearningIntelligenceClientProps {
  initialProfile: Student360Profile;
}

export default function LearningIntelligenceClient({ initialProfile }: LearningIntelligenceClientProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const sync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const result = await refreshStudentAnalyticsAction();
      if (!result.success || !result.profile) throw new Error(result.error || 'Refresh failed');
      setProfile(result.profile);
      setSyncNotice('Activity data refreshed.');
    } catch (error) {
      setSyncNotice(error instanceof Error ? error.message : 'Could not refresh activity data.');
    } finally {
      setIsSyncing(false);
      window.setTimeout(() => setSyncNotice(null), 3500);
    }
  };

  const metricValue = (available: boolean, count: number, value: string) => {
    if (!available) return 'Unavailable';
    if (count === 0) return 'No records';
    return value;
  };
  const displayMetric = (metric: { value: number | null; status: string; unit: string }) => {
    if (metric.status === 'unavailable') return 'Unavailable';
    if (metric.status === 'no_data' || metric.value === null) return 'No data';
    if (metric.unit === 'percent') return `${metric.value}%`;
    if (metric.unit === 'cgpa') return `${metric.value} CGPA`;
    return String(metric.value);
  };

  const metrics = [
    {
      label: 'Average course progress',
      value: metricValue(profile.dataAvailability.courses, profile.dataCoverage.coursesCount, profile.courseProgressPercent === null ? 'Unavailable' : `${profile.courseProgressPercent}%`),
      detail: profile.dataAvailability.courses ? `${profile.dataCoverage.completedCoursesCount} completed of ${profile.dataCoverage.coursesCount} approved course${profile.dataCoverage.coursesCount === 1 ? '' : 's'}` : 'Course records could not be loaded',
      progressValue: profile.courseProgressPercent,
      icon: <BookOpen size={18} />,
      color: 'var(--neon-cyan)',
    },
    {
      label: 'Course quiz accuracy',
      value: !profile.dataAvailability.assessments
        ? 'Unavailable'
        : profile.dataCoverage.assessmentsCount === 0
          ? 'No attempts'
          : profile.quizAccuracyPercent === null ? 'Score unavailable' : `${profile.quizAccuracyPercent}%`,
      detail: profile.dataAvailability.assessments ? `${profile.dataCoverage.assessmentsCount} recorded attempt${profile.dataCoverage.assessmentsCount === 1 ? '' : 's'}` : 'Quiz records could not be loaded',
      progressValue: profile.quizAccuracyPercent,
      icon: <CheckCircle2 size={18} />,
      color: 'var(--neon-lime)',
    },
    {
      label: 'DSA accepted submissions',
      value: metricValue(profile.dataAvailability.coding, profile.dataCoverage.codingSubmissionsCount, String(profile.dataCoverage.dsaSolvedCount)),
      detail: profile.dataAvailability.coding ? 'Accepted Code Arena submissions, matching the BCE profile count' : 'Coding records could not be loaded',
      progressValue: null,
      icon: <Activity size={18} />,
      color: 'var(--neon-magenta)',
    },
    {
      label: 'Certificates earned',
      value: metricValue(profile.dataAvailability.certificates, profile.dataCoverage.certificatesCount, String(profile.dataCoverage.certificatesCount)),
      detail: profile.dataAvailability.certificates ? 'Issued certificates on this account' : 'Certificate records could not be loaded',
      progressValue: null,
      icon: <Trophy size={18} />,
      color: 'var(--neon-gold)',
    },
    {
      label: 'Badges earned',
      value: metricValue(profile.dataAvailability.badges, profile.dataCoverage.badgesCount, String(profile.dataCoverage.badgesCount)),
      detail: profile.dataAvailability.badges ? 'Badges recorded on this account' : 'Badge records could not be loaded',
      progressValue: null,
      icon: <Award size={18} />,
      color: 'var(--neon-purple)',
    },
    {
      label: 'Coding acceptance rate',
      value: displayMetric(profile.dimensions.coding),
      detail: profile.dimensions.coding.detail,
      progressValue: profile.codingAcceptancePercent,
      icon: <Activity size={18} />,
      color: 'var(--neon-magenta)',
    },
    {
      label: 'Academic profile',
      value: displayMetric(profile.dimensions.academic),
      detail: profile.dimensions.academic.detail,
      progressValue: null,
      icon: <BookOpen size={18} />,
      color: 'var(--neon-cyan)',
    },
    {
      label: 'Skills mastery',
      value: displayMetric(profile.dimensions.skills),
      detail: profile.dimensions.skills.detail,
      progressValue: null,
      icon: <CheckCircle2 size={18} />,
      color: 'var(--neon-lime)',
    },
  ];

  return (
    <Card variant="glass" padding="lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Activity size={22} style={{ color: 'var(--neon-cyan)' }} />
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>Learning Activity</h2>
            <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>Based on saved profile, course, coding, and assessment records</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {syncNotice && <span role="status" className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>{syncNotice}</span>}
          <button type="button" onClick={sync} disabled={isSyncing} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RotateCw size={14} style={{ animation: isSyncing ? 'spin 1s linear infinite' : undefined }} />
            {isSyncing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={() => setIsCollapsed(value => !value)} className="btn btn-secondary btn-sm" aria-expanded={!isCollapsed}>
            {isCollapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div style={{ display: 'grid', gap: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 'var(--space-md)' }}>
            {metrics.map(metric => (
              <div key={metric.label} style={{ minWidth: 0, padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: metric.color, fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                  {metric.icon}<span>{metric.label}</span>
                </div>
                <div style={{ marginTop: 10, color: 'var(--text-primary)', fontSize: '1.4rem', fontWeight: 800, overflowWrap: 'anywhere' }}>{metric.value}</div>
                <div className="text-secondary" style={{ marginTop: 4, fontSize: 'var(--text-xs)' }}>{metric.detail}</div>
                {metric.progressValue !== undefined && metric.progressValue !== null && (
                  <div role="progressbar" aria-label={`${metric.label} ${metric.progressValue}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={metric.progressValue} style={{ height: 5, marginTop: 10, overflow: 'hidden', borderRadius: 999, background: 'var(--bg-elevated)' }}>
                    <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, metric.progressValue))}%`, background: metric.color, borderRadius: 999 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <section style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 'var(--text-md)' }}>Learning readiness</h3>
            <strong className="text-secondary">{displayMetric(profile.readiness)}</strong>
            <p className="text-secondary" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>{profile.readiness.detail}</p>
          </section>

          {(profile.strengths.length > 0 || profile.improvementAreas.length > 0) && (
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 'var(--space-md)' }}>
              {profile.strengths.length > 0 && (
                <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)' }}>
                  <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--text-md)' }}>Strengths from recorded activity</h3>
                  {profile.strengths.map(item => <p key={item.id} style={{ margin: '8px 0 0' }}><strong>{item.label}</strong><span className="text-secondary" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>{item.reason} {item.evidence}</span></p>)}
                </div>
              )}
              {profile.improvementAreas.length > 0 && (
                <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)' }}>
                  <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--text-md)' }}>Areas to improve</h3>
                  {profile.improvementAreas.map(item => <p key={item.id} style={{ margin: '8px 0 0' }}><strong>{item.label}</strong><span className="text-secondary" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>{item.reason} {item.evidence}</span></p>)}
                </div>
              )}
            </section>
          )}

          <section style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--text-md)' }}>Capability targets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'var(--space-sm)' }}>
              {profile.capabilityGaps.map(gap => (
                <div key={gap.id} style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                  <strong>{gap.label}</strong>
                  <p className="text-secondary" style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)' }}>
                    Current: {displayMetric(gap.current)} · Target: {gap.target === null ? 'Not configured' : `${gap.target}%`}{gap.gap === null ? '' : ` · Gap: ${gap.gap > 0 ? '+' : ''}${gap.gap}%`}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {profile.enrolledCoursesData.length > 0 && (
            <section>
              <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--text-md)' }}>Course progress</h3>
              <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                {profile.enrolledCoursesData.map(course => (
                  <Link key={course.id} href={`/courses/${course.id}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', color: 'var(--text-primary)', textDecoration: 'none' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</span>
                    <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>{course.progress}%</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {profile.nextBestAction && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)', padding: 'var(--space-md)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                <Clock3 size={18} style={{ color: 'var(--neon-cyan)', marginTop: 2 }} />
                <div>
                  <strong>{profile.nextBestAction.title}</strong>
                  <p className="text-secondary" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>{profile.nextBestAction.description}</p>
                </div>
              </div>
              <Link href={profile.nextBestAction.actionUrl} className="btn btn-primary btn-sm">{profile.nextBestAction.actionText}</Link>
            </div>
          )}

          {profile.personalizedPlan.length > 0 && (
            <section>
              <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--text-md)' }}>Today’s learning plan</h3>
              <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                {profile.personalizedPlan.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)' }}>
                    <div><strong>{item.title}</strong><div className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>{item.detail}</div></div>
                    <Link href={item.actionUrl} className="btn btn-secondary btn-sm">{item.actionText}</Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!profile.hasSufficientData && (
            <p className="text-secondary" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
              No course, quiz, coding, or badge activity is recorded yet. Metrics will appear after the relevant activity is saved.
            </p>
          )}

          <p className="text-secondary" style={{ margin: 0, fontSize: 'var(--text-xs)' }}>
            Readiness and skill mastery are left unscored until Smart Learn has a validated rubric and stored mastery data.
          </p>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Card>
  );
}
