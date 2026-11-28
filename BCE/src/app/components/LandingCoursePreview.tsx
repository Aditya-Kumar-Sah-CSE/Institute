import React from 'react';
import LandingCourseClient from './LandingCourseClient';
import { getPreviewCourses, getCourseCategories } from './LandingPreviewActions';

export default async function LandingCoursePreview() {
  const [{ data: initialCourses }, categories] = await Promise.all([
    getPreviewCourses(0, 100, 'All Categories'),
    getCourseCategories(),
  ]);

  return (
    <section id="landing-courses" className="landing-section" style={{ background: 'var(--bg-default)', position: 'relative', zIndex: 1, padding: '3rem 24px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <span className="landing-eyebrow" style={{ color: '#818cf8' }}>Course Content · {(initialCourses || []).length} Modules Ready</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, margin: '0 0 0.65rem 0', color: 'var(--text-primary)' }}>Structured Learning Path</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
            Guided courses, hands-on lessons, and curated study resources.
          </p>
        </div>

        <LandingCourseClient initialCourses={initialCourses || []} categories={categories} />
      </div>
    </section>
  );
}
