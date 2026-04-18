'use client';

import { useState, useCallback, useMemo, useEffect, useRef, useSyncExternalStore, createElement } from 'react';
import type { ComponentType } from 'react';
import type { WindowState, WindowConfig, PersistentWindowState, ApplicationRegistry } from '@/types/window';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  initialize as initWindowStore,
  getState as getWindowStoreState,
  subscribe as subscribeWindowStore,
  getUiSnapshot,
  setPersistenceWriter,
  setWindowsState,
  updateWindow as updateWindowInStore,
} from '@/lib/window-store';

/**
 * Configuration payload used when spawning attached popup/child windows from an existing generic application.
 */
export type WindowEngineChildConfig = {
  title: string;
  component: ComponentType<any>;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  modal?: boolean;
  resizable?: boolean;
  maximizable?: boolean;
  minimizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  launchArgs?: Record<string, any>;
};

/**
 * The core logic loop orchestrating desktop windows inside AmerOS.
 * Provides the context-agnostic array of `windows`, tracking their layout states, hierarchy, and 
 * actions to manipulate them (open, close, focus, move).
 *
 * @param applicationRegistry Full suite of installed applications the OS is currently aware of.
 */
export function useWindowEngine(applicationRegistry: ApplicationRegistry = {}) {
  const [persistentWindows, setPersistentWindows] = useLocalStorage<PersistentWindowState[]>('ameros-windows', []);
  const [activeWindowId, setActiveWindowId] = useLocalStorage<string | null>('ameros-active-window', null);
  const [nextZIndex, setNextZIndex] = useLocalStorage<number>('ameros-next-zindex', 1);
  const [mounted, setMounted] = useState(false);
  const beforeCloseHandlersRef = useRef<Record<string, () => boolean | Promise<boolean>>>({});
  const childComponentsRef = useRef<Record<string, React.ComponentType<any>>>({});
  const persistentRef = useRef(persistentWindows);
  persistentRef.current = persistentWindows;

  const managerSnap = useSyncExternalStore(
    subscribeWindowStore,
    getUiSnapshot,
    () => 0,
  );

  useEffect(() => {
    initWindowStore(persistentRef.current);
    setMounted(true);
  }, []);

  useEffect(() => {
    setPersistenceWriter((next) => setPersistentWindows(next));
    return () => setPersistenceWriter(null);
  }, [setPersistentWindows]);

  useEffect(() => {
    if (!mounted) return;
    if (JSON.stringify(persistentWindows) !== JSON.stringify(getWindowStoreState())) {
      initWindowStore(persistentWindows);
    }
  }, [persistentWindows, mounted]);

  const windows = useMemo(() => {
    if (!mounted) return [];

    return getWindowStoreState().map((pw) => {
      if (pw.childWindow && childComponentsRef.current[pw.id]) {
        return {
          ...pw,
          component: childComponentsRef.current[pw.id],
        } as WindowState;
      }

      const app = applicationRegistry[pw.component];
      return {
        ...pw,
        component:
          app?.component ||
          (() =>
            createElement(
              'div',
              { className: 'p-4 bg-white border border-red-500 text-red-500' },
              `Component ${pw.component} not found`,
            )
          ),
      } as WindowState;
    });
  }, [managerSnap, applicationRegistry, mounted]);

  const effectiveActiveWindowId = mounted ? activeWindowId : null;

  const openWindow = useCallback(
    (config: Partial<WindowConfig> & { component: string }) => {
      const isChildWindow = config.childWindow;
      const app = isChildWindow ? null : applicationRegistry[config.component];

      if (!isChildWindow && !app) {
        console.error(`Application ${config.component} not found in registry`);
        return null;
      }

      const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      setWindowsState((prev) => {
        const newWindow: PersistentWindowState = {
          id,
          appId: config.component,
          title: config.title || config.component,
          component: config.component,
          width: config.width || app?.width || 400,
          height: config.height || app?.height || 300,
          x: config.x ?? (100 + (prev.length * 20) % 200),
          y: config.y ?? (100 + (prev.length * 20) % 200),
          isMinimized: config.isMinimized ?? false,
          isMaximized: config.isMaximized ?? false,
          zIndex: nextZIndex,
          launchArgs: config.launchArgs,
          icon: config.icon || app?.icon,
          resizable: config.resizable ?? app?.resizable ?? true,
          minWidth: config.minWidth || app?.minWidth,
          minHeight: config.minHeight || app?.minHeight,
          maximizable: config.maximizable ?? app?.maximizable ?? true,
          minimizable: config.minimizable ?? app?.minimizable ?? true,
          modal: config.modal,
          parentWindowId: config.parentWindowId,
          childWindow: config.childWindow,
          originalWidth: config.width || app?.width || 400,
          originalHeight: config.height || app?.height || 300,
          originalX: config.x ?? 100,
          originalY: config.y ?? 100,
        };
        return [...prev, newWindow];
      });

      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);

      return id;
    },
    [nextZIndex, applicationRegistry, setActiveWindowId, setNextZIndex],
  );

  const closeWindow = useCallback(
    async (id: string) => {
      const dynamicHandler = beforeCloseHandlersRef.current[id];
      if (dynamicHandler) {
        const result = dynamicHandler();
        const allowed = result instanceof Promise ? await result : result;
        if (!allowed) return;
      }

      const prev = getWindowStoreState();

      if (!dynamicHandler) {
        const pWindow = prev.find((w) => w.id === id);
        const app = pWindow ? applicationRegistry[pWindow.component] : null;
        if (app?.beforeClose && !app.beforeClose()) return;
      }

      const childIds = prev.filter((w) => w.parentWindowId === id).map((w) => w.id);

      delete beforeCloseHandlersRef.current[id];
      delete childComponentsRef.current[id];
      childIds.forEach((childId) => {
        delete beforeCloseHandlersRef.current[childId];
        delete childComponentsRef.current[childId];
      });

      const newWindows = prev.filter((w) => w.id !== id && w.parentWindowId !== id);

      setWindowsState(() => newWindows);
      setActiveWindowId((prevActive) =>
        prevActive === id || childIds.includes(prevActive || '') ? null : prevActive,
      );
    },
    [applicationRegistry, setActiveWindowId],
  );

  const launchApp = useCallback(
    (component: string, config?: Partial<WindowConfig>) => {
      return openWindow({
        component,
        ...config,
      });
    },
    [openWindow],
  );

  const openChildWindow = useCallback(
    (parentId: string, config: WindowEngineChildConfig) => {
      const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      childComponentsRef.current[id] = config.component;

      let childZIndex = 0;
      setWindowsState((prev) => {
        const maxZ = prev.length ? Math.max(...prev.map((w) => w.zIndex)) : 0;
        const parent = prev.find((w) => w.id === parentId);
        childZIndex = Math.max(maxZ + 1, (parent?.zIndex ?? 0) + 1);

        const newWindow: PersistentWindowState = {
          id,
          appId: `__child__${id}`,
          title: config.title,
          component: `__child__${id}`,
          width: config.width || 400,
          height: config.height || 300,
          x: config.x ?? (150 + (prev.length * 20) % 200),
          y: config.y ?? (150 + (prev.length * 20) % 200),
          isMinimized: false,
          isMaximized: false,
          zIndex: childZIndex,
          launchArgs: config.launchArgs,
          resizable: config.resizable ?? false,
          maximizable: config.maximizable ?? false,
          minimizable: config.minimizable ?? true,
          minWidth: config.minWidth,
          minHeight: config.minHeight,
          modal: config.modal,
          parentWindowId: parentId,
          childWindow: true,
          originalWidth: config.width || 400,
          originalHeight: config.height || 300,
          originalX: config.x ?? 150,
          originalY: config.y ?? 150,
        };
        return [...prev, newWindow];
      });

      setActiveWindowId(id);
      setNextZIndex((prev) => Math.max(prev, childZIndex + 1));

      return id;
    },
    [setActiveWindowId, setNextZIndex],
  );

  const setWindowBeforeClose = useCallback((id: string, fn: (() => boolean | Promise<boolean>) | undefined) => {
    if (fn) {
      beforeCloseHandlersRef.current[id] = fn;
    } else {
      delete beforeCloseHandlersRef.current[id];
    }
  }, []);

  const minimizeWindow = useCallback(
    (id: string) => {
      setWindowsState((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
      setActiveWindowId((prev) => (prev === id ? null : prev));
    },
    [setActiveWindowId],
  );

  const maximizeWindow = useCallback(
    (id: string) => {
      setWindowsState((prev) =>
        prev.map((w) => {
          if (w.id === id) {
            if (w.isMaximized) {
              return {
                ...w,
                isMaximized: false,
                width: w.originalWidth,
                height: w.originalHeight,
                x: w.originalX,
                y: w.originalY,
                zIndex: nextZIndex,
              };
            }

            return {
              ...w,
              isMaximized: true,
              originalWidth: w.width,
              originalHeight: w.height,
              originalX: w.x,
              originalY: w.y,
              zIndex: nextZIndex,
            };
          }
          return w;
        }),
      );
      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);
    },
    [nextZIndex, setActiveWindowId, setNextZIndex],
  );

  const focusWindow = useCallback(
    (id: string) => {
      const store = getWindowStoreState();
      const hasModalChild = store.some((w) => w.parentWindowId === id && w.modal && !w.isMinimized);
      if (hasModalChild) {
        const modalChild = store.find((w) => w.parentWindowId === id && w.modal && !w.isMinimized);
        if (modalChild) {
          setWindowsState((prev) =>
            prev.map((w) => (w.id === modalChild.id ? { ...w, zIndex: nextZIndex, isMinimized: false } : w)),
          );
          setActiveWindowId(modalChild.id);
          setNextZIndex((prev) => prev + 1);
        }
        return;
      }

      setWindowsState((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex, isMinimized: false } : w)));
      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);
    },
    [nextZIndex, setActiveWindowId, setNextZIndex],
  );

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    const w = getWindowStoreState().find((win) => win.id === id);
    if (!w || w.isMaximized) return;
    updateWindowInStore(id, { x, y, originalX: x, originalY: y });
  }, []);

  const resizeWindow = useCallback(
    (id: string, width: number, height: number, x?: number, y?: number) => {
      const w = getWindowStoreState().find((win) => win.id === id);
      if (!w || w.isMaximized) return;
      const newX = x !== undefined ? x : w.x;
      const newY = y !== undefined ? y : w.y;
      updateWindowInStore(id, {
        width,
        height,
        x: newX,
        y: newY,
        originalWidth: width,
        originalHeight: height,
        originalX: newX,
        originalY: newY,
      });
    },
    [],
  );

  const handleTaskbarWindowSelect = useCallback(
    (id: string) => {
      const window = windows.find((w) => w.id === id);
      if (window?.isMinimized) {
        focusWindow(id);
      } else if (activeWindowId === id) {
        minimizeWindow(id);
      } else {
        focusWindow(id);
      }
    },
    [windows, activeWindowId, focusWindow, minimizeWindow],
  );

  const blockedWindowIds = useMemo(() => {
    const blocked = new Set<string>();
    getWindowStoreState().forEach((w) => {
      if (w.modal && w.parentWindowId && !w.isMinimized) {
        blocked.add(w.parentWindowId);
      }
    });
    return blocked;
  }, [managerSnap]);

  const taskbarWindows = useMemo(() => windows.filter((w) => !w.childWindow), [windows]);

  return {
    mounted,
    windows,
    taskbarWindows,
    effectiveActiveWindowId,
    openWindow,
    launchApp,
    openChildWindow,
    closeWindow,
    setWindowBeforeClose,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    handleTaskbarWindowSelect,
    blockedWindowIds,
  };
}
