'use client';

import WindowManager from '@/components/WindowManager/WindowManager';
import DemoApp from '@/Applications/DemoApp/DemoApp';
import TextEditor from '@/Applications/TextEditor/TextEditor';
import Calculator from '@/Applications/Calculator/Calculator';
import FileExplorer from '@/Applications/FileExplorer/FileExplorer';
import Settings from '@/components/WindowManager/Settings';
import TestCloseApp from '@/Applications/TestCloseApp/TestCloseApp';
import DeepSeekHistory from '@/Applications/DeepSeekHistory/DeepSeekHistory';
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
  DeepSeekHistory: {
    component: DeepSeekHistory,
    icon: '📜',
    width: 600,
    height: 500,
    minWidth: 400,
    minHeight: 300,
    resizable: true,
    maximizable: true,
  },
};

const startMenuItems: StartMenuItem[] = [
  { label: 'Text Editor', component: 'TextEditor' },
  { label: 'Calculator', component: 'Calculator' },
  { label: 'File Explorer', component: 'FileExplorer' },
  { label: 'Demo Application', component: 'DemoApp' },
  { label: 'History Explorer', component: 'DeepSeekHistory' },
  { label: 'Test Close', component: 'TestCloseApp' },
  { type: 'separator' },
  { label: 'Settings', component: 'Settings' },
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
