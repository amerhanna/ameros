"use client"

import type React from "react"
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { WindowContext, type ChildWindowConfig } from './WindowContext';
import MenuBar from './MenuBar';
import type { MenuItemType } from './Menu';
import type { WindowConfig } from '@/types/window';
import { useWindowSelector } from '@/hooks/useWindowSelector';
import { flushPersistence } from '@/lib/window-store';

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
  launchApp?: (component: string, config?: Partial<WindowConfig>) => string | null;
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
  launchApp,
  openChildWindow,
}: WindowProps) {
  const { x, y, width, height, isMinimized, isMaximized, zIndex } = useWindowSelector(
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
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const [initialMouse, setInitialMouse] = useState({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [menuBar, setMenuBar] = useState<MenuItemType[] | undefined>();
  const prevActiveRef = useRef(isActive);

  const windowContextValue = useMemo(
    () => ({
      id,
      isMaximized,
      isMinimized: !!isMinimized,
      x,
      y,
      width,
      height,
      getBounds: () => {
        const el = containerRef.current;
        if (!el) {
          return { x, y, width, height };
        }
        return {
          x: el.offsetLeft,
          y: el.offsetTop,
          width: el.offsetWidth,
          height: el.offsetHeight,
        };
      },
      maximize: (e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        onMaximize?.(id);
      },
      minimize: (e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        onMinimize?.(id);
      },
      restore: (e?: React.MouseEvent | React.TouchEvent) => {
        e?.stopPropagation();
        if (isMaximized) {
          onMaximize?.(id);
        } else if (isMinimized) {
          onFocus?.(id);
        }
      },
      move: (e: React.MouseEvent | React.TouchEvent | undefined, x?: number, y?: number) => {
        e?.stopPropagation();
        if (x !== undefined && y !== undefined) {
          onMove?.(id, x, y);
        }
      },
      resize: (e: React.MouseEvent | React.TouchEvent | undefined, width?: number, height?: number, x?: number, y?: number) => {
        e?.stopPropagation();
        if (width !== undefined && height !== undefined) {
          onResize?.(id, width, height, x, y);
        }
      },
      close: () => {
        onClose?.(id);
      },
      launchArgs,
      menuBar,
      setMenuBar,
      setBeforeClose: (fn: (() => boolean | Promise<boolean>) | undefined) => {
        setBeforeClose?.(fn);
      },
      launchApp: (component: string, config?: Partial<WindowConfig>) => {
        return launchApp?.(component, config) ?? null;
      },
      openChildWindow: (config: ChildWindowConfig) => {
        return openChildWindow?.(config) ?? null;
      },
    }),
    [id, isMaximized, isMinimized, x, y, width, height, onMaximize, onMinimize, onFocus, onMove, onResize, menuBar, onClose, setBeforeClose, launchArgs, launchApp, openChildWindow],
  );

  useEffect(() => {
    if (prevActiveRef.current && !isActive) {
      onBlur?.(id);
    }
    prevActiveRef.current = isActive;
  }, [isActive, id, onBlur]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging && initialRect) {
        const dx = e.clientX - initialMouse.x;
        const dy = e.clientY - initialMouse.y;
        const newX = initialRect.x + dx;
        const newY = initialRect.y + dy;
        if (containerRef.current) {
          containerRef.current.style.left = `${newX}px`;
          containerRef.current.style.top = `${newY}px`;
        }
        onMove?.(id, newX, newY);
      } else if (resizing && resizeDir && initialRect) {
        const dx = e.clientX - initialMouse.x;
        const dy = e.clientY - initialMouse.y;

        let newW = initialRect.w;
        let newH = initialRect.h;
        let newX = initialRect.x;
        let newY = initialRect.y;

        if (resizeDir.includes('e')) newW = Math.max(minWidth, initialRect.w + dx);
        if (resizeDir.includes('w')) {
          const possibleW = initialRect.w - dx;
          if (possibleW >= minWidth) {
            newW = possibleW;
            newX = initialRect.x + dx;
          } else {
            newW = minWidth;
            newX = initialRect.x + initialRect.w - minWidth;
          }
        }
        if (resizeDir.includes('s')) newH = Math.max(minHeight, initialRect.h + dy);
        if (resizeDir.includes('n')) {
          const possibleH = initialRect.h - dy;
          if (possibleH >= minHeight) {
            newH = possibleH;
            newY = initialRect.y + dy;
          } else {
            newH = minHeight;
            newY = initialRect.y + initialRect.h - minHeight;
          }
        }

        if (containerRef.current) {
          containerRef.current.style.width = `${newW}px`;
          containerRef.current.style.height = `${newH}px`;
          containerRef.current.style.left = `${newX}px`;
          containerRef.current.style.top = `${newY}px`;
        }
        onResize?.(id, newW, newH, newX, newY);
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
      setResizing(false);
      setResizeDir(null);
      flushPersistence();
    };

    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, resizing, resizeDir, initialMouse, initialRect, id, minWidth, minHeight, onMove, onResize]);

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
      // Position below the icon
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

  const startDragging = (e: React.MouseEvent) => {
    if (isMaximized || !containerRef.current) return;
    e.preventDefault();
    setDragging(true);
    setInitialMouse({ x: e.clientX, y: e.clientY });
    setInitialRect({ x, y, w: width, h: height });
    onFocus?.(id);
  };

  const startResizing = (e: React.MouseEvent, dir: string) => {
    if (!resizable || isMaximized || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    setResizeDir(dir);
    setInitialMouse({ x: e.clientX, y: e.clientY });
    setInitialRect({ x, y, w: width, h: height });
    onFocus?.(id);
  };

  const handleWindowClick = () => {
    onFocus?.(id);
  };

  const handleDoubleClickTitleBar = () => {
    if (maximizable) {
      onMaximize?.(id);
    }
  };

  // if (isMinimized) {
  //   return null;
  // }

  const titleBarClass = isActive ? 'bg-blue-900 text-white' : 'bg-gray-500 text-gray-200';
  const buttonHoverClass = isActive ? 'hover:bg-blue-700' : 'hover:bg-gray-400';

  return (
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
      onClick={handleWindowClick}
    >
      {/* Resize handles */}
      {!isMaximized && resizable && (
        <>
          <div className="absolute top-0 left-0 w-full h-1 cursor-ns-resize z-10" onMouseDown={(e) => startResizing(e, 'n')} />
          <div className="absolute bottom-0 left-0 w-full h-1 cursor-ns-resize z-10" onMouseDown={(e) => startResizing(e, 's')} />
          <div className="absolute top-0 left-0 h-full w-1 cursor-ew-resize z-10" onMouseDown={(e) => startResizing(e, 'w')} />
          <div className="absolute top-0 right-0 h-full w-1 cursor-ew-resize z-10" onMouseDown={(e) => startResizing(e, 'e')} />
          <div className="absolute top-0 left-0 w-2 h-2 cursor-nwse-resize z-20" onMouseDown={(e) => startResizing(e, 'nw')} />
          <div className="absolute top-0 right-0 w-2 h-2 cursor-nesw-resize z-20" onMouseDown={(e) => startResizing(e, 'ne')} />
          <div className="absolute bottom-0 left-0 w-2 h-2 cursor-nesw-resize z-20" onMouseDown={(e) => startResizing(e, 'sw')} />
          <div className="absolute bottom-0 right-0 w-2 h-2 cursor-nwse-resize z-20" onMouseDown={(e) => startResizing(e, 'se')} />
        </>
      )}

      {/* Title Bar */}
      <div
        className={`${titleBarClass} px-2 py-1 flex justify-between items-center select-none flex-shrink-0 ${
          isMaximized ? 'cursor-default' : 'cursor-move'
        }`}
        onMouseDown={startDragging}
        onDoubleClick={handleDoubleClickTitleBar}
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-base flex-shrink-0 cursor-default" onMouseDown={handleIconClick}>
            {icon}
          </span>
          <span className="text-sm font-bold truncate">{title}</span>
        </div>
        <div className="flex gap-1 ml-2">
          {(minimizable || maximizable) && (
            <Button
              variant="ghost"
              className={`h-5 w-5 p-0 min-w-0 text-current ${buttonHoverClass} border border-white/20`}
              onClick={(e) => {
                e.stopPropagation();
                onMinimize?.(id);
              }}
            >
              _
            </Button>
          )}
          {(minimizable || maximizable) && (
            <Button
              variant="ghost"
              className={`h-5 w-5 p-0 min-w-0 text-current border border-white/20 ${!maximizable ? 'opacity-30 cursor-default' : buttonHoverClass}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!maximizable) return;
                onMaximize?.(id);
              }}
            >
              {isMaximized ? '❐' : '□'}
            </Button>
          )}
          <Button
            variant="ghost"
            className={`h-5 w-5 p-0 min-w-0 text-current ${buttonHoverClass} border border-white/20`}
            onClick={(e) => {
              e.stopPropagation();
              onClose?.(id);
            }}
          >
            ×
          </Button>
        </div>
      </div>

      {/* Menu Bar */}
      {menuBar && (
        <div className="flex-shrink-0">
          <MenuBar items={menuBar} />
        </div>
      )}

      {/* Content Area */}
      <div
        className="flex-grow overflow-auto relative bg-gray-200 border-2 border-gray-400 m-0.5"
        style={{
          borderTopColor: '#808080',
          borderLeftColor: '#808080',
          borderRightColor: '#ffffff',
          borderBottomColor: '#ffffff',
        }}
      >
        <WindowContext.Provider value={windowContextValue}>{children}</WindowContext.Provider>
        {/* Modal blocking overlay */}
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
  );
}
