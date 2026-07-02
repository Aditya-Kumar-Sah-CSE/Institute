import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getDifficultyColor } from '@/lib/utils';
import { enrollInCourseFormAction } from '@/features/courses/actions/enroll';
import LeaveCourseButton from '@/features/courses/components/LeaveCourseButton';
import ShareCourseButton from '@/features/courses/components/ShareCourseButton';
import CoursePollsSection from '@/features/courses/components/CoursePollsSection';
import CourseDoubtsSection from '@/features/courses/components/CourseDoubtsSection';
import './CourseDetail.css';

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch course
  const { data: course } = await supabase
    .from('courses')
    .select('*, profiles(name)')
    .eq('id', courseId)
    .single();

  if (!course) notFound();

  // Fetch lessons
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
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

  return (
    <div className="course-detail-page">
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
            <p className="course-instructor-large" style={{ color: 'var(--neon-cyan)', marginBottom: 'var(--space-md)', fontWeight: 500 }}>
              Instructor: {course.profiles.name}
            </p>
          )}
          <p className="course-desc-large">{course.description}</p>
          
          <div className="course-stats">
            <span>📚 {lessons?.length || 0} Lessons</span>
            <span className="text-gradient">⭐ {course.total_xp} Total XP</span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="course-action" style={{ flex: 1, minWidth: '250px' }}>
              {!enrollment ? (
                <form action={enrollInCourseFormAction.bind(null, courseId)}>
                  <Button variant="primary" size="lg" type="submit">Enroll Now (+20 XP ⚡)</Button>
                </form>
              ) : enrollment.status === 'pending' ? (
                <div className="enrolled-status">
                  <span className="status-text text-warning">⏳ Pending Approval</span>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Waiting for instructor to approve your request.</p>
                </div>
              ) : enrollment.status === 'rejected' ? (
                <div className="enrolled-status">
                  <span className="status-text text-danger">❌ Enrollment Rejected</span>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Please contact the instructor for more details.</p>
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
            
            <ShareCourseButton courseId={courseId} />
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

      <div className="course-interactions-row">
        <div className="course-interaction-col">
          <CoursePollsSection 
            courseId={courseId} 
            currentUserId={user.id} 
            isEnrolledOrFaculty={course.created_by === user.id || !!(enrollment && enrollment.status === 'approved')} 
          />
        </div>

        <div className="course-interaction-col">
          <CourseDoubtsSection 
            courseId={courseId} 
            isEnrolledOrFaculty={course.created_by === user.id || !!(enrollment && enrollment.status === 'approved')} 
          />
        </div>
      </div>

      <div className="lessons-section">
        <h2 className="section-title">Course Curriculum</h2>
        
        {(() => {
          if (!lessons || lessons.length === 0) return null;
          
          const groupedLessons = lessons.reduce((acc, lesson) => {
            const week = lesson.week_number || 1;
            if (!acc[week]) acc[week] = [];
            acc[week].push(lesson);
            return acc;
          }, {} as Record<number, typeof lessons>);
          
          const sortedWeeks = Object.keys(groupedLessons).map(Number).sort((a, b) => a - b);
          let globalLessonIndex = 0;

          return sortedWeeks.map(weekNum => (
            <div key={`week-${weekNum}`} style={{ marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: 'var(--text-xl)', color: 'var(--neon-gold)', marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-xs)', borderBottom: '1px solid var(--glass-border)' }}>
                Week {weekNum}
              </h3>
              <div className="lessons-list">
                {groupedLessons[weekNum].map((lesson: any) => {
                  const index = globalLessonIndex++;
                  const isCompleted = completedLessonIds.has(lesson.id);
                  const isApproved = enrollment && enrollment.status === 'approved';
                  const isLocked = !isApproved; // Lock all lessons if not approved

                  return (
                    <Card 
                      key={lesson.id} 
                      variant={isLocked ? 'default' : 'glass'}
                      className={`lesson-list-item ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                    >
                      <div className="lesson-item-header">
                        <div className="lesson-number">{index + 1}</div>
                        <div className="lesson-item-info">
                          <h3>{lesson.title}</h3>
                          <span className="lesson-reward text-gradient">+{lesson.xp_reward} XP</span>
                        </div>
                      </div>
                      
                      <div className="lesson-item-action">
                        {isLocked ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            {isCompleted && <span className="completed-mark" style={{ color: 'var(--neon-lime)', fontWeight: 'bold' }}>✓</span>}
                            <span className="locked-mark">🔒</span>
                          </div>
                        ) : isCompleted ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <span className="completed-mark" style={{ color: 'var(--neon-lime)', fontWeight: 'bold' }}>✓</span>
                            <Link href={`/courses/${courseId}/${lesson.id}`}>
                              <Button variant="secondary" size="sm">Review / Task</Button>
                            </Link>
                          </div>
                        ) : (
                          <Link href={`/courses/${courseId}/${lesson.id}`}>
                            <Button variant="primary" size="sm">Start Lesson</Button>
                          </Link>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
