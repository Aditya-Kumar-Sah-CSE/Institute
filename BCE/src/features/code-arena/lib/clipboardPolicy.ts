import type { SyntheticEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * Reusable Capture Handlers for Practice & Battle Mode:
 * Blocks Copy, Paste, Cut, Drag/Drop, Right-Click Context Menu, and Clipboard Shortcuts
 * while explicitly preserving Monaco Autocomplete (Ctrl+Space), Navigation, and Shortcuts.
 */
export const practiceAndBattleClipboardProps = {
  onContextMenuCapture: (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  },
  onCopyCapture: (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  },
  onCutCapture: (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  },
  onPasteCapture: (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    const isMod = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const key = e.key.toLowerCase();

    // Block explicit clipboard keyboard shortcuts:
    // Ctrl/Cmd + C, V, X
    // Shift + Insert, Ctrl + Insert, Shift + Delete
    if (
      (isMod && (key === 'c' || key === 'v' || key === 'x')) ||
      (isShift && e.key === 'Insert') ||
      (isMod && e.key === 'Insert') ||
      (isShift && e.key === 'Delete')
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
};
