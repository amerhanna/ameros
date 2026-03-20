'use client';

import React from 'react';
import { MenuContent, MenuItemType } from './Menu';

interface WindowContextMenuProps {
  x: number;
  y: number;
  isMaximized: boolean;
  isMinimized: boolean;
  maximizable: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onMove: () => void;
  onResize: () => void;
  onDismiss: () => void;
}

export default function WindowContextMenu({
  x,
  y,
  isMaximized,
  isMinimized,
  maximizable,
  onClose,
  onMinimize,
  onMaximize,
  onRestore,
  onMove,
  onResize,
  onDismiss,
}: WindowContextMenuProps) {
  const [adjustedPos, setAdjustedPos] = React.useState({ left: x, top: y });
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Adjust position to stay within screen boundaries
  React.useLayoutEffect(() => {
    const checkPosition = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const padding = 4;
      
      // We don't know the exact width/height yet because it's rendering, 
      // but we can estimate or just use fixed values for now.
      // A more robust way would be measuring the element after it renders.
      const estimatedWidth = 160;
      const estimatedHeight = 200;

      let newLeft = x;
      let newTop = y;

      if (x + estimatedWidth > screenWidth - padding) {
        newLeft = screenWidth - estimatedWidth - padding;
      }
      if (y + estimatedHeight > screenHeight - padding) {
        newTop = screenHeight - estimatedHeight - padding;
      }

      newLeft = Math.max(padding, newLeft);
      newTop = Math.max(padding, newTop);

      setAdjustedPos({ left: newLeft, top: newTop });
    };

    checkPosition();
  }, [x, y]);

  // Handle clicking outside to close
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      onDismiss();
    };
    // Use timeout to avoid closing immediately due to the same event that opened it
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 10);
    
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [onDismiss]);

  const menuItems: MenuItemType[] = [
    { type: 'item', label: 'Restore', action: onRestore, disabled: !isMaximized && !isMinimized },
    { type: 'item', label: 'Move', action: onMove, disabled: isMaximized },
    { type: 'item', label: 'Size', action: onResize, disabled: isMaximized },
    { type: 'item', label: 'Minimize', action: onMinimize, disabled: isMinimized },
    { type: 'item', label: 'Maximize', action: onMaximize, disabled: isMaximized || !maximizable },
    { type: 'separator' },
    { type: 'item', label: 'Close', action: onClose, shortcut: 'Alt+F4', bold: true },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        left: adjustedPos.left,
        top: adjustedPos.top,
        zIndex: 9999,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <MenuContent items={menuItems} onClose={onDismiss} />
    </div>
  );
}
