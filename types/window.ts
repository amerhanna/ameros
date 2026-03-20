import type React from "react"

export interface WindowState {
  id: string
  title: string
  width: number
  height: number
  x: number
  y: number
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  component: React.ComponentType<any>
  props?: any
  // Store original dimensions for restore
  originalWidth: number
  originalHeight: number
  originalX: number
  originalY: number
}
