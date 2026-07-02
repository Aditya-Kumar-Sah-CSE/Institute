import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import FeedbackWidget from '@/components/shared/FeedbackWidget';
import XpCelebrator from '@/components/shared/XpCelebrator';
import { Analytics } from "@vercel/analytics/next";

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  title: 'Smart Hybrid Learning | Student Engagement Platform',
  description: "To transform traditional classrooms into intelligent, data-driven learning environments where every student receives continuous guidance, every teacher gains actionable insights, and every institute can deliver a more engaging and effective educational experience.",

  keywords: ['full stack', 'web development', 'Student Engagement platform', 'gamified', 'coding', 'institute'],
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PwaRegister />
        <PWAInstallPrompt />
        {children}
        <XpCelebrator />
        <FeedbackWidget />
        <Analytics />
      </body>
    </html>
  );
}
