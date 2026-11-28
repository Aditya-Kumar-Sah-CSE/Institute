'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ExplorePaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  loading?: boolean;
  itemLabel?: string;
  onPageChange: (nextPage: number) => void;
}

function getVisiblePages(current: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

export default function ExplorePaginationBar({
  page,
  pageSize,
  total,
  totalPages,
  loading = false,
  itemLabel = 'items',
  onPageChange,
}: ExplorePaginationBarProps) {
  if (total <= 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);
  const pageTokens = getVisiblePages(page, totalPages);

  return (
    <div className="explore-pagination-bar">
      <span className="explore-pagination-info">
        Showing {startItem}–{endItem} of {total.toLocaleString()} {itemLabel}
      </span>

      {totalPages > 1 && (
        <div className="explore-pagination-controls">
          <button
            type="button"
            className="explore-page-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={loading || page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} /> Prev
          </button>

          {pageTokens.map((tok, idx) =>
            tok === 'ellipsis' ? (
              <span key={`ell-${idx}`} className="explore-page-ellipsis">
                …
              </span>
            ) : (
              <button
                key={tok}
                type="button"
                className={`explore-page-pill ${tok === page ? 'active' : ''}`}
                onClick={() => tok !== page && onPageChange(tok)}
                disabled={loading}
                aria-current={tok === page ? 'page' : undefined}
              >
                {tok}
              </button>
            )
          )}

          <button
            type="button"
            className="explore-page-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={loading || page >= totalPages}
            aria-label="Next page"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

