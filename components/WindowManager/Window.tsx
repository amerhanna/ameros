"use client"

import type React from "react"
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { WindowContext } from './WindowContext';

interface WindowProps {
  id: string;
  title?: string;
  icon?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  isMinimized?: boolean;
  isMaximized?: boolean;
  isActive?: boolean;
  zIndex?: number;
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  maximizable?: boolean;
  children?: React.ReactNode;
  onMinimize?: (id: string) => void;
  onMaximize?: (id: string) => void;
  onClose?: (id: string) => void;
  onFocus?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number, x?: number, y?: number) => void;
  onBlur?: (id: string) => void;
  onContextMenu?: (id: string, x: number, y: number) => void;
}

export default function Window({
  id,
  title = 'Untitled',
  icon = '📁',
  width = 800,
  height = 600,
  x = 100,
  y = 100,
  isMinimized = false,
  isMaximized = false,
  isActive = false,
  zIndex = 1,
  resizable = true,
  minWidth = 200,
  minHeight = 100,
  maximizable = true,
  children,
  onMinimize,
  onMaximize,
  onClose,
  onFocus,
  onMove,
  onResize,
  onBlur,
  onContextMenu,
}: WindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<string | null>(null);
  const [initialMouse, setInitialMouse] = useState({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
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
    }),
    [id, isMaximized, isMinimized, x, y, width, height, onMaximize, onMinimize, onFocus, onMove, onResize],
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
      </div>
    </div>
  );
}
