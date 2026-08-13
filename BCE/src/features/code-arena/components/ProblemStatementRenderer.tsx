'use client';

import { useState } from 'react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeLanguage } from '../types';
import {
  FileText,
  ListChecks,
  Braces,
  ExternalLink,
  Copy,
  Check,
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
  explanation?: string | null;
  hasSolved?: boolean;
  hasAttempted?: boolean;
  supported_languages?: CodeLanguage[];
  external_problem_id?: string | null;
  externalId?: string | null;
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
  let contentToRender = trimmed;
  // Strip the entire header section if present to avoid duplicating limits
  contentToRender = contentToRender.replace(/<div class="header">[\s\S]*?<\/div>\s*(?=<div>|<div class="legend">|<div class="input-specification">|<div class="sample-tests">|<div class="sample-test">|<p>)/i, '');
  // Replace relative URLs to Codeforces assets
  contentToRender = contentToRender.replace(/src="\/(predownloaded|images|assets)\/([^"]+)"/g, 'src="https://codeforces.com/$1/$2"');
  contentToRender = contentToRender.replace(/src='\/(predownloaded|images|assets)\/([^']+)'/g, "src='https://codeforces.com/$1/$2'");

  const hasHtml = /<[a-z][\s\S]*>/i.test(contentToRender);

  if (hasHtml) {
    // DOMPurify may produce slightly different output on server vs client.
    // Use suppressHydrationWarning to gracefully handle the difference.
    let cleanHtml = contentToRender;
    if (typeof window !== 'undefined') {
      cleanHtml = DOMPurify.sanitize(contentToRender, {
        ADD_TAGS: ['iframe', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
        ADD_ATTR: ['target', 'rel', 'colspan', 'rowspan'],
      });
    }
    return (
      <div
        className="problem-statement-body"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
        style={{ fontSize: 'var(--text-sm)', lineHeight: '1.65', color: 'var(--text-main)' }}
      />
    );
  }

  // Fallback to Markdown or plain text
  return (
    <div className="problem-statement-body" style={{ fontSize: 'var(--text-sm)', lineHeight: '1.65', color: 'var(--text-main)' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentToRender}</ReactMarkdown>
    </div>
  );
}

export default function ProblemStatementRenderer({ problem }: { problem: ProblemData }) {
  const platformName = problem.source_type || problem.external_platform || 'INTERNAL';

  const externalId = problem.external_id || problem.externalProblemId;
  const officialUrl = problem.external_url || problem.sourceUrl;

  const rawStatement = problem.statement || problem.description || '';
  const rawConstraints = problem.constraints || '';

  const examplesList = problem.examples && problem.examples.length > 0 ? problem.examples : problem.samples || [];


  const tags = problem.tags || [];
  const isContentEmpty = !rawStatement.trim();

  const getDifficultyBadgeStyle = (diff?: string) => {
    const uppercase = (diff || 'EASY').toUpperCase();
    if (uppercase === 'HARD') {
      return {
        color: '#f43f5e',
        background: 'rgba(244,63,94,0.08)',
        border: '1px solid rgba(244,63,94,0.3)',
        boxShadow: '0 0 10px rgba(244,63,94,0.15)',
      };
    }
    if (uppercase === 'MEDIUM') {
      return {
        color: '#facc15',
        background: 'rgba(250,204,21,0.08)',
        border: '1px solid rgba(250,204,21,0.3)',
        boxShadow: '0 0 10px rgba(250,204,21,0.12)',
      };
    }
    return {
      color: '#4ade80',
      background: 'rgba(74,222,128,0.08)',
      border: '1px solid rgba(74,222,128,0.3)',
      boxShadow: '0 0 10px rgba(74,222,128,0.12)',
    };
  };

  const getPlatformBadgeStyle = (plat: string) => {
    const key = plat.toUpperCase();
    if (key === 'CODEFORCES') {
      return {
        color: '#ee5b5b',
        background: 'rgba(238,91,91,0.08)',
        border: '1px solid rgba(238,91,91,0.25)',
      };
    }
    if (key === 'LEETCODE') {
      return {
        color: '#ffa116',
        background: 'rgba(255,161,22,0.08)',
        border: '1px solid rgba(255,161,22,0.25)',
      };
    }
    return {
      color: '#06b6d4',
      background: 'rgba(6,182,212,0.08)',
      border: '1px solid rgba(6,182,212,0.25)',
    };
  };

  const diffStyle = getDifficultyBadgeStyle(problem.difficulty);
  const platStyle = getPlatformBadgeStyle(platformName);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Polished Problem Header */}
      <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 'var(--space-md)' }}>
        {/* Badges Bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{ fontWeight: 750, fontSize: '11px', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', ...diffStyle }}>
            ⚡ {problem.difficulty || 'EASY'}
          </span>
          <span style={{ fontWeight: 750, fontSize: '11px', padding: '4px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', ...platStyle }}>
            ● {platformName}
          </span>
          {problem.rating && (
            <span style={{ fontSize: '11px', color: 'var(--neon-gold)', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
              <Award size={12} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />
              {problem.rating} Rating
            </span>
          )}

          {problem.hasSolved && (
            <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ✓ Solved
            </span>
          )}
          {!problem.hasSolved && problem.hasAttempted && (
            <span style={{ fontSize: '11px', color: '#ee7700', background: 'rgba(238,119,0,0.08)', border: '1px solid rgba(238,119,0,0.25)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ● Attempted
            </span>
          )}
        </div>

        {/* Problem Title & ID */}
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: '4px 0 8px 0', color: 'var(--text-main)' }}>
          {problem.title.startsWith(externalId || '___') ? problem.title : `${externalId ? `${externalId} — ` : ''}${problem.title}`}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderLeft: '3px solid var(--neon-cyan)', paddingLeft: '10px', letterSpacing: '0.5px' }}>
            <FileText size={14} style={{ color: 'var(--neon-cyan)' }} /> Problem Statement
          </div>
          <SafeContentRenderer rawContent={rawStatement} />
        </section>
      )}

      {/* Constraints Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderLeft: '3px solid var(--neon-gold)', paddingLeft: '10px', letterSpacing: '0.5px' }}>
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



      {/* Notes / Explanation Section */}
      {problem.explanation && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderLeft: '3px solid var(--neon-purple)', paddingLeft: '10px', letterSpacing: '0.5px' }}>
            <FileText size={14} style={{ color: 'var(--neon-purple)' }} /> Notes (Explanation)
          </div>
          <SafeContentRenderer rawContent={problem.explanation} />
        </section>
      )}

      {/* Examples / Samples Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'var(--space-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderLeft: '3px solid var(--neon-pink)', paddingLeft: '10px', letterSpacing: '0.5px' }}>
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
