'use client';

import { loader } from '@monaco-editor/react';

// Configure Monaco Environment & NPM monaco-editor package ONLY on client side
// This prevents Next.js SSR "window is not defined" error while eliminating third-party CDN requests
if (typeof window !== 'undefined') {
  if (!(window as any).MonacoEnvironment) {
    (window as any).MonacoEnvironment = {
      getWorkerUrl() {
        return '';
      },
    };
  }

  import('monaco-editor').then((monaco) => {
    loader.config({ monaco });
  });
}

export { loader };
