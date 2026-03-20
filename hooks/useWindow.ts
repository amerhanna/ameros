'use client';

import { useContext } from 'react';
import { WindowContext } from '@/components/WindowManager/WindowContext';

export function useWindow() {
  const context = useContext(WindowContext);
  
  if (!context) {
    throw new Error('useWindow must be used within a Window component');
  }
  
  return context;
}
