'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSw = () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          reg.update();
        }).catch((err) => {
          console.error('ServiceWorker registration failed: ', err);
        });
      };
      
      if (document.readyState === 'complete') {
        registerSw();
      } else {
        window.addEventListener('load', registerSw);
      }

      // A newly activated worker may correspond to a deployment with a different
      // React navigation tree. Reload once to prevent old cached client chunks
      // hydrating fresh server HTML.
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) {
          reloading = true;
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}
