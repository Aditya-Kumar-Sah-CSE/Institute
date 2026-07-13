'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LazyAttachment from '@/components/ui/LazyAttachment';

export default function ShareUploadForm({ 
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
  const [targetLevel, setTargetLevel] = useState<'course' | 'notice'>('course');
  const [actionChoice, setActionChoice] = useState<'new_lesson' | 'existing_lesson' | 'new_assignment'>('new_lesson');
  
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchLessons() {
      if (!selectedCourse) {
        setLessons([]);
        return;
      }
      const { data } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', selectedCourse)
        .order('sort_order', { ascending: true });
      if (data) {
        setLessons(data);
      }
    }
    fetchLessons();
  }, [selectedCourse, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl) return alert('No file uploaded.');

    setIsSubmitting(true);

    try {
      if (targetLevel === 'notice') {
        if (!newNoticeTitle) return alert('Please provide a notice title.');
        if (!newNoticeContent) return alert('Please provide notice content.');
        
        const { data: userData } = await supabase.auth.getUser();
        
        const { error } = await supabase.from('notices').insert({
          title: newNoticeTitle,
          content: newNoticeContent,
          image_url: fileUrl,
          author_id: userData.user?.id
        });
        if (error) throw error;
        
        router.push(`/notices`);
        return;
      }

      // Course Logic below
      if (!selectedCourse) return alert('Please select a course.');

      if (actionChoice === 'new_lesson') {
        if (!newLessonTitle) return alert('Please provide a lesson title.');
        const sortOrder = lessons.length > 0 ? lessons[lessons.length - 1].sort_order + 1 : 1;
        const weekNumber = 1;

        const { error } = await supabase.from('lessons').insert({
          course_id: selectedCourse,
          title: newLessonTitle,
          pdf_url: fileUrl,
          notes: fileName,
          sort_order: sortOrder,
          week_number: weekNumber,
          xp_reward: 10
        });
        if (error) throw error;
        
      } else if (actionChoice === 'existing_lesson') {
        if (!selectedLesson) return alert('Please select an existing lesson.');
        const { error } = await supabase.from('lessons').update({
          pdf_url: fileUrl
        }).eq('id', selectedLesson);
        if (error) throw error;

      } else if (actionChoice === 'new_assignment') {
        if (!selectedLesson) return alert('Please select an existing lesson.');
        if (!newAssignmentTitle) return alert('Please provide an assignment title.');
        
        const { error } = await supabase.from('assignments').insert({
          lesson_id: selectedLesson,
          type: 'any',
          title: newAssignmentTitle,
          description: `Review the attached file for this assignment: ${fileUrl}`,
          xp_reward: 50,
          requires_github: false,
          requires_deploy: false
        });
        if (error) throw error;
      }

      router.push(`/admin/courses/${selectedCourse}/builder`);
    } catch (err: any) {
      console.error(err);
      alert('Error saving data: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {fileUrl && (
          <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>Uploaded Content Preview:</span>
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
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Share Target Level</label>
          <div style={{ display: 'flex', gap: '1rem', backgroundColor: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: targetLevel === 'course' ? 'bold' : 'normal', color: targetLevel === 'course' ? 'var(--neon-cyan)' : 'inherit' }}>
              <input type="radio" checked={targetLevel === 'course'} onChange={() => setTargetLevel('course')} style={{ scale: 1.2 }} />
              Course Material
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: targetLevel === 'notice' ? 'bold' : 'normal', color: targetLevel === 'notice' ? 'var(--neon-pink)' : 'inherit' }}>
              <input type="radio" checked={targetLevel === 'notice'} onChange={() => setTargetLevel('notice')} style={{ scale: 1.2 }} />
              Campus Notice
            </label>
          </div>
        </div>

        {targetLevel === 'notice' && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notice Title</label>
              <input 
                type="text" 
                value={newNoticeTitle} 
                onChange={(e) => setNewNoticeTitle(e.target.value)}
                placeholder="e.g. Important Announcement"
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notice Content</label>
              <textarea 
                value={newNoticeContent} 
                onChange={(e) => setNewNoticeContent(e.target.value)}
                rows={4}
                placeholder="Enter details about this notice..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', resize: 'vertical' }}
                required
              />
            </div>
          </>
        )}

        {targetLevel === 'course' && (
          <>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Course</label>
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                required={targetLevel === 'course'}
              >
                <option value="">-- Choose a Course --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>

        {selectedCourse && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Action</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                <input type="radio" checked={actionChoice === 'new_lesson'} onChange={() => setActionChoice('new_lesson')} style={{ scale: 1.2 }} />
                Add New Lesson/Material
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                <input type="radio" checked={actionChoice === 'existing_lesson'} onChange={() => setActionChoice('existing_lesson')} style={{ scale: 1.2 }} />
                Update Existing Lesson Material
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                <input type="radio" checked={actionChoice === 'new_assignment'} onChange={() => setActionChoice('new_assignment')} style={{ scale: 1.2 }} />
                Add Assignment to Existing Lesson
              </label>
            </div>
          </div>
        )}

        {actionChoice === 'new_lesson' && selectedCourse && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Lesson Title</label>
            <input 
              type="text" 
              value={newLessonTitle} 
              onChange={(e) => setNewLessonTitle(e.target.value)}
              placeholder="e.g. Chapter 1: Introduction"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              required
            />
          </div>
        )}

        {(actionChoice === 'existing_lesson' || actionChoice === 'new_assignment') && selectedCourse && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Existing Lesson</label>
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

        {actionChoice === 'new_assignment' && selectedLesson && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Assignment Title</label>
            <input 
              type="text" 
              value={newAssignmentTitle} 
              onChange={(e) => setNewAssignmentTitle(e.target.value)}
              placeholder="e.g. Analyze the provided image/pdf"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              required
            />
          </div>
        )}

          </>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting || (targetLevel === 'course' && !selectedCourse) || (targetLevel === 'notice' && (!newNoticeTitle || !newNoticeContent))}
          style={{ 
            marginTop: '1rem',
            padding: '0.75rem 1.5rem', 
            backgroundColor: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            borderRadius: 'var(--radius-md)',
            fontWeight: 'bold',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save & Continue'}
        </button>

      </form>
    </div>
  );
}
