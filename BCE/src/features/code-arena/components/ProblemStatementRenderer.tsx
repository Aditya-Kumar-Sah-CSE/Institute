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
  BookOpen,
  Sparkles,
  Brain,
  Bot,
  X,
  Send,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  signature?: any;
  hints?: string[];
  follow_up?: string | null;
  supported_languages?: CodeLanguage[];
  text_solution?: string | null;
  youtube_url?: string | null;
  navigation?: {
    currentIndex: number;
    totalProblems: number;
    prevProblemId: string | null;
    nextProblemId: string | null;
    firstProblemId: string | null;
    lastProblemId: string | null;
    sheetId: string | null;
  } | null;
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

const PROBLEM_STATEMENT_STYLES = `
  .problem-statement-body {
    max-width: 100% !important;
    overflow-x: auto !important;
    word-wrap: break-word !important;
    color: var(--text-main);
  }
  .problem-statement-body p, 
  .problem-statement-body li, 
  .problem-statement-body td {
    font-size: 13.5px !important;
    line-height: 1.6 !important;
    text-shadow: none !important;
  }
  .problem-statement-body pre, 
  .problem-statement-body code {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    max-width: 100% !important;
    background: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid var(--glass-border) !important;
    border-radius: 4px !important;
    padding: 8px 12px !important;
    font-family: monospace !important;
    color: var(--text-main) !important;
  }
  .problem-statement-body code.math-formula {
    color: var(--neon-cyan) !important;
    font-weight: 500 !important;
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.03) !important;
  }
  .problem-statement-body table {
    width: 100% !important;
    max-width: 100% !important;
    border-collapse: collapse !important;
    margin: 16px 0 !important;
    overflow-x: auto !important;
    display: block !important;
  }
  .problem-statement-body td, 
  .problem-statement-body th {
    border: 1px solid var(--glass-border) !important;
    padding: 6px 10px !important;
    font-size: 12px !important;
  }
  .problem-statement-body img {
    max-width: 100% !important;
    height: auto !important;
    border-radius: 4px !important;
  }
  .problem-statement-body .input-specification {
    background: rgba(6, 182, 212, 0.02) !important;
    border-left: 3px solid var(--neon-cyan) !important;
    border-radius: 4px !important;
    padding: 8px 12px !important;
    margin: 12px 0 !important;
  }
  .problem-statement-body .input-specification .section-title {
    color: var(--neon-cyan) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    margin-bottom: 6px !important;
  }
  .problem-statement-body .output-specification {
    background: rgba(236, 72, 153, 0.02) !important;
    border-left: 3px solid var(--neon-pink) !important;
    border-radius: 4px !important;
    padding: 8px 12px !important;
    margin: 12px 0 !important;
  }
  .problem-statement-body .output-specification .section-title {
    color: var(--neon-pink) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    margin-bottom: 6px !important;
  }
  
  /* Cycling colors for paragraphs, list items, definition descriptions, and table cells */
  .problem-statement-body p:nth-of-type(8n+1),
  .problem-statement-body li:nth-of-type(8n+1),
  .problem-statement-body td:nth-of-type(8n+1),
  .problem-statement-body dd:nth-of-type(8n+1),
  .problem-statement-body dt:nth-of-type(8n+1) {
    color: var(--neon-cyan) !important;
    text-shadow: 0 0 1px rgba(0,0,0,0.5);
    transition: color 0.3s ease;
  }
  .problem-statement-body p:nth-of-type(8n+2),
  .problem-statement-body li:nth-of-type(8n+2),
  .problem-statement-body td:nth-of-type(8n+2),
  .problem-statement-body dd:nth-of-type(8n+2),
  .problem-statement-body dt:nth-of-type(8n+2) {
    color: #a855f7 !important;
    text-shadow: 0 0 1px rgba(0,0,0,0.5);
    transition: color 0.3s ease;
  }
  .problem-statement-body p:nth-of-type(8n+3),
  .problem-statement-body li:nth-of-type(8n+3),
  .problem-statement-body td:nth-of-type(8n+3),
  .problem-statement-body dd:nth-of-type(8n+3),
  .problem-statement-body dt:nth-of-type(8n+3) {
    color: var(--neon-gold) !important;
    text-shadow: 0 0 1px rgba(0,0,0,0.5);
    transition: color 0.3s ease;
  }
  .problem-statement-body p:nth-of-type(8n+4),
  .problem-statement-body li:nth-of-type(8n+4),
  .problem-statement-body td:nth-of-type(8n+4),
  .problem-statement-body dd:nth-of-type(8n+4),
  .problem-statement-body dt:nth-of-type(8n+4) {
    color: var(--neon-pink) !important;
    text-shadow: 0 0 1px rgba(0,0,0,0.5);
    transition: color 0.3s ease;
  }
  .problem-statement-body p:nth-of-type(8n+5),
  .problem-statement-body li:nth-of-type(8n+5),
  .problem-statement-body td:nth-of-type(8n+5),
  .problem-statement-body dd:nth-of-type(8n+5),
  .problem-statement-body dt:nth-of-type(8n+5) {
    color: #3b82f6 !important;
    text-shadow: 0 0 1px rgba(0,0,0,0.5);
    transition: color 0.3s ease;
  }
  .problem-statement-body p:nth-of-type(8n+6),
  .problem-statement-body li:nth-of-type(8n+6),
  .problem-statement-body td:nth-of-type(8n+6),
  .problem-statement-body dd:nth-of-type(8n+6),
  .problem-statement-body dt:nth-of-type(8n+6) {
    color: #10b981 !important;
    text-shadow: 0 0 1px rgba(0,0,0,0.5);
    transition: color 0.3s ease;
  }
  .problem-statement-body p:nth-of-type(8n+7),
  .problem-statement-body li:nth-of-type(8n+7),
  .problem-statement-body td:nth-of-type(8n+7),
  .problem-statement-body dd:nth-of-type(8n+7),
  .problem-statement-body dt:nth-of-type(8n+7) {
    color: #fb923c !important;
    text-shadow: 0 0 1px rgba(0,0,0,0.5);
    transition: color 0.3s ease;
  }
  .problem-statement-body p:nth-of-type(8n),
  .problem-statement-body li:nth-of-type(8n),
  .problem-statement-body td:nth-of-type(8n),
  .problem-statement-body dd:nth-of-type(8n),
  .problem-statement-body dt:nth-of-type(8n) {
    color: #f43f5e !important;
    text-shadow: 0 0 1px rgba(0,0,0,0.5);
    transition: color 0.3s ease;
  }

  /* AI Assistant Side Drawer */
  .ai-drawer-overlay {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 380px;
    max-width: 100%;
    background: rgba(11, 15, 25, 0.96);
    backdrop-filter: blur(12px);
    border-left: 1px solid var(--glass-border);
    z-index: 50;
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
  }
  .ai-drawer-overlay.open {
    transform: translateX(0);
  }
  .ai-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.01);
  }
  .ai-drawer-title {
    font-size: 14px;
    font-weight: 800;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ai-drawer-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    transition: all 0.2s;
  }
  .ai-drawer-close:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-main);
  }
  
  .ai-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scrollbar-width: thin;
  }
  .ai-message {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 12.5px;
    line-height: 1.5;
    word-wrap: break-word;
  }
  .ai-message.assistant {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    border-bottom-left-radius: 2px;
  }
  .ai-message.user {
    align-self: flex-end;
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.3);
    color: var(--neon-cyan);
    border-bottom-right-radius: 2px;
    text-shadow: 0 0 1px rgba(0,0,0,0.5);
  }
  .ai-message p {
    margin: 0 0 8px 0 !important;
    color: inherit !important;
  }
  .ai-message p:last-child {
    margin-bottom: 0 !important;
  }
  .ai-message code {
    background: rgba(0,0,0,0.3) !important;
    border: 1px solid rgba(255,255,255,0.05) !important;
    padding: 2px 4px !important;
    border-radius: 3px !important;
    font-size: 11px !important;
    color: var(--neon-gold) !important;
  }
  .ai-message pre {
    background: rgba(0,0,0,0.4) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    padding: 8px 12px !important;
    border-radius: 6px !important;
    overflow-x: auto !important;
    margin: 8px 0 !important;
  }
  .ai-message pre code {
    background: none !important;
    border: none !important;
    padding: 0 !important;
    font-size: 11px !important;
    color: #e2e8f0 !important;
  }
  .ai-message h3 {
    font-size: 13px !important;
    font-weight: 700 !important;
    margin: 12px 0 6px 0 !important;
    color: var(--neon-cyan) !important;
  }
  .ai-message h3:first-child {
    margin-top: 0 !important;
  }
  
  .ai-action-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
  }
  .ai-action-chip {
    font-size: 11px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .ai-action-chip:hover {
    background: rgba(6, 182, 212, 0.1);
    border-color: rgba(6, 182, 212, 0.4);
    color: var(--neon-cyan);
  }
  
  .ai-chat-input-container {
    padding: 12px 16px;
    border-top: 1px solid var(--glass-border);
    background: rgba(15, 23, 42, 0.2);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .ai-chat-input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .ai-chat-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 8px 14px;
    color: white;
    font-size: 12.5px;
    outline: none;
    transition: border-color 0.2s;
  }
  .ai-chat-input:focus {
    border-color: rgba(6, 182, 212, 0.5);
  }
  .ai-chat-send {
    background: linear-gradient(135deg, var(--neon-cyan), var(--neon-blue));
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    color: black;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .ai-chat-send:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.4);
  }
  .ai-chat-send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Typing Indicator */
  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
  }
  .typing-dot {
    width: 5px;
    height: 5px;
    background: var(--text-muted);
    border-radius: 50%;
    animation: typingPulse 1.4s infinite ease-in-out;
  }
  .typing-dot:nth-child(1) { animation-delay: 0s; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingPulse {
    0%, 100% { transform: translateY(0); opacity: 0.4; }
    50% { transform: translateY(-4px); opacity: 1; }
  }
`;

