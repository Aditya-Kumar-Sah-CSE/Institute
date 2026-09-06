'use client';

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { SyntaxErrorItem } from '@/lib/latex/latexValidator';

interface SyntaxErrorBannerProps {
  errors: SyntaxErrorItem[];
}

export default function SyntaxErrorBanner({ errors }: SyntaxErrorBannerProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="syntax-error-banner">
      <div className="banner-title">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span>LaTeX Syntax Warnings Detected ({errors.length})</span>
      </div>

      <div className="banner-errors-list">
        {errors.map((err, idx) => (
          <div key={idx} className={`error-item ${err.type}`}>
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{err.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
