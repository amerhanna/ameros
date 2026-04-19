'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { StartMenuItem } from '@/types/window';
import { registry } from '@/lib/registry';

const START_MENU_PATH = 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/StartMenu';

export function useStartMenu() {
  const [startMenuItems, setStartMenuItems] = useState<StartMenuItem[]>([]);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

  const fetchMenuRecursive = useCallback(async (path: string): Promise<StartMenuItem[]> => {
    // 1. Get the hierarchy map (Default value of the current key)
    const order = await registry.get<string[]>(path, []);
    const menu: StartMenuItem[] = [];

    for (const id of order) {
      if (id === 'separator') {
        menu.push({ type: 'separator' });
        continue;
      }

      const itemPath = `${path}/${id}`;
      const values = await registry.getValues(itemPath);
      const type = values.type as string;

      if (type === 'submenu') {
        menu.push({
          type: 'submenu',
          label: values.label as string,
          icon: values.icon as string,
          items: await fetchMenuRecursive(itemPath)
        });
      } else if (type === 'action') {
        menu.push({
          type: 'action',
          label: values.label as string,
          icon: values.icon as string,
          actionId: values.actionId as string
        });
      } else {
        // Standard registry-defined application or component
        menu.push({
          label: values.label as string,
          component: (values.component as string) || "WebApp",
          launchArgs: values.launchArgs as any
        });
      }
    }
    return menu;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      const menu = await fetchMenuRecursive(START_MENU_PATH);
      if (mounted) {
        setStartMenuItems(menu);
      }
    }
    
    fetchData();

    const handleUpdate = (e: CustomEvent) => {
      // Trigger a full menu rebuild if any setting within the StartMenu subtree is modified
      if (e.detail.path.startsWith(START_MENU_PATH)) {
        fetchData();
      }
    };
    window.addEventListener('reg-update', handleUpdate as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener('reg-update', handleUpdate as EventListener);
    };
  }, [fetchMenuRecursive]);

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
