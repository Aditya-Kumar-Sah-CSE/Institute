import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  preload: false,
});

import { ThemeProvider } from '@/components/ThemeProvider';
import AuthChangeHandler from '@/components/AuthChangeHandler';
import GlobalButtonLoadingHandler from '@/components/GlobalButtonLoadingHandler';

export const viewport: Viewport = {
  themeColor: '#0d0f1e',
  colorScheme: 'dark',
};
 
export const metadata: Metadata = {
  title: 'Debuggerzz | Official Coding Club of BCE Bhagalpur',
  description:
    'Debuggerzz is the official coding club of Bhagalpur College of Engineering (BCE Bhagalpur) — learn DSA, SQL, competitive programming, courses, live battles, and track contests.',
  keywords: [
    'Debuggerzz',
    'BCE Bhagalpur',
    'Bhagalpur College of Engineering',
    'Coding Club BCE Bhagalpur',
    'DSA',
    'competitive programming',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icon-192x192.png',
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Smart Hybrid Learning',
  },
  formatDetection: {
    telephone: false,
  },
};

import PwaRegister from '@/components/PwaRegister';
import { DynamicPWAInstallPrompt, DynamicPwaUpdateToast } from '@/components/DynamicWrappers';
import GlobalAgentProvider from '@/components/GlobalAgentProvider';

import AgentInteractionCursor from '@/features/analytics/components/AgentInteractionCursor';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
          <GlobalAgentProvider>
            <AgentInteractionCursor />
            <AuthChangeHandler />
            <GlobalButtonLoadingHandler />
            <PwaRegister />
            <DynamicPwaUpdateToast />
            <DynamicPWAInstallPrompt />
            {children}
          </GlobalAgentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
