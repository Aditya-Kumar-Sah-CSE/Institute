import type { NextConfig } from "next";

// A unique ID per deployment — used by the Service Worker to version its cache.
// On Vercel, VERCEL_DEPLOYMENT_ID is always set. Locally we fall back to a
// build timestamp so the SW never reuses a stale cache across local builds.
const deployId =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.NEXT_PUBLIC_DEPLOY_ID ||
  `local-${Date.now()}`;

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,

  env: {
    // Make the deploy ID available to the SW via window.__DEPLOY_ID__ (injected
    // into the page HTML) and to the next-pwa config below.
    NEXT_PUBLIC_DEPLOY_ID: deployId,
  },

  allowedDevOrigins: ['172.17.41.247', 'localhost', '127.0.0.1'],
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'cmvvlshtrouyqxdrvlth.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
