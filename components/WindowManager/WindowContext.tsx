'use client';

import type React from 'react';
import { createContext } from 'react';
import type { MenuItemType } from './Menu';
import type { WindowConfig } from '@/types/window';

export interface ChildWindowConfig {
  title: string;
  component: React.ComponentType<any>;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  modal?: boolean;
  resizable?: boolean;
  maximizable?: boolean;
  minimizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  launchArgs?: Record<string, any>;
}

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
  launchArgs?: Record<string, any>;
  menuBar?: MenuItemType[];
  setMenuBar: (menu: MenuItemType[]) => void;
  setBeforeClose: (fn: (() => boolean) | undefined) => void;
  // Launch a registered application (like running an .exe with arguments)
  launchApp: (component: string, config?: Partial<WindowConfig>) => string | null;
  // Open an in-app child window (not in the registry — the app provides the component inline)
  openChildWindow: (config: ChildWindowConfig) => string | null;
}

export const WindowContext = createContext<WindowContextType | null>(null);
