'use client';

import dynamic from 'next/dynamic';

const FloatingAgentButton = dynamic(
  () => import('./FloatingAgentButton'),
  {
    ssr: false,
  }
);

export default FloatingAgentButton;
