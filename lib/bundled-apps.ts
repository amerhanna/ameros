"use client";

import type React from "react";
import type { Application, ApplicationRegistry } from "@/types/window";
import DemoApp from '@/Applications/DemoApp/DemoApp';
import TextEditor from '@/Applications/TextEditor/TextEditor';
import Calculator from '@/Applications/Calculator/Calculator';
import FileExplorer from '@/Applications/FileExplorer/FileExplorer';
import Settings from '@/components/WindowManager/Settings';
import TestCloseApp from '@/Applications/TestCloseApp/TestCloseApp';
import CommonDialogDemo from '@/Applications/DemoApp/CommonDialogDemo';
import InstallerApp from '@/Applications/Installer/InstallerApp';
import WebApp from '@/Applications/WebApp/WebApp';
import Regedit from '@/Applications/Regedit/Regedit';
import DBExplorer from '@/Applications/DBExplorer/DBExplorer';
import Notes from '@/Applications/Notes/Notes';
import PDFViewer from '@/Applications/PDFViewer/PDFViewer';

/**
 * Map of bundled application component names to their React components.
 * These are the core applications shipped with AmerOS.
 */
export const bundledComponents: Record<string, React.ComponentType<any>> = {
  TextEditor,
  Calculator,
  FileExplorer,
  DemoApp,
  Settings,
  TestCloseApp,
  CommonDialogDemo,
  WebApp,
  Installer: InstallerApp,
  Regedit,
  Notes,
  DBExplorer,
  PDFViewer,
};

/**
 * Special handlers for bundled applications that can't be stored in registry.
 */
export const bundledHandlers: Record<string, Partial<Pick<Application, 'beforeClose'>>> = {
  Calculator: {
    beforeClose: () => confirm('Registry: Are you sure you want to close the Calculator?'),
  },
};

/**
 * Global registry for bundled applications, populated during boot.
 */
let globalBundledApps: ApplicationRegistry = {};

/**
 * Load bundled applications from registry and populate global registry.
 */
export async function loadBundledApps(): Promise<ApplicationRegistry> {
  if (Object.keys(globalBundledApps).length > 0) {
    return globalBundledApps;
  }

  const { registry } = await import('./registry');
  const appsPath = 'HKEY_LOCAL_MACHINE/SOFTWARE/AmerOS/Applications';
  const appKeys = await registry.getKeys(appsPath);
  const loaded: ApplicationRegistry = {};

  for (const appKey of appKeys) {
    const appPath = `${appsPath}/${appKey}`;
    const values = await registry.getValues(appPath);
    
    loaded[appKey] = {
      component: bundledComponents[appKey],
      icon: values.icon as string || '❓',
      width: values.width as number || 400,
      height: values.height as number || 300,
      resizable: values.resizable as boolean ?? true,
      maximizable: values.maximizable as boolean ?? true,
      minimizable: values.minimizable as boolean ?? true,
      minWidth: values.minWidth as number,
      minHeight: values.minHeight as number,
      ...bundledHandlers[appKey], // Merge special handlers
    };
  }

  globalBundledApps = loaded;
  return loaded;
}

/**
 * Get the global bundled applications registry.
 */
export function getBundledApps(): ApplicationRegistry {
  return globalBundledApps;
}