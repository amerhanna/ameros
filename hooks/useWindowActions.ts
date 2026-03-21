'use client';

import { useContext } from 'react';
import { WindowContext } from '@/components/WindowManager/WindowContext';

export function useWindowActions() {
  const context = useContext(WindowContext);

  if (!context) {
    throw new Error('useWindowActions must be used within a Window component');
  }

  return context;
}
