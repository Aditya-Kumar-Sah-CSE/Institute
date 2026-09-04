'use client';

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure Monaco Environment to prevent any external worker CDN downloads
if (typeof window !== 'undefined') {
  if (!(window as any).MonacoEnvironment) {
    (window as any).MonacoEnvironment = {
      getWorkerUrl() {
        return '';
      },
    };
  }
}

// Configure @monaco-editor/react to use local installed npm 'monaco-editor' package
// This completely eliminates third-party jsDelivr CDN requests and Tracking-Prevention browser warnings.
loader.config({ monaco });

export { loader, monaco };
