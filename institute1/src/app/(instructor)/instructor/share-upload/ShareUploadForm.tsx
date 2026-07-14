'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LazyAttachment from '@/components/ui/LazyAttachment';
import { Select } from '@/components/ui/Input';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import { Trash2 } from 'lucide-react';

export default function ShareUploadForm({ 
  attachments = [], 
  courses 
}: { 
  attachments: { url: string; name: string }[]; 
  courses: any[] 
}) {
  const router = useRouter();
  const supabase = createClient();
  
  const [localAttachments, setLocalAttachments] = useState(attachments);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  useEffect(() => {
    setLocalAttachments(attachments);
  }, [attachments]);

  // Adjust preview index if items are deleted out of bounds
  useEffect(() => {
    if (currentPreviewIndex >= localAttachments.length && localAttachments.length > 0) {
      setCurrentPreviewIndex(localAttachments.length - 1);
    }
  }, [localAttachments.length, currentPreviewIndex]);

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
    if (localAttachments.length === 0) return alert('No file uploaded. Please add at least one item.');

    setIsSubmitting(true);

    try {
      if (targetLevel === 'notice') {
        if (!newNoticeTitle) return alert('Please provide a notice title.');
        if (!newNoticeContent) return alert('Please provide notice content.');
        
        const { data: userData } = await supabase.auth.getUser();
        
        const { error } = await supabase.from('notices').insert({
          title: newNoticeTitle,
          content: newNoticeContent,
          image_url: localAttachments.map(a => a.url),
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
          pdf_url: localAttachments.map(a => a.url),
          notes: localAttachments.map(a => a.name).join(', ') || 'Course Material',
          sort_order: sortOrder,
          week_number: weekNumber,
          xp_reward: 10
        });
        if (error) throw error;
        
      } else if (actionChoice === 'existing_lesson') {
        if (!selectedLesson) return alert('Please select an existing lesson.');
        const { error } = await supabase.from('lessons').update({
          pdf_url: localAttachments.map(a => a.url)
        }).eq('id', selectedLesson);
        if (error) throw error;

      } else if (actionChoice === 'new_assignment') {
        if (!selectedLesson) return alert('Please select an existing lesson.');
        if (!newAssignmentTitle) return alert('Please provide an assignment title.');
        
        const { error } = await supabase.from('assignments').insert({
          lesson_id: selectedLesson,
          type: 'any',
          title: newAssignmentTitle,
          description: `Review the attached file(s) for this assignment: ${localAttachments.map(a => a.url).join(', ')}`,
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
        
        <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>
              Uploaded Content Preview {localAttachments.length > 0 && `(${localAttachments.length})`}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ImageUploadButton 
                bucketName="lesson_notes"
                onUpload={(md) => {
                  const urls = md.split('\\n\\n').map(m => m.match(/\\((.*?)\\)/)?.[1]).filter(Boolean) as string[];
                  if (urls.length > 0) {
                    setLocalAttachments(prev => [...prev, ...urls.map(url => ({ url, name: `Added Image` }))]);
                    setCurrentPreviewIndex(localAttachments.length);
                  }
                }}
              />
              {localAttachments.length > 0 && (
                <button 
                  type="button"
                  onClick={() => {
                    setLocalAttachments(prev => prev.filter((_, i) => i !== currentPreviewIndex));
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '6px 12px', background: 'rgba(233, 69, 96, 0.1)', color: 'var(--neon-red)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
                >
                  <Trash2 size={14} /> Remove Selected
                </button>
              )}
            </div>
          </div>

          {localAttachments.length === 0 ? (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No images or files attached yet.
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              
              {(() => {
                if (!localAttachments[currentPreviewIndex]) return null;
                const currentFile = localAttachments[currentPreviewIndex];
                const url = currentFile.url.split('?')[0].toLowerCase();
                const isPdf = url.endsWith('.pdf');
                const isImage = url.match(/\\.(jpeg|jpg|gif|png|webp)$/i) || currentFile.url.includes('storage/v1/object/public/lesson_notes/');
                
                if (isPdf || isImage) {
                  return (
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: 0, padding: 0 }}>
                      <LazyAttachment url={currentFile.url} type={isPdf ? 'pdf' : 'image'} title={currentFile.name || 'Shared File'} />
                    </div>
                  );
                }
                return (
                  <a href={currentFile.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-cyan)', wordBreak: 'break-all' }}>
                    {currentFile.name || currentFile.url}
                  </a>
                );
              })()}

              {localAttachments.length > 1 && (
                <div style={{ display: 'flex', gap: '20px', marginTop: 'min(var(--space-md), 4vh)', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPreviewIndex(prev => prev === 0 ? localAttachments.length - 1 : prev - 1)}
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    &lt;
                  </button>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {currentPreviewIndex + 1} of {localAttachments.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPreviewIndex(prev => prev === localAttachments.length - 1 ? 0 : prev + 1)}
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    &gt;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
            <Select 
              label="Select Course"
              value={selectedCourse} 
              onChange={(e) => setSelectedCourse(e.target.value)}
              options={[
                { value: '', label: '-- Choose a Course --' },
                ...courses.map((course: any) => ({ value: course.id, label: course.title }))
              ]}
              required={targetLevel === 'course'}
            />

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
          <Select 
            label="Select Existing Lesson"
            value={selectedLesson} 
            onChange={(e) => setSelectedLesson(e.target.value)}
            options={[
              { value: '', label: '-- Choose a Lesson --' },
              ...lessons.map((lesson: any) => ({ value: lesson.id, label: lesson.title }))
            ]}
            required
          />
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
          disabled={isSubmitting || localAttachments.length === 0 || (targetLevel === 'course' && !selectedCourse) || (targetLevel === 'notice' && (!newNoticeTitle || !newNoticeContent))}
          style={{ 
            marginTop: '1rem',
            padding: '0.75rem 1.5rem', 
            backgroundColor: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            borderRadius: 'var(--radius-md)',
            fontWeight: 'bold',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: (isSubmitting || localAttachments.length === 0) ? 0.7 : 1
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save & Continue'}
        </button>

      </form>
    </div>
  );
}

