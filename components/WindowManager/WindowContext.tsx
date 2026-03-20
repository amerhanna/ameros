'use client';

import type React from 'react';
import { createContext } from 'react';

export interface WindowContextType {
  maximize: (e?: React.MouseEvent | React.TouchEvent) => void;
  minimize: (e?: React.MouseEvent | React.TouchEvent) => void;
  restore: (e?: React.MouseEvent | React.TouchEvent) => void;
  move: (x: number, y: number) => void;
  resize: (width: number, height: number, x?: number, y?: number) => void;
  id: string;
  isMaximized: boolean;
  isMinimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const WindowContext = createContext<WindowContextType | null>(null);
