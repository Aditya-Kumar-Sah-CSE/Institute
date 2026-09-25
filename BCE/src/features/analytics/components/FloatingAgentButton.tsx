'use client';

import React from 'react';
import SmartAgentDrawer from './SmartAgentDrawer';

/**
 * Smart Agent Provider component:
 * Mounts SmartAgentDrawer globally.
 * The floating UI button has been removed since Smart Agent is accessible directly from the Navbar.
 */
export default function FloatingAgentButton() {
  return <SmartAgentDrawer />;
}


