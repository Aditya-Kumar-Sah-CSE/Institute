'use client';

import React, { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent;
    const webkit = !!ua.match(/WebKit/i);
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isIOSMobile = isIPad || isIPhone;
    return isIOSMobile && webkit && !ua.match(/CriOS/i);
  });
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    // Is it in standalone mode already?
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show after 5 seconds if on mobile AND not dismissed
    const hasDismissed = localStorage.getItem('pwa_prompt_dismissed');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let timer: NodeJS.Timeout | undefined;
    if (isMobile && !hasDismissed) {
      timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  useEffect(() => {
    const manualShowHandler = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') {
            localStorage.setItem('pwa_prompt_dismissed', 'true');
          }
          setDeferredPrompt(null);
        });
      } else {
        // If not supported, show the modal
        setShowPrompt(true);
      }
    };
    window.addEventListener('show-pwa-install', manualShowHandler);
    return () => window.removeEventListener('show-pwa-install', manualShowHandler);
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_prompt_dismissed', 'true');
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIOS) {
       // Just close the custom instructions
       setShowPrompt(false);
       localStorage.setItem('pwa_prompt_dismissed', 'true');
    } else {
       // Fallback for browsers that don't support direct installation prompts
       setShowFallback(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="pwa-prompt-overlay">
      <div className="pwa-prompt-modal">
        <div className="pwa-prompt-header">
          <h3>Install SkillArena</h3>
          <button onClick={handleDismiss} className="pwa-close-btn" aria-label="Close">&times;</button>
        </div>
        <div className="pwa-prompt-body">
          <p>Get the full experience by installing our app on your home screen! Access your dashboard, courses, and leaderboard instantly.</p>
          {isIOS && !deferredPrompt ? (
            <div className="ios-instructions">
              <p>To install on iOS:</p>
              <ol>
                <li>Tap the <strong>Share</strong> button <span style={{fontSize: '1.2em'}}>⎋</span> at the bottom.</li>
                <li>Scroll down and select <strong>Add to Home Screen</strong> <span style={{fontSize: '1.2em'}}>➕</span>.</li>
              </ol>
            </div>
          ) : null}
          {showFallback && !isIOS && !deferredPrompt ? (
            <div className="fallback-instructions" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.9em', color: '#ffb347' }}>
              <p><strong>Direct install not supported by your browser.</strong></p>
              <p style={{ marginTop: '0.5rem' }}>Please tap your browser&apos;s menu (⋮) and select <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong>.</p>
            </div>
          ) : null}
        </div>
        <div className="pwa-prompt-footer">
          <button onClick={handleDismiss} className="pwa-btn-secondary">{showFallback ? 'Close' : 'Maybe Later'}</button>
          {(!isIOS || deferredPrompt) && !showFallback && (
            <button onClick={handleInstall} className="pwa-btn-primary">Install Now</button>
          )}
        </div>
      </div>
    </div>
  );
}
