import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import FeedbackWidget from '@/components/shared/FeedbackWidget';
import { Analytics } from "@vercel/analytics/next";

export const viewport: Viewport = {
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'SkillArena | Gamified Full Stack Learning Platform',
  description: 'Learn full-stack web development, AI, ML and more through gamified courses with XP, badges, leaderboards, and real-world GitHub & deployment practice. By Techglaz Labs Pvt. Ltd.',
  keywords: ['full stack', 'web development', 'learning platform', 'gamified', 'coding', 'skill arena'],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SkillArena',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <PwaRegister />
        <PWAInstallPrompt />
        {children}
        <FeedbackWidget />
        <Analytics />
      </body>
    </html>
  );
}
