'use client';

import { useState, useMemo, useCallback } from 'react';
import type { StartMenuItem } from '@/types/window';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function useStartMenu(startMenuItems: StartMenuItem[]) {
  const [installedApps] = useLocalStorage<StartMenuItem[]>('ameros-installed-apps', []);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

  const combinedStartMenuItems = useMemo(
    () => [...installedApps, ...startMenuItems],
    [installedApps, startMenuItems],
  );

  const toggleStartMenu = useCallback(() => {
    setIsStartMenuOpen((prev) => !prev);
  }, []);

  const closeStartMenu = useCallback(() => {
    setIsStartMenuOpen(false);
  }, []);

  return {
    combinedStartMenuItems,
    isStartMenuOpen,
    toggleStartMenu,
    closeStartMenu,
  };
}
