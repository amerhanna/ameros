'use client';

import { useContext } from 'react';
import { WindowContext } from '@/components/WindowManager/WindowContext';

export function useWindowContext() {
  const context = useContext(WindowContext);

  if (!context) {
    throw new Error('useWindowContext must be used within a Window component');
  }

  return context;
}
