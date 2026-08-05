'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Type, X, Loader2 } from 'lucide-react';
import { uploadStoryMedia, createStoryItem } from '@/features/stories/actions/stories';

interface StoryComposerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryAdded: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_SIZE_MB = 20;

export default function StoryComposerSheet({ isOpen, onClose, onStoryAdded }: StoryComposerSheetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'institute' | 'everyone'>('institute');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    setError(null);

    // Client-side pre-validation (mirrors server validation for fast feedback)
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`File type "${file.type}" is not supported.`);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File "${file.name}" is too large. Maximum is ${MAX_SIZE_MB}MB.`);
        return;
      }
    }

    try {
      setIsUploading(true);
      
      // Upload each file sequentially via the server action (no anon key exposed)
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        // This runs on the server — authenticated, validated, RLS-compliant
        const uploadRes = await uploadStoryMedia(formData);
        if (!uploadRes.success) throw new Error(uploadRes.error);

        const { url, mediaType } = uploadRes.data;

        const createRes = await createStoryItem({
          mediaUrl: url,
          thumbnailUrl: null,
          mediaType,
          caption: '',
          visibility,
        });
        if (!createRes.success) throw new Error(createRes.error);
      }

      onStoryAdded();
      onClose();
    } catch (err: any) {
      console.error('[StoryComposerSheet] Upload error:', err);
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isUploading ? onClose : undefined}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200 }}
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: '36rem', margin: '0 auto', borderRadius: '1.5rem 1.5rem 0 0', zIndex: 201, overflow: 'hidden' }}
            className="bg-slate-100 dark:bg-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
          >
            {/* Handle Bar */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.75rem', paddingBottom: '0.5rem' }}>
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>
            
            <div style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple">
                  Create Status
                </h2>
                <button
                  onClick={onClose}
                  disabled={isUploading}
                  style={{ padding: '0.5rem', borderRadius: '9999px', cursor: 'pointer' }}
                  className="bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Error Banner */}
              {error && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}

              {isUploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0', gap: '1rem' }}>
                  <Loader2 size={40} className="text-cyan-500 animate-spin" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Uploading media securely...</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: '9999px', padding: '0.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <button
                        onClick={(e) => { e.preventDefault(); setVisibility('institute'); }}
                        style={{
                          padding: '0.375rem 1rem',
                          fontSize: '0.875rem',
                          borderRadius: '9999px',
                          fontWeight: visibility === 'institute' ? 600 : 500,
                          color: visibility === 'institute' ? '#fff' : '#94a3b8',
                          backgroundColor: visibility === 'institute' ? '#06b6d4' : 'transparent',
                          transition: 'all 0.2s ease',
                          cursor: isUploading ? 'not-allowed' : 'pointer',
                          border: 'none',
                          outline: 'none',
                          boxShadow: visibility === 'institute' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                        }}
                        disabled={isUploading}
                      >
                        My Institute
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); setVisibility('everyone'); }}
                        style={{
                          padding: '0.375rem 1rem',
                          fontSize: '0.875rem',
                          borderRadius: '9999px',
                          fontWeight: visibility === 'everyone' ? 600 : 500,
                          color: visibility === 'everyone' ? '#fff' : '#94a3b8',
                          backgroundColor: visibility === 'everyone' ? '#06b6d4' : 'transparent',
                          transition: 'all 0.2s ease',
                          cursor: isUploading ? 'not-allowed' : 'pointer',
                          border: 'none',
                          outline: 'none',
                          boxShadow: visibility === 'everyone' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                        }}
                        disabled={isUploading}
                      >
                        Global
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', padding: '1rem 0' }}>
                  {/* Gallery */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #a5f3fc', backgroundColor: 'rgba(207, 250, 254, 0.4)' }}
                      className="hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                      <ImageIcon className="text-cyan-600 dark:text-cyan-400" size={32} />
                    </button>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-slate-600 dark:text-slate-400">Gallery</span>
                  </div>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    multiple
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />

                  {/* Text Status (placeholder) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => alert('Text status coming soon!')}
                      style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e9d5ff', backgroundColor: 'rgba(243, 232, 255, 0.4)' }}
                      className="hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                      <Type className="text-purple-600 dark:text-purple-400" size={32} />
                    </button>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-slate-600 dark:text-slate-400">Text</span>
                  </div>
                </div>
                </>
              )}

              {/* Info line */}
              {!isUploading && (
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '1rem' }}>
                  Images & videos up to {MAX_SIZE_MB}MB • Disappears after 24h
                </p>
              )}
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
