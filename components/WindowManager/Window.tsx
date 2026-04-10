"use client"

import type React from "react";
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { WindowContext, type ChildWindowConfig } from './WindowContext';
import WindowTitleBar from './WindowTitleBar';
import WindowResizeHandles from './WindowResizeHandles';
import type { MenuItemType } from './Menu';
import { useWindowStateById } from '@/hooks/useGetWindowState';
import { useWindowDragResize } from './useWindowDragResize';
import MenuBar from './MenuBar';

interface WindowProps {
  id: string;
  title?: string;
  icon?: string;
  isActive?: boolean;
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  maximizable?: boolean;
  minimizable?: boolean;
  launchArgs?: Record<string, any>;
  isBlocked?: boolean;
  children?: React.ReactNode;
  onMinimize?: (id: string) => void;
  onMaximize?: (id: string) => void;
  onClose?: (id: string) => void;
  onFocus?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number, x?: number, y?: number) => void;
  onBlur?: (id: string) => void;
  onContextMenu?: (id: string, x: number, y: number) => void;
  setBeforeClose?: (fn: (() => boolean | Promise<boolean>) | undefined) => void;
  openChildWindow?: (config: ChildWindowConfig) => string | null;
}

export default function Window({
  id,
  title = 'Untitled',
  icon = '📁',
  isActive = false,
  resizable = true,
  minWidth = 200,
  minHeight = 100,
  maximizable = true,
  minimizable = true,
  launchArgs,
  isBlocked = false,
  children,
  onMinimize,
  onMaximize,
  onClose,
  onFocus,
  onMove,
  onResize,
  onBlur,
  onContextMenu,
  setBeforeClose,
  openChildWindow,
}: WindowProps) {
  const { x, y, width, height, isMinimized, isMaximized, zIndex } = useWindowStateById(
    id,
    (w) => ({
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      isMinimized: !!w.isMinimized,
      isMaximized: !!w.isMaximized,
      zIndex: w.zIndex,
    }),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [menuBar, setMenuBar] = useState<MenuItemType[] | undefined>();
  const prevActiveRef = useRef(isActive);
  const isMaximizedRef = useRef(isMaximized);
  const isMinimizedRef = useRef(!!isMinimized);
  const boundsFallbackRef = useRef({ x, y, width, height });

  useEffect(() => {
    isMaximizedRef.current = isMaximized;
    isMinimizedRef.current = !!isMinimized;
    boundsFallbackRef.current = { x, y, width, height };
  }, [isMaximized, isMinimized, x, y, width, height]);

  const maximizeWindow = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      onMaximize?.(id);
    },
    [id, onMaximize],
  );

  const minimizeWindow = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      onMinimize?.(id);
    },
    [id, onMinimize],
  );

  const restoreWindow = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      if (isMaximizedRef.current) {
        onMaximize?.(id);
      } else if (isMinimizedRef.current) {
        onFocus?.(id);
      }
    },
    [id, onFocus, onMaximize],
  );

  const moveWindow = useCallback(
    (nextX: number, nextY: number) => {
      onMove?.(id, nextX, nextY);
    },
    [id, onMove],
  );

  const resizeWindow = useCallback(
    (nextWidth: number, nextHeight: number, nextX: number, nextY: number) => {
      onResize?.(id, nextWidth, nextHeight, nextX, nextY);
    },
    [id, onResize],
  );

  const moveWindowWithEvent = useCallback(
    (e?: React.MouseEvent | React.TouchEvent, nextX?: number, nextY?: number) => {
      if (nextX !== undefined && nextY !== undefined) {
        onMove?.(id, nextX, nextY);
      }
    },
    [id, onMove],
  );

  const resizeWindowWithEvent = useCallback(
    (e?: React.MouseEvent | React.TouchEvent, nextWidth?: number, nextHeight?: number, nextX?: number, nextY?: number) => {
      if (nextWidth !== undefined && nextHeight !== undefined) {
        onResize?.(id, nextWidth, nextHeight, nextX, nextY);
      }
    },
    [id, onResize],
  );

  const focusWindow = useCallback(() => {
    onFocus?.(id);
  }, [id, onFocus]);

  const { startDragging, startResizing } = useWindowDragResize({
    containerRef,
    minWidth,
    minHeight,
    onMove: moveWindow,
    onResize: resizeWindow,
    onFocus: focusWindow,
  });

  const closeWindow = useCallback(() => {
    onClose?.(id);
  }, [id, onClose]);

  const getBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return boundsFallbackRef.current;
    }
    return {
      x: el.offsetLeft,
      y: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight,
    };
  }, []);

  const windowContextValue = useMemo(
    () => ({
      id,
      getBounds,
      maximize: maximizeWindow,
      minimize: minimizeWindow,
      restore: restoreWindow,
      move: moveWindowWithEvent,
      resize: resizeWindowWithEvent,
      close: closeWindow,
      launchArgs,
      setMenuBar,
      setBeforeClose: (fn: (() => boolean | Promise<boolean>) | undefined) => {
        setBeforeClose?.(fn);
      },
      openChildWindow: (config: ChildWindowConfig) => {
        return openChildWindow?.(config) ?? null;
      },
    }),
    [id, getBounds, maximizeWindow, minimizeWindow, restoreWindow, moveWindow, resizeWindow, closeWindow, launchArgs, setBeforeClose, openChildWindow],
  );

  useEffect(() => {
    if (prevActiveRef.current && !isActive) {
      onBlur?.(id);
    }
    prevActiveRef.current = isActive;
  }, [isActive, id, onBlur]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(id, e.clientX, e.clientY);
      onFocus?.(id);
    },
    [id, onFocus, onContextMenu],
  );

  const handleIconClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      onContextMenu?.(id, rect.left, rect.bottom);
      onFocus?.(id);
    },
    [id, onFocus, onContextMenu],
  );

  const maximizedStyle = isMaximized
    ? {
        width: '100vw',
        height: 'calc(100vh - 32px)', // 32px for taskbar height
        left: '0px',
        top: '0px',
      }
    : {
        width: `${width}px`,
        height: `${height}px`,
        left: `${x}px`,
        top: `${y}px`,
      };

  const handleDoubleClickTitleBar = () => {
    if (maximizable) {
      onMaximize?.(id);
    }
  };

  const titleBarClass = isActive ? 'bg-blue-900 text-white' : 'bg-gray-500 text-gray-200';
  const buttonHoverClass = isActive ? 'hover:bg-blue-700' : 'hover:bg-gray-400';

  return (
    <WindowContext.Provider value={windowContextValue}>
      <div
        ref={containerRef}
        className="absolute bg-gray-200 border-2 border-white shadow-md flex flex-col overflow-hidden"
        style={{
          ...maximizedStyle,
          zIndex,
          display: isMinimized ? 'none' : 'flex',
          borderTopColor: '#ffffff',
          borderLeftColor: '#ffffff',
          borderRightColor: '#808080',
          borderBottomColor: '#808080',
        }}
        onClick={focusWindow}
      >
        {!isMaximized && resizable && <WindowResizeHandles onStartResize={startResizing} />}

        <WindowTitleBar
          title={title}
          icon={icon}
          isActive={isActive}
          isMaximized={isMaximized}
          maximizable={maximizable}
          minimizable={minimizable}
          buttonHoverClass={buttonHoverClass}
          onMouseDown={startDragging}
          onIconClick={handleIconClick}
          onContextMenu={handleContextMenu}
          onDoubleClick={handleDoubleClickTitleBar}
          onMinimize={minimizeWindow}
          onMaximize={maximizeWindow}
          onClose={closeWindow}
        />

        {menuBar && (
          <div className="flex-shrink-0">
            <MenuBar items={menuBar} />
          </div>
        )}

        <div
          className="flex-grow overflow-auto relative bg-gray-200 border-2 border-gray-400 m-0.5"
          style={{
            borderTopColor: '#808080',
            borderLeftColor: '#808080',
            borderRightColor: '#ffffff',
            borderBottomColor: '#ffffff',
          }}
        >
          {children}
          {isBlocked && (
            <div
              className="absolute inset-0 z-50"
              style={{ cursor: 'not-allowed' }}
              onClick={(e) => {
                e.stopPropagation();
                onFocus?.(id);
              }}
            />
          )}
        </div>
      </div>
    </WindowContext.Provider>
  );
}
