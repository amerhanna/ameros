"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { useEffect, useRef } from "react"
import type { StartMenuItem, WindowConfig } from "@/types/window"

interface StartMenuProps {
  isOpen: boolean
  onClose: () => void
  onOpenWindow: (windowConfig: WindowConfig) => void
  items: StartMenuItem[]
}

export default function StartMenu({ isOpen, onClose, onOpenWindow, items }: StartMenuProps) {
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
    if (item.action) {
      item.action()
    } else if (item.windowConfig) {
      onOpenWindow(item.windowConfig)
    }
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="absolute bottom-8 left-1 w-48 bg-gray-300 border-2 border-white shadow-lg z-50"
      style={{ borderTopColor: "#c0c0c0", borderLeftColor: "#c0c0c0" }}
    >
      {/* Start Menu Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white p-2 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-900 rounded flex items-center justify-center text-sm font-bold">W</div>
        <span className="text-sm font-bold">Windows 95</span>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {items.map((item, index) => {
          if (item.type === "separator") {
            return <div key={index} className="h-px bg-gray-400 mx-2 my-1" />
          }

          return (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start px-3 py-2 h-auto text-left hover:bg-blue-600 hover:text-white rounded-none"
              onClick={() => handleItemClick(item)}
            >
              <span className="mr-3 text-base">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
