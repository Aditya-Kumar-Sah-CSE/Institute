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

  const metrics = [
    {
      label: 'Average course progress',
      value: metricValue(profile.dataAvailability.courses, profile.dataCoverage.coursesCount, profile.courseProgressPercent === null ? 'Unavailable' : `${profile.courseProgressPercent}%`),
      detail: profile.dataAvailability.courses ? `${profile.dataCoverage.coursesCount} enrolled course${profile.dataCoverage.coursesCount === 1 ? '' : 's'}` : 'Course records could not be loaded',
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
      icon: <CheckCircle2 size={18} />,
      color: 'var(--neon-lime)',
    },
    {
      label: 'DSA problems solved',
      value: metricValue(profile.dataAvailability.coding, profile.dataCoverage.dsaSolvedCount, String(profile.dataCoverage.dsaSolvedCount)),
      detail: profile.dataAvailability.coding ? 'Unique solved problems in coding sheets' : 'Coding records could not be loaded',
      icon: <Activity size={18} />,
      color: 'var(--neon-magenta)',
    },
    {
      label: 'Certificates earned',
      value: metricValue(profile.dataAvailability.certificates, profile.dataCoverage.certificatesCount, String(profile.dataCoverage.certificatesCount)),
      detail: profile.dataAvailability.certificates ? 'Issued certificates on this account' : 'Certificate records could not be loaded',
      icon: <Trophy size={18} />,
      color: 'var(--neon-gold)',
    },
    {
      label: 'Badges earned',
      value: metricValue(profile.dataAvailability.badges, profile.dataCoverage.badgesCount, String(profile.dataCoverage.badgesCount)),
      detail: profile.dataAvailability.badges ? 'Badges recorded on this account' : 'Badge records could not be loaded',
      icon: <Award size={18} />,
      color: 'var(--neon-purple)',
    },
  ];

  return (
    <Card variant="glass" padding="lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Activity size={22} style={{ color: 'var(--neon-cyan)' }} />
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>Learning Activity</h2>
            <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>Only recorded course, quiz, and coding data</span>
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
              </div>
            ))}
          </div>

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

          {!profile.hasSufficientData && (
            <p className="text-secondary" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
              No course, quiz, or coding activity is recorded yet. Metrics will appear after your first recorded activity.
            </p>
          )}

          <p className="text-secondary" style={{ margin: 0, fontSize: 'var(--text-xs)' }}>
            Empty or unavailable data is shown as such; no combined readiness score or inferred skill rating is calculated.
          </p>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Card>
  );
}
