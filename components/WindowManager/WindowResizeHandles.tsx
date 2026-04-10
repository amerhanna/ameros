"use client"

import type React from 'react';
import type { ResizeDirection } from './useWindowDragResize';

interface WindowResizeHandlesProps {
  onStartResize: (e: React.MouseEvent, dir: ResizeDirection) => void;
}

export default function WindowResizeHandles({ onStartResize }: WindowResizeHandlesProps) {
  return (
    <>
      <div className="absolute top-0 left-0 w-full h-1 cursor-ns-resize z-10" onMouseDown={(e) => onStartResize(e, 'n')} />
      <div className="absolute bottom-0 left-0 w-full h-1 cursor-ns-resize z-10" onMouseDown={(e) => onStartResize(e, 's')} />
      <div className="absolute top-0 left-0 h-full w-1 cursor-ew-resize z-10" onMouseDown={(e) => onStartResize(e, 'w')} />
      <div className="absolute top-0 right-0 h-full w-1 cursor-ew-resize z-10" onMouseDown={(e) => onStartResize(e, 'e')} />
      <div className="absolute top-0 left-0 w-2 h-2 cursor-nwse-resize z-20" onMouseDown={(e) => onStartResize(e, 'nw')} />
      <div className="absolute top-0 right-0 w-2 h-2 cursor-nesw-resize z-20" onMouseDown={(e) => onStartResize(e, 'ne')} />
      <div className="absolute bottom-0 left-0 w-2 h-2 cursor-nesw-resize z-20" onMouseDown={(e) => onStartResize(e, 'sw')} />
      <div className="absolute bottom-0 right-0 w-2 h-2 cursor-nwse-resize z-20" onMouseDown={(e) => onStartResize(e, 'se')} />
    </>
  );
}
