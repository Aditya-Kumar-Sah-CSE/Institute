'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import { Maximize2, ExternalLink, X, Copy, Check } from 'lucide-react';

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '12px 16px', background: '#1e1e2e', borderRadius: '8px', color: 'var(--text-muted)' }}>
        Loading code block...
      </div>
    ),
  }
);
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

function isImageUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    /\.(jpeg|jpg|gif|png|webp|svg|bmp|heic)$/i.test(clean) ||
    url.includes('/storage/v1/object/public/lesson_notes/') ||
    url.includes('/storage/v1/object/public/doubts/') ||
    url.startsWith('data:image/')
  );
}

const LANGUAGE_DISPLAY_MAP: Record<string, string> = {
  cpp: 'C++',
  'c++': 'C++',
  c: 'C',
  java: 'Java',
  python: 'Python',
  py: 'Python',
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  go: 'Go',
  golang: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  kotlin: 'Kotlin',
  kt: 'Kotlin',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  bash: 'Bash',
  sh: 'Bash',
  json: 'JSON',
  text: 'Plain Text',
  plaintext: 'Plain Text',
};

function normalizeLanguage(lang: string): string {
  const clean = (lang || '').toLowerCase().trim();
  if (clean === 'c++' || clean === 'cpp') return 'cpp';
  if (clean === 'py') return 'python';
  if (clean === 'js') return 'javascript';
  if (clean === 'ts') return 'typescript';
  if (clean === 'rs') return 'rust';
  if (clean === 'kt') return 'kotlin';
  if (clean === 'plaintext' || clean === 'text') return 'text';
  return clean || 'text';
}

function getDisplayLanguage(lang: string): string {
  const clean = (lang || '').toLowerCase().trim();
  return LANGUAGE_DISPLAY_MAP[clean] || (lang ? lang.toUpperCase() : 'Code');
}

