'use client';

import React from 'react';

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
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = React.useState({ left: x, top: y });

  // Adjust position to stay within screen boundaries
  React.useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const padding = 4;

      let newLeft = x;
      let newTop = y;

      if (x + rect.width > screenWidth - padding) {
        newLeft = screenWidth - rect.width - padding;
      }
      if (y + rect.height > screenHeight - padding) {
        newTop = screenHeight - rect.height - padding;
      }

      // Ensure it doesn't go off the left or top either
      newLeft = Math.max(padding, newLeft);
      newTop = Math.max(padding, newTop);

      setAdjustedPos({ left: newLeft, top: newTop });
    }
  }, [x, y]);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onDismiss]);

  type MenuItem =
    | { type: 'item'; label: string; action: () => void; disabled: boolean; shortcut: string; bold?: boolean }
    | { type: 'separator' };

  const menuItems: MenuItem[] = [
    { type: 'item', label: 'Restore', action: onRestore, disabled: !isMaximized && !isMinimized, shortcut: '' },
    { type: 'item', label: 'Move', action: onMove, disabled: isMaximized, shortcut: '' },
    { type: 'item', label: 'Resize', action: onResize, disabled: isMaximized, shortcut: '' },
    { type: 'item', label: 'Minimize', action: onMinimize, disabled: isMinimized, shortcut: '' },
    { type: 'item', label: 'Maximize', action: onMaximize, disabled: isMaximized || !maximizable, shortcut: '' },
    { type: 'separator' },
    { type: 'item', label: 'Close', action: onClose, disabled: false, shortcut: 'Alt+F4', bold: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[#c0c0c0] border-2 border-white shadow-[2px_2px_5px_rgba(0,0,0,0.5)] py-1 min-w-[150px] select-none text-black"
      style={{
        left: adjustedPos.left,
        top: adjustedPos.top,
        borderTopColor: '#ffffff',
        borderLeftColor: '#ffffff',
        borderRightColor: '#808080',
        borderBottomColor: '#808080',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={index} className="h-[1px] bg-gray-400 my-1 mx-1 border-b border-white" />;
        }

        const isItem = item.type === 'item';
        const label = isItem ? item.label : '';
        const action = isItem ? item.action : () => {};
        const disabled = isItem ? item.disabled : false;
        const shortcut = isItem ? item.shortcut : '';
        const bold = isItem ? item.bold : false;

        return (
          <div
            key={index}
            className={`px-4 py-1 flex justify-between items-center text-sm cursor-default ${
              disabled ? 'text-gray-500' : 'hover:bg-[#000080] hover:text-white'
            }`}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (isItem && !disabled) {
                console.log('Context menu action:', label);
                action();
                onDismiss();
              }
            }}
          >
            <span className={bold ? 'font-bold' : ''}>{label}</span>
            {shortcut && <span className="ml-4 opacity-70 text-xs">{shortcut}</span>}
          </div>
        );
      })}
    </div>
  );
}
