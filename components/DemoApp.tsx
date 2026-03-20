"use client"

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button"
import { useWindow } from '@/hooks/useWindow';
import { useMenuBar } from '@/hooks/useMenuBar';
import type { MenuItemType } from '@/components/WindowManager/Menu';

interface DemoAppProps {
  title?: string
}

export default function DemoApp({ title = "Demo Application" }: DemoAppProps) {
  const { maximize, minimize, restore, move, resize, close, isMaximized, isMinimized, x, y, width, height, id } = useWindow();
  const [count, setCount] = useState(0);

  const menu: MenuItemType[] = useMemo(() => [
    {
      type: 'submenu',
      label: 'File',
      items: [
        { type: 'item', label: 'New', action: () => alert('New'), shortcut: 'Ctrl+N' },
        { type: 'item', label: 'Open...', action: () => alert('Open'), shortcut: 'Ctrl+O' },
        { type: 'separator' },
        { type: 'item', label: 'Save', action: () => alert('Save'), shortcut: 'Ctrl+S' },
        { type: 'item', label: 'Save As...', action: () => alert('Save As') },
        { type: 'separator' },
        { type: 'item', label: 'Page Setup...', action: () => alert('Page Setup'), disabled: true },
        { type: 'item', label: 'Print...', action: () => alert('Print'), shortcut: 'Ctrl+P' },
        { type: 'separator' },
        { type: 'item', label: 'Exit', action: () => close() },
      ],
    },
    {
      type: 'submenu',
      label: 'Edit',
      items: [
        { type: 'item', label: 'Undo', action: () => alert('Undo'), shortcut: 'Ctrl+Z' },
        { type: 'separator' },
        { type: 'item', label: 'Cut', action: () => alert('Cut'), shortcut: 'Ctrl+X' },
        { type: 'item', label: 'Copy', action: () => alert('Copy'), shortcut: 'Ctrl+C' },
        { type: 'item', label: 'Paste', action: () => alert('Paste'), shortcut: 'Ctrl+V' },
        { type: 'item', label: 'Delete', action: () => alert('Delete'), shortcut: 'Del' },
      ],
    },
    {
      type: 'submenu',
      label: 'Help',
      items: [
        { type: 'item', label: 'Help Topics', action: () => alert('Help') },
        { type: 'separator' },
        { type: 'item', label: 'About DemoApp', action: () => alert('Win95 Style Menu Bar!') },
      ],
    },
  ], [close]);

  useMenuBar(menu);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{title}</h1>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4 bg-gray-100 p-2 border border-blue-300">
        <div>ID: {title}</div>
        <div>State: {isMaximized ? 'Maximized' : isMinimized ? 'Minimized' : 'Normal'}</div>
        <div>
          Pos: {Math.round(x)}, {Math.round(y)}
        </div>
        <div>
          Size: {Math.round(width)}x{Math.round(height)}
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-700">This is a demo application running in a window.</p>
      <p className="mb-4">You can drag the window around and interact with the taskbar.</p>

      <div className="bg-white/50 p-4 border border-gray-400 mb-4">
        <p className="text-lg font-mono">Counter: {count}</p>
        <Button onClick={() => setCount((c) => c + 1)} className="mt-2">
          Increment State
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" onClick={(e) => maximize(e)}>
          {isMaximized ? 'Unmaximize' : 'Maximize'}
        </Button>
        <Button size="sm" onClick={(e) => minimize(e)}>
          Minimize
        </Button>
        {(isMaximized || isMinimized) && (
          <Button size="sm" variant="secondary" onClick={(e) => restore(e)}>
            Restore Original
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={(e) => move(e, 50, 50)}>
          Move to Top Left
        </Button>
        <Button size="sm" variant="outline" onClick={(e) => resize(e, 500, 400)}>
          Resize to 500x400
        </Button>
      </div>

      <Button variant="outline">Sample Button</Button>
    </div>
  );
}
