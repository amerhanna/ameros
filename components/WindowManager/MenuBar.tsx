'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MenuItemType, MenuContent } from './Menu';

interface MenuBarProps {
  items: MenuItemType[];
}

export default function MenuBar({ items }: MenuBarProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking elsewhere
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveIndex(null);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMouseEnter = (index: number) => {
    if (activeIndex !== null) {
      setActiveIndex(index);
    }
  };

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex === index) {
      setActiveIndex(null);
    } else {
      setActiveIndex(index);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex items-center h-6 px-1 bg-[#c0c0c0] border-b border-gray-400 select-none text-black text-xs sm:text-sm"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => {
        if (item.type !== 'submenu') return null;
        
        const isActive = activeIndex === index;

        return (
          <div key={index} className="relative h-full flex items-center">
            <div
              className={`px-2 py-0.5 cursor-default flex items-center h-[90%] ${
                isActive ? 'bg-[#000080] text-white' : 'hover:bg-gray-300'
              }`}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseDown={(e) => handleMouseDown(index, e)}
            >
              {item.label}
            </div>
            {isActive && (
              <div className="absolute top-[100%] left-0 z-[1001]">
                <MenuContent
                  items={item.items}
                  onClose={() => setActiveIndex(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
