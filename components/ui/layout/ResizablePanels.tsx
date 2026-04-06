'use client';

import React, { useState, useEffect, useCallback, useRef, Children } from 'react';

interface ResizablePanelsProps {
  children: React.ReactNode;
  /** Direction of the layout: 'horizontal' (columns) or 'vertical' (rows) */
  direction?: 'horizontal' | 'vertical';
  /** Initial sizes in percentages (must sum to 100) */
  initialSizes?: number[];
  /** Minimum size of a panel in pixels */
  minSize?: number;
  /** Callback fired when resizing finishes or during resizing */
  onResize?: (sizes: number[]) => void;
  className?: string;
}

export default function ResizablePanels({
  children,
  direction = 'horizontal',
  initialSizes,
  minSize = 100,
  onResize,
  className = '',
}: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const childArray = Children.toArray(children);
  const numPanels = childArray.length;

  // Initialize sizes to passed prop or equally distributed percentages
  const [sizes, setSizes] = useState<number[]>(
    initialSizes && initialSizes.length === numPanels ? initialSizes : Array(numPanels).fill(100 / numPanels)
  );

  const dragInfo = useRef({
    activeResizer: -1,
    startPos: 0,
    startSizes: [] as number[],
  });

  const isHorizontal = direction === 'horizontal';

  const startResizing = useCallback(
    (index: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      dragInfo.current = {
        activeResizer: index,
        startPos: isHorizontal ? e.clientX : e.clientY,
        startSizes: [...sizes],
      };
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [isHorizontal, sizes]
  );

  const stopResizing = useCallback(() => {
    if (dragInfo.current.activeResizer !== -1) {
      if (onResize) onResize(sizes);
      dragInfo.current.activeResizer = -1;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [onResize, sizes]);

  const handleResize = useCallback(
    (e: MouseEvent) => {
      const { activeResizer, startPos, startSizes } = dragInfo.current;
      if (activeResizer === -1 || !containerRef.current) return;

      const currentPos = isHorizontal ? e.clientX : e.clientY;
      const deltaPx = currentPos - startPos;

      const containerSize = isHorizontal ? containerRef.current.clientWidth : containerRef.current.clientHeight;

      // Convert delta and minSize from pixels to percentages
      const deltaPct = (deltaPx / containerSize) * 100;
      const minSizePct = (minSize / containerSize) * 100;

      let newSizeA = startSizes[activeResizer] + deltaPct;
      let newSizeB = startSizes[activeResizer + 1] - deltaPct;

      // Constrain to minimum sizes
      if (newSizeA < minSizePct) {
        newSizeA = minSizePct;
        newSizeB = startSizes[activeResizer] + startSizes[activeResizer + 1] - minSizePct;
      } else if (newSizeB < minSizePct) {
        newSizeB = minSizePct;
        newSizeA = startSizes[activeResizer] + startSizes[activeResizer + 1] - minSizePct;
      }

      setSizes((prevSizes) => {
        const nextSizes = [...prevSizes];
        nextSizes[activeResizer] = newSizeA;
        nextSizes[activeResizer + 1] = newSizeB;
        return nextSizes;
      });
    },
    [isHorizontal, minSize]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [handleResize, stopResizing]);

  return (
    <div ref={containerRef} className={`flex h-full w-full overflow-hidden ${isHorizontal ? 'flex-row' : 'flex-col'} ${className}`}>
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          {/* Panel */}
          <div
            className="min-h-0 min-w-0 flex-shrink-0 relative overflow-hidden"
            style={{
              [isHorizontal ? 'width' : 'height']: `${sizes[index]}%`,
            }}
          >
            {child}
          </div>

          {/* Resizer Handle */}
          {index < numPanels - 1 && (
            <div
              className={`flex justify-center items-center z-10 flex-shrink-0 group bg-slate-200 hover:bg-slate-300 transition-colors ${
                isHorizontal ? 'w-1 cursor-col-resize h-full' : 'h-1 cursor-row-resize w-full'
              }`}
              onMouseDown={startResizing(index)}
            >
              {/* Optional: Visual grabber indicator inside the handle */}
              {/* <div className={`${isHorizontal ? 'w-0.5 h-6' : 'h-0.5 w-6'} bg-slate-400 group-hover:bg-slate-500 rounded`} /> */}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
