'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSw = () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('ServiceWorker registration failed: ', err);
        });
      };
      
      if (document.readyState === 'complete') {
        registerSw();
      } else {
        window.addEventListener('load', registerSw);
      }
    }
  }, []);

  return null;
}
