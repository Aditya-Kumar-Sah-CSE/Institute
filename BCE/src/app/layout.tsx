import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

import { ThemeProvider } from '@/components/ThemeProvider';
import AuthChangeHandler from '@/components/AuthChangeHandler';

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  title: 'Smart Hybrid Learning | Student Engagement Platform',
  description: "To transform traditional classrooms into intelligent, data-driven learning environments where every student receives continuous guidance, every teacher gains actionable insights, and every institute can deliver a more engaging and effective educational experience.",

  keywords: ['full stack', 'web development', 'Student Engagement platform', 'gamified', 'coding', 'institute'],
  manifest: '/manifest.json?v=2',
  icons: {
    icon: '/icon-192x192.png?v=2',
    apple: '/icon-192x192.png?v=2',
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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
          <AuthChangeHandler />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
