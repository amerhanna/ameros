'use client';

import type React from 'react';

import { useState, useCallback } from 'react';
import Window from '@/components/WindowManager/Window';
import Taskbar from '@/components/WindowManager/Taskbar';
import StartMenu from '@/components/WindowManager/StartMenu';
import type { WindowState, StartMenuItem, WindowConfig } from '@/types/window';

interface WindowManagerProps {
  children?: React.ReactNode;
  registry?: Record<string, React.ComponentType<any>>;
  startMenuItems?: StartMenuItem[];
}

export default function WindowManager({ children, registry = {}, startMenuItems = [] }: WindowManagerProps) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(1);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

  const openWindow = useCallback(
    (windowConfig: WindowConfig) => {
      const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get component from registry
      const ComponentClass = registry[windowConfig.component];

      if (!ComponentClass) {
        console.warn(`Component "${windowConfig.component}" not found in registry`);
        return;
      }

      const newWindow: WindowState = {
        ...windowConfig,
        id,
        isMinimized: windowConfig.isMinimized ?? false,
        isMaximized: windowConfig.isMaximized ?? false,
        zIndex: nextZIndex,
        component: ComponentClass,
        originalWidth: windowConfig.width,
        originalHeight: windowConfig.height,
        originalX: windowConfig.x,
        originalY: windowConfig.y,
      };

      setWindows((prev) => [...prev, newWindow]);
      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);

      return id;
    },
    [nextZIndex],
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    setActiveWindowId((prev) => (prev === id ? null : prev));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
    setActiveWindowId((prev) => (prev === id ? null : prev));
  }, []);

  const maximizeWindow = useCallback(
    (id: string) => {
      setWindows((prev) =>
        prev.map((w) => {
          if (w.id === id) {
            if (w.isMaximized) {
              // Restore to original size and position
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
              // Store current position as original if not already maximized
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
    [nextZIndex],
  );

  const focusWindow = useCallback(
    (id: string) => {
      setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: nextZIndex, isMinimized: false } : w)));
      setActiveWindowId(id);
      setNextZIndex((prev) => prev + 1);
    },
    [nextZIndex],
  );

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id === id && !w.isMaximized) {
          return { ...w, x, y };
        }
        return w;
      }),
    );
  }, []);

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
    <div className="h-screen bg-teal-600 overflow-hidden relative">
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
            isActive={activeWindowId === window.id}
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
        activeWindowId={activeWindowId}
        onWindowSelect={handleTaskbarWindowSelect}
        onStartMenuToggle={toggleStartMenu}
        isStartMenuOpen={isStartMenuOpen}
      />

      {/* Custom Content */}
      {children}
    </div>
  );
}
