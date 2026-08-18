'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { FileText, Loader2, Download, ZoomIn, ZoomOut, Maximize2, ChevronUp, ChevronDown } from 'lucide-react';
import Button from './Button';
import './LazyPdfViewer.css';

// Dynamically import react-pdf so it isn't included in the initial bundle
const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

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

  // PDF reading UX states
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isFitWidth, setIsFitWidth] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [goToInput, setGoToInput] = useState('1');
  const [containerWidth, setContainerWidth] = useState<number>(800);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLikelyImage = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url) || url.includes('/images/');

  // Automatically update container width to keep fit-to-width responsive
  useEffect(() => {
    if (!containerRef.current || !isLoaded) return;

    const updateWidth = () => {
      if (containerRef.current) {
        // Compensate for wrapper padding and scrollbar space
        const w = containerRef.current.clientWidth;
        setContainerWidth(Math.max(w - 24, 320));
      }
    };

    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(containerRef.current);

    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [isLoaded]);

  // Controls auto-hide trigger on user engagement/activity
  const handleActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Intersection observer to track current page from vertical scrolling
  useEffect(() => {
    if (!numPages || !isLoaded || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = Number(entry.target.getAttribute('data-page-number'));
            if (pageNum) {
              setPageNumber(pageNum);
              setGoToInput(pageNum.toString());
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        // Require 45% visibility of a page to set it as current active page
        threshold: 0.45,
      }
    );

    // Bind observer to all page refs
    Object.values(pageRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [numPages, isLoaded]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
    setGoToInput('1');
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

  const scrollToPage = (pageNum: number) => {
    const target = pageRefs.current[pageNum];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPageNumber(pageNum);
      setGoToInput(pageNum.toString());
    }
  };

  const handleGoToSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(goToInput, 10);
    if (pageNum && numPages && pageNum >= 1 && pageNum <= numPages) {
      scrollToPage(pageNum);
    } else {
      setGoToInput(pageNumber.toString());
    }
  };

  const handleZoomIn = () => {
    setIsFitWidth(false);
    setZoomScale((prev) => Math.min(prev + 0.15, 2.5));
    handleActivity();
  };

  const handleZoomOut = () => {
    setIsFitWidth(false);
    setZoomScale((prev) => Math.max(prev - 0.15, 0.5));
    handleActivity();
  };

  const handleFitWidth = () => {
    setIsFitWidth(!isFitWidth);
    setZoomScale(1.0);
    handleActivity();
  };

  return (
    <div className="lazy-pdf-container" ref={containerRef}>
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
        <div 
          className="lazy-pdf-viewer-wrapper"
          onMouseMove={handleActivity}
          onTouchStart={handleActivity}
        >
          {isLoading && (
            <div className="lazy-pdf-loading">
              <Loader2 className="animate-spin text-neon-cyan" size={32} />
              <p>Loading PDF...</p>
            </div>
          )}

          {/* Premium Floating Top Toolbar */}
          {!isLoading && numPages && (
            <div className={`pdf-top-toolbar ${showControls ? 'visible' : ''}`}>
              <span className="pdf-toolbar-title" title={title}>{title}</span>
              
              <div className="pdf-zoom-controls">
                <button className="pdf-toolbar-btn" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut size={16} />
                </button>
                <span className="pdf-zoom-percentage">
                  {isFitWidth ? 'Fit Width' : `${Math.round(zoomScale * 100)}%`}
                </span>
                <button className="pdf-toolbar-btn" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn size={16} />
                </button>
                <button 
                  className={`pdf-toolbar-btn ${isFitWidth ? 'active' : ''}`} 
                  onClick={handleFitWidth} 
                  title="Fit to Width"
                >
                  <Maximize2 size={16} />
                </button>
              </div>

              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer" 
                className="pdf-toolbar-btn download-btn" 
                download 
                title="Download PDF"
              >
                <Download size={16} />
              </a>
            </div>
          )}

          {/* Continuous Scroll PDF Pages list */}
          <div 
            className="pdf-scroll-container" 
            ref={scrollContainerRef}
            onScroll={handleActivity}
          >
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
              {!isLoading && numPages && Array.from(new Array(numPages), (el, index) => {
                const pageNum = index + 1;
                return (
                  <div 
                    key={`page_${pageNum}`} 
                    className="pdf-page-wrapper"
                    data-page-number={pageNum}
                    ref={(el) => {
                      pageRefs.current[pageNum] = el;
                    }}
                  >
                    <Page 
                      pageNumber={pageNum} 
                      renderTextLayer={false} 
                      renderAnnotationLayer={false}
                      className="pdf-page"
                      width={isFitWidth ? containerWidth : undefined}
                      scale={isFitWidth ? undefined : zoomScale}
                    />
                  </div>
                );
              })}
            </Document>
          </div>

          {/* Modern Floating Navigation Controls */}
          {!isLoading && numPages && (
            <div className={`pdf-floating-controls ${showControls ? 'visible' : ''}`}>
              <div className="pdf-page-indicator">
                {pageNumber} / {numPages}
              </div>

              <div className="pdf-nav-separator" />

              <button 
                className="pdf-nav-arrow-btn" 
                onClick={() => scrollToPage(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                title="Previous Page"
              >
                <ChevronUp size={16} />
              </button>

              <form onSubmit={handleGoToSubmit} className="pdf-goto-form">
                <input 
                  type="text" 
                  pattern="[0-9]*"
                  value={goToInput}
                  onChange={(e) => setGoToInput(e.target.value.replace(/\D/g, ''))}
                  onFocus={(e) => e.target.select()}
                  className="pdf-goto-input"
                  title="Enter page number to jump"
                />
              </form>

              <button 
                className="pdf-nav-arrow-btn" 
                onClick={() => scrollToPage(Math.min(numPages, pageNumber + 1))}
                disabled={pageNumber >= numPages}
                title="Next Page"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
