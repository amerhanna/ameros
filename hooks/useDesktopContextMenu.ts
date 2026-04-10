'use client';

import { useState, useCallback } from 'react';

export type DesktopContextMenuState = {
  isOpen: boolean;
  x: number;
  y: number;
  windowId: string | null;
};

export function useDesktopContextMenu() {
  const [contextMenu, setContextMenu] = useState<DesktopContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    windowId: null,
  });

  const openWindowMenu = useCallback((id: string, x: number, y: number) => {
    setContextMenu({
      isOpen: true,
      x,
      y,
      windowId: id,
    });
  }, []);

  const closeWindowMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    contextMenu,
    openWindowMenu,
    closeWindowMenu,
  };
}