// Client-side HTML / Markdown content renderer
function SafeContentRenderer({ rawContent, isMainStatement = false }: { rawContent: string; isMainStatement?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Paragraph styling and specification box formatting are fully handled by CSS rules in PROBLEM_STATEMENT_STYLES

  if (!rawContent || !rawContent.trim()) {
    return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided.</span>;
  }

  // Render a deterministic skeleton layout on the server and initial client hydration render
  if (!mounted) {
    return (
      <div className="problem-statement-body" style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse-light {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.3; }
          }
        ` }} />
        <div style={{ height: '16px', width: '70%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', animation: 'pulse-light 1.5s infinite' }} />
        <div style={{ height: '12px', width: '95%', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', animation: 'pulse-light 1.5s infinite' }} />
        <div style={{ height: '12px', width: '85%', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', animation: 'pulse-light 1.5s infinite' }} />
      </div>
    );
  }

  // Process math variables inside raw content
  const processedMath = cleanMathNotationHtml(rawContent.trim());
  let contentToRender = processedMath;

  // Fix image URLs: handle all Codeforces relative paths
  contentToRender = contentToRender.replace(
    /src=["']\/(predownloaded|images|assets|espresso|data|userpic)\/([^"']+)["']/g,
    'src="https://codeforces.com/$1/$2"'
  );
  contentToRender = contentToRender.replace(
    /(<img[^>]+src=["'])(?!https?:\/\/)(?!data:)([^"']+)(["'])/gi,
    '$1https://codeforces.com$2$3'
  );

  const hasHtml = /<[a-z][\s\S]*>/i.test(contentToRender);

  if (hasHtml) {
    let cleanHtml = contentToRender;
    if (typeof window !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(contentToRender, 'text/html');
      
      const header = doc.querySelector('.header');
      if (header) header.remove();

      // Query and remove individual limit and IO file elements that are saved in Codeforces HTML
      const limitElements = doc.querySelectorAll('.time-limit, .memory-limit, .input-file, .output-file');
      limitElements.forEach(el => el.remove());

      if (isMainStatement) {
        const inputSpec = doc.querySelector('.input-specification');
        if (inputSpec) inputSpec.remove();

        const outputSpec = doc.querySelector('.output-specification');
        if (outputSpec) outputSpec.remove();

        const sampleTests = doc.querySelector('.sample-tests, .sample-test');
        if (sampleTests) sampleTests.remove();

        const note = doc.querySelector('.note');
        if (note) note.remove();
      }
      
      cleanHtml = doc.body.innerHTML;

      cleanHtml = DOMPurify.sanitize(cleanHtml, {
        ADD_TAGS: ['iframe', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sub', 'sup'],
        ADD_ATTR: ['target', 'rel', 'colspan', 'rowspan', 'style'],
      });
    }
    return (
      <div
        ref={containerRef}
        className="problem-statement-body"
        suppressHydrationWarning
        style={{ fontSize: 'var(--text-sm)', lineHeight: '1.65', color: 'var(--text-main)' }}
      >
        <style dangerouslySetInnerHTML={{ __html: PROBLEM_STATEMENT_STYLES }} />
        <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
      </div>
    );
  }

  // Fallback to Markdown or plain text
  return (
    <div ref={containerRef} className="problem-statement-body" style={{ fontSize: 'var(--text-sm)', lineHeight: '1.65', color: 'var(--text-main)' }}>
      <style dangerouslySetInnerHTML={{ __html: PROBLEM_STATEMENT_STYLES }} />
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentToRender}</ReactMarkdown>
    </div>
  );
}

const generateChatGPTPrompt = (problem: ProblemData) => {
  const statementText = problem.statement || problem.description || '';
  const constraintsText = problem.constraints || '';
  const inputFormat = problem.input_format || problem.inputDescription || '';
  const outputFormat = problem.output_format || problem.outputDescription || '';
  
  const examplesList = problem.examples && problem.examples.length > 0 ? problem.examples : problem.samples || [];
  let examplesText = '';
  examplesList.forEach((ex: any, idx: number) => {
    examplesText += `Example ${idx + 1}:\nInput:\n${ex.input || ex.stdin || ''}\nOutput:\n${ex.expected_output || ex.stdout || ''}\n\n`;
  });

  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html;
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || html;
  };

  return `I am working on the following programming problem in C++17. Please help me understand the problem, analyze the complexity requirements, and provide a clean, optimized solution.

### Problem Title: ${problem.title}
### Platform: ${problem.source_type || problem.external_platform || 'INTERNAL'}

### Problem Description:
${stripHtml(statementText).trim()}

### Constraints:
${stripHtml(constraintsText).trim() || 'No specific constraints listed.'}

### Input Format:
${stripHtml(inputFormat).trim() || 'Standard input.'}

### Output Format:
${stripHtml(outputFormat).trim() || 'Standard output.'}

### Examples:
${examplesText.trim() || 'No sample examples provided.'}

### Requested Programming Language: C++17`;
};

const getSimulatedAiResponse = (query: string, problem: ProblemData): string => {
  const lower = query.toLowerCase();
  const title = problem.title;
  const constraintsText = problem.constraints || '';

  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html;
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || html;
  };

  const cleanConstraints = stripHtml(constraintsText).trim() || 'N <= 100,000';

  if (lower.includes('explain') || lower.includes('simple terms') || lower.includes('understand')) {
    return `### Problem Breakdown: **${title}**

Here is a simplified explanation of what the problem is asking:
1. **The Goal**: We need to process the given input and produce the correct output according to the problem rules.
2. **Inputs**: We are provided with structured data (as detailed in the input specification).
3. **Outputs**: We need to print the result exactly as described.
4. **Key Logic**: Read the statement carefully. We want to identify the relationships between variables and handle any edge cases (like zero, negative numbers, or empty lists).

Let me know if you want a specific approach suggested!`;
  }

  if (lower.includes('approach') || lower.includes('algorithm') || lower.includes('solve') || lower.includes('logic') || lower.includes('hint')) {
    return `### Recommended Strategy for **${title}**

To tackle this problem efficiently, consider the following approach:
1. **Understand Constraints**: First, evaluate if a simple brute-force approach (like nesting loops) will fit within the time limits.
2. **Optimal Data Structures**:
   - Use a **Hash Map / Set** if you need $O(1)$ search and lookup operations.
   - Use **Prefix Sums** or **Two Pointers** if the problem involves contiguous subarrays or sorted arrays.
   - Use a **Stack / Queue** for tracking history or sliding windows.
3. **Pseudocode Outline**:
   - Initialize variables and read the input size $N$.
   - Precompute values or sort the array if ordering helps.
   - Loop through the input and maintain running status.
   - Print the final result.

What programming language syntax or API calls are you planning to use?`;
  }

  if (lower.includes('complexity') || lower.includes('time') || lower.includes('space') || lower.includes('limit')) {
    return `### Time & Space Complexity Analysis

For **${title}**, the constraints are:
\`${cleanConstraints}\`

**Guidelines based on Input Size ($N$):**
- If $N \\le 10^5$, an **$O(N)$** or **$O(N \\log N)$** algorithm is required (e.g. Single pass loop, Sorting, Binary Search). An $O(N^2)$ nested loop will result in a **Time Limit Exceeded (TLE)**.
- If $N \\le 20$, an $O(2^N)$ backtracking or recursion is acceptable.
- Space Complexity: Aim for **$O(1)$** auxiliary space or **$O(N)$** if arrays/maps are needed. Avoid allocating heavy matrices unless explicitly required.

Ensure you utilize fast I/O operations in C++ (\`cin.tie(NULL)\`) to minimize reading overhead.`;
  }

  if (lower.includes('c++') || lower.includes('cpp') || lower.includes('code') || lower.includes('solution')) {
    return `### C++17 Implementation Hints

Here is a recommended starter structure for your solution in C++17:

\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <unordered_map>

using namespace std;

void solve() {
    // Read input variables
    // Implement your logic here
}

int main() {
    // Fast I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // For single testcase
    solve();
    
    // Or for multiple testcases:
    /*
    int t;
    cin >> t;
    while(t--) {
        solve();
    }
    */
    
    return 0;
}
\`\`\`

**Tips:**
- Use \`std::vector\` for dynamic arrays.
- Prefer \`std::unordered_map\` over \`std::map\` for $O(1)$ average lookups.
- Avoid using \`std::endl\`, use \`'\\n'\` instead, as it does not force-flush the stream buffer.`;
  }

  return `### Smart Learn AI Support

I've received your query about **${title}**. 

I can help you with:
- **"Explain the problem"**: Clarify the statement and requirements.
- **"Suggest an approach"**: Brainstorm algorithmic structures.
- **"Analyze complexity constraints"**: Check the limits and recommended time bounds.
- **"C++17 hints"**: Give you template guidelines for implementing code.

Please select one of the action chips above or ask a more specific question about standard library functions or debugging logic!`;
};

export default function ProblemStatementRenderer({ problem, onScrollToBottom }: { problem: ProblemData; onScrollToBottom?: () => void }) {
  const [showVideoSolution, setShowVideoSolution] = useState(false);
  const [showTextSolution, setShowTextSolution] = useState(false);

  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [isGptModalOpen, setIsGptModalOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const navigation = problem.navigation;

  // Prefetch adjacent problem pages
  useEffect(() => {
    if (navigation) {
      const sheetParam = navigation.sheetId ? `?sheet=${navigation.sheetId}` : '';
      if (navigation.prevProblemId) {
        router.prefetch(`/code-arena/problems/${navigation.prevProblemId}${sheetParam}`);
      }
      if (navigation.nextProblemId) {
        router.prefetch(`/code-arena/problems/${navigation.nextProblemId}${sheetParam}`);
      }
    }
  }, [navigation, router]);

  // Keyboard shortcuts (Left/Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          activeEl.hasAttribute('contenteditable') ||
          activeEl.classList.contains('input') ||
          activeEl.classList.contains('monaco-editor') ||
          activeEl.closest('.monaco-editor')
        ) {
          return;
        }
      }

      const sheetParam = navigation?.sheetId ? `?sheet=${navigation.sheetId}` : '';

      if (e.key === 'ArrowLeft' && navigation?.prevProblemId) {
        e.preventDefault();
        router.push(`/code-arena/problems/${navigation.prevProblemId}${sheetParam}`);
      } else if (e.key === 'ArrowRight' && navigation?.nextProblemId) {
        e.preventDefault();
        router.push(`/code-arena/problems/${navigation.nextProblemId}${sheetParam}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigation, router]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  const handleAskChatGPT = () => {
    const prompt = generateChatGPTPrompt(problem);
    
    // Attempt automatic clipboard copy
    try {
      navigator.clipboard.writeText(prompt);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }

    const canPrefill = prompt.length < 2000;
    if (canPrefill) {
      // Direct prefill open
      window.open(`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`, '_blank');
    } else {
      // Problem too long, show copy fallback dialog
      setPromptText(prompt);
      setIsGptModalOpen(true);
      // Wait a fraction and open ChatGPT in new tab
      setTimeout(() => {
        window.open('https://chatgpt.com/', '_blank');
      }, 800);
    }
  };

  const handleAskSmartLearnAI = () => {
    setIsAiDrawerOpen(true);
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          sender: 'assistant',
          text: `Hello! I am your Smart Learn AI assistant. I have analyzed the problem **"${problem.title}"** and loaded its context (statement, constraints, examples, and C++17 workspace language).\n\nHow can I help you today? You can choose one of the quick options below or ask a question.`
        }
      ]);
    }
  };

  const handleActionChipClick = (actionText: string) => {
    if (isTyping) return;
    
    // Add user message
    const userMsg = { sender: 'user', text: actionText };
    setChatMessages((prev) => [...prev, userMsg]);
    
    // Trigger AI typing
    setIsTyping(true);
    
    setTimeout(() => {
      const responseText = getSimulatedAiResponse(actionText, problem);
      setChatMessages((prev) => [...prev, { sender: 'assistant', text: responseText }]);
      setIsTyping(false);
    }, 1200);
  };

  const handleSendCustomQuery = () => {
    if (!customQuery.trim() || isTyping) return;
    
    const query = customQuery.trim();
    setCustomQuery('');
    
    // Add user message
    setChatMessages((prev) => [...prev, { sender: 'user', text: query }]);
    
    setIsTyping(true);
    
    setTimeout(() => {
      const responseText = getSimulatedAiResponse(query, problem);
      setChatMessages((prev) => [...prev, { sender: 'assistant', text: responseText }]);
      setIsTyping(false);
    }, 1200);
  };

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
      {/* Premium Problem Navigation Bar */}
      {navigation && navigation.totalProblems > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          padding: '8px 16px',
          backdropFilter: 'blur(8px)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}>
          {/* Left: First & Prev */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              href={navigation.firstProblemId ? `/code-arena/problems/${navigation.firstProblemId}${navigation.sheetId ? `?sheet=${navigation.sheetId}` : ''}` : '#'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: navigation.currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: 'none',
                opacity: navigation.currentIndex === 0 ? 0.3 : 1,
                pointerEvents: navigation.currentIndex === 0 ? 'none' : 'auto',
                transition: 'all 0.2s ease',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="First Problem"
              onMouseEnter={(e) => {
                if (navigation.currentIndex > 0) e.currentTarget.style.color = 'var(--neon-cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = navigation.currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)';
              }}
            >
              <ChevronsLeft size={16} /> <span className="desktop-only">First</span>
            </Link>
            <Link
              href={navigation.prevProblemId ? `/code-arena/problems/${navigation.prevProblemId}${navigation.sheetId ? `?sheet=${navigation.sheetId}` : ''}` : '#'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: !navigation.prevProblemId ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: 'none',
                opacity: !navigation.prevProblemId ? 0.3 : 1,
                pointerEvents: !navigation.prevProblemId ? 'none' : 'auto',
                transition: 'all 0.2s ease',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Previous Problem"
              onMouseEnter={(e) => {
                if (navigation.prevProblemId) e.currentTarget.style.color = 'var(--neon-cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = !navigation.prevProblemId ? 'var(--text-muted)' : 'var(--text-primary)';
              }}
            >
              <ChevronLeft size={16} /> <span>Previous</span>
            </Link>
          </div>

          {/* Middle: Progress Indicator */}
          <div style={{ fontWeight: 700, color: 'var(--neon-cyan)', letterSpacing: '0.5px' }}>
            Problem {navigation.currentIndex + 1} / {navigation.totalProblems}
          </div>

          {/* Right: Next & Last */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              href={navigation.nextProblemId ? `/code-arena/problems/${navigation.nextProblemId}${navigation.sheetId ? `?sheet=${navigation.sheetId}` : ''}` : '#'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: !navigation.nextProblemId ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: 'none',
                opacity: !navigation.nextProblemId ? 0.3 : 1,
                pointerEvents: !navigation.nextProblemId ? 'none' : 'auto',
                transition: 'all 0.2s ease',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Next Problem"
              onMouseEnter={(e) => {
                if (navigation.nextProblemId) e.currentTarget.style.color = 'var(--neon-cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = !navigation.nextProblemId ? 'var(--text-muted)' : 'var(--text-primary)';
              }}
            >
              <span>Next</span> <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
            </Link>
            <Link
              href={navigation.lastProblemId ? `/code-arena/problems/${navigation.lastProblemId}${navigation.sheetId ? `?sheet=${navigation.sheetId}` : ''}` : '#'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: navigation.currentIndex === navigation.totalProblems - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: 'none',
                opacity: navigation.currentIndex === navigation.totalProblems - 1 ? 0.3 : 1,
                pointerEvents: navigation.currentIndex === navigation.totalProblems - 1 ? 'none' : 'auto',
                transition: 'all 0.2s ease',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Last Problem"
              onMouseEnter={(e) => {
                if (navigation.currentIndex < navigation.totalProblems - 1) e.currentTarget.style.color = 'var(--neon-cyan)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = navigation.currentIndex === navigation.totalProblems - 1 ? 'var(--text-muted)' : 'var(--text-primary)';
              }}
            >
              <span className="desktop-only">Last</span> <ChevronsRight size={16} />
            </Link>
          </div>
        </div>
      )}

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
            
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
              <button
                onClick={handleAskChatGPT}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                  e.currentTarget.style.color = 'var(--neon-cyan)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                title="Ask ChatGPT to explain or help with this problem"
              >
                <Sparkles size={14} style={{ color: 'var(--neon-cyan)' }} /> Ask ChatGPT
              </button>

              <button
                onClick={handleAskSmartLearnAI}
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
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 10px rgba(6,182,212,0.15)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
                  e.currentTarget.style.boxShadow = '0 0 14px rgba(6,182,212,0.25)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(6,182,212,0.15)';
                }}
                title="Open Smart Learn AI assistant"
              >
                <Brain size={14} /> Ask Smart Learn AI
              </button>

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

          <SafeContentRenderer rawContent={rawStatement} isMainStatement={true} />
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
      {/* Smart Learn AI Assistant Drawer */}
      <div className={`ai-drawer-overlay ${isAiDrawerOpen ? 'open' : ''}`}>
        <div className="ai-drawer-header">
          <div className="ai-drawer-title">
            <Bot size={16} className="text-neon-cyan" style={{ animation: 'pulse 2s infinite' }} />
            <span>Smart Learn AI</span>
          </div>
          <button className="ai-drawer-close" onClick={() => setIsAiDrawerOpen(false)} aria-label="Close AI Assistant">
            <X size={16} />
          </button>
        </div>

        <div className="ai-chat-messages" ref={chatContainerRef}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`ai-message ${msg.sender}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            </div>
          ))}
          {isTyping && (
            <div className="ai-message assistant">
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          )}
        </div>

        <div className="ai-chat-input-container">
          <div className="ai-action-chips">
            <button className="ai-action-chip" onClick={() => handleActionChipClick('Explain the problem in simple terms')}>
              Explain Problem
            </button>
            <button className="ai-action-chip" onClick={() => handleActionChipClick('Suggest approach/algorithm')}>
              Suggest Approach
            </button>
            <button className="ai-action-chip" onClick={() => handleActionChipClick('Analyze time complexity constraints')}>
              Analyze Complexity
            </button>
          </div>
          <div className="ai-chat-input-row">
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask a question..."
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customQuery.trim() && !isTyping) {
                  handleSendCustomQuery();
                }
              }}
            />
            <button
              className="ai-chat-send"
              onClick={handleSendCustomQuery}
              disabled={!customQuery.trim() || isTyping}
              title="Send message"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ChatGPT Fallback Modal */}
      <Modal
        isOpen={isGptModalOpen}
        onClose={() => setIsGptModalOpen(false)}
        title="Ask ChatGPT"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neon-cyan)', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', padding: '12px', borderRadius: '8px' }}>
            <Sparkles size={20} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
              We have copied the high-quality solution prompt to your clipboard and opened ChatGPT in a new tab!
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Since the problem description is too long to prefill directly via the URL, please paste the copied text (\`Ctrl+V\` or \`Cmd+V\`) into the ChatGPT prompt box to get your help.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(promptText);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isCopied ? <Check size={13} style={{ color: 'var(--neon-lime)' }} /> : <Copy size={13} />}
              {isCopied ? 'Copied!' : 'Copy Prompt'}
            </button>
            <button
              onClick={() => {
                window.open('https://chatgpt.com/', '_blank');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
                border: 'none',
                color: 'black',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ExternalLink size={13} /> Open ChatGPT
            </button>
          </div>
        </div>
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
