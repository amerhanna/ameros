'use client';

import WindowManager from '@/components/WindowManager/WindowManager';
import DemoApp from '@/components/DemoApp';
import TextEditor from '@/components/TextEditor';
import Calculator from '@/components/Calculator';
import FileExplorer from '@/components/FileExplorer';
import type { StartMenuItem } from '@/types/window';

const componentRegistry = {
  DemoApp,
  TextEditor,
  Calculator,
  FileExplorer,
};

const startMenuItems: StartMenuItem[] = [
  {
    icon: "📄",
    label: "Text Editor",
    windowConfig: {
      title: "Text Editor",
      width: 500,
      height: 350,
      x: 200,
      y: 150,
      component: "TextEditor",
    },
  },
  {
    icon: "🧮",
    label: "Calculator",
    windowConfig: {
      title: "Calculator",
      width: 250,
      height: 300,
      x: 300,
      y: 200,
      component: "Calculator",
    },
  },
  {
    icon: "📁",
    label: "File Explorer",
    windowConfig: {
      title: "File Explorer",
      width: 400,
      height: 400,
      x: 150,
      y: 100,
      component: "FileExplorer",
    },
  },
  {
    icon: "🎨",
    label: "Demo Application",
    windowConfig: {
      title: "Demo Application",
      width: 400,
      height: 300,
      x: 100,
      y: 100,
      component: "DemoApp",
      props: { title: "My Demo App" },
    },
  },
  { type: "separator" },
  {
    icon: "⚙️",
    label: "Settings",
    action: () => {
      console.log("Settings clicked");
    },
  },
  { type: "separator" },
  {
    icon: "🔌",
    label: "Shut Down...",
    action: () => {
      console.log("Shut down clicked");
    },
  },
];

export default function WindowManagerDemo() {
  return (
    <WindowManager 
      registry={componentRegistry} 
      startMenuItems={startMenuItems} 
    />
  );
}
