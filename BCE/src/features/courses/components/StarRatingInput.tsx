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

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isFilled = starIndex <= displayRating;
        return (
          <button
            key={starIndex}
            type="button"
            disabled={readOnly}
            onClick={() => onChange && onChange(starIndex)}
            onMouseEnter={() => !readOnly && setHoverRating(starIndex)}
            onMouseLeave={() => !readOnly && setHoverRating(null)}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: readOnly ? 'default' : 'pointer',
              color: isFilled ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)',
              transition: 'transform 0.15s, color 0.15s',
              transform: !readOnly && hoverRating === starIndex ? 'scale(1.2)' : 'scale(1)'
            }}
          >
            <Star 
              size={size} 
              fill={isFilled ? '#f59e0b' : 'transparent'} 
              stroke={isFilled ? '#f59e0b' : 'rgba(255, 255, 255, 0.3)'}
            />
          </button>
        );
      })}
    </div>
  );
}
