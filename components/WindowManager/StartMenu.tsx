"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { useEffect, useRef } from "react"
import type { StartMenuItem, WindowConfig, ApplicationRegistry } from "@/types/window"

interface StartMenuProps {
  isOpen: boolean
  onClose: () => void
  onOpenWindow: (config: Partial<WindowConfig> & { component: string }) => void
  items: StartMenuItem[]
  applicationRegistry: ApplicationRegistry
}

export default function StartMenu({ isOpen, onClose, onOpenWindow, items, applicationRegistry }: StartMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleItemClick = (item: StartMenuItem) => {
    if (item.type === "action") {
      item.action()
    } else if (item.type === "item" || !item.type) {
      if ('component' in item) {
        onOpenWindow({ component: item.component, launchArgs: item.launchArgs })
      }
    }
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="absolute bottom-8 left-1 w-56 bg-gray-300 border-2 border-white shadow-lg z-50 select-none pb-1"
      style={{ borderTopColor: "#c0c0c0", borderLeftColor: "#c0c0c0" }}
    >
      {/* Start Menu Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-900 rounded flex items-center justify-center text-lg font-bold">W</div>
        <span className="text-base font-bold">AmerOS 95</span>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {items.map((item, index) => {
          if (item.type === "separator") {
            return <div key={index} className="h-px bg-gray-400 mx-2 my-1" />
          }

          const icon = item.type === "action" ? item.icon : applicationRegistry[item.component]?.icon
          const label = item.label

          return (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start px-3 py-1.5 h-auto text-left hover:bg-blue-600 hover:text-white rounded-none border-0"
              onClick={() => handleItemClick(item)}
            >
              <span className="mr-3 text-lg flex items-center justify-center w-6 h-6">{icon}</span>
              <span className="text-sm font-medium">{label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
