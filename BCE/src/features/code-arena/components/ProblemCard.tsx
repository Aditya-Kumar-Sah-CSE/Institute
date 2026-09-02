'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Dot, Clock, HardDrive, ExternalLink, Code2, Youtube } from 'lucide-react';

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
  const label = platform || 'SL';
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    CODEFORCES: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    LEETCODE: { bg: 'rgba(234,179,8,0.1)', color: '#facc15', border: 'rgba(234,179,8,0.25)' },
    SL: { bg: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: 'rgba(6,182,212,0.25)' },
    BCE: { bg: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: 'rgba(6,182,212,0.25)' },
    INTERNAL: { bg: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: 'rgba(6,182,212,0.25)' },
  };
  const c = colors[label] || colors.SL;
  return (
    <span className="platform-badge-pill" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      ● {label === 'INTERNAL' || label === 'BCE' ? 'SL' : label}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  const d = difficulty?.toUpperCase() || 'EASY';
  const colors: Record<string, string> = { EASY: 'var(--neon-lime)', MEDIUM: 'var(--neon-gold)', HARD: 'var(--neon-pink)' };
  return (
    <span className="difficulty-badge" style={{ color: colors[d] || 'var(--text-muted)' }}>
      ⚡ {d}
    </span>
  );
}

function SolvedStatusIcon({ status }: { status?: string }) {
  if (status === 'solved') return <CheckCircle2 size={16} className="solved-status-icon-styled solved" />;
  if (status === 'attempted') return <Dot size={20} className="solved-status-icon-styled attempted" />;
  return <Circle size={14} className="solved-status-icon-styled" />;
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
      <div className="problem-card-top-row">
        <div className="problem-card-status-wrapper">
          <SolvedStatusIcon status={problem.solvedStatus} />
          <span className={`solved-status-text ${problem.solvedStatus}`}>
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
      <div className="problem-card-meta-row">
        <DifficultyBadge difficulty={problem.difficulty} />
        {rating && <span className="problem-rating-tag">{rating} Rating</span>}
        {timeSec && <span className="problem-limit-tag"><Clock size={10} /> {timeSec}</span>}
        {memMb && <span className="problem-limit-tag"><HardDrive size={10} /> {memMb}</span>}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="problem-card-tags-wrapper">
          {tags.map((tag) => (
            <span key={tag} className="hub-tag">{tag}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="problem-card-action-row">
        <Link
          href={`/code-arena/problems/${problem.id}`}
          className="hub-solve-btn"
        >
          <Code2 size={13} /> Solve in SL
        </Link>
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(problem.title || problem.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hub-external-link"
          aria-label="Ask YT - Search on YouTube"
          title="Ask YT - Search on YouTube"
          style={{ color: '#ef4444' }}
        >
          <Youtube size={13} />
        </a>
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
