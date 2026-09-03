'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingInputProps {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
}

export default function StarRatingInput({
  value = 0,
  onChange,
  readOnly = false,
  size = 22
}: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : value;

  const handleKeyDown = (e: React.KeyboardEvent, currentStar: number) => {
    if (readOnly || !onChange) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, (value || 1) - 1));
    } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
      e.preventDefault();
      onChange(parseInt(e.key, 10));
    }
  };

  return (
    <div 
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={readOnly ? `Rating: ${value} out of 5 stars` : 'Rating selector'}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isFilled = starIndex <= displayRating;
        const isHovered = !readOnly && hoverRating === starIndex;

        return (
          <button
            key={starIndex}
            type="button"
            disabled={readOnly}
            tabIndex={readOnly ? -1 : 0}
            aria-label={`${starIndex} of 5 stars`}
            onClick={() => onChange && onChange(starIndex)}
            onMouseEnter={() => !readOnly && setHoverRating(starIndex)}
            onMouseLeave={() => !readOnly && setHoverRating(null)}
            onKeyDown={(e) => handleKeyDown(e, starIndex)}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: readOnly ? 'default' : 'pointer',
              color: isFilled ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isHovered ? 'scale(1.25) translateY(-2px)' : 'scale(1)',
              outline: 'none'
            }}
          >
            <Star 
              size={size} 
              fill={isFilled ? '#f59e0b' : 'transparent'} 
              stroke={isFilled ? '#f59e0b' : 'rgba(255, 255, 255, 0.35)'}
              style={{
                filter: isFilled ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.45))' : 'none',
                transition: 'filter 0.2s ease'
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
