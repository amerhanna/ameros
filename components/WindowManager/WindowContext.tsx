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
  /** Unique name of the application (from registry key) */
  appId: string;
  /** Live frame from the DOM (matches drag/resize; x/y may differ from props until React state catches up) */
  getBounds: () => { x: number; y: number; width: number; height: number };
  launchArgs?: Record<string, any>;
  setMenuBar: (menu: MenuItemType[]) => void;
  /** Return false (or a Promise that resolves false) to cancel closing */
  setBeforeClose: (fn: (() => boolean | Promise<boolean>) | undefined) => void;
  // Open an in-app child window (not in the registry — the app provides the component inline)
  openChildWindow: (config: ChildWindowConfig) => string | null;
}

export interface SystemActionsContextType {
  // Launch a registered application (like running an .exe with arguments)
  launchApp: (component: string, config?: Partial<WindowConfig>) => string | null;
}

export const WindowContext = createContext<WindowContextType | null>(null);
export const SystemActionsContext = createContext<SystemActionsContextType | null>(null);
