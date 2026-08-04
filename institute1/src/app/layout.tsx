import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
// cache-buster to reset Next.js turbopack stale module graph
import './globals.css';
import '@/components/landing/InstitutionLanding.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { TenantProvider } from '@/lib/tenant/TenantProvider';
import { getTenantConfig, generateTenantBaseUrl } from '@/lib/tenant/tenantResolver';
import dynamic from 'next/dynamic';
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
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').single();
  const companyName = settings?.company_name || 'Smart Hybrid Learning';
  
  const { tenant } = await getTenantConfig();
  const manifestUrl = tenant ? `/api/manifest?tenantId=${tenant.id}` : '/manifest.json?v=2';

  return {
    title: tenant ? `${tenant.name} | Digital Learning Portal` : `${companyName} | Student Engagement Platform`,
    description: "To transform traditional classrooms into intelligent, data-driven learning environments where every student receives continuous guidance, every teacher gains actionable insights, and every institute can deliver a more engaging and effective educational experience.",
    keywords: ['full stack', 'web development', 'Student Engagement platform', 'gamified', 'coding', 'institute'],
    manifest: manifestUrl,
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
  const { tenant, routingMode } = await getTenantConfig();
  const baseUrl = generateTenantBaseUrl(tenant?.slug || null, routingMode);

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
        <PwaRegister />
        <PWAInstallPrompt />
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
          <TenantProvider tenant={tenant} routingMode={routingMode} baseUrl={baseUrl}>
            {children}
            <XpCelebrator />
            <FeedbackWidget />
          </TenantProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
