import type { SyntheticEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * Internal clipboard tracker for Code Arena
 * Allows copying & pasting within the terminal/editor itself,
 * while preventing pasting of any text copied from external sources.
 */
let internalClipboardContent = '';
let internalCopyTime = 0;

export function recordInternalCopy(text: string) {
  if (text) {
    internalClipboardContent = text;
    internalCopyTime = Date.now();
  }
}

export function isInternalPaste(pastedText: string): boolean {
  if (!pastedText) return false;
  if (!internalClipboardContent) return false;
  const normPasted = pastedText.replace(/\r\n/g, '\n').trim();
  const normInternal = internalClipboardContent.replace(/\r\n/g, '\n').trim();
  return normPasted === normInternal;
}

export function showExternalPasteWarning() {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('bce-paste-warning-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'bce-paste-warning-toast';
  toast.innerText = '⚠️ External paste is disabled. You can only copy & paste code written inside this editor.';
  toast.style.cssText = [
    'position: fixed',
    'bottom: 28px',
    'left: 50%',
    'transform: translateX(-50%)',
    'background: rgba(239, 68, 68, 0.95)',
    'color: white',
    'padding: 10px 20px',
    'border-radius: 8px',
    'font-size: 13px',
    'font-weight: 600',
    'z-index: 999999',
    'box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5)',
    'backdrop-filter: blur(8px)',
    'border: 1px solid rgba(255, 255, 255, 0.2)',
    'transition: opacity 0.3s ease',
    'pointer-events: none',
    'font-family: sans-serif'
  ].join(';');

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

export const practiceAndBattleClipboardProps = {
  onContextMenuCapture: (e: SyntheticEvent) => {
    // Keep context menu standard
  },
  onCopyCapture: (e: any) => {
    const sel = typeof window !== 'undefined' ? window.getSelection()?.toString() : '';
    if (sel) {
      recordInternalCopy(sel);
    }
  },
  onCutCapture: (e: any) => {
    const sel = typeof window !== 'undefined' ? window.getSelection()?.toString() : '';
    if (sel) {
      recordInternalCopy(sel);
    }
  },
  onPasteCapture: (e: any) => {
    const pasted = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    if (!isInternalPaste(pasted)) {
      e.preventDefault();
      e.stopPropagation();
      showExternalPasteWarning();
    }
  },
  onDragStartCapture: (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  },
  onDropCapture: (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  },
  onKeyDownCapture: (e: ReactKeyboardEvent) => {
    // Allow internal shortcuts
  },
};
