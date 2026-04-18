'use client';

import { useEffect } from 'react';
import { useWindowActions } from './useWindowActions';
import type { MenuItemType } from '@/components/WindowManager/Menu';

/**
 * Injects a native OS menu bar (File, Edit, View, etc.) into the top of the active Window frame.
 * Automatically cleans up and removes the menu bar when the calling component unmounts.
 *
 * @param menu Array of `MenuItemType`. Supports deeply nested submenus and separators.
 */
export function useMenuBar(menu: MenuItemType[]) {
  const { menuBar, setMenuBar } = useWindowActions();

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
