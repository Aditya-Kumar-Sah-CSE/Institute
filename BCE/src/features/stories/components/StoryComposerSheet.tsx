'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ImageIcon, Type, X, Loader2, Check, Palette, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type as FontIcon, Sparkles 
} from 'lucide-react';
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

const FONT_OPTIONS = [
  { label: 'Sans', family: 'Inter, system-ui, sans-serif' },
  { label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono', family: '"Courier New", Courier, monospace' },
  { label: 'Cursive', family: '"Brush Script MT", "Caveat", cursive' },
  { label: 'Impact', family: 'Impact, "Arial Black", sans-serif' },
  { label: 'Comic', family: '"Comic Sans MS", "Chalkboard SE", sans-serif' }
];

const TEXT_COLORS = [
  '#ffffff', // White
  '#ffee00', // Neon Yellow
  '#00f0ff', // Neon Cyan
  '#ff007f', // Neon Pink
  '#39ff14', // Neon Lime
  '#ffd700', // Gold
  '#000000', // Pitch Black
];

const FONT_SIZES = [
  { label: 'S', size: '1.2rem' },
  { label: 'M', size: '1.5rem' },
  { label: 'L', size: '1.9rem' },
  { label: 'XL', size: '2.4rem' },
];

type Mode = 'choose' | 'gallery' | 'text';

export default function StoryComposerSheet({ isOpen, onClose, onStoryAdded }: StoryComposerSheetProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Text status rich formatting state
  const [textContent, setTextContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(0);
  const [selectedFont, setSelectedFont] = useState(0);
  const [selectedTextColor, setSelectedTextColor] = useState('#ffffff');
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [selectedSize, setSelectedSize] = useState(2); // Default 'L'
  
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
      const payload = JSON.stringify({
        text: textContent.trim(),
        bg: TEXT_BG_GRADIENTS[selectedBg],
        font: FONT_OPTIONS[selectedFont].family,
        textColor: selectedTextColor,
        isBold,
        isItalic,
        isUnderline,
        textAlign,
        fontSize: FONT_SIZES[selectedSize].size
      });

      await createStoryItem({
        mediaUrl: null,
        thumbnailUrl: selectedBg.toString(),
        mediaType: 'text',
        caption: payload,
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
                <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {/* Preview Canvas */}
                  <div
                    style={{
                      height: '13rem',
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
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                    }}
                    onClick={() => document.getElementById('text-status-input')?.focus()}
                  >
                    {textContent ? (
                      <p 
                        style={{ 
                          color: selectedTextColor, 
                          fontFamily: FONT_OPTIONS[selectedFont].family,
                          fontWeight: isBold ? 700 : 400,
                          fontStyle: isItalic ? 'italic' : 'normal',
                          textDecoration: isUnderline ? 'underline' : 'none',
                          textAlign: textAlign,
                          fontSize: FONT_SIZES[selectedSize].size,
                          lineHeight: 1.35, 
                          textShadow: '0 2px 12px rgba(0,0,0,0.4)', 
                          wordBreak: 'break-word',
                          maxWidth: '100%'
                        }}
                      >
                        {textContent}
                      </p>
                    ) : (
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '1.1rem', textAlign: 'center', fontFamily: FONT_OPTIONS[selectedFont].family }}>
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
                      fontFamily: FONT_OPTIONS[selectedFont].family,
                    }}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-cyan-400"
                  />

                  {/* 1. Font Family Selector */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <FontIcon size={14} className="text-cyan-500" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-slate-500">Font Family</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '4px' }}>
                      {FONT_OPTIONS.map((font, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedFont(i)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '9999px',
                            fontFamily: font.family,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            border: selectedFont === i ? '1px solid #22d3ee' : '1px solid rgba(148, 163, 184, 0.2)',
                            background: selectedFont === i ? 'rgba(34, 211, 238, 0.15)' : 'rgba(148, 163, 184, 0.05)',
                            color: selectedFont === i ? '#22d3ee' : 'inherit',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Text Formatting & Alignment Toolbar */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Bold / Italic / Underline */}
                    <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'rgba(148, 163, 184, 0.1)', padding: '3px', borderRadius: '0.5rem' }}>
                      <button
                        onClick={() => setIsBold(!isBold)}
                        style={{
                          padding: '0.4rem 0.6rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: isBold ? 'rgba(34, 211, 238, 0.25)' : 'transparent',
                          color: isBold ? '#22d3ee' : 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Bold"
                      >
                        <Bold size={15} />
                      </button>
                      <button
                        onClick={() => setIsItalic(!isItalic)}
                        style={{
                          padding: '0.4rem 0.6rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: isItalic ? 'rgba(34, 211, 238, 0.25)' : 'transparent',
                          color: isItalic ? '#22d3ee' : 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Italic"
                      >
                        <Italic size={15} />
                      </button>
                      <button
                        onClick={() => setIsUnderline(!isUnderline)}
                        style={{
                          padding: '0.4rem 0.6rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: isUnderline ? 'rgba(34, 211, 238, 0.25)' : 'transparent',
                          color: isUnderline ? '#22d3ee' : 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Underline"
                      >
                        <Underline size={15} />
                      </button>
                    </div>

                    {/* Alignment */}
                    <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'rgba(148, 163, 184, 0.1)', padding: '3px', borderRadius: '0.5rem' }}>
                      <button
                        onClick={() => setTextAlign('left')}
                        style={{
                          padding: '0.4rem 0.6rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: textAlign === 'left' ? 'rgba(34, 211, 238, 0.25)' : 'transparent',
                          color: textAlign === 'left' ? '#22d3ee' : 'inherit',
                        }}
                        title="Align Left"
                      >
                        <AlignLeft size={15} />
                      </button>
                      <button
                        onClick={() => setTextAlign('center')}
                        style={{
                          padding: '0.4rem 0.6rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: textAlign === 'center' ? 'rgba(34, 211, 238, 0.25)' : 'transparent',
                          color: textAlign === 'center' ? '#22d3ee' : 'inherit',
                        }}
                        title="Align Center"
                      >
                        <AlignCenter size={15} />
                      </button>
                      <button
                        onClick={() => setTextAlign('right')}
                        style={{
                          padding: '0.4rem 0.6rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: 'pointer',
                          background: textAlign === 'right' ? 'rgba(34, 211, 238, 0.25)' : 'transparent',
                          color: textAlign === 'right' ? '#22d3ee' : 'inherit',
                        }}
                        title="Align Right"
                      >
                        <AlignRight size={15} />
                      </button>
                    </div>

                    {/* Font Size */}
                    <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'rgba(148, 163, 184, 0.1)', padding: '3px', borderRadius: '0.5rem' }}>
                      {FONT_SIZES.map((sz, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedSize(i)}
                          style={{
                            padding: '0.3rem 0.5rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            background: selectedSize === i ? 'rgba(34, 211, 238, 0.25)' : 'transparent',
                            color: selectedSize === i ? '#22d3ee' : 'inherit',
                          }}
                        >
                          {sz.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Text Color Selector */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <Sparkles size={14} className="text-purple-400" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-slate-500">Text Color</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {TEXT_COLORS.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedTextColor(c)}
                          style={{
                            width: '1.75rem',
                            height: '1.75rem',
                            borderRadius: '50%',
                            backgroundColor: c,
                            border: selectedTextColor === c ? '3px solid #22d3ee' : '1px solid rgba(255,255,255,0.2)',
                            outline: selectedTextColor === c ? '1px solid rgba(34,211,238,0.4)' : 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 4. Background Selector */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <Palette size={14} className="text-cyan-400" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-slate-500">Background Gradient</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {TEXT_BG_GRADIENTS.map((bg, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedBg(i)}
                          style={{
                            width: '1.75rem',
                            height: '1.75rem',
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
