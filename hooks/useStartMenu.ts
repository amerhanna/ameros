'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { StartMenuItem } from '@/types/window';
import { registry } from '@/lib/registry';

export function useStartMenu() {
  const [startMenuItems, setStartMenuItems] = useState<StartMenuItem[]>([]);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const items = await registry.get<StartMenuItem[]>('HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/StartMenu/Items', []);
      if (mounted) {
        setStartMenuItems(items);
      }
    }
    
    fetchData();

    const handleUpdate = (e: CustomEvent) => {
      if (e.detail.path === 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/StartMenu/Items') {
        setStartMenuItems(e.detail.value as StartMenuItem[]);
      }
    };
    window.addEventListener('reg-update', handleUpdate as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('reg-update', handleUpdate as EventListener);
    };
  }, []);

  const combinedStartMenuItems = useMemo(
    () => startMenuItems,
    [startMenuItems],
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
