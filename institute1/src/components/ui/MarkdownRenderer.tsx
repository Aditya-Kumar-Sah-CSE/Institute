'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  { ssr: false, loading: () => <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>Loading code block...</div> }
);
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  return (
    <>
      <div className="markdown-body" style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: '1.6' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, inline, className, children, ...props}: any) {
              const match = /language-(\w+)/.exec(className || '')
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
              )
            },
            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-blue)' }} />,
            img: ({node, ...props}) => <img {...props} onClick={() => setPreviewImage((props.src as string) || null)} style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '1rem', cursor: 'zoom-in' }} title="Click to view full image" />
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
            backgroundColor: 'rgba(0,0,0,0.85)', 
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'zoom-out',
            padding: '20px'
          }}
        >
          <img 
            src={previewImage} 
            alt="Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }} 
          />
          <div style={{ position: 'absolute', top: '20px', right: '20px', color: 'white', background: 'rgba(255,255,255,0.2)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
            ×
          </div>
        </div>
      )}
    </>
  );
}
