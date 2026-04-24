"use client"

import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { useWindowActions } from '@/hooks/useWindowActions';
import { useGetWindowState } from '@/hooks/useGetWindowState';
import { useMessageBox } from '@/hooks/useMessageBox';
import type { MenuItemType } from '@/components/WindowManager/Menu';

interface DemoAppProps {
  title?: string
}

export default function DemoApp({ title = "Demo Application" }: DemoAppProps) {
  const { maximize, minimize, restore, move, resize, close, id, setMenuBar } = useWindowActions();
  const { isMaximized, isMinimized, x, y, width, height } = useGetWindowState([
    'isMaximized',
    'isMinimized',
    'x',
    'y',
    'width',
    'height',
  ]);
  const { showMessageBox, showInputBox } = useMessageBox();
  const [count, setCount] = useState(0);

  const menu: MenuItemType[] = useMemo(() => [
    {
      type: 'submenu',
      label: 'File',
      items: [
        { type: 'item', label: 'New', action: () => void showMessageBox('New', 'New document', true), shortcut: 'Ctrl+N' },
        { type: 'item', label: 'Open...', action: () => void showMessageBox('Open', 'Choose a file to open.', true), shortcut: 'Ctrl+O' },
        { type: 'separator' },
        { type: 'item', label: 'Save', action: () => void showMessageBox('Save', 'Document saved.', true), shortcut: 'Ctrl+S' },
        { type: 'item', label: 'Save As...', action: () => void showInputBox('Save As', 'Enter file name:', true).then((name) => {
          if (name != null) void showMessageBox('Save As', `Would save as: ${name}`, true);
        }) },
        { type: 'separator' },
        { type: 'item', label: 'Page Setup...', action: () => void showMessageBox('Page Setup', 'Not available in this demo.', true, ['OK']), disabled: true },
        { type: 'item', label: 'Print...', action: () => void showMessageBox('Print', 'Sending to printer…', true), shortcut: 'Ctrl+P' },
        { type: 'separator' },
        { type: 'item', label: 'Exit', action: () => close() },
      ],
    },
    {
      type: 'submenu',
      label: 'Edit',
      items: [
        { type: 'item', label: 'Undo', action: () => void showMessageBox('Undo', 'Nothing to undo.', true), shortcut: 'Ctrl+Z' },
        { type: 'separator' },
        { type: 'item', label: 'Cut', action: () => void showMessageBox('Cut', 'Cut to clipboard (demo).', true), shortcut: 'Ctrl+X' },
        { type: 'item', label: 'Copy', action: () => void showMessageBox('Copy', 'Copied (demo).', true), shortcut: 'Ctrl+C' },
        { type: 'item', label: 'Paste', action: () => void showMessageBox('Paste', 'Pasted (demo).', true), shortcut: 'Ctrl+V' },
        { type: 'item', label: 'Delete', action: () => void showMessageBox('Delete', 'Delete selection (demo).', true, ['OK', 'Cancel']), shortcut: 'Del' },
      ],
    },
    {
      type: 'submenu',
      label: 'Help',
      items: [
        { type: 'item', label: 'Help Topics', action: () => void showMessageBox('Help', 'Demo help: use the menu and buttons below.', true) },
        { type: 'separator' },
        { type: 'item', label: 'About DemoApp', action: () => void showMessageBox('About DemoApp', 'AmerOS style menu bar and Win95-style message boxes.', true) },
      ],
    },
  ], [close, showMessageBox, showInputBox]);

  useEffect(() => {
    setMenuBar(menu);
  }, [menu, setMenuBar]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{title}</h1>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4 bg-gray-100 p-2 border border-blue-300">
        <div>ID: {id}</div>
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

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => void showMessageBox('Message', 'Win95-style message box from useMessageBox.', true, ['OK', 'Cancel'])}
        >
          Sample message box
        </Button>
        <Button
          variant="outline"
          onClick={() => void showInputBox('Input', 'Type something:', true).then((v) => {
            if (v != null) void showMessageBox('You entered', v, true);
          })}
        >
          Sample input box
        </Button>
      </div>
    </div>
  );
}
