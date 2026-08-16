'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createDoubt } from '@/features/doubts/actions/doubts';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUploadButton from '@/components/ui/ImageUploadButton';
import { Send } from 'lucide-react';

interface AskDoubtModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
  lessonId?: string;
  initialFileUrl?: string | null;
}

export default function AskDoubtModal({ isOpen, onClose, courseId, lessonId, initialFileUrl }: AskDoubtModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  
  const searchParams = useSearchParams();
  const sharedCode = searchParams ? searchParams.get('sharedCode') : null;
  const sharedLanguage = searchParams ? searchParams.get('sharedLanguage') : null;

  useEffect(() => {
    if (isOpen) {
      const cleanUrl = (initialFileUrl || '').split('?')[0].toLowerCase();
      const isPdf = cleanUrl.endsWith('.pdf');
      const isImageMatch = /\.(jpeg|jpg|gif|png|webp|svg|bmp|heic)$/i.test(cleanUrl) || 
                           initialFileUrl?.includes('/storage/v1/object/public/') ||
                           initialFileUrl?.includes('lesson_notes') ||
                           initialFileUrl?.includes('doubts') ||
                           initialFileUrl?.startsWith('data:image/');
      
      let initialVal = '';
      if (initialFileUrl) {
        initialVal = isPdf 
          ? `\n\n[View Shared File](${initialFileUrl})` 
          : isImageMatch 
              ? `\n\n![Shared Image](${initialFileUrl})` 
              : `\n\n[Shared Link](${initialFileUrl})`;
      } else if (sharedCode) {
        const lang = sharedLanguage === 'cpp17' ? 'cpp' : (sharedLanguage || 'cpp');
        initialVal = `\n\n\`\`\`${lang}\n${sharedCode}\n\`\`\``;
      }
      setDescription(initialVal);
    }
  }, [isOpen, initialFileUrl, sharedCode, sharedLanguage]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    // Ensure the state-managed description is in the form data
    formData.set('description', description);

    const result = await createDoubt(formData);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ask a Doubt (+10 XP ⚡)">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {error && <div style={{ color: 'var(--neon-pink)', background: 'rgba(255, 71, 87, 0.1)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
        
        {courseId && <input type="hidden" name="course_id" value={courseId} />}
        {lessonId && <input type="hidden" name="lesson_id" value={lessonId} />}

        {initialFileUrl && (
          <div style={{
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {/\.(jpeg|jpg|gif|png|webp|svg|bmp|heic)$/i.test(initialFileUrl.split('?')[0]) || initialFileUrl.includes('lesson_notes') || initialFileUrl.includes('doubts') ? (
              <img src={initialFileUrl} alt="Shared attachment preview" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--glass-border)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(0, 240, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📄</div>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neon-cyan)', marginBottom: '2px' }}>✓ Shared Attachment Attached</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                Image preview will automatically display in your doubt post
              </div>
            </div>
          </div>
        )}

        <Input 
          name="title" 
          label="Doubt Title" 
          placeholder="e.g. How does React useEffect work?" 
          required 
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-secondary)' }}>
            Description (Markdown Supported)
          </label>
          <textarea 
            name="description"
            id="doubt-description" 
            rows={5} 
            required 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain your doubt in detail... (Ask to earn +10 XP!)"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-sm)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          <div style={{ alignSelf: 'flex-start' }}>
            <ImageUploadButton onUpload={(markdown) => {
              const textarea = document.getElementById('doubt-description') as HTMLTextAreaElement;
              if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                textarea.value = text.substring(0, start) + '\\n\\n' + markdown + '\\n\\n' + text.substring(end);
                textarea.focus();
                textarea.selectionStart = start + markdown.length + 4;
                textarea.selectionEnd = start + markdown.length + 4;
              }
            }} />
          </div>
        </div>



        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', alignItems: 'center' }}>
          <Button type="button" variant="ghost" onClick={onClose} style={{ borderRadius: 'var(--radius-full)' }}>Cancel</Button>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={isSubmitting}
            title="Post Doubt"
            style={{
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {isSubmitting ? '...' : <Send size={18} style={{ marginLeft: '-2px' }} />}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
