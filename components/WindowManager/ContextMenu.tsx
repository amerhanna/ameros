'use client';

import React, { useLayoutEffect, useState, useEffect } from 'react';
import { MenuContent, MenuItemType } from './Menu';

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItemType[];
  onDismiss: () => void;
}

export default function ContextMenu({ x, y, items, onDismiss }: ContextMenuProps) {
  const [adjustedPos, setAdjustedPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const padding = 4;
    
    // Estimate size for placement logic
    const estimatedWidth = 160;
    const estimatedHeight = items.length * 25 + 10;

    let newLeft = x;
    let newTop = y;

    if (x + estimatedWidth > screenWidth - padding) {
      newLeft = screenWidth - estimatedWidth - padding;
    }
    if (y + estimatedHeight > screenHeight - padding) {
      newTop = screenHeight - estimatedHeight - padding;
    }

    setAdjustedPos({ 
      left: Math.max(padding, newLeft), 
      top: Math.max(padding, newTop) 
    });
  }, [x, y, items.length]);

  useEffect(() => {
    const handleClickOutside = () => onDismiss();
    // Delay listener to avoid closing immediately on the same click
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 10);
    
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [onDismiss]);

  return (
    <div
      style={{
        position: 'fixed',
        left: adjustedPos.left,
        top: adjustedPos.top,
        zIndex: 9999,
      }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <MenuContent items={items} onClose={onDismiss} />
    </div>
  );
}
