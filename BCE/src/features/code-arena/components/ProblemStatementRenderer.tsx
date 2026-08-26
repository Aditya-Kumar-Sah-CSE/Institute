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
  PlayCircle,
  BookOpen
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

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
  external_problem_id?: string | null;
  externalId?: string | null;
  starterCode?: Record<string, string> | null;
  hints?: string[];
  follow_up?: string | null;
  supported_languages?: CodeLanguage[];
  text_solution?: string | null;
  youtube_url?: string | null;
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
}// Helper to translate $$$formula$$$ to beautifully formatted inline HTML elements
export const cleanMathNotationHtml = (text: string): string => {
  if (!text) return '';
  return text.replace(/\$\$\$([\s\S]*?)\$\$\$/g, (match: string, formula: string) => {
    let formatted = formula
      // Subscripts: _x or _{...}
      .replace(/_(?:\{([\s\S]*?)\}|([^{]))/g, (_m, p1, p2) => `<sub>${p1 ?? p2}</sub>`)
      // Superscripts: ^x or ^{...}
      .replace(/\^(?:\{([\s\S]*?)\}|([^{]))/g, (_m, p1, p2) => `<sup>${p1 ?? p2}</sup>`)
      // Math operators and symbols — ORDER MATTERS: longer patterns first
      .replace(/\\ldots/g, '…')
      .replace(/\\cdots/g, '…')
      .replace(/\\dots/g, '…')
      .replace(/\\leq/g, ' ≤ ')
      .replace(/\\geq/g, ' ≥ ')
      .replace(/\\neq/g, ' ≠ ')
      .replace(/\\bmod\b/g, ' mod ')
      .replace(/\\pmod\{([\s\S]*?)\}/g, ' (mod $1)')
      .replace(/\\le\b/g, ' ≤ ')
      .replace(/\\ge\b/g, ' ≥ ')
      .replace(/\\ne\b/g, ' ≠ ')
      .replace(/\\lt\b/g, ' < ')
      .replace(/\\gt\b/g, ' > ')
      .replace(/\\times/g, ' × ')
      .replace(/\\cdot/g, ' · ')
      .replace(/\\infty/g, '∞')
      .replace(/\\sqrt\{([\s\S]*?)\}/g, '√($1)')
      .replace(/\\sqrt/g, '√')
      .replace(/\\lfloor/g, '⌊')
      .replace(/\\rfloor/g, '⌋')
      .replace(/\\lceil/g, '⌈')
      .replace(/\\rceil/g, '⌉')
      .replace(/\\leftarrow/g, '←')
      .replace(/\\rightarrow/g, '→')
      .replace(/\\Rightarrow/g, '⇒')
      .replace(/\\Leftarrow/g, '⇐')
      .replace(/\\oplus/g, '⊕')
      .replace(/\\land\b/g, ' ∧ ')
      .replace(/\\lor\b/g, ' ∨ ')
      .replace(/\\lnot\b/g, '¬')
      .replace(/\\text\{([\s\S]*?)\}/g, '$1')
      .replace(/\\mathbf\{([\s\S]*?)\}/g, '<b>$1</b>')
      .replace(/\\mathrm\{([\s\S]*?)\}/g, '$1')
      .replace(/\\mathit\{([\s\S]*?)\}/g, '<i>$1</i>')
      // Remove remaining unknown backslash commands (after specific replacements)
      .replace(/\\[a-zA-Z]+/g, '')
      // Strip lone backslash
      .replace(/\\/g, '');
    return `<code class="math-formula" style="font-family: 'Cambria Math', 'Times New Roman', serif; font-style: italic; background: rgba(255,255,255,0.04); padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.03); color: var(--neon-cyan); font-weight: 500;">${formatted}</code>`;
  });
};

// Helper for pure text mathematical sanitizations (e.g. for pre tags)
export const cleanMathNotationText = (text: string): string => {
  if (!text) return '';
  return text.replace(/\$\$\$([\s\S]*?)\$\$\$/g, (_match: string, formula: string) => {
    return formula
      .replace(/\\ldots/g, '…')
      .replace(/\\cdots/g, '…')
      .replace(/\\dots/g, '…')
      .replace(/\\leq/g, ' ≤ ')
      .replace(/\\geq/g, ' ≥ ')
      .replace(/\\neq/g, ' ≠ ')
      .replace(/\\bmod\b/g, ' mod ')
      .replace(/\\le\b/g, ' ≤ ')
      .replace(/\\ge\b/g, ' ≥ ')
      .replace(/\\ne\b/g, ' ≠ ')
      .replace(/\\lt\b/g, ' < ')
      .replace(/\\gt\b/g, ' > ')
      .replace(/\\times/g, ' × ')
      .replace(/\\cdot/g, ' · ')
      .replace(/\\infty/g, '∞')
      .replace(/\\text\{([\s\S]*?)\}/g, '$1')
      .replace(/\\mathbf\{([\s\S]*?)\}/g, '$1')
      .replace(/\\mathrm\{([\s\S]*?)\}/g, '$1')
      .replace(/\\mathit\{([\s\S]*?)\}/g, '$1')
      .replace(/\\[a-zA-Z]+/g, '')
      .replace(/\\/g, '');
  });
};

// Client-side HTML / Markdown content renderer
function SafeContentRenderer({ rawContent }: { rawContent: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Style normal paragraphs, list items, and table cells with cycling colors
    const paragraphs = containerRef.current.querySelectorAll('p, li, td, dd, dt');
    const colors = [
      'var(--neon-cyan)',
      '#a855f7',
      'var(--neon-gold)',
      'var(--neon-pink)',
      '#3b82f6',
      '#10b981',
      '#fb923c',
      '#f43f5e',
    ];
    paragraphs.forEach((p, idx) => {
      const el = p as HTMLElement;
      el.style.color = colors[idx % colors.length];
      el.style.textShadow = '0 0 1px rgba(0,0,0,0.5)';
      el.style.transition = 'color 0.3s ease';
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
      paras.forEach(p => { p.style.color = '#22d3ee'; });
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
      paras.forEach(p => { p.style.color = '#f472b6'; });
    });

    // Fallback scanner for flat text structures (Markdown headers)
    const allElements = Array.from(containerRef.current.querySelectorAll('*'));
    let inInputSec = false;
    let inOutputSec = false;
    
    allElements.forEach(el => {
      const text = el.textContent?.trim();
      const tagName = el.tagName.toLowerCase();
      
      if (el.closest('.input-specification') || el.closest('.output-specification')) return;
      
      const isHeader = (tagName === 'div' && el.classList.contains('section-title')) || 
          tagName === 'h3' || tagName === 'h4' || tagName === 'strong' || tagName === 'b';
          
      if (isHeader) {
        if (text === 'Input') {
          inInputSec = true; inOutputSec = false;
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
          inInputSec = false; inOutputSec = true;
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
          inInputSec = false; inOutputSec = false;
        }
      }
      
      if (el.tagName.toLowerCase() === 'table' || el.classList.contains('sample-tests') || el.classList.contains('sample-test')) {
        inInputSec = false; inOutputSec = false;
      }
      
      if (tagName === 'p' || (tagName === 'div' && !el.children.length)) {
        if (inInputSec) (el as HTMLElement).style.color = '#22d3ee';
        else if (inOutputSec) (el as HTMLElement).style.color = '#f472b6';
      }
    });
  }, [rawContent]);

  if (!rawContent || !rawContent.trim()) {
    return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided.</span>;
  }

  // Process math variables inside raw content
  const processedMath = cleanMathNotationHtml(rawContent.trim());
  let contentToRender = processedMath;

  // Strip the header section (time limit, memory limit) — but NOT Input/Output body content
  contentToRender = contentToRender.replace(/<div\s+class=["']header["']>[\s\S]*?<\/div>/gi, '');
  // Strip only the metadata divs (time-limit, memory-limit, input-file, output-file)
  contentToRender = contentToRender.replace(/<div\s+class=["'](?:time-limit|memory-limit|input-file|output-file)["'][^>]*>[\s\S]*?<\/div>/gi, '');

  // Fix image URLs: handle all Codeforces relative paths
  // Pattern covers /predownloaded/, /images/, /espresso/, /data/, /userpic/
  contentToRender = contentToRender.replace(
    /src=["']\/(predownloaded|images|assets|espresso|data|userpic)\/([^"']+)["']/g,
    'src="https://codeforces.com/$1/$2"'
  );
  // Also handle bare paths without protocol in img tags
  contentToRender = contentToRender.replace(
    /(<img[^>]+src=["'])(?!https?:\/\/)(?!data:)([^"']+)(["'])/gi,
    '$1https://codeforces.com$2$3'
  );

  const hasHtml = /<[a-z][\s\S]*>/i.test(contentToRender);

  if (hasHtml) {
    let cleanHtml = contentToRender;
    if (typeof window !== 'undefined') {
      cleanHtml = DOMPurify.sanitize(contentToRender, {
        ADD_TAGS: ['iframe', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sub', 'sup'],
        ADD_ATTR: ['target', 'rel', 'colspan', 'rowspan', 'style'],
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

export default function ProblemStatementRenderer({ problem, onScrollToBottom }: { problem: ProblemData; onScrollToBottom?: () => void }) {
  const [showVideoSolution, setShowVideoSolution] = useState(false);
  const [showTextSolution, setShowTextSolution] = useState(false);

  if (!problem) return null;
  const platformName = problem.source_type || problem.external_platform || 'INTERNAL';

  const externalId = problem.external_id || problem.externalProblemId;
  const officialUrl = problem.external_url || problem.sourceUrl;

  const rawStatement = problem.statement || problem.description || '';
  const rawConstraints = cleanMathNotationText(problem.constraints || '');

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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
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

          {/* Problem Title & ID & Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', margin: '4px 0 8px 0' }}>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {problem.title.startsWith(externalId || '___') ? problem.title : `${externalId ? `${externalId} — ` : ''}${problem.title}`}
            </h1>
            
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {problem.text_solution && (
                <button
                  onClick={() => setShowTextSolution(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(6, 182, 212, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    color: 'var(--neon-cyan)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)'}
                >
                  <BookOpen size={14} /> Text Solution
                </button>
              )}
              {problem.youtube_url && (
                <button
                  onClick={() => setShowVideoSolution(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                >
                  <PlayCircle size={14} /> Video Solution
                </button>
              )}
            </div>
          </div>

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

      {/* Input Section */}
      {(problem.input_format || problem.inputDescription) && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderLeft: '3px solid var(--neon-cyan)', paddingLeft: '10px', letterSpacing: '0.5px' }}>
            <FileText size={14} style={{ color: 'var(--neon-cyan)' }} /> Input
          </div>
          <SafeContentRenderer rawContent={problem.input_format || problem.inputDescription || ''} />
        </section>
      )}

      {/* Output Section */}
      {(problem.output_format || problem.outputDescription) && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderLeft: '3px solid var(--neon-pink)', paddingLeft: '10px', letterSpacing: '0.5px' }}>
            <FileText size={14} style={{ color: 'var(--neon-pink)' }} /> Output
          </div>
          <SafeContentRenderer rawContent={problem.output_format || problem.outputDescription || ''} />
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
                    <strong style={{ color: 'var(--text-muted)' }}>Explanation: </strong> 
                    <span dangerouslySetInnerHTML={{ __html: cleanMathNotationHtml(sample.explanation) }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No sample cases available.</span>
        )}
      </section>

      {/* Follow-up Section */}
      {problem.follow_up && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderLeft: '3px solid var(--neon-purple)', paddingLeft: '10px', letterSpacing: '0.5px' }}>
            Follow-up
          </div>
          <div style={{
            background: 'rgba(168, 85, 247, 0.03)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '6px',
            padding: '10px 12px',
            fontSize: '12.5px',
            color: '#c084fc',
            lineHeight: '1.5'
          }}>
            {problem.follow_up}
          </div>
        </section>
      )}

      {/* Hints Section */}
      {problem.hints && problem.hints.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'var(--space-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderLeft: '3px solid #3b82f6', paddingLeft: '10px', letterSpacing: '0.5px' }}>
            Hints ({problem.hints.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {problem.hints.map((hint, idx) => (
              <CollapsibleHint key={idx} index={idx + 1} content={hint} />
            ))}
          </div>
          {/* Problem Bottom Spacer */}
          <div style={{ height: '30px' }} />
        </section>
      )}

      {/* Text Solution Modal */}
      <Modal
        isOpen={showTextSolution}
        onClose={() => setShowTextSolution(false)}
        title={`Text Solution: ${problem.title}`}
        size="lg"
      >
        <div style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto', paddingRight: '8px' }}>
          {problem.text_solution ? (
            <MarkdownRenderer content={problem.text_solution} />
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              No text solution available.
            </p>
          )}
        </div>
      </Modal>

      {/* Video Solution Modal */}
      <Modal
        isOpen={showVideoSolution}
        onClose={() => setShowVideoSolution(false)}
        title={`Video Solution: ${problem.title}`}
        size="lg"
      >
        {problem.youtube_url && (
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <iframe
              width="100%"
              height="100%"
              src={problem.youtube_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: 'none' }}
            />
          </div>
        )}
        {!problem.youtube_url && (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
            No video solution available.
          </p>
        )}
      </Modal>
    </div>
  );
}

function CollapsibleHint({ index, content }: { index: number; content: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.01)',
      border: '1px solid var(--glass-border)',
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          color: 'var(--text-main)',
          padding: '10px 12px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>Hint {index}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {isOpen ? '▲ Hide' : '▼ Show'}
        </span>
      </button>
      {isOpen && (
        <div 
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--glass-border)',
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            background: 'rgba(0, 0, 0, 0.1)'
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
}
