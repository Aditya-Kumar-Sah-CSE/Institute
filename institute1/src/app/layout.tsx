import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import '@/components/landing/InstitutionLanding.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { 
  DynamicPwaRegister as PwaRegister, 
  DynamicPwaUpdateToast as PwaUpdateToast,
  DynamicPWAInstallPrompt as PWAInstallPrompt, 
  DynamicFeedbackWidget as FeedbackWidget, 
  DynamicXpCelebrator as XpCelebrator 
} from '@/components/DynamicWrappers';

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

import { Analytics } from '@vercel/analytics/react';

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  colorScheme: 'dark',
};

export async function generateMetadata(): Promise<Metadata> {
  let companyName = 'Smart Hybrid Learning';
  let settings: { company_name?: string; logo_url?: string } | null = null;
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data } = await supabase.from('company_settings').select('company_name, logo_url').maybeSingle();
    settings = data;
    companyName = data?.company_name || 'Smart Hybrid Learning';
  } catch {
    // Fallback to defaults if Supabase is unreachable
  }

  return {
    title: `${companyName} | Student Engagement Platform`,
    description: "To transform traditional classrooms into intelligent, data-driven learning environments.",
    keywords: ['full stack', 'web development', 'Student Engagement platform', 'gamified', 'coding', 'institute'],
    manifest: '/manifest.json?v=4',
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: settings?.logo_url ?? '/icon-192x192.png?v=4', sizes: '192x192', type: 'image/png' },
      ],
      apple: settings?.logo_url ? settings.logo_url : '/icon-192x192.png?v=4',
      shortcut: '/favicon.ico',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: companyName,
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Expose the build-time deploy ID to the Service Worker.
  // sw.js is a static file and cannot import env vars directly, so we
  // inject it as a global via an inline <script> in the HTML shell.
  const deployId = process.env.NEXT_PUBLIC_DEPLOY_ID || 'dev';

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Inject deploy ID for the Service Worker cache versioning */}
        <script
          dangerouslySetInnerHTML={{
            __html: `self.__DEPLOY_ID__ = ${JSON.stringify(deployId)};`,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
        <PwaRegister />
        <PwaUpdateToast />
        <PWAInstallPrompt />
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
          {children}
          <XpCelebrator />
          <FeedbackWidget />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

