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
  themeColor: '#0b0f19',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  title: 'Smart Hybrid Learning | Student Engagement Platform',
  description: "To transform traditional classrooms into intelligent, data-driven learning environments where every student receives continuous guidance, every teacher gains actionable insights, and every institute can deliver a more engaging and effective educational experience.",

  keywords: ['full stack', 'web development', 'Student Engagement platform', 'gamified', 'coding', 'institute'],
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
    statusBarStyle: 'black-translucent',
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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
          <AuthChangeHandler />
          <GlobalButtonLoadingHandler />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
