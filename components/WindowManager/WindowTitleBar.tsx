"use client"

import type React from 'react';
import { Button } from '@/components/ui/button';

interface WindowTitleBarProps {
  title: string;
  icon: string;
  isActive: boolean;
  isMaximized: boolean;
  maximizable: boolean;
  minimizable: boolean;
  buttonHoverClass: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onIconClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onMinimize: (e?: React.MouseEvent) => void;
  onMaximize: (e?: React.MouseEvent) => void;
  onClose: () => void;
}

function TitleBarButtons({
  minimizable,
  maximizable,
  buttonHoverClass,
  isMaximized,
  onMinimize,
  onMaximize,
  onClose,
}: {
  minimizable: boolean;
  maximizable: boolean;
  buttonHoverClass: string;
  isMaximized: boolean;
  onMinimize: (e?: React.MouseEvent) => void;
  onMaximize: (e?: React.MouseEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex gap-1 ml-2">
      {(minimizable || maximizable) && (
        <Button
          variant="ghost"
          className={`h-5 w-5 p-0 min-w-0 text-current ${buttonHoverClass} border border-white/20`}
          onClick={onMinimize}
        >
          _
        </Button>
      )}
      {(minimizable || maximizable) && (
        <Button
          variant="ghost"
          className={`h-5 w-5 p-0 min-w-0 text-current border border-white/20 ${!maximizable ? 'opacity-30 cursor-default' : buttonHoverClass}`}
          onClick={(e) => {
            if (!maximizable) return;
            onMaximize(e);
          }}
        >
          {isMaximized ? '❐' : '□'}
        </Button>
      )}
      <Button
        variant="ghost"
        className={`h-5 w-5 p-0 min-w-0 text-current ${buttonHoverClass} border border-white/20`}
        onClick={onClose}
      >
        ×
      </Button>
    </div>
  );
}

export default function WindowTitleBar({
  title,
  icon,
  isActive,
  isMaximized,
  maximizable,
  minimizable,
  buttonHoverClass,
  onMouseDown,
  onIconClick,
  onContextMenu,
  onDoubleClick,
  onMinimize,
  onMaximize,
  onClose,
}: WindowTitleBarProps) {
  const titleBarClass = isActive ? 'bg-blue-900 text-white' : 'bg-gray-500 text-gray-200';

  return (
    <div
      className={`${titleBarClass} px-2 py-1 flex justify-between items-center select-none flex-shrink-0 ${
        isMaximized ? 'cursor-default' : 'cursor-move'
      }`}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="text-base flex-shrink-0 cursor-default" onMouseDown={onIconClick}>
          {icon}
        </span>
        <span className="text-sm font-bold truncate">{title}</span>
      </div>
      <TitleBarButtons
        minimizable={minimizable}
        maximizable={maximizable}
        buttonHoverClass={buttonHoverClass}
        isMaximized={isMaximized}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        onClose={onClose}
      />
    </div>
  );
}
