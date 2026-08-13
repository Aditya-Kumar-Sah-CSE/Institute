'use client';

import { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // First, style normal paragraphs
    const paragraphs = containerRef.current.querySelectorAll('p');
    const colors = [
      'var(--neon-cyan)',
      '#a855f7', // light purple
      'var(--neon-gold)',
      'var(--neon-pink)',
      '#3b82f6', // blue
      '#10b981', // emerald
      '#fb923c', // orange
      '#f43f5e', // rose
    ];
    paragraphs.forEach((p, idx) => {
      p.style.color = colors[idx % colors.length];
      p.style.textShadow = '0 0 1px rgba(0,0,0,0.5)';
      p.style.transition = 'color 0.3s ease';
    });

    // Style the structured spec divs if present (standard Codeforces HTML structure)
    const inputSpecs = containerRef.current.querySelectorAll('.input-specification');
    inputSpecs.forEach(el => {
      (el as HTMLElement).style.background = 'rgba(6, 182, 212, 0.03)';
      (el as HTMLElement).style.borderLeft = '4px solid var(--neon-cyan)';
      (el as HTMLElement).style.borderRadius = '4px';
      (el as HTMLElement).style.padding = '12px 16px';
      (el as HTMLElement).style.margin = '16px 0';
      
      const title = el.querySelector('.section-title');
      if (title) {
        (title as HTMLElement).style.color = 'var(--neon-cyan)';
        (title as HTMLElement).style.fontSize = '15px';
        (title as HTMLElement).style.fontWeight = '800';
        (title as HTMLElement).style.marginBottom = '8px';
      }
      
      const paras = el.querySelectorAll('p');
      paras.forEach(p => {
        p.style.color = '#22d3ee';
      });
    });

    const outputSpecs = containerRef.current.querySelectorAll('.output-specification');
    outputSpecs.forEach(el => {
      (el as HTMLElement).style.background = 'rgba(236, 72, 153, 0.03)';
      (el as HTMLElement).style.borderLeft = '4px solid var(--neon-pink)';
      (el as HTMLElement).style.borderRadius = '4px';
      (el as HTMLElement).style.padding = '12px 16px';
      (el as HTMLElement).style.margin = '16px 0';
      
      const title = el.querySelector('.section-title');
      if (title) {
        (title as HTMLElement).style.color = 'var(--neon-pink)';
        (title as HTMLElement).style.fontSize = '15px';
        (title as HTMLElement).style.fontWeight = '800';
        (title as HTMLElement).style.marginBottom = '8px';
      }
      
      const paras = el.querySelectorAll('p');
      paras.forEach(p => {
        p.style.color = '#f472b6';
      });
    });

    // Fallback scanner for flat text structures (e.g. Markdown headers)
    const allElements = Array.from(containerRef.current.querySelectorAll('*'));
    let inInputSec = false;
    let inOutputSec = false;
    
    allElements.forEach(el => {
      const text = el.textContent?.trim();
      const tagName = el.tagName.toLowerCase();
      
      // Ignore scanning if we are inside already styled spec containers
      if (el.closest('.input-specification') || el.closest('.output-specification')) {
        return;
      }
      
      const isHeader = (tagName === 'div' && el.classList.contains('section-title')) || 
          tagName === 'h3' || tagName === 'h4' || tagName === 'strong' || tagName === 'b';
          
      if (isHeader) {
        if (text === 'Input') {
          inInputSec = true;
          inOutputSec = false;
          (el as HTMLElement).style.color = 'var(--neon-cyan)';
          (el as HTMLElement).style.fontSize = '15px';
          (el as HTMLElement).style.fontWeight = '800';
          (el as HTMLElement).style.display = 'block';
          (el as HTMLElement).style.marginTop = '20px';
          (el as HTMLElement).style.marginBottom = '10px';
          (el as HTMLElement).style.borderLeft = '3px solid var(--neon-cyan)';
          (el as HTMLElement).style.paddingLeft = '8px';
          return;
        } else if (text === 'Output') {
          inInputSec = false;
          inOutputSec = true;
          (el as HTMLElement).style.color = 'var(--neon-pink)';
          (el as HTMLElement).style.fontSize = '15px';
          (el as HTMLElement).style.fontWeight = '800';
          (el as HTMLElement).style.display = 'block';
          (el as HTMLElement).style.marginTop = '20px';
          (el as HTMLElement).style.marginBottom = '10px';
          (el as HTMLElement).style.borderLeft = '3px solid var(--neon-pink)';
          (el as HTMLElement).style.paddingLeft = '8px';
          return;
        } else if (text === 'Note' || text === 'Examples' || text === 'Example') {
          inInputSec = false;
          inOutputSec = false;
        }
      }
      
      if (el.tagName.toLowerCase() === 'table' || el.classList.contains('sample-tests') || el.classList.contains('sample-test')) {
        inInputSec = false;
        inOutputSec = false;
      }
      
      if (tagName === 'p' || (tagName === 'div' && !el.children.length)) {
        if (inInputSec) {
          (el as HTMLElement).style.color = '#22d3ee';
        } else if (inOutputSec) {
          (el as HTMLElement).style.color = '#f472b6';
        }
      }
    });
  }, [rawContent]);

  if (!rawContent || !rawContent.trim()) {
    return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided.</span>;
  }

  const trimmed = rawContent.trim();
  let contentToRender = trimmed;
  // Strip the entire header section if present to avoid duplicating limits
  contentToRender = contentToRender.replace(/<div\s+class=["']header["']>[\s\S]*?<\/div>/gi, '');
  // Clean up any residual limit/input/output blocks from raw content
  contentToRender = contentToRender.replace(/<div\s+class=["'](?:time-limit|memory-limit|input-file|output-file)["']>[\s\S]*?<\/div>\s*[^<]*<\/div>/gi, '');
  contentToRender = contentToRender.replace(/<div\s+class=["'](?:time-limit|memory-limit|input-file|output-file)["']>[\s\S]*?<\/div>/gi, '');
  contentToRender = contentToRender.replace(/<div[^>]*>\s*(?:time limit per test|memory limit per test|input|output|stdin|stdout|standard input|standard output|seconds|megabytes)\s*<\/div>/gi, '');
  contentToRender = contentToRender.replace(/<(?:p|div|span)[^>]*>\s*(?:stdin|stdout|standard input|standard output|time limit per test|memory limit per test|input|output|2 seconds|256 megabytes)\s*<\/(?:p|div|span)>/gi, '');
  contentToRender = contentToRender.replace(/^[ \t]*(?:stdin|stdout|standard input|standard output|time limit per test|memory limit per test|seconds|megabytes|2 seconds|256 megabytes)\b[ \t]*$/gim, '');
  contentToRender = contentToRender.replace(/(?:time limit per test|memory limit per test|input|output)\s*(?:1 second|2 seconds|1\.0 second|2\.0 seconds|256 megabytes|512 megabytes|stdin|stdout|standard input|standard output)?\s*/gi, '');
  contentToRender = contentToRender.replace(/^\s*(?:1 second|2 seconds|1\.0 second|2\.0 seconds|256 megabytes|512 megabytes|stdin|stdout|standard input|standard output)\s*$/gim, '');
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
        ref={containerRef}
        className="problem-statement-body"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
        style={{ fontSize: 'var(--text-sm)', lineHeight: '1.65', color: 'var(--text-main)' }}
      />
    );
  }

  // Fallback to Markdown or plain text
  return (
    <div ref={containerRef} className="problem-statement-body" style={{ fontSize: 'var(--text-sm)', lineHeight: '1.65', color: 'var(--text-main)' }}>
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

  const cleanFormat = (val: string, fallback: string) => {
    if (!val || typeof val !== 'string') return fallback;
    const lower = val.toLowerCase().trim();
    if (lower.includes('stdin') || lower.includes('standard input')) return 'Standard Input';
    if (lower.includes('stdout') || lower.includes('standard output')) return 'Standard Output';
    if (lower.length > 20) return lower.slice(0, 17) + '...';
    return val;
  };

  const constraintsText = problem.constraints || '';
  let parsedTime = problem.timeLimit || (problem.time_limit_ms ? `${problem.time_limit_ms / 1000}s` : '');
  let parsedMemory = problem.memoryLimit || (problem.memory_limit_mb ? `${problem.memory_limit_mb} MB` : '');
  
  if (!parsedTime && constraintsText) {
    const match = constraintsText.match(/Time Limit:\s*([^\n]+)/i);
    if (match) parsedTime = match[1];
  }
  if (!parsedMemory && constraintsText) {
    const match = constraintsText.match(/Memory Limit:\s*([^\n]+)/i);
    if (match) parsedMemory = match[1];
  }
  
  parsedTime = parsedTime || '2.0s';
  parsedMemory = parsedMemory || '256 MB';
  
  const parsedInput = cleanFormat(problem.input_format || problem.inputDescription || '', 'Standard Input');
  const parsedOutput = cleanFormat(problem.output_format || problem.outputDescription || '', 'Standard Output');

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
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

            
          </div>
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

          {/* 2 Premium Metric Boxes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            margin: '8px 0 12px 0'
          }}>
            {[
              { label: 'Time Limit', value: parsedTime, color: 'var(--neon-cyan)' },
              { label: 'Memory Limit', value: parsedMemory, color: 'var(--neon-purple)' },
            ].map((box, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {box.label}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: box.color }}>
                  {box.value}
                </span>
              </div>
            ))}
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
