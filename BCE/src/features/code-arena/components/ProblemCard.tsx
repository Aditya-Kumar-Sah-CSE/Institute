'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Dot, Clock, HardDrive, ExternalLink, Code2 } from 'lucide-react';

export interface ProblemCardData {
  id: string;
  title: string;
  slug?: string;
  difficulty?: string;
  tags?: string[];
  source_type?: string;
  external_platform?: string | null;
  external_problem_id?: string | null;
  external_url?: string | null;
  time_limit_ms?: number | null;
  memory_limit_mb?: number | null;
  constraints?: string | null;
  solvedStatus?: 'solved' | 'attempted' | 'unsolved';
}

function PlatformBadge({ platform }: { platform: string | null | undefined }) {
  const label = platform || 'BCE';
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    CODEFORCES: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    LEETCODE: { bg: 'rgba(234,179,8,0.1)', color: '#facc15', border: 'rgba(234,179,8,0.25)' },
    BCE: { bg: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: 'rgba(6,182,212,0.25)' },
    INTERNAL: { bg: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: 'rgba(6,182,212,0.25)' },
  };
  const c = colors[label] || colors.BCE;
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      ● {label === 'INTERNAL' ? 'BCE' : label}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  const d = difficulty?.toUpperCase() || 'EASY';
  const colors: Record<string, string> = { EASY: 'var(--neon-lime)', MEDIUM: 'var(--neon-gold)', HARD: 'var(--neon-pink)' };
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, color: colors[d] || 'var(--text-muted)' }}>
      ⚡ {d}
    </span>
  );
}

function SolvedStatusIcon({ status }: { status?: string }) {
  if (status === 'solved') return <CheckCircle2 size={16} style={{ color: '#4ade80' }} />;
  if (status === 'attempted') return <Dot size={20} style={{ color: '#facc15' }} />;
  return <Circle size={14} style={{ color: 'var(--text-muted)' }} />;
}

export default function ProblemCard({ problem }: { problem: ProblemCardData }) {
  const timeSec = problem.time_limit_ms ? `${(problem.time_limit_ms / 1000).toFixed(1)}s` : null;
  const memMb = problem.memory_limit_mb ? `${problem.memory_limit_mb} MB` : null;
  const tags = (problem.tags || []).slice(0, 4);

  // Extract rating from constraints if available
  let rating: string | null = null;
  if (problem.constraints) {
    const ratingMatch = problem.constraints.match(/(\d{3,4})\s*Rating/i);
    if (ratingMatch) rating = ratingMatch[1];
  }

  return (
    <div className="hub-problem-card">
      {/* Top Row: Status + Platform */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SolvedStatusIcon status={problem.solvedStatus} />
          <span style={{ fontSize: '10px', color: problem.solvedStatus === 'solved' ? '#4ade80' : problem.solvedStatus === 'attempted' ? '#facc15' : 'var(--text-muted)', fontWeight: 600 }}>
            {problem.solvedStatus === 'solved' ? 'Solved' : problem.solvedStatus === 'attempted' ? 'Attempted' : 'Unsolved'}
          </span>
        </div>
        <PlatformBadge platform={problem.external_platform || problem.source_type} />
      </div>

      {/* Title */}
      <h3 className="hub-card-title">
        {problem.external_problem_id ? `${problem.external_problem_id} — ` : ''}{problem.title}
      </h3>

      {/* Difficulty + Rating Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <DifficultyBadge difficulty={problem.difficulty} />
        {rating && <span style={{ fontSize: '10px', color: 'var(--neon-gold)', fontWeight: 600 }}>{rating} Rating</span>}
        {timeSec && <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> {timeSec}</span>}
        {memMb && <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><HardDrive size={10} /> {memMb}</span>}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <span key={tag} className="hub-tag">{tag}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
        <Link
          href={`/code-arena/problems/${problem.id}`}
          className="hub-solve-btn"
        >
          <Code2 size={13} /> Solve in BCE
        </Link>
        {problem.external_url && (
          <a
            href={problem.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hub-external-link"
            aria-label={`View on ${problem.external_platform || 'external'}`}
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

export { PlatformBadge, DifficultyBadge, SolvedStatusIcon };