function CodeBlockWrapper({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normLang = normalizeLanguage(language);
  const displayLang = getDisplayLanguage(language);

  return (
    <div
      style={{
        margin: '1.25rem 0',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
        background: '#161822',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* Code Block Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 14px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-muted, #94a3b8)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--neon-cyan, #06b6d4)',
            }}
          />
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: '#e2e8f0' }}>
            {displayLang}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            border: copied ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
            color: copied ? '#4ade80' : 'var(--text-muted, #94a3b8)',
            padding: '3px 9px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Copy code to clipboard"
          aria-label="Copy code"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      {/* Syntax Highlighted Body */}
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={normLang}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '14px 16px',
          background: 'transparent',
          fontSize: '13.5px',
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
          lineHeight: '1.6',
          overflowX: 'auto',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    if (previewImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

  if (!content) {
    return (
      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
        No content provided.
      </div>
    );
  }

  // Pre-process math variables e.g. $$$w > 2$$$ if present
  let safeContent = content.replace(/\\n/g, '\n');
  safeContent = safeContent.replace(/\$\$\$([\s\S]*?)\$\$\$/g, (_match, formula) => {
    const cleanFormula = formula
      .replace(/\\leq/g, ' ≤ ')
      .replace(/\\geq/g, ' ≥ ')
      .replace(/\\neq/g, ' ≠ ')
      .replace(/\\cdot/g, ' · ')
      .replace(/\\times/g, ' × ');
    return `\`${cleanFormula.trim()}\``;
  });

  return (
    <>
      <div
        className="markdown-body solution-editorial-preview"
        style={{
          color: 'var(--text-primary, #e2e8f0)',
          fontSize: '15px',
          lineHeight: '1.7',
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const lang = match ? match[1] : '';
              const codeString = String(children).replace(/\n$/, '');

              if (!inline) {
                return <CodeBlockWrapper language={lang} code={codeString} />;
              }

              return (
                <code
                  {...props}
                  className={className}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--neon-cyan, #06b6d4)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                  }}
                >
                  {children}
                </code>
              );
            },
            h1: ({ node, children, ...props }) => (
              <h1
                {...props}
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  marginTop: '1.5rem',
                  marginBottom: '0.75rem',
                  color: 'var(--text-main, #ffffff)',
                  borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
                  paddingBottom: '0.4rem',
                }}
              >
                {children}
              </h1>
            ),
            h2: ({ node, children, ...props }) => (
              <h2
                {...props}
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  marginTop: '1.25rem',
                  marginBottom: '0.6rem',
                  color: 'var(--text-main, #ffffff)',
                  borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))',
                  paddingBottom: '0.3rem',
                }}
              >
                {children}
              </h2>
            ),
            h3: ({ node, children, ...props }) => (
              <h3
                {...props}
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginTop: '1.1rem',
                  marginBottom: '0.5rem',
                  color: 'var(--neon-cyan, #06b6d4)',
                }}
              >
                {children}
              </h3>
            ),
            blockquote: ({ node, children, ...props }) => (
              <blockquote
                {...props}
                style={{
                  margin: '1rem 0',
                  padding: '10px 16px',
                  background: 'rgba(6, 182, 212, 0.04)',
                  borderLeft: '4px solid var(--neon-cyan, #06b6d4)',
                  borderRadius: '0 8px 8px 0',
                  color: 'var(--text-secondary, #cbd5e1)',
                  fontStyle: 'italic',
                }}
              >
                {children}
              </blockquote>
            ),
            table: ({ node, children, ...props }) => (
              <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                <table
                  {...props}
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                    border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {children}
                </table>
              </div>
            ),
            th: ({ node, children, ...props }) => (
              <th
                {...props}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontWeight: 700,
                  borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
                  color: 'var(--text-main, #ffffff)',
                }}
              >
                {children}
              </th>
            ),
            td: ({ node, children, ...props }) => (
              <td
                {...props}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-secondary, #cbd5e1)',
                }}
              >
                {children}
              </td>
            ),
            ul: ({ node, children, ...props }) => (
              <ul {...props} style={{ paddingLeft: '1.5rem', margin: '0.75rem 0' }}>
                {children}
              </ul>
            ),
            ol: ({ node, children, ...props }) => (
              <ol {...props} style={{ paddingLeft: '1.5rem', margin: '0.75rem 0' }}>
                {children}
              </ol>
            ),
            li: ({ node, children, ...props }) => (
              <li {...props} style={{ marginBottom: '0.35rem' }}>
                {children}
              </li>
            ),
            a: ({ node, ...props }) => {
              const href = props.href as string;
              if (href && (href.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) || href.includes('supabase.co'))) {
                return (
                  <span style={{ margin: '0.75rem 0', display: 'block', maxWidth: '100%' }}>
                    <span
                      onClick={() => setPreviewImage(href)}
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        background: 'rgba(0, 0, 0, 0.4)',
                        cursor: 'zoom-in',
                        maxWidth: '100%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                      }}
                      className="hover-lift"
                    >
                      <img
                        src={href}
                        alt={props.children ? String(props.children) : 'Shared Image'}
                        style={{
                          maxHeight: '400px',
                          maxWidth: '100%',
                          display: 'block',
                          objectFit: 'contain',
                          borderRadius: '12px',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(8px)',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          pointerEvents: 'none',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        <Maximize2 size={12} /> Click to Expand
                      </span>
                    </span>
                  </span>
                );
              }
              return (
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--neon-cyan, #06b6d4)', textDecoration: 'underline', wordBreak: 'break-all' }}
                />
              );
            },
            img: ({ node, ...props }) => {
              const src = props.src as string;
              return (
                <span style={{ margin: '0.75rem 0', display: 'block', maxWidth: '100%' }}>
                  <span
                    onClick={() => setPreviewImage(src)}
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(0, 0, 0, 0.4)',
                      cursor: 'zoom-in',
                      maxWidth: '100%',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                    className="hover-lift"
                  >
                    <img
                      {...props}
                      style={{
                        maxHeight: '450px',
                        maxWidth: '100%',
                        display: 'block',
                        objectFit: 'contain',
                        borderRadius: '12px',
                      }}
                      title="Click to view full image"
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        pointerEvents: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <Maximize2 size={12} /> Click to Expand
                    </span>
                  </span>
                </span>
              );
            },
          }}
        >
          {safeContent}
        </ReactMarkdown>
      </div>

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              gap: '12px',
              zIndex: 100000,
            }}
          >
            <a
              href={previewImage}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'white',
                background: 'rgba(255,255,255,0.15)',
                padding: '8px 16px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                fontSize: '13px',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <ExternalLink size={14} /> Open Original
            </a>
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                color: 'white',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Close Preview"
            >
              <X size={20} />
            </button>
          </div>

          <img
            src={previewImage}
            alt="Full Preview"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 0 40px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
      )}
    </>
  );
}


