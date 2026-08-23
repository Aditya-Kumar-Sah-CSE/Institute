'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BarChart2, Users, Download, X, Loader2, CheckCircle2, Trophy, Clock, Search } from 'lucide-react';
import BattleAnalyticsView from './BattleAnalyticsView';

interface BattleAnalyticsModalProps {
  battle: any;
  currentUser: any;
  isInstructor: boolean;
  onClose: () => void;
}

export default function BattleAnalyticsModal({
  battle,
  currentUser,
  isInstructor,
  onClose,
}: BattleAnalyticsModalProps) {
  const [loading, setLoading] = useState(true);
  const [battleDetails, setBattleDetails] = useState<any>(battle);
  const [participants, setParticipants] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        setLoading(true);
        // 1. Fetch full battle & problem details
        const battleRes = await fetch(`/api/coding/battles/${battle.id}`);
        const battleJson = await battleRes.json();
        if (battleJson.success && battleJson.data && isMounted) {
          setBattleDetails(battleJson.data);
          const rawProbs = battleJson.data.coding_battle_problems || [];
          setProblems(rawProbs.map((bp: any) => bp.coding_problems || { title: 'Problem', difficulty: 'MEDIUM' }));
        }

        // 2. Fetch participants & teams
        const teamsRes = await fetch(`/api/coding/battles/${battle.id}/teams`);
        const teamsJson = await teamsRes.json();
        if (teamsJson.success && isMounted) {
          const allParticipants: any[] = [];

          // Add team members
          (teamsJson.teams || []).forEach((team: any) => {
            (team.members || []).forEach((m: any) => {
              allParticipants.push({
                ...m,
                team_name: team.name,
              });
            });
          });

          // Add solo participants
          (teamsJson.soloParticipants || []).forEach((sp: any) => {
            allParticipants.push({
              ...sp,
              team_name: 'Solo (Individual)',
            });
          });

          setParticipants(allParticipants);
        }

        // 3. Fetch submissions/leaderboard for performance breakdown
        const lbRes = await fetch(`/api/coding/battles/${battle.id}/leaderboard`);
        const lbJson = await lbRes.json();
        if (lbJson.success && isMounted) {
          setSubmissions(lbJson.submissions || []);
        }
      } catch (err) {
        console.error('Failed to load battle analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [battle.id]);

  // CSV Export function
  const handleExportCSV = () => {
    if (participants.length === 0) {
      alert('No registered participants to export.');
      return;
    }

    const headers = ['Student Name', 'Email', 'Team Name', 'Score', 'Status'];
    const rows = participants.map((p) => [
      `"${p.profiles?.full_name || 'Student'}"`,
      `"${p.profiles?.email || 'N/A'}"`,
      `"${p.team_name || 'Solo'}"`,
      p.score || 0,
      p.score > 0 ? 'Active Solver' : 'Registered',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${battleDetails?.title || 'battle'}_registrations_analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredParticipants = participants.filter((p) => {
    const name = p.profiles?.full_name?.toLowerCase() || '';
    const email = p.profiles?.email?.toLowerCase() || '';
    const team = p.team_name?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q) || team.includes(q);
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1100,
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Card
        variant="glass"
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          background: 'var(--bg-elevated, #0b0f19)',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} className="text-neon-cyan" />
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }} className="text-gradient">
                Battle Analytics & Registration Roster
              </h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {battleDetails?.title} • Join Code: <strong style={{ color: 'var(--neon-gold)' }}>{battleDetails?.join_code}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button size="sm" variant="secondary" onClick={handleExportCSV} disabled={loading || participants.length === 0}>
              <Download size={14} /> Export CSV
            </Button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--neon-cyan)' }} />
              <div>Fetching Battle Registrations & Performance...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <Card style={{ padding: '16px', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                  <Users size={20} style={{ color: 'var(--neon-cyan)', marginBottom: '4px' }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Registered Students</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                    {participants.length} / {battleDetails.max_participants || 25}
                  </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <Trophy size={20} style={{ color: 'var(--neon-purple)', marginBottom: '4px' }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mode & Teams</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--neon-purple)' }}>
                    {battleDetails.team_mode ? 'Team Play Mode' : 'Individual Solo'}
                  </div>
                </Card>

                <Card style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <CheckCircle2 size={20} style={{ color: 'var(--neon-emerald)', marginBottom: '4px' }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Submissions</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--neon-emerald)' }}>
                    {submissions.length}
                  </div>
                </Card>
              </div>

              {/* Roster Search Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                  Registered Participants List ({filteredParticipants.length})
                </h3>

                <div style={{ position: 'relative', minWidth: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search name, email or team..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 12px 6px 30px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--glass-border)',
                      color: '#fff',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Participants Roster Table */}
              {filteredParticipants.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--glass-border)', borderRadius: '10px' }}>
                  No registered participants found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--glass-border)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px 14px' }}>#</th>
                        <th style={{ padding: '10px 14px' }}>Student Name</th>
                        <th style={{ padding: '10px 14px' }}>Email</th>
                        <th style={{ padding: '10px 14px' }}>Registration Mode</th>
                        <th style={{ padding: '10px 14px' }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipants.map((p, idx) => (
                        <tr key={p.student_id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                            {p.profiles?.full_name || 'Student'}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                            {p.profiles?.email || 'N/A'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                background: p.team_name?.includes('Solo') ? 'rgba(6, 182, 212, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                color: p.team_name?.includes('Solo') ? 'var(--neon-cyan)' : 'var(--neon-purple)',
                                fontWeight: 700,
                              }}
                            >
                              {p.team_name || 'Solo'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--neon-gold)' }}>
                            {p.score || 0} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Performance Breakdown Component */}
              <div style={{ marginTop: '12px' }}>
                <BattleAnalyticsView
                  battle={battleDetails}
                  problems={problems}
                  participants={participants}
                  submissions={submissions}
                  currentUser={currentUser}
                  isInstructor={isInstructor}
                  onBack={onClose}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
