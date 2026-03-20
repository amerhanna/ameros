'use client';

import type React from 'react';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Window from '@/components/WindowManager/Window';
import Taskbar from '@/components/WindowManager/Taskbar';
import StartMenu from '@/components/WindowManager/StartMenu';
import WindowContextMenu from '@/components/WindowManager/WindowContextMenu';
import SplashScreen from '@/components/WindowManager/SplashScreen';
import type { WindowState, StartMenuItem, WindowConfig, PersistentWindowState, ApplicationRegistry } from '@/types/window';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface WindowManagerProps {
  children?: React.ReactNode;
  applicationRegistry?: ApplicationRegistry;
  startMenuItems?: StartMenuItem[];
}

export default function WindowManager({ 
  children, 
  applicationRegistry = {}, 
  startMenuItems = [] 
}: WindowManagerProps) {
  const [persistentWindows, setPersistentWindows] = useLocalStorage<PersistentWindowState[]>('ameros-windows', []);
  const [activeWindowId, setActiveWindowId] = useLocalStorage<string | null>('ameros-active-window', null);
  const [nextZIndex, setNextZIndex] = useLocalStorage<number>('ameros-next-zindex', 1);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    windowId: string | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    windowId: null,
  });
  const beforeCloseHandlersRef = useRef<Record<string, () => boolean | Promise<boolean>>>({});
  // Store child window components (not serializable, so kept in ref)
  const childComponentsRef = useRef<Record<string, React.ComponentType<any>>>({});

  // Handle hydration mismatch by only rendering windows after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Map persistent state to full window state with component references
  const windows = useMemo(() => {
    if (!mounted) return [];
    return persistentWindows.map((pw) => {
      // Child windows use the component stored in the ref
      if (pw.childWindow && childComponentsRef.current[pw.id]) {
        return {
          ...pw,
          component: childComponentsRef.current[pw.id],
        } as WindowState;
      }
      // Regular windows use the application registry
      const app = applicationRegistry[pw.component];
      return {
        ...pw,
        component: app?.component || (() => <div className="p-4 bg-white border border-red-500 text-red-500">Component {pw.component} not found</div>),
      } as WindowState;
    });
  }, [persistentWindows, applicationRegistry, mounted]);

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

      setPersistentWindows((prev) => {
        const newWindow: PersistentWindowState = {
          id,
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
          // Registry defaults (or overrides for child windows)
          icon: config.icon || app?.icon,
          resizable: config.resizable ?? app?.resizable ?? true,
          minWidth: config.minWidth || app?.minWidth,
          minHeight: config.minHeight || app?.minHeight,
          maximizable: config.maximizable ?? app?.maximizable ?? true,
          minimizable: config.minimizable ?? app?.minimizable ?? true,
          // Modal & child window
          modal: config.modal,
          parentWindowId: config.parentWindowId,
          childWindow: config.childWindow,
          // Restore dimensions
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
    [nextZIndex, applicationRegistry, setPersistentWindows, setActiveWindowId, setNextZIndex],
  );

  const closeWindow = useCallback(
    async (id: string) => {
      // 1. Check dynamic handler (from useWindow) - these are refs so they are always current
      const dynamicHandler = beforeCloseHandlersRef.current[id];
      if (dynamicHandler) {
        const result = dynamicHandler();
        const allowed = result instanceof Promise ? await result : result;
        if (!allowed) return;
      }

      setPersistentWindows((prev) => {
        // 2. Check registry handler (static) using latest state
        if (!dynamicHandler) {
          const pWindow = prev.find((w) => w.id === id);
          const app = pWindow ? applicationRegistry[pWindow.component] : null;
          if (app?.beforeClose && !app.beforeClose()) return prev;
        }

        // 3. Find and close all child windows of this window using latest state
        const childIds = prev
          .filter((w) => w.parentWindowId === id)
          .map((w) => w.id);
        
        // Cleanup refs (doing this inside setter is slightly unconventional but ensures sync)
        delete beforeCloseHandlersRef.current[id];
        delete childComponentsRef.current[id];
        childIds.forEach((childId) => {
          delete beforeCloseHandlersRef.current[childId];
          delete childComponentsRef.current[childId];
        });

        const newWindows = prev.filter((w) => w.id !== id && w.parentWindowId !== id);
        
        // Update active window if the closed one was active
        setActiveWindowId((prevActive) => 
          (prevActive === id || childIds.includes(prevActive || '') ? null : prevActive)
        );

        return newWindows;
      });
    },
    [applicationRegistry, setPersistentWindows, setActiveWindowId],
  );

  // Launch a registered application with optional config/launchArgs
  const launchApp = useCallback(
    (component: string, config?: Partial<WindowConfig>) => {
      return openWindow({
        component,
        ...config,
      });
    },
    [openWindow],
  );

  // Open an in-app child window (component provided inline, not in registry)
  const openChildWindow = useCallback(
    (parentId: string, config: {
      title: string;
      component: React.ComponentType<any>;
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
    }) => {
      const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the component in the ref (not serializable to localStorage)
      childComponentsRef.current[id] = config.component;

      // Stack child above its parent and every other window (avoids stale nextZIndex vs focused parent)
      let childZIndex = 0;
      setPersistentWindows((prev) => {
        const maxZ = prev.length ? Math.max(...prev.map((w) => w.zIndex)) : 0;
        const parent = prev.find((w) => w.id === parentId);
        childZIndex = Math.max(maxZ + 1, (parent?.zIndex ?? 0) + 1);

        const newWindow: PersistentWindowState = {
          id,
          title: config.title,
          component: `__child__${id}`, // placeholder key, actual component is in ref
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
    [setPersistentWindows, setActiveWindowId, setNextZIndex],
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
      setPersistentWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
      setActiveWindowId((prev) => (prev === id ? null : prev));
    },
    [setPersistentWindows, setActiveWindowId],
  );

  const maximizeWindow = useCallback(
    (id: string) => {
      setPersistentWindows((prev) =>
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
            } else {
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
          }
          return w;
        }),
      );
      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);
    },
    [nextZIndex, setPersistentWindows, setActiveWindowId, setNextZIndex],
  );

  const focusWindow = useCallback(
    (id: string) => {
      // Don't allow focusing a window that has a modal child open
      const hasModalChild = persistentWindows.some(
        (w) => w.parentWindowId === id && w.modal && !w.isMinimized
      );
      if (hasModalChild) {
        // Focus the modal child instead
        const modalChild = persistentWindows.find(
          (w) => w.parentWindowId === id && w.modal && !w.isMinimized
        );
        if (modalChild) {
          setPersistentWindows((prev) =>
            prev.map((w) => (w.id === modalChild.id ? { ...w, zIndex: nextZIndex, isMinimized: false } : w)),
          );
          setActiveWindowId(modalChild.id);
          setNextZIndex((prev) => prev + 1);
        }
        return;
      }

      setPersistentWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex, isMinimized: false } : w)),
      );
      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);
    },
    [nextZIndex, persistentWindows, setPersistentWindows, setActiveWindowId, setNextZIndex],
  );

  const moveWindow = useCallback(
    (id: string, x: number, y: number) => {
      setPersistentWindows((prev) =>
        prev.map((w) => {
          if (w.id === id && !w.isMaximized) {
            return { 
              ...w, 
              x, 
              y, 
              originalX: x, 
              originalY: y 
            };
          }
          return w;
        }),
      );
    },
    [setPersistentWindows],
  );

  const resizeWindow = useCallback(
    (id: string, width: number, height: number, x?: number, y?: number) => {
      setPersistentWindows((prev) =>
        prev.map((w) => {
          if (w.id === id && !w.isMaximized) {
            const newX = x !== undefined ? x : w.x;
            const newY = y !== undefined ? y : w.y;
            return { 
              ...w, 
              width, 
              height,
              x: newX,
              y: newY,
              originalWidth: width,
              originalHeight: height,
              originalX: newX,
              originalY: newY
            };
          }
          return w;
        }),
      );
    },
    [setPersistentWindows],
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

  const toggleStartMenu = useCallback(() => {
    setIsStartMenuOpen((prev) => !prev);
  }, []);

  const closeStartMenu = useCallback(() => {
    setIsStartMenuOpen(false);
  }, []);

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

  const selectedWindow = useMemo(() => {
    return windows.find((w) => w.id === contextMenu.windowId);
  }, [windows, contextMenu.windowId]);

  // Compute which windows are blocked by a modal child
  const blockedWindowIds = useMemo(() => {
    const blocked = new Set<string>();
    persistentWindows.forEach((w) => {
      if (w.modal && w.parentWindowId && !w.isMinimized) {
        blocked.add(w.parentWindowId);
      }
    });
    return blocked;
  }, [persistentWindows]);

  // Filter windows for taskbar — exclude child windows
  const taskbarWindows = useMemo(() => {
    return windows.filter((w) => !persistentWindows.find((pw) => pw.id === w.id)?.childWindow);
  }, [windows, persistentWindows]);

  return (
    <div className="h-screen bg-teal-600 bg-[url('/ameros-bg.png')] bg-cover bg-center bg-no-repeat overflow-hidden relative">
      {/* Render Windows */}
      {windows.map((window) => {
        const WindowComponent = window.component;
        const pw = persistentWindows.find((p) => p.id === window.id);
        const isBlocked = blockedWindowIds.has(window.id);
        return (
          <Window
            key={window.id}
            id={window.id}
            title={window.title}
            icon={window.icon}
            width={window.width}
            height={window.height}
            x={window.x}
            y={window.y}
            isMinimized={window.isMinimized}
            isMaximized={window.isMaximized}
            isActive={effectiveActiveWindowId === window.id}
            zIndex={window.zIndex}
            resizable={window.resizable}
            minWidth={window.minWidth}
            minHeight={window.minHeight}
            maximizable={window.maximizable}
            minimizable={window.minimizable}
            launchArgs={pw?.launchArgs}
            isBlocked={isBlocked}
            onMinimize={minimizeWindow}
            onMaximize={maximizeWindow}
            onClose={closeWindow}
            onFocus={focusWindow}
            onMove={moveWindow}
            onResize={resizeWindow}
            onContextMenu={openWindowMenu}
            setBeforeClose={(fn) => setWindowBeforeClose(window.id, fn)}
            launchApp={launchApp}
            openChildWindow={(config) => openChildWindow(window.id, config)}
          >
            <WindowComponent {...(pw?.launchArgs || {})} />
          </Window>
        );
      })}

      {/* Start Menu */}
      <StartMenu
        isOpen={isStartMenuOpen}
        onClose={closeStartMenu}
        onOpenWindow={openWindow}
        items={startMenuItems}
        applicationRegistry={applicationRegistry}
      />

      {/* Taskbar */}
      <Taskbar
        windows={taskbarWindows}
        activeWindowId={effectiveActiveWindowId}
        onWindowSelect={handleTaskbarWindowSelect}
        onStartMenuToggle={toggleStartMenu}
        isStartMenuOpen={isStartMenuOpen}
        onContextMenu={openWindowMenu}
      />

      {contextMenu.isOpen && selectedWindow && (
        <WindowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isMaximized={!!selectedWindow.isMaximized}
          isMinimized={!!selectedWindow.isMinimized}
          maximizable={!!selectedWindow.maximizable}
          onClose={() => closeWindow(selectedWindow.id)}
          onMinimize={() => minimizeWindow(selectedWindow.id)}
          onMaximize={() => !selectedWindow.isMaximized && maximizeWindow(selectedWindow.id)}
          onRestore={() => selectedWindow.isMaximized && maximizeWindow(selectedWindow.id)}
          onMove={() => focusWindow(selectedWindow.id)}
          onResize={() => focusWindow(selectedWindow.id)}
          onDismiss={closeWindowMenu}
        />
      )}

      {/* Custom Content */}
      {children}

      {/* Splash Screen Overlay */}
      {(!mounted || !isSplashFinished) && <SplashScreen onFinish={() => setIsSplashFinished(true)} minDuration={1500} />}
    </div>
  );
}
