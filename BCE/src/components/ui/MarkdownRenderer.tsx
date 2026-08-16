'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import { Maximize2, ExternalLink, X } from 'lucide-react';

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  { ssr: false, loading: () => <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>Loading code block...</div> }
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

  return (
    <>
      <div className="markdown-body" style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.6' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, inline, className, children, ...props}: any) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  {...props}
                  children={String(children).replace(/\n$/, '')}
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ borderRadius: '8px', margin: '1em 0' }}
                />
              ) : (
                <code {...props} className={className} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  {children}
                </code>
              );
            },
            a: ({node, ...props}) => {
              const href = props.href as string;
              if (href && isImageUrl(href)) {
                return (
                  <div style={{ margin: '0.75rem 0', display: 'block', maxWidth: '100%' }}>
                    <div 
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
                        transition: 'transform 0.2s ease, border-color 0.2s ease'
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
                          borderRadius: '12px' 
                        }} 
                      />
                      <div style={{
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
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        <Maximize2 size={12} /> Click to Expand
                      </div>
                    </div>
                  </div>
                );
              }
              return <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-blue)', wordBreak: 'break-all' }} />;
            },
            img: ({node, ...props}) => {
              const src = props.src as string;
              return (
                <div style={{ margin: '0.75rem 0', display: 'block', maxWidth: '100%' }}>
                  <div 
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
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
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
                        borderRadius: '12px' 
                      }} 
                      title="Click to view full image"
                    />
                    <div style={{
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
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <Maximize2 size={12} /> Click to Expand
                    </div>
                  </div>
                </div>
              );
            }
          }}
        >
          {content?.replace(/\\n/g, '\n')}
        </ReactMarkdown>
      </div>

      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.92)', 
            backdropFilter: 'blur(8px)',
            zIndex: 99999, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px'
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
              zIndex: 100000 
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
                border: '1px solid rgba(255,255,255,0.2)' 
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
                justifyContent: 'center',
                cursor: 'pointer'
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
              border: '1px solid rgba(255,255,255,0.1)'
            }} 
          />
        </div>
      )}
    </>
  );
}

