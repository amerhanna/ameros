'use client';

import { useContext } from 'react';
import { SystemActionsContext } from '@/components/WindowManager/WindowContext';

export function useSystemActions() {
  const context = useContext(SystemActionsContext);

  if (!context) {
    throw new Error('useSystemActions must be used within WindowManager');
  }

  return context;
}
