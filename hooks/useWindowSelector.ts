'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { PersistentWindowState } from '@/types/window';
import { getState, subscribe } from '@/lib/window-store';

function defaultEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function ghostWindow(windowId: string): PersistentWindowState {
  return {
    id: windowId,
    title: '',
    component: '',
    width: 400,
    height: 300,
    x: 100,
    y: 100,
    zIndex: 1,
    isMinimized: false,
    isMaximized: false,
    originalWidth: 400,
    originalHeight: 300,
    originalX: 100,
    originalY: 100,
  };
}

/**
 * Subscribe to a single window with a selector. Re-renders only when the selected
 * slice changes (deep compare via JSON by default).
 */
export function useWindowSelector<T>(
  windowId: string,
  selector: (win: PersistentWindowState) => T,
  isEqual: (a: T, b: T) => boolean = defaultEqual,
): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const equalRef = useRef(isEqual);
  equalRef.current = isEqual;
  const cacheRef = useRef<{ value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const win = getState().find((w) => w.id === windowId) ?? ghostWindow(windowId);
    const next = selectorRef.current(win);
    if (cacheRef.current && equalRef.current(cacheRef.current.value, next)) {
      return cacheRef.current.value;
    }
    cacheRef.current = { value: next };
    return next;
  }, [windowId]);

  const getServerSnapshot = useCallback(() => {
    return selectorRef.current(ghostWindow(windowId));
  }, [windowId]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
