"use client"

import { useEffect, useState, useCallback } from 'react';
import { flushPersistence } from '@/lib/window-store';

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseWindowDragResizeOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  minWidth: number;
  minHeight: number;
  onMove: (nextX: number, nextY: number) => void;
  onResize: (nextWidth: number, nextHeight: number, nextX: number, nextY: number) => void;
  onFocus?: () => void;
}

export function useWindowDragResize({
  containerRef,
  minWidth,
  minHeight,
  onMove,
  onResize,
  onFocus,
}: UseWindowDragResizeOptions) {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<ResizeDirection | null>(null);
  const [initialMouse, setInitialMouse] = useState({ x: 0, y: 0 });
  const [initialRect, setInitialRect] = useState<WindowRect | null>(null);

  const startDragging = useCallback(
    (e: React.MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      e.preventDefault();
      setDragging(true);
      setInitialMouse({ x: e.clientX, y: e.clientY });
      setInitialRect({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
      onFocus?.();
    },
    [containerRef, onFocus],
  );

  const startResizing = useCallback(
    (e: React.MouseEvent, dir: ResizeDirection) => {
      const el = containerRef.current;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);
      setResizeDir(dir);
      setInitialMouse({ x: e.clientX, y: e.clientY });
      setInitialRect({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
      onFocus?.();
    },
    [containerRef, onFocus],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!initialRect) return;

      if (dragging) {
        const dx = e.clientX - initialMouse.x;
        const dy = e.clientY - initialMouse.y;
        const newX = initialRect.x + dx;
        const newY = initialRect.y + dy;

        const el = containerRef.current;
        if (el) {
          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;
        }

        onMove(newX, newY);
      } else if (resizing && resizeDir) {
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

        const el = containerRef.current;
        if (el) {
          el.style.width = `${newW}px`;
          el.style.height = `${newH}px`;
          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;
        }

        onResize(newW, newH, newX, newY);
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
  }, [dragging, resizing, resizeDir, initialMouse, initialRect, minWidth, minHeight, onMove, onResize, containerRef]);

  return { startDragging, startResizing };
}
