'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface GalleryItem {
  id: string;
  image_url: string;
  title: string;
  description?: string;
  sort_order: number;
}

// Manual fallback items using existing public images
const manualItems: GalleryItem[] = [
  {
    id: 'manual-1',
    image_url: '/student%20benifit.png',
    title: 'Student Benefits',
    description: 'Gamified learning, real-time analytics, and engagement tools for students.',
    sort_order: 1,
  },
  {
    id: 'manual-2',
    image_url: '/faculty%20and%20hod.png',
    title: 'Faculty & HOD Benefits',
    description: 'Streamlined course management, attendance tracking, and performance dashboards.',
    sort_order: 2,
  },
  {
    id: 'manual-3',
    image_url: '/images/why_this.png',
    title: 'Institution Insights',
    description: 'Compare features, manage departments flawlessly, and scale adoption.',
    sort_order: 3,
  },
];

const INITIAL_SHOW = 3;

export default function GallerySection() {
  const [items, setItems] = useState<GalleryItem[]>(manualItems);
  const [expanded, setExpanded] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollTrack = (direction: 'left' | 'right') => {
    if (trackRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      trackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    async function fetchGallery() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('landing_gallery')
          .select('id, image_url, title, description, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          setItems(data as GalleryItem[]);
        }
        // If error (table doesn't exist) or empty, keep manual items
      } catch {
        // Silently fallback to manual items
      }
    }
    fetchGallery();
  }, []);

  const visible = expanded ? items : items.slice(0, INITIAL_SHOW);
  const hasMore = items.length > INITIAL_SHOW;

  return (
    <section className="gallery-section">
      <span className="section-tag">How It Works</span>
      <h2 className="section-title">Transform Your Campus</h2>
      <p className="section-desc">
        See how our platform empowers students, faculty, and administrators with powerful tools.
      </p>

      {/* Native horizontal slide row removing duplicate auto-scroll */}
      <div 
        ref={trackRef}
        className="why-gallery-track" 
        style={{ 
          display: 'flex', 
          gap: '2rem', 
          overflowX: 'auto', 
          padding: '1rem', 
          scrollSnapType: 'x mandatory', 
          WebkitOverflowScrolling: 'touch', 
          scrollbarWidth: 'none' 
        }}
      >
        {items.map((item) => (
          <div key={item.id} className="gallery-card why-huge-card" style={{ scrollSnapAlign: 'start' }}>
            <div 
              className="gallery-card-img" 
              onClick={() => setPreviewImage(item.image_url)} 
              style={{ cursor: 'pointer' }}
              title="Click to view full image"
            >
              <Image
                src={item.image_url}
                alt={item.title}
                width={600}
                height={400}
                style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                unoptimized
              />
            </div>
            <div className="gallery-card-info">
              <h3>{item.title}</h3>
              {item.description && <p>{item.description}</p>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button onClick={() => scrollTrack('left')} className="slider-nav-btn" aria-label="Scroll left">
          <ChevronLeft size={24} />
        </button>
        <button onClick={() => scrollTrack('right')} className="slider-nav-btn" aria-label="Scroll right">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(6px)' }}
          onClick={() => setPreviewImage(null)}
        >
          <button 
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
            onClick={() => setPreviewImage(null)}
            className="hover:bg-white hover:text-black"
          >
            <X size={28} />
          </button>
          <div style={{ position: 'relative', width: '90vw', height: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <Image 
              src={previewImage}
              alt="Preview Fullscreen"
              width={1600}
              height={1000}
              style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
              unoptimized
            />
          </div>
        </div>
      )}
    </section>
  );
}
