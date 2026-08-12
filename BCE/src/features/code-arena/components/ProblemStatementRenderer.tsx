'use client';

import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  ListChecks,
  ArrowDownToLine,
  ArrowUpFromLine,
  Braces,
  ExternalLink,
  Copy,
  Check,
  Clock,
  HardDrive,
  Award,
  Tag,
  AlertCircle,
} from 'lucide-react';

export interface ProblemSample {
  input: string;
  expected_output?: string;
  output?: string;
  sample_name?: string | null;
  explanation?: string | null;
}

export interface ProblemData {
  id: string;
  title: string;
  difficulty?: string;
  rating?: number | null;
  source_type?: string | null;
  external_platform?: string | null;
  external_url?: string | null;
  sourceUrl?: string | null;
  external_id?: string | null;
  externalProblemId?: string | null;
  description?: string;
  statement?: string;
  constraints?: string | null;
  input_format?: string | null;
  inputDescription?: string | null;
  output_format?: string | null;
  outputDescription?: string | null;
  time_limit_ms?: number | null;
  timeLimit?: string | null;
  memory_limit_mb?: number | null;
  memoryLimit?: string | null;
  tags?: string[];
  samples?: ProblemSample[];
  examples?: ProblemSample[];
}

export function ExampleCopyBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '6px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--glass-border)',
            color: copied ? 'var(--neon-emerald)' : 'var(--text-muted)',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          title="Copy code block"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          fontFamily: 'monospace',
          fontSize: '13px',
          lineHeight: '1.5',
          margin: 0,
          whiteSpace: 'pre-wrap',
          overflowX: 'auto',
          color: 'var(--text-main)',
        }}
      >
        {content}
      </pre>
    </div>
  );
}

// Client-side HTML / Markdown content renderer
function SafeContentRenderer({ rawContent }: { rawContent: string }) {
  if (!rawContent || !rawContent.trim()) {
    return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided.</span>;
  }

  const trimmed = rawContent.trim();
  const hasHtml = /<[a-z][\s\S]*>/i.test(trimmed);

  if (hasHtml && typeof window !== 'undefined') {
    const cleanHtml = DOMPurify.sanitize(trimmed, {
      ADD_TAGS: ['iframe', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
      ADD_ATTR: ['target', 'rel', 'colspan', 'rowspan'],
    });
    return (
      <div
        className="problem-statement-body"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
        style={{ fontSize: 'var(--text-sm)', lineHeight: '1.65', color: 'var(--text-main)' }}
      />
    );
  }

  // Fallback to Markdown or plain text
  return (
    <div className="problem-statement-body" style={{ fontSize: 'var(--text-sm)', lineHeight: '1.65', color: 'var(--text-main)' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
    </div>
  );
}

export default function ProblemStatementRenderer({ problem }: { problem: ProblemData }) {
  const platformName = problem.source_type || problem.external_platform || 'INTERNAL';
  const difficultyClass = `difficulty-${problem.difficulty?.toUpperCase() || 'EASY'}`;
  const externalId = problem.external_id || problem.externalProblemId;
  const officialUrl = problem.external_url || problem.sourceUrl;

  const rawStatement = problem.statement || problem.description || '';
  const rawConstraints = problem.constraints || '';
  const rawInputDesc = problem.inputDescription || problem.input_format || '';
  const rawOutputDesc = problem.outputDescription || problem.output_format || '';

  const examplesList = problem.examples && problem.examples.length > 0 ? problem.examples : problem.samples || [];

  const timeSec = problem.timeLimit
    ? problem.timeLimit
    : problem.time_limit_ms
    ? `${(problem.time_limit_ms / 1000).toFixed(1)}s`
    : '2.0s';
  const memMb = problem.memoryLimit
    ? problem.memoryLimit
    : problem.memory_limit_mb
    ? `${problem.memory_limit_mb} MB`
    : '256 MB';

  const tags = problem.tags || [];
  const isContentEmpty = !rawStatement.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Polished Problem Header */}
      <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 'var(--space-md)' }}>
        {/* Badges Bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span className={difficultyClass} style={{ fontWeight: 700, fontSize: 'var(--text-xs)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
            ⚡ {problem.difficulty || 'EASY'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
            ● {platformName}
          </span>
          {problem.rating && (
            <span style={{ fontSize: '11px', color: 'var(--neon-gold)', background: 'rgba(234,179,8,0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
              <Award size={12} style={{ display: 'inline', marginRight: '3px' }} />
              {problem.rating} Rating
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {timeSec}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <HardDrive size={12} /> {memMb}
          </span>
        </div>

        {/* Problem Title & ID */}
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: '4px 0 8px 0', color: 'var(--text-main)' }}>
          {externalId ? `${externalId} — ` : ''}{problem.title}
        </h1>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0 10px 0' }}>
            {tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--glass-border)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Tag size={10} /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* Secondary External Link */}
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: 'var(--neon-cyan)',
              textDecoration: 'none',
              transition: 'opacity 0.15s ease',
            }}
            aria-label={`View original problem on ${platformName}`}
          >
            View original problem on {platformName} <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* Fallback Warning if Content Missing */}
      {isContentEmpty && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: 'var(--text-sm)',
          }}
        >
          <AlertCircle size={18} />
          <div>
            <strong>Problem Content Unavailable</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Source: {platformName} {externalId ? `| Problem ID: ${externalId}` : ''}. Re-import the problem to refresh data.
            </p>
          </div>
        </div>
      )}

      {/* Problem Statement Section */}
      {!isContentEmpty && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            <FileText size={14} style={{ color: 'var(--neon-cyan)' }} /> Problem Statement
          </div>
          <SafeContentRenderer rawContent={rawStatement} />
        </section>
      )}

      {/* Constraints Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <ListChecks size={14} style={{ color: 'var(--neon-gold)' }} /> Constraints
        </div>
        {rawConstraints ? (
          <pre
            style={{
              fontSize: '12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              whiteSpace: 'pre-wrap',
              margin: 0,
              fontFamily: 'monospace',
            }}
          >
            {rawConstraints}
          </pre>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided by source.</span>
        )}
      </section>

      {/* Input Format Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <ArrowDownToLine size={14} style={{ color: 'var(--neon-cyan)' }} /> Input Format
        </div>
        <SafeContentRenderer rawContent={rawInputDesc} />
      </section>

      {/* Output Format Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <ArrowUpFromLine size={14} style={{ color: 'var(--neon-emerald)' }} /> Output Format
        </div>
        <SafeContentRenderer rawContent={rawOutputDesc} />
      </section>

      {/* Examples / Samples Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'var(--space-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <Braces size={14} style={{ color: 'var(--neon-pink)' }} /> Examples ({examplesList.length})
        </div>

        {examplesList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {examplesList.map((sample, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--neon-cyan)', display: 'block', marginBottom: '6px' }}>
                  {sample.sample_name || `Example ${idx + 1}`}
                </span>
                <ExampleCopyBlock label="Input" content={sample.input} />
                <ExampleCopyBlock label="Output" content={sample.output || sample.expected_output || ''} />
                {sample.explanation && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-muted)' }}>Explanation: </strong> {sample.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No sample cases available.</span>
        )}
      </section>
    </div>
  );
}
