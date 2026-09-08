'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  Bold,
  Italic,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Link as LinkIcon,
  Minus,
  Maximize2,
  Minimize2,
  ChevronDown,
  Check,
  RotateCcw,
  Save,
  X,
  Eye,
  Columns,
  Edit3,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { createClient } from '@/lib/supabase/client';

export type EditorMode = 'edit' | 'split' | 'preview';

export interface SolutionEditorProps {
  initialValue?: string;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => Promise<void> | void;
  saving?: boolean;
  onCancel?: () => void;
  title?: string;
}

const SUPPORTED_LANGUAGES = [
  { label: 'C++', value: 'cpp', snippet: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    // C++ solution\n    return 0;\n}' },
  { label: 'C', value: 'c', snippet: '#include <stdio.h>\n\nint main() {\n    // C solution\n    return 0;\n}' },
  { label: 'Java', value: 'java', snippet: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Java solution\n    }\n}' },
  { label: 'Python', value: 'python', snippet: 'import sys\n\ndef solve():\n    # Python solution\n    pass\n\nif __name__ == "__main__":\n    solve()' },
  { label: 'JavaScript', value: 'javascript', snippet: 'const fs = require("fs");\n\nfunction solve() {\n    // JavaScript solution\n}\n\nsolve();' },
  { label: 'TypeScript', value: 'typescript', snippet: 'function solve(): void {\n    // TypeScript solution\n}\n\nsolve();' },
  { label: 'Go', value: 'go', snippet: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Go solution\n    fmt.Println("Hello")\n}' },
  { label: 'Rust', value: 'rust', snippet: 'use std::io;\n\nfn main() {\n    // Rust solution\n}' },
  { label: 'Kotlin', value: 'kotlin', snippet: 'import java.util.Scanner\n\nfun main() {\n    val scanner = Scanner(System.`in`)\n    // Kotlin solution\n}' },
  { label: 'SQL', value: 'sql', snippet: 'SELECT * FROM solution WHERE status = "ACCEPTED";' },
  { label: 'Plain Text', value: 'text', snippet: '// Raw code or pseudocode' },
];

