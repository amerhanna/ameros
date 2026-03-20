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
  props?: any
}

export type StartMenuItem = {
  icon?: string
  label?: string
  action?: () => void
  type?: "separator"
  windowConfig?: WindowConfig
}

export interface PersistentWindowState {
  id: string
  title: string
  width: number
  height: number
  x: number
  y: number
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  component: string
  props?: any
  // Store original dimensions for restore
  originalWidth: number
  originalHeight: number
  originalX: number
  originalY: number
}

export interface WindowState extends Omit<PersistentWindowState, "component"> {
  component: React.ComponentType<any>
}
