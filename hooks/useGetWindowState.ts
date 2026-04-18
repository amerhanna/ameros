'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { PersistentWindowState } from '@/types/window';
import { getState, subscribe } from '@/lib/window-store';
import { useWindowActions } from './useWindowActions';

type WindowStateKey = keyof PersistentWindowState;

function defaultEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function ghostWindow(windowId: string): PersistentWindowState {
  return {
    appId: '',
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

function buildSelector<K extends WindowStateKey>(keys?: readonly K[]) {
  return (win: PersistentWindowState): PersistentWindowState | Pick<PersistentWindowState, K> => {
    if (!keys || keys.length === 0) {
      return win;
    }

    const picked: Partial<PersistentWindowState> = {};
    for (const key of keys) {
      picked[key] = win[key];
    }
    return picked as Pick<PersistentWindowState, K>;
  };
}

function useWindowStateById<T>(
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

/**
 * Read current window state from the external Zustand/Custom store synchronously.
 * Allows components to reactively re-render when the Window's geometry or status changes.
 *
 * The full `PersistentWindowState` shape returned natively maps:
 * - `id`, `appId`, `title`, `component`: Core identity and registry routing paths.
 * - `x`, `y`, `width`, `height`, `zIndex`: Active visual coordinate geometries.
 * - `originalX`, `originalY`, `originalWidth`, `originalHeight`: Window boundaries prior to maximizing.
 * - `isMinimized`, `isMaximized`: Layout status booleans.
 * - `launchArgs`: Optional properties passed initially to the application entry.
 * - `icon`, `resizable`, `minWidth`, `minHeight`, `maximizable`, `minimizable`: Strict view-constraints.
 * - `modal`, `parentWindowId`, `childWindow`: Tree hierarchy identifiers for popups and dialogs.
 *
 * @example
 * // Subscribes fully:
 * const fullState = useGetWindowState();
 * 
 * @example
 * // Subscribes to only specific fields to prevent over-rendering:
 * const { isMaximized, width } = useGetWindowState(['isMaximized', 'width']);
 * 
 * WARNING: Use this hook ONLY for components that must visually move or resize.
 * For buttons and logic, use `useWindowActions` instead.
 */
export function useGetWindowState(): PersistentWindowState;
export function useGetWindowState<K extends WindowStateKey>(keys: readonly K[]): Pick<PersistentWindowState, K>;
export function useGetWindowState<K extends WindowStateKey>(keys?: readonly K[]) {
  const { id } = useWindowActions();
  const selector = useCallback(buildSelector(keys), [keys]);
  return useWindowStateById(id, selector);
}

export { useWindowStateById };
