'use client';

import WindowManager from '@/components/WindowManager/WindowManager';
import DeepSeekHistory from '@/Applications/DeepSeekHistory/DeepSeekHistory';
import type { ApplicationRegistry, StartMenuItem } from '@/types/window';

// Additional applications defined by WindowManagerDemo
const additionalApplicationRegistry: ApplicationRegistry = {
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

// Additional start menu items to be placed in Programs submenu
const additionalStartMenuItems: StartMenuItem[] = [
  {
    label: 'History Explorer',
    component: 'DeepSeekHistory',
  },
];

export default function WindowManagerDemo() {
  return (
    <WindowManager 
      applicationRegistry={additionalApplicationRegistry}
      additionalStartMenuItems={additionalStartMenuItems}
    />
  );
}
