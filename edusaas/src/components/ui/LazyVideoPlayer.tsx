'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import './LazyVideoPlayer.css';

interface LazyVideoPlayerProps {
  embedUrl: string;
  title: string;
}

export default function LazyVideoPlayer({ embedUrl, title }: LazyVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract video ID from embed URL
  // Example: https://www.youtube.com/embed/dQw4w9WgXcQ
  const getThumbnailUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/');
      const videoId = parts[parts.length - 1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    } catch {
      // Ignore
    }
    return '';
  };

  const thumbnailUrl = getThumbnailUrl(embedUrl);

  return (
    <div className="lazy-video-container">
      {!isPlaying ? (
        <div 
          className="lazy-video-thumbnail-wrapper" 
          onClick={() => setIsPlaying(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsPlaying(true); }}
        >
          {thumbnailUrl ? (
            <Image
              unoptimized
              src={thumbnailUrl}
              alt={title}
              fill
              className="lazy-video-thumbnail"
            />
          ) : (
            <div className="lazy-video-fallback-bg" />
          )}
          <div className="lazy-video-overlay">
            <button className="lazy-video-play-btn" aria-label="Play Video">
              <Play size={48} fill="currentColor" />
            </button>
          </div>
        </div>
      ) : (
        <iframe
          className="lesson-video-frame"
          src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
