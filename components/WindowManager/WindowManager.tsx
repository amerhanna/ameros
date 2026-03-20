'use client';

import type React from 'react';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Window from '@/components/WindowManager/Window';
import Taskbar from '@/components/WindowManager/Taskbar';
import StartMenu from '@/components/WindowManager/StartMenu';
import WindowContextMenu from '@/components/WindowManager/WindowContextMenu';
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
  const beforeCloseHandlersRef = useRef<Record<string, () => boolean>>({});

  // Handle hydration mismatch by only rendering windows after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Map persistent state to full window state with component references
  const windows = useMemo(() => {
    if (!mounted) return [];
    return persistentWindows.map((pw) => {
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
      const app = applicationRegistry[config.component];
      if (!app) {
        console.error(`Application ${config.component} not found in registry`);
        return null;
      }

      const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newWindow: PersistentWindowState = {
        id,
        title: config.title || config.component,
        component: config.component,
        width: config.width || app.width,
        height: config.height || app.height,
        x: config.x ?? (100 + (persistentWindows.length * 20) % 200),
        y: config.y ?? (100 + (persistentWindows.length * 20) % 200),
        isMinimized: config.isMinimized ?? false,
        isMaximized: config.isMaximized ?? false,
        zIndex: nextZIndex,
        props: config.props,
        // Registry defaults
        icon: app.icon,
        resizable: app.resizable ?? true,
        minWidth: app.minWidth,
        minHeight: app.minHeight,
        maximizable: app.maximizable ?? true,
        // Restore dimensions
        originalWidth: config.width || app.width,
        originalHeight: config.height || app.height,
        originalX: config.x ?? 100,
        originalY: config.y ?? 100,
      };

      setPersistentWindows((prev) => [...prev, newWindow]);
      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);

      return id;
    },
    [nextZIndex, applicationRegistry, persistentWindows.length, setPersistentWindows, setActiveWindowId, setNextZIndex],
  );

  const closeWindow = useCallback(
    (id: string) => {
      // 1. Check dynamic handler (from useWindow)
      const dynamicHandler = beforeCloseHandlersRef.current[id];
      if (dynamicHandler && !dynamicHandler()) return;

      // 2. Check registry handler (static)
      if (!dynamicHandler) {
        const pWindow = persistentWindows.find((w) => w.id === id);
        const app = pWindow ? applicationRegistry[pWindow.component] : null;
        if (app?.beforeClose && !app.beforeClose()) return;
      }

      setPersistentWindows((prev) => prev.filter((w) => w.id !== id));
      setActiveWindowId((prev) => (prev === id ? null : prev));

      // Cleanup
      delete beforeCloseHandlersRef.current[id];
    },
    [setPersistentWindows, setActiveWindowId, persistentWindows, applicationRegistry],
  );

  const setWindowBeforeClose = useCallback((id: string, fn: (() => boolean) | undefined) => {
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
      setPersistentWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex, isMinimized: false } : w)),
      );
      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);
    },
    [nextZIndex, setPersistentWindows, setActiveWindowId, setNextZIndex],
  );

  const moveWindow = useCallback(
    (id: string, x: number, y: number) => {
      setPersistentWindows((prev) =>
        prev.map((w) => {
          if (w.id === id && !w.isMaximized) {
            return { ...w, x, y };
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
            return { 
              ...w, 
              width, 
              height,
              x: x !== undefined ? x : w.x,
              y: y !== undefined ? y : w.y
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

  return (
    <div 
      className="h-screen bg-teal-600 bg-[url('/win95.png')] bg-cover bg-center bg-no-repeat overflow-hidden relative"
    >
      {/* Render Windows */}
      {windows.map((window) => {
        const WindowComponent = window.component;
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
            onMinimize={minimizeWindow}
            onMaximize={maximizeWindow}
            onClose={closeWindow}
            onFocus={focusWindow}
            onMove={moveWindow}
            onResize={resizeWindow}
            onContextMenu={openWindowMenu}
            setBeforeClose={(fn) => setWindowBeforeClose(window.id, fn)}
          >
            <WindowComponent {...window.props} />
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
        windows={windows}
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
    </div>
  );
}
