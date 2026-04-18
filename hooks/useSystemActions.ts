'use client';

import { useContext } from 'react';
import { SystemActionsContext } from '@/components/WindowManager/WindowContext';

/**
 * Retrieves the global System Actions Context.
 * Unlike `useWindowActions` which is isolated to the current window, this provides root-level
 * capabilities.
 *
 * @returns An object containing:
 * - `launchApp`: Function to spawn an entirely new top-level application window directly from the registry.
 */
export function useSystemActions() {
  const context = useContext(SystemActionsContext);

  if (!context) {
    throw new Error('useSystemActions must be used within WindowManager');
  }

  return context;
}
