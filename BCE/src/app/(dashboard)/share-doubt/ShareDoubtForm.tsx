'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import LazyAttachment from '@/components/ui/LazyAttachment';
import { Select } from '@/components/ui/Input';

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
          <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--text-primary)' }}>Shared Content Preview:</span>
            {(() => {
              const url = fileUrl.split('?')[0].toLowerCase();
              const isPdf = url.endsWith('.pdf');
              const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || fileUrl.includes('storage/v1/object/public/lesson_notes/');
              
              if (isPdf || isImage) {
                return (
                  <div style={{ maxWidth: '300px', width: '100%' }}>
                    <LazyAttachment url={fileUrl} type={isPdf ? 'pdf' : 'image'} title={fileName || 'Shared File'} />
                  </div>
                );
              }
              // Normal URL Link
              return (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-cyan)', wordBreak: 'break-all' }}>
                  {fileName || fileUrl}
                </a>
              );
            })()}
          </div>
        )}

        <div>
          <Select 
            label="Select Course"
            name="course"
            value={selectedCourse} 
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedLesson('');
            }}
            options={[{ value: '', label: '-- Choose a Course --' }, ...courses.map(course => ({ value: course.id, label: course.title }))]}
            required
          />
        </div>

        {selectedCourse && (
          <div>
            <Select 
              label="Select Lesson"
              name="lesson"
              value={selectedLesson} 
              onChange={(e) => setSelectedLesson(e.target.value)}
              options={[{ value: '', label: '-- Choose a Lesson --' }, ...lessons.map(lesson => ({ value: lesson.id, label: lesson.title }))]}
              required
            />
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
