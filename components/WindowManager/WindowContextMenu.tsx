import React from 'react';
import type { MenuItemType } from './Menu';
import ContextMenu from './ContextMenu';

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
    <ContextMenu
      x={x}
      y={y}
      items={menuItems}
      onDismiss={onDismiss}
    />
  );
}
