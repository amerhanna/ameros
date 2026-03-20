'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Menu Item Type
 */
export type MenuItemType =
  | { type: 'item'; label: string; action: () => void; disabled?: boolean; shortcut?: string; bold?: boolean; icon?: string }
  | { type: 'separator' }
  | { type: 'submenu'; label: string; items: MenuItemType[]; disabled?: boolean; icon?: string };

/**
 * Menu Content Component
 * The vertical container for menu items
 */
interface MenuContentProps {
  items: MenuItemType[];
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function MenuContent({ items, onClose, className = '', style }: MenuContentProps) {
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside handled by the parent trigger usually, 
  // but for submenus we need to handle it.

  return (
    <div
      ref={containerRef}
      className={`bg-[#c0c0c0] border-2 py-0.5 min-w-[150px] select-none text-black z-[1000] shadow-[2px_2px_5px_rgba(0,0,0,0.5)] ${className}`}
      style={{
        borderTopColor: '#ffffff',
        borderLeftColor: '#ffffff',
        borderRightColor: '#808080',
        borderBottomColor: '#808080',
        ...style,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <MenuItem
          key={index}
          item={item}
          isActive={activeSubmenuIndex === index}
          onHover={() => setActiveSubmenuIndex(index)}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

/**
 * Individual Menu Item Component
 */
interface MenuItemProps {
  item: MenuItemType;
  isActive: boolean;
  onHover: () => void;
  onClose: () => void;
}

function MenuItem({ item, isActive, onHover, onClose }: MenuItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [submenuPos, setSubmenuPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isActive && item.type === 'submenu' && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setSubmenuPos({ x: rect.right - 4, y: rect.top - 2 });
    }
  }, [isActive, item.type]);

  if (item.type === 'separator') {
    return <div className="h-[1px] bg-gray-400 my-1 mx-1 border-b border-white" />;
  }

  const isDisabled = item.disabled;
  const isSubmenu = item.type === 'submenu';
  
  const handleAction = () => {
    if (isDisabled) return;
    if (item.type === 'item') {
      item.action();
      onClose();
    }
  };

  return (
    <div
      ref={itemRef}
      className={`relative px-4 py-0.5 flex justify-between items-center text-xs sm:text-sm cursor-default leading-tight ${
        isDisabled 
          ? 'text-gray-500' 
          : isActive 
            ? 'bg-[#000080] text-white' 
            : 'text-black'
      }`}
      onMouseEnter={onHover}
      onMouseDown={(e) => {
        e.stopPropagation();
        handleAction();
      }}
    >
      <div className="flex items-center gap-2">
        {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
        <span className={item.type === 'item' && item.bold ? 'font-bold' : ''}>
          {item.label}
        </span>
      </div>
      
      {item.type === 'item' && item.shortcut && (
        <span className={`ml-4 ${isActive ? 'text-white' : 'text-gray-600'} opacity-80`}>
          {item.shortcut}
        </span>
      )}
      
      {isSubmenu && (
        <span className="ml-4">▶</span>
      )}

      {isSubmenu && isActive && (
        <div className="fixed" style={{ left: submenuPos.x, top: submenuPos.y }}>
          <MenuContent items={item.items} onClose={onClose} />
        </div>
      )}
    </div>
  );
}
