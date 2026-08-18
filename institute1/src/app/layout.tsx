import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import '@/components/landing/InstitutionLanding.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { 
  DynamicPwaRegister as PwaRegister, 
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
  themeColor: '#000000',
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
    manifest: '/manifest.json?v=2',
    icons: {
      icon: settings?.logo_url ? settings.logo_url : '/icon-192x192.png?v=2',
      apple: settings?.logo_url ? settings.logo_url : '/icon-192x192.png?v=2',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
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
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
        <PwaRegister />
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
