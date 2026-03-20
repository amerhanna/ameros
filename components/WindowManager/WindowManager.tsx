'use client';

import type React from 'react';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Window from '@/components/WindowManager/Window';
import Taskbar from '@/components/WindowManager/Taskbar';
import StartMenu from '@/components/WindowManager/StartMenu';
import type { WindowState, StartMenuItem, WindowConfig, PersistentWindowState } from '@/types/window';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface WindowManagerProps {
  children?: React.ReactNode;
  registry?: Record<string, React.ComponentType<any>>;
  startMenuItems?: StartMenuItem[];
}

export default function WindowManager({ children, registry = {}, startMenuItems = [] }: WindowManagerProps) {
  const [persistentWindows, setPersistentWindows] = useLocalStorage<PersistentWindowState[]>('ameros-windows', []);
  const [activeWindowId, setActiveWindowId] = useLocalStorage<string | null>('ameros-active-window', null);
  const [nextZIndex, setNextZIndex] = useLocalStorage<number>('ameros-next-zindex', 1);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle hydration mismatch by only rendering windows after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Map persistent state to full window state with component references
  const windows = useMemo(() => {
    if (!mounted) return [];
    return persistentWindows.map((pw) => {
      const ComponentClass = registry[pw.component];
      return {
        ...pw,
        component: ComponentClass || (() => <div>Component {pw.component} not found</div>),
      } as WindowState;
    });
  }, [persistentWindows, registry, mounted]);

  const effectiveActiveWindowId = mounted ? activeWindowId : null;

  const openWindow = useCallback(
    (windowConfig: WindowConfig) => {
      const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newWindow: PersistentWindowState = {
        ...windowConfig,
        id,
        isMinimized: windowConfig.isMinimized ?? false,
        isMaximized: windowConfig.isMaximized ?? false,
        zIndex: nextZIndex,
        component: windowConfig.component,
        originalWidth: windowConfig.width,
        originalHeight: windowConfig.height,
        originalX: windowConfig.x,
        originalY: windowConfig.y,
      };

      setPersistentWindows((prev) => [...prev, newWindow]);
      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);

      return id;
    },
    [nextZIndex, setPersistentWindows, setActiveWindowId, setNextZIndex],
  );

  const closeWindow = useCallback(
    (id: string) => {
      setPersistentWindows((prev) => prev.filter((w) => w.id !== id));
      setActiveWindowId((prev) => (prev === id ? null : prev));
    },
    [setPersistentWindows, setActiveWindowId],
  );

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
            width={window.width}
            height={window.height}
            x={window.x}
            y={window.y}
            isMinimized={window.isMinimized}
            isMaximized={window.isMaximized}
            isActive={effectiveActiveWindowId === window.id}
            zIndex={window.zIndex}
            onMinimize={minimizeWindow}
            onMaximize={maximizeWindow}
            onClose={closeWindow}
            onFocus={focusWindow}
            onMove={moveWindow}
          >
            <WindowComponent {...window.props} />
          </Window>
        );
      })}

      {/* Start Menu */}
      <StartMenu isOpen={isStartMenuOpen} onClose={closeStartMenu} onOpenWindow={openWindow} items={startMenuItems} />

      {/* Taskbar */}
      <Taskbar
        windows={windows}
        activeWindowId={effectiveActiveWindowId}
        onWindowSelect={handleTaskbarWindowSelect}
        onStartMenuToggle={toggleStartMenu}
        isStartMenuOpen={isStartMenuOpen}
      />

      {/* Custom Content */}
      {children}
    </div>
  );
}
