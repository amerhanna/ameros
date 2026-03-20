'use client';

import { useEffect } from 'react';
import { useWindow } from './useWindow';
import type { MenuItemType } from '@/components/WindowManager/Menu';

export function useMenuBar(menu: MenuItemType[]) {
  const { menuBar, setMenuBar } = useWindow();

  useEffect(() => {
    // Only update if it's different to prevent loops
    if (JSON.stringify(menuBar) !== JSON.stringify(menu)) {
      setMenuBar(menu);
    }
    // Cleanup: remove menu bar when component unmounts
    return () => {
       // We don't want to clear it on every render, only on unmount
       // But useEffect will run cleanup on every change of menu/setMenuBar.
    };
  }, [menu, setMenuBar, menuBar]);

  // Handle unmount specifically
  useEffect(() => {
    return () => setMenuBar([]);
  }, [setMenuBar]);
}
