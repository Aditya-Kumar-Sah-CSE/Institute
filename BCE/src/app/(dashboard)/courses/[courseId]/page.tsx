import { createClient, createAdminClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import UserAvatar from '@/components/shared/UserAvatar';
import { getDifficultyColor } from '@/lib/utils';
import { enrollInCourseFormAction, reapplyEnrollmentFormAction } from '@/features/courses/actions/enroll';
import LeaveCourseButton from '@/features/courses/components/LeaveCourseButton';
import ShareCourseButton from '@/features/courses/components/ShareCourseButton';
import CoursePollsSection from '@/features/courses/components/CoursePollsSection';
import CourseDoubtsSection from '@/features/courses/components/CourseDoubtsSection';
import CurriculumListClient from '@/features/courses/components/CurriculumListClient';
import EnrollCourseButton from '@/features/courses/components/EnrollCourseButton';
import JoinedStudentsList from '@/features/admin/components/JoinedStudentsList';
import CourseReviewsSection from '@/features/courses/components/CourseReviewsSection';
import EndOfCourseReviewCard from '@/features/courses/components/EndOfCourseReviewCard';
import { getCourseReviewsData } from '@/features/courses/actions/reviews';
import './CourseDetail.css';

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: currentUserProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isStaffUser = currentUserProfile && ['admin', 'instructor', 'developer'].includes(currentUserProfile.role);

  // Fetch course with explicit foreign key relationship and robust fallback to prevent false 404s
  let course: any = null;

  const { data: primaryCourse, error: primaryErr } = await supabase
    .from('courses')
    .select('*, profiles!courses_created_by_fkey(name)')
    .eq('id', courseId)
    .single();

  if (primaryCourse) {
    course = primaryCourse;
  } else {
    // Fallback 1: Query without join in case FK relationship cache error occurs
    const { data: rawCourse } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (rawCourse) {
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', rawCourse.created_by)
        .maybeSingle();
      course = { ...rawCourse, profiles: creatorProfile };
    } else {
      // Fallback 2: Admin client fallback in case course is unpublished or restricted by RLS
      const adminClient = await createAdminClient();
      const { data: adminCourse } = await adminClient
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
        
      if (adminCourse) {
        const { data: creatorProfile } = await adminClient
          .from('profiles')
          .select('name')
          .eq('id', adminCourse.created_by)
          .maybeSingle();
        course = { ...adminCourse, profiles: creatorProfile };
      }
    }
  }

  if (!course) notFound();

  // Fetch lessons
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, assignments(xp_reward)')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  // Fetch enrollment & progress
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single();

  const { data: lessonProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .eq('completed', true);

  const completedLessonIds = new Set(lessonProgress?.map(lp => lp.lesson_id) || []);

  const { data: userCertificate } = await supabase
    .from('certificates')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single();

  const adminClient = await createAdminClient();
  const [
    { data: enrolledStudents },
    reviewsData
  ] = await Promise.all([
    adminClient
      .from('enrollments')
      .select('id, user_id, status, profiles(id, name, email, avatar_url, institute_id)')
      .eq('course_id', courseId)
      .eq('status', 'approved'),
    getCourseReviewsData(courseId, user.id)
  ]);

  const isEnrolled = !!(enrollment && enrollment.status === 'approved');
  const isCourseCompleted = !!userCertificate || (enrollment && (enrollment.progress || 0) >= 1.0);


  return (
    <div className="course-detail-page">
      <div>
        <Link href="/courses" style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-md)', fontSize: 'var(--text-sm)', textDecoration: 'none', transition: 'color 0.2s' }}>
          ← Back to Courses
        </Link>
      </div>

      <div className="course-interactions-row" style={{ display: 'block' }}>
        <div className="course-interaction-col">
          <CoursePollsSection 
            courseId={courseId} 
            currentUserId={user.id} 
            isEnrolledOrFaculty={course.created_by === user.id || !!(enrollment && enrollment.status === 'approved')} 
          />
        </div>
      </div>

      <div className="lessons-section">
        <h2 className="section-title">Course Curriculum</h2>
        
        {(() => {
          if (!lessons || lessons.length === 0) return null;
          
          const groupedLessons = lessons.reduce((acc, lesson) => {
            const dateStr = new Date(lesson.created_at || Date.now()).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(lesson);
            return acc;
          }, {} as Record<string, typeof lessons>);
          
          const sortedDates = Object.keys(groupedLessons).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
          return (
            <CurriculumListClient 
              courseId={courseId}
              groupedLessons={groupedLessons}
              sortedDates={sortedDates}
              completedLessonIds={Array.from(completedLessonIds)}
              isApproved={!!(enrollment && enrollment.status === 'approved')}
            />
          );
        })()}
      </div>

      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <CourseDoubtsSection 
          courseId={courseId} 
          isEnrolledOrFaculty={course.created_by === user.id || !!(enrollment && enrollment.status === 'approved')} 
        />
      </div>

      <div className="course-hero glass-card">
        <div className="course-hero-content">
          <div 
            className="course-difficulty-badge"
            style={{ backgroundColor: getDifficultyColor(course.difficulty) }}
          >
            {course.difficulty.charAt(0).toUpperCase() + course.difficulty.slice(1)}
          </div>
          <h1 className="course-title-large">{course.title}</h1>
          {course.profiles?.name && (
            <p className="course-instructor-large" style={{ color: 'var(--neon-cyan)', fontWeight: 500, margin: '2px 0 8px 0' }}>
              Instructor: {course.profiles.name}
            </p>
          )}
          <p className="course-desc-large" style={{ marginBottom: '8px' }}>{course.description}</p>
          
          <div className="course-stats" style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>📚 {lessons?.length || 0} Lessons</span>
            <span className="text-gradient">⚡ {course.total_xp} Total XP</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>
              ⭐ {reviewsData.stats.averageRating > 0 ? `${reviewsData.stats.averageRating} / 5.0 (${reviewsData.stats.totalReviews} ${reviewsData.stats.totalReviews === 1 ? 'review' : 'reviews'})` : 'New Course'}
            </span>
          </div>


          {userCertificate ? (
            <Link href={`/certificates/${userCertificate.id}`} style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '16px', width: '100%' }}>
              <div 
                className="dummy-certificate-preview hover-lift"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'rgba(57, 255, 20, 0.1)', border: '1px solid var(--neon-lime)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 0 5px rgba(57,255,20,0.5))' }}>🎓</div>
                <div>
                  <div style={{ color: 'var(--neon-lime)', fontWeight: 600, fontSize: '0.9rem' }}>View Your Certificate</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>You have successfully completed this course</div>
                </div>
              </div>
            </Link>
          ) : (
            <Link href={`/certificates/dummy?courseId=${courseId}`} style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '16px', width: '100%' }}>
              <div 
                className="dummy-certificate-preview hover-lift"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 0 5px rgba(255,215,0,0.5))' }}>📜</div>
                <div>
                  <div style={{ color: 'var(--neon-gold)', fontWeight: 600, fontSize: '0.9rem' }}>Certificate of Completion</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Click to preview course certificate template</div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="course-action" style={{ flex: 1, minWidth: '250px' }}>
              {!enrollment ? (
                <EnrollCourseButton 
                  courseId={courseId} 
                  courseTitle={course.title} 
                  formAction={enrollInCourseFormAction.bind(null, courseId)} 
                />
              ) : enrollment.status === 'pending' ? (
                <div className="enrolled-status">
                  <span className="status-text text-warning">⏳ Pending Approval</span>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Waiting for instructor to approve your request.</p>
                </div>
              ) : enrollment.status === 'rejected' ? (
                <div className="enrolled-status" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="status-text text-danger" style={{ marginBottom: 0 }}>❌ Enrollment Rejected</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: 0 }}>Please contact the instructor for more details.</p>
                  <form action={reapplyEnrollmentFormAction.bind(null, courseId)}>
                    <Button 
                      type="submit" 
                      size="sm"
                      confirmMessage={`Are you sure you want to reset your enrollment request for ${course.title}?`}
                      style={{ 
                        background: 'rgba(255, 59, 48, 0.1)', 
                        border: '1px solid rgba(255, 59, 48, 0.4)', 
                        color: '#ff4d4f',
                        marginTop: '4px',
                        width: '100%'
                      }}
                    >
                      Request Again
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="enrolled-status">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <span className="status-text">✓ Enrolled</span>
                    <LeaveCourseButton courseId={courseId} />
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-fill" style={{ width: `${Math.round((enrollment.progress || 0) * 100)}%` }} />
                  </div>
                  <span className="progress-value">{Math.round((enrollment.progress || 0) * 100)}% Complete</span>
                </div>
              )}
            </div>
            
            <div className="course-meta-actions" style={{ flex: 1, minWidth: '250px' }}>
              {enrolledStudents && enrolledStudents.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', marginLeft: '8px' }}>
                    {enrolledStudents.slice(0, 3).map((student: any, i: number) => (
                      <div key={student.user_id} style={{ position: 'relative', width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--glass-bg)', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -8, overflow: 'hidden', zIndex: 3 - i }}>
                        <UserAvatar url={student.profiles?.avatar_url} name={student.profiles?.name} size={28} />
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {enrolledStudents.length} joined
                  </span>
                  {enrolledStudents.length > 3 && (
                    <a href="#joined-students" style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', cursor: 'pointer', textDecoration: 'none' }}>
                      View all
                    </a>
                  )}
                </div>
              ) : (
                <div />
              )}
              <div className="course-enroll-actions">
                <ShareCourseButton courseId={courseId} />
              </div>
            </div>
          </div>
        </div>
        {course.thumbnail_url && (
          <div className="course-hero-image">
            <Image 
              src={course.thumbnail_url} 
              alt={course.title} 
              width={500} 
              height={300} 
              style={{ width: '100%', height: 'auto', display: 'block' }} 
            />
          </div>
        )}
      </div>

      <div id="joined-students" className="enrolled-students-section" style={{ marginTop: 'var(--space-xl)' }}>
        <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>Joined Students</h2>
        <JoinedStudentsList 
          enrollments={enrolledStudents || []} 
          currentUserId={user.id} 
          isStaff={Boolean(isStaffUser || course.created_by === user.id)} 
        />
      </div>

      {/* End of Course Feedback Prompt */}
      {isEnrolled && isCourseCompleted && (
        <div style={{ marginTop: 'var(--space-2xl)' }}>
          <EndOfCourseReviewCard 
            courseId={courseId} 
            courseTitle={course.title} 
            existingRating={reviewsData.userReview?.rating} 
            existingFeedback={reviewsData.userReview?.review_text || ''} 
          />
        </div>
      )}

      {/* Course Public Reviews Section */}
      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <CourseReviewsSection 
          courseId={courseId} 
          currentUserId={user.id} 
          isEnrolled={isEnrolled} 
          isStaff={Boolean(isStaffUser || course.created_by === user.id)} 
          reviews={reviewsData.reviews} 
          userReview={reviewsData.userReview || null} 
          stats={reviewsData.stats} 
        />
      </div>
    </div>
  );
}

