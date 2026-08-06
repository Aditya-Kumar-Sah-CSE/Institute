'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Type, X, Loader2, Check, Palette } from 'lucide-react';
import { uploadStoryMedia, createStoryItem } from '@/features/stories/actions/stories';

interface StoryComposerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryAdded: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_SIZE_MB = 20;

const TEXT_BG_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
  'linear-gradient(135deg, #1a1a1a 0%, #3d0025 100%)',
];

type Mode = 'choose' | 'gallery' | 'text';

export default function StoryComposerSheet({ isOpen, onClose, onStoryAdded }: StoryComposerSheetProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Text status state
  const [textContent, setTextContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (isUploading) return;
    setMode('choose');
    setTextContent('');
    setError(null);
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError(null);

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
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const { url, mediaType } = await uploadStoryMedia(formData);
        await createStoryItem({
          mediaUrl: url,
          thumbnailUrl: null,
          mediaType,
          caption: '',
        });
      }
      onStoryAdded();
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTextPost = async () => {
    if (!textContent.trim() || isUploading) return;
    setError(null);
    setIsUploading(true);
    try {
      await createStoryItem({
        mediaUrl: null,
        thumbnailUrl: null,
        mediaType: 'text',
        caption: textContent.trim(),
        // Store bg gradient index as part of the thumbnail_url field for simplicity
      });
      onStoryAdded();
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                {mode !== 'choose' ? (
                  <button
                    onClick={() => { setMode('choose'); setError(null); }}
                    style={{ fontSize: '0.9rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    ← Back
                  </button>
                ) : (
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple">
                    Create Status
                  </h2>
                )}

                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  style={{ padding: '0.5rem', borderRadius: '9999px', cursor: 'pointer' }}
                  className="bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Error */}
              {error && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.875rem' }}>
                  {error}
                </div>
              )}

              {/* Upload progress */}
              {isUploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0', gap: '1rem' }}>
                  <Loader2 size={40} className="text-cyan-500 animate-spin" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Posting status...</p>
                </div>
              ) : mode === 'choose' ? (
                /* ─── Choose Mode ──────────────────────────────────── */
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', padding: '0.75rem 0 1rem' }}>
                    {/* Gallery option */}
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

                    {/* Text option */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => setMode('text')}
                        style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e9d5ff', backgroundColor: 'rgba(243, 232, 255, 0.4)' }}
                        className="hover:scale-105 active:scale-95 transition-all shadow-sm"
                      >
                        <Type className="text-purple-600 dark:text-purple-400" size={32} />
                      </button>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-slate-600 dark:text-slate-400">Text</span>
                    </div>
                  </div>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    multiple
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                  />

                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                    Images & videos up to {MAX_SIZE_MB}MB · Disappears after 24h
                  </p>
                </>
              ) : (
                /* ─── Text Status Mode ─────────────────────────────── */
                <div>
                  {/* Preview */}
                  <div
                    style={{
                      height: '14rem',
                      borderRadius: '1rem',
                      background: TEXT_BG_GRADIENTS[selectedBg],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5rem',
                      marginBottom: '1rem',
                      cursor: 'text',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onClick={() => document.getElementById('text-status-input')?.focus()}
                  >
                    {textContent ? (
                      <p style={{ color: 'white', fontWeight: 700, fontSize: '1.4rem', textAlign: 'center', lineHeight: 1.35, textShadow: '0 2px 12px rgba(0,0,0,0.4)', wordBreak: 'break-word' }}>
                        {textContent}
                      </p>
                    ) : (
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '1rem', textAlign: 'center' }}>
                        Type something...
                      </p>
                    )}
                  </div>

                  {/* Text input */}
                  <textarea
                    id="text-status-input"
                    value={textContent}
                    onChange={e => setTextContent(e.target.value)}
                    placeholder="What's on your mind?"
                    maxLength={200}
                    rows={2}
                    style={{
                      width: '100%',
                      borderRadius: '0.75rem',
                      padding: '0.75rem 1rem',
                      resize: 'none',
                      fontSize: '0.95rem',
                      outline: 'none',
                      border: '1px solid',
                      marginBottom: '0.75rem',
                      fontFamily: 'inherit',
                    }}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-cyan-400"
                  />

                  {/* Background selector */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Palette size={14} className="text-slate-500" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-slate-500">Background</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {TEXT_BG_GRADIENTS.map((bg, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedBg(i)}
                          style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '50%',
                            background: bg,
                            border: selectedBg === i ? '3px solid #22d3ee' : '2px solid transparent',
                            outline: selectedBg === i ? '1px solid rgba(34,211,238,0.3)' : 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Post button */}
                  <button
                    onClick={handleTextPost}
                    disabled={!textContent.trim()}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.75rem',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: textContent.trim() ? 'pointer' : 'not-allowed',
                      background: textContent.trim() ? 'linear-gradient(135deg, #22d3ee, #818cf8)' : 'rgba(100,116,139,0.3)',
                      color: textContent.trim() ? 'white' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <Check size={18} /> Post Status
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