export default function SolutionEditor({
  initialValue = '',
  value,
  onChange,
  onSave,
  saving = false,
  onCancel,
  title = 'Text Solution (Markdown Supported)',
}: SolutionEditorProps) {
  const [mode, setMode] = useState<EditorMode>('split');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('cpp');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [initialVal] = useState<string>(value);
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // --- Image URL Hiding Logic ---
  const hideUrls = (text: string) => {
    return text.replace(/!\[(.*?)\]\((https:\/\/[^\s)]+)\)/g, (match, alt, url) => {
      if (url.length > 50) {
        let id = '';
        const existingKey = Object.keys(urlMap).find(key => urlMap[key] === url);
        if (existingKey) {
          id = existingKey;
        } else {
          id = Math.random().toString(36).substring(2, 9);
          setUrlMap(prev => ({ ...prev, [id]: url }));
        }
        const cleanAlt = alt.startsWith('🖼️ Image: ') ? alt : `🖼️ Image: ${alt}`;
        return `![${cleanAlt}](imgref-${id})`;
      }
      return match;
    });
  };

  const restoreUrls = (text: string) => {
    return text.replace(/!\[(.*?)\]\(imgref-([a-zA-Z0-9]+)\)/g, (match, alt, id) => {
      const realUrl = urlMap[id];
      if (realUrl) {
        const cleanAlt = alt.startsWith('🖼️ Image: ') ? alt.replace('🖼️ Image: ', '') : alt;
        return `![${cleanAlt}](${realUrl})`;
      }
      return match;
    });
  };

  const displayValue = hideUrls(value);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawVal = e.target.value;
    const realVal = restoreUrls(rawVal);
    onChange(realVal);
  };
  // -----------------------------


  // Restore mode from sessionStorage on mount safely without SSR issues
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const savedMode = sessionStorage.getItem('bce_solution_editor_mode') as EditorMode;
      if (savedMode && ['edit', 'split', 'preview'].includes(savedMode)) {
        setMode(savedMode);
      } else if (window.innerWidth < 768) {
        setMode('edit');
      }
    }
  }, []);

  // Update mode with session storage persistence
  const handleModeChange = (newMode: EditorMode) => {
    setMode(newMode);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bce_solution_editor_mode', newMode);
    }
  };

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Keyboard shortcut listener for Esc, Ctrl+B, Ctrl+I, Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Helper to insert markdown syntax at cursor selection
  const insertMarkdown = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = displayValue.substring(start, end) || defaultText;

    const replacement = `${before}${selection}${after}`;
    const newDisplayValue = displayValue.substring(0, start) + replacement + displayValue.substring(end);

    onChange(restoreUrls(newDisplayValue));

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selection.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Insert code block with specific language fence
  const insertCodeBlock = (langValue: string) => {
    const textarea = textareaRef.current;
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.value === langValue) || SUPPORTED_LANGUAGES[0];

    if (!textarea) {
      const newDisplayValue = `${displayValue}\n\n\`\`\`${langObj.value}\n${langObj.snippet}\n\`\`\`\n`;
      onChange(restoreUrls(newDisplayValue));
      setShowLangDropdown(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = displayValue.substring(start, end).trim();
    const codeContent = selectedText || langObj.snippet;

    const fence = `\n\`\`\`${langObj.value}\n${codeContent}\n\`\`\`\n`;
    const newDisplayValue = displayValue.substring(0, start) + fence + displayValue.substring(end);

    onChange(restoreUrls(newDisplayValue));
    setSelectedLanguage(langObj.value);
    setShowLangDropdown(false);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + fence.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Keyboard shortcut handler inside textarea
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertMarkdown('**', '**', 'bold text');
    } else if (isCtrl && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertMarkdown('*', '*', 'italic text');
    } else if (isCtrl && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      insertMarkdown('[', '](https://example.com)', 'link text');
    } else if (isCtrl && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      insertMarkdown('`', '`', 'code');
    }
  };

  // --- Image Upload Handlers ---
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPEG, WEBP, GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size exceeds the 10MB limit.');
      return;
    }

    setIsUploadingImage(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      let url = '';

      // First try Google Drive upload via resumable API
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        const driveRes = await fetch('/api/drive/upload/resumable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'image/png',
            category: 'Notes',
            fileData: base64Data,
          }),
        });

        if (driveRes.ok) {
          const driveData = await driveRes.json();
          if (driveData.proxyUrl) {
            url = driveData.proxyUrl;
          }
        }
      } catch (driveErr) {
        console.warn('[SolutionEditor] Drive upload failed, falling back to Supabase:', driveErr);
      }

      if (!url) {
        const ext = file.name.split('.').pop() || 'png';
        const uniqueName = `${crypto.randomUUID()}-${Date.now()}.${ext}`;
        const filePath = `solution-images/${userId}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from('lesson_notes')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('lesson_notes')
          .getPublicUrl(filePath);

        url = publicUrlData.publicUrl;
      }

      const altText = file.name.split('.')[0] || 'Image';
      insertMarkdown(`![${altText}](`, `${url})`);
    } catch (err: any) {
      alert(err?.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageUpload(file);
          break;
        }
      }
    }
  };

  // Determine dirty state (unsaved changes)
  const isDirty = value !== initialVal;
  const saveStatusText = saving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'Saved';
  const saveStatusColor = saving
    ? 'var(--neon-gold, #facc15)'
    : isDirty
    ? '#f87171'
    : 'var(--neon-emerald, #4ade80)';

  const activeLangLabel = SUPPORTED_LANGUAGES.find((l) => l.value === selectedLanguage)?.label || 'C++';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        ...(isFullscreen
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'var(--bg-main, #0b0f19)',
              padding: '20px',
              overflowY: 'auto',
            }
          : {}),
      }}
    >
      {/* Editor Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: 'var(--text-main, #ffffff)',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Edit3 size={15} style={{ color: 'var(--neon-cyan, #06b6d4)' }} /> {title}
          </h4>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: saveStatusColor,
              background: 'rgba(255,255,255,0.04)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: `1px solid ${saveStatusColor}33`,
              transition: 'all 0.2s ease',
            }}
          >
            ● {saveStatusText}
          </span>
        </div>

        {/* Mode Selector & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Compact View Mode Selector */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
              borderRadius: '6px',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => handleModeChange('edit')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                background: mode === 'edit' ? 'var(--neon-cyan, #06b6d4)' : 'transparent',
                color: mode === 'edit' ? '#000000' : 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Editor only mode"
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('split')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                background: mode === 'split' ? 'var(--neon-cyan, #06b6d4)' : 'transparent',
                color: mode === 'split' ? '#000000' : 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Split editor and live preview"
            >
              <Columns size={12} /> Split
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('preview')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                background: mode === 'preview' ? 'var(--neon-cyan, #06b6d4)' : 'transparent',
                color: mode === 'preview' ? '#000000' : 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Rendered solution preview only"
            >
              <Eye size={12} /> Preview
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
              color: 'var(--text-main, #ffffff)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Editor'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Markdown Toolbar */}
      {mode !== 'preview' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '4px',
            background: 'rgba(20, 20, 30, 0.7)',
            border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
            borderRadius: '6px',
            padding: '4px 8px',
          }}
        >
          <button
            type="button"
            onClick={() => insertMarkdown('**', '**', 'bold text')}
            style={toolbarBtnStyle}
            title="Bold (Ctrl+B)"
            aria-label="Bold text"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('*', '*', 'italic text')}
            style={toolbarBtnStyle}
            title="Italic (Ctrl+I)"
            aria-label="Italic text"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('### ', '', 'Heading')}
            style={toolbarBtnStyle}
            title="Heading 3"
            aria-label="Heading"
          >
            <Heading3 size={13} />
          </button>

          <div style={toolbarDividerStyle} />

          <button
            type="button"
            onClick={() => insertMarkdown('- ', '', 'List item')}
            style={toolbarBtnStyle}
            title="Bullet List"
            aria-label="Bullet List"
          >
            <List size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('1. ', '', 'Numbered item')}
            style={toolbarBtnStyle}
            title="Numbered List"
            aria-label="Numbered List"
          >
            <ListOrdered size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('> ', '', 'Quote text')}
            style={toolbarBtnStyle}
            title="Blockquote"
            aria-label="Quote"
          >
            <Quote size={13} />
          </button>

          <div style={toolbarDividerStyle} />

          <button
            type="button"
            onClick={() => insertMarkdown('`', '`', 'inline_code')}
            style={toolbarBtnStyle}
            title="Inline Code (Ctrl+E)"
            aria-label="Inline Code"
          >
            <Code size={13} />
          </button>

          {/* Code Block Dropdown Button */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              style={{
                ...toolbarBtnStyle,
                gap: '4px',
                padding: '3px 8px',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: 'var(--neon-cyan, #06b6d4)',
              }}
              title="Insert Code Block with Language"
              aria-label="Code Block Language Selector"
            >
              <Code2 size={13} />
              <span style={{ fontSize: '11px', fontWeight: 700 }}>{activeLangLabel}</span>
              <ChevronDown size={11} />
            </button>

            {showLangDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: '#161922',
                  border: '1px solid var(--glass-border, rgba(255,255,255,0.15))',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  zIndex: 1000,
                  minWidth: '160px',
                  padding: '4px 0',
                  maxHeight: '240px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  Code Language
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => insertCodeBlock(lang.value)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 12px',
                      background: selectedLanguage === lang.value ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                      color: selectedLanguage === lang.value ? 'var(--neon-cyan, #06b6d4)' : 'var(--text-main, #e2e8f0)',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        selectedLanguage === lang.value ? 'rgba(6, 182, 212, 0.15)' : 'transparent')
                    }
                  >
                    <span>{lang.label}</span>
                    {selectedLanguage === lang.value && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={toolbarDividerStyle} />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={toolbarBtnStyle}
            title="Insert Image"
            aria-label="Insert Image"
            disabled={isUploadingImage}
          >
            {isUploadingImage ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('[', '](https://)', 'Link text')}
            style={toolbarBtnStyle}
            title="Link (Ctrl+K)"
            aria-label="Link"
          >
            <LinkIcon size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('\n---\n', '', '')}
            style={toolbarBtnStyle}
            title="Horizontal Divider"
            aria-label="Horizontal Divider"
          >
            <Minus size={13} />
          </button>

          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Main Workspace (Editor | Preview) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            mode === 'split' ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
          gap: '16px',
          minHeight: isFullscreen ? 'calc(100vh - 160px)' : '320px',
        }}
      >
        {/* Editor Panes */}
        {mode !== 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <textarea
              ref={textareaRef}
              value={displayValue}
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onPaste={handlePaste}
              placeholder="Write your editorial explanation in Markdown... Use ```cpp, ```java, or ```python for code blocks. Drag & drop images!"
              style={{
                width: '100%',
                height: '100%',
                minHeight: isFullscreen ? '450px' : '260px',
                padding: '14px 16px',
                borderRadius: '8px',
                background: 'var(--bg-card, #12131a)',
                border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
                color: 'var(--text-main, #ffffff)',
                fontSize: '14px',
                fontFamily: "'Fira Code', 'Cascadia Code', Consolas, Monaco, monospace",
                lineHeight: '1.65',
                outline: 'none',
                resize: 'vertical',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted, #94a3b8)', padding: '0 4px' }}>
              <span>Shortcuts: Ctrl+B (Bold) | Ctrl+I (Italic) | Ctrl+K (Link) | Ctrl+E (Code)</span>
              <span>{value.length} characters</span>
            </div>
          </div>
        )}

        {/* Preview Panes */}
        {mode !== 'edit' && (
          <div
            style={{
              border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
              borderRadius: '8px',
              padding: '16px 20px',
              background: 'rgba(10, 14, 23, 0.6)',
              maxHeight: isFullscreen ? 'calc(100vh - 180px)' : '420px',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: 'var(--neon-cyan, #06b6d4)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                paddingBottom: '6px',
              }}
            >
              Live Editorial Preview
            </div>
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px', margin: '20px 0', textAlign: 'center' }}>
                Your solution preview will appear here as you type...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '10px',
          paddingTop: '12px',
          borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
              color: 'var(--text-main, #ffffff)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, var(--neon-cyan, #06b6d4), var(--neon-purple, #a855f7))',
              border: 'none',
              color: '#ffffff',
              padding: '8px 20px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: '0 2px 10px rgba(6, 182, 212, 0.25)',
            }}
          >
            <Save size={14} />
            {saving ? 'Saving Solution...' : 'Save Solution'}
          </button>
        )}
      </div>
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  background: 'transparent',
  border: 'none',
  borderRadius: '4px',
  color: 'var(--text-secondary, #cbd5e1)',
  cursor: 'pointer',
  transition: 'background 0.15s ease, color 0.15s ease',
};

const toolbarDividerStyle: React.CSSProperties = {
  width: '1px',
  height: '16px',
  background: 'rgba(255, 255, 255, 0.12)',
  margin: '0 4px',
};
