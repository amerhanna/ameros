'use client';

import type React from 'react';
import { createContext } from 'react';
import type { MenuItemType } from './Menu';

export interface WindowContextType {
  maximize: (e?: React.MouseEvent | React.TouchEvent) => void;
  minimize: (e?: React.MouseEvent | React.TouchEvent) => void;
  restore: (e?: React.MouseEvent | React.TouchEvent) => void;
  move: (e?: React.MouseEvent | React.TouchEvent, x?: number, y?: number) => void;
  resize: (e?: React.MouseEvent | React.TouchEvent, width?: number, height?: number, x?: number, y?: number) => void;
  close: () => void;
  id: string;
  isMaximized: boolean;
  isMinimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  menuBar?: MenuItemType[];
  setMenuBar: (menu: MenuItemType[]) => void;
}

export const WindowContext = createContext<WindowContextType | null>(null);
