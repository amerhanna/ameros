'use client';

import { useEffect, useState } from 'react';
import type { WindowState } from '@/types/window';
import MyButton from '../MyButton';

interface TaskbarProps {
  windows: WindowState[];
  activeWindowId: string | null;
  onWindowSelect: (id: string) => void;
  onStartMenuToggle: () => void;
  isStartMenuOpen: boolean;
  onContextMenu: (id: string, x: number, y: number) => void;
}

export default function Taskbar({
  windows,
  activeWindowId,
  onWindowSelect,
  onStartMenuToggle,
  isStartMenuOpen,
  onContextMenu,
}: TaskbarProps) {
  const [time, setTime] = useState('--:--');

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    updateTime();
    const intervalId = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#c0c0c0] border-t-2 border-white flex items-center p-1 gap-1">
      {/* Start Button */}
      <MyButton
        label="🪟 Start"
        accessButton="S"
        isDefault={isStartMenuOpen}
        toggle={true}
        pressed={isStartMenuOpen}
        onClick={onStartMenuToggle}
        data-start-button="true"
      />

      <div className="h-full w-[2px] border border-l-white border-t-white border-r-[#808080] border-b-[#808080]" />

      {/* Window Tabs */}
      <div className="flex gap-1 flex-1 overflow-hidden">
        {windows.map((window) => {
          const isActive = !isStartMenuOpen && activeWindowId === window.id;

          return (
            <MyButton
              key={window.id}
              label={`${window.icon ? window.icon + ' ' : ''}${window.title}`}
              toggle={true}
              pressed={isActive}
              onClick={() => onWindowSelect(window.id)}
              onRightClick={(e) => onContextMenu(window.id, e.clientX, e.clientY)}
            />
          );
        })}
      </div>

      {/* System Tray Area */}
      <div className="flex items-center gap-2 px-2 border border-r-white border-b-white border-l-[#808080] border-t-[#808080] bg-[#c0c0c0] h-6 ml-1 shadow-inner">
        <div className="text-[11px] font-['Tahoma']">{time}</div>
      </div>
    </div>
  );
}
