'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

export default function ShareDoubtForm({ 
  fileUrl, 
  fileName, 
  courses 
}: { 
  fileUrl: string; 
  fileName: string; 
  courses: any[] 
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedCourse, setSelectedCourse] = useState('');
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchLessons() {
      if (!selectedCourse) {
        setLessons([]);
        return;
      }
      const { data } = await supabase
        .from('lessons')
        .select('id, title, sort_order')
        .eq('course_id', selectedCourse)
        .order('sort_order', { ascending: true });
      if (data) {
        setLessons(data);
      }
    }
    fetchLessons();
  }, [selectedCourse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return alert('Please select a course.');
    if (!selectedLesson) return alert('Please select a lesson.');
    if (!fileUrl) return alert('No file uploaded.');

    setIsSubmitting(true);
    
    // Redirect to the lesson page with search params to open Ask Doubt modal automatically
    const targetUrl = new URL(`/courses/${selectedCourse}/${selectedLesson}`, window.location.origin);
    targetUrl.searchParams.set('askDoubt', 'true');
    targetUrl.searchParams.set('sharedFileUrl', fileUrl);
    targetUrl.searchParams.set('sharedFileName', fileName || '');
    
    router.push(targetUrl.toString());
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {fileUrl && (
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <strong>Shared File:</strong> <br/>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-cyan)' }}>
              {fileName || 'View File'}
            </a>
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>Select Course</label>
          <select 
            value={selectedCourse} 
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedLesson('');
            }}
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            required
          >
            <option value="">-- Choose a Course --</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>

        {selectedCourse && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>Select Lesson</label>
            <select 
              value={selectedLesson} 
              onChange={(e) => setSelectedLesson(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              required
            >
              <option value="">-- Choose a Lesson --</option>
              {lessons.map(lesson => (
                <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
              ))}
            </select>
          </div>
        )}

        <Button 
          type="submit" 
          disabled={isSubmitting || !selectedCourse || !selectedLesson}
          variant="primary"
          style={{ marginTop: '1rem', width: '100%' }}
        >
          {isSubmitting ? 'Loading...' : 'Proceed Details'}
        </Button>
      </form>
    </div>
  );
}
