'use client';

import { loader } from '@monaco-editor/react';

// Configure @monaco-editor/react to load clean static assets from Cloudflare CDN (cdnjs).
// cdnjs does NOT set cookies or request local storage, eliminating browser Tracking-Prevention warnings
// while avoiding heavy server-side bundler/Turbopack chunk factory instantiation errors.
if (typeof window !== 'undefined') {
  loader.config({
    paths: {
      vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs',
    },
  });
}

export { loader };
