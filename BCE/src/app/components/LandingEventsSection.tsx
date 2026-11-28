'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Maximize2, Trophy, X } from 'lucide-react';
import { sanitizeClubPhotoUrl, type ClubEvent } from '@/lib/club-utils';

export default function LandingEventsSection({ events }: { events: ClubEvent[] }) {
  const [selectedThumbs, setSelectedThumbs] = useState<Record<string, number>>({});
  const [lightbox, setLightbox] = useState<{ eventIndex: number; photoIndex: number } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const activeEvent = events[lightbox.eventIndex];
    const photos = (activeEvent?.image_urls || []).map(sanitizeClubPhotoUrl).filter(Boolean) as string[];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      else if (e.key === 'ArrowRight' && photos.length > 1) {
        setLightbox((p) => (p ? { ...p, photoIndex: (p.photoIndex + 1) % photos.length } : null));
      } else if (e.key === 'ArrowLeft' && photos.length > 1) {
        setLightbox((p) => (p ? { ...p, photoIndex: (p.photoIndex - 1 + photos.length) % photos.length } : null));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightbox, events]);

  if (!events || events.length === 0) return null;

  const activeLightboxEvent = lightbox ? events[lightbox.eventIndex] : null;
  const activeLightboxPhotos = activeLightboxEvent
    ? ((activeLightboxEvent.image_urls || []).map(sanitizeClubPhotoUrl).filter(Boolean) as string[])
    : [];
  const activeLightboxUrl = lightbox ? activeLightboxPhotos[lightbox.photoIndex] : null;

  return (
    <section id="events" className="events-showcase-section">
      <div className="club-showcase-header">
        <span className="section-tag landing-eyebrow">Events &amp; Highlights</span>
        <h2 className="section-title">Club Contests &amp; Events</h2>
        <p className="section-desc" style={{ marginBottom: '2.25rem' }}>
          Competitions, prize ceremonies, and milestones across our coding community.
        </p>
      </div>

      <div className="events-cards-list">
        {events.map((ev, eventIdx) => {
          const validPhotos = (ev.image_urls || []).map(sanitizeClubPhotoUrl).filter(Boolean) as string[];
          const activePhotoIdx = Math.min(selectedThumbs[ev.id] || 0, Math.max(0, validPhotos.length - 1));
          const heroPhoto = validPhotos[activePhotoIdx] || null;
          const isRemoteHero = !!(heroPhoto && /^https?:\/\//i.test(heroPhoto));
          const paragraphs = (ev.description || '')
            .split(/\r?\n/)
            .map((p) => p.trim())
            .filter(Boolean);
          const winners = Array.isArray(ev.winners) ? ev.winners : [];

          return (
            <article key={ev.id} className="event-showcase-card">
              {heroPhoto && (
                <div className="event-media-col">
                  <button
                    type="button"
                    className="event-hero-photo-btn"
                    onClick={() => setLightbox({ eventIndex: eventIdx, photoIndex: activePhotoIdx })}
                    title="Click to zoom event photo"
                  >
                    <Image
                      src={heroPhoto}
                      alt={`${ev.title} photo ${activePhotoIdx + 1}`}
                      width={720}
                      height={540}
                      unoptimized={isRemoteHero}
                      className="event-hero-photo"
                    />
                    <span className="event-photo-zoom-hint">
                      <Maximize2 size={14} /> View Photo
                    </span>
                  </button>

                  {validPhotos.length > 1 && (
                    <div className="event-thumbs-strip">
                      {validPhotos.map((src, photoIdx) => {
                        const isRemoteThumb = /^https?:\/\//i.test(src);
                        const isSel = photoIdx === activePhotoIdx;
                        return (
                          <button
                            key={`${ev.id}-thumb-${photoIdx}`}
                            type="button"
                            className={`event-thumb-btn ${isSel ? 'is-active' : ''}`}
                            onClick={() => setSelectedThumbs((prev) => ({ ...prev, [ev.id]: photoIdx }))}
                            aria-label={`Select photo ${photoIdx + 1} for ${ev.title}`}
                          >
                            <Image
                              src={src}
                              alt={`Event thumbnail ${photoIdx + 1}`}
                              width={96}
                              height={72}
                              loading="lazy"
                              unoptimized={isRemoteThumb}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="event-content-col">
                <div className="event-badges-row">
                  <span className="event-type-pill">
                    <Trophy size={13} /> {ev.badge_label || 'Club Event'}
                  </span>
                  {ev.event_date_label && (
                    <span className="event-meta-pill">
                      <Calendar size={12} /> {ev.event_date_label}
                    </span>
                  )}
                  {ev.venue && (
                    <span className="event-meta-pill">
                      <MapPin size={12} /> {ev.venue}
                    </span>
                  )}
                </div>

                <h3 className="event-title">{ev.title}</h3>

                {paragraphs.length > 0 && (
                  <div className="event-description-stack">
                    {paragraphs.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                )}

                {winners.length > 0 && (
                  <div className="event-winners-box">
                    <div className="event-winners-heading">
                      🏆 Coding Contest Winners
                    </div>
                    <div className="event-winners-grid">
                      {winners.map((w, wIdx) => (
                        <div key={`${ev.id}-win-${wIdx}`} className="event-winner-pill">
                          <span className="event-winner-medal">{w.medal || '🏅'}</span>
                          <div className="event-winner-text">
                            <strong>{w.name}</strong>
                            {w.detail && <span>{w.detail}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {lightbox && activeLightboxUrl && (
        <div
          className="event-lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={activeLightboxEvent?.title || 'Event photo preview'}
        >
          <button
            type="button"
            className="event-lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Close photo preview"
          >
            <X size={20} />
          </button>

          {activeLightboxPhotos.length > 1 && (
            <button
              type="button"
              className="event-lightbox-nav prev"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((p) =>
                  p ? { ...p, photoIndex: (p.photoIndex - 1 + activeLightboxPhotos.length) % activeLightboxPhotos.length } : null
                );
              }}
              aria-label="Previous event photo"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div className="event-lightbox-frame" onClick={(e) => e.stopPropagation()}>
            <img src={activeLightboxUrl} alt={activeLightboxEvent?.title || 'Event photo'} />
            <div className="event-lightbox-caption">
              <span>{activeLightboxEvent?.title}</span>
              {activeLightboxPhotos.length > 1 && (
                <span>
                  {lightbox.photoIndex + 1} / {activeLightboxPhotos.length}
                </span>
              )}
            </div>
          </div>

          {activeLightboxPhotos.length > 1 && (
            <button
              type="button"
              className="event-lightbox-nav next"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox((p) =>
                  p ? { ...p, photoIndex: (p.photoIndex + 1) % activeLightboxPhotos.length } : null
                );
              }}
              aria-label="Next event photo"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

