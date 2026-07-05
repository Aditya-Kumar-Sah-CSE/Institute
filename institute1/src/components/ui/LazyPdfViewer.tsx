'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileText, Loader2, Download } from 'lucide-react';
import Button from './Button';
import './LazyPdfViewer.css';

// Dynamically import react-pdf so it isn't included in the initial bundle
const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

// Worker is initialized dynamically upon loading

interface LazyPdfViewerProps {
  url: string;
  title?: string;
}

export default function LazyPdfViewer({ url, title = 'PDF Document' }: LazyPdfViewerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const isLikelyImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url) || url.includes('/images/');

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  const handleLoadClick = async () => {
    setIsLoading(!isLikelyImage);
    setIsLoaded(true);
    if (!isLikelyImage) {
      // PRE-CHECK: Try to see if it's actually a PDF by grabbing the first 5 bytes
      try {
        const res = await fetch(url, { headers: { Range: 'bytes=0-4' } });
        if (res.ok || res.status === 206) {
           const text = await res.text();
           if (!text.startsWith('%PDF-')) {
              console.warn('URL file does not have PDF metadata signature, falling back to image view.');
              setPdfError(true);
              setIsLoading(false);
              return;
           }
        }
      } catch (e) {
         // Ignore fetch errors (e.g. CORS missing headers) and try mounting pdf.js anyway
      }

      try {
        const mod = await import('react-pdf');
        mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
      } catch (err) {
        console.error('Failed to load react-pdf', err);
        setPdfError(true);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="lazy-pdf-container">
      {!isLoaded ? (
        <div className="lazy-pdf-placeholder glass-card">
          <div className="lazy-pdf-icon-wrapper">
            <FileText size={48} className="text-neon-cyan" />
          </div>
          <h4 className="lazy-pdf-title">{title}</h4>
          <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
            Load document to view inline
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button onClick={handleLoadClick} variant="primary" size="sm">
              View Document
            </Button>
            <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" download>
              <Download size={16} style={{ marginRight: '8px' }} /> Download
            </a>
          </div>
        </div>
      ) : (isLikelyImage || pdfError) ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
           <img src={url} alt={title} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
           <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
             If this file isn't displaying correctly, <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)' }}>click here to download or open it directly</a>.
           </p>
        </div>
      ) : (
        <div className="lazy-pdf-viewer-wrapper">
          {isLoading && (
            <div className="lazy-pdf-loading">
              <Loader2 className="animate-spin text-neon-cyan" size={32} />
              <p>Loading PDF...</p>
            </div>
          )}
          <div className="pdf-document-wrapper">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                 console.warn('PDF loading failed, switching to image fallback:', error);
                 setPdfError(true);
                 setIsLoading(false);
              }}
              loading={<div />}
              error={null}
            >
              {!isLoading && (
                <Page 
                  pageNumber={pageNumber} 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false}
                  className="pdf-page"
                  width={Math.min(typeof window !== 'undefined' ? window.innerWidth - 64 : 800, 800)}
                />
              )}
            </Document>
          </div>
          
          {!isLoading && numPages && (
            <div className="pdf-controls">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
              >
                Previous
              </Button>
              <span>
                Page {pageNumber} of {numPages}
              </span>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
