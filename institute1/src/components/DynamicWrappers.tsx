'use client';

import dynamic from 'next/dynamic';

export const DynamicBadgeCelebrator = dynamic(() => import('@/components/shared/BadgeCelebrator'), { ssr: false });
export const DynamicMonthlyCelebrator = dynamic(() => import('@/components/shared/MonthlyCelebrator'), { ssr: false });
export const DynamicXpCelebrator = dynamic(() => import('@/components/shared/XpCelebrator'), { ssr: false });
export const DynamicFeedbackWidget = dynamic(() => import('@/components/shared/FeedbackWidget'), { ssr: false });
export const DynamicPwaRegister = dynamic(() => import('@/components/PwaRegister'), { ssr: false });
export const DynamicPWAInstallPrompt = dynamic(() => import('@/components/pwa/PWAInstallPrompt'), { ssr: false });
export const DynamicCrownBanner = dynamic(() => import('@/app/(dashboard)/profile/components/CrownBanner'), { ssr: false });
