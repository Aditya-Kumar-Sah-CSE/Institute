'use client';

import React, { useState, useMemo, useCallback } from 'react';
import CourseCard from './CourseCard';
import Input from '@/components/ui/Input';
import { Search, Loader2 } from 'lucide-react';
import { fetchAllCourseCardsAction } from '@/features/courses/actions/catalog';
import type { Course } from '@/types';
import './CourseCatalog.css';

const CATALOG_PAGE_SIZE = 12;

interface CourseCatalogProps {
  courses: Course[];
  enrollments?: Record<string, { progress: number; status: string }>; // courseId -> { progress, status }
  certificatesMap?: Record<string, string>;
  ratingStatsMap?: Record<string, { averageRating: number; totalReviews: number }>;
}

export default function CourseCatalog({
  courses: initialCourses,
  enrollments = {},
  certificatesMap = {},
  ratingStatsMap: initialRatingStatsMap = {},
}: CourseCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'enrolled'>('enrolled');
  const [semesterFilter, setSemesterFilter] = useState('all');

  const [allCourses, setAllCourses] = useState<Course[]>(initialCourses);
  const [ratingStatsMap, setRatingStatsMap] = useState(initialRatingStatsMap);
  const [hasLoadedAll, setHasLoadedAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreAll, setHasMoreAll] = useState(false);
  const [allOffset, setAllOffset] = useState(0);

  const mergeCourses = useCallback((existing: Course[], incoming: Course[]) => {
    const byId = new Map<string, Course>();
    existing.forEach((c) => byId.set(c.id, c));
    incoming.forEach((c) => byId.set(c.id, c));
    return Array.from(byId.values());
  }, []);

  const handleSelectAllCourses = useCallback(async () => {
    setEnrollmentFilter('all');
    if (hasLoadedAll || loadingAll) return;

    setLoadingAll(true);
    try {
      const res = await fetchAllCourseCardsAction(0, CATALOG_PAGE_SIZE);
      if (!res.error) {
        setAllCourses((prev) => mergeCourses(prev, res.courses));
        setRatingStatsMap((prev) => ({ ...prev, ...res.ratingStatsMap }));
        setHasMoreAll(res.hasMore);
        setAllOffset(res.courses.length);
        setHasLoadedAll(true);
      }
    } catch (err) {
      console.error('Failed to load all courses:', err);
    } finally {
      setLoadingAll(false);
    }
  }, [hasLoadedAll, loadingAll, mergeCourses]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMoreAll) return;

    setLoadingMore(true);
    try {
      const res = await fetchAllCourseCardsAction(allOffset, CATALOG_PAGE_SIZE);
      if (!res.error) {
        setAllCourses((prev) => mergeCourses(prev, res.courses));
        setRatingStatsMap((prev) => ({ ...prev, ...res.ratingStatsMap }));
        setHasMoreAll(res.hasMore);
        setAllOffset((prev) => prev + res.courses.length);
      }
    } catch (err) {
      console.error('Failed to load more courses:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [allOffset, hasMoreAll, loadingMore, mergeCourses]);

  const availableCategories = useMemo(() => {
    const scopeCourses =
      enrollmentFilter === 'enrolled'
        ? allCourses.filter((c) => enrollments[c.id] !== undefined)
        : allCourses;
    const categories = Array.from(new Set(scopeCourses.map((c) => c.difficulty).filter(Boolean)));
    categories.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aSem = aLower.match(/sem\s*(\d+)/);
      const bSem = bLower.match(/sem\s*(\d+)/);
      if (aSem && bSem) {
        return parseInt(aSem[1]) - parseInt(bSem[1]);
      }
      if (aSem) return -1;
      if (bSem) return 1;
      return a.localeCompare(b);
    });
    return ['all', ...categories];
  }, [allCourses, enrollmentFilter, enrollments]);

  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (enrollmentFilter === 'enrolled' && enrollments[course.id] === undefined) {
        return false;
      }

      if (semesterFilter !== 'all' && course.difficulty !== semesterFilter) {
        return false;
      }

      return true;
    });
  }, [allCourses, searchTerm, enrollmentFilter, semesterFilter, enrollments]);

  return (
    <div className="course-catalog" style={{ paddingBottom: '80px' }}>
      <div className="catalog-header" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

        {/* Top bar: Search + Enrollment Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div className="catalog-search" style={{ flex: 1, minWidth: '250px' }}>
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} style={{ color: 'var(--text-muted)' }} />}
            />
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-sm)', gap: '4px' }}>
            <button
              className={`btn-ghost ${enrollmentFilter === 'all' ? 'active' : ''}`}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                background: enrollmentFilter === 'all' ? 'var(--bg-secondary)' : 'transparent',
                color: enrollmentFilter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: enrollmentFilter === 'all' ? 'var(--weight-semibold)' : 'normal',
              }}
              onClick={handleSelectAllCourses}
            >
              All Courses
            </button>
            <button
              className={`btn-ghost ${enrollmentFilter === 'enrolled' ? 'active' : ''}`}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                background: enrollmentFilter === 'enrolled' ? 'var(--bg-secondary)' : 'transparent',
                color: enrollmentFilter === 'enrolled' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: enrollmentFilter === 'enrolled' ? 'var(--weight-semibold)' : 'normal',
              }}
              onClick={() => setEnrollmentFilter('enrolled')}
            >
              My Enrolled
            </button>
          </div>
        </div>

        {/* Bottom bar: Category / Semester Filters */}
        <div className="catalog-filters" style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {availableCategories.map((f) => (
            <button
              key={f}
              className={`filter-btn ${semesterFilter === f ? 'active' : ''}`}
              onClick={() => setSemesterFilter(f)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: semesterFilter === f ? 'var(--neon-cyan)' : 'var(--border-color)',
                background: semesterFilter === f ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                color: semesterFilter === f ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {f === 'all' ? 'All Categories' : (f.startsWith('sem ') ? f.charAt(0).toUpperCase() + f.slice(1) : f)}
            </button>
          ))}
        </div>
      </div>

      {loadingAll && enrollmentFilter === 'all' ? (
        <div className="catalog-empty" style={{ gap: '12px' }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--neon-cyan)' }} />
          <p>Loading courses...</p>
        </div>
      ) : filteredCourses.length > 0 ? (
        <>
          <div className="catalog-grid">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={enrollments[course.id]?.progress}
                status={enrollments[course.id]?.status}
                certificateId={certificatesMap[course.id]}
                initialRatingStats={ratingStatsMap[course.id] ?? { averageRating: 0, totalReviews: 0 }}
              />
            ))}
          </div>

          {enrollmentFilter === 'all' && hasMoreAll && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <button
                className="btn-secondary"
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{ width: '100%', padding: '14px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Loading more courses...
                  </>
                ) : (
                  'Load More Courses'
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="catalog-empty">
          <span className="empty-icon">🏜️</span>
          <h3>{enrollmentFilter === 'enrolled' ? 'No Enrolled Courses Found' : 'No courses found'}</h3>
          <p>
            {enrollmentFilter === 'enrolled'
              ? "You haven't enrolled in any courses yet. Switch to 'All Courses' to explore and enroll!"
              : 'Try adjusting your search or filters.'}
          </p>
          {enrollmentFilter === 'enrolled' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSelectAllCourses}
              style={{ marginTop: 'var(--space-sm)' }}
            >
              Browse All Courses 🚀
            </button>
          )}
        </div>
      )}
    </div>
  );
}
