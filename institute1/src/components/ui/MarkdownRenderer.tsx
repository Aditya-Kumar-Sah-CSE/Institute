'use client';

import React from 'react';
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
  return (
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
          img: ({node, ...props}) => <img {...props} style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '1rem' }} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
