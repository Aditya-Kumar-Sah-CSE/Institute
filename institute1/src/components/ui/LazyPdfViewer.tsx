'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileText, Loader2, Download } from 'lucide-react';
import Button from './Button';
import './LazyPdfViewer.css';

// Dynamically import react-pdf so it isn't included in the initial bundle
const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

// Setup pdf.js worker (required by react-pdf)
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface LazyPdfViewerProps {
  url: string;
  title?: string;
}

export default function LazyPdfViewer({ url, title = 'PDF Document' }: LazyPdfViewerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  const handleLoadClick = () => {
    setIsLoading(true);
    setIsLoaded(true);
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
              loading={<div />}
              error={<div className="pdf-error">Failed to load PDF. <a href={url} target="_blank" rel="noreferrer">Open directly</a></div>}
            >
              {!isLoading && (
                <Page 
                  pageNumber={pageNumber} 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false}
                  className="pdf-page"
                  width={Math.min(window.innerWidth - 64, 800)}
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
