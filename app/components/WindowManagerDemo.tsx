'use client';

import WindowManager from '@/components/WindowManager/WindowManager';
import DemoApp from '@/components/DemoApp';
import TextEditor from '@/components/TextEditor';
import Calculator from '@/components/Calculator';
import FileExplorer from '@/components/FileExplorer';
import Settings from '@/components/WindowManager/Settings';
import TestCloseApp from '@/components/TestCloseApp';
import type { StartMenuItem, ApplicationRegistry } from '@/types/window';

const applicationRegistry: ApplicationRegistry = {
  TextEditor: {
    component: TextEditor,
    icon: '📄',
    width: 500,
    height: 350,
    resizable: true,
    minWidth: 300,
    minHeight: 200,
    maximizable: true,
  },
  Calculator: {
    component: Calculator,
    icon: '🧮',
    width: 250,
    height: 310,
    resizable: false,
    maximizable: false,
    beforeClose: () => confirm('Registry: Are you sure you want to close the Calculator?'),
  },
  FileExplorer: {
    component: FileExplorer,
    icon: '📁',
    width: 400,
    height: 400,
    resizable: true,
    minWidth: 300,
    minHeight: 200,
  },
  DemoApp: {
    component: DemoApp,
    icon: '🎨',
    width: 400,
    height: 300,
    resizable: true,
  },
  Settings: {
    component: Settings,
    icon: '⚙️',
    width: 600,
    height: 500,
    resizable: true,
  },
  TestCloseApp: {
    component: TestCloseApp,
    icon: '🧪',
    width: 400,
    height: 300,
    resizable: true,
  },
};

const startMenuItems: StartMenuItem[] = [
  { label: 'Text Editor', component: 'TextEditor' },
  { label: 'Calculator', component: 'Calculator' },
  { label: 'File Explorer', component: 'FileExplorer' },
  { label: 'Demo Application', component: 'DemoApp' },
  { type: 'separator' },
  { label: 'Settings', component: 'Settings' },
  { label: 'Test Close', component: 'TestCloseApp' },
  { type: 'separator' },
  {
    icon: '🔌',
    label: 'Shut Down...',
    action: () => {
      console.log('Shut down clicked');
    },
    type: 'action',
  },
];

export default function WindowManagerDemo() {
  return (
    <WindowManager 
      applicationRegistry={applicationRegistry} 
      startMenuItems={startMenuItems} 
    />
  );
}
