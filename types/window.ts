import type React from "react"

export interface WindowConfig {
  title: string
  width: number
  height: number
  x: number
  y: number
  isMinimized?: boolean
  isMaximized?: boolean
  component: string
  launchArgs?: Record<string, any>
  // New properties from registry
  icon?: string
  resizable?: boolean
  minWidth?: number
  minHeight?: number
  maximizable?: boolean
  minimizable?: boolean
  // Modal & child window support
  modal?: boolean
  parentWindowId?: string
  childWindow?: boolean
}

export type StartMenuItem = {
  label: string
  component: string
  launchArgs?: Record<string, any>
  type?: "item"
} | {
  type: "separator"
} | {
  label: string
  icon: string
  actionId: string
  type: "action"
} | {
  type: "submenu"
  label: string
  items: StartMenuItem[]
  icon?: string
  disabled?: boolean
}

export interface PersistentWindowState extends WindowConfig {
  id: string
  appId: string
  zIndex: number
  // Store original dimensions for restore
  originalWidth: number
  originalHeight: number
  originalX: number
  originalY: number
}

export interface WindowState extends Omit<PersistentWindowState, "component"> {
  component: React.ComponentType<any>
  appId: string
}

export interface Application {
  component: React.ComponentType<any>
  icon: string
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  resizable?: boolean
  maximizable?: boolean
  minimizable?: boolean
  beforeClose?: () => boolean
}

export type ApplicationRegistry = Record<string, Application>

export interface StartupAppEntry {
  component: string
  launchArgs?: Record<string, any>
}

export interface InstalledApp {
  id: string; // Internal key name (e.g. unique slug or hostname)
  label: string;
  type: 'website' | 'native' | 'system';
  iconUrl?: string;
  installDate: string;
  launchArgs: Record<string, any>;
}
