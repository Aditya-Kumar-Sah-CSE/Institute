'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BarChart2, Users, Trophy, CheckCircle2, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';

interface BattleAnalyticsViewProps {
  battle: any;
  problems: any[];
  participants: any[];
  submissions: any[];
  currentUser: any;
  isInstructor: boolean;
  onBack: () => void;
}

export default function BattleAnalyticsView({
  battle,
  problems,
  participants,
  submissions,
  currentUser,
  isInstructor,
  onBack,
}: BattleAnalyticsViewProps) {
  const isFacultyOrHost = isInstructor || battle.created_by === currentUser?.id;

  // Student analytics calculations
  const mySubmissions = submissions.filter((s) => s.student_id === currentUser?.id);
  const myAccepted = mySubmissions.filter((s) => s.status === 'ACCEPTED');
  const myWrong = mySubmissions.filter((s) => s.status === 'WRONG_ANSWER' || s.status === 'RUNTIME_ERROR' || s.status === 'COMPILATION_ERROR');
  const uniqueSolvedIds = new Set(myAccepted.map((s) => s.problem_id));
  const myAccuracy = mySubmissions.length > 0 ? Math.round((myAccepted.length / mySubmissions.length) * 100) : 0;
  
  const totalExecTime = mySubmissions.reduce((acc, s) => acc + (s.execution_time_ms || 0), 0);
  const avgExecTime = mySubmissions.length > 0 ? Math.round(totalExecTime / mySubmissions.length) : 0;

  // Faculty class analytics calculations
  const totalParticipants = participants.length;
  const totalScores = participants.reduce((acc, p) => acc + (p.score || 0), 0);
  const avgScore = totalParticipants > 0 ? Math.round(totalScores / totalParticipants) : 0;
  const topScore = participants.length > 0 ? Math.max(...participants.map((p) => p.score || 0)) : 0;

  // Problem-wise solve rate analytics
  const problemStats = problems.map((prob) => {
    const probSubmissions = submissions.filter((s) => s.problem_id === prob.id);
    const solvedUserIds = new Set(probSubmissions.filter((s) => s.status === 'ACCEPTED').map((s) => s.student_id));
    const solveRate = totalParticipants > 0 ? Math.round((solvedUserIds.size / totalParticipants) * 100) : 0;
    const avgAttempts = solvedUserIds.size > 0 ? (probSubmissions.length / solvedUserIds.size).toFixed(1) : '0.0';

    return {
      id: prob.id,
      title: prob.title,
      difficulty: prob.difficulty,
      totalSubmissions: probSubmissions.length,
      solvedCount: solvedUserIds.size,
      solveRate,
      avgAttempts,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--neon-cyan)', fontWeight: 700 }}>
            <BarChart2 size={16} /> BATTLE PERFORMANCE ANALYTICS
          </div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: '2px 0' }}>
            {battle.title}
          </h2>
        </div>

        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Battle Room
        </Button>
      </div>

      {isFacultyOrHost ? (
        /* FACULTY ANALYTICS PANEL */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            <Card style={{ padding: 'var(--space-md)' }}>
              <Users size={18} style={{ color: 'var(--neon-cyan)', marginBottom: '4px' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Participants</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>{totalParticipants}</div>
            </Card>

            <Card style={{ padding: 'var(--space-md)' }}>
              <Trophy size={18} style={{ color: '#eab308', marginBottom: '4px' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Top Score</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#eab308' }}>{topScore} pts</div>
            </Card>

            <Card style={{ padding: 'var(--space-md)' }}>
              <BarChart2 size={18} style={{ color: 'var(--neon-purple)', marginBottom: '4px' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Average Class Score</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--neon-purple)' }}>{avgScore} pts</div>
            </Card>

            <Card style={{ padding: 'var(--space-md)' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--neon-emerald)', marginBottom: '4px' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Submissions</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--neon-emerald)' }}>{submissions.length}</div>
            </Card>
          </div>

          {/* Problem Solve Rate Breakdown Table */}
          <Card style={{ padding: 'var(--space-lg)', overflowX: 'auto' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 800, marginBottom: 'var(--space-md)' }}>
              Problem-wise Solve Rates
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Problem Title</th>
                  <th style={{ padding: '8px 12px' }}>Difficulty</th>
                  <th style={{ padding: '8px 12px' }}>Solved / Total</th>
                  <th style={{ padding: '8px 12px' }}>Solve Rate</th>
                  <th style={{ padding: '8px 12px' }}>Avg Attempts</th>
                </tr>
              </thead>
              <tbody>
                {problemStats.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{p.title}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          background: p.difficulty === 'EASY' ? 'rgba(16,185,129,0.15)' : p.difficulty === 'MEDIUM' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          color: p.difficulty === 'EASY' ? 'var(--neon-emerald)' : p.difficulty === 'MEDIUM' ? '#f59e0b' : '#f87171',
                          fontWeight: 700,
                        }}
                      >
                        {p.difficulty}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>
                      {p.solvedCount} / {totalParticipants}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '80px',
                            height: '6px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${p.solveRate}%`,
                              height: '100%',
                              background: 'var(--neon-cyan)',
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)' }}>{p.solveRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{p.avgAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Participant Roster Details for Instructor */}
          <Card style={{ padding: 'var(--space-lg)', overflowX: 'auto' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 800, marginBottom: 'var(--space-md)' }}>
              Participant Activity & Submissions
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Name</th>
                  <th style={{ padding: '8px 12px' }}>Email</th>
                  <th style={{ padding: '8px 12px' }}>Score</th>
                  <th style={{ padding: '8px 12px' }}>Activity Status</th>
                  <th style={{ padding: '8px 12px' }}>Joined At</th>
                  <th style={{ padding: '8px 12px' }}>Last Solve</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((pt, idx) => {
                  const studentEmail = pt.profiles?.email || 'N/A';
                  const studentName = pt.profiles?.full_name || pt.student?.full_name || `Student #${idx+1}`;
                  
                  // Active status defined as having submitted within this battle context
                  const hasSubmissions = submissions.some(s => s.student_id === (pt.student_id || pt.profiles?.id));
                  const statusColor = hasSubmissions ? 'var(--neon-emerald)' : '#9ca3af';
                  const statusText = hasSubmissions ? 'Active solver' : 'No submissions';

                  return (
                    <tr key={pt.student_id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{studentName}</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{studentEmail}</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: 'var(--neon-cyan)' }}>{pt.score || 0} pts</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} />
                          {statusText}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {pt.joined_at ? new Date(pt.joined_at).toLocaleTimeString() : '--'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {pt.finished_at ? new Date(pt.finished_at).toLocaleTimeString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      ) : (
        /* STUDENT PERSONAL ANALYTICS PANEL */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'var(--space-md)',
            }}
          >
            <Card style={{ padding: 'var(--space-md)' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--neon-emerald)', marginBottom: '4px' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Problems Solved</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--neon-emerald)' }}>
                {uniqueSolvedIds.size} / {problems.length}
              </div>
            </Card>

            <Card style={{ padding: 'var(--space-md)' }}>
              <BarChart2 size={18} style={{ color: 'var(--neon-cyan)', marginBottom: '4px' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Accuracy</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--neon-cyan)' }}>{myAccuracy}%</div>
            </Card>

            <Card style={{ padding: 'var(--space-md)' }}>
              <AlertTriangle size={18} style={{ color: '#f59e0b', marginBottom: '4px' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Wrong Attempts</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#f59e0b' }}>{myWrong.length}</div>
            </Card>

            <Card style={{ padding: 'var(--space-md)' }}>
              <Clock size={18} style={{ color: 'var(--neon-purple)', marginBottom: '4px' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Avg Execution Time</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--neon-purple)' }}>{avgExecTime} ms</div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
