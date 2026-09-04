import React from 'react';
import LandingCourseClient from './LandingCourseClient';
import { getPreviewCourses, getCourseCategories } from './LandingPreviewActions';

export default async function LandingCoursePreview() {
  const { data: initialCourses } = await getPreviewCourses(0, 100, 'All Categories');
  const categories = await getCourseCategories();

  return (
    <section id="landing-courses" className="landing-section" style={{ background: 'var(--bg-default)', position: 'relative', zIndex: 1, padding: '3rem 24px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ color: '#818cf8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem', display: 'inline-block', marginBottom: '0.5rem' }}>Course Content</span>
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Structured Learning Path</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
            Learn through structured courses, lessons and practical resources.
          </p>
        </div>

        <LandingCourseClient initialCourses={initialCourses || []} categories={categories} />
      </div>
    </section>
  );
}
